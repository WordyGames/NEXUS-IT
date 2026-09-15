import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import { useAuth } from '../contexts/AuthContext';
import {
  Company,
  DataPlan,
  DataPlanFilters,
  DataPlanProvider,
  Equipment,
  UserPermission,
  getDataPlans,
  createDataPlan,
  updateDataPlan,
  deleteDataPlan,
  getDataPlansSpendSummary,
  subscribeDataPlanChanges,
  getEquipment
} from '@nexus-it/shared';
import DataPlanForm from '../components/DataPlanForm';
import { Plus, Smartphone, Wallet, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { Spinner, Card, Button, EmptyState, StatCard, Badge } from '../components/ui';

const PAGE_SIZE = 20;

const PROVIDER_LABELS: Record<DataPlanProvider, string> = {
  [DataPlanProvider.TELCEL]: 'Telcel',
  [DataPlanProvider.ATT]: 'AT&T',
  [DataPlanProvider.MOVISTAR]: 'Movistar',
  [DataPlanProvider.UNEFON]: 'Unefon',
  [DataPlanProvider.OTRO]: 'Otro'
};

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const statusBadge = (status: DataPlan['status']) => {
  const map: Record<DataPlan['status'], { color: 'green' | 'yellow' | 'red'; label: string }> = {
    active: { color: 'green', label: 'Activo' },
    suspended: { color: 'yellow', label: 'Suspendido' },
    cancelled: { color: 'red', label: 'Cancelado' }
  };
  const cfg = map[status];
  return <Badge color={cfg.color} dot>{cfg.label}</Badge>;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return 'No se pudo guardar el plan de datos';
};

const DataPlans = () => {
  const { userData, hasPermission } = useAuth();
  const { showToast, confirm } = useUiFeedback();
  const canManage = hasPermission(UserPermission.DATA_PLANS_MANAGE);

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DataPlan | null>(null);
  const [filters, setFilters] = useState<DataPlanFilters>({});
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const equipmentById = useMemo(() => {
    return equipment.reduce<Record<string, Equipment>>((acc, eq) => {
      acc[eq.id] = eq;
      return acc;
    }, {});
  }, [equipment]);

  const filteredPlans = useMemo(() => {
    const searchValue = (filters.search || '').trim().toLowerCase();
    if (!searchValue) return plans;

    return plans.filter((p) => {
      const linkedEquipment = p.equipmentId ? equipmentById[p.equipmentId] : undefined;
      const searchableValues = [
        p.phoneNumber,
        p.planName,
        p.providerOther,
        PROVIDER_LABELS[p.provider],
        linkedEquipment?.name
      ];
      return searchableValues.some((v) => (v || '').toString().toLowerCase().includes(searchValue));
    });
  }, [plans, filters.search, equipmentById]);

  const { page, setPage, paginated: paginatedPlans, totalPages } = usePagination(filteredPlans, PAGE_SIZE);

  const summary = useMemo(() => getDataPlansSpendSummary(filteredPlans), [filteredPlans]);

  useEffect(() => {
    void loadEquipment();
  }, []);

  useEffect(() => {
    void loadPlans(true);
  }, [filters.company, filters.status, filters.provider]);

  useEffect(() => {
    const unsubscribe = subscribeDataPlanChanges(
      async () => { await loadPlans(false); },
      { onError: (error) => console.error('Error subscribing to data plan changes:', error) }
    );
    return unsubscribe;
  }, [filters.company, filters.status, filters.provider]);

  const loadEquipment = async () => {
    try {
      const data = await getEquipment();
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment for data plans:', error);
    }
  };

  const loadPlans = async (blocking = false) => {
    try {
      if (blocking) setLoading(true); else setIsRefreshing(true);
      const { search: _search, ...dbFilters } = filters;
      const data = await getDataPlans(dbFilters);
      setPlans(data);
    } catch (error) {
      console.error('Error loading data plans:', error);
    } finally {
      if (blocking) setLoading(false); else setIsRefreshing(false);
    }
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  const handleEdit = (plan: DataPlan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleDelete = async (plan: DataPlan) => {
    const accepted = await confirm({
      title: 'Eliminar plan de datos',
      message: `¿Estás seguro de eliminar la línea ${plan.phoneNumber}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      intent: 'danger'
    });
    if (!accepted) return;

    try {
      await deleteDataPlan(plan.id);
      await loadPlans();
      showToast({ type: 'success', title: 'Plan eliminado', message: 'El plan de datos se eliminó correctamente' });
    } catch (error) {
      console.error('Error deleting data plan:', error);
      showToast({ type: 'error', title: 'Error al eliminar', message: 'No se pudo eliminar el plan de datos' });
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingPlan) {
        await updateDataPlan(editingPlan.id, data);
        showToast({ type: 'success', title: 'Plan actualizado', message: 'Los cambios se guardaron correctamente' });
      } else {
        await createDataPlan({ ...data, createdBy: userData?.id || '' });
        showToast({ type: 'success', title: 'Plan creado', message: 'El plan de datos se guardó correctamente' });
      }
      setShowForm(false);
      setEditingPlan(null);
      await loadPlans(false);
    } catch (error) {
      console.error('Error saving data plan:', error);
      showToast({ type: 'error', title: 'Error al guardar plan', message: getErrorMessage(error) });
      throw error;
    }
  };

  if (loading) return <Spinner size="xl" label="Cargando planes de datos..." className="h-64 justify-center" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Planes de datos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredPlans.length} línea{filteredPlans.length !== 1 ? 's' : ''} registrada{filteredPlans.length !== 1 ? 's' : ''}
            {isRefreshing && <span className="ml-2 text-blue-500 dark:text-blue-400">· Actualizando...</span>}
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={handleCreate} iconLeft={<Plus size={15} />}>
            Nuevo Plan
          </Button>
        )}
      </div>

      {/* Resumen de gasto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Líneas activas"
          value={summary.activeCount}
          icon={<Smartphone size={20} />}
          color="blue"
        />
        <StatCard
          label="Gasto mensual contratado"
          value={currency.format(summary.totalMonthlyCost)}
          icon={<Wallet size={20} />}
          color="green"
        />
        <StatCard
          label="Datos contratados"
          value={summary.hasUnlimitedPlan ? `${summary.totalDataLimitGb} GB + ilimitado` : `${summary.totalDataLimitGb} GB`}
          icon={<Database size={20} />}
          color="purple"
        />
      </div>

      {/* Filtros */}
      <Card padding="sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Empresa</label>
            <select
              aria-label="Filtrar por empresa"
              value={filters.company || ''}
              onChange={(e) => { setFilters({ ...filters, company: (e.target.value || undefined) as Company | undefined }); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todas</option>
              {Object.values(Company).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Proveedor</label>
            <select
              aria-label="Filtrar por proveedor"
              value={filters.provider || ''}
              onChange={(e) => { setFilters({ ...filters, provider: (e.target.value || undefined) as DataPlanProvider | undefined }); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todos</option>
              {Object.values(DataPlanProvider).map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Estado</label>
            <select
              aria-label="Filtrar por estado"
              value={filters.status || ''}
              onChange={(e) => { setFilters({ ...filters, status: (e.target.value || undefined) as DataPlan['status'] | undefined }); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Buscar</label>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Número, plan, equipo..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Lista de planes */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={<Smartphone size={28} />}
          title="Sin planes de datos"
          description="No se encontraron planes de datos con los filtros actuales."
          action={canManage ? { label: 'Nuevo Plan', onClick: handleCreate } : undefined}
        />
      ) : (
        <>
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Línea</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Límite</th>
                    <th className="px-4 py-3">Costo mensual</th>
                    <th className="px-4 py-3">Corte</th>
                    <th className="px-4 py-3">Equipo</th>
                    <th className="px-4 py-3">Estado</th>
                    {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {paginatedPlans.map((plan) => {
                    const linkedEquipment = plan.equipmentId ? equipmentById[plan.equipmentId] : undefined;
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{plan.phoneNumber}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {plan.provider === DataPlanProvider.OTRO ? (plan.providerOther || 'Otro') : PROVIDER_LABELS[plan.provider]}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{plan.planName}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {plan.dataLimitGb === undefined ? 'Ilimitado' : `${plan.dataLimitGb} GB`}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{currency.format(plan.monthlyCost)}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">Día {plan.billingDay}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{linkedEquipment?.name || '—'}</td>
                        <td className="px-4 py-3">{statusBadge(plan.status)}</td>
                        {canManage && (
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleEdit(plan)}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium mr-3"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(plan)}
                              className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium"
                            >
                              Eliminar
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredPlans.length)} de {filteredPlans.length} planes
              </span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Página anterior" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors border border-slate-200 dark:border-slate-700">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300 px-3">{page} / {totalPages}</span>
                <button type="button" aria-label="Página siguiente" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors border border-slate-200 dark:border-slate-700">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <DataPlanForm
          plan={editingPlan}
          defaultCompany={userData?.company || Company.GRUPO_AMEX}
          equipmentOptions={equipment}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingPlan(null); }}
        />
      )}
    </div>
  );
};

export default DataPlans;
