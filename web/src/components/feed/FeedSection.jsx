import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, Newspaper } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { PostCard } from './PostCard'
import { entities } from '@/lib/entities'
import { useInfiniteScrollTrigger } from '@/hooks/useInfiniteScrollTrigger'

const PAGE_SIZE = 10

export function FeedSection() {
  const [search, setSearch] = useState('')

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts', 'published'],
    queryFn: ({ pageParam = 0 }) =>
      entities.Post.filter({ status: 'published' }, '-created_at', PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  })

  const posts = data?.pages.flat() ?? []
  const filtered = posts.filter(
    (p) =>
      !search ||
      p.content?.toLowerCase().includes(search.toLowerCase()) ||
      p.author_name?.toLowerCase().includes(search.toLowerCase())
  )

  const sentinelRef = useInfiniteScrollTrigger({
    onIntersect: fetchNextPage,
    enabled: Boolean(hasNextPage) && !isFetchingNextPage && !search,
  })

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search posts..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No posts yet"
          description="Be the first to share something with the community."
        />
      ) : (
        <>
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          <div ref={sentinelRef} />
          {isFetchingNextPage && <LoadingState rows={1} />}
        </>
      )}
    </div>
  )
}
