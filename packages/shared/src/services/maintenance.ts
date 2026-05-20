import { supabase } from '../config/supabase';
import {
  Maintenance, MaintenanceFilters, MaintenanceStatus,
  MaintenanceTask, MaintenanceType
} from '../types';
import { getEquipment, getEquipmentById } from './equipment';
import { isAdmin as isAdminUser } from './users';
import { deleteFile, resolveAttachmentStoragePath } from './storage';

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const rowToMaintenance = (row: any): Maintenance => ({
  id: row.id,
  equipmentId: row.equipment_id,
  equipmentName: row.equipment_name,
  company: row.company,
  type: row.type as MaintenanceType,
  status: row.status as MaintenanceStatus,
  title: row.title ?? '',
  description: row.description ?? '',
  notificationEmail: row.notification_email ?? undefined,
  scheduledDate: toDate(row.scheduled_date) ?? new Date(),
  scheduledTime: row.scheduled_time ?? undefined,
  completedDate: toDate(row.completed_date),
  nextMaintenanceDate: toDate(row.next_maintenance_date),
  frequency: row.frequency ?? undefined,
  assignedTo: row.assigned_to ?? undefined,
  assignedToName: row.assigned_to_name ?? undefined,
  timeConfirmationStatus: row.time_confirmation_status ?? undefined,
  timeConfirmedBy: row.time_confirmed_by ?? undefined,
  timeConfirmedByName: row.time_confirmed_by_name ?? undefined,
  timeConfirmedAt: toDate(row.time_confirmed_at),
  tasks: row.tasks ?? [],
  notes: row.notes ?? undefined,
  attachments: row.attachments ?? [],
  cost: row.cost ?? undefined,
  createdBy: row.created_by ?? '',
  createdByName: row.created_by_name ?? '',
  createdAt: toDate(row.created_at) ?? new Date(),
  updatedAt: toDate(row.updated_at) ?? new Date()
});

export const getMaintenances = async (filters?: MaintenanceFilters): Promise<Maintenance[]> => {
  let q = supabase.from('maintenances').select('*');

  if (filters?.company) q = q.eq('company', filters.company);
  if (filters?.equipmentId) q = q.eq('equipment_id', filters.equipmentId);
  if (filters?.type) q = q.eq('type', filters.type);
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo);

  q = q.order('scheduled_date', { ascending: true });

  const { data, error } = await q;
  if (error) throw error;

  let maintenances = (data ?? []).map(rowToMaintenance);

  if (filters?.dateFrom || filters?.dateTo) {
    maintenances = maintenances.filter(m => {
      const d = new Date(m.scheduledDate as any);
      if (filters.dateFrom && d < filters.dateFrom) return false;
      if (filters.dateTo && d > filters.dateTo) return false;
      return true;
    });
  }

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    maintenances = maintenances.filter(m =>
      m.title.toLowerCase().includes(s) ||
      m.equipmentName.toLowerCase().includes(s) ||
      (m.description ?? '').toLowerCase().includes(s) ||
      m.assignedToName?.toLowerCase().includes(s)
    );
  }

  return maintenances;
};

export const filterMaintenancesForUser = async (
  maintenances: Maintenance[],
  userId?: string,
  isAdmin = false
): Promise<Maintenance[]> => {
  if (isAdmin || !userId) return maintenances;
  const userEquipment = await getEquipment({ assignedTo: userId });
  const ids = new Set(userEquipment.map(eq => eq.id));
  return maintenances.filter(m => m.assignedTo === userId || ids.has(m.equipmentId));
};

export const getMaintenancesForUser = async (
  filters?: MaintenanceFilters,
  userId?: string,
  isAdmin = false
): Promise<Maintenance[]> => {
  const all = await getMaintenances(filters);
  return filterMaintenancesForUser(all, userId, isAdmin);
};

export const getMaintenanceById = async (id: string): Promise<Maintenance | null> => {
  const { data, error } = await supabase.from('maintenances').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToMaintenance(data);
};

export const getUpcomingMaintenances = async (): Promise<Maintenance[]> => {
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const all = await getMaintenances({ status: MaintenanceStatus.PROGRAMADO });
  return all.filter(m => {
    const d = new Date(m.scheduledDate as any);
    return d >= now && d <= next7;
  });
};

export const getOverdueMaintenances = async (): Promise<Maintenance[]> => {
  const now = new Date();
  const all = await getMaintenances({ status: MaintenanceStatus.PROGRAMADO });
  return all.filter(m => new Date(m.scheduledDate as any) < now);
};

