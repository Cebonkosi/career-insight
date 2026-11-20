import { NavLink } from 'react-router-dom'
import { cn, createPageUrl } from '@/lib/utils'
import { ADMIN_NAV } from './DesktopSidebar'

const SHORT_LABELS = {
  Admin: 'Overview',
  AdminOpportunities: 'Opportunities',
  AdminModeration: 'Moderation',
  AdminContributors: 'Contributors',
}

/** Bottom bar for the admin console on narrow screens, mirroring the sidebar's main section. */
export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-border bg-white/95 pb-safe backdrop-blur-lg md:hidden">
      {ADMIN_NAV.map(({ page, icon: Icon, end }) => (
        <NavLink
          key={page}
          to={createPageUrl(page)}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn('rounded-full px-4 py-1', isActive && 'bg-primary text-primary-foreground')}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              {SHORT_LABELS[page]}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
