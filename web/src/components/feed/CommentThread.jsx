import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { entities } from '@/lib/entities'
import { useAuth } from '@/hooks/useAuth'

function Composer({ placeholder, onSubmit, autoFocus, onCancel }) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!value.trim()) return
    setSubmitting(true)
    try {
      await onSubmit(value.trim())
      setValue('')
      onCancel?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        autoFocus={autoFocus}
        rows={2}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" variant="gradient" disabled={submitting || !value.trim()} onClick={submit}>
          {submitting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </div>
  )
}

function CommentRow({ comment, onReply, onDelete, canManage }) {
  const initials = (comment.author_name || '?').slice(0, 1).toUpperCase()

  return (
    <div className="flex gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={comment.author_avatar} alt={comment.author_name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="rounded-2xl bg-secondary px-3 py-2">
          <p className="text-xs font-medium">{comment.author_name}</p>
          <p className="text-sm">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 px-1 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
          {onReply && (
            <button className="font-medium hover:text-foreground" onClick={onReply}>
              Reply
            </button>
          )}
          {canManage && (
            <button
              className="flex items-center gap-1 font-medium hover:text-destructive"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommentThread({ post }) {
  const postId = post.id
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [replyTo, setReplyTo] = useState(null)

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => entities.Comment.filter({ post_id: postId }, 'created_at', 200),
  })

  const visible = (comments ?? []).filter((c) => c.status === 'published')
  const topLevel = visible.filter((c) => !c.parent_comment_id)
  const repliesByParent = visible.reduce((acc, c) => {
    if (!c.parent_comment_id) return acc
    acc[c.parent_comment_id] ??= []
    acc[c.parent_comment_id].push(c)
    return acc
  }, {})

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  }

  async function createComment(content, parentId = null) {
    try {
      await entities.Comment.create({
        post_id: postId,
        author_id: user.id,
        author_name: profile?.display_name,
        author_avatar: profile?.avatar_url,
        content,
        parent_comment_id: parentId,
      })
      await entities.Post.update(postId, { comments_count: (post.comments_count ?? 0) + 1 }).catch(() => {})
      invalidate()
    } catch (error) {
      toast.error(error.message ?? 'Could not post comment')
    }
  }

  async function deleteComment(id) {
    try {
      await entities.Comment.update(id, { status: 'removed' })
      await entities.Post.update(postId, {
        comments_count: Math.max(0, (post.comments_count ?? 1) - 1),
      }).catch(() => {})
      invalidate()
    } catch (error) {
      toast.error(error.message ?? 'Could not delete comment')
    }
  }

  if (isLoading) return <p className="px-1 text-sm text-muted-foreground">Loading comments...</p>

  return (
    <div className="space-y-3 border-t pt-3">
      {topLevel.length === 0 && <p className="px-1 text-sm text-muted-foreground">No comments yet.</p>}

      {topLevel.map((comment) => (
        <div key={comment.id} className="space-y-2">
          <CommentRow
            comment={comment}
            onReply={() => setReplyTo(comment.id)}
            onDelete={deleteComment}
            canManage={comment.author_id === user?.id || profile?.role === 'admin'}
          />

          {(repliesByParent[comment.id] ?? []).map((reply) => (
            <div key={reply.id} className="ml-9">
              <CommentRow
                comment={reply}
                onDelete={deleteComment}
                canManage={reply.author_id === user?.id || profile?.role === 'admin'}
              />
            </div>
          ))}

          {replyTo === comment.id && (
            <div className="ml-9">
              <Composer
                autoFocus
                placeholder={`Reply to ${comment.author_name}...`}
                onSubmit={(content) => createComment(content, comment.id)}
                onCancel={() => setReplyTo(null)}
              />
            </div>
          )}
        </div>
      ))}

      <Composer placeholder="Write a comment..." onSubmit={(content) => createComment(content, null)} />
    </div>
  )
}
