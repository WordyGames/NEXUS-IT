import { User, UserPermission, UserPermissions, UserRole } from '../types';

export const USER_PERMISSION_LIST: UserPermission[] = Object.values(UserPermission);

const buildAllPermissions = (value: boolean): Record<UserPermission, boolean> => {
  return USER_PERMISSION_LIST.reduce((acc, permission) => {
    acc[permission] = value;
    return acc;
  }, {} as Record<UserPermission, boolean>);
};

const USER_DEFAULT_PERMISSIONS: Record<UserPermission, boolean> = {
  [UserPermission.DASHBOARD_ADMIN]: false,
  [UserPermission.EQUIPMENT_VIEW]: false,
  [UserPermission.EQUIPMENT_MANAGE]: false,
  [UserPermission.MAINTENANCES_VIEW]: false,
  [UserPermission.MAINTENANCES_MANAGE]: false,
  [UserPermission.REPORTS_VIEW]: false,
  [UserPermission.WARRANTY_VIEW]: false,
  [UserPermission.USERS_VIEW]: false,
  [UserPermission.USERS_MANAGE]: false,
  [UserPermission.SETTINGS_VIEW]: false,
  [UserPermission.TICKETS_VIEW]: true,
  [UserPermission.TICKETS_VIEW_ALL]: false,
  [UserPermission.TICKETS_CHANGE_STATUS]: false,
  [UserPermission.NOTIFICATIONS_VIEW]: true
};

const ADMIN_DEFAULT_PERMISSIONS: Record<UserPermission, boolean> = buildAllPermissions(true);

const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Record<UserPermission, boolean>> = {
  [UserRole.ADMIN]: ADMIN_DEFAULT_PERMISSIONS,
  [UserRole.USER]: USER_DEFAULT_PERMISSIONS
};

export const getDefaultPermissionsForRole = (role: UserRole): Record<UserPermission, boolean> => {
  return {
    ...ROLE_DEFAULT_PERMISSIONS[role]
  };
};

export const resolveUserPermissions = (
  user?: Pick<User, 'role' | 'permissions'> | null
): Record<UserPermission, boolean> => {
  if (!user) {
    return getDefaultPermissionsForRole(UserRole.USER);
  }

  const defaults = getDefaultPermissionsForRole(user.role || UserRole.USER);
  const overrides = user.permissions || {};

  const resolved = { ...defaults };
  USER_PERMISSION_LIST.forEach((permission) => {
    if (typeof overrides[permission] === 'boolean') {
      resolved[permission] = Boolean(overrides[permission]);
    }
  });

  return resolved;
};

export const hasUserPermission = (
  user: Pick<User, 'role' | 'permissions'> | null | undefined,
  permission: UserPermission
): boolean => {
  const resolved = resolveUserPermissions(user);
  return resolved[permission] === true;
};

export const getPermissionOverrides = (
  role: UserRole,
  resolvedPermissions: Record<UserPermission, boolean>
): UserPermissions => {
  const defaults = getDefaultPermissionsForRole(role);
  const overrides: UserPermissions = {};

  USER_PERMISSION_LIST.forEach((permission) => {
    if (resolvedPermissions[permission] !== defaults[permission]) {
      overrides[permission] = resolvedPermissions[permission];
    }
  });

  return overrides;
};
