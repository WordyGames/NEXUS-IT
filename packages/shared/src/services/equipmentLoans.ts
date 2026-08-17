import { supabase } from '../config/supabase';
import { CreateEquipmentLoanInput, EquipmentLoan, EquipmentLoanFilters } from '../types';
import { getEquipmentById, updateEquipment } from './equipment';

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const rowToLoan = (row: any): EquipmentLoan => ({
  id: row.id,
  equipmentId: row.equipment_id,
  company: row.company,
  borrowerId: row.borrower_id ?? undefined,
  borrowerName: row.borrower_name,
  previousAssignedTo: row.previous_assigned_to ?? undefined,
  previousAssignedToName: row.previous_assigned_to_name ?? undefined,
  loanDate: toDate(row.loan_date) ?? new Date(),
  dueDate: toDate(row.due_date) ?? new Date(),
  days: row.days,
  returnedAt: toDate(row.returned_at),
  status: row.status,
  notes: row.notes ?? undefined,
  generatedBy: row.generated_by ?? undefined,
  generatedByName: row.generated_by_name ?? undefined,
  createdAt: toDate(row.created_at) ?? new Date(),
  updatedAt: toDate(row.updated_at) ?? new Date()
});

export const getEquipmentLoans = async (filters?: EquipmentLoanFilters): Promise<EquipmentLoan[]> => {
  let q = supabase.from('equipment_loans').select('*');

  if (filters?.company) q = q.eq('company', filters.company);
  if (filters?.equipmentId) q = q.eq('equipment_id', filters.equipmentId);
  if (filters?.borrowerId) q = q.eq('borrower_id', filters.borrowerId);
  if (filters?.status) q = q.eq('status', filters.status);

  q = q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToLoan);
};

export const getActiveLoanForEquipment = async (equipmentId: string): Promise<EquipmentLoan | null> => {
  const { data, error } = await supabase
    .from('equipment_loans')
    .select('*')
    .eq('equipment_id', equipmentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToLoan(data) : null;
};

// Prestamos activos que vencen en los proximos `withinDays` dias (o ya vencidos).
// Util para recordatorios/notificaciones de devolucion.
export const getLoansDueSoon = async (withinDays = 3): Promise<EquipmentLoan[]> => {
  const limit = new Date();
  limit.setDate(limit.getDate() + withinDays);
  const limitStr = limit.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('equipment_loans')
    .select('*')
    .eq('status', 'active')
    .lte('due_date', limitStr)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(rowToLoan);
};

// Crea un prestamo temporal: guarda quien tenia el equipo antes, reasigna el
// equipo al que recibe el prestamo por `days` dias, y deja el equipo marcado
// como on_loan para que se muestre en la UI con su fecha de devolucion.
export const createEquipmentLoan = async (input: CreateEquipmentLoanInput): Promise<EquipmentLoan> => {
  const equipment = await getEquipmentById(input.equipmentId);
  if (!equipment) throw new Error('Equipo no encontrado');

  const loanDate = new Date();
  const dueDate = new Date(loanDate);
  dueDate.setDate(dueDate.getDate() + input.days);

  const payload = {
    equipment_id: input.equipmentId,
    company: input.company,
    borrower_id: input.borrowerId ?? null,
    borrower_name: input.borrowerName,
    previous_assigned_to: equipment.assignedTo ?? null,
    previous_assigned_to_name: null, // se resuelve en la UI si se necesita mostrar
    loan_date: loanDate.toISOString().slice(0, 10),
    due_date: dueDate.toISOString().slice(0, 10),
    days: input.days,
    status: 'active',
    notes: input.notes ?? null,
    generated_by: input.generatedBy ?? null,
    generated_by_name: input.generatedByName ?? null
  };

  const { data, error } = await supabase.from('equipment_loans').insert(payload).select('*').single();
  if (error) throw error;

  await updateEquipment(input.equipmentId, {
    assignedTo: input.borrowerId ?? equipment.assignedTo,
    onLoan: true,
    loanDueDate: dueDate
  });

  return rowToLoan(data);
};

// Marca el prestamo como devuelto y restaura la asignacion previa del equipo (si habia una).
export const returnEquipmentLoan = async (loanId: string): Promise<void> => {
  const { data: loanRow, error: loanError } = await supabase
    .from('equipment_loans')
    .select('*')
    .eq('id', loanId)
    .single();
  if (loanError) throw loanError;

  const loan = rowToLoan(loanRow);

  const { error } = await supabase
    .from('equipment_loans')
    .update({ status: 'returned', returned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', loanId);
  if (error) throw error;

  await updateEquipment(loan.equipmentId, {
    assignedTo: loan.previousAssignedTo,
    onLoan: false,
    loanDueDate: undefined
  });
};

// Cancela un prestamo sin marcarlo como devuelto formalmente (ej. registrado por error).
export const cancelEquipmentLoan = async (loanId: string): Promise<void> => {
  const { data: loanRow, error: loanError } = await supabase
    .from('equipment_loans')
    .select('*')
    .eq('id', loanId)
    .single();
  if (loanError) throw loanError;

  const loan = rowToLoan(loanRow);

  const { error } = await supabase
    .from('equipment_loans')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', loanId);
  if (error) throw error;

  await updateEquipment(loan.equipmentId, {
    assignedTo: loan.previousAssignedTo,
    onLoan: false,
    loanDueDate: undefined
  });
};
