import { supabase } from '../config/supabase';
import { Equipment, EquipmentFilters } from '../types';
import { deleteFile, resolveAttachmentStoragePath } from './storage';

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

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
  warrantyExpiration: toDate(row.warranty_expiration),
  purchaseDate: toDate(row.purchase_date),
  createdAt: toDate(row.created_at) ?? new Date(),
  updatedAt: toDate(row.updated_at) ?? new Date(),
  createdBy: row.created_by ?? ''
});

export const getEquipment = async (filters?: EquipmentFilters): Promise<Equipment[]> => {
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
};

export const getEquipmentById = async (id: string): Promise<Equipment | null> => {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('id', id)
    .single();

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

  if (providedId) payload.id = providedId;

  const { data, error } = await supabase.from('equipment').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateEquipment = async (id: string, data: Partial<Equipment>): Promise<void> => {
  const updates: any = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.company !== undefined) updates.company = data.company;
  if (data.specs !== undefined) updates.specs = data.specs;
  if (data.location !== undefined) updates.location = data.location;
  if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo ?? null;
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

  const { error } = await supabase.from('equipment').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteEquipment = async (id: string): Promise<void> => {
  const eq = await getEquipmentById(id);
  if (eq?.attachments?.length) {
    await Promise.allSettled(
      eq.attachments.map(a => {
        const p = resolveAttachmentStoragePath(a);
        return p ? deleteFile(p) : Promise.resolve();
      })
    );
  }

  const { error } = await supabase.from('equipment').delete().eq('id', id);
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
