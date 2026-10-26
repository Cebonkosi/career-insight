import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { entities } from '@/lib/entities'
import { integrations } from '@/lib/integrations'

export function VerifyContributors() {
  const queryClient = useQueryClient()

  const { data: contributors } = useQuery({
    queryKey: ['contributors', 'unverified'],
    queryFn: () => entities.UserProfile.filter({ role: 'contributor', verified: false }, '-created_at', 100),
  })

  async function verify(contributor) {
    try {
      await entities.UserProfile.update(contributor.id, { verified: true })
      queryClient.invalidateQueries({ queryKey: ['contributors', 'unverified'] })
      toast.success('Contributor verified')
      if (contributor.email) {
        integrations
          .SendEmail({
            to: contributor.email,
            subject: 'Your Career Insight contributor account is verified',
            html: `<p>Hi ${contributor.organization_name || contributor.display_name},</p><p>Your contributor account has been verified. You can now post opportunities and content on Career Insight.</p>`,
          })
          .catch((error) => toast.error(error.message ?? 'Verified, but the confirmation email failed to send'))
      }
    } catch (error) {
      toast.error(error.message ?? 'Could not verify contributor')
    }
  }

  if (!contributors?.length) {
    return <EmptyState icon={BadgeCheck} title="No pending verifications" />
  }

  return (
    <div className="space-y-2">
      {contributors.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{c.organization_name || c.display_name}</p>
              <p className="text-xs capitalize text-muted-foreground">{c.contributor_type}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => verify(c)}>
              Verify
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
