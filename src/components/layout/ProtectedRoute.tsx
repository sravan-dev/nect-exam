import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface Props {
  role?: 'admin' | 'student'
}

export function ProtectedRoute({ role }: Props) {
  const { session, profile, isLoading } = useAuthStore()

  // Still initialising auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Not logged in
  if (!session) return <Navigate to="/login" replace />

  // Session exists but profile not yet fetched — wait
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading your profile…</p>
      </div>
    )
  }

  // Wrong role — redirect to correct dashboard
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/student'} replace />
  }

  return <Outlet />
}
