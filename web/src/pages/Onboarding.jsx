import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { GraduationCap, Users, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ChipMultiSelect } from '@/components/common/ChipMultiSelect'
import { cn, createPageUrl } from '@/lib/utils'
import { PROVINCES, NSC_SUBJECTS, CAREER_CATEGORIES, CONTRIBUTOR_TYPES, GRADES } from '@/lib/constants'
import { entities } from '@/lib/entities'
import { useAuth } from '@/hooks/useAuth'

const ROLES = [
  { value: 'student', label: 'Student', description: 'Grade 8–12 learner', icon: GraduationCap },
  { value: 'parent', label: 'Parent', description: 'Supporting a learner', icon: Users },
  { value: 'contributor', label: 'Contributor', description: 'University, company, NGO...', icon: Building2 },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    role: '',
    display_name: '',
    grade: '',
    school: '',
    province: '',
    city: '',
    subjects: [],
    interests: [],
    parent_linked_students: [],
    contributor_type: '',
    organization_name: '',
    website: '',
    email: '',
    phone: '',
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleFinish() {
    setSubmitting(true)
    try {
      await entities.UserProfile.create({
        user_id: user.id,
        role: form.role,
        display_name: form.display_name || user.email,
        grade: form.role === 'student' ? Number(form.grade) : null,
        school: form.role === 'student' ? form.school : null,
        province: form.province || null,
        city: form.city || null,
        subjects: form.role === 'student' ? form.subjects : [],
        interests: form.role === 'student' ? form.interests : [],
        parent_linked_students: form.role === 'parent' ? form.parent_linked_students : [],
        contributor_type: form.role === 'contributor' ? form.contributor_type : null,
        organization_name: form.role === 'contributor' ? form.organization_name : null,
        website: form.role === 'contributor' ? form.website : null,
        email: form.role === 'contributor' ? form.email : null,
        phone: form.role === 'contributor' ? form.phone : null,
        onboarding_complete: true,
        followers_count: 0,
        following_count: 0,
      })
      await refreshProfile()
      navigate(createPageUrl('Home'))
    } catch (error) {
      toast.error(error.message ?? 'Could not save your profile')
    } finally {
      setSubmitting(false)
    }
  }

  const canContinueStep1 = Boolean(form.role)
  const canFinishStep2 =
    form.role === 'student'
      ? form.display_name && form.grade && form.school
      : form.role === 'parent'
        ? form.display_name
        : form.display_name && form.contributor_type && form.organization_name

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="mb-1 text-center font-display text-2xl font-bold gradient-text">Let's set you up</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">Step {step} of 2</p>

        {step === 1 && (
          <div className="space-y-3">
            {ROLES.map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => update('role', value)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors',
                  form.role === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-brand text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </button>
            ))}

            <Button
              variant="gradient"
              className="w-full"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input value={form.display_name} onChange={(e) => update('display_name', e.target.value)} />
            </div>

            {form.role === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Grade</Label>
                    <Select value={form.grade} onValueChange={(v) => update('grade', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g} value={String(g)}>
                            Grade {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>School</Label>
                    <Input value={form.school} onChange={(e) => update('school', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Province</Label>
                    <Select value={form.province} onValueChange={(v) => update('province', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Province" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Subjects</Label>
                  <ChipMultiSelect
                    options={NSC_SUBJECTS}
                    value={form.subjects}
                    onChange={(v) => update('subjects', v)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Career interests</Label>
                  <ChipMultiSelect
                    options={CAREER_CATEGORIES}
                    value={form.interests}
                    onChange={(v) => update('interests', v)}
                  />
                </div>
              </>
            )}

            {form.role === 'parent' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Province</Label>
                  <Select value={form.province} onValueChange={(v) => update('province', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Province" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVINCES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
                </div>
              </div>
            )}

            {form.role === 'contributor' && (
              <>
                <div className="space-y-1.5">
                  <Label>Contributor type</Label>
                  <Select value={form.contributor_type} onValueChange={(v) => update('contributor_type', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRIBUTOR_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Organization name</Label>
                  <Input
                    value={form.organization_name}
                    onChange={(e) => update('organization_name', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Contact email</Label>
                    <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => update('website', e.target.value)} />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                disabled={!canFinishStep2 || submitting}
                onClick={handleFinish}
              >
                {submitting ? 'Saving...' : 'Finish'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
