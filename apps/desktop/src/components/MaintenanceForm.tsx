import React, { useEffect, useMemo, useState } from 'react';
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
  deleteFile,
  resolveAttachmentStoragePath
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import FileUpload from './FileUpload';

interface MaintenanceFormProps {
  onClose: () => void;
  onSubmit: (maintenance: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | void>;
  initialData?: Maintenance;
}

const generateEntityId = (existingId?: string): string => {
  if (existingId) return existingId;
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `maintenance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getAttachmentKey = (attachment: Attachment): string => {
  return attachment.storagePath || attachment.url || attachment.id;
};

const generateTaskId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const toDate = (date: any): Date => {
  if (!date) return new Date();
  if (date.toDate) return date.toDate();
  if (date instanceof Date) return date;
  return new Date(date);
};

const MaintenanceForm = ({ onClose, onSubmit, initialData }: MaintenanceFormProps) => {
  const { userData } = useAuth();
  const { showToast } = useUiFeedback();
  const [loading, setLoading] = useState(false);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [entityId] = useState<string>(() => generateEntityId(initialData?.id));
  const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);
  const [pendingDeleteAttachments, setPendingDeleteAttachments] = useState<Attachment[]>([]);
  const initialAttachmentKeys = useMemo(
    () => new Set((initialData?.attachments || []).map(getAttachmentKey)),
    [initialData?.attachments]
  );

  const [equipmentId, setEquipmentId] = useState(initialData?.equipmentId || '');
  const [type, setType] = useState<MaintenanceType>(initialData?.type || MaintenanceType.PREVENTIVO);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [scheduledDate, setScheduledDate] = useState(
    initialData?.scheduledDate ? toDate(initialData.scheduledDate).toISOString().split('T')[0] : ''
  );
  const [assignedTo, setAssignedTo] = useState(initialData?.assignedTo || '');
  const [frequency, setFrequency] = useState<Maintenance['frequency'] | ''>(initialData?.frequency || '');
  const [cost, setCost] = useState(initialData?.cost?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tasks, setTasks] = useState<MaintenanceTask[]>(() => (
    initialData?.tasks || [{ id: generateTaskId(), description: '', completed: false }]
  ));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [equipment, users] = await Promise.all([
        getEquipment({ status: 'active' }),
        getUsers()
      ]);
      setEquipmentList(equipment);
      setUsersList(users.filter((u) => u.isActive));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getAssignedEquipmentLabel = (equipment: Equipment): string => {
    if (!equipment.assignedTo) {
      return 'Sin asignar';
    }

    const assignedUser = usersList.find((user) => user.id === equipment.assignedTo);
    return assignedUser ? assignedUser.name : 'Usuario no disponible';
  };

  const isInitialAttachment = (attachment: Attachment): boolean => {
    return initialAttachmentKeys.has(getAttachmentKey(attachment));
  };

  const cleanupAttachmentsFromStorage = async (attachmentsToDelete: Attachment[]) => {
    if (attachmentsToDelete.length === 0) return;

    const deletions = attachmentsToDelete.map(async (attachment) => {
      const storagePath = resolveAttachmentStoragePath(attachment);
      if (!storagePath) return;
      await deleteFile(storagePath);
    });

    const results = await Promise.allSettled(deletions);
    const failedDeletes = results.filter((result) => result.status === 'rejected');

    if (failedDeletes.length > 0) {
      console.error(`Error deleting ${failedDeletes.length} maintenance attachment(s) from storage`);
    }
  };

  const handleAttachmentsChange = (nextAttachments: Attachment[]) => {
    const removedAttachments = attachments.filter((current) => (
      !nextAttachments.some((next) => getAttachmentKey(next) === getAttachmentKey(current))
    ));

    setAttachments(nextAttachments);
    if (removedAttachments.length === 0) return;

    const persistedAttachments = removedAttachments.filter(isInitialAttachment);
    const transientAttachments = removedAttachments.filter((attachment) => !isInitialAttachment(attachment));

    if (persistedAttachments.length > 0) {
      setPendingDeleteAttachments((prev) => {
        const byKey = new Map<string, Attachment>(prev.map((attachment) => [getAttachmentKey(attachment), attachment]));
        nextAttachments.forEach((attachment) => byKey.delete(getAttachmentKey(attachment)));
        persistedAttachments.forEach((attachment) => {
          byKey.set(getAttachmentKey(attachment), attachment);
        });
        return Array.from(byKey.values());
      });
    }

    if (transientAttachments.length > 0) {
      void cleanupAttachmentsFromStorage(transientAttachments);
    }
  };

  const handleCancel = async () => {
    const transientAttachments = attachments.filter((attachment) => !isInitialAttachment(attachment));
    await cleanupAttachmentsFromStorage(transientAttachments);
    onClose();
  };

  const handleAddTask = () => {
    setTasks([...tasks, { id: generateTaskId(), description: '', completed: false }]);
  };

  const handleRemoveTask = (id: string) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((t) => t.id !== id));
    }
  };

  const handleTaskChange = (id: string, taskDescription: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, description: taskDescription } : t)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!equipmentId || !title.trim() || !scheduledDate) {
      showToast({
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Completa equipo, titulo y fecha programada'
      });
      return;
    }

    if (tasks.some((t) => !t.description.trim())) {
      showToast({
        type: 'warning',
        title: 'Checklist incompleto',
        message: 'Completa la descripcion de todas las tareas'
      });
      return;
    }

    const selectedEquipment = equipmentList.find((eq) => eq.id === equipmentId);
    const selectedUser = usersList.find((u) => u.id === assignedTo);

    if (!selectedEquipment) {
      showToast({
        type: 'error',
        title: 'Equipo no encontrado',
        message: 'Selecciona un equipo valido antes de guardar'
      });
      return;
    }

    setLoading(true);
    try {
      const maintenanceData: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
        equipmentId,
        equipmentName: selectedEquipment.name,
        company: selectedEquipment.company,
        type,
        status: initialData?.status || MaintenanceStatus.PROGRAMADO,
        title: title.trim(),
        description: description.trim(),
        scheduledDate: new Date(scheduledDate),
        tasks: tasks.filter((t) => t.description.trim()),
        attachments,
        createdBy: userData?.id || '',
        createdByName: userData?.name || ''
      };

      if (assignedTo) {
        maintenanceData.assignedTo = assignedTo;
        if (selectedUser) {
          maintenanceData.assignedToName = selectedUser.name;
        }
      }
      if (frequency) {
        maintenanceData.frequency = frequency;
      }
      if (cost) {
        maintenanceData.cost = parseFloat(cost);
      }
      if (notes.trim()) {
        maintenanceData.notes = notes.trim();
      }
      if (initialData?.completedDate) {
        maintenanceData.completedDate = initialData.completedDate;
      }
      if (initialData?.nextMaintenanceDate) {
        maintenanceData.nextMaintenanceDate = initialData.nextMaintenanceDate;
      }

      if (!initialData) {
        maintenanceData.id = entityId;
      }

      const persistedId = (await onSubmit(maintenanceData)) || initialData?.id || entityId;

      await cleanupAttachmentsFromStorage(pendingDeleteAttachments);
      setPendingDeleteAttachments([]);

      const maintenanceForNotification: Maintenance = {
        ...maintenanceData,
        id: persistedId,
        createdAt: initialData?.createdAt || new Date(),
        updatedAt: new Date()
      };

      await triggerMaintenanceNotifications(maintenanceForNotification);
      onClose();
    } catch (error) {
      console.error('Error submitting maintenance:', error);
      showToast({
        type: 'error',
        title: 'Error al guardar mantenimiento',
        message: 'No se pudo guardar el mantenimiento'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {initialData ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
          </h2>
          <button
            onClick={() => { void handleCancel(); }}
            aria-label="Cerrar formulario"
            title="Cerrar"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    {eq.name} - {eq.company} | Asignado a: {getAssignedEquipmentLabel(eq)}
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
                <option value={MaintenanceType.ACTUALIZACION}>Actualizacion</option>
                <option value={MaintenanceType.INSPECCION}>Inspeccion</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Titulo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Ej: Limpieza y revision general"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripcion
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Describe el mantenimiento a realizar..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha Programada <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                aria-label="Fecha programada"
                title="Fecha programada"
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
                onChange={(e) => setFrequency(e.target.value as Maintenance['frequency'] | '')}
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

          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adjuntos (Fotos, reportes, certificados, etc.)
            </h3>
            <FileUpload
              entityId={entityId}
              entityType="maintenances"
              attachments={attachments}
              onAttachmentsChange={handleAttachmentsChange}
              userId={userData?.id || ''}
              userName={userData?.name || ''}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { void handleCancel(); }}
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
