import { useQuery } from '@tanstack/react-query'
import { Vote } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { PollCard } from '@/components/feed/PollCard'
import { entities } from '@/lib/entities'

export default function Polls() {
  const { data: polls, isLoading } = useQuery({
    queryKey: ['polls'],
    queryFn: () => entities.Poll.list('-created_at', 50),
  })

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="font-display text-xl font-bold">Polls</h1>

      {isLoading ? (
        <LoadingState />
      ) : !polls?.length ? (
        <EmptyState icon={Vote} title="No polls yet" description="Polls created from posts will appear here." />
      ) : (
        polls.map((poll) => <PollCard key={poll.id} poll={poll} />)
      )}
    </div>
  )
}
