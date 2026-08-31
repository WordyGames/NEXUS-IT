import { supabase } from '../config/supabase';
import { Equipment, EquipmentFilters } from '../types';
import { deleteFile, resolveAttachmentStoragePath } from './storage';
import { isValidUuid } from '../utils/helpers';
import { withOfflineCache } from '../utils/offlineCache';

export type EquipmentChangesUnsubscribe = () => void;

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const createEquipmentChannelName = (): string => (
  `equipment_changes_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
);

const rowToEquipment = (row: any): Equipment => ({
  id: row.id,
  name: row.name,
  type: row.type,
  company: row.company,
  specs: row.specs ?? {},
  location: row.location ?? '',
  assignedTo: row.assigned_to ?? undefined,
  status: row.status,
  notes: row.notes ?? undefined,
  attachments: row.attachments ?? [],
  onLoan: row.on_loan ?? false,
  loanDueDate: toDate(row.loan_due_date),
  warrantyExpiration: toDate(row.warranty_expiration),
  purchaseDate: toDate(row.purchase_date),
  createdAt: toDate(row.created_at) ?? new Date(),
  updatedAt: toDate(row.updated_at) ?? new Date(),
  createdBy: row.created_by ?? ''
});

export const getEquipment = async (filters?: EquipmentFilters): Promise<Equipment[]> => {
  return withOfflineCache('equipment', async () => {
    let q = supabase.from('equipment').select('*');

    if (filters?.company) q = q.eq('company', filters.company);
    if (filters?.type) q = q.eq('type', filters.type);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo);

    q = q.order('created_at', { ascending: false });

    const { data, error } = await q;
    if (error) throw error;

    let equipment = (data ?? []).map(rowToEquipment);

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      equipment = equipment.filter(eq =>
        eq.name.toLowerCase().includes(s) ||
        eq.specs?.hostname?.toLowerCase().includes(s) ||
        eq.specs?.serialNumber?.toLowerCase().includes(s) ||
        (eq.location ?? '').toLowerCase().includes(s)
      );
    }

    return equipment;
  }, filters);
};

export const getEquipmentById = async (id: string, company?: string): Promise<Equipment | null> => {
  // Filtro multi-tenant: si se provee company, restringe al tenant.
  // La proteccion REAL debe venir de RLS en Supabase (ver supabase/migrations).
  let q = supabase.from('equipment').select('*').eq('id', id);
  if (company) q = q.eq('company', company);

  const { data, error } = await q.single();

  if (error || !data) return null;
  return rowToEquipment(data);
};

export const createEquipment = async (
  equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> => {
  const { id: providedId, ...rest } = equipment;

  const payload: any = {
    name: rest.name,
    type: rest.type,
    company: rest.company,
    specs: rest.specs ?? {},
    location: rest.location,
    assigned_to: rest.assignedTo ?? null,
    status: rest.status,
    notes: rest.notes ?? null,
    attachments: rest.attachments ?? [],
    warranty_expiration: rest.warrantyExpiration ? new Date(rest.warrantyExpiration as any).toISOString() : null,
    purchase_date: rest.purchaseDate ? new Date(rest.purchaseDate as any).toISOString() : null,
    created_by: rest.createdBy
  };

  if (providedId && isValidUuid(providedId)) {
    payload.id = providedId;
  }

  const { data, error } = await supabase.from('equipment').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateEquipment = async (id: string, data: Partial<Equipment>, company?: string): Promise<void> => {
  const updates: any = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.company !== undefined) updates.company = data.company;
  if (data.specs !== undefined) updates.specs = data.specs;
  if (data.location !== undefined) updates.location = data.location;
  if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo ?? null;
  if (data.onLoan !== undefined) {
    updates.on_loan = data.onLoan;
    // Al cerrar un prestamo (onLoan: false) siempre limpiamos la fecha de devolucion,
    // aunque no se pase loanDueDate explicitamente.
    if (!data.onLoan) updates.loan_due_date = null;
  }
  if (data.loanDueDate !== undefined) {
    updates.loan_due_date = data.loanDueDate ? new Date(data.loanDueDate as any).toISOString().slice(0, 10) : null;
  }
  if (data.status !== undefined) updates.status = data.status;
  if (data.notes !== undefined) updates.notes = data.notes ?? null;
  if (data.attachments !== undefined) updates.attachments = data.attachments;
  if (data.warrantyExpiration !== undefined) {
    updates.warranty_expiration = data.warrantyExpiration
      ? new Date(data.warrantyExpiration as any).toISOString()
      : null;
  }
  if (data.purchaseDate !== undefined) {
    updates.purchase_date = data.purchaseDate ? new Date(data.purchaseDate as any).toISOString() : null;
  }

  // Filtro multi-tenant en la mutacion. La proteccion real es RLS en Supabase.
  let uq = supabase.from('equipment').update(updates).eq('id', id);
  if (company) uq = uq.eq('company', company);
  const { error } = await uq;
  if (error) throw error;
};

export const deleteEquipment = async (id: string, company?: string): Promise<void> => {
  const eq = await getEquipmentById(id, company);
  if (eq?.attachments?.length) {
    await Promise.allSettled(
      eq.attachments.map(a => {
        const p = resolveAttachmentStoragePath(a);
        return p ? deleteFile(p) : Promise.resolve();
      })
    );
  }

  let dq = supabase.from('equipment').delete().eq('id', id);
  if (company) dq = dq.eq('company', company);
  const { error } = await dq;
  if (error) throw error;
};

export const getEquipmentStats = async () => {
  const equipment = await getEquipment();
  const byCompany: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};

  equipment.forEach(eq => {
    byCompany[eq.company] = (byCompany[eq.company] || 0) + 1;
    byStatus[eq.status] = (byStatus[eq.status] || 0) + 1;
    byType[eq.type] = (byType[eq.type] || 0) + 1;
  });

  return { total: equipment.length, byCompany, byStatus, byType };
};

export const subscribeEquipmentChanges = (
  onChange: () => void | Promise<void>,
  options?: {
    onError?: (error: unknown) => void;
  }
): EquipmentChangesUnsubscribe => {
  const handleError = options?.onError ?? console.error;

  const channel = supabase
    .channel(createEquipmentChannelName())
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'equipment' },
      () => {
        void Promise.resolve()
          .then(() => onChange())
          .catch(handleError);
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        handleError(new Error(`La suscripcion realtime de equipos fallo con estado ${status}`));
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
};
