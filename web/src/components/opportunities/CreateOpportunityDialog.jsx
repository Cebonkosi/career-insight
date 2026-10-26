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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { entities } from '@/lib/entities'
import { OPPORTUNITY_TYPES } from '@/lib/constants'

const EMPTY_FORM = {
  title: '',
  type: 'bursary',
  contributor_name: '',
  description: '',
  requirements: '',
  application_url: '',
  deadline: '',
  location: '',
}

export function CreateOpportunityDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.title || !form.contributor_name) return
    setSubmitting(true)
    try {
      await entities.Opportunity.create({
        ...form,
        status: 'active',
        views_count: 0,
        saves_count: 0,
        downloads_count: 0,
      })
      toast.success('Opportunity created')
      setForm(EMPTY_FORM)
      onOpenChange(false)
      onCreated?.()
    } catch (error) {
      toast.error(error.message ?? 'Could not create opportunity')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create opportunity</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <Input value={form.contributor_name} onChange={(e) => update('contributor_name', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Requirements</Label>
            <Textarea rows={2} value={form.requirements} onChange={(e) => update('requirements', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => update('location', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Application URL</Label>
            <Input value={form.application_url} onChange={(e) => update('application_url', e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={submitting || !form.title || !form.contributor_name}
          >
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
