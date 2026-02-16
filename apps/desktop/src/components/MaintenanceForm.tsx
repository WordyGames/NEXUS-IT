import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  Maintenance,
  MaintenanceType,
  MaintenanceStatus,
  MaintenanceTask,
  Equipment,
  User,
  Attachment,
  getEquipment,
  getUsers,
  triggerMaintenanceNotifications,
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';

interface MaintenanceFormProps {
  onClose: () => void;
  onSubmit: (maintenance: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialData?: Maintenance;
}

const MaintenanceForm = ({ onClose, onSubmit, initialData }: MaintenanceFormProps) => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);
  
  // Helper para convertir fecha de Firebase
  const toDate = (date: any): Date => {
    if (!date) return new Date();
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    if (date instanceof Date) return date;
    return new Date(date); // String o número
  };
  
  // Datos del formulario
  const [equipmentId, setEquipmentId] = useState(initialData?.equipmentId || '');
  const [type, setType] = useState<MaintenanceType>(initialData?.type || MaintenanceType.PREVENTIVO);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [scheduledDate, setScheduledDate] = useState(
    initialData?.scheduledDate
      ? toDate(initialData.scheduledDate).toISOString().split('T')[0]
      : ''
  );
  const [assignedTo, setAssignedTo] = useState(initialData?.assignedTo || '');
  const [frequency, setFrequency] = useState<Maintenance['frequency'] | ''>(initialData?.frequency || '');
  const [cost, setCost] = useState(initialData?.cost?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tasks, setTasks] = useState<MaintenanceTask[]>(
    initialData?.tasks || [
      { id: Date.now().toString(), description: '', completed: false }
    ]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [equipment, users] = await Promise.all([
        getEquipment({ status: 'active' }),
        getUsers(),
      ]);
      setEquipmentList(equipment);
      setUsersList(users.filter(u => u.isActive));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleAddTask = () => {
    setTasks([...tasks, { id: crypto.randomUUID(), description: '', completed: false }]);
  };

  const handleRemoveTask = (id: string) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const handleTaskChange = (id: string, description: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, description } : t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!equipmentId || !title || !scheduledDate || tasks.some(t => !t.description.trim())) {
      alert('Por favor completa todos los campos requeridos y las tareas del checklist');
      return;
    }

    const selectedEquipment = equipmentList.find(eq => eq.id === equipmentId);
    const selectedUser = usersList.find(u => u.id === assignedTo);
    
    if (!selectedEquipment) {
      alert('Equipo no encontrado');
      return;
    }

    setLoading(true);
    try {
      const maintenanceData: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'> = {
        equipmentId,
        equipmentName: selectedEquipment.name,
        company: selectedEquipment.company,
        type,
        status: initialData?.status || MaintenanceStatus.PROGRAMADO,
        title,
        description,
        scheduledDate: new Date(scheduledDate),
        tasks: tasks.filter(t => t.description.trim()),
        createdBy: userData?.id || '',
        createdByName: userData?.name || '',
      } as any;

      // Solo agregar campos opcionales si tienen valor
      if (assignedTo) {
        maintenanceData.assignedTo = assignedTo;
        if (selectedUser) {
          maintenanceData.assignedToName = selectedUser.name;
        }
      }
      if (frequency) {
        maintenanceData.frequency = frequency as any;
      }
      if (cost) {
        maintenanceData.cost = parseFloat(cost);
      }
      if (notes) {
        maintenanceData.notes = notes;
      }
      if (initialData?.completedDate) {
        maintenanceData.completedDate = initialData.completedDate;
      }
      if (initialData?.nextMaintenanceDate) {
        maintenanceData.nextMaintenanceDate = initialData.nextMaintenanceDate;
      }
      if (attachments.length > 0) {
        maintenanceData.attachments = attachments;
      }

      await onSubmit(maintenanceData);
      
      // Generar notificación de mantenimiento próximo
      const maintenanceWithId = {
        ...maintenanceData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Maintenance;
      
      await triggerMaintenanceNotifications(maintenanceWithId);
      
      onClose();
    } catch (error) {
      console.error('Error submitting maintenance:', error);
      alert('Error al guardar el mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {initialData ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar formulario"
            title="Cerrar"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Equipo y Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Equipo <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Seleccionar equipo"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Seleccionar equipo...</option>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} - {eq.company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Mantenimiento <span className="text-red-500">*</span>
              </label>
              <select
                aria-label="Seleccionar tipo de mantenimiento"
                value={type}
                onChange={(e) => setType(e.target.value as MaintenanceType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value={MaintenanceType.PREVENTIVO}>Preventivo</option>
                <option value={MaintenanceType.CORRECTIVO}>Correctivo</option>
                <option value={MaintenanceType.ACTUALIZACION}>Actualización</option>
                <option value={MaintenanceType.INSPECCION}>Inspección</option>
              </select>
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ej: Limpieza y revisión general"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Describe el mantenimiento a realizar..."
            />
          </div>

          {/* Fecha, Técnico y Frecuencia */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha Programada <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Asignar a
              </label>
              <select
                aria-label="Asignar a usuario"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Sin asignar</option>
                {usersList.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Frecuencia
              </label>
              <select
                aria-label="Seleccionar frecuencia"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Una vez</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="semiannual">Semestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
          </div>

          {/* Checklist de Tareas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Checklist de Tareas <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddTask}
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700"
              >
                <Plus size={16} />
                Agregar tarea
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={task.id} className="flex gap-2">
                  <input
                    type="text"
                    value={task.description}
                    onChange={(e) => handleTaskChange(task.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={`Tarea ${index + 1}`}
                    required
                  />
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(task.id)}
                      aria-label="Eliminar tarea"
                      title="Eliminar"
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Costo y Notas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Costo Estimado (MXN)
              </label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas Adicionales
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Notas u observaciones..."
              />
            </div>
          </div>

          {/* Adjuntos */}
          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adjuntos (Fotos, reportes, certificados, etc.)
            </h3>
            <FileUpload
              entityId={initialData?.id || 'new'}
              entityType="maintenances"
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              userId={userData?.id || ''}
              userName={userData?.name || ''}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Mantenimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceForm;
