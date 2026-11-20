import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Sparkles } from 'lucide-react'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import { createPageUrl } from '@/lib/utils'
import { entities } from '@/lib/entities'

const SECTION_LABELS = [
  ['/admin/opportunities', 'Opportunities'],
  ['/admin/moderation', 'Content moderation'],
  ['/admin/users', 'Users & roles'],
  ['/admin/live', 'Live sessions'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/audit', 'Audit log'],
  ['/admin', 'Overview'],
  ['/careers', 'Careers'],
  ['/polls', 'Polls'],
  ['/notifications', 'Notifications'],
  ['/profile', 'Profile'],
]

const todayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export function TopBar({ profile }) {
  const { pathname } = useLocation()
  const section = SECTION_LABELS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Overview'

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread', profile?.user_id],
    queryFn: async () => {
      const rows = await entities.Notification.filter({ user_id: profile.user_id, read: false })
      return rows.length
    },
    enabled: Boolean(profile?.user_id),
  })

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur-lg md:ml-[232px] md:px-8">
      <Link to={createPageUrl('Admin')} className="flex items-center gap-2 md:hidden">
        <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.75} />
        <span className="font-display text-lg font-semibold">Career Insight</span>
      </Link>

      <p className="hidden text-sm text-muted-foreground md:block">
        Workspace <span className="mx-0.5">/</span> {section}
      </p>

      <div className="flex items-center gap-5">
        <span className="hidden text-sm text-muted-foreground sm:block">{todayFormat.format(new Date())}</span>

        <Link to={createPageUrl('Notifications')} className="relative" aria-label="Notifications">
          <Bell className="h-[22px] w-[22px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link to={createPageUrl('Profile')} aria-label="Your profile">
          <GradientAvatar name={profile?.display_name} src={profile?.avatar_url} className="h-10 w-10" />
        </Link>
      </div>
    </header>
  )
}
