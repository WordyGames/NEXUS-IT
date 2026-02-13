import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { isAdmin, userData } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Menú para usuarios admin
  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', admin: false },
    { path: '/tickets', label: 'Tickets', icon: '🎫', admin: false },
    { path: '/warranty-report', label: 'Garantías', icon: '📅', admin: true },
    { path: '/users', label: 'Usuarios', icon: '👥', admin: true }
  ];

  // Menú para usuarios normales
  const userNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', admin: false },
    { path: '/tickets', label: 'Mis Tickets', icon: '🎫', admin: false }
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

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
            // Solo mostrar items de admin si el usuario es admin
            if (item.admin && !isAdmin) return null;

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
