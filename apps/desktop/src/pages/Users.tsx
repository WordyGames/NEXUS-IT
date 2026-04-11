import React, { useState, useEffect } from 'react';
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
  User as UserIcon
} from 'lucide-react';

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

  // Equipos
  if (normalized[UserPermission.EQUIPMENT_MANAGE]) {
    normalized[UserPermission.EQUIPMENT_VIEW] = true;
  }
  if (!normalized[UserPermission.EQUIPMENT_VIEW]) {
    normalized[UserPermission.EQUIPMENT_MANAGE] = false;
  }

  // Mantenimientos
  if (normalized[UserPermission.MAINTENANCES_MANAGE]) {
    normalized[UserPermission.MAINTENANCES_VIEW] = true;
  }
  if (!normalized[UserPermission.MAINTENANCES_VIEW]) {
    normalized[UserPermission.MAINTENANCES_MANAGE] = false;
  }

  // Tickets
  if (
    normalized[UserPermission.TICKETS_VIEW_ALL] ||
    normalized[UserPermission.TICKETS_CHANGE_STATUS]
  ) {
    normalized[UserPermission.TICKETS_VIEW] = true;
  }
  if (!normalized[UserPermission.TICKETS_VIEW]) {
    normalized[UserPermission.TICKETS_VIEW_ALL] = false;
    normalized[UserPermission.TICKETS_CHANGE_STATUS] = false;
  }

  // Usuarios
  if (normalized[UserPermission.USERS_MANAGE]) {
    normalized[UserPermission.USERS_VIEW] = true;
  }
  if (!normalized[UserPermission.USERS_VIEW]) {
    normalized[UserPermission.USERS_MANAGE] = false;
  }

  return normalized;
};

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { userData, hasPermission, refreshUser } = useAuth();
  const { showToast, confirm } = useUiFeedback();
  const canViewUsers = hasPermission(UserPermission.USERS_VIEW);
  const canManageUsers = hasPermission(UserPermission.USERS_MANAGE);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    company: Company.ESPECIAS_NATURALES,
    role: UserRole.USER,
    department: '',
    phone: '',
    email: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    company: Company.ESPECIAS_NATURALES,
    department: '',
    phone: '',
    email: '',
    isActive: true
  });

  const [newPassword, setNewPassword] = useState('');
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
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetEditForm = () => {
    setEditFormData({
      name: '',
      company: Company.ESPECIAS_NATURALES,
      department: '',
      phone: '',
      email: '',
      isActive: true
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedUsername = formData.username.trim().toLowerCase();
    const normalizedName = formData.name.trim();
    const normalizedDepartment = formData.department.trim();
    const normalizedPhone = formData.phone.trim();
    const normalizedEmail = formData.email.trim();

    if (normalizedUsername.length < 3) {
      showToast({
        type: 'warning',
        title: 'Usuario invalido',
        message: 'El nombre de usuario debe tener al menos 3 caracteres'
      });
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
      showToast({
        type: 'warning',
        title: 'Usuario invalido',
        message: 'Solo se permiten letras minusculas, numeros, punto, guion y guion bajo'
      });
      return;
    }

    if (formData.password.trim().length < 6) {
      showToast({
        type: 'warning',
        title: 'Contrasena invalida',
        message: 'La contrasena debe tener al menos 6 caracteres'
      });
      return;
    }

    if (normalizedName.length < 3) {
      showToast({
        type: 'warning',
        title: 'Nombre invalido',
        message: 'Captura el nombre completo del usuario'
      });
      return;
    }

    if (normalizedPhone.length < 8) {
      showToast({
        type: 'warning',
        title: 'Telefono invalido',
        message: 'Captura un telefono valido para registrar la cuenta'
      });
      return;
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showToast({
        type: 'warning',
        title: 'Correo invalido',
        message: 'Captura un correo valido o deja el campo vacío'
      });
      return;
    }
    
    try {
      await createUser(
        normalizedUsername,
        formData.password.trim(),
        normalizedName,
        formData.company,
        formData.role,
        normalizedDepartment,
        normalizedPhone,
        normalizedDepartment,
        normalizedEmail
      );
      
      setShowCreateModal(false);
      resetForm();
      await loadUsers();
      showToast({
        type: 'success',
        title: 'Usuario creado',
        message: 'El usuario se creo correctamente'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error al crear usuario',
        message: error.message || 'No se pudo crear el usuario'
      });
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!canManageUsers) return;

    try {
      await updateUser(user.id, { isActive: !user.isActive });
      await loadUsers();
      showToast({
        type: 'success',
        title: user.isActive ? 'Usuario desactivado' : 'Usuario activado',
        message: `${user.name} fue ${user.isActive ? 'desactivado' : 'activado'} correctamente`
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error al actualizar usuario',
        message: error.message || 'No se pudo actualizar el usuario'
      });
    }
  };

  const handleOpenEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      company: user.company,
      department: user.department || '',
      phone: user.phone || '',
      email: user.email || '',
      isActive: user.isActive
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers || !selectedUser) return;

    const normalizedName = editFormData.name.trim();
    const normalizedDepartment = editFormData.department.trim();
    const normalizedPhone = editFormData.phone.trim();
    const normalizedEmail = editFormData.email.trim();

    if (normalizedName.length < 3) {
      showToast({
        type: 'warning',
        title: 'Nombre invalido',
        message: 'Captura el nombre completo del usuario'
      });
      return;
    }

    if (normalizedPhone.length < 8) {
      showToast({
        type: 'warning',
        title: 'Telefono invalido',
        message: 'Captura un telefono valido para registrar la cuenta'
      });
      return;
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showToast({
        type: 'warning',
        title: 'Correo invalido',
        message: 'Captura un correo valido o deja el campo vacío'
      });
      return;
    }

    try {
      await updateUser(selectedUser.id, {
        name: normalizedName,
        company: editFormData.company,
        department: normalizedDepartment,
        phone: normalizedPhone,
        email: normalizedEmail,
        isActive: editFormData.isActive
      });

      await loadUsers();

      if (selectedUser.id === userData?.id) {
        await refreshUser();
      }

      setShowEditModal(false);
      setSelectedUser(null);
      resetEditForm();

      showToast({
        type: 'success',
        title: 'Usuario actualizado',
        message: 'Los datos del usuario se guardaron correctamente'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error al actualizar usuario',
        message: error.message || 'No se pudo actualizar el usuario'
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) return;
    
    if (!selectedUser) return;
    if (newPassword.trim().length < 6) {
      showToast({
        type: 'warning',
        title: 'Contrasena invalida',
        message: 'La contrasena debe tener al menos 6 caracteres'
      });
      return;
    }
    
    try {
      await changePassword(selectedUser.id, newPassword.trim());
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
      showToast({
        type: 'success',
        title: 'Contrasena actualizada',
        message: 'La contrasena se actualizo correctamente'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error al cambiar contrasena',
        message: error.message || 'No se pudo cambiar la contrasena'
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!canManageUsers) return;

    if (userData?.id === user.id) {
      showToast({
        type: 'warning',
        title: 'Operacion no permitida',
        message: 'No puedes eliminar tu propio usuario'
      });
      return;
    }

    const accepted = await confirm({
      title: 'Eliminar usuario',
      message: `¿Seguro que deseas eliminar a ${user.name}? Esta accion no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      intent: 'danger'
    });
    if (!accepted) return;

    try {
      await deleteUser(user.id);
      await loadUsers();
      showToast({
        type: 'success',
        title: 'Usuario eliminado',
        message: `Se elimino a ${user.name} correctamente`
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error al eliminar usuario',
        message: error.message || 'No se pudo eliminar el usuario'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      company: Company.ESPECIAS_NATURALES,
      role: UserRole.USER,
      department: '',
      phone: '',
      email: ''
    });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    resetEditForm();
  };

  const handleOpenPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setPermissionRole(user.role);
    setPermissionValues(normalizePermissionDependencies(resolveUserPermissions(user)));
    setShowPermissionsModal(true);
  };

  const handlePermissionToggle = (permission: UserPermission, enabled: boolean) => {
    setPermissionValues((prev) => {
      const updated = {
        ...prev,
        [permission]: enabled
      };

      return normalizePermissionDependencies(updated);
    });
  };

  const handleApplyRoleDefaults = () => {
    setPermissionValues(
      normalizePermissionDependencies(getDefaultPermissionsForRole(permissionRole))
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    if (selectedUser.id === userData?.id) {
      if (!permissionValues[UserPermission.USERS_MANAGE]) {
        showToast({
          type: 'warning',
          title: 'Operacion no permitida',
          message: 'No puedes quitarte el permiso para administrar usuarios'
        });
        return;
      }

      if (!permissionValues[UserPermission.DASHBOARD_ADMIN]) {
        showToast({
          type: 'warning',
          title: 'Operacion no permitida',
          message: 'No puedes quitarte el acceso al panel admin mientras editas tu propio perfil'
        });
        return;
      }
    }

    try {
      const normalizedPermissions = normalizePermissionDependencies(permissionValues);
      const permissionOverrides = getPermissionOverrides(permissionRole, normalizedPermissions);

      await updateUser(selectedUser.id, {
        role: permissionRole,
        permissions: permissionOverrides
      });

      await loadUsers();

      if (selectedUser.id === userData?.id) {
        await refreshUser();
      }

      setShowPermissionsModal(false);
      setSelectedUser(null);

      showToast({
        type: 'success',
        title: 'Permisos actualizados',
        message: 'Los permisos del usuario se guardaron correctamente'
      });
    } catch (error: any) {
      showToast({
        type: 'error',
        title: 'Error al guardar permisos',
        message: error.message || 'No se pudieron guardar los permisos'
      });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      [UserRole.ADMIN]: 'bg-purple-100 text-purple-800',
      [UserRole.USER]: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.USER]: 'Usuario'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const getCompanyBadge = (company: Company) => {
    const colors = {
      [Company.ESPECIAS_NATURALES]: 'bg-green-100 text-green-800',
      [Company.GRUPO_AMEX]: 'bg-blue-100 text-blue-800',
      [Company.EQUIPOS_OSENAL]: 'bg-purple-100 text-purple-800',
    };
    
    const labels = {
      [Company.ESPECIAS_NATURALES]: 'Especias Naturales del Norte',
      [Company.GRUPO_AMEX]: 'Grupo AMEX',
      [Company.EQUIPOS_OSENAL]: 'Equipos OSENAL',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[company]}`}>
        {labels[company]}
      </span>
    );
  };

  if (!canViewUsers) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          No tienes permisos para acceder a esta sección
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra usuarios, roles y permisos por perfil
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <UserPlus size={20} />
            Crear Usuario
          </button>
        )}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                {canManageUsers && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <UserIcon size={20} className="text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getCompanyBadge(user.company)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <UserCheck size={16} />
                        Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <UserX size={16} />
                        Inactivo
                      </span>
                    )}
                  </td>
                  {canManageUsers && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
                          title="Editar datos y empresa"
                        >
                          <PencilLine size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenPermissionsModal(user)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Editar permisos"
                        >
                          <Settings2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Cambiar contraseña"
                        >
                          <Lock size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`${
                            user.isActive
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={user.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {user.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className={`${
                            userData?.id === user.id
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900'
                          }`}
                          title={userData?.id === user.id ? 'No puedes eliminar tu usuario' : 'Eliminar usuario'}
                          disabled={userData?.id === user.id}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Crear Nuevo Usuario
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Usuario *
                </label>
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  aria-label="Nombre de usuario"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  placeholder="Contraseña"
                  aria-label="Contraseña"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  aria-label="Nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Empresa *
                </label>
                <select
                  aria-label="Seleccionar empresa"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value as Company })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value={Company.ESPECIAS_NATURALES}>Especias Naturales del Norte</option>
                  <option value={Company.GRUPO_AMEX}>Grupo AMEX</option>
                  <option value={Company.EQUIPOS_OSENAL}>Equipos OSENAL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rol *
                </label>
                <select
                  aria-label="Seleccionar rol"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value={UserRole.USER}>Usuario</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  placeholder="Departamento"
                  aria-label="Departamento"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  placeholder="Teléfono"
                  aria-label="Teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  aria-label="Correo electrónico"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Crear Usuario
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Editar Usuario
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Usuario: <strong>{selectedUser.username}</strong>
            </p>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  aria-label="Nombre completo"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Empresa *
                </label>
                <select
                  aria-label="Seleccionar empresa"
                  value={editFormData.company}
                  onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value as Company })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value={Company.ESPECIAS_NATURALES}>Especias Naturales del Norte</option>
                  <option value={Company.GRUPO_AMEX}>Grupo AMEX</option>
                  <option value={Company.EQUIPOS_OSENAL}>Equipos OSENAL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departamento
                </label>
                <input
                  type="text"
                  placeholder="Departamento"
                  aria-label="Departamento"
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  placeholder="Teléfono"
                  aria-label="Teléfono"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  aria-label="Correo electrónico"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estado
                </label>
                <select
                  aria-label="Estado del usuario"
                  value={editFormData.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      isActive: e.target.value === 'active'
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Guardar cambios
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Cambiar Contraseña
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Usuario: <strong>{selectedUser.username}</strong>
            </p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  aria-label="Nueva contraseña"
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Cambiar Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Permisos de perfil
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Usuario: <strong>{selectedUser.name}</strong> (@{selectedUser.username})
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rol base
                </label>
                <select
                  aria-label="Rol base de permisos"
                  value={permissionRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as UserRole;
                    setPermissionRole(nextRole);
                    setPermissionValues(
                      normalizePermissionDependencies(getDefaultPermissionsForRole(nextRole))
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value={UserRole.USER}>Usuario</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={handleApplyRoleDefaults}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                >
                  Restablecer permisos por rol
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {permissionGroups.map((group) => (
                <div key={group.title} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-3">{group.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.permissions.map((permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(permissionValues[permission])}
                          onChange={(e) => handlePermissionToggle(permission, e.target.checked)}
                          className="rounded"
                        />
                        {permissionLabels[permission]}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-6">
              <button
                type="button"
                onClick={handleSavePermissions}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Guardar permisos
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
