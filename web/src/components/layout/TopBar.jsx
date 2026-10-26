import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { createPageUrl } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { entities } from '@/lib/entities'

export function TopBar({ profile }) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread', profile?.user_id],
    queryFn: async () => {
      const rows = await entities.Notification.filter({ user_id: profile.user_id, read: false })
      return rows.length
    },
    enabled: Boolean(profile?.user_id),
  })

  const initials = (profile?.display_name || '?').slice(0, 1).toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur-lg md:hidden">
      <Link to={createPageUrl('Admin')} className="font-display text-lg font-bold gradient-text">
        Career Insight
      </Link>

      <div className="flex items-center gap-3">
        <Link to={createPageUrl('Notifications')} className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link to={createPageUrl('Profile')}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  )
}
