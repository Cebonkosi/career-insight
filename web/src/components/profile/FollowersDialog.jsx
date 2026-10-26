import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/components/common/EmptyState'
import { entities } from '@/lib/entities'
import { createPageUrl } from '@/lib/utils'
import { Users } from 'lucide-react'

export function FollowersDialog({ open, onOpenChange, userId, title = 'Followers' }) {
  const { data: follows } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => entities.Follow.filter({ following_id: userId }, '-created_at', 200),
    enabled: open && Boolean(userId),
  })

  const { data: profiles } = useQuery({
    queryKey: ['followers-profiles', userId, follows?.length],
    queryFn: () =>
      Promise.all((follows ?? []).map((f) => entities.UserProfile.filter({ user_id: f.follower_id }))).then(
        (results) => results.map((r) => r[0]).filter(Boolean)
      ),
    enabled: open && Boolean(follows),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {!profiles?.length ? (
          <EmptyState icon={Users} title="No followers yet" />
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto thin-scrollbar">
            {profiles.map((p) => (
              <Link
                key={p.id}
                to={createPageUrl('Profile', { id: p.user_id })}
                className="flex items-center gap-3"
                onClick={() => onOpenChange(false)}
              >
                <Avatar>
                  <AvatarImage src={p.avatar_url} alt={p.display_name} />
                  <AvatarFallback>{(p.display_name || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{p.display_name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{p.role}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
