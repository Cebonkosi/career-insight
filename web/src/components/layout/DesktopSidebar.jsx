import { NavLink } from 'react-router-dom'
import {
  Briefcase,
  CircleCheck,
  Compass,
  LayoutGrid,
  Lock,
  LogOut,
  Radio,
  ShieldCheck,
  Sparkles,
  Vote,
} from 'lucide-react'
import { GradientAvatar } from '@/components/admin/GradientAvatar'
import { auth } from '@/lib/auth'
import { cn, createPageUrl } from '@/lib/utils'

// Order and labels follow the Admin overview design. "Users & roles", "Forms &
// downloads" and "Analytics" from the design are not built yet, so they are left out.
export const ADMIN_NAV = [
  { page: 'Admin', icon: LayoutGrid, label: 'Overview', end: true },
  { page: 'AdminOpportunities', icon: Briefcase, label: 'Opportunities' },
  { page: 'AdminModeration', icon: ShieldCheck, label: 'Content moderation' },
  { page: 'AdminContributors', icon: CircleCheck, label: 'Contributors' },
]

const PLATFORM_NAV = [
  { page: 'Careers', icon: Compass, label: 'Careers' },
  { page: 'Live', icon: Radio, label: 'Live sessions' },
  { page: 'Polls', icon: Vote, label: 'Polls' },
]

function Item({ page, icon: Icon, label, end }) {
  return (
    <NavLink
      to={createPageUrl(page)}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors',
          isActive ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground/80 hover:bg-secondary'
        )
      }
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      {label}
    </NavLink>
  )
}

export function DesktopSidebar({ profile }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col overflow-y-auto border-r border-border bg-white px-4 py-6 md:flex">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.75} />
        <span className="font-display text-xl font-semibold">Career Insight</span>
      </div>

      <div className="mt-8 px-3">
        <p className="text-xs font-semibold uppercase tracking-wide">Admin workspace</p>
        <p className="mt-0.5 text-xs text-muted-foreground">South Africa</p>
      </div>

      <nav className="mt-6 flex flex-col gap-1.5" aria-label="Admin">
        {ADMIN_NAV.map((item) => (
          <Item key={item.page} {...item} />
        ))}
      </nav>

      <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Platform</p>
      <nav className="mt-2 flex flex-col gap-1.5" aria-label="Platform content">
        {PLATFORM_NAV.map((item) => (
          <Item key={item.page} {...item} />
        ))}
      </nav>

      <div className="mt-8 px-3">
        <Lock className="h-5 w-5 text-accent" strokeWidth={1.75} />
        <p className="mt-2 text-xs leading-relaxed">A safer space for every learner.</p>
      </div>

      <div className="mt-auto flex items-center gap-3 px-3 pt-8">
        <GradientAvatar name={profile?.display_name} src={profile?.avatar_url} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile?.display_name}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>
        <button
          type="button"
          onClick={() => auth.logout()}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
