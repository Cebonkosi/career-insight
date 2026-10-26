import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { entities } from '@/lib/entities'

const POST_TYPES = ['article', 'tip', 'story', 'announcement', 'question']

export function CreatePostDialog({ open, onOpenChange, profile }) {
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('story')
  const [submitting, setSubmitting] = useState(false)

  const canChooseType = profile?.role === 'contributor' || profile?.role === 'admin'

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await entities.Post.create({
        author_id: profile.user_id,
        author_name: profile.display_name,
        author_avatar: profile.avatar_url,
        author_role: profile.role,
        content: content.trim(),
        post_type: canChooseType ? postType : 'story',
        status: 'published',
      })
      toast.success('Post published')
      setContent('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message ?? 'Failed to publish post')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create post</DialogTitle>
        </DialogHeader>

        {canChooseType && (
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger>
              <SelectValue placeholder="Post type" />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Textarea
          placeholder="Share something with the community..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
        />

        <DialogFooter>
          <Button variant="gradient" onClick={handleSubmit} disabled={submitting || !content.trim()}>
            {submitting ? 'Posting...' : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
