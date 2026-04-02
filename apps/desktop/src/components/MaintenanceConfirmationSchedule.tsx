import React, { useEffect, useState } from 'react';
import { getMaintenancesByDateRangeForUser, Maintenance, getPendingTimeConfirmationMaintenancesForUser, confirmMaintenanceTime } from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';

interface MaintenanceConfirmationScheduleProps {
  onClose?: () => void;
}

const toJSDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date;
  }
  if (typeof value?.seconds === 'number') {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const to12hParts = (time24?: string) => {
  if (!time24 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time24)) {
    return { hour: '09', minute: '00', period: 'AM' as 'AM' | 'PM' };
  }

  const [hourStr, minute] = time24.split(':');
  const hour24 = Number(hourStr);
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return {
    hour: String(hour12).padStart(2, '0'),
    minute,
    period,
  };
};

const to24h = (hour12: string, minute: string, period: 'AM' | 'PM') => {
  const hourNumber = Number(hour12);
  let hour24 = hourNumber % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${minute}`;
};

const formatTime12h = (time24?: string) => {
  if (!time24) return 'Pendiente';
  const parts = to12hParts(time24);
  return `${parts.hour}:${parts.minute} ${parts.period}`;
};

const getTimeSortValue = (time24?: string) => {
  if (!time24 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time24)) return 9999;
  const [h, m] = time24.split(':').map(Number);
  return h * 60 + m;
};

const MaintenanceConfirmationSchedule: React.FC<MaintenanceConfirmationScheduleProps> = () => {
  const { userData, isAdmin } = useAuth();
  const [confirmations, setConfirmations] = useState<Maintenance[]>([]);
  const [pendingConfirmations, setPendingConfirmations] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedHour12, setSelectedHour12] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    loadConfirmations();
  }, [selectedDate, viewMode, userData?.id]);

  const loadConfirmations = async () => {
    try {
      setLoading(true);
      const startDate = getStartDate(selectedDate, viewMode);
      const endDate = getEndDate(selectedDate, viewMode);
      const data = await getMaintenancesByDateRangeForUser(startDate, endDate, userData?.id, isAdmin);
      setConfirmations(data);

      // Cargar pendientes de confirmar para el usuario actual
      const pending = await getPendingTimeConfirmationMaintenancesForUser(userData?.id, isAdmin);
      setPendingConfirmations(pending);
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
      const date = toJSDate(m.scheduledDate);
      if (!date) return;
      const key = date.toLocaleDateString('es-MX');
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(m);
    });
    return grouped;
  };

  const getTimeConflicts = (maintenances: Maintenance[]) => {
    const grouped = new Map<string, { dateLabel: string; time: string; items: Maintenance[] }>();

    maintenances.forEach((m) => {
      if (!m.scheduledTime) return;
      const date = toJSDate(m.scheduledDate);
      if (!date) return;

      const dateKey = date.toISOString().split('T')[0];
      const dateLabel = date.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
      const key = `${dateKey}|${m.scheduledTime}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          dateLabel,
          time: m.scheduledTime,
          items: [],
        });
      }

      grouped.get(key)!.items.push(m);
    });

    return Array.from(grouped.values())
      .filter((group) => group.items.length > 1)
      .sort((a, b) => {
        if (a.dateLabel === b.dateLabel) {
          return getTimeSortValue(a.time) - getTimeSortValue(b.time);
        }
        return a.dateLabel.localeCompare(b.dateLabel);
      })
      .map((group) => ({
        ...group,
        count: group.items.length,
      }));
  };

  const formatDate = (date: any) => {
    const d = toJSDate(date);
    if (!d) return 'Fecha no disponible';
    return d.toLocaleDateString('es-MX', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleConfirmTime = async () => {
    if (!selectedMaintenance || !userData?.id) return;

    try {
      setConfirmingId(selectedMaintenance.id);

      const timeString = to24h(selectedHour12, selectedMinute, selectedPeriod);

      await confirmMaintenanceTime(
        selectedMaintenance.id,
        timeString,
        userData.id,
        userData.name || 'Usuario'
      );

      alert('✅ Hora confirmada correctamente');
      setShowTimeModal(false);
      setSelectedMaintenance(null);
      setSelectedHour12('09');
      setSelectedMinute('00');
      setSelectedPeriod('AM');
      await loadConfirmations();
    } catch (error) {
      console.error('Error confirming time:', error);
      alert('❌ Error al confirmar la hora');
    } finally {
      setConfirmingId(null);
    }
  };

  const groupedByDate = groupByDate(confirmations);
  const conflicts = getTimeConflicts(confirmations);
  const sortedConfirmations = [...confirmations].sort((a, b) => {
    const aDate = toJSDate(a.scheduledDate)?.getTime() || 0;
    const bDate = toJSDate(b.scheduledDate)?.getTime() || 0;
    if (aDate !== bDate) return aDate - bDate;
    return getTimeSortValue(a.scheduledTime) - getTimeSortValue(b.scheduledTime);
  });

  return (
    <div className="space-y-6">
      {/* Modal de confirmación de hora */}
      {showTimeModal && selectedMaintenance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Confirmar Hora de Mantenimiento
            </h3>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">{selectedMaintenance.equipmentName}</p>
              <p className="text-xs text-blue-700 mt-1">{selectedMaintenance.title}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora disponible
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  aria-label="Hora en formato 12 horas"
                  title="Hora"
                  value={selectedHour12}
                  onChange={(e) => setSelectedHour12(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Minutos"
                  title="Minutos"
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
                >
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Periodo AM o PM"
                  title="Periodo"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as 'AM' | 'PM')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">Formato de 12 horas (AM/PM)</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTimeModal(false);
                  setSelectedMaintenance(null);
                  setSelectedHour12('09');
                  setSelectedMinute('00');
                  setSelectedPeriod('AM');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTime}
                disabled={confirmingId === selectedMaintenance.id}
                className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {confirmingId === selectedMaintenance.id ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Confirmación de Mantenimientos</h2>
          <p className="text-sm text-gray-600 mt-1">
            {pendingConfirmations.length > 0 && `${pendingConfirmations.length} pendiente(s) de confirmar • `}
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

      {/* SECCIÓN DE PENDIENTES DE CONFIRMAR */}
      {pendingConfirmations.length > 0 && (
        <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <h3 className="text-lg font-bold text-amber-900 mb-4">
            ⏳ Pendientes de Confirmar ({pendingConfirmations.length})
          </h3>
          <div className="space-y-3">
            {pendingConfirmations.map((m) => {
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-4 p-4 bg-white border border-amber-200 rounded-lg hover:border-amber-400 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{m.equipmentName}</p>
                    <p className="text-sm text-gray-600">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Programado: {formatDate(m.scheduledDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (isAdmin) return;
                      setSelectedMaintenance(m);
                      const timeParts = to12hParts(m.scheduledTime);
                      setSelectedHour12(timeParts.hour);
                      setSelectedMinute(timeParts.minute);
                      setSelectedPeriod(timeParts.period);
                      setShowTimeModal(true);
                    }}
                    disabled={isAdmin}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isAdmin
                        ? 'text-amber-700 bg-amber-100 cursor-not-allowed'
                        : 'text-white bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {isAdmin ? 'Pendiente de usuario' : 'Confirmar Hora'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN DE CONFIRMADAS (existente) */}

      {/* Alertas de conflictos */}
      {conflicts.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Conflictos de Horario</h3>
          <p className="text-sm text-red-800 mb-3">
            Hay mantenimientos confirmados en la misma fecha y hora. Te recomendamos ajustar disponibilidad.
          </p>
          {conflicts.map((conflict) => (
            <div key={`${conflict.dateLabel}-${conflict.time}`} className="text-sm text-red-900 mb-2">
              <span className="font-semibold">{conflict.dateLabel} • {formatTime12h(conflict.time)}</span>
              <span className="ml-2">({conflict.count} equipos): </span>
              {conflict.items.map((item) => item.equipmentName).join(', ')}
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
      ) : isAdmin ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900">🗓️ Agenda Confirmada</h3>
            <p className="text-sm text-blue-800 mt-1">
              Vista operativa para liberar equipos por hora confirmada.
            </p>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Equipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Técnico</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Empresa</th>
                </tr>
              </thead>
              <tbody>
                {sortedConfirmations.map((m, index) => (
                  <tr key={m.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{formatDate(m.scheduledDate)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatTime12h(m.scheduledTime)}</td>
                    <td className="px-4 py-3 text-gray-900">{m.equipmentName}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{m.timeConfirmedByName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{m.assignedToName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{m.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                              {formatTime12h(m.scheduledTime)}
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
    </div>
  );
};

export default MaintenanceConfirmationSchedule;
