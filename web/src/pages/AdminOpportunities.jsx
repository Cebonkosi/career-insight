import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Download,
  Eye,
  FileText,
  Link2,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'
import {
  AdminPageHeader,
  OpportunityStatusPill,
  Panel,
  Pill,
  formatDate,
  formatShortDate,
} from '@/components/admin/AdminUi'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import { CreateOpportunityDialog } from '@/components/opportunities/CreateOpportunityDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  REVIEW_PAGE_SIZE,
  decideOpportunity,
  fetchContributorsByUserId,
  fetchOpportunityStatusCounts,
  fetchReviewOpportunities,
  fetchReviewOpportunitiesForExport,
} from '@/lib/adminData'
import { CONTRIBUTOR_TYPES, OPPORTUNITY_TYPES } from '@/lib/constants'
import { entities } from '@/lib/entities'
import { integrations } from '@/lib/integrations'
import { cn, createPageUrl } from '@/lib/utils'

const STATUS_TABS = [
  { value: '', label: 'All', countKey: 'all' },
  { value: 'pending_review', label: 'Pending', countKey: 'pending' },
  { value: 'active', label: 'Approved', countKey: 'approved' },
  { value: 'rejected', label: 'Rejected', countKey: 'rejected' },
]

const CHECKLIST = [
  'Clear eligibility & deadline',
  'Contributor verified',
  'Application form reviewed',
  'No fee or unsafe claims',
]

function typeLabel(value) {
  return OPPORTUNITY_TYPES.find((t) => t.value === value)?.label ?? value
}

/** [10, 11, 12] → "Grade 10–12", [11] → "Grade 11", [9, 11] → "Grades 9, 11" (same as the mobile app). */
function gradeRange(grades) {
  if (!grades?.length) return null
  const sorted = [...grades].sort((a, b) => a - b)
  if (sorted.length === 1) return `Grade ${sorted[0]}`
  const contiguous = sorted.every((g, i) => i === 0 || g === sorted[i - 1] + 1)
  return contiguous ? `Grade ${sorted[0]}–${sorted[sorted.length - 1]}` : `Grades ${sorted.join(', ')}`
}

