import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Maintenance, MaintenanceFilters, MaintenanceStatus, MaintenanceTask, MaintenanceType } from '../types';
import { getEquipment, getEquipmentById } from './equipment';
import { isAdmin as isAdminUser } from './users';
import { deleteFile, resolveAttachmentStoragePath } from './storage';

const COLLECTION_NAME = 'maintenances';

const getDefaultFrequencyForType = (type: MaintenanceType): Maintenance['frequency'] | undefined => {
  if (type === MaintenanceType.PREVENTIVO) {
    // Recomendación operativa por defecto para TI: cada 6 meses
    return 'semiannual';
  }
  return undefined;
};

/**
 * Obtiene todos los mantenimientos con filtros opcionales
 */
export const getMaintenances = async (filters?: MaintenanceFilters): Promise<Maintenance[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.company) {
      constraints.push(where('company', '==', filters.company));
    }
    if (filters?.equipmentId) {
      constraints.push(where('equipmentId', '==', filters.equipmentId));
    }
    if (filters?.type) {
      constraints.push(where('type', '==', filters.type));
    }
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters?.assignedTo) {
      constraints.push(where('assignedTo', '==', filters.assignedTo));
    }
    
    // NO usar orderBy en Firestore cuando hay filtros
    const hasAnyFilter = filters?.company || filters?.equipmentId || filters?.type || filters?.status || filters?.assignedTo;
    if (!hasAnyFilter) {
      constraints.push(orderBy('scheduledDate', 'asc'));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    let maintenances = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Maintenance[];
    
    // Ordenar en el cliente si hay filtros
    if (hasAnyFilter) {
      maintenances.sort((a, b) => {
        const aTime = a.scheduledDate instanceof Timestamp ? a.scheduledDate.toMillis() : new Date(a.scheduledDate).getTime();
        const bTime = b.scheduledDate instanceof Timestamp ? b.scheduledDate.toMillis() : new Date(b.scheduledDate).getTime();
        return aTime - bTime; // Ascendente
      });
    }
    
    // Filtro de fechas en cliente
    if (filters?.dateFrom || filters?.dateTo) {
      maintenances = maintenances.filter(m => {
        const mDate = m.scheduledDate instanceof Timestamp ? m.scheduledDate.toDate() : new Date(m.scheduledDate);
        
        if (filters.dateFrom && mDate < filters.dateFrom) {
          return false;
        }
        if (filters.dateTo && mDate > filters.dateTo) {
          return false;
        }
        return true;
      });
    }
    
    // Filtro de búsqueda en cliente
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      maintenances = maintenances.filter(m => 
        m.title.toLowerCase().includes(searchLower) ||
        m.equipmentName.toLowerCase().includes(searchLower) ||
        m.description.toLowerCase().includes(searchLower) ||
        m.assignedToName?.toLowerCase().includes(searchLower)
      );
    }
    
    return maintenances;
  } catch (error) {
    console.error('Error getting maintenances:', error);
    throw error;
  }
};

/**
 * Obtiene un mantenimiento por ID
 */
export const getMaintenanceById = async (id: string): Promise<Maintenance | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Maintenance;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting maintenance:', error);
    throw error;
  }
};

/**
 * Obtiene mantenimientos próximos (próximos 7 días)
 */
export const getUpcomingMaintenances = async (): Promise<Maintenance[]> => {
  try {
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    
    const allMaintenances = await getMaintenances({ status: MaintenanceStatus.PROGRAMADO });
    
    return allMaintenances.filter(m => {
      const schedDate = m.scheduledDate instanceof Timestamp ? m.scheduledDate.toDate() : new Date(m.scheduledDate);
      return schedDate >= now && schedDate <= next7Days;
    });
  } catch (error) {
    console.error('Error getting upcoming maintenances:', error);
    throw error;
  }
};

/**
 * Obtiene mantenimientos vencidos
 */
