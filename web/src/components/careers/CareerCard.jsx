import { Link } from 'react-router-dom'
import { TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createPageUrl } from '@/lib/utils'

const DEMAND_COLOR = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

export function CareerCard({ career }) {
  return (
    <Link to={createPageUrl('CareerDetail', { id: career.id })}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-[16/9] w-full bg-secondary">
          {career.image_url && (
            <img src={career.image_url} alt={career.title} className="h-full w-full object-cover" />
          )}
        </div>
        <CardContent className="p-4">
          <p className="font-display font-semibold">{career.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{career.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge className={DEMAND_COLOR[career.demand_level] ?? DEMAND_COLOR.medium}>
              <TrendingUp className="mr-1 h-3 w-3" />
              {career.demand_level} demand
            </Badge>
            {career.duration_years && (
              <Badge variant="outline">
                <Clock className="mr-1 h-3 w-3" />
                {career.duration_years}y
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
