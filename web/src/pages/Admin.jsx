import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUp,
  Briefcase,
  ChevronRight,
  CircleCheck,
  Download,
  FileText,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { AdminPageHeader, Panel, PanelHeader, Pill, formatShortDate } from '@/components/admin/AdminUi'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import {
  fetchFlaggedPosts,
  fetchOverviewStats,
  fetchDraftOpportunities,
  fetchTopForms,
  fetchUnverifiedContributors,
  fetchWeeklyDownloads,
} from '@/lib/adminData'
import { OPPORTUNITY_TYPES, CONTRIBUTOR_TYPES } from '@/lib/constants'
import { cn, createPageUrl } from '@/lib/utils'

// Comma grouping ("12,480") as in the designs; en-ZA would print "12 480".
const numberFormat = new Intl.NumberFormat('en-US')

function typeLabel(value, list) {
  return list.find((t) => t.value === value)?.label ?? value
}

function GrowthLine({ growth }) {
  if (growth == null) return <p className="mt-3 text-xs text-muted-foreground">No earlier data to compare</p>
  const up = growth >= 0
  return (
    <p className={cn('mt-3 flex items-center gap-1 text-xs', up ? 'text-primary' : 'text-destructive')}>
      <ArrowUp className={cn('h-3 w-3', !up && 'rotate-180')} />
      {Math.abs(growth).toFixed(1)}% vs previous 30 days
    </p>
  )
}

function StatCard({ label, icon: Icon, value, footer }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
      </div>
      <p className="mt-4 font-display text-[32px] font-semibold leading-none">
        {value == null ? '—' : numberFormat.format(value)}
      </p>
      {footer}
    </Panel>
  )
}

function QueueRow({ to, name, title, subtitle, pill }) {
  return (
    <Link to={to} className="group flex items-center gap-3 border-b border-border py-4 last:border-0">
      <GradientAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {pill}
      <ChevronRight className="h-4 w-4 text-foreground/70 group-hover:text-primary" />
    </Link>
  )
}

function QueueEmpty({ children }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>
}

