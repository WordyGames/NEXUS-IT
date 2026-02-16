import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Notification,
  NotificationType,
  Equipment,
  Ticket,
  Maintenance,
  TicketStatus
} from '../types';

/**
 * Servicio de notificaciones inteligentes
 * Gestiona alertas de garantía, mantenimiento y cambios de tickets
 */

// Obtener notificaciones del usuario
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  try {
    // Query sin orderBy para evitar necesidad de índice compuesto
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(100)
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      ...(doc.data() as Notification),
      id: doc.id
    }));
    
    // Ordenar en memoria en lugar de en Firestore
    return notifications.sort((a, b) => {
      const dateA = new Date(a.createdAt as any).getTime();
      const dateB = new Date(b.createdAt as any).getTime();
      return dateB - dateA; // desc
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// Obtener notificaciones no leídas
export async function getUnreadNotifications(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

// Marcar notificación como leída
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

// Marcar todas como leídas
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}

// Eliminar notificación
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}

// Crear notificación de garantía próxima a vencer (30 días)
export async function createWarrantyExpiringNotification(
  equipment: Equipment,
  userId: string
): Promise<void> {
  if (!equipment.warrantyExpiration) return;

  try {
    const warrantyDate = new Date(equipment.warrantyExpiration as any);
    const daysUntilExpiration = Math.floor(
      (warrantyDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
      // Verificar si ya existe notificación similar reciente
      const existingQ = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('type', '==', NotificationType.WARRANTY_EXPIRING),
        where('references.equipmentId', '==', equipment.id)
      );
      
      const existing = await getDocs(existingQ);
      if (existing.size > 0) return; // Ya existe notificación

      await addDoc(collection(db, 'notifications'), {
        userId,
        type: NotificationType.WARRANTY_EXPIRING,
        title: `⚠️ Garantía próxima a vencer`,
        message: `El equipo "${equipment.name}" vence garantía en ${daysUntilExpiration} días (${warrantyDate.toLocaleDateString()})`,
        read: false,
        references: {
          equipmentId: equipment.id
        },
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(warrantyDate)
      });
    }
  } catch (error) {
    console.error('Error creating warranty notification:', error);
  }
}

// Crear notificación de mantenimiento próximo
export async function createMaintenanceUpcomingNotification(
  maintenance: Maintenance,
  users: string[]
): Promise<void> {
  if (!maintenance.scheduledDate) return;

  try {
    const scheduledDate = new Date(maintenance.scheduledDate as any);
    const daysUntilMaintenance = Math.floor(
      (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Notificar si es en los próximos 7 días
    if (daysUntilMaintenance <= 7 && daysUntilMaintenance >= 0) {
      for (const userId of users) {
        // Verificar si ya existe
        const existingQ = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('type', '==', NotificationType.MAINTENANCE_UPCOMING),
          where('references.maintenanceId', '==', maintenance.id)
        );
        
        const existing = await getDocs(existingQ);
        if (existing.size > 0) continue;

        await addDoc(collection(db, 'notifications'), {
          userId,
          type: NotificationType.MAINTENANCE_UPCOMING,
          title: `🔧 Mantenimiento próximo`,
          message: `Mantenimiento programado en ${daysUntilMaintenance} días (${scheduledDate.toLocaleDateString()})`,
          read: false,
          references: {
            maintenanceId: maintenance.id,
            equipmentId: maintenance.equipmentId
          },
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(scheduledDate)
        });
      }
    }
  } catch (error) {
    console.error('Error creating maintenance notification:', error);
  }
}

// Crear notificación de cambio de estado de ticket
export async function createTicketStatusChangeNotification(
  ticket: Ticket,
  previousStatus: TicketStatus,
  changedBy: string,
  changedByName: string
): Promise<void> {
  try {
    // Notificar al creador y al asignado si cambió de estado
    const affectedUsers = new Set<string>();
    if (ticket.createdBy) affectedUsers.add(ticket.createdBy);
    if (ticket.assignedTo) affectedUsers.add(ticket.assignedTo);

    // No notificar a quien hizo el cambio
    affectedUsers.delete(changedBy);

    for (const userId of affectedUsers) {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: NotificationType.TICKET_STATUS_CHANGED,
        title: `📌 Cambio de estado en ticket`,
        message: `Ticket #${ticket.ticketNumber} cambió de "${previousStatus}" a "${ticket.status}" por ${changedByName}`,
        read: false,
        references: {
          ticketId: ticket.id
        },
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      });
    }
  } catch (error) {
    console.error('Error creating status change notification:', error);
  }
}

// Crear notificación de comentario en ticket
export async function createTicketCommentNotification(
  ticket: Ticket,
  commentedBy: string,
  commentedByName: string,
  excerpt: string
): Promise<void> {
  try {
    // Notificar a todos excepto quién comentó
    const affectedUsers = new Set<string>();
    if (ticket.createdBy) affectedUsers.add(ticket.createdBy);
    if (ticket.assignedTo) affectedUsers.add(ticket.assignedTo);
    affectedUsers.delete(commentedBy);

    for (const userId of affectedUsers) {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: NotificationType.TICKET_COMMENTED,
        title: `💬 Nuevo comentario en ticket`,
        message: `${commentedByName} comentó en #${ticket.ticketNumber}: "${excerpt.substring(0, 50)}..."`,
        read: false,
        references: {
          ticketId: ticket.id
        },
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      });
    }
  } catch (error) {
    console.error('Error creating comment notification:', error);
  }
}

// Limpiar notificaciones expiradas
export async function cleanExpiredNotifications(): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('expiresAt', '<', Timestamp.now())
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (snapshot.size > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error cleaning expired notifications:', error);
  }
}

// Obtener resumen de notificaciones para dashboard
export async function getNotificationsSummary(userId: string) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      ...(doc.data() as Notification),
      id: doc.id
    }));

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
  } catch (error) {
    console.error('Error getting notifications summary:', error);
    return {
      total: 0,
      unread: 0,
      byType: {
        warranty: 0,
        maintenance: 0,
        ticketStatus: 0,
        ticketComment: 0
      }
    };
  }
}
