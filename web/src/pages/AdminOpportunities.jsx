import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Archive, Download, Eye, FileText, Link2, Pencil, Plus, RotateCcw, Send } from 'lucide-react'
import {
  AdminPageHeader,
  FilterTabs,
  OpportunityStatusPill,
  Pagination,
  Panel,
  QueryError,
  SearchBox,
  downloadCsv,
  formatDate,
  formatDateTime,
  formatShortDate,
  numberFormat,
} from '@/components/admin/AdminUi'
import { OpportunityEditor } from '@/components/admin/OpportunityEditor'
import { Button } from '@/components/ui/button'
import {
  OPPORTUNITY_PAGE_SIZE,
  OPPORTUNITY_TABS,
  fetchDownloadAnalytics,
  fetchOpportunities,
  fetchOpportunitiesForExport,
  fetchOpportunity,
  fetchOpportunityStatusCounts,
  fetchRecentDownloads,
  setOpportunityStatus,
} from '@/lib/adminData'
import { OPPORTUNITY_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

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

function fileName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop()).replace(/^\d+-/, '')
  } catch {
    return 'Application form'
  }
}

const ALL_TIME = '2000-01-01T00:00:00Z'

function OpportunityDetail({ opportunity, onEdit, onStatus, busy }) {
  const stats = useQuery({
    queryKey: ['admin', 'opportunity-stats', opportunity.id],
    queryFn: async () => {
      const rows = await fetchDownloadAnalytics(ALL_TIME, new Date(Date.now() + 864e5).toISOString())
      return rows.find((row) => row.opportunity_id === opportunity.id) ?? { views: 0, downloads: 0, unique_downloaders: 0 }
    },
  })
  const recent = useQuery({
    queryKey: ['admin', 'recent-downloads', opportunity.id],
    queryFn: () => fetchRecentDownloads(opportunity.id),
  })
  const criteria = (opportunity.requirements ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const grades = gradeRange(opportunity.eligibility_grades)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">{opportunity.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(opportunity.created_at)}
            {opportunity.published_at && ` · Published ${formatDate(opportunity.published_at)}`}
            {opportunity.archived_at && ` · Archived ${formatDate(opportunity.archived_at)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil /> Edit
          </Button>
          {opportunity.status === 'active' ? (
            <Button variant="outline" disabled={busy} onClick={() => onStatus('closed')}>
              <Archive /> Archive
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => onStatus('active')}>
              {opportunity.status === 'closed' ? <RotateCcw /> : <Send />}
              {opportunity.status === 'closed' ? 'Restore & publish' : 'Publish'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <Panel className="space-y-5">
          {opportunity.image_url ? (
            <img src={opportunity.image_url} alt="" className="h-44 w-full rounded-xl object-cover" />
          ) : (
            <div className="brand-gradient h-28 w-full rounded-xl" aria-hidden="true" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <OpportunityStatusPill status={opportunity.status} />
            <span className="text-sm text-muted-foreground">
              {[typeLabel(opportunity.type), opportunity.contributor_name].filter(Boolean).join(' · ')}
            </span>
          </div>
          {opportunity.description && <p className="text-[15px] leading-relaxed text-foreground/80">{opportunity.description}</p>}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Eligible learners</p>
              <ul className="mt-2 space-y-1 text-sm">
                {grades && <li>{grades}</li>}
                {criteria.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {!grades && !criteria.length && <li className="text-muted-foreground">Open to all grades</li>}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Value / closing date</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>{opportunity.value || 'Value not stated'}</li>
                <li>{opportunity.deadline ? formatDate(opportunity.deadline) : 'No closing date'}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">How learners apply</p>
            <p className="mt-2 text-sm">{opportunity.external_instructions || '—'}</p>
            {opportunity.application_url && (
              <a
                href={opportunity.application_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Link2 className="h-4 w-4" /> {opportunity.application_url}
              </a>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h3 className="font-display text-xl font-semibold">Application form</h3>
            {opportunity.form_url ? (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <FileText className="h-6 w-6 shrink-0 text-primary" strokeWidth={1.5} />
                  <p className="min-w-0 truncate text-sm font-medium">{fileName(opportunity.form_url)}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="outline" className="text-primary" onClick={() => window.open(opportunity.form_url, '_blank', 'noopener')}>
                    <Eye /> Preview
                  </Button>
                  <Button variant="outline" className="text-primary" onClick={onEdit}>
                    <Pencil /> Replace
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No form attached. Learners will be pointed to the provider&apos;s instructions instead.
              </p>
            )}
          </Panel>

          <Panel>
            <h3 className="font-display text-xl font-semibold">Engagement (all time)</h3>
            {stats.isError ? (
              <QueryError error={stats.error} onRetry={() => stats.refetch()} what="engagement" />
            ) : (
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ['Views', stats.data?.views],
                  ['Downloads', stats.data?.downloads],
                  ['Unique learners', stats.data?.unique_downloaders],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-secondary/60 p-3">
                    <dd className="font-display text-2xl font-semibold">{value == null ? '—' : numberFormat.format(value)}</dd>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest downloads</p>
            <ul className="mt-2 space-y-1 text-sm">
              {recent.data?.map((event) => (
                <li key={event.id} className="flex justify-between text-muted-foreground">
                  <span>Learner download</span>
                  <span>{formatDateTime(event.created_at)}</span>
                </li>
              ))}
              {recent.data?.length === 0 && <li className="text-muted-foreground">No downloads yet.</li>}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              A download means the form reached a learner&apos;s device. It is not evidence that an application was
              submitted.
            </p>
          </Panel>
        </div>
      </div>
    </section>
  )
}

/** Admin-only opportunity management (UAT OPP-001…010). */
export default function AdminOpportunities() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'active'
  const selectedId = params.get('id')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null) // null | 'new' | opportunity
  const [busy, setBusy] = useState(false)

  function updateParams(next) {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value != null && value !== '') merged.set(key, value)
      else merged.delete(key)
    }
    // "All" is the empty status; keep it explicit in the URL so it isn't read as the default tab.
    if (next.status === '') merged.set('status', 'all')
    setParams(merged, { replace: true })
  }
  const statusFilter = status === 'all' ? '' : status

  const counts = useQuery({ queryKey: ['admin', 'opportunity-counts'], queryFn: fetchOpportunityStatusCounts })
  const list = useQuery({
    queryKey: ['admin', 'opportunities', { statusFilter, search, type, page }],
    queryFn: () => fetchOpportunities({ status: statusFilter, search, type, page }),
    placeholderData: keepPreviousData,
  })
  const rows = list.data?.rows ?? []
  const selected = useQuery({
    queryKey: ['admin', 'opportunity', selectedId],
    queryFn: () => fetchOpportunity(selectedId),
    enabled: Boolean(selectedId),
  })

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ['admin'] })
  }

  async function changeStatus(opportunity, next) {
    if (next === 'closed' && !window.confirm(`Archive "${opportunity.title}"? Learners will no longer see it. Download history is kept.`)) {
      return
    }
    if (next === 'active' && !opportunity.external_instructions) {
      toast.error('Add "How learners apply" before publishing.')
      setEditing(opportunity)
      return
    }
    setBusy(true)
    try {
      await setOpportunityStatus(opportunity.id, next)
      toast.success(next === 'active' ? 'Published' : 'Archived')
      refreshAll()
    } catch (error) {
      toast.error(error.message ?? 'Could not update the opportunity')
    } finally {
      setBusy(false)
    }
  }

  async function exportList() {
    try {
      const all = await fetchOpportunitiesForExport({ status: statusFilter, search, type })
      downloadCsv(
        `opportunities-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Title', 'Type', 'Organisation', 'Status', 'Closing date', 'Published', 'Download events'],
        all.map((o) => [o.title, typeLabel(o.type), o.contributor_name, o.status, o.deadline, o.published_at, o.downloads_count])
      )
    } catch (error) {
      toast.error(error.message ?? 'Could not export the list')
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Opportunities"
        description="Create, publish and maintain opportunities and their application forms. Only admins can do this."
        actions={
          <Button className="h-11 rounded-xl" onClick={() => setEditing('new')}>
            <Plus /> New opportunity
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs
          tabs={OPPORTUNITY_TABS}
          value={statusFilter}
          counts={counts.data}
          onChange={(value) => {
            setPage(0)
            updateParams({ status: value, id: null })
          }}
        />
        <SearchBox
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(0)
          }}
          placeholder="Search title or organisation"
        />
        <Button variant="outline" className="h-12 rounded-xl text-primary" onClick={exportList}>
          <Download /> Export list
        </Button>
      </div>

      <Panel className="overflow-hidden p-0 md:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="text-sm font-medium">
            {selected.data ? `Selected · ${selected.data.title}` : `${list.data?.total ?? 0} opportunities`}
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
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-secondary/60">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pl-4 pr-4">Opportunity</th>
                <th className="py-3 pr-4">Organisation</th>
                <th className="py-3 pr-4">Closing date</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Downloads</th>
                <th className="py-3 pr-4">Updated</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((opp) => {
                const isSelected = opp.id === selectedId
                return (
                  <tr
                    key={opp.id}
                    onClick={() => updateParams({ id: isSelected ? null : opp.id })}
                    className={cn('cursor-pointer border-t border-border hover:bg-secondary/40', isSelected && 'bg-primary-soft/40')}
                  >
                    <td className="py-3 pl-4 pr-4">
                      <div className="flex items-center gap-3">
                        {opp.image_url ? (
                          <img src={opp.image_url} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
                        ) : (
                          <div className="brand-gradient h-10 w-14 shrink-0 rounded-md" aria-hidden="true" />
                        )}
                        <div>
                          <p className="text-[15px] font-medium">{opp.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {[typeLabel(opp.type), opp.value, !opp.form_url && 'No form'].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm">{opp.contributor_name || '—'}</td>
                    <td className="py-3 pr-4 text-sm">{formatDate(opp.deadline)}</td>
                    <td className="py-3 pr-4">
                      <OpportunityStatusPill status={opp.status} />
                    </td>
                    <td className="py-3 pr-4 text-sm">{numberFormat.format(opp.downloads_count ?? 0)}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{formatShortDate(opp.updated_at)}</td>
                    <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="text-primary" onClick={() => setEditing(opp)}>
                          <Pencil /> Edit
                        </Button>
                        {opp.status === 'active' ? (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => changeStatus(opp, 'closed')}>
                            <Archive /> Archive
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-primary" disabled={busy} onClick={() => changeStatus(opp, 'active')}>
                            <Send /> Publish
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7}>
                    {list.isError ? (
                      <QueryError error={list.error} onRetry={() => list.refetch()} what="opportunities" />
                    ) : (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        {list.isPending ? 'Loading…' : 'No opportunities match these filters.'}
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border">
          <Pagination page={page} pageSize={OPPORTUNITY_PAGE_SIZE} total={list.data?.total ?? 0} onPage={setPage} noun="opportunities" />
        </div>
      </Panel>

      {selected.data ? (
        <OpportunityDetail
          key={selected.data.id}
          opportunity={selected.data}
          busy={busy}
          onEdit={() => setEditing(selected.data)}
          onStatus={(next) => changeStatus(selected.data, next)}
        />
      ) : (
        <p className="text-center text-sm text-muted-foreground">Select an opportunity to see its details, form and engagement.</p>
      )}

      {editing && (
        <OpportunityEditor
          key={editing === 'new' ? 'new' : editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          opportunity={editing === 'new' ? null : editing}
          onSaved={(saved) => {
            refreshAll()
            updateParams({ id: saved.id, status: saved.status })
          }}
        />
      )}
    </div>
  )
}
