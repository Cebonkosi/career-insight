import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, ImagePlus, Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { GRADES, OPPORTUNITY_TYPES, PROVINCES } from '@/lib/constants'
import { fetchProviderOptions, fileProblem, saveOpportunity, uploadCover, uploadForm } from '@/lib/adminData'
import { cn } from '@/lib/utils'

const EMPTY = {
  title: '',
  type: 'bursary',
  contributor_name: '',
  contributor_id: '',
  description: '',
  requirements: '',
  eligibility_grades: [],
  value: '',
  deadline: '',
  location: '',
  province: '',
  is_remote: false,
  application_url: '',
  external_instructions: '',
  featured: false,
  image_url: null,
  form_url: null,
}

function toForm(opportunity) {
  if (!opportunity) return EMPTY
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.entries(opportunity).filter(([key]) => key in EMPTY)),
    contributor_id: opportunity.contributor_id ?? '',
    deadline: opportunity.deadline ? opportunity.deadline.slice(0, 10) : '',
    eligibility_grades: opportunity.eligibility_grades ?? [],
    province: opportunity.province ?? '',
  }
}

function fileName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop()).replace(/^\d+-/, '')
  } catch {
    return 'Attached form'
  }
}

/** Required fields for saving at all vs. for publishing (OPP-001, OPP-008). */
function validate(form, publishing) {
  const errors = {}
  if (form.title.trim().length < 5) errors.title = 'Give the opportunity a title of at least 5 characters.'
  if (!form.contributor_name.trim()) errors.contributor_name = 'Name the organisation offering it.'
  if (form.application_url && !/^https:\/\/\S+\.\S+/.test(form.application_url.trim())) {
    errors.application_url = 'Use a full https:// link.'
  }
  if (publishing) {
    if (form.description.trim().length < 20) errors.description = 'Describe the opportunity (at least 20 characters).'
    if (!form.deadline) errors.deadline = 'Set the closing date.'
    else if (new Date(`${form.deadline}T23:59:59`) < new Date()) errors.deadline = 'The closing date has already passed.'
    if (!form.external_instructions.trim()) errors.external_instructions = 'Explain how learners submit their application.'
  }
  return errors
}

