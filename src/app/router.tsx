import { Routes, Route, Navigate } from "react-router-dom"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { UserPage } from "@/features/users/pages/UserPage"
import { SimulationPage } from "@/features/simulation/pages/SimulationPage" // Importamos la nueva página

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rutas Protegidas */}
      <Route path="/users" element={
        <DashboardLayout>
          <UserPage />
        </DashboardLayout>
      } />

      <Route path="/simulation" element={
        <DashboardLayout>
          <SimulationPage />
        </DashboardLayout>
      } />

      <Route path="/dashboard" element={
        <DashboardLayout>
          <div className="animate-in">
            <h1 className="headline" style={{ fontSize: '40px' }}>Resumen del Sistema</h1>
            <p className="text-muted">Bienvenido a la consola de control SIMCORE.</p>
          </div>
        </DashboardLayout>
      } />

      <Route index element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}