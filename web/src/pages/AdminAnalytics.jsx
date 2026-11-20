import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { AdminPageHeader, FilterTabs, Panel, QueryError, downloadCsv, numberFormat } from '@/components/admin/AdminUi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchAnalyticsSummary, fetchDownloadAnalytics } from '@/lib/adminData'

const PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

function isoDay(date) {
  return date.toISOString().slice(0, 10)
}

/** Turns the chosen preset or custom dates into an inclusive [from, to) range. */
function rangeFor(preset, custom) {
  if (preset === 'custom') {
    return {
      from: new Date(`${custom.from}T00:00:00+02:00`).toISOString(),
      to: new Date(new Date(`${custom.to}T00:00:00+02:00`).getTime() + 864e5).toISOString(),
    }
  }
  const to = new Date()
  return { from: new Date(to.getTime() - Number(preset) * 864e5).toISOString(), to: new Date(to.getTime() + 60_000).toISOString() }
}

function Stat({ label, value, note }) {
  return (
    <Panel className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-[30px] font-semibold leading-none">{value == null ? '—' : numberFormat.format(value)}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </Panel>
  )
}

/** Platform analytics with date filters (UAT ANL-001…006). */
export default function AdminAnalytics() {
  const today = new Date()
  const [preset, setPreset] = useState('30')
  const [custom, setCustom] = useState({ from: isoDay(new Date(today.getTime() - 30 * 864e5)), to: isoDay(today) })
  const customValid = preset !== 'custom' || (custom.from && custom.to && custom.from <= custom.to)
  const range = customValid ? rangeFor(preset, custom) : null

  const summary = useQuery({
    queryKey: ['admin', 'analytics-summary', range],
    queryFn: () => fetchAnalyticsSummary(range.from, range.to),
    enabled: Boolean(range),
    placeholderData: keepPreviousData,
  })
  const perOpportunity = useQuery({
    queryKey: ['admin', 'analytics-opportunities', range],
    queryFn: () => fetchDownloadAnalytics(range.from, range.to),
    enabled: Boolean(range),
    placeholderData: keepPreviousData,
  })
  const s = summary.data
  const rows = perOpportunity.data ?? []

  function exportCsv() {
    downloadCsv(
      `opportunity-analytics-${preset === 'custom' ? `${custom.from}_${custom.to}` : `last-${preset}-days`}.csv`,
      ['Opportunity', 'Status', 'Views', 'Download events', 'Unique downloaders'],
      rows.map((r) => [r.title, r.status, r.views, r.downloads, r.unique_downloaders])
    )
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader title="Analytics" description="Engagement across Career Insight for the period you choose." />

      <div className="flex flex-wrap items-end gap-3">
        <FilterTabs tabs={PRESETS} value={preset} onChange={setPreset} />
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <Input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="From" />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="To" />
          </div>
        )}
      </div>
      {!customValid && <p className="text-sm text-destructive">Pick a start date on or before the end date.</p>}

      {summary.isError ? (
        <QueryError error={summary.error} onRetry={() => summary.refetch()} what="analytics" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Opportunity views" value={s?.views} note="Detail-page opens" />
          <Stat label="Form downloads" value={s?.downloads} note="Completed download events" />
          <Stat label="Unique downloaders" value={s?.unique_downloaders} note="Distinct learners who downloaded" />
          <Stat label="Live session joins" value={s?.live_viewers} />
          <Stat label="New students" value={s?.new_students} />
          <Stat label="New parents" value={s?.new_parents} />
          <Stat label="Posts" value={s?.posts} />
          <Stat label="Comments / likes" value={s ? s.comments + s.likes : null} note={s ? `${s.comments} comments · ${s.likes} likes` : undefined} />
        </div>
      )}

      <Panel className="overflow-hidden p-0 md:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="font-display text-xl font-semibold">By opportunity</h2>
          <Button variant="outline" className="text-primary" onClick={exportCsv} disabled={!rows.length}>
            <Download /> Export CSV
          </Button>
        </div>
        {perOpportunity.isError ? (
          <QueryError error={perOpportunity.error} onRetry={() => perOpportunity.refetch()} what="opportunity analytics" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-secondary/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pl-5 pr-4">Opportunity</th>
                  <th className="py-3 pr-4 text-right">Views</th>
                  <th className="py-3 pr-4 text-right">Download events</th>
                  <th className="py-3 pr-5 text-right">Unique downloaders</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.opportunity_id} className="border-t border-border">
                    <td className="py-3 pl-5 pr-4 text-sm">
                      {r.title}
                      {r.status !== 'active' && <span className="ml-2 text-xs text-muted-foreground">({r.status === 'closed' ? 'archived' : r.status})</span>}
                    </td>
                    <td className="py-3 pr-4 text-right text-sm">{numberFormat.format(r.views)}</td>
                    <td className="py-3 pr-4 text-right text-sm">{numberFormat.format(r.downloads)}</td>
                    <td className="py-3 pr-5 text-right text-sm">{numberFormat.format(r.unique_downloaders)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      {perOpportunity.isPending ? 'Loading…' : 'No opportunities yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="text-xs text-muted-foreground">
        Download events count every completed download; unique downloaders count each learner once. Failed downloads
        are never recorded. Career Insight does not see whether an application was submitted to the provider.
      </p>
    </div>
  )
}
