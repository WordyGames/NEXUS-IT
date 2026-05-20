import { supabase } from '../config/supabase';
import {
  Notification, NotificationType,
  Equipment, Ticket, Maintenance, TicketStatus
} from '../types';

const toDate = (v: string | null | undefined): Date => {
  if (!v) return new Date(0);
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const WARRANTY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAINTENANCE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STATUS_COOLDOWN_MS = 10 * 60 * 1000;
const COMMENT_COOLDOWN_MS = 2 * 60 * 1000;

const rowToNotification = (row: any): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type as NotificationType,
  title: row.title,
  message: row.message,
  read: row.read,
  dedupeKey: row.dedupe_key ?? undefined,
  references: {
    equipmentId: row.equipment_id ?? undefined,
    ticketId: row.ticket_id ?? undefined,
    maintenanceId: row.maintenance_id ?? undefined
  },
  createdAt: toDate(row.created_at),
  expiresAt: toDate(row.expires_at)
});

const hasRecentDuplicate = async (params: {
  userId: string;
  type: NotificationType;
  dedupeKey: string;
  cooldownMs: number;
}): Promise<boolean> => {
  const { userId, type, dedupeKey, cooldownMs } = params;
  const since = new Date(Date.now() - cooldownMs).toISOString();

  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('dedupe_key', dedupeKey)
    .gte('created_at', since)
    .limit(1);

  return (data?.length ?? 0) > 0;
};

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return (data ?? []).map(rowToNotification);
}

export async function getUnreadNotifications(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', notificationId);
}

export async function createWarrantyExpiringNotification(
  equipment: Equipment,
  userId: string
): Promise<void> {
  if (!equipment.warrantyExpiration) return;

  const warrantyDate = new Date(equipment.warrantyExpiration as any);
  const days = Math.floor((warrantyDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days > 30 || days <= 0) return;

  const dedupeKey = `warranty:${equipment.id}:${warrantyDate.toISOString().slice(0, 10)}`;
  if (await hasRecentDuplicate({ userId, type: NotificationType.WARRANTY_EXPIRING, dedupeKey, cooldownMs: WARRANTY_COOLDOWN_MS })) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    type: NotificationType.WARRANTY_EXPIRING,
    dedupe_key: dedupeKey,
    title: '⚠️ Garantía próxima a vencer',
    message: `El equipo "${equipment.name}" vence garantía en ${days} días (${warrantyDate.toLocaleDateString()})`,
    read: false,
    equipment_id: equipment.id,
    expires_at: warrantyDate.toISOString()
  });
}

export async function createMaintenanceUpcomingNotification(
  maintenance: Maintenance,
  users: string[]
): Promise<void> {
  if (!maintenance.scheduledDate) return;

  const scheduledDate = new Date(maintenance.scheduledDate as any);
  const days = Math.floor((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days > 7 || days < 0) return;

  const dateKey = scheduledDate.toISOString().slice(0, 10);
  for (const userId of users) {
    const dedupeKey = `maintenance:${maintenance.id}:${dateKey}`;
    if (await hasRecentDuplicate({ userId, type: NotificationType.MAINTENANCE_UPCOMING, dedupeKey, cooldownMs: MAINTENANCE_COOLDOWN_MS })) continue;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: NotificationType.MAINTENANCE_UPCOMING,
      dedupe_key: dedupeKey,
      title: '🔧 Mantenimiento próximo',
      message: `Mantenimiento programado en ${days} días (${scheduledDate.toLocaleDateString()})`,
      read: false,
      maintenance_id: maintenance.id,
      equipment_id: maintenance.equipmentId,
      expires_at: scheduledDate.toISOString()
    });
  }
}

export async function createTicketStatusChangeNotification(
  ticket: Ticket,
  previousStatus: TicketStatus,
  changedBy: string,
  changedByName: string
): Promise<void> {
  const affected = new Set<string>();
  if (ticket.createdBy) affected.add(ticket.createdBy);
  if (ticket.assignedTo) affected.add(ticket.assignedTo);
  affected.delete(changedBy);

  for (const userId of affected) {
    const dedupeKey = `ticket-status:${ticket.id}:${previousStatus}->${ticket.status}:${changedBy}`;
    if (await hasRecentDuplicate({ userId, type: NotificationType.TICKET_STATUS_CHANGED, dedupeKey, cooldownMs: STATUS_COOLDOWN_MS })) continue;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: NotificationType.TICKET_STATUS_CHANGED,
      dedupe_key: dedupeKey,
      title: '📌 Cambio de estado en ticket',
      message: `Ticket #${ticket.ticketNumber} cambió de "${previousStatus}" a "${ticket.status}" por ${changedByName}`,
      read: false,
      ticket_id: ticket.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
}

export async function createTicketCommentNotification(
  ticket: Ticket,
  commentedBy: string,
  commentedByName: string,
  excerpt: string
): Promise<void> {
  const affected = new Set<string>();
  if (ticket.createdBy) affected.add(ticket.createdBy);
  if (ticket.assignedTo) affected.add(ticket.assignedTo);
  affected.delete(commentedBy);

  for (const userId of affected) {
    const dedupeKey = `ticket-comment:${ticket.id}:${commentedBy}:${excerpt.trim().toLowerCase().slice(0, 40)}`;
    if (await hasRecentDuplicate({ userId, type: NotificationType.TICKET_COMMENTED, dedupeKey, cooldownMs: COMMENT_COOLDOWN_MS })) continue;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: NotificationType.TICKET_COMMENTED,
      dedupe_key: dedupeKey,
      title: '💬 Nuevo comentario en ticket',
      message: `${commentedByName} comentó en #${ticket.ticketNumber}: "${excerpt.substring(0, 50)}..."`,
      read: false,
      ticket_id: ticket.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
}

export async function cleanExpiredNotifications(): Promise<void> {
  await supabase
    .from('notifications')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

export async function getNotificationsSummary(userId: string) {
  const notifications = await getUserNotifications(userId);
  return {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    byType: {
      warranty: notifications.filter(n => n.type === NotificationType.WARRANTY_EXPIRING).length,
      maintenance: notifications.filter(n => n.type === NotificationType.MAINTENANCE_UPCOMING).length,
      ticketStatus: notifications.filter(n => n.type === NotificationType.TICKET_STATUS_CHANGED).length,
      ticketComment: notifications.filter(n => n.type === NotificationType.TICKET_COMMENTED).length
    }
  };
}
