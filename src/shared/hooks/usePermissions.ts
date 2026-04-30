import { useAuthStore } from '@/store/authStore'
import { UserRole } from '@/shared/types/user.types'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.COORDINATOR]: 80,
  [UserRole.TECHNICIAN]: 60,
  [UserRole.FOUNDATION_HEAD]: 40,
  [UserRole.FIELD_WORKER]: 20,
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  const currentRole = user?.rol_id ?? UserRole.FIELD_WORKER

  const hasRole = (...roles: UserRole[]): boolean => {
    return roles.includes(currentRole)
  }

  const hasMinRole = (minRole: UserRole): boolean => {
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[minRole]
  }

  const canManageUsers = hasRole(UserRole.ADMIN)
  const canViewSimulations = hasMinRole(UserRole.TECHNICIAN)
  const canViewReports = hasMinRole(UserRole.FOUNDATION_HEAD)
  const canViewAudit = hasRole(UserRole.ADMIN, UserRole.COORDINATOR)
  const canViewMaps = hasMinRole(UserRole.FIELD_WORKER)

  return {
    currentRole,
    hasRole,
    hasMinRole,
    canManageUsers,
    canViewSimulations,
    canViewReports,
    canViewAudit,
    canViewMaps,
  }
}
