import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Clock, DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/common/LoadingState'
import { CareerRoadmap } from '@/components/careers/CareerRoadmap'
import { entities } from '@/lib/entities'
import { createPageUrl } from '@/lib/utils'

export default function CareerDetail() {
  const { id } = useParams()

  const { data: career, isLoading } = useQuery({
    queryKey: ['career', id],
    queryFn: () => entities.Career.get(id),
  })

  if (isLoading) return <LoadingState />
  if (!career) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="aspect-[16/7] w-full overflow-hidden rounded-xl bg-secondary">
        {career.image_url && <img src={career.image_url} alt={career.title} className="h-full w-full object-cover" />}
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold">{career.title}</h1>
        <p className="mt-2 text-muted-foreground">{career.overview || career.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          <TrendingUp className="mr-1 h-3 w-3" /> {career.demand_level} demand
        </Badge>
        {career.duration_years && (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" /> {career.duration_years} years study
          </Badge>
        )}
        {(career.salary_range_min || career.salary_range_max) && (
          <Badge variant="outline">
            <DollarSign className="mr-1 h-3 w-3" />
            R{career.salary_range_min?.toLocaleString()} – R{career.salary_range_max?.toLocaleString()}
          </Badge>
        )}
      </div>

      {career.required_subjects?.length > 0 && (
        <section>
          <h2 className="mb-2 font-display font-semibold">Required subjects</h2>
          <div className="flex flex-wrap gap-2">
            {career.required_subjects.map((s) => (
              <Badge key={s} variant="outline">{s}</Badge>
            ))}
          </div>
        </section>
      )}

      {career.skills_needed?.length > 0 && (
        <section>
          <h2 className="mb-2 font-display font-semibold">Skills needed</h2>
          <div className="flex flex-wrap gap-2">
            {career.skills_needed.map((s) => (
              <Badge key={s} variant="secondary">{s}</Badge>
            ))}
          </div>
        </section>
      )}

      {career.roadmap_steps?.length > 0 && (
        <section>
          <h2 className="mb-4 font-display font-semibold">Roadmap</h2>
          <CareerRoadmap steps={career.roadmap_steps} />
        </section>
      )}

      {career.related_careers?.length > 0 && (
        <section>
          <h2 className="mb-2 font-display font-semibold">Related careers</h2>
          <div className="flex flex-wrap gap-2">
            {career.related_careers.map((relId) => (
              <Link
                key={relId}
                to={createPageUrl('CareerDetail', { id: relId })}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-primary hover:bg-primary/5"
              >
                View career
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
