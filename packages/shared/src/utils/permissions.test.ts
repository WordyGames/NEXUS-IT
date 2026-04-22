import { describe, expect, it } from 'vitest';
import { UserPermission, UserRole } from '../types';
import {
  getDefaultPermissionsForRole,
  getPermissionOverrides,
  hasUserPermission,
  resolveUserPermissions,
} from './permissions';

describe('permissions utils', () => {
  it('da todos los permisos a admin por defecto', () => {
    const permissions = getDefaultPermissionsForRole(UserRole.ADMIN);

    Object.values(UserPermission).forEach((permission) => {
      expect(permissions[permission]).toBe(true);
    });
  });

  it('aplica permisos base para usuario normal', () => {
    const permissions = getDefaultPermissionsForRole(UserRole.USER);

    expect(permissions[UserPermission.TICKETS_VIEW]).toBe(true);
    expect(permissions[UserPermission.NOTIFICATIONS_VIEW]).toBe(true);
    expect(permissions[UserPermission.USERS_MANAGE]).toBe(false);
  });

  it('mezcla defaults con overrides explícitos', () => {
    const resolved = resolveUserPermissions({
      role: UserRole.USER,
      permissions: {
        [UserPermission.EQUIPMENT_VIEW]: true,
        [UserPermission.TICKETS_VIEW]: false,
      },
    });

    expect(resolved[UserPermission.EQUIPMENT_VIEW]).toBe(true);
    expect(resolved[UserPermission.TICKETS_VIEW]).toBe(false);
    expect(resolved[UserPermission.USERS_VIEW]).toBe(false);
  });

  it('evalúa permisos de un usuario correctamente', () => {
    const user = {
      role: UserRole.USER,
      permissions: {
        [UserPermission.EQUIPMENT_VIEW]: true,
      },
    };

    expect(hasUserPermission(user, UserPermission.EQUIPMENT_VIEW)).toBe(true);
    expect(hasUserPermission(user, UserPermission.USERS_MANAGE)).toBe(false);
  });

  it('devuelve solo diferencias vs defaults al calcular overrides', () => {
    const overrides = getPermissionOverrides(UserRole.USER, {
      ...getDefaultPermissionsForRole(UserRole.USER),
      [UserPermission.EQUIPMENT_VIEW]: true,
      [UserPermission.TICKETS_VIEW]: false,
    });

    expect(overrides[UserPermission.EQUIPMENT_VIEW]).toBe(true);
    expect(overrides[UserPermission.TICKETS_VIEW]).toBe(false);
    expect(overrides[UserPermission.NOTIFICATIONS_VIEW]).toBeUndefined();
  });
});
