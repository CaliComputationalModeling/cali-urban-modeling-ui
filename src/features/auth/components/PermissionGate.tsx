import React from 'react'
import { usePermissions } from '@/shared/hooks/usePermissions'
import { UserRole } from '@/shared/types/user.types'
import { AccessDenied } from './AccessDenied'

interface Props {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const PermissionGate: React.FC<Props> = ({ allowedRoles, children, fallback }) => {
  const { hasRole } = usePermissions()

  if (!hasRole(...allowedRoles)) {
    return <>{fallback ?? <AccessDenied />}</>
  }

  return <>{children}</>
}
