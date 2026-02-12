import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Ticket } from 'lucide-react';

const PortalSidebar = () => {
  return (
    <aside className="bg-white dark:bg-gray-800 w-64 min-h-screen p-4 shadow-md">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">NEXUS IT</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Sistema de Gestión</p>
      </div>
      
      <nav className="space-y-2">
        <NavLink
          to="/portal"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/portal/tickets"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <Ticket size={20} />
          <span>Mis Tickets</span>
        </NavLink>
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          © 2026 NEXUS IT
        </p>
      </div>
    </aside>
  );
};

export default PortalSidebar;
