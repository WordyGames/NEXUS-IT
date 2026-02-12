/**
 * Integración de notificaciones automáticas
 * Funciones helper para disparar notificaciones en eventos clave
 */

import { Equipment, Ticket, Maintenance, TicketStatus, User } from '../types';
import {
  createWarrantyExpiringNotification,
  createMaintenanceUpcomingNotification,
  createTicketStatusChangeNotification,
  createTicketCommentNotification
} from './notifications';
import { getUsers } from './users';

/**
 * Genera notificaciones cuando un equipo se crea o actualiza
 * Verifica garantía próxima a vencer
 */
export async function triggerEquipmentNotifications(equipment: Equipment): Promise<void> {
  try {
    // Obtener todos los admins para notificarles sobre garantía
    const users = await getUsers();
    const adminIds = users
      .filter((u: User) => u.role === 'admin')
      .map((u: User) => u.id);

    for (const adminId of adminIds) {
      await createWarrantyExpiringNotification(equipment, adminId);
    }
  } catch (error) {
    console.error('Error triggering equipment notifications:', error);
  }
}

/**
 * Genera notificaciones cuando un mantenimiento se crea o actualiza
 */
export async function triggerMaintenanceNotifications(maintenance: Maintenance): Promise<void> {
  try {
    // Notificar a todos los usuarios (técnicos y admins)
    const users = await getUsers();
    const userIds = users.map((u: User) => u.id);

    await createMaintenanceUpcomingNotification(maintenance, userIds);
  } catch (error) {
    console.error('Error triggering maintenance notifications:', error);
  }
}

/**
 * Genera notificación cuando cambia el estado de un ticket
 */
export async function triggerTicketStatusChange(
  ticket: Ticket,
  previousStatus: TicketStatus,
  changedBy: string,
  changedByName: string
): Promise<void> {
  try {
    await createTicketStatusChangeNotification(
      ticket,
      previousStatus,
      changedBy,
      changedByName
    );
  } catch (error) {
    console.error('Error triggering ticket status change notification:', error);
  }
}

/**
 * Genera notificación cuando se agrega comentario a un ticket
 */
export async function triggerTicketComment(
  ticket: Ticket,
  commentedBy: string,
  commentedByName: string,
  commentText: string
): Promise<void> {
  try {
    // Limitar el extracto a 100 caracteres
    const excerpt = commentText.substring(0, 100);
    await createTicketCommentNotification(
      ticket,
      commentedBy,
      commentedByName,
      excerpt
    );
  } catch (error) {
    console.error('Error triggering ticket comment notification:', error);
  }
}
