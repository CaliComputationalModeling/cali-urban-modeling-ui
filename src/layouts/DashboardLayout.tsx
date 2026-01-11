"use client"

import { Outlet, useNavigate, useLocation } from "react-router-dom"
import {
  Home,
  Users,
  Flame,
  Route,
  Eye,
  Database,
  Settings,
  Code,
  Play,
  CheckCircle,
  MapPinned,
  Sliders,
  History,
  BarChart3,
  Map,
  GitCompare,
  FileText,
  ClipboardCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { ROUTES } from "@/shared/constants/routes"
import { useAuthStore } from "@/store/authStore"

const navigation = [
  { name: "Inicio", href: ROUTES.HOME, icon: Home },
  { name: "Gestión de Usuarios", href: ROUTES.USERS, icon: Users },
  { name: "Mis Observaciones", href: ROUTES.MY_OBSERVATIONS, icon: Eye },
  { name: "Mapa de Calor", href: ROUTES.HEATMAP, icon: Flame },
  { name: "Rutas Predictivas", href: ROUTES.PREDICTIVE_ROUTES, icon: Route },
  { name: "Carga de Datos", href: ROUTES.DATA_LOAD, icon: Database },
  { name: "Configuración Variables", href: ROUTES.VARIABLES_CONFIG, icon: Settings },
  { name: "Editor de Reglas", href: ROUTES.RULES_EDITOR, icon: Code },
  { name: "Panel de Ejecución", href: ROUTES.EXECUTION, icon: Play },
  { name: "Validación", href: ROUTES.VALIDATION, icon: CheckCircle },
  { name: "Auditoría Geográfica", href: ROUTES.GEOGRAPHIC_AUDIT, icon: MapPinned },
  { name: "Calibración", href: ROUTES.CALIBRATION, icon: Sliders },
  { name: "Historial Simulaciones", href: ROUTES.SIMULATION_HISTORY, icon: History },
  { name: "Dashboard Ejecutivo", href: ROUTES.EXECUTIVE_DASHBOARD, icon: BarChart3 },
  { name: "Visualizador de Mapa", href: ROUTES.MAP_VIEWER, icon: Map },
  { name: "Comparador Escenarios", href: ROUTES.SCENARIO_COMPARATOR, icon: GitCompare },
  { name: "Centro de Reportes", href: ROUTES.REPORTS, icon: FileText },
  { name: "Aprobación", href: ROUTES.APPROVAL, icon: ClipboardCheck },
]

export const DashboardLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h1 className="text-xl font-bold text-primary-600">Cali Urban</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 overflow-y-auto h-[calc(100vh-180px)]">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href

            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.href)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm">{item.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">Sistema de Modelado Computacional</h2>
            <div className="w-10 lg:hidden" /> {/* Spacer for mobile */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
