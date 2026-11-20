import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const PAGE_PATHS = {
  Home: '/',
  Careers: '/careers',
  CareerDetail: '/careers/:id',
  Profile: '/profile',
  Notifications: '/notifications',
  Admin: '/admin',
  AdminOpportunities: '/admin/opportunities',
  AdminModeration: '/admin/moderation',
  AdminUsers: '/admin/users',
  // The contributor verification queue is the Users & roles page filtered to pending accounts.
  AdminContributors: '/admin/users?role=pending',
  AdminLive: '/admin/live',
  AdminAnalytics: '/admin/analytics',
  AdminAudit: '/admin/audit',
  Polls: '/polls',
  Login: '/login',
  ForgotPassword: '/forgot-password',
  ResetPassword: '/reset-password',
}

export function createPageUrl(pageName, params = {}) {
  const base = PAGE_PATHS[pageName]
  if (!base) throw new Error(`Unknown page: ${pageName}`)
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, value),
    base
  )
}
