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
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Equipment, EquipmentFilters } from '../types';

const COLLECTION_NAME = 'equipment';

/**
 * Obtiene todos los equipos con filtros opcionales
 */
export const getEquipment = async (filters?: EquipmentFilters): Promise<Equipment[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.company) {
      constraints.push(where('company', '==', filters.company));
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
    
    // NO usar orderBy en Firestore cuando hay filtros (evita requerir índices compuestos)
    // Solo ordenar en Firestore si NO hay ningún filtro
    const hasAnyFilter = filters?.company || filters?.type || filters?.status || filters?.assignedTo;
    if (!hasAnyFilter) {
      constraints.push(orderBy('createdAt', 'desc'));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const querySnapshot = await getDocs(q);
    
    let equipment = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Equipment[];
    
    // Si hay algún filtro, ordenar en el cliente
    if (hasAnyFilter) {
      equipment.sort((a, b) => {
        const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return bTime - aTime; // Descendente
      });
    }
    
    // Filtro de búsqueda en cliente
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      equipment = equipment.filter(eq => 
        eq.name.toLowerCase().includes(searchLower) ||
        eq.specs?.hostname?.toLowerCase().includes(searchLower) ||
        eq.specs?.serialNumber?.toLowerCase().includes(searchLower) ||
        eq.location.toLowerCase().includes(searchLower)
      );
    }
    
    return equipment;
  } catch (error) {
    console.error('Error getting equipment:', error);
    throw error;
  }
};

/**
 * Obtiene un equipo por ID
 */
export const getEquipmentById = async (id: string): Promise<Equipment | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Equipment;
    }
    return null;
  } catch (error) {
    console.error('Error getting equipment by ID:', error);
    throw error;
  }
};

/**
 * Crea un nuevo equipo
 */
export const createEquipment = async (equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...equipment,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating equipment:', error);
    throw error;
  }
};

/**
 * Actualiza un equipo existente
 */
export const updateEquipment = async (id: string, data: Partial<Equipment>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    throw error;
  }
};

/**
 * Elimina un equipo
 */
export const deleteEquipment = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting equipment:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de equipos
 */
export const getEquipmentStats = async () => {
  try {
    const equipment = await getEquipment();
    
    const byCompany: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    equipment.forEach(eq => {
      byCompany[eq.company] = (byCompany[eq.company] || 0) + 1;
      byStatus[eq.status] = (byStatus[eq.status] || 0) + 1;
      byType[eq.type] = (byType[eq.type] || 0) + 1;
    });
    
    return {
      total: equipment.length,
      byCompany,
      byStatus,
      byType
    };
  } catch (error) {
    console.error('Error getting equipment stats:', error);
    throw error;
  }
};
