import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { Toaster } from '@/components/ui/sonner'

import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import Careers from '@/pages/Careers'
import CareerDetail from '@/pages/CareerDetail'
import Profile from '@/pages/Profile'
import Notifications from '@/pages/Notifications'
import Admin from '@/pages/Admin'
import AdminOpportunities from '@/pages/AdminOpportunities'
import AdminModeration from '@/pages/AdminModeration'
import AdminUsers from '@/pages/AdminUsers'
import AdminLive from '@/pages/AdminLive'
import AdminAnalytics from '@/pages/AdminAnalytics'
import AdminAudit from '@/pages/AdminAudit'
import Polls from '@/pages/Polls'

const queryClient = new QueryClient({
  // Refetch when the admin returns to the tab so edits made elsewhere show up.
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

// The web app is the admin console. Students, parents and contributors use the
// Expo mobile app in ../mobile; AppLayout turns away any non-admin profile.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/opportunities" element={<AdminOpportunities />} />
                <Route path="/admin/moderation" element={<AdminModeration />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/live" element={<AdminLive />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/audit" element={<AdminAudit />} />
                <Route path="/admin/contributors" element={<Navigate to="/admin/users?role=pending" replace />} />
                {/* The learner-facing opportunity and live pages now live in the mobile app. */}
                <Route path="/opportunities/*" element={<Navigate to="/admin/opportunities" replace />} />
                <Route path="/live" element={<Navigate to="/admin/live" replace />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/careers/:id" element={<CareerDetail />} />
                <Route path="/polls" element={<Polls />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:id" element={<Profile />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  )
}
