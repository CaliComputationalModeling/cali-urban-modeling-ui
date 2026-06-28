import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Activity,
  Map as MapIcon,
  FileText,
  Shield,
  Settings2,
  MapPin,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usePermissions } from '@/shared/hooks/usePermissions'
import { UserRole } from '@/shared/types/user.types'

interface Props {
  children: React.ReactNode
}

const ROLE_NAMES: Record<number, string> = {
  1: 'Administrador',
  2: 'Coordinador Técnico',
  3: 'Equipo Técnico',
  4: 'Jefe de Fundación',
  5: 'Trabajador de campo',
}

const menuItems = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'Panel Control',
    section: 'PRINCIPAL',
    roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.FOUNDATION_HEAD],
  },
  {
    path: '/users',
    icon: Users,
    label: 'Operadores',
    section: 'PRINCIPAL',
    roles: [UserRole.ADMIN],
  },
  {
    path: '/roles',
    icon: Shield,
    label: 'Roles',
    section: 'PRINCIPAL',
    roles: [UserRole.ADMIN],
  },
  {
    path: '/observations',
    icon: MapPin,
    label: 'Observaciones',
    section: 'OPERACIONES',
    roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FIELD_WORKER],
  },
  {
    path: '/scenarios',
    icon: Settings2,
    label: 'Escenarios',
    section: 'OPERACIONES',
    roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FOUNDATION_HEAD],
  },
  {
    path: '/simulation',
    icon: Activity,
    label: 'Simulaciones',
    section: 'OPERACIONES',
    roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FOUNDATION_HEAD],
  },
  {
    path: '/maps',
    icon: MapIcon,
    label: 'Cartografía',
    section: 'OPERACIONES',
    roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FOUNDATION_HEAD, UserRole.FIELD_WORKER],
  },
  {
    path: '/reports',
    icon: FileText,
    label: 'Reportes',
    section: 'ANÁLISIS',
    roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.TECHNICIAN, UserRole.FOUNDATION_HEAD],
  },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export const DashboardLayout: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { currentRole } = usePermissions()

  const roleName = user ? (ROLE_NAMES[user.rol_id] ?? 'Operador') : 'Operador'
  const initials = user ? getInitials(user.nombre_completo) : 'OP'
  const displayName = user?.nombre_completo ?? 'Terminal_01'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Filter menu items by current user role and group by section
  const visibleItems = menuItems.filter((item) => item.roles.includes(currentRole))
  const sections = visibleItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {})

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box-small">
            <div className="logo-dot" />
          </div>
          <span className="logo-text">SIMCORE</span>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(sections).map(([sectionLabel, items], sIdx) => (
            <div className="nav-section" key={sectionLabel}>
              {sIdx > 0 && <div className="sidebar-divider" />}
              <p className="nav-section-label">{sectionLabel}</p>
              {items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`nav-button ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} className="nav-icon" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* Main Area */}
      <main className="dashboard-main">
        <header className="main-header">
          <div className="status-indicator">
            <span className="dot" />
            <span className="status-text">SISTEMA ACTIVO</span>
          </div>

          <div className="user-profile-brief">
            <div className="profile-info">
              <p className="profile-name">{displayName}</p>
              <p className="profile-role">{roleName}</p>
            </div>
            <div className={`profile-avatar avatar-${user?.rol_id ?? 5}`}>{initials}</div>
          </div>
        </header>

        <section className="main-content">{children}</section>
      </main>
    </div>
  )
}
