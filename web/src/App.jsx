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
import AdminContributors from '@/pages/AdminContributors'
import Live from '@/pages/Live'
import Polls from '@/pages/Polls'

const queryClient = new QueryClient()

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
                <Route path="/admin/contributors" element={<AdminContributors />} />
                {/* The learner-facing opportunity pages now live in the mobile app. */}
                <Route path="/opportunities/*" element={<Navigate to="/admin/opportunities" replace />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/careers/:id" element={<CareerDetail />} />
                <Route path="/live" element={<Live />} />
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
