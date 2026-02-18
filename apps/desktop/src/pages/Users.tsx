import React, { useState, useEffect } from 'react';
import { 
  User, 
  UserRole, 
  Company,
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
  Edit2, 
  Lock, 
  UserCheck, 
  UserX,
  Trash2,
  Building2,
  Shield,
  User as UserIcon
} from 'lucide-react';

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { isAdmin, userData } = useAuth();
  const { showToast, confirm } = useUiFeedback();

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    company: Company.ESPECIAS_NATURALES,
    role: UserRole.USER,
    department: '',
    phone: ''
  });

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedUsername = formData.username.trim().toLowerCase();
    const normalizedName = formData.name.trim();
    const normalizedDepartment = formData.department.trim();
    const normalizedPhone = formData.phone.trim();

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
    
    try {
      await createUser(
        normalizedUsername,
        formData.password.trim(),
        normalizedName,
        formData.company,
        formData.role,
        normalizedDepartment,
        normalizedPhone,
        normalizedDepartment
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      phone: ''
    });
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

  if (!isAdmin) {
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
            Administra los usuarios del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <UserPlus size={20} />
          Crear Usuario
        </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
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
    </div>
  );
};

export default Users;
