import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { ClipboardList } from 'lucide-react'
import { entities } from '@/lib/entities'
import { integrations } from '@/lib/integrations'

export function ApprovalQueue() {
  const queryClient = useQueryClient()

  const { data: pending } = useQuery({
    queryKey: ['opportunities', 'pending_review'],
    queryFn: () => entities.Opportunity.filter({ status: 'pending_review' }, '-created_at', 100),
  })

  async function setStatus(opportunity, status) {
    try {
      await entities.Opportunity.update(opportunity.id, { status })
      queryClient.invalidateQueries({ queryKey: ['opportunities', 'pending_review'] })
      toast.success(status === 'active' ? 'Opportunity approved' : 'Opportunity rejected')

      if (opportunity.contributor_id) {
        const [contributor] = await entities.UserProfile.filter({ user_id: opportunity.contributor_id }).catch(
          () => []
        )
        if (contributor?.email) {
          const approved = status === 'active'
          integrations
            .SendEmail({
              to: contributor.email,
              subject: approved
                ? `"${opportunity.title}" has been approved`
                : `"${opportunity.title}" was not approved`,
              html: approved
                ? `<p>Good news — your listing "${opportunity.title}" is now live on Career Insight.</p>`
                : `<p>Your listing "${opportunity.title}" was not approved for publishing. Contact us if you'd like details.</p>`,
            })
            .catch((error) => toast.error(error.message ?? 'Updated, but the notification email failed to send'))
        }
      }
    } catch (error) {
      toast.error(error.message ?? 'Could not update opportunity')
    }
  }

  if (!pending?.length) {
    return <EmptyState icon={ClipboardList} title="Nothing pending" description="New opportunity submissions will show up here." />
  }

  return (
    <div className="space-y-2">
      {pending.map((opp) => (
        <Card key={opp.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{opp.title}</p>
              <p className="text-xs text-muted-foreground">{opp.contributor_name} · {opp.type}</p>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={() => setStatus(opp, 'active')} aria-label="Approve">
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setStatus(opp, 'closed')} aria-label="Reject">
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
