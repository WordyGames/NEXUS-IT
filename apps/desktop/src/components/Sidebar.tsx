import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Cpu,
  LayoutDashboard,
  Monitor,
  ClipboardList,
  CalendarCheck,
  Wrench,
  BarChart2,
  ShieldCheck,
  Bell,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { UserPermission } from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  permission: UserPermission;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',              label: 'Dashboard',       icon: LayoutDashboard, permission: UserPermission.DASHBOARD_ADMIN },
  { path: '/equipment',              label: 'Equipos',         icon: Monitor,         permission: UserPermission.EQUIPMENT_VIEW   },
  { path: '/tickets',                label: 'Tickets',         icon: ClipboardList,   permission: UserPermission.TICKETS_VIEW     },
  { path: '/maintenance-confirmation', label: 'Confirmar Horas', icon: CalendarCheck, permission: UserPermission.TICKETS_VIEW    },
  { path: '/maintenances',           label: 'Mantenimientos',  icon: Wrench,          permission: UserPermission.MAINTENANCES_VIEW},
  { path: '/reports',                label: 'Reportes',        icon: BarChart2,       permission: UserPermission.REPORTS_VIEW     },
  { path: '/warranty-report',        label: 'Garantías',       icon: ShieldCheck,     permission: UserPermission.WARRANTY_VIEW    },
  { path: '/notifications',          label: 'Notificaciones',  icon: Bell,            permission: UserPermission.NOTIFICATIONS_VIEW},
  { path: '/users',                  label: 'Usuarios',        icon: Users,           permission: UserPermission.USERS_VIEW       },
  { path: '/settings',               label: 'Configuración',   icon: Settings,        permission: UserPermission.SETTINGS_VIEW    },
];

const Sidebar: React.FC = () => {
  const location    = useLocation();
  const { hasPermission, userData, isAdmin } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  const initials = userData?.name
    ? userData.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-100 shadow-sidebar flex flex-col h-full">

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-800 leading-none tracking-tight">NEXUS IT</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Sistema de Gestión</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto scrollbar-hidden">
        {visibleItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              className={[
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')}
            >
              <Icon
                size={17}
                className={[
                  'flex-shrink-0 transition-colors',
                  active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600',
                ].join(' ')}
              />
              <span className="truncate">{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User profile ─────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-700">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate leading-none">{userData?.name ?? '—'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{isAdmin ? 'Administrador' : 'Usuario'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
