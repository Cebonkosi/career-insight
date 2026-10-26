import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CommentThread } from './CommentThread'

export function PostCard({ post }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const initials = (post.author_name || '?').slice(0, 1).toUpperCase()

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.author_avatar} alt={post.author_name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{post.author_name}</p>
            <p className="text-xs text-muted-foreground">
              {post.author_role} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
          {post.post_type && (
            <Badge variant="secondary" className="capitalize">
              {post.post_type}
            </Badge>
          )}
        </div>

        <div className="text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {post.media_urls?.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {post.media_urls.map((url) => (
              <img key={url} src={url} alt="" className="rounded-lg object-cover" />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" /> {post.likes_count ?? 0}
          </span>
          <button
            className="flex items-center gap-1.5 hover:text-foreground"
            onClick={() => setCommentsOpen((v) => !v)}
          >
            <MessageCircle className="h-4 w-4" /> {post.comments_count ?? 0}
          </button>
          <span className="flex items-center gap-1.5">
            <Share2 className="h-4 w-4" /> {post.shares_count ?? 0}
          </span>
        </div>

        {commentsOpen && (
          <div className="mt-3">
            <CommentThread post={post} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
