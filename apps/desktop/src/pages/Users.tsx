import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  UserRole,
  UserPermission,
  Company,
  getDefaultPermissionsForRole,
  resolveUserPermissions,
  getPermissionOverrides,
  getUsers,
  createUser,
  updateUser,
  changePassword,
  deleteUser
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import {
  UserPlus,
  PencilLine,
  Settings2,
  Lock,
  UserCheck,
  UserX,
  Trash2,
  User as UserIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldOff,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, Badge, Spinner, Card, EmptyState, Input, Select } from '../components/ui';

const PAGE_SIZE = 20;

const permissionLabels: Record<UserPermission, string> = {
  [UserPermission.DASHBOARD_ADMIN]: 'Acceso a panel admin',
  [UserPermission.EQUIPMENT_VIEW]: 'Ver equipos',
  [UserPermission.EQUIPMENT_MANAGE]: 'Crear/editar/eliminar equipos',
  [UserPermission.MAINTENANCES_VIEW]: 'Ver mantenimientos',
  [UserPermission.MAINTENANCES_MANAGE]: 'Crear/editar/eliminar mantenimientos',
  [UserPermission.REPORTS_VIEW]: 'Ver reportes',
  [UserPermission.WARRANTY_VIEW]: 'Ver reporte de garantías',
  [UserPermission.USERS_VIEW]: 'Ver módulo de usuarios',
  [UserPermission.USERS_MANAGE]: 'Administrar usuarios y permisos',
  [UserPermission.SETTINGS_VIEW]: 'Ver configuración',
  [UserPermission.TICKETS_VIEW]: 'Ver tickets',
  [UserPermission.TICKETS_VIEW_ALL]: 'Ver tickets de todos',
  [UserPermission.TICKETS_CHANGE_STATUS]: 'Cambiar estado de tickets',
  [UserPermission.NOTIFICATIONS_VIEW]: 'Ver notificaciones'
};

const permissionGroups: Array<{ title: string; permissions: UserPermission[] }> = [
  {
    title: 'Acceso general',
    permissions: [
      UserPermission.DASHBOARD_ADMIN,
      UserPermission.SETTINGS_VIEW,
      UserPermission.NOTIFICATIONS_VIEW
    ]
  },
  {
    title: 'Equipos y mantenimientos',
    permissions: [
      UserPermission.EQUIPMENT_VIEW,
      UserPermission.EQUIPMENT_MANAGE,
      UserPermission.MAINTENANCES_VIEW,
      UserPermission.MAINTENANCES_MANAGE,
      UserPermission.WARRANTY_VIEW
    ]
  },
  {
    title: 'Tickets',
    permissions: [
      UserPermission.TICKETS_VIEW,
      UserPermission.TICKETS_VIEW_ALL,
      UserPermission.TICKETS_CHANGE_STATUS
    ]
  },
  {
    title: 'Administración',
    permissions: [
      UserPermission.REPORTS_VIEW,
      UserPermission.USERS_VIEW,
      UserPermission.USERS_MANAGE
    ]
  }
];

const normalizePermissionDependencies = (
  values: Record<UserPermission, boolean>
): Record<UserPermission, boolean> => {
  const normalized = { ...values };

  if (normalized[UserPermission.EQUIPMENT_MANAGE]) normalized[UserPermission.EQUIPMENT_VIEW] = true;
  if (!normalized[UserPermission.EQUIPMENT_VIEW]) normalized[UserPermission.EQUIPMENT_MANAGE] = false;

  if (normalized[UserPermission.MAINTENANCES_MANAGE]) normalized[UserPermission.MAINTENANCES_VIEW] = true;
  if (!normalized[UserPermission.MAINTENANCES_VIEW]) normalized[UserPermission.MAINTENANCES_MANAGE] = false;

  if (normalized[UserPermission.TICKETS_VIEW_ALL] || normalized[UserPermission.TICKETS_CHANGE_STATUS])
    normalized[UserPermission.TICKETS_VIEW] = true;
  if (!normalized[UserPermission.TICKETS_VIEW]) {
    normalized[UserPermission.TICKETS_VIEW_ALL] = false;
    normalized[UserPermission.TICKETS_CHANGE_STATUS] = false;
  }

  if (normalized[UserPermission.USERS_MANAGE]) normalized[UserPermission.USERS_VIEW] = true;
  if (!normalized[UserPermission.USERS_VIEW]) normalized[UserPermission.USERS_MANAGE] = false;

  return normalized;
};

// ── Shared sub-components ────────────────────────────────────────────────────

const Modal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    {children}
  </div>
);

