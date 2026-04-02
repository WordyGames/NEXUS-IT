import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { useNavigate } from 'react-router-dom';
import { 
  Company, 
  UserPermission,
  getEquipmentStats, 
  getTicketStats, 
  getEquipment,
  getTickets,
  getUpcomingMaintenances,
  getOverdueMaintenances,
  getPendingTimeConfirmationMaintenancesForUser,
  updateMaintenanceStatus,
  completeMaintenance,
  rescheduleMaintenance,
  MaintenanceStatus,
  Maintenance,
  Equipment,
  Ticket
} from '@nexus-it/shared';
import CompanyCard from '../components/CompanyCard';
import { AlertTriangle, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Stats {
  equipment: any;
  tickets: any;
}

interface WarrantyAlert {
  expired: number;
  expiringSoon: number;
}

const Dashboard = () => {
  const { userData, hasPermission } = useAuth();
  const { showToast, confirm } = useUiFeedback();
  const navigate = useNavigate();
  const canViewAdminDashboard = hasPermission(UserPermission.DASHBOARD_ADMIN);
  const [stats, setStats] = useState<Stats | null>(null);
  const [userEquipment, setUserEquipment] = useState<any[]>([]);
  const [userTicketsCount, setUserTicketsCount] = useState(0);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [upcomingMaintenances, setUpcomingMaintenances] = useState<Maintenance[]>([]);
  const [overdueMaintenances, setOverdueMaintenances] = useState<Maintenance[]>([]);
  const [pendingTimeConfirmations, setPendingTimeConfirmations] = useState<Maintenance[]>([]);
  const [warrantyAlerts, setWarrantyAlerts] = useState<WarrantyAlert>({ expired: 0, expiringSoon: 0 });
  const [equipmentByType, setEquipmentByType] = useState<Record<string, number>>({});
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, 'start' | 'complete' | 'reschedule'>>({});
  const [loading, setLoading] = useState(true);

  const companies = [
    { name: Company.ESPECIAS_NATURALES, color: 'especias' },
    { name: Company.GRUPO_AMEX, color: 'grupo-amex' },

    { name: Company.EQUIPOS_OSENAL, color: 'equipos-osenal' }
  ];

  // Helper para convertir fecha de Firebase
  const toDate = (date: any): Date => {
    if (!date) return new Date();
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    if (date instanceof Date) return date;
    return new Date(date); // String o número
  };

  const getTicketSortValue = (ticket: Ticket) => {
    const createdAt: any = ticket.createdAt;
    if (!createdAt) return 0;
    if (createdAt instanceof Date) return createdAt.getTime();
    if (typeof createdAt === 'object' && 'toDate' in createdAt) {
      return createdAt.toDate().getTime();
    }
    if (typeof createdAt === 'object' && 'seconds' in createdAt) {
      return createdAt.seconds * 1000;
    }
    const parsed = new Date(createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const loadUserTickets = async () => {
    if (!userData) return [] as Ticket[];

    const queries: Promise<Ticket[]>[] = [];

    if (userData.id) {
      queries.push(getTickets({ createdBy: userData.id }));
    }

    if (userData.username && userData.username !== userData.id) {
      queries.push(getTickets({ createdBy: userData.username }));
    }

    if (userData.name) {
      queries.push(getTickets({ createdByName: userData.name }));
    }

    const results = await Promise.all(queries);
    const unique = new Map<string, Ticket>();

    results.flat().forEach((ticket) => {
      unique.set(ticket.id, ticket);
    });

    let merged = Array.from(unique.values());

    if (userData.company) {
      merged = merged.filter((ticket) => ticket.company === userData.company);
    }

    merged.sort((a, b) => getTicketSortValue(b) - getTicketSortValue(a));
    return merged;
  };

  const getMaintenanceUrgency = (maintenance: Maintenance) => {
    const maintenanceDate = toDate(maintenance.scheduledDate);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMaintenance = new Date(
      maintenanceDate.getFullYear(),
      maintenanceDate.getMonth(),
      maintenanceDate.getDate()
    );

    const dayDiff = Math.floor((startOfMaintenance.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff < 0 || maintenance.status === 'atrasado') {
      return {
        score: 3,
        label: 'Vencido',
        className: 'bg-red-100 text-red-800 border-red-300'
      };
    }

    if (dayDiff <= 2) {
      return {
        score: 2,
        label: 'Crítico',
        className: 'bg-amber-100 text-amber-800 border-amber-300'
      };
    }

    return {
      score: 1,
      label: 'Próximo',
      className: 'bg-green-100 text-green-800 border-green-300'
    };
  };

  const prioritizedMaintenances = useMemo(() => {
    const uniqueMaintenances = new Map<string, Maintenance>();

    [...overdueMaintenances, ...upcomingMaintenances].forEach((maintenance) => {
      uniqueMaintenances.set(maintenance.id, maintenance);
    });

    return Array.from(uniqueMaintenances.values())
      .map((maintenance) => ({
        maintenance,
        urgency: getMaintenanceUrgency(maintenance)
      }))
      .sort((a, b) => {
        if (b.urgency.score !== a.urgency.score) return b.urgency.score - a.urgency.score;
        return toDate(a.maintenance.scheduledDate).getTime() - toDate(b.maintenance.scheduledDate).getTime();
      })
      .slice(0, 8);
  }, [overdueMaintenances, upcomingMaintenances]);

  const refreshAdminOperationalData = useCallback(async () => {
    if (!canViewAdminDashboard) return;

    const [upcoming, overdue, pendingTime] = await Promise.all([
      getUpcomingMaintenances(),
      getOverdueMaintenances(),
      getPendingTimeConfirmationMaintenancesForUser(userData?.id, true)
    ]);

    setUpcomingMaintenances(upcoming);
    setOverdueMaintenances(overdue);
    setPendingTimeConfirmations(pendingTime);
  }, [canViewAdminDashboard, userData?.id]);

  const getSuggestedRescheduleDate = (maintenance: Maintenance): Date => {
    const urgency = getMaintenanceUrgency(maintenance);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scheduledDate = toDate(maintenance.scheduledDate);
    scheduledDate.setHours(0, 0, 0, 0);

    const baseDate = scheduledDate < today ? today : scheduledDate;
    const daysToAdd = urgency.score === 3 ? 1 : urgency.score === 2 ? 3 : 7;

    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate;
  };

  const handleQuickMaintenanceAction = async (
    maintenance: Maintenance,
    action: 'start' | 'complete' | 'reschedule'
  ) => {
    if (!userData?.id) {
      showToast({
        type: 'error',
        title: 'Sesión no válida',
        message: 'No se pudo identificar al usuario actual.'
      });
      return;
    }

    const actionConfig = {
      start: {
        title: 'Marcar en progreso',
        message: '¿Quieres marcar este mantenimiento como en progreso?',
        successTitle: 'Mantenimiento actualizado',
        successMessage: 'Se marcó como en progreso.'
      },
      complete: {
        title: 'Completar mantenimiento',
        message: '¿Confirmas que este mantenimiento ya está completado?',
        successTitle: 'Mantenimiento completado',
        successMessage: 'Se completó y se evaluó la recurrencia automática.'
      },
      reschedule: {
        title: 'Reprogramar mantenimiento',
        message: `Se moverá a ${getSuggestedRescheduleDate(maintenance).toLocaleDateString('es-MX')}. ¿Deseas continuar?`,
        successTitle: 'Mantenimiento reprogramado',
        successMessage: 'Se movió la fecha y se reinició la confirmación de hora.'
      }
    };

    const accepted = await confirm({
      title: actionConfig[action].title,
      message: actionConfig[action].message,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      intent: 'primary'
    });

    if (!accepted) return;

    setActionLoadingById((prev) => ({ ...prev, [maintenance.id]: action }));

    try {
      if (action === 'start') {
        await updateMaintenanceStatus(maintenance.id, MaintenanceStatus.EN_PROGRESO);
      }

      if (action === 'complete') {
        await completeMaintenance(
          maintenance.id,
          userData.id,
          userData.name || userData.username || 'Usuario'
        );
      }

      if (action === 'reschedule') {
        await rescheduleMaintenance(maintenance.id, getSuggestedRescheduleDate(maintenance));
      }

      await refreshAdminOperationalData();

      showToast({
        type: 'success',
        title: actionConfig[action].successTitle,
        message: actionConfig[action].successMessage
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'No se pudo ejecutar la acción',
        message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
      });
    } finally {
      setActionLoadingById((prev) => {
        const next = { ...prev };
        delete next[maintenance.id];
        return next;
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [equipmentStats, ticketStats] = await Promise.all([
          getEquipmentStats(),
          getTicketStats()
        ]);

        setStats({
          equipment: equipmentStats,
          tickets: ticketStats
        });

        // Cargar equipos asignados al usuario actual
        if (!canViewAdminDashboard && userData?.id) {
          const allEquipment = await getEquipment({ assignedTo: userData.id });
          setUserEquipment(allEquipment);
          
          // Cargar tickets del usuario
          const userTickets = await loadUserTickets();
          setUserTicketsCount(userTickets.length);
          
          // Obtener los 5 tickets más recientes
          const sortedTickets = userTickets.slice(0, 5);
          setRecentTickets(sortedTickets);
        }

        // Cargar alertas de mantenimiento y garantías para admin
        if (canViewAdminDashboard) {
          await refreshAdminOperationalData();

          // Calcular alertas de garantías
          const allEquipment = await getEquipment({});
          const today = new Date();
          const thirtyDaysLater = new Date();
          thirtyDaysLater.setDate(today.getDate() + 30);

          let expired = 0;
          let expiringSoon = 0;
          const typeCount: Record<string, number> = {};

          allEquipment.forEach((eq: Equipment) => {
            // Contar por tipo
            typeCount[eq.type] = (typeCount[eq.type] || 0) + 1;

            // Alertas de garantía
            if (eq.warrantyExpiration) {
              const warrantyDate = toDate(eq.warrantyExpiration);
              if (warrantyDate < today) {
                expired++;
              } else if (warrantyDate <= thirtyDaysLater) {
                expiringSoon++;
              }
            }
          });

          setWarrantyAlerts({ expired, expiringSoon });
          setEquipmentByType(typeCount);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canViewAdminDashboard, userData, refreshAdminOperationalData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  // Dashboard para usuarios normales (solo Tickets)
  if (!canViewAdminDashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Mi Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {userData?.company} - Mis equipos asignados y tickets
            </p>
          </div>
          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm font-medium">
            v2.5 ✨
          </div>
        </div>

        {/* Equipos Asignados */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Mis Equipos
          </h2>
          {userEquipment.length === 0 ? (
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6 text-blue-800 dark:text-blue-100">
              No tienes equipos asignados aún
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userEquipment.map((eq) => (
                <div key={eq.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white">{eq.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      eq.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {eq.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tipo: <span className="capitalize font-medium">{eq.type}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ubicación: {eq.location}
                  </p>
                  {eq.specs?.cpu && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      CPU: {eq.specs.cpu}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estadísticas Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Mis Equipos</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">
                  {userEquipment.length}
                </p>
              </div>
              <div className="text-4xl">💻</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Mis Tickets</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">
                  {userTicketsCount}
                </p>
              </div>
              <div className="text-4xl">🎫</div>
            </div>
          </div>
        </div>

        {/* Tickets Recientes */}
        {recentTickets.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              Tickets Recientes
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800 dark:text-white">
                            #{ticket.ticketNumber}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                            ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                            ticket.status === 'resolved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                          }`}>
                            {ticket.status === 'open' ? 'Abierto' : 
                             ticket.status === 'in_progress' ? 'En Progreso' :
                             ticket.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' :
                            ticket.priority === 'medium' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                          }`}>
                            {ticket.priority === 'urgent' ? 'Urgente' : 
                             ticket.priority === 'high' ? 'Alta' :
                             ticket.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <p className="text-gray-800 dark:text-white font-medium">{ticket.subject}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {ticket.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {ticket.createdAt && new Date(ticket.createdAt.seconds * 1000).toLocaleDateString('es-ES', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard para Administradores
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Vista general del sistema
        </p>
      </div>

      {/* Centro de Operaciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">⚡ Centro de Operaciones</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Resumen diario para ejecutar acciones rápidas sin cambiar de módulo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/maintenance-confirmation')}
            className="text-left p-4 rounded-lg border border-amber-200 bg-amber-50 hover:shadow transition-shadow"
          >
            <p className="text-xs text-amber-700 font-semibold uppercase">Confirmaciones pendientes</p>
            <p className="text-3xl font-bold text-amber-900 mt-1">{pendingTimeConfirmations.length}</p>
            <p className="text-xs text-amber-700 mt-2">Ver y gestionar →</p>
          </button>

          <button
            onClick={() => navigate('/maintenances')}
            className="text-left p-4 rounded-lg border border-red-200 bg-red-50 hover:shadow transition-shadow"
          >
            <p className="text-xs text-red-700 font-semibold uppercase">Mantenimientos vencidos</p>
            <p className="text-3xl font-bold text-red-900 mt-1">{overdueMaintenances.length}</p>
            <p className="text-xs text-red-700 mt-2">Prioridad alta →</p>
          </button>

          <button
            onClick={() => navigate('/maintenances')}
            className="text-left p-4 rounded-lg border border-blue-200 bg-blue-50 hover:shadow transition-shadow"
          >
            <p className="text-xs text-blue-700 font-semibold uppercase">Próximos 7 días</p>
            <p className="text-3xl font-bold text-blue-900 mt-1">{upcomingMaintenances.length}</p>
            <p className="text-xs text-blue-700 mt-2">Revisar calendario →</p>
          </button>

          <button
            onClick={() => navigate('/tickets')}
            className="text-left p-4 rounded-lg border border-green-200 bg-green-50 hover:shadow transition-shadow"
          >
            <p className="text-xs text-green-700 font-semibold uppercase">Tickets abiertos</p>
            <p className="text-3xl font-bold text-green-900 mt-1">{stats?.tickets.byStatus?.open || 0}</p>
            <p className="text-xs text-green-700 mt-2">Atender incidencias →</p>
          </button>
        </div>

        {prioritizedMaintenances.length > 0 && (
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">🚦 Semáforo de prioridad</h3>
            <div className="space-y-2">
              {prioritizedMaintenances.map(({ maintenance, urgency }) => (
                <div
                  key={maintenance.id}
                  className="flex flex-wrap items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <span className={`text-xs px-2 py-1 rounded border font-semibold ${urgency.className}`}>
                    {urgency.label}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{maintenance.equipmentName}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{maintenance.title}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {toDate(maintenance.scheduledDate).toLocaleDateString('es-MX')}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => handleQuickMaintenanceAction(maintenance, 'start')}
                      disabled={Boolean(actionLoadingById[maintenance.id])}
                      className="px-2.5 py-1.5 text-xs rounded bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                    >
                      {actionLoadingById[maintenance.id] === 'start' ? 'Iniciando…' : 'En progreso'}
                    </button>
                    <button
                      onClick={() => handleQuickMaintenanceAction(maintenance, 'complete')}
                      disabled={Boolean(actionLoadingById[maintenance.id])}
                      className="px-2.5 py-1.5 text-xs rounded bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-60"
                    >
                      {actionLoadingById[maintenance.id] === 'complete' ? 'Completando…' : 'Completar'}
                    </button>
                    <button
                      onClick={() => handleQuickMaintenanceAction(maintenance, 'reschedule')}
                      disabled={Boolean(actionLoadingById[maintenance.id])}
                      className="px-2.5 py-1.5 text-xs rounded bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-60"
                    >
                      {actionLoadingById[maintenance.id] === 'reschedule' ? 'Reprogramando…' : 'Reprogramar'}
                    </button>
                    <button
                      onClick={() => navigate('/maintenances')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Ver →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Equipos</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {stats?.equipment.total || 0}
              </p>
            </div>
            <div className="text-4xl">💻</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {stats?.tickets.total || 0}
              </p>
            </div>
            <div className="text-4xl">🎫</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tickets Abiertos</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {stats?.tickets.byStatus?.open || 0}
              </p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tiempo Prom. Resolución</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {Math.round(stats?.tickets.averageResolutionTime || 0)}h
              </p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>
      </div>

      {/* Alertas de Mantenimiento */}
      {(upcomingMaintenances.length > 0 || overdueMaintenances.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Próximos */}
          {upcomingMaintenances.length > 0 && (
            <div 
              onClick={() => navigate('/maintenances')}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-blue-600" size={20} />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Mantenimientos Próximos (7 días)
                </h3>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {upcomingMaintenances.length} mantenimiento{upcomingMaintenances.length !== 1 ? 's' : ''} programado{upcomingMaintenances.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Click para ver detalles →</p>
            </div>
          )}

          {/* Vencidos */}
          {overdueMaintenances.length > 0 && (
            <div 
              onClick={() => navigate('/maintenances')}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-red-600" size={20} />
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Mantenimientos Vencidos
                </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 text-sm">
                {overdueMaintenances.length} mantenimiento{overdueMaintenances.length !== 1 ? 's' : ''} retrasado{overdueMaintenances.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">Click para ver detalles →</p>
            </div>
          )}
        </div>
      )}

      {/* Alertas de Garantías */}
      {(warrantyAlerts.expired > 0 || warrantyAlerts.expiringSoon > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Garantías Vencidas */}
          {warrantyAlerts.expired > 0 && (
            <div 
              onClick={() => navigate('/warranty-report')}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="text-red-600" size={20} />
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Garantías Vencidas
                </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 text-sm">
                {warrantyAlerts.expired} equipo{warrantyAlerts.expired !== 1 ? 's' : ''} con garantía vencida
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">Click para ver reporte de garantías →</p>
            </div>
          )}

          {/* Garantías Por Vencer */}
          {warrantyAlerts.expiringSoon > 0 && (
            <div 
              onClick={() => navigate('/warranty-report')}
              className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-orange-600" size={20} />
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                  Garantías Por Vencer (30 días)
                </h3>
              </div>
              <p className="text-orange-700 dark:text-orange-300 text-sm">
                {warrantyAlerts.expiringSoon} equipo{warrantyAlerts.expiringSoon !== 1 ? 's' : ''} con garantía próxima a vencer
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">Click para ver reporte de garantías →</p>
            </div>
          )}
        </div>
      )}

      {/* Tarjetas por Empresa */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Empresas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {companies.map((company) => (
            <CompanyCard
              key={company.name}
              company={company.name}
              equipmentCount={stats?.equipment.byCompany?.[company.name] || 0}
              color={company.color}
            />
          ))}
        </div>
      </div>

      {/* Gráficas */}
      {canViewAdminDashboard && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Análisis y Tendencias
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfica de Pie - Equipos por Compañía */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Equipos por Compañía
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(stats?.equipment.byCompany || {}).map(([name, value]) => ({
                      name: name.split(' ').slice(0, 2).join(' '), // Acortar nombres largos
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(stats?.equipment.byCompany || {}).map((_, index) => {
                      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica de Barras - Tickets por Estado */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Tickets por Estado
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(stats?.tickets.byStatus || {}).map(([name, value]) => ({
                    estado: name,
                    cantidad: value
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="estado" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica de Barras - Tickets por Prioridad */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Tickets por Prioridad
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(stats?.tickets.byPriority || {}).map(([name, value]) => ({
                    prioridad: name,
                    cantidad: value
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="prioridad" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica de Pie - Estados de Equipos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Estados de Equipos
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(stats?.equipment.byStatus || {}).map(([name, value]) => ({
                      name,
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(stats?.equipment.byStatus || {}).map((status, index) => {
                      const colors = {
                        active: '#10b981',
                        inactive: '#6b7280',
                        maintenance: '#f59e0b',
                        retired: '#ef4444'
                      };
                      return <Cell key={`cell-${index}`} fill={colors[status as keyof typeof colors] || '#3b82f6'} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfica de Barras - Equipos por Tipo */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Equipos por Tipo
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(equipmentByType).map(([name, value]) => ({
                    tipo: name,
                    cantidad: value
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Solo para Admin: Estado de Equipos */}
      {canViewAdminDashboard && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Estado de Equipos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(stats?.equipment.byStatus || {}).map(([status, count]) => (
              <div key={status} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {status}
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {count as number}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
