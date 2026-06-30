import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  Building2,
  FileText,
  Calendar,
  BarChart3,
  Users,
  LogOut,
  KeyRound,
  Menu,
  X,
  CheckCircle,
} from 'lucide-react';
import type { Role } from '../types/auth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <BarChart3 size={20} />,
    roles: ['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO'],
  },
  {
    label: 'Empresas',
    path: '/empresas',
    icon: <Building2 size={20} />,
    roles: ['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO'],
  },
  {
    label: 'Contratos',
    path: '/contratos',
    icon: <FileText size={20} />,
    roles: ['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO'],
  },
  {
    label: 'Faturas',
    path: '/faturas',
    icon: <CheckCircle size={20} />,
    roles: ['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO'],
  },
  {
    label: 'Calendário',
    path: '/calendario',
    icon: <Calendar size={20} />,
    roles: ['ADMIN', 'OPERADOR', 'APROVADOR', 'FINANCEIRO'],
  },
  {
    label: 'Usuários',
    path: '/usuarios',
    icon: <Users size={20} />,
    roles: ['ADMIN'],
  },
];

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  APROVADOR: 'Aprovador',
  FINANCEIRO: 'Financeiro',
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[rgba(36,36,36,0.95)] backdrop-blur-sm transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
          <h1 className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            Controle de Contas
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {filteredItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#57489c] text-white border-l-3 border-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[rgba(36,36,36,0.95)] backdrop-blur-sm flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/60 hover:text-white"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-white/50">
                {user ? roleLabels[user.role] : ''}
              </p>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Alterar senha"
              aria-label="Alterar senha"
            >
              <KeyRound size={18} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Área de conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 bg-[rgba(255,255,255,0.85)]">
          <Outlet />
        </main>
      </div>
    </div>

    {showChangePassword && (
      <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
    )}
    </>
  );
}
