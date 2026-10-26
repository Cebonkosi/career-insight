import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Bell, Heart, MessageCircle, UserPlus, Briefcase, Info } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { entities } from '@/lib/entities'
import { useAuth } from '@/hooks/useAuth'

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  opportunity: Briefcase,
  system: Info,
  mention: Bell,
}

export default function Notifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => entities.Notification.filter({ user_id: user.id }, '-created_at', 100),
    enabled: Boolean(user?.id),
  })

  async function markRead(notification) {
    if (notification.read) return
    await entities.Notification.update(notification.id, { read: true })
    queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] })
  }

  return (
    <div className="mx-auto max-w-xl space-y-2 p-4">
      <h1 className="mb-2 font-display text-xl font-bold">Notifications</h1>

      {isLoading ? (
        <LoadingState />
      ) : !notifications?.length ? (
        <EmptyState icon={Bell} title="No notifications yet" />
      ) : (
        notifications.map((n) => {
          const Icon = ICONS[n.type] ?? Info
          return (
            <button
              key={n.id}
              onClick={() => markRead(n)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors',
                n.read ? 'bg-transparent' : 'bg-primary/5'
              )}
            >
              {n.actor_avatar ? (
                <Avatar className="h-9 w-9">
                  <AvatarImage src={n.actor_avatar} alt={n.actor_name} />
                  <AvatarFallback>{(n.actor_name || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
          )
        })
      )}
    </div>
  )
}
