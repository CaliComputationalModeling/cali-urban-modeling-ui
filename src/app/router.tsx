import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { PrivateRoute } from '@/features/auth/components/PrivateRoute'
import { PublicRoute } from '@/features/auth/components/PublicRoute'
import { PermissionGate } from '@/features/auth/components/PermissionGate'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { UserPage } from '@/features/users/pages/UserPage'
import { SimulationPage } from '@/features/simulation/pages/SimulationPage'
import { ExecutiveDashboardPage } from '@/features/dashboard/pages/ExecutiveDashboardPage'
import { MapsPage } from '@/features/maps/pages/MapsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { RolesPage } from '@/features/roles/pages/RolesPage'
import { ObservationsPage } from '@/features/observations/pages/ObservationsPage'
import { ScenariosPage } from '@/features/scenarios/pages/ScenariosPage'
import { UserRole } from '@/shared/types/user.types'

export const AppRouter = () => {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Rutas protegidas */}
      <Route element={<PrivateRoute />}>
        <Route
          path="/dashboard"
          element={
            <DashboardLayout>
              <PermissionGate
                allowedRoles={[
                  UserRole.ADMIN,
                  UserRole.COORDINATOR,
                  UserRole.TECHNICIAN,
                  UserRole.FOUNDATION_HEAD,
                  UserRole.FIELD_WORKER,
                ]}
              >
                <ExecutiveDashboardPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />

        <Route
          path="/users"
          element={
            <DashboardLayout>
              <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR]}>
                <UserPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />

        <Route
          path="/roles"
          element={
            <DashboardLayout>
              <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR]}>
                <RolesPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />

        <Route
          path="/observations"
          element={
            <DashboardLayout>
              <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FIELD_WORKER]}>
                <ObservationsPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />

        <Route
          path="/scenarios"
          element={
            <DashboardLayout>
              <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN]}>
                <ScenariosPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />

        <Route
          path="/simulation"
          element={
            <DashboardLayout>
              <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN]}>
                <SimulationPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />

        <Route
          path="/maps"
          element={
            <DashboardLayout>
              <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FIELD_WORKER]}>
                <MapsPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />

        <Route
          path="/reports"
          element={
            <DashboardLayout>
              <PermissionGate allowedRoles={[UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FOUNDATION_HEAD]}>
                <ReportsPage />
              </PermissionGate>
            </DashboardLayout>
          }
        />
      </Route>

      <Route index element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
