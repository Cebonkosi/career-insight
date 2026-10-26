import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { DesktopSidebar } from './DesktopSidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'
import { CreatePostDialog } from '@/components/feed/CreatePostDialog'

function AdminsOnly() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <ShieldAlert className="h-10 w-10 text-muted-foreground" />
      <h1 className="font-display text-xl font-bold">Admins only</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This console is for Career Insight administrators. Students, parents and contributors can use the
        Career Insight mobile app.
      </p>
      <Button variant="outline" onClick={() => auth.logout()}>
        Sign out
      </Button>
    </div>
  )
}

export function AppLayout() {
  const { profile, loading } = useUserProfile()
  const [postDialogOpen, setPostDialogOpen] = useState(false)

  if (loading) return null
  if (profile?.role !== 'admin') return <AdminsOnly />

  const openPostDialog = () => setPostDialogOpen(true)

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar onOpenPostDialog={openPostDialog} />
      <TopBar profile={profile} />

      <main className="pb-20 md:ml-64 md:pb-8">
        <Outlet context={{ profile, openPostDialog }} />
      </main>

      <MobileNav onOpenPostDialog={openPostDialog} />

      <CreatePostDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} profile={profile} />
    </div>
  )
}
