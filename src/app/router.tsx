import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { PrivateRoute } from '@/features/auth/components/PrivateRoute'
import { PublicRoute } from '@/features/auth/components/PublicRoute'
import { PermissionGate } from '@/features/auth/components/PermissionGate'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { UserPage } from '@/features/users/pages/UserPage'
import { SimulationPage } from '@/features/simulation/pages/SimulationPage'
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
              <div className="animate-in">
                <h1 className="headline" style={{ fontSize: '40px' }}>
                  Resumen del Sistema
                </h1>
                <p className="text-muted">Bienvenido a la consola de control SIMCORE.</p>
              </div>
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
          path="/simulation"
          element={
            <DashboardLayout>
              <SimulationPage />
            </DashboardLayout>
          }
        />
      </Route>

      <Route index element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
