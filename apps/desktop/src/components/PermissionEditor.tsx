import React, { useState } from 'react';
import {
  User,
  UserRole,
  UserPermission,
  getDefaultPermissionsForRole,
  resolveUserPermissions,
  getPermissionOverrides,
} from '@nexus-it/shared';
import { Button } from './ui';

const permissionLabels: Record<UserPermission, string> = {
  [UserPermission.DASHBOARD_ADMIN]:      'Acceso a panel admin',
  [UserPermission.EQUIPMENT_VIEW]:       'Ver equipos',
  [UserPermission.EQUIPMENT_MANAGE]:     'Crear/editar/eliminar equipos',
  [UserPermission.MAINTENANCES_VIEW]:    'Ver mantenimientos',
  [UserPermission.MAINTENANCES_MANAGE]:  'Crear/editar/eliminar mantenimientos',
  [UserPermission.REPORTS_VIEW]:         'Ver reportes',
  [UserPermission.WARRANTY_VIEW]:        'Ver reporte de garantías',
  [UserPermission.USERS_VIEW]:           'Ver módulo de usuarios',
  [UserPermission.USERS_MANAGE]:         'Administrar usuarios y permisos',
  [UserPermission.SETTINGS_VIEW]:        'Ver configuración',
  [UserPermission.TICKETS_VIEW]:         'Ver tickets',
  [UserPermission.TICKETS_VIEW_ALL]:     'Ver tickets de todos',
  [UserPermission.TICKETS_CHANGE_STATUS]:'Cambiar estado de tickets',
  [UserPermission.NOTIFICATIONS_VIEW]:   'Ver notificaciones',
};

const permissionGroups: Array<{ title: string; permissions: UserPermission[] }> = [
  {
    title: 'Acceso general',
    permissions: [UserPermission.DASHBOARD_ADMIN, UserPermission.SETTINGS_VIEW, UserPermission.NOTIFICATIONS_VIEW],
  },
  {
    title: 'Equipos y mantenimientos',
    permissions: [
      UserPermission.EQUIPMENT_VIEW, UserPermission.EQUIPMENT_MANAGE,
      UserPermission.MAINTENANCES_VIEW, UserPermission.MAINTENANCES_MANAGE,
      UserPermission.WARRANTY_VIEW,
    ],
  },
  {
    title: 'Tickets',
    permissions: [UserPermission.TICKETS_VIEW, UserPermission.TICKETS_VIEW_ALL, UserPermission.TICKETS_CHANGE_STATUS],
  },
  {
    title: 'Administración',
    permissions: [UserPermission.REPORTS_VIEW, UserPermission.USERS_VIEW, UserPermission.USERS_MANAGE],
  },
];

function normalize(values: Record<UserPermission, boolean>): Record<UserPermission, boolean> {
  const v = { ...values };
  if (v[UserPermission.EQUIPMENT_MANAGE])  v[UserPermission.EQUIPMENT_VIEW]  = true;
  if (!v[UserPermission.EQUIPMENT_VIEW])   v[UserPermission.EQUIPMENT_MANAGE] = false;
  if (v[UserPermission.MAINTENANCES_MANAGE]) v[UserPermission.MAINTENANCES_VIEW] = true;
  if (!v[UserPermission.MAINTENANCES_VIEW])  v[UserPermission.MAINTENANCES_MANAGE] = false;
  if (v[UserPermission.TICKETS_VIEW_ALL] || v[UserPermission.TICKETS_CHANGE_STATUS]) v[UserPermission.TICKETS_VIEW] = true;
  if (!v[UserPermission.TICKETS_VIEW]) { v[UserPermission.TICKETS_VIEW_ALL] = false; v[UserPermission.TICKETS_CHANGE_STATUS] = false; }
  if (v[UserPermission.USERS_MANAGE])  v[UserPermission.USERS_VIEW]  = true;
  if (!v[UserPermission.USERS_VIEW])   v[UserPermission.USERS_MANAGE] = false;
  return v;
}

interface Props {
  user: User;
  currentUserId: string | undefined;
  onClose: () => void;
  onSave: (patch: { role: UserRole; permissions: Record<string, boolean> }) => void;
  onSelfEditError: (message: string) => void;
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors';

const PermissionEditor: React.FC<Props> = ({ user, currentUserId, onClose, onSave, onSelfEditError }) => {
  const [role, setRole] = useState<UserRole>(user.role);
  const [values, setValues] = useState<Record<UserPermission, boolean>>(
    normalize(resolveUserPermissions(user))
  );

  const toggle = (permission: UserPermission, enabled: boolean) =>
    setValues((prev) => normalize({ ...prev, [permission]: enabled }));

  const applyRoleDefaults = () =>
    setValues(normalize(getDefaultPermissionsForRole(role)));

  const handleSave = () => {
    if (user.id === currentUserId) {
      if (!values[UserPermission.USERS_MANAGE])
        return onSelfEditError('No puedes quitarte el permiso para administrar usuarios');
      if (!values[UserPermission.DASHBOARD_ADMIN])
        return onSelfEditError('No puedes quitarte el acceso al panel admin mientras editas tu propio perfil');
    }
    const normalized = normalize(values);
    onSave({ role, permissions: getPermissionOverrides(role, normalized) });
  };

  return (
    <>
      <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2 mb-5">
        {user.name} <span className="text-slate-400">(@{user.username})</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rol base</span>
          <select
            title="Rol base"
            value={role}
            onChange={(e) => {
              const next = e.target.value as UserRole;
              setRole(next);
              setValues(normalize(getDefaultPermissionsForRole(next)));
            }}
            className={inputCls}
          >
            <option value={UserRole.USER}>Usuario</option>
            <option value={UserRole.ADMIN}>Administrador</option>
          </select>
        </label>
        <div className="md:col-span-2 flex items-end">
          <Button type="button" variant="secondary" onClick={applyRoleDefaults}>
            Restablecer permisos por rol
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {permissionGroups.map((group) => (
          <div key={group.title} className="border border-slate-100 dark:border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{group.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {group.permissions.map((permission) => (
                <label key={permission} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean(values[permission])}
                    onChange={(e) => toggle(permission, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  {permissionLabels[permission]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-5">
        <Button type="button" variant="primary" className="flex-1" onClick={handleSave}>Guardar Permisos</Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
      </div>
    </>
  );
};

export default PermissionEditor;
