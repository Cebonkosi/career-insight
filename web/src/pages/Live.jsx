import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { Plus, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { StreamCard } from '@/components/live/StreamCard'
import { CreateStreamDialog } from '@/components/live/CreateStreamDialog'
import { entities } from '@/lib/entities'

export default function Live() {
  const { profile } = useOutletContext()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const canCreate = profile.role === 'contributor' || profile.role === 'admin'

  const { data: streams, isLoading } = useQuery({
    queryKey: ['live-streams'],
    queryFn: () => entities.LiveStream.list('-created_at', 50),
  })

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Live</h1>
        {canCreate && (
          <Button size="sm" variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New stream
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !streams?.length ? (
        <EmptyState icon={Radio} title="No streams yet" description="Check back soon for live sessions." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}

      <CreateStreamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        profile={profile}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['live-streams'] })}
      />
    </div>
  )
}
