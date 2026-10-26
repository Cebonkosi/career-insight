import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LogOut, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/common/LoadingState'
import { AvatarUploader } from '@/components/profile/AvatarUploader'
import { ProfileLinksRow } from '@/components/profile/ProfileLinksRow'
import { FollowersDialog } from '@/components/profile/FollowersDialog'
import { entities } from '@/lib/entities'
import { auth } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'

export default function Profile() {
  const { id: routeUserId } = useParams()
  const { user, profile: myProfile, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const [followersOpen, setFollowersOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)

  const viewingUserId = routeUserId || user?.id
  const isOwnProfile = viewingUserId === user?.id

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', viewingUserId],
    queryFn: async () => {
      if (isOwnProfile) return myProfile
      const rows = await entities.UserProfile.filter({ user_id: viewingUserId })
      return rows[0]
    },
    enabled: Boolean(viewingUserId),
  })

  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', viewingUserId, user?.id],
    queryFn: async () => {
      const rows = await entities.Follow.filter({ follower_id: user.id, following_id: viewingUserId })
      return rows[0] ?? null
    },
    enabled: Boolean(user?.id) && !isOwnProfile,
  })

  if (isLoading || !profile) return <LoadingState />

  function startEditing() {
    setDraft({ display_name: profile.display_name, bio: profile.bio ?? '', phone: profile.phone ?? '' })
    setEditing(true)
  }

  async function saveEdits() {
    try {
      await entities.UserProfile.update(profile.id, draft)
      await refreshProfile()
      queryClient.invalidateQueries({ queryKey: ['profile', viewingUserId] })
      setEditing(false)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error.message ?? 'Could not update profile')
    }
  }

  async function handleAvatarUploaded(url) {
    await entities.UserProfile.update(profile.id, { avatar_url: url })
    await refreshProfile()
    queryClient.invalidateQueries({ queryKey: ['profile', viewingUserId] })
  }

  async function toggleFollow() {
    try {
      if (isFollowing) {
        await entities.Follow.delete(isFollowing.id)
      } else {
        await entities.Follow.create({ follower_id: user.id, following_id: viewingUserId })
        await entities.Notification.create({
          user_id: viewingUserId,
          type: 'follow',
          title: 'New follower',
          message: `${myProfile?.display_name} started following you`,
          actor_name: myProfile?.display_name,
          actor_avatar: myProfile?.avatar_url,
          read: false,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['is-following', viewingUserId, user?.id] })
    } catch (error) {
      toast.error(error.message ?? 'Could not update follow status')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <div className="flex items-start gap-4">
        {isOwnProfile ? (
          <AvatarUploader url={profile.avatar_url} name={profile.display_name} onUploaded={handleAvatarUploaded} />
        ) : (
          <AvatarUploader url={profile.avatar_url} name={profile.display_name} onUploaded={() => {}} />
        )}

        <div className="flex-1">
          {editing ? (
            <Input value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
          ) : (
            <h1 className="font-display text-xl font-bold">{profile.display_name}</h1>
          )}
          <p className="text-sm capitalize text-muted-foreground">{profile.role}</p>

          <div className="mt-2 flex gap-4 text-sm">
            <span>
              <strong>{profile.followers_count ?? 0}</strong>{' '}
              <button className="text-muted-foreground" onClick={() => setFollowersOpen(true)}>
                Followers
              </button>
            </span>
            <span>
              <strong>{profile.following_count ?? 0}</strong> <span className="text-muted-foreground">Following</span>
            </span>
          </div>
        </div>

        {isOwnProfile ? (
          editing ? (
            <Button size="sm" variant="gradient" onClick={saveEdits}>
              Save
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={startEditing}>
              Edit
            </Button>
          )
        ) : (
          <Button size="sm" variant={isFollowing ? 'secondary' : 'gradient'} onClick={toggleFollow}>
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
          </div>
          {profile.role === 'contributor' && (
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
          )}
        </div>
      ) : (
        <>
          {profile.bio && <p className="text-sm text-foreground">{profile.bio}</p>}

          {profile.role === 'contributor' && (
            <div className="space-y-1 text-sm text-muted-foreground">
              {profile.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> {profile.email}
                </p>
              )}
              {profile.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {profile.phone}
                </p>
              )}
            </div>
          )}

          {profile.interests?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span key={interest} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {interest}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {isOwnProfile && <ProfileLinksRow showCvBuilder={profile.role === 'student'} />}

      {isOwnProfile && (
        <Button variant="ghost" className="w-full text-destructive" onClick={auth.logout}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      )}

      <FollowersDialog open={followersOpen} onOpenChange={setFollowersOpen} userId={viewingUserId} />
    </div>
  )
}