export const getOverdueMaintenances = async (): Promise<Maintenance[]> => {
  try {
    const now = new Date();
    const allMaintenances = await getMaintenances({ status: MaintenanceStatus.PROGRAMADO });
    
    return allMaintenances.filter(m => {
      const schedDate = m.scheduledDate instanceof Timestamp ? m.scheduledDate.toDate() : new Date(m.scheduledDate);
      return schedDate < now;
    });
  } catch (error) {
    console.error('Error getting overdue maintenances:', error);
    throw error;
  }
};

/**
 * Crea un nuevo mantenimiento
 */
export const createMaintenance = async (
  maintenance: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> => {
  try {
    const now = Timestamp.now();
    const { id: providedId, ...maintenanceData } = maintenance;
    
    // Limpiar campos undefined que Firebase no acepta
    const cleanData: any = {
      equipmentId: maintenanceData.equipmentId,
      equipmentName: maintenanceData.equipmentName,
      company: maintenanceData.company,
      type: maintenanceData.type,
      status: maintenanceData.status,
      title: maintenanceData.title,
      description: maintenanceData.description,
      scheduledDate: maintenanceData.scheduledDate,
      tasks: maintenanceData.tasks,
      createdBy: maintenanceData.createdBy,
      createdByName: maintenanceData.createdByName,
      createdAt: now,
      updatedAt: now,
    };
    
    // Solo agregar campos opcionales si tienen valor
    if (maintenanceData.notificationEmail) cleanData.notificationEmail = maintenanceData.notificationEmail;
    if (maintenanceData.assignedTo) cleanData.assignedTo = maintenanceData.assignedTo;
    if (maintenanceData.assignedToName) cleanData.assignedToName = maintenanceData.assignedToName;
    if (maintenanceData.frequency) cleanData.frequency = maintenanceData.frequency;
    if (maintenanceData.cost !== undefined) cleanData.cost = maintenanceData.cost;
    if (maintenanceData.notes) cleanData.notes = maintenanceData.notes;
    if (maintenanceData.completedDate) cleanData.completedDate = maintenanceData.completedDate;
    if (maintenanceData.nextMaintenanceDate) cleanData.nextMaintenanceDate = maintenanceData.nextMaintenanceDate;
    if (maintenanceData.attachments && maintenanceData.attachments.length > 0) cleanData.attachments = maintenanceData.attachments;

    if (providedId) {
      const docRef = doc(db, COLLECTION_NAME, providedId);
      await setDoc(docRef, cleanData);
      return providedId;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), cleanData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating maintenance:', error);
    throw error;
  }
};

/**
 * Actualiza un mantenimiento existente
 */
export const updateMaintenance = async (id: string, updates: Partial<Maintenance>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    // Limpiar campos undefined
    const cleanUpdates: any = {
      updatedAt: Timestamp.now(),
    };
    
    // Solo agregar campos que tienen valor
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        cleanUpdates[key] = value;
      }
    });
    
    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.error('Error updating maintenance:', error);
    throw error;
  }
};

/**
 * Actualiza una tarea del checklist
 */
