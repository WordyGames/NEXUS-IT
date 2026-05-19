import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Wrench, Plus, Calendar, AlertTriangle, CheckCircle2, Clock,
  Filter, Download, List, CalendarCheck, ShieldCheck, Search, RefreshCw
} from 'lucide-react';
import {
  Maintenance,
  MaintenanceStatus,
  MaintenanceType,
  UserPermission,
  getMaintenancesForUser,
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
import MaintenanceDetail from '../components/MaintenanceDetail';
import MaintenanceConfirmationSchedule from '../components/MaintenanceConfirmationSchedule';
import { exportMaintenancesToExcel } from '../utils/exportToExcel';
import { sendMaintenanceSavedEmail } from '../utils/maintenanceEmail';
import { toDate } from '../utils/dateUtils';
import { Spinner, Card, Button, EmptyState, maintenanceStatusBadge } from '../components/ui';

const FILTERS_KEY = 'nexus-it:maintenances:filters:v1';

interface PersistedFilters {
  companyFilter?: Company | '';
  statusFilter?: MaintenanceStatus | '';
  typeFilter?: MaintenanceType | '';
  searchTerm?: string;
}

const readFilters = (): PersistedFilters => {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as PersistedFilters;
    return {
      companyFilter: Object.values(Company).includes(p.companyFilter as Company) ? p.companyFilter : '',
      statusFilter:  Object.values(MaintenanceStatus).includes(p.statusFilter as MaintenanceStatus) ? p.statusFilter : '',
      typeFilter:    Object.values(MaintenanceType).includes(p.typeFilter as MaintenanceType) ? p.typeFilter : '',
      searchTerm:    typeof p.searchTerm === 'string' ? p.searchTerm : '',
    };
  } catch { return {}; }
};

const TYPE_ICON: Record<MaintenanceType, React.ReactNode> = {
  [MaintenanceType.PREVENTIVO]:    <ShieldCheck  size={14} className="text-blue-500" />,
  [MaintenanceType.CORRECTIVO]:    <Wrench       size={14} className="text-orange-500" />,
  [MaintenanceType.ACTUALIZACION]: <RefreshCw    size={14} className="text-purple-500" />,
  [MaintenanceType.INSPECCION]:    <Search       size={14} className="text-green-500" />,
};

const selectCls = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';