function DownloadsChart({ weeks }) {
  const max = Math.max(1, ...weeks.map((w) => w.downloads))
  return (
    <div className="mt-8 flex h-48 items-end gap-3 sm:gap-6" role="img" aria-label="Weekly form downloads">
      {weeks.map((week, index) => {
        const latest = index === weeks.length - 1
        return (
          <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{week.downloads}</span>
            <div
              className={cn('w-full max-w-[40px] rounded-md', latest ? 'bg-primary' : 'bg-secondary')}
              style={{ height: `${Math.max(4, (week.downloads / max) * 120)}px` }}
            />
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
              {formatShortDate(week.weekStart)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** "Admin overview" design. */
export default function Admin() {
  const stats = useQuery({ queryKey: ['admin', 'overview-stats'], queryFn: fetchOverviewStats })
  const drafts = useQuery({ queryKey: ['admin', 'draft-opportunities'], queryFn: () => fetchDraftOpportunities() })
  const contributors = useQuery({
    queryKey: ['admin', 'unverified-contributors'],
    queryFn: () => fetchUnverifiedContributors(),
  })
  const weekly = useQuery({ queryKey: ['admin', 'weekly-downloads'], queryFn: () => fetchWeeklyDownloads(8) })
  const topForms = useQuery({ queryKey: ['admin', 'top-forms'], queryFn: () => fetchTopForms() })
  const flagged = useQuery({ queryKey: ['admin', 'flagged-posts'], queryFn: () => fetchFlaggedPosts(6) })

  const draftTotal = drafts.data?.total ?? 0
  const awaitingTotal = contributors.data?.total ?? 0
  const reportedTotal = flagged.data?.total ?? 0
  const weeks = weekly.data ?? []
  const last30 = stats.data?.downloads

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 px-4 py-8 md:px-8">
      <AdminPageHeader
        title="Admin overview"
        description="The queues, people and resources that need your attention today."
      />

      {(awaitingTotal > 0 || reportedTotal > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary px-6 py-6 text-primary-foreground">
          <p className="flex items-center gap-3 text-sm font-semibold">
            <ShieldCheck className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            Keep Career Insight safe: {awaitingTotal} contributor account{awaitingTotal === 1 ? '' : 's'} awaiting
            approval and {reportedTotal} reported post{reportedTotal === 1 ? '' : 's'}.
          </p>
          <Link
            to={reportedTotal > 0 ? createPageUrl('AdminModeration') : `${createPageUrl('AdminUsers')}?role=pending`}
            className="flex items-center gap-2 text-sm font-semibold hover:underline"
          >
            <ArrowRight className="h-4 w-4" /> {reportedTotal > 0 ? 'Review reports' : 'Review accounts'}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active learners"
          icon={GraduationCap}
          value={stats.data?.learners.value}
          footer={<GrowthLine growth={stats.data?.learners.growth} />}
        />
        <StatCard
          label="Registered parents"
          icon={Users}
          value={stats.data?.parents.value}
          footer={<GrowthLine growth={stats.data?.parents.growth} />}
        />
        <StatCard
          label="Verified contributors"
          icon={CircleCheck}
          value={stats.data?.contributors.value}
          footer={
            <p className="mt-3 text-xs text-primary">
              {stats.data?.contributors.awaiting ?? 0} profiles awaiting verification
            </p>
          }
        />
        <StatCard
          label="Form downloads"
          icon={Download}
          value={last30?.value}
          footer={<GrowthLine growth={last30?.growth} />}
        />
      </div>
      {stats.isError && (
        <p className="text-sm text-destructive">
          Could not load stats: {stats.error.message}. Have migrations 0003 and 0004 been applied?
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Drafts to publish"
            linkTo={`${createPageUrl('AdminOpportunities')}?status=draft`}
            linkLabel={`All ${draftTotal}`}
          />
          <div className="mt-2">
            {drafts.data?.rows.map((opp) => (
              <QueueRow
                key={opp.id}
                to={`${createPageUrl('AdminOpportunities')}?status=draft&id=${opp.id}`}
                name={opp.contributor_name || opp.title}
                title={opp.title}
                subtitle={[opp.contributor_name, typeLabel(opp.type, OPPORTUNITY_TYPES), `Edited ${formatShortDate(opp.updated_at)}`]
                  .filter(Boolean)
                  .join(' · ')}
                pill={<Pill>Draft</Pill>}
              />
            ))}
            {drafts.data && !drafts.data.rows.length && <QueueEmpty>No drafts waiting. Everything is published.</QueueEmpty>}
          </div>
          <Link
            to={createPageUrl('AdminOpportunities')}
            className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-primary hover:bg-secondary"
          >
            <Briefcase className="h-4 w-4" strokeWidth={1.75} /> Manage opportunities
          </Link>
        </Panel>

        <Panel>
          <PanelHeader
            title="Contributor verification"
            linkTo={createPageUrl('AdminContributors')}
            linkLabel={`All ${awaitingTotal}`}
          />
          <div className="mt-2">
            {contributors.data?.rows.map((c) => {
              const name = c.organization_name || c.display_name
              return (
                <QueueRow
                  key={c.id}
                  to={createPageUrl('AdminContributors')}
                  name={name}
                  title={name}
                  subtitle={[typeLabel(c.contributor_type, CONTRIBUTOR_TYPES), `Joined ${formatShortDate(c.created_at)}`]
                    .filter(Boolean)
                    .join(' · ')}
                  pill={<Pill>{c.isNew ? 'New' : 'Follow up'}</Pill>}
                />
              )
            })}
            {contributors.data && !contributors.data.rows.length && (
              <QueueEmpty>Every contributor has been verified.</QueueEmpty>
            )}
          </div>
          <Link
            to={createPageUrl('AdminContributors')}
            className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-primary hover:bg-secondary"
          >
            <CircleCheck className="h-4 w-4" strokeWidth={1.75} /> Verify contributors
          </Link>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Panel>
          <PanelHeader title="Forms are opening doors">
            <Pill tone="outline" className="font-medium">
              Last 8 weeks
            </Pill>
          </PanelHeader>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="font-display text-[32px] font-semibold leading-none">
              {last30 ? numberFormat.format(last30.value) : '—'}
            </p>
            <p className="text-sm text-muted-foreground">downloads in the last 30 days</p>
            {last30?.growth != null && (
              <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <ArrowUp className={cn('h-3 w-3', last30.growth < 0 && 'rotate-180')} />
                {Math.abs(last30.growth).toFixed(1)}%
              </span>
            )}
          </div>
          {weekly.isError ? (
            <p className="mt-8 text-sm text-destructive">Could not load weekly downloads: {weekly.error.message}</p>
          ) : (
            <DownloadsChart weeks={weeks} />
          )}
          <p className="mt-6 text-xs text-muted-foreground">Weekly download events, Monday to Sunday.</p>
        </Panel>

        <Panel>
          <h2 className="font-display text-xl font-semibold">Most downloaded forms</h2>
          <div className="mt-5 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Application form</span>
            <span>Downloads</span>
          </div>
          <div className="mt-1">
            {topForms.data?.map((form) => (
              <Link
                key={form.id}
                to={`${createPageUrl('AdminOpportunities')}?id=${form.id}`}
                className="flex items-center gap-3 border-b border-border py-4 last:border-0"
              >
                <FileText className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{form.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{form.contributor_name}</p>
                </div>
                <span className="font-display text-lg font-semibold">
                  {numberFormat.format(form.downloads_count)}
                </span>
              </Link>
            ))}
            {topForms.data && !topForms.data.length && <QueueEmpty>No forms uploaded yet.</QueueEmpty>}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Content moderation"
          linkTo={createPageUrl('AdminModeration')}
          linkLabel={`View all ${flagged.data?.total ?? 0}`}
        />
        {flagged.data?.rows.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-semibold">Content / contributor</th>
                  <th className="pb-2 font-semibold">Reason</th>
                  <th className="pb-2 font-semibold">Reported</th>
                  <th className="pb-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {flagged.data.rows.map((post) => (
                  <tr key={post.id} className="align-top">
                    <td className="max-w-[320px] py-2.5 pr-4">
                      <p className="truncate text-[15px] font-medium">{post.content}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {[post.author_name, post.post_type ?? 'post'].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="py-2.5 pr-4 text-sm">Reported by a user</td>
                    <td className="py-2.5 pr-4 text-sm text-muted-foreground">
                      {new Date(post.updated_at).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5">
                      <Link
                        to={createPageUrl('AdminModeration')}
                        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Review <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <QueueEmpty>{flagged.isPending ? 'Loading…' : 'Nothing has been flagged.'}</QueueEmpty>
        )}
      </Panel>
    </div>
  )
}
