import { supabase } from './supabaseClient'

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days) {
  return new Date(Date.now() - days * DAY_MS).toISOString()
}

async function count(query) {
  const { count: total, error } = await query
  if (error) throw error
  return total ?? 0
}

function profileCount(role, extra = (q) => q) {
  return count(extra(supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', role)))
}

/** Percentage change, or null when there is no baseline to compare against. */
function growth(current, previous) {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

function downloadEvents(from, to) {
  let query = supabase
    .from('opportunity_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'download')
    .gte('created_at', from)
  if (to) query = query.lt('created_at', to)
  return count(query)
}

// Strip characters that would break PostgREST's or() filter syntax.
function searchTerm(search) {
  return (search ?? '').trim().replace(/[,()%*"]/g, ' ')
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

/** Headline numbers for the four stat cards on the Admin overview. */
export async function fetchOverviewStats() {
  const monthAgo = daysAgo(30)
  const twoMonthsAgo = daysAgo(60)

  const [
    learners,
    learnersMonthAgo,
    parents,
    parentsMonthAgo,
    verifiedContributors,
    awaitingVerification,
    downloads30,
    downloadsPrev30,
  ] = await Promise.all([
    profileCount('student'),
    profileCount('student', (q) => q.lt('created_at', monthAgo)),
    profileCount('parent'),
    profileCount('parent', (q) => q.lt('created_at', monthAgo)),
    profileCount('contributor', (q) => q.eq('verified', true)),
    profileCount('contributor', (q) => q.eq('verified', false)),
    downloadEvents(monthAgo),
    downloadEvents(twoMonthsAgo, monthAgo),
  ])

  return {
    learners: { value: learners, growth: growth(learners, learnersMonthAgo) },
    parents: { value: parents, growth: growth(parents, parentsMonthAgo) },
    contributors: { value: verifiedContributors, awaiting: awaitingVerification },
    downloads: { value: downloads30, growth: growth(downloads30, downloadsPrev30) },
  }
}

export async function fetchDraftOpportunities(limit = 3) {
  const { data, error, count: total } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact' })
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}

export async function fetchUnverifiedContributors(limit = 3) {
  const { data, error, count: total } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'contributor')
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  // "New" for sign-ups in the last week, otherwise the request needs a follow-up.
  const weekAgo = Date.now() - 7 * DAY_MS
  const rows = data.map((row) => ({ ...row, isNew: new Date(row.created_at).getTime() > weekAgo }))
  return { rows, total: total ?? 0 }
}

/** [{ weekStart: '2026-10-12', downloads: 1154 }, …], oldest first. */
export async function fetchWeeklyDownloads(weeks = 8) {
  const { data, error } = await supabase.rpc('admin_weekly_downloads', { p_weeks: weeks })
  if (error) throw error
  return data.map((row) => ({ weekStart: row.week_start, downloads: Number(row.downloads) }))
}

export async function fetchTopForms(limit = 3) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, title, contributor_name, downloads_count')
    .not('form_url', 'is', null)
    .order('downloads_count', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Opportunities (admin-only lifecycle: draft → active → closed)
// ---------------------------------------------------------------------------

export const OPPORTUNITY_TABS = [
  { value: 'active', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'closed', label: 'Archived' },
  { value: '', label: 'All' },
]

export async function fetchOpportunityStatusCounts() {
  const base = () => supabase.from('opportunities').select('id', { count: 'exact', head: true })
  const [all, active, draft, closed] = await Promise.all([
    count(base()),
    count(base().eq('status', 'active')),
    count(base().eq('status', 'draft')),
    count(base().eq('status', 'closed')),
  ])
  return { '': all, active, draft, closed }
}

export const OPPORTUNITY_PAGE_SIZE = 8

function opportunityQuery({ status, search, type }, options) {
  let query = supabase.from('opportunities').select('*', options)
  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  const term = searchTerm(search)
  if (term) query = query.or(`title.ilike.%${term}%,contributor_name.ilike.%${term}%`)
  return query.order('updated_at', { ascending: false })
}

export async function fetchOpportunities({ page, ...filters }) {
  const from = page * OPPORTUNITY_PAGE_SIZE
  const { data, error, count: total } = await opportunityQuery(filters, { count: 'exact' }).range(
    from,
    from + OPPORTUNITY_PAGE_SIZE - 1
  )
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}

/** Every row matching the filters (up to 1000), for the CSV export. */
export async function fetchOpportunitiesForExport(filters) {
  const { data, error } = await opportunityQuery(filters).limit(1000)
  if (error) throw error
  return data
}

export async function fetchOpportunity(id) {
  const { data, error } = await supabase.from('opportunities').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/** Insert or update. `status` decides draft vs published. */
export async function saveOpportunity(id, fields) {
  const payload = { ...fields, updated_at: new Date().toISOString() }
  const query = id
    ? supabase.from('opportunities').update(payload).eq('id', id)
    : supabase.from('opportunities').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data
}

export async function setOpportunityStatus(id, status) {
  return saveOpportunity(id, { status })
}

/** Verified contributor organisations an opportunity can be linked to (drives their analytics). */
export async function fetchProviderOptions() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, organization_name, organization_logo, contributor_type, verified')
    .eq('role', 'contributor')
    .order('organization_name', { ascending: true })
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Files (limits match the storage buckets in migration 0004)
// ---------------------------------------------------------------------------

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const COVER_MAX_BYTES = 5 * 1024 * 1024
export const FORM_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const FORM_MAX_BYTES = 10 * 1024 * 1024

/** Returns a user-facing problem with the file, or null when it's acceptable (OPP-008). */
export function fileProblem(file, kind) {
  const types = kind === 'cover' ? COVER_TYPES : FORM_TYPES
  const max = kind === 'cover' ? COVER_MAX_BYTES : FORM_MAX_BYTES
  if (!types.includes(file.type)) {
    return kind === 'cover' ? 'Cover images must be JPG, PNG or WebP.' : 'Forms must be PDF or Word (.doc/.docx).'
  }
  if (file.size > max) return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${max / 1024 / 1024} MB.`
  return null
}

function safeName(name) {
  return name.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-80)
}

async function upload(bucket, folder, file) {
  // A fresh path per upload, so learners never get a cached stale file (OPP-006).
  const path = `${folder}/${Date.now()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function uploadCover(file) {
  return upload('public-media', 'opportunity-covers', file)
}

export function uploadForm(file) {
  return upload('forms', 'application-forms', file)
}

// ---------------------------------------------------------------------------
// Analytics (views, download events and unique downloaders — never "applications")
// ---------------------------------------------------------------------------

export async function fetchDownloadAnalytics(from, to) {
  const { data, error } = await supabase.rpc('admin_download_analytics', { p_from: from, p_to: to })
  if (error) throw error
  return data.map((row) => ({
    ...row,
    views: Number(row.views),
    downloads: Number(row.downloads),
    unique_downloaders: Number(row.unique_downloaders),
  }))
}

export async function fetchAnalyticsSummary(from, to) {
  const { data, error } = await supabase.rpc('admin_analytics_summary', { p_from: from, p_to: to })
  if (error) throw error
  return data
}

/** Recent download events for one opportunity (no learner contact details). */
export async function fetchRecentDownloads(opportunityId, limit = 8) {
  const { data, error } = await supabase
    .from('opportunity_events')
    .select('id, created_at, user_id')
    .eq('opportunity_id', opportunityId)
    .eq('event_type', 'download')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Users & roles (ADM-003)
// ---------------------------------------------------------------------------

export const USERS_PAGE_SIZE = 12

export async function fetchUsers({ role, search, page }) {
  let query = supabase
    .from('user_profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (role === 'tutor') query = query.eq('role', 'contributor').eq('contributor_type', 'tutor')
  else if (role === 'pending') query = query.eq('role', 'contributor').eq('verified', false)
  else if (role) query = query.eq('role', role)
  const term = searchTerm(search)
  if (term) query = query.or(`display_name.ilike.%${term}%,organization_name.ilike.%${term}%,email.ilike.%${term}%`)
  const from = page * USERS_PAGE_SIZE
  const { data, error, count: total } = await query.range(from, from + USERS_PAGE_SIZE - 1)
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}

/** Role, verification and live-hosting changes; each is written to the audit log by the database. */
export async function updateUserAccess(profileId, changes) {
  const { data, error } = await supabase.from('user_profiles').update(changes).eq('id', profileId).select().single()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Content moderation (POST-004, POST-011, ADM-004)
// ---------------------------------------------------------------------------

export async function fetchFlaggedPosts(limit = 50) {
  const { data, error, count: total } = await supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .eq('status', 'flagged')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}

export async function fetchReportsForPosts(postIds) {
  if (!postIds.length) return {}
  const { data, error } = await supabase
    .from('post_reports')
    .select('post_id, reason, status, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.reduce((acc, report) => {
    ;(acc[report.post_id] ??= []).push(report)
    return acc
  }, {})
}

export async function moderatePost(postId, action) {
  const { error } = await supabase.rpc('moderate_post', { p_post_id: postId, p_action: action })
  if (error) throw error
}

export const POSTS_PAGE_SIZE = 15

export async function fetchAllPosts({ search, page }) {
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .in('status', ['published', 'flagged'])
    .order('created_at', { ascending: false })
  const term = searchTerm(search)
  if (term) query = query.or(`content.ilike.%${term}%,author_name.ilike.%${term}%`)
  const from = page * POSTS_PAGE_SIZE
  const { data, error, count: total } = await query.range(from, from + POSTS_PAGE_SIZE - 1)
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}

export async function setPostCategory(postId, postType) {
  const { error } = await supabase.from('posts').update({ post_type: postType || null }).eq('id', postId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Live sessions (LIVE-001, LIVE-006)
// ---------------------------------------------------------------------------

export async function fetchStreams() {
  const { data, error } = await supabase
    .from('live_streams')
    .select('*')
    .order('scheduled_date', { ascending: false, nullsFirst: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function createStream(hostId, fields) {
  const { data, error } = await supabase
    .from('live_streams')
    .insert({ host_id: hostId, ...fields })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStream(id, changes) {
  const { data, error } = await supabase.from('live_streams').update(changes).eq('id', id).select().single()
  if (error) throw error
  return data
}

export const RECORDING_TYPES = ['video/mp4', 'video/quicktime']
export const RECORDING_MAX_BYTES = 50 * 1024 * 1024

export function uploadRecording(userId, file) {
  return upload('recordings', userId, file)
}

// ---------------------------------------------------------------------------
// Audit log (ADM-006)
// ---------------------------------------------------------------------------

export const AUDIT_PAGE_SIZE = 25

export async function fetchAuditLog({ table, page }) {
  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  if (table) query = query.eq('target_table', table)
  const from = page * AUDIT_PAGE_SIZE
  const { data, error, count: total } = await query.range(from, from + AUDIT_PAGE_SIZE - 1)
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}
