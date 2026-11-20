import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert, Check, Trash2 } from 'lucide-react'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { entities } from '@/lib/entities'

export function ModerationQueue() {
  const queryClient = useQueryClient()

  const { data: flagged } = useQuery({
    queryKey: ['posts', 'flagged'],
    queryFn: () => entities.Post.filter({ status: 'flagged' }, '-created_at', 100),
  })

  async function approve(id) {
    try {
      await entities.Post.update(id, { status: 'published' })
      queryClient.invalidateQueries({ queryKey: ['posts', 'flagged'] })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    } catch (error) {
      toast.error(error.message ?? 'Could not update post')
    }
  }

  async function remove(id) {
    try {
      await entities.Post.update(id, { status: 'removed' })
      queryClient.invalidateQueries({ queryKey: ['posts', 'flagged'] })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    } catch (error) {
      toast.error(error.message ?? 'Could not remove post')
    }
  }

  if (!flagged?.length) {
    return <EmptyState icon={ShieldAlert} title="No flagged posts" />
  }

  return (
    <div>
      {flagged.map((post) => (
        <div key={post.id} className="flex items-start gap-3 border-b border-border py-4 last:border-0">
          <GradientAvatar name={post.author_name} src={post.author_avatar} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[15px]">{post.content}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {[post.author_name, post.author_role, post.post_type].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full text-primary" onClick={() => approve(post.id)}>
              <Check /> Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-transparent bg-destructive-soft text-destructive hover:bg-destructive-soft/70"
              onClick={() => remove(post.id)}
            >
              <Trash2 /> Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