const ModalBox: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${wide ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : 'max-w-md'} p-6`}>
    {children}
  </div>
);

const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{children}</h2>
);

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {children}
  </label>
);

const roleBadge = (role: UserRole) => {
  if (role === UserRole.ADMIN) return <Badge color="purple" dot>Administrador</Badge>;
  return <Badge color="gray" dot>Usuario</Badge>;
};

const companyBadge = (company: Company) => {
  const map: Record<string, { color: 'green' | 'blue' | 'purple'; label: string }> = {
    [Company.ESPECIAS_NATURALES]: { color: 'green',  label: 'Especias Naturales' },
    [Company.GRUPO_AMEX]:         { color: 'blue',   label: 'Grupo AMEX' },
    [Company.EQUIPOS_OSENAL]:     { color: 'purple', label: 'Equipos OSENAL' },
  };
  const entry = map[company];
  if (!entry) return <Badge color="slate">{company}</Badge>;
  return <Badge color={entry.color}>{entry.label}</Badge>;
};

// ── Main component ────────────────────────────────────────────────────────────

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { userData, hasPermission, refreshUser } = useAuth();
  const { showToast, confirm } = useUiFeedback();
  const canViewUsers = hasPermission(UserPermission.USERS_VIEW);
  const canManageUsers = hasPermission(UserPermission.USERS_MANAGE);

  const [formData, setFormData] = useState({
    username: '', password: '', name: '',
    company: Company.ESPECIAS_NATURALES, role: UserRole.USER,
    department: '', phone: '', email: ''
  });

  const [editFormData, setEditFormData] = useState({
    username: '', name: '', company: Company.ESPECIAS_NATURALES,
    department: '', phone: '', email: '', isActive: true
  });

  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [permissionRole, setPermissionRole] = useState<UserRole>(UserRole.USER);
  const [permissionValues, setPermissionValues] = useState<Record<UserPermission, boolean>>(
    getDefaultPermissionsForRole(UserRole.USER)
  );

  useEffect(() => {
    if (!canViewUsers) return;
    loadUsers();
  }, [canViewUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setUsers(await getUsers());
    } catch {
      // handled via empty state
    } finally {
      setLoading(false);
    }
  };

  const syncUsers = () => { getUsers().then(setUsers).catch(() => {}); };

  // ── Filtering + pagination ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetForm = () => setFormData({ username: '', password: '', name: '', company: Company.ESPECIAS_NATURALES, role: UserRole.USER, department: '', phone: '', email: '' });
  const resetEditForm = () => setEditFormData({ username: '', name: '', company: Company.ESPECIAS_NATURALES, department: '', phone: '', email: '', isActive: true });
  const closeEditModal = () => { setShowEditModal(false); setSelectedUser(null); resetEditForm(); };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = formData.username.trim().toLowerCase();
    const n = formData.name.trim();
    const d = formData.department.trim();
    const p = formData.phone.trim();
    const em = formData.email.trim();

    if (u.length < 3) return showToast({ type: 'warning', title: 'Usuario inválido', message: 'El nombre de usuario debe tener al menos 3 caracteres' });
    if (!/^[a-z0-9._-]+$/.test(u)) return showToast({ type: 'warning', title: 'Usuario inválido', message: 'Solo se permiten letras minúsculas, números, punto, guion y guion bajo' });
    if (formData.password.trim().length < 6) return showToast({ type: 'warning', title: 'Contraseña inválida', message: 'La contraseña debe tener al menos 6 caracteres' });
    if (n.length < 3) return showToast({ type: 'warning', title: 'Nombre inválido', message: 'Captura el nombre completo del usuario' });
    if (p.length < 8) return showToast({ type: 'warning', title: 'Teléfono inválido', message: 'Captura un teléfono válido para registrar la cuenta' });
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return showToast({ type: 'warning', title: 'Correo inválido', message: 'Captura un correo válido o deja el campo vacío' });

    try {
      const id = await createUser(u, formData.password.trim(), n, formData.company, formData.role, d, p, d, em);
      const optimistic: User = {
        id, username: u, password: '', name: n,
        company: formData.company, role: formData.role,
        permissions: getDefaultPermissionsForRole(formData.role),
        department: d, position: d, phone: p, email: em,
        isActive: true,
        createdAt: new Date() as any, updatedAt: new Date() as any,
      };
      setUsers((prev) => [...prev, optimistic]);
      setShowCreateModal(false);
      resetForm();
      showToast({ type: 'success', title: 'Usuario creado', message: 'El usuario se creó correctamente' });
      syncUsers();
    } catch (error: any) {
      showToast({ type: 'error', title: 'Error al crear usuario', message: error.message || 'No se pudo crear el usuario' });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers || !selectedUser) return;
    const u = editFormData.username.trim().toLowerCase();
    const n = editFormData.name.trim();
    const p = editFormData.phone.trim();
    const em = editFormData.email.trim();

    if (u.length < 3) return showToast({ type: 'warning', title: 'Usuario inválido', message: 'El nombre de usuario debe tener al menos 3 caracteres' });
    if (!/^[a-z0-9._-]+$/.test(u)) return showToast({ type: 'warning', title: 'Usuario inválido', message: 'Solo se permiten letras minúsculas, números, punto, guion y guion bajo' });
    if (n.length < 3) return showToast({ type: 'warning', title: 'Nombre inválido', message: 'Captura el nombre completo del usuario' });
    if (p.length < 8) return showToast({ type: 'warning', title: 'Teléfono inválido', message: 'Captura un teléfono válido para registrar la cuenta' });
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return showToast({ type: 'warning', title: 'Correo inválido', message: 'Captura un correo válido o deja el campo vacío' });

    const patch = {
      username: u, name: n, company: editFormData.company,
      department: editFormData.department.trim(), phone: p, email: em, isActive: editFormData.isActive,
    };
    const snapshot = users;
    setUsers((prev) => prev.map((usr) => usr.id === selectedUser.id ? { ...usr, ...patch } : usr));
    if (selectedUser.id === userData?.id) void refreshUser();
    closeEditModal();
    showToast({ type: 'success', title: 'Usuario actualizado', message: 'Los datos del usuario se guardaron correctamente' });
    try {
      await updateUser(selectedUser.id, patch);
    } catch (error: any) {
      setUsers(snapshot);
      showToast({ type: 'error', title: 'Error al actualizar usuario', message: error.message || 'No se pudo actualizar el usuario' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers || !selectedUser) return;
    if (newPassword.trim().length < 6) return showToast({ type: 'warning', title: 'Contraseña inválida', message: 'La contraseña debe tener al menos 6 caracteres' });
    try {
      await changePassword(selectedUser.id, newPassword.trim());
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
      showToast({ type: 'success', title: 'Contraseña actualizada', message: 'La contraseña se actualizó correctamente' });
    } catch (error: any) {
      showToast({ type: 'error', title: 'Error al cambiar contraseña', message: error.message || 'No se pudo cambiar la contraseña' });
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!canManageUsers) return;
    const snapshot = users;
    setUsers((prev) => prev.map((u2) => u2.id === user.id ? { ...u2, isActive: !user.isActive } : u2));
    showToast({ type: 'success', title: user.isActive ? 'Usuario desactivado' : 'Usuario activado', message: `${user.name} fue ${user.isActive ? 'desactivado' : 'activado'} correctamente` });
    try {
      await updateUser(user.id, { isActive: !user.isActive });
    } catch (error: any) {
      setUsers(snapshot);
      showToast({ type: 'error', title: 'Error al actualizar usuario', message: error.message || 'No se pudo actualizar el usuario' });
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!canManageUsers) return;
    if (userData?.id === user.id) {
      showToast({ type: 'warning', title: 'Operación no permitida', message: 'No puedes eliminar tu propio usuario' });
      return;
    }
    const accepted = await confirm({
      title: 'Eliminar usuario',
      message: `¿Seguro que deseas eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      intent: 'danger'
    });
    if (!accepted) return;
    const snapshot = users;
    setUsers((prev) => prev.filter((u2) => u2.id !== user.id));
    showToast({ type: 'success', title: 'Usuario eliminado', message: `Se eliminó a ${user.name} correctamente` });
    try {
      await deleteUser(user.id);
    } catch (error: any) {
      setUsers(snapshot);
      showToast({ type: 'error', title: 'Error al eliminar usuario', message: error.message || 'No se pudo eliminar el usuario' });
    }
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({ username: user.username, name: user.name, company: user.company, department: user.department || '', phone: user.phone || '', email: user.email || '', isActive: user.isActive });
    setShowEditModal(true);
  };

  const handleOpenPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setPermissionRole(user.role);
    setPermissionValues(normalizePermissionDependencies(resolveUserPermissions(user)));
    setShowPermissionsModal(true);
  };

  const handlePermissionToggle = (permission: UserPermission, enabled: boolean) => {
    setPermissionValues((prev) => normalizePermissionDependencies({ ...prev, [permission]: enabled }));
  };

  const handleApplyRoleDefaults = () => {
    setPermissionValues(normalizePermissionDependencies(getDefaultPermissionsForRole(permissionRole)));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === userData?.id) {
      if (!permissionValues[UserPermission.USERS_MANAGE])
        return showToast({ type: 'warning', title: 'Operación no permitida', message: 'No puedes quitarte el permiso para administrar usuarios' });
      if (!permissionValues[UserPermission.DASHBOARD_ADMIN])
        return showToast({ type: 'warning', title: 'Operación no permitida', message: 'No puedes quitarte el acceso al panel admin mientras editas tu propio perfil' });
    }
    const normalized = normalizePermissionDependencies(permissionValues);
    const patch = { role: permissionRole, permissions: getPermissionOverrides(permissionRole, normalized) };
    const snapshot = users;
    setUsers((prev) => prev.map((usr) => usr.id === selectedUser.id ? { ...usr, ...patch } : usr));
    if (selectedUser.id === userData?.id) void refreshUser();
    setShowPermissionsModal(false);
    setSelectedUser(null);
    showToast({ type: 'success', title: 'Permisos actualizados', message: 'Los permisos del usuario se guardaron correctamente' });
    try {
      await updateUser(selectedUser.id, patch);
    } catch (error: any) {
      setUsers(snapshot);
      showToast({ type: 'error', title: 'Error al guardar permisos', message: error.message || 'No se pudieron guardar los permisos' });
    }
  };

  // ── Access guard ─────────────────────────────────────────────────────────────

  if (!canViewUsers) {
    return (
      <div className="space-y-5">
        <EmptyState
          icon={<ShieldOff size={28} />}
          title="Sin acceso"
          description="No tienes permisos para acceder a esta sección."
        />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManageUsers && (
          <Button variant="primary" iconLeft={<UserPlus size={15} />} onClick={() => setShowCreateModal(true)}>
            Crear Usuario
          </Button>
        )}
      </div>

      {/* Search */}
      <Card padding="sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por nombre, usuario, depto o correo..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
          />
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Spinner size="xl" label="Cargando usuarios..." className="h-64 justify-center" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserIcon size={28} />}
          title={search ? 'Sin resultados' : 'Sin usuarios'}
          description={search ? `No se encontraron usuarios que coincidan con "${search}".` : 'No hay usuarios registrados.'}
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  {['Usuario', 'Empresa', 'Rol', 'Departamento', 'Estado', ...(canManageUsers ? ['Acciones'] : [])].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {paginated.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                            {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{companyBadge(user.company)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{roleBadge(user.role)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{user.department || '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {user.isActive
                        ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"><UserCheck size={13} />Activo</span>
                        : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400"><UserX size={13} />Inactivo</span>}
                    </td>
                    {canManageUsers && (
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <ActionBtn title="Editar datos" color="emerald" onClick={() => handleOpenEditModal(user)}>
                            <PencilLine size={15} />
                          </ActionBtn>
                          <ActionBtn title="Editar permisos" color="indigo" onClick={() => handleOpenPermissionsModal(user)}>
                            <Settings2 size={15} />
                          </ActionBtn>
                          <ActionBtn title="Cambiar contraseña" color="blue" onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }}>
                            <Lock size={15} />
                          </ActionBtn>
                          <ActionBtn
                            title={user.isActive ? 'Desactivar' : 'Activar'}
                            color={user.isActive ? 'red' : 'green'}
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </ActionBtn>
                          <ActionBtn
                            title={userData?.id === user.id ? 'No puedes eliminar tu usuario' : 'Eliminar usuario'}
                            color="red"
                            onClick={() => handleDeleteUser(user)}
                            disabled={userData?.id === user.id}
                          >
                            <Trash2 size={15} />
                          </ActionBtn>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Página anterior" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-300 px-2">{page} / {totalPages}</span>
                <button type="button" aria-label="Página siguiente" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Create User Modal ──────────────────────────────────────────────────── */}
      {showCreateModal && (
        <Modal>
          <ModalBox>
            <ModalTitle>Crear Nuevo Usuario</ModalTitle>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <Field label="Usuario" required>
                <input type="text" placeholder="ej. juan.perez" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className={inputCls} required />
              </Field>
              <Field label="Contraseña" required>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Mín. 6 caracteres" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className={`${inputCls} pr-10`} required />
                  <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Nombre Completo" required>
                <input type="text" placeholder="Nombre y apellidos" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputCls} required />
              </Field>
              <Field label="Empresa" required>
                <select value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value as Company })} className={inputCls} required>
                  <option value={Company.ESPECIAS_NATURALES}>Especias Naturales del Norte</option>
                  <option value={Company.GRUPO_AMEX}>Grupo AMEX</option>
                  <option value={Company.EQUIPOS_OSENAL}>Equipos OSENAL</option>
                </select>
              </Field>
              <Field label="Rol" required>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className={inputCls} required>
                  <option value={UserRole.USER}>Usuario</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </Field>
              <Field label="Departamento">
                <input type="text" placeholder="Departamento (opcional)" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Teléfono" required>
                <input type="tel" placeholder="10 dígitos" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputCls} required />
              </Field>
              <Field label="Correo electrónico">
                <input type="email" placeholder="correo@empresa.com (opcional)" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputCls} />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1">Crear Usuario</Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowCreateModal(false); resetForm(); }}>Cancelar</Button>
              </div>
            </form>
          </ModalBox>
        </Modal>
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────────────── */}
      {showEditModal && selectedUser && (
        <Modal>
          <ModalBox>
            <ModalTitle>Editar Usuario</ModalTitle>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <Field label="Usuario" required>
                <input type="text" value={editFormData.username} onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })} className={inputCls} required />
              </Field>
              <Field label="Nombre Completo" required>
                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className={inputCls} required />
              </Field>
              <Field label="Empresa" required>
                <select value={editFormData.company} onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value as Company })} className={inputCls} required>
                  <option value={Company.ESPECIAS_NATURALES}>Especias Naturales del Norte</option>
                  <option value={Company.GRUPO_AMEX}>Grupo AMEX</option>
                  <option value={Company.EQUIPOS_OSENAL}>Equipos OSENAL</option>
                </select>
              </Field>
              <Field label="Departamento">
                <input type="text" value={editFormData.department} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Teléfono" required>
                <input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} className={inputCls} required />
              </Field>
              <Field label="Correo electrónico">
                <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Estado">
                <select value={editFormData.isActive ? 'active' : 'inactive'} onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.value === 'active' })} className={inputCls}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </Field>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1">Guardar Cambios</Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={closeEditModal}>Cancelar</Button>
              </div>
            </form>
          </ModalBox>
        </Modal>
      )}

      {/* ── Change Password Modal ─────────────────────────────────────────────── */}
      {showPasswordModal && selectedUser && (
        <Modal>
          <ModalBox>
            <ModalTitle>Cambiar Contraseña</ModalTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Usuario: <span className="font-semibold text-slate-700 dark:text-slate-200">@{selectedUser.username}</span>
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Field label="Nueva Contraseña" required>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mín. 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputCls} pr-10`}
                    required
                    minLength={6}
                  />
                  <button type="button" aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowNewPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1">Cambiar Contraseña</Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setSelectedUser(null); }}>Cancelar</Button>
              </div>
            </form>
          </ModalBox>
        </Modal>
      )}

      {/* ── Permissions Modal ─────────────────────────────────────────────────── */}
      {showPermissionsModal && selectedUser && (
        <Modal>
          <ModalBox wide>
            <ModalTitle>Permisos de Perfil</ModalTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2 mb-5">
              {selectedUser.name} <span className="text-slate-400">(@{selectedUser.username})</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <Field label="Rol base">
                <select
                  value={permissionRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as UserRole;
                    setPermissionRole(nextRole);
                    setPermissionValues(normalizePermissionDependencies(getDefaultPermissionsForRole(nextRole)));
                  }}
                  className={inputCls}
                >
                  <option value={UserRole.USER}>Usuario</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </Field>
              <div className="md:col-span-2 flex items-end">
                <Button type="button" variant="secondary" onClick={handleApplyRoleDefaults}>
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
                          checked={Boolean(permissionValues[permission])}
                          onChange={(e) => handlePermissionToggle(permission, e.target.checked)}
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
              <Button type="button" variant="primary" className="flex-1" onClick={handleSavePermissions}>Guardar Permisos</Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowPermissionsModal(false); setSelectedUser(null); }}>Cancelar</Button>
            </div>
          </ModalBox>
        </Modal>
      )}
    </div>
  );
};

// ── Action button helper ──────────────────────────────────────────────────────

type ActionColor = 'emerald' | 'indigo' | 'blue' | 'red' | 'green';
const colorMap: Record<ActionColor, string> = {
  emerald: 'text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300',
  indigo:  'text-indigo-500  hover:text-indigo-700  dark:hover:text-indigo-300',
  blue:    'text-blue-500    hover:text-blue-700    dark:hover:text-blue-300',
  red:     'text-red-500     hover:text-red-700     dark:hover:text-red-300',
  green:   'text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300',
};

const ActionBtn: React.FC<{
  title: string;
  color: ActionColor;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}> = ({ title, color, children, onClick, disabled }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${colorMap[color]}`}
  >
    {children}
  </button>
);

export default Users;
