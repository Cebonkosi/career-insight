import { useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, Briefcase } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { OpportunityCard } from '@/components/opportunities/OpportunityCard'
import { CategoryFilterChips } from '@/components/careers/CategoryFilterChips'
import { entities } from '@/lib/entities'
import { OPPORTUNITY_TYPES } from '@/lib/constants'
import { useInfiniteScrollTrigger } from '@/hooks/useInfiniteScrollTrigger'

const PAGE_SIZE = 10

export default function Opportunities() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState(null)
  const scrollRef = useRef(null)

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['opportunities', 'active'],
    queryFn: ({ pageParam = 0 }) =>
      entities.Opportunity.filter({ status: 'active' }, '-created_at', PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  })

  const opportunities = data?.pages.flat() ?? []
  const filtered = opportunities.filter((o) => {
    const matchesType = !type || o.type === type
    const matchesSearch =
      !search ||
      o.title?.toLowerCase().includes(search.toLowerCase()) ||
      o.contributor_name?.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  const sentinelRef = useInfiniteScrollTrigger({
    onIntersect: fetchNextPage,
    enabled: Boolean(hasNextPage) && !isFetchingNextPage && !search && !type,
    rootRef: scrollRef,
  })

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="font-display text-xl font-bold">Opportunities</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search opportunities..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <CategoryFilterChips
        categories={OPPORTUNITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        active={type}
        onChange={setType}
      />

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No opportunities found" description="Check back soon for new listings." />
      ) : (
        <div ref={scrollRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
          <div ref={sentinelRef} className="w-px shrink-0" />
        </div>
      )}
    </div>
  )
}
