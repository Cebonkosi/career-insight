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
    count(
      supabase.from('applications').select('id', { count: 'exact', head: true }).gte('download_date', monthAgo)
    ),
    count(
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .gte('download_date', twoMonthsAgo)
        .lt('download_date', monthAgo)
    ),
  ])

  return {
    learners: { value: learners, growth: growth(learners, learnersMonthAgo) },
    parents: { value: parents, growth: growth(parents, parentsMonthAgo) },
    contributors: { value: verifiedContributors, awaiting: awaitingVerification },
    downloads: { value: downloads30, growth: growth(downloads30, downloadsPrev30) },
  }
}

export async function fetchPendingOpportunities(limit = 3) {
  const { data, error, count: total } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact' })
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
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

/** [{ week_start: '2026-10-12', downloads: 1154 }, …], oldest first. */
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

export async function fetchFlaggedPosts(limit = 6) {
  const { data, error, count: total } = await supabase
    .from('posts')
    .select('id, content, author_name, author_role, post_type, updated_at', { count: 'exact' })
    .eq('status', 'flagged')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}

/** Counts per review tab on the Opportunity review page. */
export async function fetchOpportunityStatusCounts() {
  const base = () => supabase.from('opportunities').select('id', { count: 'exact', head: true })
  const [all, pending, approved, rejected] = await Promise.all([
    count(base()),
    count(base().eq('status', 'pending_review')),
    count(base().eq('status', 'active')),
    count(base().eq('status', 'rejected')),
  ])
  return { all, pending, approved, rejected }
}

export const REVIEW_PAGE_SIZE = 6

function reviewQuery({ status, search, type }, options) {
  let query = supabase.from('opportunities').select('*', options)
  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)
  // Strip characters that would break PostgREST's or() filter syntax.
  const term = search.trim().replace(/[,()%*]/g, ' ')
  if (term) query = query.or(`title.ilike.%${term}%,contributor_name.ilike.%${term}%`)
  return query.order('created_at', { ascending: false })
}

export async function fetchReviewOpportunities({ page, ...filters }) {
  const from = page * REVIEW_PAGE_SIZE
  const { data, error, count: total } = await reviewQuery(filters, { count: 'exact' }).range(
    from,
    from + REVIEW_PAGE_SIZE - 1
  )
  if (error) throw error
  return { rows: data, total: total ?? 0 }
}

/** Every row matching the review filters (up to 1000), for the CSV export. */
export async function fetchReviewOpportunitiesForExport(filters) {
  const { data, error } = await reviewQuery(filters).limit(1000)
  if (error) throw error
  return data
}

/** Contributor profiles keyed by user id, for the "Verified" line beside each row. */
export async function fetchContributorsByUserId(userIds) {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (!ids.length) return {}
  const { data, error } = await supabase.from('user_profiles').select('*').in('user_id', ids)
  if (error) throw error
  return Object.fromEntries(data.map((profile) => [profile.user_id, profile]))
}

/** Approve (→ active) or reject (→ rejected) a submission, recording who decided and why. */
export async function decideOpportunity(opportunity, decision, note, reviewerId) {
  const { data, error } = await supabase
    .from('opportunities')
    .update({
      status: decision === 'approve' ? 'active' : 'rejected',
      review_note: note?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', opportunity.id)
    .select()
    .single()
  if (error) throw error
  return data
}