export const updateMaintenanceTask = async (
  maintenanceId: string,
  taskId: string,
  updates: Partial<MaintenanceTask>
): Promise<void> => {
  try {
    const maintenance = await getMaintenanceById(maintenanceId);
    if (!maintenance) {
      throw new Error('Maintenance not found');
    }
    
    const updatedTasks = maintenance.tasks.map(task =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    
    await updateMaintenance(maintenanceId, { tasks: updatedTasks });
  } catch (error) {
    console.error('Error updating maintenance task:', error);
    throw error;
  }
};

/**
 * Completa un mantenimiento
 */
export const completeMaintenance = async (
  id: string,
  userId: string,
  userName: string,
  notes?: string
): Promise<void> => {
  try {
    const maintenance = await getMaintenanceById(id);
    if (!maintenance) {
      throw new Error('Maintenance not found');
    }

    // Evitar duplicar auto-agendado si el mantenimiento ya estaba completado
    if (maintenance.status === MaintenanceStatus.COMPLETADO) {
      if (notes !== undefined) {
        await updateMaintenance(id, { notes });
      }
      return;
    }

    const effectiveFrequency = maintenance.frequency || getDefaultFrequencyForType(maintenance.type);
    const completedAt = Timestamp.now();
    const completedAtDate = completedAt.toDate();
    completedAtDate.setHours(0, 0, 0, 0);
    
    const updates: Partial<Maintenance> = {
      status: MaintenanceStatus.COMPLETADO,
      completedDate: completedAt,
      notes: notes || maintenance.notes,
    };

    if (!maintenance.frequency && effectiveFrequency) {
      updates.frequency = effectiveFrequency;
    }
    
    // Si tiene frecuencia, programar el siguiente
    if (effectiveFrequency) {
      const nextDate = calculateNextMaintenanceDate(
        completedAtDate,
        effectiveFrequency
      );
      updates.nextMaintenanceDate = Timestamp.fromDate(nextDate);
    }
    
    await updateMaintenance(id, updates);
    
    // Si tiene frecuencia, crear el siguiente mantenimiento automáticamente
    if (effectiveFrequency && updates.nextMaintenanceDate) {
      const incompleteTasks = maintenance.tasks.map(task => ({
        ...task,
        completed: false,
        completedBy: undefined,
        completedAt: undefined,
      }));
      
      await createMaintenance({
        ...maintenance,
        scheduledDate: updates.nextMaintenanceDate,
        status: MaintenanceStatus.PROGRAMADO,
        completedDate: undefined,
        frequency: effectiveFrequency,
        tasks: incompleteTasks,
        createdBy: userId,
        createdByName: userName,
      });
    }
  } catch (error) {
    console.error('Error completing maintenance:', error);
    throw error;
  }
};

/**
 * Calcula la próxima fecha de mantenimiento basada en la frecuencia
 */
const calculateNextMaintenanceDate = (
  currentDate: Date,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
): Date => {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semiannual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'annual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
};

/**
 * Actualiza el estado de un mantenimiento
 */
export const updateMaintenanceStatus = async (id: string, status: MaintenanceStatus): Promise<void> => {
  try {
    await updateMaintenance(id, { status });
  } catch (error) {
    console.error('Error updating maintenance status:', error);
    throw error;
  }
};

/**
 * Elimina un mantenimiento
 */
export const deleteMaintenance = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    // Limpiar adjuntos asociados en Storage antes de eliminar el documento
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const maintenance = docSnap.data() as Maintenance;
      const attachments = maintenance.attachments || [];

      if (attachments.length > 0) {
        const deletions = attachments.map(async (attachment) => {
          const storagePath = resolveAttachmentStoragePath(attachment);
          if (!storagePath) return;
          await deleteFile(storagePath);
        });

        const results = await Promise.allSettled(deletions);
        const failedDeletes = results.filter((result) => result.status === 'rejected');

        if (failedDeletes.length > 0) {
          console.error(`Error deleting ${failedDeletes.length} maintenance attachment(s) from storage`);
        }
      }
    }

    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting maintenance:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de mantenimientos
 */
export const getMaintenanceStats = async () => {
  try {
    const allMaintenances = await getMaintenances();
    const upcoming = await getUpcomingMaintenances();
    const overdue = await getOverdueMaintenances();
    
    const byStatus = allMaintenances.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {} as Record<MaintenanceStatus, number>);
    
    const byType = allMaintenances.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: allMaintenances.length,
      upcoming: upcoming.length,
      overdue: overdue.length,
      byStatus,
      byType,
    };
  } catch (error) {
    console.error('Error getting maintenance stats:', error);
    throw error;
  }
};

/**
 * Obtiene mantenimientos programados pendientes de confirmar hora
 */
export const getPendingTimeConfirmationMaintenances = async (
  assignedToId?: string
): Promise<Maintenance[]> => {
  try {
    const constraints: QueryConstraint[] = [
      where('status', '==', MaintenanceStatus.PROGRAMADO),
    ];

    // No buscar por timeConfirmationStatus si no existe, pero filtrar en cliente
    if (assignedToId) {
      constraints.push(where('assignedTo', '==', assignedToId));
    }

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);

    const maintenances = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Maintenance[];

    // Filtrar en cliente: incluir solo mantenimientos que NO estén confirmados
    const pendingMaintenances = maintenances.filter((m) => m.timeConfirmationStatus !== 'confirmed');

    // Ordenar por fecha
    pendingMaintenances.sort((a, b) => {
      const aTime =
        a.scheduledDate instanceof Timestamp
          ? a.scheduledDate.toMillis()
          : new Date(a.scheduledDate).getTime();
      const bTime =
        b.scheduledDate instanceof Timestamp
          ? b.scheduledDate.toMillis()
          : new Date(b.scheduledDate).getTime();
      return aTime - bTime;
    });

    return pendingMaintenances;
  } catch (error) {
    console.error('Error getting pending time confirmation maintenances:', error);
    throw error;
  }
};

