import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, MapPin, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { entities } from '@/lib/entities'
import { OPPORTUNITY_TYPES } from '@/lib/constants'
import { createPageUrl } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export function OpportunityCard({ opportunity }) {
  const { user } = useAuth()
  const typeMeta = OPPORTUNITY_TYPES.find((t) => t.value === opportunity.type)

  async function handleDownload(e) {
    e.preventDefault()
    if (!opportunity.form_url) {
      toast.error('No downloadable form for this opportunity')
      return
    }
    try {
      await entities.Application.create({
        user_id: user.id,
        opportunity_id: opportunity.id,
        opportunity_title: opportunity.title,
        opportunity_type: opportunity.type,
        organization_name: opportunity.contributor_name,
        organization_logo: opportunity.contributor_logo,
        download_date: new Date().toISOString(),
        deadline: opportunity.deadline,
        form_url: opportunity.form_url,
      })
      await entities.Opportunity.update(opportunity.id, {
        downloads_count: (opportunity.downloads_count ?? 0) + 1,
      })
      window.open(opportunity.form_url, '_blank')
      toast.success('Form downloaded')
    } catch (error) {
      toast.error(error.message ?? 'Could not download form')
    }
  }

  return (
    <Link to={createPageUrl('OpportunityDetail', { id: opportunity.id })} className="block w-72 shrink-0">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-[16/9] w-full bg-secondary">
          {opportunity.image_url && (
            <img src={opportunity.image_url} alt={opportunity.title} className="h-full w-full object-cover" />
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          {typeMeta && <Badge className={typeMeta.color}>{typeMeta.label}</Badge>}
          <p className="font-display font-semibold leading-snug line-clamp-2">{opportunity.title}</p>
          <p className="text-xs text-muted-foreground">{opportunity.contributor_name}</p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {opportunity.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(opportunity.deadline), { addSuffix: true })}
              </span>
            )}
            {opportunity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {opportunity.location}
              </span>
            )}
          </div>

          {opportunity.form_url && (
            <Button size="sm" variant="outline" className="w-full" onClick={handleDownload}>
              <Download className="h-4 w-4" /> Download Form
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
