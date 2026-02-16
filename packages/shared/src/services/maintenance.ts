import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Maintenance, MaintenanceFilters, MaintenanceStatus, MaintenanceTask } from '../types';

const COLLECTION_NAME = 'maintenances';

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
export const createMaintenance = async (maintenance: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    // Limpiar campos undefined que Firebase no acepta
    const cleanData: any = {
      equipmentId: maintenance.equipmentId,
      equipmentName: maintenance.equipmentName,
      company: maintenance.company,
      type: maintenance.type,
      status: maintenance.status,
      title: maintenance.title,
      description: maintenance.description,
      scheduledDate: maintenance.scheduledDate,
      tasks: maintenance.tasks,
      createdBy: maintenance.createdBy,
      createdByName: maintenance.createdByName,
      createdAt: now,
      updatedAt: now,
    };
    
    // Solo agregar campos opcionales si tienen valor
    if (maintenance.assignedTo) cleanData.assignedTo = maintenance.assignedTo;
    if (maintenance.assignedToName) cleanData.assignedToName = maintenance.assignedToName;
    if (maintenance.frequency) cleanData.frequency = maintenance.frequency;
    if (maintenance.cost !== undefined) cleanData.cost = maintenance.cost;
    if (maintenance.notes) cleanData.notes = maintenance.notes;
    if (maintenance.completedDate) cleanData.completedDate = maintenance.completedDate;
    if (maintenance.nextMaintenanceDate) cleanData.nextMaintenanceDate = maintenance.nextMaintenanceDate;
    if (maintenance.attachments && maintenance.attachments.length > 0) cleanData.attachments = maintenance.attachments;
    
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
    
    const updates: Partial<Maintenance> = {
      status: MaintenanceStatus.COMPLETADO,
      completedDate: Timestamp.now(),
      notes: notes || maintenance.notes,
    };
    
    // Si tiene frecuencia, programar el siguiente
    if (maintenance.frequency) {
      const nextDate = calculateNextMaintenanceDate(
        maintenance.scheduledDate instanceof Timestamp 
          ? maintenance.scheduledDate.toDate() 
          : new Date(maintenance.scheduledDate),
        maintenance.frequency
      );
      updates.nextMaintenanceDate = Timestamp.fromDate(nextDate);
    }
    
    await updateMaintenance(id, updates);
    
    // Si tiene frecuencia, crear el siguiente mantenimiento automáticamente
    if (maintenance.frequency && updates.nextMaintenanceDate) {
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
