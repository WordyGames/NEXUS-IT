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
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ticket, TicketFilters, TicketComment, TicketStatus } from '../types';
import { generateTicketNumber } from '../utils/helpers';
import { deleteFile, resolveAttachmentStoragePath } from './storage';

const COLLECTION_NAME = 'tickets';
const COMMENTS_COLLECTION = 'comments';

const getTicketSortValue = (ticket: Ticket) => {
  const createdAt: any = ticket.createdAt;
  if (!createdAt) return 0;
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'object' && 'toDate' in createdAt) {
    return createdAt.toDate().getTime();
  }
  if (typeof createdAt === 'object' && 'seconds' in createdAt) {
    return createdAt.seconds * 1000;
  }
  const parsed = new Date(createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isIndexError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('index') || message.includes('FAILED_PRECONDITION');
};

const fetchTickets = async (constraints: QueryConstraint[], includeOrderBy: boolean) => {
  const effectiveConstraints = includeOrderBy
    ? [...constraints, orderBy('createdAt', 'desc')]
    : constraints;

  const q = query(collection(db, COLLECTION_NAME), ...effectiveConstraints);
  const querySnapshot = await getDocs(q);

  let tickets = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Ticket[];

  if (!includeOrderBy) {
    tickets.sort((a, b) => getTicketSortValue(b) - getTicketSortValue(a));
  }

  return tickets;
};

/**
 * Obtiene todos los tickets con filtros opcionales
 */
export const getTickets = async (filters?: TicketFilters): Promise<Ticket[]> => {
  try {
    const constraints: QueryConstraint[] = [];
    
    if (filters?.company) {
      constraints.push(where('company', '==', filters.company));
    }
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters?.priority) {
      constraints.push(where('priority', '==', filters.priority));
    }
    if (filters?.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters?.assignedTo) {
      constraints.push(where('assignedTo', '==', filters.assignedTo));
    }
    if (filters?.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy));
    }
    if (filters?.createdByName) {
      constraints.push(where('createdByName', '==', filters.createdByName));
    }
    
    let tickets = await fetchTickets(constraints, true).catch(async (error) => {
      if (isIndexError(error)) {
        return fetchTickets(constraints, false);
      }
      throw error;
    });
    
    // Filtro de búsqueda en cliente
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      tickets = tickets.filter(ticket => 
        ticket.title.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.ticketNumber.toLowerCase().includes(searchLower)
      );
    }
    
    return tickets;
  } catch (error) {
    console.error('Error getting tickets:', error);
    throw error;
  }
};

/**
 * Obtiene un ticket por ID
 */
export const getTicketById = async (id: string): Promise<Ticket | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Ticket;
    }
    return null;
  } catch (error) {
    console.error('Error getting ticket by ID:', error);
    throw error;
  }
};

/**
 * Crea un nuevo ticket
 */
export const createTicket = async (
  ticket: Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'comments'> & { id?: string }
): Promise<string> => {
  try {
    const now = Timestamp.now();
    const ticketNumber = generateTicketNumber();

    const { id: providedId, ...ticketData } = ticket;
    const payload = {
      ...ticketData,
      ticketNumber,
      comments: [],
      createdAt: now,
      updatedAt: now
    };

    if (providedId) {
      const docRef = doc(db, COLLECTION_NAME, providedId);
      await setDoc(docRef, payload);
      return providedId;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
    return docRef.id;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

/**
 * Actualiza un ticket existente
 */
export const updateTicket = async (id: string, data: Partial<Ticket>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const updates: any = {
      ...data,
      updatedAt: Timestamp.now()
    };
    
    // Si se está resolviendo el ticket
    if (data.status === TicketStatus.RESOLVED && !data.resolvedAt) {
      updates.resolvedAt = Timestamp.now();
    }
    
    // Si se está cerrando el ticket
    if (data.status === TicketStatus.CLOSED && !data.closedAt) {
      updates.closedAt = Timestamp.now();
    }
    
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating ticket:', error);
    throw error;
  }
};

/**
 * Elimina un ticket
 */
export const deleteTicket = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    // Limpiar adjuntos del ticket antes de eliminarlo
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const ticket = docSnap.data() as Ticket;
      const ticketAttachments = ticket.attachments || [];
      const commentsAttachments = (ticket.comments || [])
        .flatMap((comment) => comment.attachments || []);
      const attachments = [...ticketAttachments, ...commentsAttachments];

      if (attachments.length > 0) {
        const deletions = attachments.map(async (attachment) => {
          const storagePath = resolveAttachmentStoragePath(attachment);
          if (!storagePath) return;
          await deleteFile(storagePath);
        });

        const results = await Promise.allSettled(deletions);
        const failedDeletes = results.filter((result) => result.status === 'rejected');

        if (failedDeletes.length > 0) {
          console.error(`Error deleting ${failedDeletes.length} ticket attachment(s) from storage`);
        }
      }
    }

    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting ticket:', error);
    throw error;
  }
};

/**
 * Agrega un comentario a un ticket
 */
export const addTicketComment = async (ticketId: string, comment: Omit<TicketComment, 'id' | 'ticketId' | 'createdAt'>): Promise<void> => {
  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error('Ticket not found');
    
    const newComment: TicketComment = {
      id: Date.now().toString(),
      ticketId,
      ...comment,
      createdAt: Timestamp.now()
    };
    
    const comments = [...(ticket.comments || []), newComment];
    await updateTicket(ticketId, { comments });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de tickets
 */
export const getTicketStats = async () => {
  try {
    const tickets = await getTickets();
    
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    tickets.forEach(ticket => {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;
      
      if (ticket.resolvedAt && ticket.createdAt) {
        const created = ticket.createdAt instanceof Timestamp ? ticket.createdAt.toDate() : ticket.createdAt;
        const resolved = ticket.resolvedAt instanceof Timestamp ? ticket.resolvedAt.toDate() : ticket.resolvedAt;
        const diff = resolved.getTime() - created.getTime();
        totalResolutionTime += diff / (1000 * 60 * 60); // en horas
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
  } catch (error) {
    console.error('Error getting ticket stats:', error);
    throw error;
  }
};
