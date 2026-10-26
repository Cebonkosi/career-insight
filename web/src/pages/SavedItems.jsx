import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { entities } from '@/lib/entities'
import { createPageUrl } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const DETAIL_PAGE = {
  career: 'CareerDetail',
  opportunity: 'OpportunityDetail',
}

export default function SavedItems() {
  const { user } = useAuth()

  const { data: items, isLoading } = useQuery({
    queryKey: ['saved-items', user?.id],
    queryFn: () => entities.SavedItem.filter({ user_id: user.id }, '-created_at', 100),
    enabled: Boolean(user?.id),
  })

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4">
      <h1 className="font-display text-xl font-bold">Saved</h1>

      {isLoading ? (
        <LoadingState />
      ) : !items?.length ? (
        <EmptyState icon={Bookmark} title="Nothing saved yet" description="Bookmark careers, opportunities, and posts to find them here." />
      ) : (
        items.map((item) => {
          const page = DETAIL_PAGE[item.item_type]
          const content = (
            <CardContent className="flex items-center justify-between p-4">
              <p className="font-medium">{item.item_title}</p>
              <Badge variant="outline" className="capitalize">{item.item_type}</Badge>
            </CardContent>
          )
          return (
            <Card key={item.id}>
              {page ? <Link to={createPageUrl(page, { id: item.item_id })}>{content}</Link> : content}
            </Card>
          )
        })
      )}
    </div>
  )
}
