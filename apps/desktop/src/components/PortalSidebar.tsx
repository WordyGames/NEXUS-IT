import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Ticket, Computer } from 'lucide-react';

interface PortalSidebarProps {
  collapsed: boolean;
}

const PortalSidebar: React.FC<PortalSidebarProps> = ({ collapsed }) => {
  if (collapsed) {
    return (
      <aside className="bg-white dark:bg-gray-800 w-20 min-h-screen p-4 shadow-md transition-all duration-300">
        <nav className="space-y-2 mt-16">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              `flex items-center justify-center p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
            title="Dashboard"
          >
            <LayoutDashboard size={20} />
          </NavLink>

          <NavLink
            to="/portal/equipment"
            className={({ isActive }) =>
              `flex items-center justify-center p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
            title="Mis Equipos"
          >
            <Computer size={20} />
          </NavLink>

          <NavLink
            to="/portal/tickets"
            className={({ isActive }) =>
              `flex items-center justify-center p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`
            }
            title="Mis Tickets"
          >
            <Ticket size={20} />
          </NavLink>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="bg-white dark:bg-gray-800 w-64 min-h-screen p-4 shadow-md transition-all duration-300">
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
          to="/portal/equipment"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <Computer size={20} />
          <span>Mis Equipos</span>
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
