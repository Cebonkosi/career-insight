import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Vote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { entities } from '@/lib/entities'
import { useAuth } from '@/hooks/useAuth'

export function PollCard({ poll }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const myVote = poll.voters?.find((v) => v.user_id === user.id)
  const totalVotes = poll.total_votes || 1

  async function vote(optionIndex) {
    if (myVote) return
    try {
      const options = poll.options.map((o, i) => (i === optionIndex ? { ...o, votes: (o.votes ?? 0) + 1 } : o))
      await entities.Poll.update(poll.id, {
        options,
        total_votes: (poll.total_votes ?? 0) + 1,
        voters: [...(poll.voters ?? []), { user_id: user.id, option_index: optionIndex }],
      })
      queryClient.invalidateQueries({ queryKey: ['polls'] })
    } catch (error) {
      toast.error(error.message ?? 'Could not submit vote')
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Vote className="h-4 w-4" /> Poll by {poll.author_name}
        </div>
        <p className="font-medium">{poll.question}</p>

        <div className="space-y-2">
          {poll.options.map((option, i) => {
            const pct = Math.round(((option.votes ?? 0) / totalVotes) * 100)
            const isMyVote = myVote?.option_index === i
            return (
              <button
                key={i}
                onClick={() => vote(i)}
                disabled={Boolean(myVote)}
                className="relative w-full overflow-hidden rounded-lg border border-border p-2.5 text-left text-sm"
              >
                {myVote && (
                  <div
                    className={cn('absolute inset-y-0 left-0 bg-primary/10', isMyVote && 'bg-primary/20')}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex justify-between">
                  <span>{option.text}</span>
                  {myVote && <span className="text-muted-foreground">{pct}%</span>}
                </div>
              </button>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">{poll.total_votes ?? 0} votes</p>
      </CardContent>
    </Card>
  )
}
