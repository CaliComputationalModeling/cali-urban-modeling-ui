import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Activity,
  Map as MapIcon, FileText, Shield, LogOut
} from 'lucide-react';
import http from '@/services/http';

interface Props {
  children: React.ReactNode;
}

const ROLE_NAMES: Record<string, string> = {
  '1': 'Administrador',
  '2': 'Coordinador Técnico',
  '3': 'Equipo Técnico',
  '4': 'Jefe de Fundación',
  '5': 'Campo',
}

const menuItems = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Panel Control',  section: 'PRINCIPAL' },
  { path: '/users',      icon: Users,           label: 'Operadores',     section: 'PRINCIPAL' },
  { path: '/simulation', icon: Activity,        label: 'Simulaciones',   section: 'OPERACIONES' },
  { path: '/maps',       icon: MapIcon,         label: 'Cartografía',    section: 'OPERACIONES' },
  { path: '/reports',    icon: FileText,        label: 'Reportes',       section: 'ANÁLISIS' },
  { path: '/audit',      icon: Shield,          label: 'Auditoría',      section: 'ANÁLISIS' },
]

export const DashboardLayout: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = localStorage.getItem('user_role') ?? '5';
  const roleName = ROLE_NAMES[userRole] ?? 'Operador';

  // Build initials from terminal ID or role
  const initials = roleName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    try {
      await http.post('/auth/logout');
      localStorage.clear();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  // Group menu items by section
  const sections = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

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
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`nav-button ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} className="nav-icon" />
                    <span>{item.label}</span>
                  </button>
                );
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
              <p className="profile-name">Terminal_01</p>
              <p className="profile-role">{roleName}</p>
            </div>
            <div className={`profile-avatar avatar-${userRole}`}>
              {initials}
            </div>
          </div>
        </header>

        <section className="main-content">
          {children}
        </section>
      </main>
    </div>
  );
};