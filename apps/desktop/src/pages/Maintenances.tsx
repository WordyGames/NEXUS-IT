import React, { useEffect, useState } from 'react';
import { Wrench, Plus, Calendar, AlertTriangle, CheckCircle2, Clock, Filter, Download } from 'lucide-react';
import {
  Maintenance,
  MaintenanceStatus,
  MaintenanceType,
  UserPermission,
  getMaintenances,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getMaintenanceById,
  getUpcomingMaintenances,
  getOverdueMaintenances,
  Company,
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import MaintenanceForm from '../components/MaintenanceForm';
import MaintenanceStatusEditor from '../components/MaintenanceStatusEditor';
import { exportMaintenancesToExcel } from '../utils/exportToExcel';
import { sendMaintenanceSavedEmail } from '../utils/maintenanceEmail';

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
};

const Maintenances = () => {
  const { hasPermission } = useAuth();
  const { showToast, confirm } = useUiFeedback();
  const canManageMaintenances = hasPermission(UserPermission.MAINTENANCES_MANAGE);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [upcomingMaintenances, setUpcomingMaintenances] = useState<Maintenance[]>([]);
  const [overdueMaintenances, setOverdueMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | undefined>();
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [justCreatedMaintenance, setJustCreatedMaintenance] = useState<Maintenance | undefined>();
  
  // Filtros
  const [companyFilter, setCompanyFilter] = useState<Company | ''>('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<MaintenanceType | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadMaintenances();
  }, [companyFilter, statusFilter, typeFilter, searchTerm]);

  const loadMaintenances = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (companyFilter) filters.company = companyFilter;
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.type = typeFilter;
      if (searchTerm) filters.search = searchTerm;

      const [allMaintenances, upcoming, overdue] = await Promise.all([
        getMaintenances(filters),
        getUpcomingMaintenances(),
        getOverdueMaintenances(),
      ]);

      setMaintenances(allMaintenances);
      setUpcomingMaintenances(upcoming);
      setOverdueMaintenances(overdue);
    } catch (error) {
      console.error('Error loading maintenances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async (data: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const createdId = await createMaintenance(data as any);

      try {
        const recipientEmail = data.notificationEmail?.trim();
        if (recipientEmail) {
          await sendMaintenanceSavedEmail({
            recipientEmail,
            maintenanceId: createdId,
            equipmentName: data.equipmentName,
            company: data.company,
            title: data.title,
            scheduledDate: toDate(data.scheduledDate).toISOString(),
            assignedToName: data.assignedToName,
            createdByName: data.createdByName
          });
        }
      } catch (emailError) {
        console.error('Error sending maintenance email notification:', emailError);
      }

      await loadMaintenances();
      setShowForm(false);

      const created = await getMaintenanceById(createdId);
      if (created) {
        setJustCreatedMaintenance(created);
        setShowStatusEditor(true);
      }

      showToast({
        type: 'success',
        title: 'Mantenimiento creado',
        message: 'El mantenimiento se guardó correctamente'
      });
      return createdId;
    } catch (error) {
      console.error('Error creating maintenance:', error);
      showToast({
        type: 'error',
        title: 'Error al crear mantenimiento',
        message: 'No se pudo guardar el mantenimiento'
      });
      throw error;
    }
  };

  const handleUpdateMaintenance = async (data: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      if (selectedMaintenance) {
        await updateMaintenance(selectedMaintenance.id, data as any);
        await loadMaintenances();
        setShowForm(false);
        setSelectedMaintenance(undefined);
        showToast({
          type: 'success',
          title: 'Mantenimiento actualizado',
          message: 'Los cambios se guardaron correctamente'
        });
        return selectedMaintenance.id;
      }
      throw new Error('No hay mantenimiento seleccionado para actualizar');
    } catch (error) {
      console.error('Error updating maintenance:', error);
      showToast({
        type: 'error',
        title: 'Error al actualizar mantenimiento',
        message: 'No se pudieron guardar los cambios'
      });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    const accepted = await confirm({
      title: 'Eliminar mantenimiento',
      message: '¿Estás seguro de eliminar este mantenimiento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      intent: 'danger'
    });
    if (!accepted) return;

    try {
      await deleteMaintenance(id);
      await loadMaintenances();
      showToast({
        type: 'success',
        title: 'Mantenimiento eliminado',
        message: 'El mantenimiento se eliminó correctamente'
      });
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      showToast({
        type: 'error',
        title: 'Error al eliminar',
        message: 'No se pudo eliminar el mantenimiento'
      });
    }
  };

  const handleEdit = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setShowStatusEditor(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedMaintenance(undefined);
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    const colors = {
      [MaintenanceStatus.PROGRAMADO]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      [MaintenanceStatus.EN_PROGRESO]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      [MaintenanceStatus.COMPLETADO]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      [MaintenanceStatus.CANCELADO]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      [MaintenanceStatus.ATRASADO]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || '';
  };

  const getTypeIcon = (type: MaintenanceType) => {
    const icons = {
      [MaintenanceType.PREVENTIVO]: '🛡️',
      [MaintenanceType.CORRECTIVO]: '🔧',
      [MaintenanceType.ACTUALIZACION]: '⬆️',
      [MaintenanceType.INSPECCION]: '🔍',
    };
    return icons[type] || '🛠️';
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Wrench className="text-blue-600" />
            Mantenimientos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Programa y gestiona mantenimientos de equipos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportMaintenancesToExcel(maintenances, 'mantenimientos')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            disabled={maintenances.length === 0}
          >
            <Download size={18} />
            Exportar Excel
          </button>
          {canManageMaintenances && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              Nuevo Mantenimiento
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {(upcomingMaintenances.length > 0 || overdueMaintenances.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Próximos */}
          {upcomingMaintenances.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-blue-600" size={20} />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Próximos (7 días)
                </h3>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {upcomingMaintenances.length} mantenimiento{upcomingMaintenances.length !== 1 ? 's' : ''} programado{upcomingMaintenances.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Vencidos */}
          {overdueMaintenances.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-red-600" size={20} />
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Vencidos
                </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 text-sm">
                {overdueMaintenances.length} mantenimiento{overdueMaintenances.length !== 1 ? 's' : ''} retrasado{overdueMaintenances.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-800 dark:text-white">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            aria-label="Filtrar por empresa"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todas las empresas</option>
            {Object.values(Company).map((company) => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>

          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos los estados</option>
            <option value={MaintenanceStatus.PROGRAMADO}>Programado</option>
            <option value={MaintenanceStatus.EN_PROGRESO}>En Progreso</option>
            <option value={MaintenanceStatus.COMPLETADO}>Completado</option>
            <option value={MaintenanceStatus.CANCELADO}>Cancelado</option>
            <option value={MaintenanceStatus.ATRASADO}>Vencido</option>
          </select>

          <select
            aria-label="Filtrar por tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="">Todos los tipos</option>
            <option value={MaintenanceType.PREVENTIVO}>Preventivo</option>
            <option value={MaintenanceType.CORRECTIVO}>Correctivo</option>
            <option value={MaintenanceType.ACTUALIZACION}>Actualización</option>
            <option value={MaintenanceType.INSPECCION}>Inspección</option>
          </select>

          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Equipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Asignado
                </th>
                {canManageMaintenances && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {maintenances.length === 0 ? (
                <tr>
                  <td colSpan={canManageMaintenances ? 7 : 6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay mantenimientos programados
                  </td>
                </tr>
              ) : (
                maintenances.map((maintenance) => (
                  <tr
                    key={maintenance.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {maintenance.equipmentName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {maintenance.company}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="flex items-center gap-1">
                        {getTypeIcon(maintenance.type)}
                        <span className="capitalize text-gray-700 dark:text-gray-300">
                          {maintenance.type}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {maintenance.title}
                      </div>
                      {maintenance.frequency && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <Clock size={12} className="inline mr-1" />
                          {maintenance.frequency}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(maintenance.scheduledDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(maintenance.status)}`}>
                        {maintenance.status === MaintenanceStatus.COMPLETADO && <CheckCircle2 size={12} className="mr-1" />}
                        {maintenance.status === MaintenanceStatus.ATRASADO && <AlertTriangle size={12} className="mr-1" />}
                        {maintenance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {maintenance.assignedToName || 'Sin asignar'}
                    </td>
                    {canManageMaintenances && (
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleEdit(maintenance)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(maintenance.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <MaintenanceForm
          onClose={handleCloseForm}
          onSubmit={selectedMaintenance ? handleUpdateMaintenance : handleCreateMaintenance}
          initialData={selectedMaintenance}
        />
      )}

      {/* Modal de editor de estado */}
      {showStatusEditor && (selectedMaintenance || justCreatedMaintenance) && (
        <MaintenanceStatusEditor
          maintenance={selectedMaintenance || justCreatedMaintenance!}
          onClose={() => {
            setShowStatusEditor(false);
            setJustCreatedMaintenance(undefined);
            setSelectedMaintenance(undefined);
          }}
          onUpdate={loadMaintenances}
        />
      )}
    </div>
  );
};

export default Maintenances;
