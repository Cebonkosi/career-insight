import { Download, Radio, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STATUS_BADGE = {
  live: 'bg-red-100 text-red-700',
  upcoming: 'bg-amber-100 text-amber-700',
  ended: 'bg-gray-100 text-gray-600',
}

export function StreamCard({ stream }) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video w-full bg-secondary">
        {stream.image_url && <img src={stream.image_url} alt={stream.title} className="h-full w-full object-cover" />}
      </div>
      <CardContent className="space-y-2 p-4">
        <Badge className={STATUS_BADGE[stream.status] ?? STATUS_BADGE.upcoming}>
          {stream.status === 'live' && <Radio className="mr-1 h-3 w-3" />}
          {stream.status}
        </Badge>
        <p className="font-display font-semibold">{stream.title}</p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{stream.description}</p>

        {stream.scheduled_date && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" /> {new Date(stream.scheduled_date).toLocaleString()}
          </p>
        )}

        {stream.status === 'ended' && stream.recording_url ? (
          <Button asChild size="sm" variant="outline" className="w-full">
            <a href={stream.recording_url} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Download Recording
            </a>
          </Button>
        ) : (
          stream.stream_url && (
            <Button asChild size="sm" variant="gradient" className="w-full">
              <a href={stream.stream_url} target="_blank" rel="noreferrer">
                {stream.status === 'live' ? 'Watch now' : 'View stream link'}
              </a>
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}
