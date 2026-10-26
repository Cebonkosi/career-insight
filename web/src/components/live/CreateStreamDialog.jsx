import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { entities } from '@/lib/entities'

export function CreateStreamDialog({ open, onOpenChange, profile, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', stream_url: '', scheduled_date: '' })
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.title || !form.stream_url) return
    setSubmitting(true)
    try {
      await entities.LiveStream.create({
        title: form.title,
        description: form.description,
        stream_url: form.stream_url,
        scheduled_date: form.scheduled_date || null,
        host_id: profile.user_id,
        host_name: profile.display_name,
        host_avatar: profile.avatar_url,
        host_role: profile.role,
        status: 'upcoming',
        viewers_count: 0,
      })
      toast.success('Stream created')
      setForm({ title: '', description: '', stream_url: '', scheduled_date: '' })
      onOpenChange(false)
      onCreated?.()
    } catch (error) {
      toast.error(error.message ?? 'Could not create stream')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create live stream</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Stream URL (YouTube, Zoom...)</Label>
            <Input value={form.stream_url} onChange={(e) => update('stream_url', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled date</Label>
            <Input
              type="datetime-local"
              value={form.scheduled_date}
              onChange={(e) => update('scheduled_date', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="gradient" onClick={handleSubmit} disabled={submitting || !form.title || !form.stream_url}>
            {submitting ? 'Creating...' : 'Create stream'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
