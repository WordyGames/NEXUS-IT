import React, { useEffect, useState } from 'react';
import { getMaintenancesByDateRange, Maintenance } from '@nexus-it/shared';

interface MaintenanceConfirmationScheduleProps {
  onClose?: () => void;
}

const MaintenanceConfirmationSchedule: React.FC<MaintenanceConfirmationScheduleProps> = () => {
  const [confirmations, setConfirmations] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  useEffect(() => {
    loadConfirmations();
  }, [selectedDate, viewMode]);

  const loadConfirmations = async () => {
    try {
      setLoading(true);
      const startDate = getStartDate(selectedDate, viewMode);
      const endDate = getEndDate(selectedDate, viewMode);
      const data = await getMaintenancesByDateRange(startDate, endDate);
      setConfirmations(data);
    } catch (error) {
      console.error('Error loading confirmations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (date: Date, mode: 'day' | 'week'): Date => {
    const d = new Date(date);
    if (mode === 'day') {
      d.setHours(0, 0, 0, 0);
    } else {
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
    }
    return d;
  };

  const getEndDate = (date: Date, mode: 'day' | 'week'): Date => {
    const d = new Date(date);
    if (mode === 'day') {
      d.setHours(23, 59, 59, 999);
    } else {
      d.setDate(d.getDate() - d.getDay() + 6);
      d.setHours(23, 59, 59, 999);
    }
    return d;
  };

  const groupByDate = (maintenances: Maintenance[]) => {
    const grouped: Record<string, Maintenance[]> = {};
    maintenances.forEach((m) => {
      const date = m.scheduledDate instanceof Date 
        ? m.scheduledDate 
        : new Date(m.scheduledDate);
      const key = date.toLocaleDateString('es-MX');
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(m);
    });
    return grouped;
  };

  const groupByTime = (maintenances: Maintenance[]) => {
    const grouped: Record<string, Maintenance[]> = {};
    maintenances.forEach((m) => {
      const time = m.scheduledTime || 'Sin confirmar';
      if (!grouped[time]) {
        grouped[time] = [];
      }
      grouped[time].push(m);
    });
    return grouped;
  };

  const getTimeConflicts = () => {
    const timeGroups = groupByTime(confirmations);
    return Object.entries(timeGroups)
      .filter(([time, items]) => items.length > 1 && time !== 'Sin confirmar')
      .map(([time, items]) => ({ time, count: items.length }));
  };

  const formatDate = (date: Date | any) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('es-MX', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const groupedByDate = groupByDate(confirmations);
  const conflicts = getTimeConflicts();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendario de Confirmaciones</h2>
          <p className="text-sm text-gray-600 mt-1">
            {confirmations.filter(m => m.timeConfirmationStatus === 'confirmed').length} confirmadas
          </p>
        </div>

        {/* Controles */}
        <div className="flex gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded lg font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded lg font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Semana
            </button>
          </div>

          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            aria-label="Seleccionar fecha"
            title="Seleccionar fecha"
          />
        </div>
      </div>

      {/* Alertas de conflictos */}
      {conflicts.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Conflictos de Horario</h3>
          {conflicts.map((conflict) => (
            <div key={conflict.time} className="text-sm text-yellow-800">
              {conflict.time}: {conflict.count} mantenimientos programados a la misma hora
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
      ) : confirmations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hay mantenimientos confirmados en este período</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, maintenances]) => (
            <div key={date}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b-2 border-blue-100">
                📅 {date}
              </h3>

              <div className="space-y-2">
                {maintenances
                  .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-transparent border border-blue-200 rounded-lg hover:border-blue-400 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                          <span className="text-lg font-bold text-blue-600">
                            {m.scheduledTime ? m.scheduledTime.split(':')[0] : '?'}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-lg font-semibold text-gray-900 truncate">
                            {m.equipmentName}
                          </p>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-200 text-blue-800 rounded">
                            {m.type}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{m.title}</p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Hora:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {m.scheduledTime || 'Pendiente'}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-500">Confirmado por:</span>
                            <span className="ml-2 font-semibold text-green-700">
                              {m.timeConfirmedByName || '—'}
                            </span>
                          </div>

                          <div>
                            <span className="text-gray-500">Técnico:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {m.assignedToName || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ✓ Confirmada
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estadísticas */}
      {confirmations.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Confirmadas</p>
              <p className="text-3xl font-bold text-green-600">
                {confirmations.filter(m => m.timeConfirmationStatus === 'confirmed').length}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Equipos Involucrados</p>
              <p className="text-3xl font-bold text-blue-600">
                {new Set(confirmations.map(m => m.equipmentId)).size}
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Posibles Conflictos</p>
              <p className="text-3xl font-bold text-orange-600">
                {conflicts.reduce((sum, c) => sum + c.count - 1, 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceConfirmationSchedule;
