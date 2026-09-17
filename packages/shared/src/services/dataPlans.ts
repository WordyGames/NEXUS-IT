import { supabase } from '../config/supabase';
import { CreateDataPlanInput, DataPlan, DataPlanFilters } from '../types';

export type DataPlanChangesUnsubscribe = () => void;

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const createDataPlanChannelName = (): string => (
  `data_plans_changes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
);

const rowToDataPlan = (row: any): DataPlan => ({
  id: row.id,
  company: row.company,
  provider: row.provider,
  providerOther: row.provider_other ?? undefined,
  phoneNumber: row.phone_number,
  planName: row.plan_name,
  dataLimitGb: row.data_limit_gb === null || row.data_limit_gb === undefined ? undefined : Number(row.data_limit_gb),
  monthlyCost: Number(row.monthly_cost ?? 0),
  billingDay: row.billing_day,
  equipmentId: row.equipment_id ?? undefined,
  status: row.status,
  contractStartDate: toDate(row.contract_start_date),
  notes: row.notes ?? undefined,
  createdAt: toDate(row.created_at) ?? new Date(),
  updatedAt: toDate(row.updated_at) ?? new Date(),
  createdBy: row.created_by ?? ''
});

export const getDataPlans = async (filters?: DataPlanFilters): Promise<DataPlan[]> => {
  let q = supabase.from('data_plans').select('*');

  if (filters?.company) q = q.eq('company', filters.company);
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.provider) q = q.eq('provider', filters.provider);
  if (filters?.equipmentId) q = q.eq('equipment_id', filters.equipmentId);

  q = q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;

  let plans = (data ?? []).map(rowToDataPlan);

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    plans = plans.filter(p =>
      p.phoneNumber.toLowerCase().includes(s) ||
      p.planName.toLowerCase().includes(s) ||
      (p.providerOther ?? '').toLowerCase().includes(s) ||
      (p.notes ?? '').toLowerCase().includes(s)
    );
  }

  return plans;
};

export const getDataPlanById = async (id: string, company?: string): Promise<DataPlan | null> => {
  let q = supabase.from('data_plans').select('*').eq('id', id);
  if (company) q = q.eq('company', company);

  const { data, error } = await q.single();
  if (error || !data) return null;
  return rowToDataPlan(data);
};

export const createDataPlan = async (plan: CreateDataPlanInput): Promise<string> => {
  const payload: any = {
    company: plan.company,
    provider: plan.provider,
    provider_other: plan.providerOther ?? null,
    phone_number: plan.phoneNumber,
    plan_name: plan.planName,
    data_limit_gb: plan.dataLimitGb ?? null,
    monthly_cost: plan.monthlyCost,
    billing_day: plan.billingDay,
    equipment_id: plan.equipmentId ?? null,
    status: plan.status,
    contract_start_date: plan.contractStartDate
      ? new Date(plan.contractStartDate as any).toISOString().slice(0, 10)
      : null,
    notes: plan.notes ?? null,
    created_by: plan.createdBy
  };

  const { data, error } = await supabase.from('data_plans').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateDataPlan = async (id: string, data: Partial<DataPlan>, company?: string): Promise<void> => {
  const updates: any = { updated_at: new Date().toISOString() };

  if (data.provider !== undefined) updates.provider = data.provider;
  if (data.providerOther !== undefined) updates.provider_other = data.providerOther ?? null;
  if (data.phoneNumber !== undefined) updates.phone_number = data.phoneNumber;
  if (data.planName !== undefined) updates.plan_name = data.planName;
  if (data.dataLimitGb !== undefined) updates.data_limit_gb = data.dataLimitGb ?? null;
  if (data.monthlyCost !== undefined) updates.monthly_cost = data.monthlyCost;
  if (data.billingDay !== undefined) updates.billing_day = data.billingDay;
  if (data.equipmentId !== undefined) updates.equipment_id = data.equipmentId ?? null;
  if (data.status !== undefined) updates.status = data.status;
  if (data.contractStartDate !== undefined) {
    updates.contract_start_date = data.contractStartDate
      ? new Date(data.contractStartDate as any).toISOString().slice(0, 10)
      : null;
  }
  if (data.notes !== undefined) updates.notes = data.notes ?? null;

  let uq = supabase.from('data_plans').update(updates).eq('id', id);
  if (company) uq = uq.eq('company', company);
  const { error } = await uq;
  if (error) throw error;
};

export const deleteDataPlan = async (id: string, company?: string): Promise<void> => {
  let dq = supabase.from('data_plans').delete().eq('id', id);
  if (company) dq = dq.eq('company', company);
  const { error } = await dq;
  if (error) throw error;
};

// Resumen de gasto: total mensual contratado y desglose por proveedor,
// util para el encabezado de la pantalla de planes.
export const getDataPlansSpendSummary = (plans: DataPlan[]) => {
  const activePlans = plans.filter(p => p.status === 'active');
  const totalMonthlyCost = activePlans.reduce((sum, p) => sum + (p.monthlyCost || 0), 0);
  const totalDataLimitGb = activePlans.reduce(
    (sum, p) => (p.dataLimitGb === undefined ? sum : sum + p.dataLimitGb),
    0
  );
  const hasUnlimitedPlan = activePlans.some(p => p.dataLimitGb === undefined);
  const byProvider: Record<string, { count: number; monthlyCost: number }> = {};

  activePlans.forEach(p => {
    const key = p.provider;
    if (!byProvider[key]) byProvider[key] = { count: 0, monthlyCost: 0 };
    byProvider[key].count += 1;
    byProvider[key].monthlyCost += p.monthlyCost || 0;
  });

  return {
    activeCount: activePlans.length,
    totalMonthlyCost,
    totalDataLimitGb,
    hasUnlimitedPlan,
    byProvider
  };
};

export const subscribeDataPlanChanges = (
  onChange: () => void | Promise<void>,
  options?: {
    onError?: (error: unknown) => void;
  }
): DataPlanChangesUnsubscribe => {
  const handleError = options?.onError ?? console.error;

  const channel = supabase
    .channel(createDataPlanChannelName())
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'data_plans' },
      () => {
        void Promise.resolve()
          .then(() => onChange())
          .catch(handleError);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        handleError(new Error(`La suscripcion realtime de planes de datos fallo con estado ${status}`));
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
};
