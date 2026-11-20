import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AdminPageHeader, FilterTabs, Pagination, Panel, QueryError, formatDateTime } from '@/components/admin/AdminUi'
import { AUDIT_PAGE_SIZE, fetchAuditLog } from '@/lib/adminData'

const TABLES = [
  { value: '', label: 'Everything' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'user_profiles', label: 'Users & roles' },
  { value: 'posts', label: 'Content' },
  { value: 'live_streams', label: 'Live sessions' },
]

const TABLE_LABELS = Object.fromEntries(TABLES.map((t) => [t.value, t.label]))

function describe(entry) {
  if (entry.action !== 'update') return entry.action === 'insert' ? 'Created' : 'Deleted'
  return Object.entries(entry.details ?? {})
    .map(([field, change]) => `${field.replaceAll('_', ' ')}: ${JSON.stringify(change?.from)} → ${JSON.stringify(change?.to)}`)
    .join('; ')
}

/** Who did what, when — written by the database, read-only for admins (UAT ADM-006). */
export default function AdminAudit() {
  const [table, setTable] = useState('')
  const [page, setPage] = useState(0)
  const log = useQuery({
    queryKey: ['admin', 'audit', { table, page }],
    queryFn: () => fetchAuditLog({ table, page }),
    placeholderData: keepPreviousData,
  })
  const rows = log.data?.rows ?? []

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Audit log"
        description="Every admin change to opportunities, roles, content and live sessions. Entries can't be edited."
      />
      <FilterTabs
        tabs={TABLES}
        value={table}
        onChange={(value) => {
          setTable(value)
          setPage(0)
        }}
      />
      <Panel className="overflow-hidden p-0 md:p-0">
        {log.isError ? (
          <QueryError error={log.error} onRetry={() => log.refetch()} what="the audit log" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-secondary/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pl-5 pr-4">When</th>
                  <th className="py-3 pr-4">Admin</th>
                  <th className="py-3 pr-4">Area</th>
                  <th className="py-3 pr-4">Item</th>
                  <th className="py-3 pr-5">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap py-3 pl-5 pr-4 text-sm text-muted-foreground">{formatDateTime(entry.created_at)}</td>
                    <td className="py-3 pr-4 text-sm">{entry.actor_name}</td>
                    <td className="py-3 pr-4 text-sm">{TABLE_LABELS[entry.target_table] ?? entry.target_table}</td>
                    <td className="max-w-[220px] py-3 pr-4 text-sm">{entry.target_label ?? '—'}</td>
                    <td className="max-w-[360px] break-words py-3 pr-5 text-xs text-muted-foreground">{describe(entry)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {log.isPending ? 'Loading…' : 'No admin actions recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border">
          <Pagination page={page} pageSize={AUDIT_PAGE_SIZE} total={log.data?.total ?? 0} onPage={setPage} noun="entries" />
        </div>
      </Panel>
    </div>
  )
}