const Maintenances = () => {
  const location = useLocation();
  const isConfirmationRoute = location.pathname.includes('/maintenance-confirmation') || location.pathname.includes('/portal/');
  const { hasPermission, isAdmin, userData } = useAuth();
  const { showToast, confirm } = useUiFeedback();
  const canManage = hasPermission(UserPermission.MAINTENANCES_MANAGE);

  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [upcoming, setUpcoming] = useState<Maintenance[]>([]);
  const [overdue, setOverdue] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Maintenance | undefined>();
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [justCreated, setJustCreated] = useState<Maintenance | undefined>();
  const [viewMode, setViewMode] = useState<'list' | 'confirmations'>(isConfirmationRoute ? 'confirmations' : 'list');

  const pf = useMemo(readFilters, []);
  const [companyFilter, setCompanyFilter] = useState<Company | ''>(pf.companyFilter || '');
  const [statusFilter,  setStatusFilter]  = useState<MaintenanceStatus | ''>(pf.statusFilter || '');
  const [typeFilter,    setTypeFilter]    = useState<MaintenanceType | ''>(pf.typeFilter || '');
  const [searchTerm,    setSearchTerm]    = useState(pf.searchTerm || '');

  useEffect(() => {
    setViewMode(isConfirmationRoute ? 'confirmations' : 'list');
  }, [location.pathname]);

  useEffect(() => {
    loadMaintenances();
  }, [companyFilter, statusFilter, typeFilter, searchTerm, userData?.id, isAdmin]);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({ companyFilter, statusFilter, typeFilter, searchTerm }));
    } catch { /* silent */ }
  }, [companyFilter, statusFilter, typeFilter, searchTerm]);

  const loadMaintenances = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (companyFilter) filters.company = companyFilter;
      if (statusFilter)  filters.status  = statusFilter;
      if (typeFilter)    filters.type    = typeFilter;
      if (searchTerm)    filters.search  = searchTerm;

      const all = await getMaintenancesForUser(filters, userData?.id, isAdmin);
      const now = new Date();
      const next7 = new Date(); next7.setDate(now.getDate() + 7);

      if (isAdmin) {
        const [up, od] = await Promise.all([getUpcomingMaintenances(), getOverdueMaintenances()]);
        setUpcoming(up); setOverdue(od);
      } else {
        setUpcoming(all.filter((m) => m.status === MaintenanceStatus.PROGRAMADO && toDate(m.scheduledDate) >= now && toDate(m.scheduledDate) <= next7));
        setOverdue(all.filter((m)  => m.status === MaintenanceStatus.PROGRAMADO && toDate(m.scheduledDate) < now));
      }
      setMaintenances(all);
    } catch (error) {
      console.error('Error loading maintenances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const id = await createMaintenance(data as any);
      const email = data.notificationEmail?.trim();
      if (email) {
        await sendMaintenanceSavedEmail({ recipientEmail: email, maintenanceId: id, equipmentName: data.equipmentName, company: data.company, title: data.title, scheduledDate: toDate(data.scheduledDate).toISOString(), assignedToName: data.assignedToName, createdByName: data.createdByName }).catch(console.error);
      }
      await loadMaintenances();
      setShowForm(false);
      const created = await getMaintenanceById(id);
      if (created) { setJustCreated(created); setShowStatusEditor(true); }
      showToast({ type: 'success', title: 'Mantenimiento creado', message: 'Se guardó correctamente' });
      return id;
    } catch (error) {
      showToast({ type: 'error', title: 'Error al crear', message: 'No se pudo guardar el mantenimiento' });
      throw error;
    }
  };

  const handleUpdate = async (data: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!selected) throw new Error('Nada seleccionado');
    try {
      await updateMaintenance(selected.id, data as any);
      await loadMaintenances();
      setShowForm(false); setSelected(undefined);
      showToast({ type: 'success', title: 'Actualizado', message: 'Cambios guardados' });
      return selected.id;
    } catch (error) {
      showToast({ type: 'error', title: 'Error al actualizar', message: 'No se pudieron guardar los cambios' });
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Eliminar mantenimiento', message: '¿Seguro? Esta acción no se puede deshacer.', confirmText: 'Eliminar', cancelText: 'Cancelar', intent: 'danger' })) return;
    try {
      await deleteMaintenance(id); await loadMaintenances();
      showToast({ type: 'success', title: 'Eliminado', message: 'Mantenimiento eliminado' });
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar' });
    }
  };

  if (loading) return <Spinner size="xl" label="Cargando mantenimientos..." className="h-64 justify-center" />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Wrench size={22} className="text-blue-600" />
            Mantenimientos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Programa y gestiona mantenimientos de equipos</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button type="button" onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              <List size={13} /> Lista
            </button>
            <button type="button" onClick={() => setViewMode('confirmations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'confirmations' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              <CalendarCheck size={13} /> Confirmaciones
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => exportMaintenancesToExcel(maintenances, 'mantenimientos')} disabled={maintenances.length === 0} iconLeft={<Download size={14} />}>Exportar</Button>
          {canManage && <Button variant="primary" size="sm" onClick={() => setShowForm(true)} iconLeft={<Plus size={14} />}>Nuevo</Button>}
        </div>
      </div>

      {/* Alertas */}
      {viewMode === 'list' && (upcoming.length > 0 || overdue.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {upcoming.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Calendar size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Próximos (7 días)</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">{upcoming.length} mantenimiento{upcoming.length !== 1 ? 's' : ''} programado{upcoming.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">Vencidos</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{overdue.length} mantenimiento{overdue.length !== 1 ? 's' : ''} retrasado{overdue.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista confirmaciones */}
      {viewMode === 'confirmations' ? (
        <MaintenanceConfirmationSchedule />
      ) : (
        <>
          {/* Filtros */}
          <Card padding="sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Filtros</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select aria-label="Empresa" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value as any)} className={selectCls}>
                <option value="">Todas las empresas</option>
                {Object.values(Company).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select aria-label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className={selectCls}>
                <option value="">Todos los estados</option>
                <option value={MaintenanceStatus.PROGRAMADO}>Programado</option>
                <option value={MaintenanceStatus.EN_PROGRESO}>En Progreso</option>
                <option value={MaintenanceStatus.COMPLETADO}>Completado</option>
                <option value={MaintenanceStatus.CANCELADO}>Cancelado</option>
                <option value={MaintenanceStatus.ATRASADO}>Vencido</option>
              </select>
              <select aria-label="Tipo" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className={selectCls}>
                <option value="">Todos los tipos</option>
                <option value={MaintenanceType.PREVENTIVO}>Preventivo</option>
                <option value={MaintenanceType.CORRECTIVO}>Correctivo</option>
                <option value={MaintenanceType.ACTUALIZACION}>Actualización</option>
                <option value={MaintenanceType.INSPECCION}>Inspección</option>
              </select>
              <input type="text" placeholder="Buscar equipo o título..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={selectCls} />
            </div>
          </Card>

          {/* Tabla */}
          {maintenances.length === 0 ? (
            <EmptyState icon={<Wrench size={28} />} title="Sin mantenimientos" description="No hay mantenimientos que coincidan con los filtros." action={canManage ? { label: 'Nuevo Mantenimiento', onClick: () => setShowForm(true) } : undefined} />
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      {['Equipo', 'Tipo', 'Título', 'Fecha', 'Estado', 'Asignado', ...(canManage ? ['Acciones'] : [])].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {maintenances.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.equipmentName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{m.company}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {TYPE_ICON[m.type]}
                            <span className="text-sm capitalize text-slate-700 dark:text-slate-300">{m.type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-slate-800 dark:text-slate-100">{m.title}</p>
                          {m.frequency && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock size={11} />{m.frequency}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {toDate(m.scheduledDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {m.status === MaintenanceStatus.COMPLETADO && <CheckCircle2 size={12} className="text-green-500" />}
                            {m.status === MaintenanceStatus.ATRASADO    && <AlertTriangle size={12} className="text-red-500" />}
                            {maintenanceStatusBadge(m.status)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                          {m.assignedToName || 'Sin asignar'}
                        </td>
                        {canManage && (
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => { setSelected(m); setShowDetail(true); }} className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">Ver</button>
                              <button type="button" onClick={() => { setSelected(m); setShowStatusEditor(true); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Editar</button>
                              <button type="button" onClick={() => handleDelete(m.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Eliminar</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {showForm && (
        <MaintenanceForm onClose={() => { setShowForm(false); setSelected(undefined); }} onSubmit={selected ? handleUpdate : handleCreate} initialData={selected} />
      )}
      {showStatusEditor && (selected || justCreated) && (
        <MaintenanceStatusEditor maintenance={selected || justCreated!} onClose={() => { setShowStatusEditor(false); setJustCreated(undefined); setSelected(undefined); }} onUpdate={loadMaintenances} />
      )}
      {showDetail && selected && (
        <MaintenanceDetail maintenance={selected} onClose={() => { setShowDetail(false); setSelected(undefined); }} />
      )}
    </div>
  );
};

export default Maintenances;