/**
 * Obtiene mantenimientos pendientes de confirmar para el usuario actual.
 * Si el usuario es administrador, devuelve todos los pendientes.
 * Si no, filtra por equipos asignados al usuario y también por mantenimiento asignado directamente.
 */
export const getPendingTimeConfirmationMaintenancesForUser = async (
  userId?: string,
  isAdmin = false
): Promise<Maintenance[]> => {
  try {
    // Obtener TODOS los pending (sin filtro de asignación)
    const allPending = await getPendingTimeConfirmationMaintenances(undefined);

    if (!userId || isAdmin) {
      return allPending;
    }

    // Para usuarios normales: filtrar por asignación directa O equipos asignados
    const userEquipment = await getEquipment({ assignedTo: userId });
    const userEquipmentIds = new Set(userEquipment.map((eq) => eq.id));

    const filtered = allPending.filter((maintenance) => {
      return maintenance.assignedTo === userId || userEquipmentIds.has(maintenance.equipmentId);
    });

    return filtered;
  } catch (error) {
    console.error('Error getting pending time confirmation maintenances for user:', error);
    throw error;
  }
};

/**
 * Confirma la hora de un mantenimiento
 */
export const confirmMaintenanceTime = async (
  maintenanceId: string,
  scheduledTime: string, // HH:mm
  confirmedBy: string,
  confirmedByName: string
): Promise<void> => {
  try {
    const maintenance = await getMaintenanceById(maintenanceId);
    if (!maintenance) {
      throw new Error('Mantenimiento no encontrado');
    }

    if (maintenance.timeConfirmationStatus === 'confirmed') {
      throw new Error('Este mantenimiento ya fue confirmado');
    }

    if (maintenance.status !== MaintenanceStatus.PROGRAMADO) {
      throw new Error('Solo se puede confirmar hora en mantenimientos programados');
    }

    const confirmerIsAdmin = await isAdminUser(confirmedBy);
    if (confirmerIsAdmin) {
      throw new Error('La hora debe ser confirmada por el usuario responsable, no por administrador');
    }

    const equipment = await getEquipmentById(maintenance.equipmentId);
    const isAssignedTechnician = maintenance.assignedTo === confirmedBy;
    const isAssignedEquipmentUser = equipment?.assignedTo === confirmedBy;

    if (!isAssignedTechnician && !isAssignedEquipmentUser) {
      throw new Error('No tienes permisos para confirmar la hora de este mantenimiento');
    }

    const maintenanceRef = doc(db, COLLECTION_NAME, maintenanceId);

    await updateDoc(maintenanceRef, {
      scheduledTime,
      timeConfirmationStatus: 'confirmed',
      timeConfirmedBy: confirmedBy,
      timeConfirmedByName: confirmedByName,
      timeConfirmedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error confirming maintenance time:', error);
    throw error;
  }
};

/**
 * Obtiene mantenimientos por rango de fecha y hora (para ver calendario de disponibilidad)
 */
export const getMaintenancesByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<Maintenance[]> => {
  try {
    // En cliente: obtener todos y filtrar
    const allMaintenances = await getMaintenances();

    return allMaintenances.filter((m) => {
      const mDate =
        m.scheduledDate instanceof Timestamp
          ? m.scheduledDate.toDate()
          : new Date(m.scheduledDate);
      return mDate >= startDate && mDate <= endDate && m.timeConfirmationStatus === 'confirmed';
    });
  } catch (error) {
    console.error('Error getting maintenances by date range:', error);
    throw error;
  }
};
