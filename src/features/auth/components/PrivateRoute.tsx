import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/shared/types/user.types'
import { AccessDenied } from './AccessDenied'

interface Props {
  requiredRoles?: UserRole[]
}

export const PrivateRoute = ({ requiredRoles }: Props = {}) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--color-bg-page)',
        }}
      >
        <Loader2
          size={32}
          color="var(--color-accent)"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles && user && !requiredRoles.includes(user.rol_id)) {
    return <AccessDenied />
  }

  return <Outlet />
}
