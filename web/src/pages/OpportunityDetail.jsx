import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Calendar, MapPin, ExternalLink, Bookmark, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/common/LoadingState'
import { OPPORTUNITY_TYPES } from '@/lib/constants'
import { entities } from '@/lib/entities'
import { useAuth } from '@/hooks/useAuth'

export default function OpportunityDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => entities.Opportunity.get(id),
  })

  const { data: savedItems } = useQuery({
    queryKey: ['saved-item', 'opportunity', id, user?.id],
    queryFn: () => entities.SavedItem.filter({ user_id: user.id, item_type: 'opportunity', item_id: id }),
    enabled: Boolean(user?.id),
  })
  const isSaved = (savedItems ?? []).length > 0

  if (isLoading) return <LoadingState />
  if (!opportunity) return null

  const typeMeta = OPPORTUNITY_TYPES.find((t) => t.value === opportunity.type)

  async function handleApply() {
    if (opportunity.application_url) window.open(opportunity.application_url, '_blank')
  }

  async function handleSave() {
    try {
      if (isSaved) {
        await entities.SavedItem.delete(savedItems[0].id)
      } else {
        await entities.SavedItem.create({
          user_id: user.id,
          item_type: 'opportunity',
          item_id: id,
          item_title: opportunity.title,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['saved-item', 'opportunity', id, user?.id] })
    } catch (error) {
      toast.error(error.message ?? 'Could not update saved item')
    }
  }

  async function handleDownload() {
    if (!opportunity.form_url) return
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
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
      toast.success('Form downloaded')
    } catch (error) {
      toast.error(error.message ?? 'Could not download form')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="aspect-[16/7] w-full overflow-hidden rounded-xl bg-secondary">
        {opportunity.image_url && (
          <img src={opportunity.image_url} alt={opportunity.title} className="h-full w-full object-cover" />
        )}
      </div>

      <div>
        {typeMeta && <Badge className={typeMeta.color}>{typeMeta.label}</Badge>}
        <h1 className="mt-2 font-display text-2xl font-bold">{opportunity.title}</h1>
        <p className="text-sm text-muted-foreground">{opportunity.contributor_name}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {opportunity.deadline && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
          </span>
        )}
        {opportunity.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {opportunity.location}
          </span>
        )}
      </div>

      <p className="whitespace-pre-line text-foreground">{opportunity.description}</p>

      {opportunity.requirements && (
        <section>
          <h2 className="mb-2 font-display font-semibold">Requirements</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{opportunity.requirements}</p>
        </section>
      )}

      {opportunity.eligibility_grades?.length > 0 && (
        <section>
          <h2 className="mb-2 font-display font-semibold">Eligible grades</h2>
          <div className="flex flex-wrap gap-2">
            {opportunity.eligibility_grades.map((g) => (
              <Badge key={g} variant="outline">Grade {g}</Badge>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {opportunity.application_url && (
          <Button variant="gradient" onClick={handleApply}>
            <ExternalLink className="h-4 w-4" /> Apply
          </Button>
        )}
        {opportunity.form_url && (
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Download Form
          </Button>
        )}
        <Button variant={isSaved ? 'secondary' : 'outline'} onClick={handleSave}>
          <Bookmark className="h-4 w-4" /> {isSaved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
