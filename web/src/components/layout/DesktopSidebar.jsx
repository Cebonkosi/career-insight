import { NavLink } from 'react-router-dom'
import { Compass, Briefcase, Radio, Bell, ShieldCheck, Vote, Plus } from 'lucide-react'
import { cn, createPageUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}

export function DesktopSidebar({ onOpenPostDialog }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-white px-4 py-6 md:flex">
      <div className="mb-6 px-2">
        <div className="font-display text-xl font-bold gradient-text">Career Insight</div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin console</div>
      </div>

      <Button variant="gradient" className="mb-4" onClick={onOpenPostDialog}>
        <Plus className="h-4 w-4" />
        Create Post
      </Button>

      <nav className="flex flex-1 flex-col gap-1">
        <Item to={createPageUrl('Admin')} icon={ShieldCheck} label="Admin" />
        <Item to={createPageUrl('Opportunities')} icon={Briefcase} label="Opportunities" />
        <Item to={createPageUrl('Careers')} icon={Compass} label="Careers" />
        <Item to={createPageUrl('Live')} icon={Radio} label="Live" />
        <Item to={createPageUrl('Polls')} icon={Vote} label="Polls" />

        <div className="my-2 border-t border-border" />

        <Item to={createPageUrl('Notifications')} icon={Bell} label="Notifications" />
      </nav>
    </aside>
  )
}
