import { Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'

export function TopPostsList({ posts }) {
  if (!posts?.length) return <EmptyState icon={Heart} title="No posts yet" />

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="flex items-center justify-between gap-4 p-3">
            <p className="line-clamp-1 text-sm">{post.content}</p>
            <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" /> {post.likes_count ?? 0}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
