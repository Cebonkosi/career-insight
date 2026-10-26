import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { createPageUrl } from '@/lib/utils'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to={createPageUrl('Login')} replace />

  return <Outlet />
}