export const createMaintenance = async (
  maintenance: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> => {
  const { id: providedId, ...rest } = maintenance;

  const payload: any = {
    equipment_id: rest.equipmentId,
    equipment_name: rest.equipmentName,
    company: rest.company,
    type: rest.type,
    status: rest.status,
    title: rest.title,
    description: rest.description,
    scheduled_date: new Date(rest.scheduledDate as any).toISOString().split('T')[0],
    tasks: rest.tasks,
    created_by: rest.createdBy || null,
    created_by_name: rest.createdByName
  };

  if (rest.notificationEmail) payload.notification_email = rest.notificationEmail;
  if (rest.assignedTo) payload.assigned_to = rest.assignedTo;
  if (rest.assignedToName) payload.assigned_to_name = rest.assignedToName;
  if (rest.frequency) payload.frequency = rest.frequency;
  if (rest.cost !== undefined) payload.cost = rest.cost;
  if (rest.notes) payload.notes = rest.notes;
  if (rest.completedDate) payload.completed_date = new Date(rest.completedDate as any).toISOString();
  if (rest.nextMaintenanceDate) payload.next_maintenance_date = new Date(rest.nextMaintenanceDate as any).toISOString().split('T')[0];
  if (rest.attachments?.length) payload.attachments = rest.attachments;
  if (providedId) payload.id = providedId;

  const { data, error } = await supabase.from('maintenances').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateMaintenance = async (id: string, updates: Partial<Maintenance>): Promise<void> => {
  const clean: any = { updated_at: new Date().toISOString() };

  const map: Record<string, string> = {
    equipmentId: 'equipment_id',
    equipmentName: 'equipment_name',
    company: 'company',
    type: 'type',
    status: 'status',
    title: 'title',
    description: 'description',
    notificationEmail: 'notification_email',
    assignedTo: 'assigned_to',
    assignedToName: 'assigned_to_name',
    frequency: 'frequency',
    cost: 'cost',
    notes: 'notes',
    tasks: 'tasks',
    attachments: 'attachments',
    timeConfirmationStatus: 'time_confirmation_status',
    timeConfirmedBy: 'time_confirmed_by',
    timeConfirmedByName: 'time_confirmed_by_name',
    createdByName: 'created_by_name'
  };

  for (const [key, col] of Object.entries(map)) {
    const val = (updates as any)[key];
    if (val !== undefined) clean[col] = val;
  }

  const dateMap: Record<string, string> = {
    scheduledDate: 'scheduled_date',
    completedDate: 'completed_date',
    nextMaintenanceDate: 'next_maintenance_date',
    timeConfirmedAt: 'time_confirmed_at'
  };

  for (const [key, col] of Object.entries(dateMap)) {
    const val = (updates as any)[key];
    if (val !== undefined) {
      clean[col] = val ? new Date(val as any).toISOString() : null;
    }
  }

  const { error } = await supabase.from('maintenances').update(clean).eq('id', id);
  if (error) throw error;
};

export const updateMaintenanceTask = async (
  maintenanceId: string,
  taskId: string,
  updates: Partial<MaintenanceTask>
): Promise<void> => {
  const m = await getMaintenanceById(maintenanceId);
  if (!m) throw new Error('Maintenance not found');
  const tasks = m.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
  await updateMaintenance(maintenanceId, { tasks });
};

const getDefaultFrequencyForType = (type: MaintenanceType): Maintenance['frequency'] | undefined => {
  if (type === MaintenanceType.PREVENTIVO) return 'semiannual';
  return undefined;
};

const calculateNextDate = (
  from: Date,
  freq: 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
): Date => {
  const d = new Date(from);
  if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (freq === 'semiannual') d.setMonth(d.getMonth() + 6);
  else if (freq === 'annual') d.setFullYear(d.getFullYear() + 1);
  return d;
};

export const completeMaintenance = async (
  id: string,
  userId: string,
  userName: string,
  notes?: string
): Promise<void> => {
  const m = await getMaintenanceById(id);
  if (!m) throw new Error('Maintenance not found');
  if (m.status === MaintenanceStatus.COMPLETADO) {
    if (notes !== undefined) await updateMaintenance(id, { notes });
    return;
  }

  const effectiveFreq = m.frequency || getDefaultFrequencyForType(m.type);
  const completedAt = new Date();
  completedAt.setHours(0, 0, 0, 0);

  const upd: Partial<Maintenance> = {
    status: MaintenanceStatus.COMPLETADO,
    completedDate: new Date(),
    notes: notes ?? m.notes
  };

  if (!m.frequency && effectiveFreq) upd.frequency = effectiveFreq;
  if (effectiveFreq) upd.nextMaintenanceDate = calculateNextDate(completedAt, effectiveFreq);

  await updateMaintenance(id, upd);

  if (effectiveFreq && upd.nextMaintenanceDate) {
    const freshTasks = m.tasks.map(t => ({
      ...t, completed: false,
      completedBy: undefined, completedAt: undefined
    }));
    await createMaintenance({
      ...m,
      scheduledDate: upd.nextMaintenanceDate,
      status: MaintenanceStatus.PROGRAMADO,
      completedDate: undefined,
      frequency: effectiveFreq,
      tasks: freshTasks,
      createdBy: userId,
      createdByName: userName
    });
  }
};

export const updateMaintenanceStatus = async (id: string, status: MaintenanceStatus): Promise<void> => {
  await updateMaintenance(id, { status });
};

export const rescheduleMaintenance = async (
  id: string,
  newDate: Date,
  options?: { resetTimeConfirmation?: boolean; notes?: string }
): Promise<void> => {
  const normalized = new Date(newDate);
  normalized.setHours(0, 0, 0, 0);

  const upd: any = {
    scheduled_date: normalized.toISOString().split('T')[0],
    status: MaintenanceStatus.PROGRAMADO,
    updated_at: new Date().toISOString()
  };

  if (options?.notes !== undefined) upd.notes = options.notes;
  if (options?.resetTimeConfirmation !== false) {
    upd.time_confirmation_status = 'pending';
    upd.scheduled_time = null;
    upd.time_confirmed_by = null;
    upd.time_confirmed_by_name = null;
    upd.time_confirmed_at = null;
  }

  const { error } = await supabase.from('maintenances').update(upd).eq('id', id);
  if (error) throw error;
};

export const deleteMaintenance = async (id: string): Promise<void> => {
  const m = await getMaintenanceById(id);
  if (m?.attachments?.length) {
    await Promise.allSettled(
      m.attachments.map(a => {
        const p = resolveAttachmentStoragePath(a);
        return p ? deleteFile(p) : Promise.resolve();
      })
    );
  }
  const { error } = await supabase.from('maintenances').delete().eq('id', id);
  if (error) throw error;
};

export const getMaintenanceStats = async () => {
  const all = await getMaintenances();
  const upcoming = await getUpcomingMaintenances();
  const overdue = await getOverdueMaintenances();

  const byStatus = all.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<MaintenanceStatus, number>);

  const byType = all.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return { total: all.length, upcoming: upcoming.length, overdue: overdue.length, byStatus, byType };
};

export const getPendingTimeConfirmationMaintenances = async (
  assignedToId?: string
): Promise<Maintenance[]> => {
  let q = supabase
    .from('maintenances')
    .select('*')
    .eq('status', MaintenanceStatus.PROGRAMADO)
    .neq('time_confirmation_status', 'confirmed');

  if (assignedToId) q = q.eq('assigned_to', assignedToId);

  const { data, error } = await q.order('scheduled_date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToMaintenance);
};

export const getPendingTimeConfirmationMaintenancesForUser = async (
  userId?: string,
  isAdmin = false
): Promise<Maintenance[]> => {
  const all = await getPendingTimeConfirmationMaintenances(undefined);
  if (!userId || isAdmin) return all;
  const userEquipment = await getEquipment({ assignedTo: userId });
  const ids = new Set(userEquipment.map(eq => eq.id));
  return all.filter(m => m.assignedTo === userId || ids.has(m.equipmentId));
};

export const confirmMaintenanceTime = async (
  maintenanceId: string,
  scheduledTime: string,
  confirmedBy: string,
  confirmedByName: string
): Promise<void> => {
  const m = await getMaintenanceById(maintenanceId);
  if (!m) throw new Error('Mantenimiento no encontrado');
  if (m.timeConfirmationStatus === 'confirmed') throw new Error('Este mantenimiento ya fue confirmado');
  if (m.status !== MaintenanceStatus.PROGRAMADO) {
    throw new Error('Solo se puede confirmar hora en mantenimientos programados');
  }

  const confirmerIsAdmin = await isAdminUser(confirmedBy);
  if (confirmerIsAdmin) {
    throw new Error('La hora debe ser confirmada por el usuario responsable, no por administrador');
  }

  const equipment = await getEquipmentById(m.equipmentId);
  if (m.assignedTo !== confirmedBy && equipment?.assignedTo !== confirmedBy) {
    throw new Error('No tienes permisos para confirmar la hora de este mantenimiento');
  }

  const { error } = await supabase.from('maintenances').update({
    scheduled_time: scheduledTime,
    time_confirmation_status: 'confirmed',
    time_confirmed_by: confirmedBy,
    time_confirmed_by_name: confirmedByName,
    time_confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', maintenanceId);

  if (error) throw error;
};

export const getMaintenancesByDateRange = async (
  startDate: Date, endDate: Date
): Promise<Maintenance[]> => {
  const all = await getMaintenances();
  return all.filter(m => {
    const d = new Date(m.scheduledDate as any);
    return d >= startDate && d <= endDate && m.timeConfirmationStatus === 'confirmed';
  });
};

export const getMaintenancesByDateRangeForUser = async (
  startDate: Date, endDate: Date, userId?: string, isAdmin = false
): Promise<Maintenance[]> => {
  const all = await getMaintenancesByDateRange(startDate, endDate);
  return filterMaintenancesForUser(all, userId, isAdmin);
};