function Field({ label, error, hint, children, required }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

/**
 * Create or edit an opportunity. Only admins can reach this, and the database
 * refuses opportunity writes from anyone else (OPP-009).
 */
export function OpportunityEditor({ open, onOpenChange, opportunity, onSaved }) {
  const [form, setForm] = useState(() => toForm(opportunity))
  const [errors, setErrors] = useState({})
  const [cover, setCover] = useState(null)
  const [formFile, setFormFile] = useState(null)
  const [saving, setSaving] = useState(null)
  const coverInput = useRef(null)
  const formInput = useRef(null)

  const providers = useQuery({ queryKey: ['admin', 'providers'], queryFn: fetchProviderOptions, enabled: open })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function pickFile(kind, file) {
    if (!file) return
    const problem = fileProblem(file, kind)
    if (problem) {
      toast.error(problem)
      return
    }
    if (kind === 'cover') setCover({ file, preview: URL.createObjectURL(file) })
    else setFormFile(file)
  }

  async function save(status) {
    const publishing = status === 'active'
    const found = validate(form, publishing)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error('Fix the highlighted fields first.')
      return
    }
    setSaving(status)
    try {
      const image_url = cover ? await uploadCover(cover.file) : form.image_url
      const form_url = formFile ? await uploadForm(formFile) : form.form_url
      const provider = providers.data?.find((p) => p.user_id === form.contributor_id)
      const saved = await saveOpportunity(opportunity?.id, {
        title: form.title.trim(),
        type: form.type,
        contributor_name: form.contributor_name.trim(),
        contributor_id: form.contributor_id || null,
        contributor_logo: provider?.organization_logo ?? opportunity?.contributor_logo ?? null,
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        eligibility_grades: form.eligibility_grades,
        value: form.value.trim() || null,
        deadline: form.deadline ? new Date(`${form.deadline}T23:59:59+02:00`).toISOString() : null,
        location: form.location.trim() || null,
        province: form.province || null,
        is_remote: form.is_remote,
        application_url: form.application_url.trim() || null,
        external_instructions: form.external_instructions.trim() || null,
        featured: form.featured,
        image_url,
        form_url,
        status,
      })
      toast.success(publishing ? 'Published — learners can see it now' : 'Saved as draft')
      onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message ?? 'Could not save the opportunity')
    } finally {
      setSaving(null)
    }
  }

  const coverPreview = cover?.preview ?? form.image_url
  const published = opportunity?.status === 'active'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{opportunity ? 'Edit opportunity' : 'New opportunity'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fields marked * are needed to publish. Drafts are only visible to admins.
          </p>
        </DialogHeader>

        <div className="grid gap-5">
          <Field label="Cover image" hint="JPG, PNG or WebP, up to 5 MB. Shown on cards and the detail page.">
            <div className="flex items-center gap-4">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="h-24 w-40 rounded-lg border border-border object-cover" />
              ) : (
                <div className="brand-gradient h-24 w-40 rounded-lg" aria-hidden="true" />
              )}
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => coverInput.current?.click()}>
                  <ImagePlus /> {coverPreview ? 'Replace image' : 'Upload image'}
                </Button>
                {coverPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCover(null)
                      update('image_url', null)
                    }}
                  >
                    <X /> Remove
                  </Button>
                )}
              </div>
              <input
                ref={coverInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  pickFile('cover', e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" error={errors.title} required>
              <Input value={form.title} maxLength={140} onChange={(e) => update('title', e.target.value)} />
            </Field>
            <Field label="Type" required>
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {OPPORTUNITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Organisation offering it" error={errors.contributor_name} required>
              <Input
                value={form.contributor_name}
                maxLength={120}
                onChange={(e) => update('contributor_name', e.target.value)}
              />
            </Field>
            <Field
              label="Linked contributor account"
              hint="Optional. Lets that contributor see this opportunity's views and downloads."
            >
              <select
                value={form.contributor_id}
                onChange={(e) => update('contributor_id', e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {providers.data?.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.organization_name || p.display_name}
                    {p.verified ? '' : ' (not verified)'}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description" error={errors.description} required>
            <Textarea rows={4} maxLength={4000} value={form.description} onChange={(e) => update('description', e.target.value)} />
          </Field>

          <Field label="Who can apply" hint="One requirement per line, e.g. “Mathematics: 60%+”.">
            <Textarea rows={3} maxLength={2000} value={form.requirements} onChange={(e) => update('requirements', e.target.value)} />
          </Field>

          <Field label="Eligible grades" hint="Leave all unticked if any grade may apply.">
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => {
                const on = form.eligibility_grades.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      update(
                        'eligibility_grades',
                        on ? form.eligibility_grades.filter((x) => x !== g) : [...form.eligibility_grades, g].sort()
                      )
                    }
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary'
                    )}
                  >
                    Grade {g}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Value" hint="e.g. Up to R45,000 / year">
              <Input value={form.value} maxLength={80} onChange={(e) => update('value', e.target.value)} />
            </Field>
            <Field label="Closing date" error={errors.deadline} required>
              <Input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
            </Field>
            <Field label="Province">
              <select
                value={form.province}
                onChange={(e) => update('province', e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Nationwide</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Location">
              <Input value={form.location} maxLength={120} onChange={(e) => update('location', e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={form.is_remote} onChange={(e) => update('is_remote', e.target.checked)} />
              Remote / online
            </label>
          </div>

          <Field
            label="Application form"
            hint="PDF or Word, up to 10 MB. Optional — leave empty if the provider uses only their own site."
          >
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {formFile ? formFile.name : form.form_url ? fileName(form.form_url) : 'No form attached'}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => formInput.current?.click()}>
                <Upload /> {form.form_url || formFile ? 'Replace' : 'Upload'}
              </Button>
              {(form.form_url || formFile) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormFile(null)
                    update('form_url', null)
                  }}
                >
                  <X /> Remove
                </Button>
              )}
              <input
                ref={formInput}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  pickFile('form', e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </Field>

          <Field label="How learners apply" error={errors.external_instructions} required>
            <Textarea
              rows={3}
              maxLength={2000}
              placeholder="e.g. Email the completed form with certified copies to bursaries@provider.example by the closing date."
              value={form.external_instructions}
              onChange={(e) => update('external_instructions', e.target.value)}
            />
          </Field>

          <Field label="Provider application link" error={errors.application_url} hint="Optional https:// link to the provider's own application page.">
            <Input value={form.application_url} onChange={(e) => update('application_url', e.target.value)} placeholder="https://" />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} />
            Feature at the top of learners&apos; lists
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={Boolean(saving)}>
            Cancel
          </Button>
          {!published && (
            <Button variant="outline" onClick={() => save('draft')} disabled={Boolean(saving)}>
              {saving === 'draft' ? 'Saving…' : 'Save draft'}
            </Button>
          )}
          <Button onClick={() => save('active')} disabled={Boolean(saving)}>
            {saving === 'active' ? 'Publishing…' : published ? 'Save changes' : 'Publish'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
