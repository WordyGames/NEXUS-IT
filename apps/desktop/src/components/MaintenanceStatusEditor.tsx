import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import {
  Maintenance,
  MaintenanceStatus,
  updateMaintenance,
} from '@nexus-it/shared';

interface MaintenanceStatusEditorProps {
  maintenance: Maintenance;
  onClose: () => void;
  onUpdate: () => Promise<void>;
}

const MaintenanceStatusEditor: React.FC<MaintenanceStatusEditorProps> = ({
  maintenance,
  onClose,
  onUpdate,
}) => {
  const [status, setStatus] = useState<MaintenanceStatus>(maintenance.status);
  const [notes, setNotes] = useState(maintenance.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await updateMaintenance(maintenance.id, {
        ...maintenance,
        status,
        notes,
      } as any);
      await onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Actualizar Estado de Mantenimiento
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar editor"
            title="Cerrar"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Información del mantenimiento */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              {maintenance.equipmentName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {maintenance.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Tipo: <span className="font-medium capitalize">{maintenance.type}</span>
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado
            </label>
            <select              aria-label="Seleccionar nuevo estado"              value={status}
              onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value={MaintenanceStatus.PROGRAMADO}>
                📅 Programado
              </option>
              <option value={MaintenanceStatus.EN_PROGRESO}>
                ⏳ En Progreso
              </option>
              <option value={MaintenanceStatus.COMPLETADO}>
                ✅ Completado
              </option>
              <option value={MaintenanceStatus.CANCELADO}>
                ❌ Cancelado
              </option>
              <option value={MaintenanceStatus.ATRASADO}>
                ⚠️ Atrasado
              </option>
            </select>
          </div>

          {/* Notas/Comentarios */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Comentarios o Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade comentarios sobre el estado de este mantenimiento..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-none h-32"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Usa esto para documentar el progreso, problemas encontrados, o cualquier observación importante.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceStatusEditor;
