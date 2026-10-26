import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert, Check, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    } catch (error) {
      toast.error(error.message ?? 'Could not update post')
    }
  }

  async function remove(id) {
    try {
      await entities.Post.update(id, { status: 'removed' })
      queryClient.invalidateQueries({ queryKey: ['posts', 'flagged'] })
    } catch (error) {
      toast.error(error.message ?? 'Could not remove post')
    }
  }

  if (!flagged?.length) {
    return <EmptyState icon={ShieldAlert} title="No flagged posts" />
  }

  return (
    <div className="space-y-2">
      {flagged.map((post) => (
        <Card key={post.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="line-clamp-2 text-sm">{post.content}</p>
              <p className="text-xs text-muted-foreground">by {post.author_name}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={() => approve(post.id)} aria-label="Restore">
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => remove(post.id)} aria-label="Remove">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
