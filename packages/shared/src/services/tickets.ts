import { supabase } from '../config/supabase';
import {
  Ticket, TicketFilters, TicketComment,
  TicketStatus, TicketPriority, TicketCategory
} from '../types';
import { generateTicketNumber } from '../utils/helpers';
import { deleteFile, resolveAttachmentStoragePath } from './storage';

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const isTicketPriority = (v: unknown): v is TicketPriority =>
  typeof v === 'string' && Object.values(TicketPriority).includes(v as TicketPriority);
const isTicketStatus = (v: unknown): v is TicketStatus =>
  typeof v === 'string' && Object.values(TicketStatus).includes(v as TicketStatus);
const isTicketCategory = (v: unknown): v is TicketCategory =>
  typeof v === 'string' && Object.values(TicketCategory).includes(v as TicketCategory);

const rowToTicket = (row: any, comments: TicketComment[] = []): Ticket => ({
  id: row.id,
  ticketNumber: row.ticket_number,
  company: row.company,
  title: row.title,
  description: row.description ?? '',
  category: isTicketCategory(row.category) ? row.category : TicketCategory.OTHER,
  priority: isTicketPriority(row.priority) ? row.priority : TicketPriority.MEDIUM,
  status: isTicketStatus(row.status) ? row.status : TicketStatus.OPEN,
  createdBy: row.created_by ?? '',
  createdByName: row.created_by_name ?? '',
  assignedTo: row.assigned_to ?? undefined,
  assignedToName: row.assigned_to_name ?? undefined,
  equipment: row.equipment_id ?? undefined,
  attachments: row.attachments ?? [],
  comments,
  createdAt: toDate(row.created_at) ?? new Date(),
  updatedAt: toDate(row.updated_at) ?? new Date(),
  resolvedAt: toDate(row.resolved_at),
  closedAt: toDate(row.closed_at)
});

const rowToComment = (row: any): TicketComment => ({
  id: row.id,
  ticketId: row.ticket_id,
  userId: row.author_id ?? '',
  userName: row.author_name ?? '',
  text: row.text,
  attachments: row.attachments ?? [],
  createdAt: toDate(row.created_at) ?? new Date()
});

export const getTickets = async (filters?: TicketFilters): Promise<Ticket[]> => {
  let q = supabase.from('tickets').select('*');

  if (filters?.company) q = q.eq('company', filters.company);
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.priority) q = q.eq('priority', filters.priority);
  if (filters?.category) q = q.eq('category', filters.category);
  if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo);
  if (filters?.createdBy) q = q.eq('created_by', filters.createdBy);
  if (filters?.createdByName) q = q.eq('created_by_name', filters.createdByName);

  q = q.order('created_at', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;

  let tickets = (data ?? []).map(r => rowToTicket(r));

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    tickets = tickets.filter(t =>
      t.title.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.ticketNumber.toLowerCase().includes(s)
    );
  }

  return tickets;
};

export const getTicketById = async (id: string): Promise<Ticket | null> => {
  const [ticketResult, commentsResult] = await Promise.all([
    supabase.from('tickets').select('*').eq('id', id).single(),
    supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true })
  ]);

  if (ticketResult.error || !ticketResult.data) return null;
  const comments = (commentsResult.data ?? []).map(rowToComment);
  return rowToTicket(ticketResult.data, comments);
};

export const createTicket = async (
  ticket: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'comments'> & { id?: string }
): Promise<string> => {
  const { id: providedId, ...rest } = ticket;
  const ticketNumber = generateTicketNumber();

  const payload: any = {
    ticket_number: ticketNumber,
    company: rest.company,
    title: rest.title,
    description: rest.description,
    category: rest.category,
    priority: rest.priority,
    status: rest.status,
    created_by: rest.createdBy,
    created_by_name: rest.createdByName,
    assigned_to: rest.assignedTo ?? null,
    assigned_to_name: rest.assignedToName ?? null,
    equipment_id: rest.equipment ?? null,
    attachments: rest.attachments ?? []
  };

  if (providedId) payload.id = providedId;

  const { data, error } = await supabase.from('tickets').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
};

export const updateTicket = async (id: string, data: Partial<Ticket>): Promise<void> => {
  const updates: any = { updated_at: new Date().toISOString() };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;
  if (data.priority !== undefined) updates.priority = data.priority;
  if (data.status !== undefined) {
    updates.status = data.status;
    if (data.status === TicketStatus.RESOLVED && !data.resolvedAt) {
      updates.resolved_at = new Date().toISOString();
    }
    if (data.status === TicketStatus.CLOSED && !data.closedAt) {
      updates.closed_at = new Date().toISOString();
    }
  }
  if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo ?? null;
  if (data.assignedToName !== undefined) updates.assigned_to_name = data.assignedToName ?? null;
  if (data.attachments !== undefined) updates.attachments = data.attachments;
  if (data.resolvedAt !== undefined) updates.resolved_at = data.resolvedAt ? new Date(data.resolvedAt as any).toISOString() : null;
  if (data.closedAt !== undefined) updates.closed_at = data.closedAt ? new Date(data.closedAt as any).toISOString() : null;

  const { error } = await supabase.from('tickets').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteTicket = async (id: string): Promise<void> => {
  const ticket = await getTicketById(id);
  if (ticket) {
    const allAttachments = [
      ...(ticket.attachments ?? []),
      ...(ticket.comments ?? []).flatMap(c => c.attachments ?? [])
    ];
    await Promise.allSettled(
      allAttachments.map(a => {
        const p = resolveAttachmentStoragePath(a);
        return p ? deleteFile(p) : Promise.resolve();
      })
    );
  }

  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) throw error;
};

export const addTicketComment = async (
  ticketId: string,
  comment: Omit<TicketComment, 'id' | 'ticketId' | 'createdAt'>
): Promise<void> => {
  const { error } = await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    author_id: comment.userId,
    author_name: comment.userName,
    text: comment.text,
    attachments: comment.attachments ?? []
  });
  if (error) throw error;

  await supabase
    .from('tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);
};

export const getTicketStats = async () => {
  const tickets = await getTickets();
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let totalResolutionTime = 0;
  let resolvedCount = 0;

  tickets.forEach(t => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;

    if (t.resolvedAt && t.createdAt) {
      const diff = new Date(t.resolvedAt as any).getTime() - new Date(t.createdAt as any).getTime();
      totalResolutionTime += diff / (1000 * 60 * 60);
      resolvedCount++;
    }
  });

  return {
    total: tickets.length,
    byStatus,
    byPriority,
    byCategory,
    averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0
  };
};