function fileNameFromUrl(url) {
  try {
    const path = new URL(url).pathname
    return decodeURIComponent(path.slice(path.lastIndexOf('/') + 1)) || 'Application form'
  } catch {
    return 'Application form'
  }
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

async function notifyContributor(opportunity, approved, note) {
  if (!opportunity.contributor_id) return
  const [contributor] = await entities.UserProfile.filter({ user_id: opportunity.contributor_id }).catch(() => [])
  if (!contributor?.email) return
  await integrations.SendEmail({
    to: contributor.email,
    subject: approved ? `"${opportunity.title}" has been approved` : `"${opportunity.title}" was not approved`,
    html: approved
      ? `<p>Good news — your listing "${opportunity.title}" is now live on Career Insight.</p>`
      : `<p>Your listing "${opportunity.title}" was not approved for publishing.</p><p>Reason: ${note}</p>`,
  })
}

function ContributorLine({ contributor }) {
  if (!contributor) return <p className="text-xs text-muted-foreground">No contributor account</p>
  return contributor.verified ? (
    <p className="flex items-center gap-1 text-xs text-primary">
      <Check className="h-3 w-3" /> Verified contributor
    </p>
  ) : (
    <p className="text-xs text-destructive">Verification pending</p>
  )
}

function Pagination({ page, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE))
  const visible = Array.from({ length: pages }, (_, i) => i).filter((i) => i < 3 || i === pages - 1 || Math.abs(i - page) <= 1)
  const first = total ? page * REVIEW_PAGE_SIZE + 1 : 0
  const last = Math.min(total, (page + 1) * REVIEW_PAGE_SIZE)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <p className="text-xs text-muted-foreground">
        Showing {first}–{last} of {total} records
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded-md p-1.5 disabled:opacity-40"
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visible.map((i, index) => (
          <span key={i} className="flex items-center">
            {index > 0 && i - visible[index - 1] > 1 && <span className="px-1 text-xs">…</span>}
            <button
              type="button"
              onClick={() => onPage(i)}
              className={cn(
                'h-7 min-w-7 rounded-full px-2 text-xs',
                i === page ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-secondary'
              )}
            >
              {i + 1}
            </button>
          </span>
        ))}
        <button
          type="button"
          className="rounded-md p-1.5 text-primary disabled:opacity-40"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages - 1}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function ReviewDetail({ opportunity, contributor, onDecided, focusNoteToken }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [checked, setChecked] = useState([])
  const [note, setNote] = useState(opportunity.review_note ?? '')
  const [deciding, setDeciding] = useState(null)
  const [uploading, setUploading] = useState(false)
  const noteRef = useRef(null)
  const fileRef = useRef(null)
  const pending = opportunity.status === 'pending_review'

  useEffect(() => {
    if (focusNoteToken) noteRef.current?.focus()
  }, [focusNoteToken])

  async function decide(decision) {
    if (decision === 'reject' && !note.trim()) {
      toast.error('Add a reason before rejecting — it is sent to the contributor.')
      noteRef.current?.focus()
      return
    }
    setDeciding(decision)
    try {
      const updated = await decideOpportunity(opportunity, decision, note, user.id)
      toast.success(decision === 'approve' ? 'Opportunity approved and published' : 'Submission rejected')
      onDecided(updated)
      notifyContributor(opportunity, decision === 'approve', note.trim()).catch((error) =>
        toast.error(error.message ?? 'Saved, but the notification email failed to send')
      )
    } catch (error) {
      toast.error(error.message ?? 'Could not save the decision')
    } finally {
      setDeciding(null)
    }
  }

  async function replaceForm(file) {
    if (!file) return
    setUploading(true)
    try {
      const formUrl = await integrations.UploadForm(file)
      await entities.Opportunity.update(opportunity.id, { form_url: formUrl })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      toast.success('Application form replaced')
    } catch (error) {
      toast.error(error.message ?? 'Could not upload the form')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const criteria = (opportunity.requirements ?? '')
    .split(/\r?\n|;/)
    .map((line) => line.replace(/^\s*([-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
  const grades = gradeRange(opportunity.eligibility_grades)
  const contributorName = contributor?.organization_name || opportunity.contributor_name || 'Unknown contributor'

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">{opportunity.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selected opportunity · Submitted {formatDate(opportunity.created_at)}
          </p>
        </div>
        <p className="text-sm font-medium text-primary">
          {pending
            ? 'Pending decision'
            : opportunity.reviewed_at
              ? `Decided ${formatDate(opportunity.reviewed_at)}`
              : 'No review recorded'}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <Panel>
            <h3 className="font-display text-xl font-semibold">Listing &amp; eligibility</h3>
            {opportunity.description && (
              <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">{opportunity.description}</p>
            )}
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Eligible learners
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {grades && <li>{grades}</li>}
                  {criteria.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                  {!grades && !criteria.length && <li className="text-muted-foreground">Not specified</li>}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Value / deadline
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>{opportunity.value || 'Value not stated'}</li>
                  <li>{opportunity.deadline ? formatDate(opportunity.deadline) : 'No deadline'}</li>
                </ul>
              </div>
            </div>
            {opportunity.application_url && (
              <a
                href={opportunity.application_url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground hover:text-primary"
              >
                <Link2 className="h-4 w-4" /> Provider URL · {opportunity.application_url}
              </a>
            )}
          </Panel>

          <Panel>
            <h3 className="font-display text-xl font-semibold">Decision checklist</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CHECKLIST.map((item) => {
                const on = checked.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={!pending}
                    onClick={() => setChecked((list) => (on ? list.filter((i) => i !== item) : [...list, item]))}
                    className={cn('flex items-center gap-2 text-left text-sm', on ? 'text-primary' : 'text-muted-foreground')}
                    aria-pressed={on}
                  >
                    <CircleCheck className={cn('h-4 w-4', on ? 'text-accent' : 'text-border')} />
                    {item}
                  </button>
                )
              })}
            </div>

            <label htmlFor="review-note" className="mt-5 block text-sm font-semibold">
              Internal note / reason if rejected
            </label>
            <Textarea
              id="review-note"
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!pending}
              placeholder="e.g. Eligibility and attachment checked. Ready for a decision."
              className="mt-2 min-h-[48px] rounded-xl bg-secondary/40"
            />

            {pending ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    className="h-12 rounded-lg text-[15px]"
                    onClick={() => decide('approve')}
                    disabled={Boolean(deciding) || checked.length < CHECKLIST.length}
                    title={checked.length < CHECKLIST.length ? 'Tick every checklist item first' : undefined}
                  >
                    <Check /> {deciding === 'approve' ? 'Publishing…' : 'Approve & publish'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-12 rounded-lg text-[15px]"
                    onClick={() => decide('reject')}
                    disabled={Boolean(deciding)}
                  >
                    <X /> {deciding === 'reject' ? 'Rejecting…' : 'Reject submission'}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Decisions are logged and emailed to the contributor. Rejection requires a reason.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                This listing is <OpportunityStatusPill status={opportunity.status} />. Only pending submissions can be
                decided here.
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <div className="flex items-start gap-3">
              <GradientAvatar name={contributorName} src={contributor?.organization_logo} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold">{contributorName}</p>
                <p className="text-xs text-muted-foreground">
                  {CONTRIBUTOR_TYPES.find((t) => t.value === contributor?.contributor_type)?.label ?? 'Contributor'}
                </p>
              </div>
              {contributor?.verified && <CircleCheck className="h-5 w-5 text-accent" />}
            </div>
            <div className="mt-3">
              {contributor?.verified ? (
                <Pill tone="primary">Verified</Pill>
              ) : (
                <Pill tone="danger">{contributor ? 'Not yet verified' : 'No contributor account'}</Pill>
              )}
            </div>
            {contributor && !contributor.verified && (
              <Link
                to={createPageUrl('AdminContributors')}
                className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open verification queue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </Panel>

          <Panel>
            <h3 className="font-display text-xl font-semibold">Attached form management</h3>
            {opportunity.form_url ? (
              <div className="mt-4 flex items-start gap-3">
                <FileText className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.5} />
                <p className="min-w-0 truncate text-sm font-medium">{fileNameFromUrl(opportunity.form_url)}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No application form attached yet.</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-lg text-primary"
                disabled={!opportunity.form_url}
                onClick={() => window.open(opportunity.form_url, '_blank', 'noopener')}
              >
                <Eye /> Preview
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-lg text-primary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload /> {uploading ? 'Uploading…' : opportunity.form_url ? 'Replace form' : 'Upload form'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => replaceForm(e.target.files?.[0])}
              />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Download events</p>
              <p className="font-display text-2xl font-semibold">
                {new Intl.NumberFormat('en-US').format(opportunity.downloads_count ?? 0)}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  )
}

/** "Admin opportunity review" design. */
export default function AdminOpportunities() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const selectedId = params.get('id')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [focusNoteToken, setFocusNoteToken] = useState(0)

  function updateParams(next) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value)
      else merged.delete(key)
    }
    setParams(merged, { replace: true })
  }

  const counts = useQuery({ queryKey: ['admin', 'opportunity-counts'], queryFn: fetchOpportunityStatusCounts })
  const list = useQuery({
    queryKey: ['admin', 'review-list', { status, search, type, page }],
    queryFn: () => fetchReviewOpportunities({ status, search, type, page }),
    placeholderData: keepPreviousData,
  })
  const rows = list.data?.rows ?? []

  const selected = useQuery({
    queryKey: ['admin', 'opportunity', selectedId],
    queryFn: () => entities.Opportunity.get(selectedId),
    enabled: Boolean(selectedId),
    initialData: () => rows.find((row) => row.id === selectedId),
  })

  const contributorIds = [...rows.map((r) => r.contributor_id), selected.data?.contributor_id]
  const contributors = useQuery({
    queryKey: ['admin', 'row-contributors', contributorIds],
    queryFn: () => fetchContributorsByUserId(contributorIds),
    placeholderData: keepPreviousData,
  })
  const contributorFor = (opp) => (opp?.contributor_id ? contributors.data?.[opp.contributor_id] : undefined)

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  function quickApprove(opp) {
    // Quick approval still goes through the checklist so nothing is published unreviewed.
    updateParams({ id: opp.id })
    toast.info('Tick the decision checklist below, then approve.')
  }

  function quickReject(opp) {
    updateParams({ id: opp.id })
    setFocusNoteToken(Date.now())
  }

  async function exportList() {
    try {
      const all = await fetchReviewOpportunitiesForExport({ status, search, type })
      const header = ['Title', 'Type', 'Contributor', 'Status', 'Deadline', 'Received', 'Downloads']
      const lines = all.map((o) =>
        [o.title, typeLabel(o.type), o.contributor_name, o.status, o.deadline, o.created_at, o.downloads_count]
          .map(csvCell)
          .join(',')
      )
      const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `opportunities-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error.message ?? 'Could not export the list')
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Opportunity review"
        description="Review eligibility, verify the source and keep application resources up to date."
        actions={
          <Button className="h-11 rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus /> New opportunity
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setPage(0)
                  updateParams({ status: tab.value })
                }}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold',
                  active ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:bg-secondary',
                  !active && tab.value === 'pending_review' && 'border-transparent bg-primary-soft text-primary'
                )}
              >
                {tab.label} {counts.data?.[tab.countKey] ?? ''}
              </button>
            )
          })}
        </div>

        <label className="flex h-12 min-w-[240px] flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search title or contributor"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <Button variant="outline" className="h-12 rounded-xl text-primary" onClick={exportList}>
          <Download /> Export list
        </Button>
      </div>

      <Panel className="overflow-hidden p-0 md:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="text-sm font-medium">
            {selected.data ? `1 selected · ${selected.data.title}` : `${list.data?.total ?? 0} opportunities`}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Type:
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value)
                setPage(0)
              }}
              className="rounded-full border border-border bg-card px-2 py-1 text-xs font-medium text-foreground"
            >
              <option value="">All</option>
              {OPPORTUNITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-secondary/60">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-12 py-3 pl-4" aria-label="Selected" />
                <th className="py-3 pr-4">Opportunity</th>
                <th className="py-3 pr-4">Contributor</th>
                <th className="py-3 pr-4">Deadline</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Received</th>
                <th className="py-3 pr-4">Quick actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((opp) => {
                const isSelected = opp.id === selectedId
                return (
                  <tr
                    key={opp.id}
                    className={cn('border-t border-border', isSelected && 'bg-primary-soft/40')}
                  >
                    <td className="py-4 pl-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => updateParams({ id: isSelected ? '' : opp.id })}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        aria-label={`Select ${opp.title}`}
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-[15px] font-medium">{opp.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[typeLabel(opp.type), opp.value].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm">{opp.contributor_name || '—'}</p>
                      <ContributorLine contributor={contributorFor(opp)} />
                    </td>
                    <td className="py-4 pr-4 text-sm">{formatDate(opp.deadline)}</td>
                    <td className="py-4 pr-4">
                      <OpportunityStatusPill status={opp.status} />
                    </td>
                    <td className="py-4 pr-4 text-sm text-muted-foreground">{formatShortDate(opp.created_at)}</td>
                    <td className="py-4 pr-4">
                      {opp.status === 'pending_review' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => quickApprove(opp)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-primary hover:bg-primary-soft"
                            aria-label={`Approve ${opp.title}`}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => quickReject(opp)}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive-soft text-destructive"
                            aria-label={`Reject ${opp.title}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateParams({ id: opp.id })}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Review
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateParams({ id: opp.id })}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View decision <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    {list.isPending
                      ? 'Loading…'
                      : list.isError
                        ? `Could not load opportunities: ${list.error.message}`
                        : 'No opportunities match these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border">
          <Pagination page={page} total={list.data?.total ?? 0} onPage={setPage} />
        </div>
      </Panel>

      {selected.data ? (
        <ReviewDetail
          key={selected.data.id}
          opportunity={selected.data}
          contributor={contributorFor(selected.data)}
          focusNoteToken={focusNoteToken}
          onDecided={(updated) => {
            queryClient.setQueryData(['admin', 'opportunity', updated.id], updated)
            refreshAll()
          }}
        />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Select an opportunity above to review its listing, contributor and form.
        </p>
      )}

      <CreateOpportunityDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refreshAll} />
    </div>
  )
}
