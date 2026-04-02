import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserPermission } from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: '📊',
      permission: UserPermission.DASHBOARD_ADMIN
    },
    {
      path: '/equipment',
      label: 'Equipos',
      icon: '💻',
      permission: UserPermission.EQUIPMENT_VIEW
    },
    {
      path: '/tickets',
      label: 'Tickets',
      icon: '🎫',
      permission: UserPermission.TICKETS_VIEW
    },
    {
      path: '/maintenance-confirmation',
      label: 'Confirmar Horas',
      icon: '📅',
      permission: UserPermission.TICKETS_VIEW
    },
    {
      path: '/maintenances',
      label: 'Mantenimientos',
      icon: '🔧',
      permission: UserPermission.MAINTENANCES_VIEW
    },
    {
      path: '/reports',
      label: 'Reportes',
      icon: '📈',
      permission: UserPermission.REPORTS_VIEW
    },
    {
      path: '/warranty-report',
      label: 'Garantías',
      icon: '📅',
      permission: UserPermission.WARRANTY_VIEW
    },
    {
      path: '/notifications',
      label: 'Notificaciones',
      icon: '🔔',
      permission: UserPermission.NOTIFICATIONS_VIEW
    },
    {
      path: '/users',
      label: 'Usuarios',
      icon: '👥',
      permission: UserPermission.USERS_VIEW
    },
    {
      path: '/settings',
      label: 'Configuración',
      icon: '⚙️',
      permission: UserPermission.SETTINGS_VIEW
    }
  ].filter((item) => hasPermission(item.permission));

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            NEXUS IT
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sistema de Gestión
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            © 2026 NEXUS IT
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
