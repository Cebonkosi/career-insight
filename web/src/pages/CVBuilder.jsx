import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function CVBuilder() {
  const [cv, setCv] = useState({
    fullName: '',
    email: '',
    phone: '',
    summary: '',
    education: '',
    skills: '',
    experience: '',
  })

  function update(field, value) {
    setCv((c) => ({ ...c, [field]: value }))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">CV Builder</h1>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={cv.fullName} onChange={(e) => update('fullName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={cv.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={cv.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Summary</Label>
            <Textarea rows={3} value={cv.summary} onChange={(e) => update('summary', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Education</Label>
            <Textarea rows={3} value={cv.education} onChange={(e) => update('education', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Experience</Label>
            <Textarea rows={3} value={cv.experience} onChange={(e) => update('experience', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Skills</Label>
            <Textarea rows={2} value={cv.skills} onChange={(e) => update('skills', e.target.value)} />
          </div>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-bold">{cv.fullName || 'Your name'}</h2>
              <p className="text-sm text-muted-foreground">{[cv.email, cv.phone].filter(Boolean).join(' · ')}</p>
            </div>
            {cv.summary && <p className="text-sm">{cv.summary}</p>}
            {cv.education && (
              <div>
                <h3 className="font-display text-sm font-semibold">Education</h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{cv.education}</p>
              </div>
            )}
            {cv.experience && (
              <div>
                <h3 className="font-display text-sm font-semibold">Experience</h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{cv.experience}</p>
              </div>
            )}
            {cv.skills && (
              <div>
                <h3 className="font-display text-sm font-semibold">Skills</h3>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{cv.skills}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
