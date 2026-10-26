import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { AnalyticsCards } from '@/components/contributor/AnalyticsCards'
import { TopPostsList } from '@/components/contributor/TopPostsList'
import { FollowersDialog } from '@/components/profile/FollowersDialog'
import { entities } from '@/lib/entities'

export default function ContributorHub() {
  const { profile } = useOutletContext()
  const [followersOpen, setFollowersOpen] = useState(false)

  const { data: posts } = useQuery({
    queryKey: ['contributor-posts', profile.user_id],
    queryFn: () => entities.Post.filter({ author_id: profile.user_id }, '-likes_count', 100),
  })

  const { data: streams } = useQuery({
    queryKey: ['contributor-streams', profile.user_id],
    queryFn: () => entities.LiveStream.filter({ host_id: profile.user_id }, '-created_at', 100),
  })

  const stats = {
    posts: posts?.length ?? 0,
    followers: profile.followers_count ?? 0,
    likes: (posts ?? []).reduce((sum, p) => sum + (p.likes_count ?? 0), 0),
    streams: streams?.length ?? 0,
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="font-display text-xl font-bold">Contributor Hub</h1>

      <AnalyticsCards stats={stats} onFollowersClick={() => setFollowersOpen(true)} />

      <section>
        <h2 className="mb-2 font-display font-semibold">Top posts</h2>
        <TopPostsList posts={posts} />
      </section>

      <FollowersDialog open={followersOpen} onOpenChange={setFollowersOpen} userId={profile.user_id} />
    </div>
  )
}
