import { NavLink } from 'react-router-dom'
import { Compass, Briefcase, Radio, Plus, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPageUrl } from '@/lib/utils'

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  )
}

export function MobileNav({ onOpenPostDialog }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-white/95 backdrop-blur-lg pb-safe md:hidden">
      <NavItem to={createPageUrl('Admin')} icon={ShieldCheck} label="Admin" />
      <NavItem to={createPageUrl('Opportunities')} icon={Briefcase} label="Opps" />

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onOpenPostDialog}
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white gradient-brand text-white shadow-lg"
          aria-label="Create post"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <NavItem to={createPageUrl('Live')} icon={Radio} label="Live" />
      <NavItem to={createPageUrl('Careers')} icon={Compass} label="Careers" />
    </nav>
  )
}
