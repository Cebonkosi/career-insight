import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, Radio, ShieldOff } from 'lucide-react'
import {
  AdminPageHeader,
  FilterTabs,
  Pagination,
  Panel,
  Pill,
  QueryError,
  SearchBox,
  formatDate,
} from '@/components/admin/AdminUi'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { USERS_PAGE_SIZE, fetchUsers, updateUserAccess } from '@/lib/adminData'
import { CONTRIBUTOR_TYPES } from '@/lib/constants'
import { integrations } from '@/lib/integrations'

const ROLE_TABS = [
  { value: '', label: 'Everyone' },
  { value: 'student', label: 'Students' },
  { value: 'parent', label: 'Parents' },
  { value: 'contributor', label: 'Contributors' },
  { value: 'tutor', label: 'Tutors' },
  { value: 'pending', label: 'Awaiting approval' },
  { value: 'admin', label: 'Admins' },
]

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'admin', label: 'Admin' },
]

function roleValue(user) {
  return user.role === 'contributor' && user.contributor_type === 'tutor' ? 'tutor' : user.role
}

function roleLabel(user) {
  if (user.role === 'contributor') {
    return user.contributor_type === 'tutor'
      ? 'Tutor'
      : `Contributor · ${CONTRIBUTOR_TYPES.find((t) => t.value === user.contributor_type)?.label ?? 'Organisation'}`
  }
  return ROLE_OPTIONS.find((r) => r.value === user.role)?.label ?? user.role
}

function UserRow({ user, isMe, onChange }) {
  const [saving, setSaving] = useState(false)
  const contributor = user.role === 'contributor'
  const tutor = contributor && user.contributor_type === 'tutor'

  async function apply(changes, message) {
    setSaving(true)
    try {
      await onChange(user, changes)
      toast.success(message)
    } catch (error) {
      toast.error(error.message ?? 'Could not update the account')
    } finally {
      setSaving(false)
    }
  }

  function changeRole(next) {
    if (next === roleValue(user)) return
    const label = ROLE_OPTIONS.find((r) => r.value === next)?.label
    const warning =
      next === 'admin'
        ? `Make ${user.display_name} an ADMIN? Admins can publish opportunities, manage every user and see all analytics.`
        : `Change ${user.display_name} to ${label}?`
    if (!window.confirm(warning)) return
    const changes =
      next === 'tutor'
        ? { role: 'contributor', contributor_type: 'tutor' }
        : next === 'contributor'
          ? { role: 'contributor', contributor_type: user.contributor_type === 'tutor' ? 'professional' : user.contributor_type ?? 'professional' }
          : { role: next, contributor_type: null, verified: false, can_host_live: false }
    apply(changes, `${user.display_name} is now ${label === 'Admin' ? 'an' : 'a'} ${label}`)
  }

  return (
    <tr className="border-t border-border align-top">
      <td className="py-3 pl-4 pr-4">
        <div className="flex items-center gap-3">
          <GradientAvatar name={user.organization_name || user.display_name} src={user.avatar_url} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium">
              {user.display_name}
              {isMe && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {[user.organization_name, user.email].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <select
          value={roleValue(user)}
          disabled={saving || isMe}
          title={isMe ? 'You can’t change your own role' : undefined}
          onChange={(e) => changeRole(e.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm"
          aria-label={`Role for ${user.display_name}`}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">{roleLabel(user)}</p>
      </td>
      <td className="py-3 pr-4">
        {contributor ? (
          user.verified ? (
            <Pill tone="success">Approved</Pill>
          ) : (
            <Pill tone="danger">Awaiting approval</Pill>
          )
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{formatDate(user.created_at)}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap gap-1">
          {contributor &&
            (user.verified ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={saving}
                onClick={() =>
                  window.confirm(`Withdraw approval for ${user.display_name}? They lose categories, hosting and analytics.`) &&
                  apply({ verified: false, can_host_live: false }, 'Approval withdrawn')
                }
              >
                <ShieldOff /> Withdraw
              </Button>
            ) : (
              <Button size="sm" disabled={saving} onClick={() => apply({ verified: true }, `${user.display_name} approved`)}>
                <BadgeCheck /> Approve
              </Button>
            ))}
          {tutor && user.verified && (
            <Button
              size="sm"
              variant={user.can_host_live ? 'ghost' : 'outline'}
              disabled={saving}
              onClick={() =>
                apply(
                  { can_host_live: !user.can_host_live },
                  user.can_host_live ? 'Live hosting removed' : 'Live hosting granted'
                )
              }
            >
              <Radio /> {user.can_host_live ? 'Remove hosting' : 'Allow hosting'}
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

/** Users & roles (UAT ADM-003, AUTH-003/004). Every change here is recorded in the audit log. */
export default function AdminUsers() {
  const queryClient = useQueryClient()
  const { user: me } = useAuth()
  const [params] = useSearchParams()
  const [role, setRole] = useState(() => params.get('role') ?? '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const users = useQuery({
    queryKey: ['admin', 'users', { role, search, page }],
    queryFn: () => fetchUsers({ role, search, page }),
    placeholderData: keepPreviousData,
  })

  async function change(user, changes) {
    await updateUserAccess(user.id, changes)
    queryClient.invalidateQueries({ queryKey: ['admin'] })
    queryClient.invalidateQueries({ queryKey: ['contributors'] })
    if (changes.verified && user.email) {
      integrations
        .SendEmail({
          to: user.email,
          subject: 'Your Career Insight account is approved',
          html: `<p>Hi ${user.organization_name || user.display_name},</p><p>Your account has been approved. You can now categorise posts and see your analytics in the Career Insight app.</p>`,
        })
        .catch(() => {})
    }
  }

  const rows = users.data?.rows ?? []

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Users & roles"
        description="Approve contributors and tutors, grant live hosting and change roles. Every change is audited."
      />

      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs
          tabs={ROLE_TABS}
          value={role}
          onChange={(value) => {
            setRole(value)
            setPage(0)
          }}
        />
        <SearchBox
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(0)
          }}
          placeholder="Search name, organisation or email"
        />
      </div>

      <Panel className="overflow-hidden p-0 md:p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-secondary/60">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pl-4 pr-4">Person</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Approval</th>
                <th className="py-3 pr-4">Joined</th>
                <th className="py-3 pr-4">Access</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <UserRow key={user.id} user={user} isMe={user.user_id === me?.id} onChange={change} />
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5}>
                    {users.isError ? (
                      <QueryError error={users.error} onRetry={() => users.refetch()} what="users" />
                    ) : (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        {users.isPending ? 'Loading…' : 'No users match these filters.'}
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border">
          <Pagination page={page} pageSize={USERS_PAGE_SIZE} total={users.data?.total ?? 0} onPage={setPage} noun="users" />
        </div>
      </Panel>

      <p className="text-xs text-muted-foreground">
        Tutors can post and see analytics once approved; they host live sessions only after you allow it. Contact
        details shown here are visible to admins only.
      </p>
    </div>
  )
}
