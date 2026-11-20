import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import { CONTRIBUTOR_TYPES } from '@/lib/constants'
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
      queryClient.invalidateQueries({ queryKey: ['admin'] })
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
    <div>
      {contributors.map((c) => {
        const name = c.organization_name || c.display_name
        return (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-4 last:border-0">
            <GradientAvatar name={name} src={c.organization_logo} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  CONTRIBUTOR_TYPES.find((t) => t.value === c.contributor_type)?.label,
                  c.display_name !== name && c.display_name,
                  c.email,
                  c.website,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <Button size="sm" className="rounded-full" onClick={() => verify(c)}>
              <BadgeCheck /> Verify
            </Button>
          </div>
        )
      })}
    </div>
  )
}
