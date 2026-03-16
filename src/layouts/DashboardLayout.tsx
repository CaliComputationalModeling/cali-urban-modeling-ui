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

export const DashboardLayout: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await http.post('/auth/logout');
      localStorage.clear();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Panel Control' },
    { path: '/users', icon: Users, label: 'Operadores' },
    { path: '/simulation', icon: Activity, label: 'Simulaciones' },
    { path: '/maps', icon: MapIcon, label: 'Cartografía' },
    { path: '/reports', icon: FileText, label: 'Reportes' },
    { path: '/audit', icon: Shield, label: 'Auditoría' },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar con los colores de tu :root */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box-small">
            <div className="logo-dot" />
          </div>
          <span className="logo-text">SIMCORE</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`nav-button ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button onClick={handleLogout} className="logout-button">
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="main-header">
          <div className="status-indicator">
            <span className="dot" />
            <span className="status-text">SISTEMA ACTIVO</span>
          </div>
          <div className="user-profile-brief">
            <p className="profile-name">Terminal_01</p>
            <p className="profile-role">Nivel: Administrador</p>
          </div>
        </header>

        <section className="main-content">
          {children}
        </section>
      </main>
    </div>
  );
};