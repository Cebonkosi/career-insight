import { Card, CardContent } from '@/components/ui/card'

export function AnalyticsCards({ stats, onFollowersClick }) {
  const items = [
    { label: 'Posts', value: stats.posts, onClick: null },
    { label: 'Followers', value: stats.followers, onClick: onFollowersClick },
    { label: 'Total likes', value: stats.likes, onClick: null },
    { label: 'Streams', value: stats.streams, onClick: null },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent
            className={`p-4 ${item.onClick ? 'cursor-pointer' : ''}`}
            onClick={item.onClick ?? undefined}
          >
            <p className="font-display text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
