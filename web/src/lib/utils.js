import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const PAGE_PATHS = {
  Home: '/',
  Careers: '/careers',
  CareerDetail: '/careers/:id',
  Opportunities: '/opportunities',
  OpportunityDetail: '/opportunities/:id',
  MyApplications: '/saved-downloads',
  Profile: '/profile',
  Notifications: '/notifications',
  SavedItems: '/saved',
  CVBuilder: '/cv-builder',
  ContributorHub: '/contributor',
  Admin: '/admin',
  Live: '/live',
  Polls: '/polls',
  CareerChatbot: '/career-chatbot',
  Onboarding: '/onboarding',
  Login: '/login',
  Register: '/register',
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
