import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  QueryConstraint,
  query,
  setDoc,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { SupportChatMessage, SupportChatSender, SupportChatThread } from '../types';

const SUPPORT_CHATS_COLLECTION = 'supportChats';
const MESSAGES_COLLECTION = 'messages';

const toDate = (value: unknown): Date => {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const withToDate = value as { toDate: () => Date };
    return withToDate.toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const withSeconds = value as { seconds: number };
    return new Date(withSeconds.seconds * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const normalizeText = (text: string) => text.trim().replace(/\s+/g, ' ');

const buildThreadRef = (userId: string) => doc(db, SUPPORT_CHATS_COLLECTION, userId);

const buildMessagesCollectionRef = (userId: string) =>
  collection(db, SUPPORT_CHATS_COLLECTION, userId, MESSAGES_COLLECTION);

const normalizeUserId = (userId: string) => userId.trim();

const isIndexError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('index') || message.includes('FAILED_PRECONDITION');
};

const parseThread = (id: string, data: Omit<SupportChatThread, 'id'>): SupportChatThread => ({
  id,
  ...data
});

const parseMessage = (id: string, data: Omit<SupportChatMessage, 'id'>): SupportChatMessage => ({
  id,
  ...data
});

const getSortValue = (value: unknown) => toDate(value).getTime();

const ensureThread = async (userId: string, userName: string): Promise<void> => {
  const threadRef = buildThreadRef(userId);
  const threadSnapshot = await getDoc(threadRef);
  const now = Timestamp.now();

  if (!threadSnapshot.exists()) {
    const payload: Omit<SupportChatThread, 'id'> = {
      userId,
      userName,
      hasUnreadForUser: false,
      hasUnreadForAdmin: false,
      userLastReadAt: now,
      adminLastReadAt: now,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(threadRef, payload, { merge: true });
    return;
  }

  await setDoc(
    threadRef,
    {
      userName,
      updatedAt: now
    },
    { merge: true }
  );
};

/**
 * Obtiene el hilo individual de un usuario.
 */
export const getSupportChatThread = async (userId: string): Promise<SupportChatThread | null> => {
  if (!userId?.trim()) {
    throw new Error('userId es requerido para cargar el chat');
  }

  try {
    const threadRef = buildThreadRef(normalizeUserId(userId));
    const threadSnapshot = await getDoc(threadRef);

    if (!threadSnapshot.exists()) {
      return null;
    }

    return parseThread(threadSnapshot.id, threadSnapshot.data() as Omit<SupportChatThread, 'id'>);
  } catch (error) {
    console.error('Error getting support chat thread:', error);
    throw error;
  }
};

/**
 * Suscribe en tiempo real al hilo individual de chat de un usuario.
 */
export const subscribeSupportChatThread = (
  userId: string,
  onData: (thread: SupportChatThread | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe => {
  if (!userId?.trim()) {
    throw new Error('userId es requerido para suscribirse al chat');
  }

  const threadRef = buildThreadRef(normalizeUserId(userId));

  return onSnapshot(
    threadRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(parseThread(snapshot.id, snapshot.data() as Omit<SupportChatThread, 'id'>));
    },
    (error) => {
      console.error('Error subscribing support chat thread:', error);
      if (onError) onError(error);
    }
  );
};

const fetchThreads = async (constraints: QueryConstraint[], includeOrderBy: boolean) => {
  const effectiveConstraints = includeOrderBy
    ? [...constraints, orderBy('updatedAt', 'desc')]
    : constraints;

  const snapshot = await getDocs(query(collection(db, SUPPORT_CHATS_COLLECTION), ...effectiveConstraints));
  const rows = snapshot.docs.map((threadDoc) =>
    parseThread(threadDoc.id, threadDoc.data() as Omit<SupportChatThread, 'id'>)
  );

  if (!includeOrderBy) {
    rows.sort((a, b) => getSortValue(b.updatedAt) - getSortValue(a.updatedAt));
  }

  return rows;
};

/**
 * Obtiene los hilos de chat para inbox de soporte (admin).
 */
export const getSupportChatThreads = async (maxItems = 200): Promise<SupportChatThread[]> => {
  const safeLimit = Math.min(Math.max(maxItems, 1), 500);
  const constraints: QueryConstraint[] = [limit(safeLimit)];

  try {
    return await fetchThreads(constraints, true).catch(async (error) => {
      if (isIndexError(error)) {
        return fetchThreads(constraints, false);
      }
      throw error;
    });
  } catch (error) {
    console.error('Error getting support chat threads:', error);
    throw error;
  }
};

/**
 * Suscribe en tiempo real al inbox de chats (admin).
 */
export const subscribeSupportChatThreads = (
  onData: (threads: SupportChatThread[]) => void,
  options?: { maxItems?: number; onError?: (error: unknown) => void }
): Unsubscribe => {
  const safeLimit = Math.min(Math.max(options?.maxItems ?? 200, 1), 500);
  const q = query(
    collection(db, SUPPORT_CHATS_COLLECTION),
    orderBy('updatedAt', 'desc'),
    limit(safeLimit)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((threadDoc) =>
        parseThread(threadDoc.id, threadDoc.data() as Omit<SupportChatThread, 'id'>)
      );
      onData(rows);
    },
    (error) => {
      console.error('Error subscribing support chat threads:', error);
      if (options?.onError) options.onError(error);
    }
  );
};

/**
 * Obtiene los mensajes del chat individual de un usuario.
 */
export const getSupportChatMessages = async (userId: string, maxItems = 200): Promise<SupportChatMessage[]> => {
  if (!userId?.trim()) {
    throw new Error('userId es requerido para cargar mensajes de chat');
  }

  const safeLimit = Math.min(Math.max(maxItems, 1), 500);
  const normalizedUserId = normalizeUserId(userId);

  try {
    const messagesRef = buildMessagesCollectionRef(normalizedUserId);
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(safeLimit));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((messageDoc) =>
      parseMessage(messageDoc.id, messageDoc.data() as Omit<SupportChatMessage, 'id'>)
    );
  } catch (error) {
    console.error('Error getting support chat messages with orderBy:', error);

    const fallbackSnapshot = await getDocs(
      query(buildMessagesCollectionRef(normalizedUserId), limit(safeLimit))
    );

    return fallbackSnapshot.docs
      .map((messageDoc) =>
        parseMessage(messageDoc.id, messageDoc.data() as Omit<SupportChatMessage, 'id'>)
      )
      .sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime());
  }
};

/**
 * Suscribe en tiempo real a los mensajes de un chat individual.
 */
export const subscribeSupportChatMessages = (
  userId: string,
  onData: (messages: SupportChatMessage[]) => void,
  options?: { maxItems?: number; onError?: (error: unknown) => void }
): Unsubscribe => {
  if (!userId?.trim()) {
    throw new Error('userId es requerido para suscribirse a mensajes de chat');
  }

  const safeLimit = Math.min(Math.max(options?.maxItems ?? 200, 1), 500);
  const q = query(
    buildMessagesCollectionRef(normalizeUserId(userId)),
    orderBy('createdAt', 'asc'),
    limit(safeLimit)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((messageDoc) =>
        parseMessage(messageDoc.id, messageDoc.data() as Omit<SupportChatMessage, 'id'>)
      );
      onData(rows);
    },
    (error) => {
      console.error('Error subscribing support chat messages:', error);
      if (options?.onError) options.onError(error);
    }
  );
};

/**
 * Envía un mensaje al chat individual del usuario.
 */
export const sendSupportChatMessage = async (params: {
  userId: string;
  userName: string;
  text: string;
  sender?: SupportChatSender;
  senderName?: string;
}): Promise<string> => {
  const normalizedUserId = params.userId?.trim();
  const normalizedUserName = params.userName?.trim();
  const normalizedSenderName = params.senderName?.trim();
  const normalizedText = normalizeText(params.text || '');
  const sender = params.sender || SupportChatSender.USER;

  if (!normalizedUserId) {
    throw new Error('userId es requerido para enviar mensajes');
  }
  if (!normalizedUserName) {
    throw new Error('userName es requerido para enviar mensajes');
  }
  if (!normalizedText) {
    throw new Error('No se puede enviar un mensaje vacío');
  }

  try {
    await ensureThread(normalizedUserId, normalizedUserName);

    const createdAt = Timestamp.now();
    const messagePayload: Omit<SupportChatMessage, 'id'> = {
      userId: normalizedUserId,
      userName: normalizedUserName,
      sender,
      ...(normalizedSenderName ? { senderName: normalizedSenderName } : {}),
      text: normalizedText,
      createdAt
    };

    const messageRef = await addDoc(buildMessagesCollectionRef(normalizedUserId), messagePayload);

    const isUserMessage = sender === SupportChatSender.USER;
    const updatePayload: Partial<SupportChatThread> = {
      userId: normalizedUserId,
      userName: normalizedUserName,
      lastMessage: normalizedText.substring(0, 250),
      lastSender: sender,
      hasUnreadForAdmin: isUserMessage,
      hasUnreadForUser: !isUserMessage,
      lastMessageAt: createdAt,
      updatedAt: createdAt,
      ...(isUserMessage ? { userLastReadAt: createdAt } : { adminLastReadAt: createdAt })
    };

    await setDoc(buildThreadRef(normalizedUserId), updatePayload, { merge: true });

    return messageRef.id;
  } catch (error) {
    console.error('Error sending support chat message:', error);
    throw error;
  }
};

/**
 * Marca como leído el chat para el usuario final.
 */
export const markSupportChatAsReadByUser = async (userId: string): Promise<void> => {
  if (!userId?.trim()) return;

  await setDoc(
    buildThreadRef(normalizeUserId(userId)),
    {
      hasUnreadForUser: false,
      userLastReadAt: Timestamp.now()
    },
    { merge: true }
  );
};

/**
 * Marca como leído el chat para soporte/admin.
 */
export const markSupportChatAsReadByAdmin = async (userId: string): Promise<void> => {
  if (!userId?.trim()) return;

  await setDoc(
    buildThreadRef(normalizeUserId(userId)),
    {
      hasUnreadForAdmin: false,
      adminLastReadAt: Timestamp.now()
    },
    { merge: true }
  );
};

/**
 * Obtiene cantidad de conversaciones con mensajes no leídos para soporte/admin.
 */
export const getSupportChatUnreadCountForAdmin = async (maxItems = 500): Promise<number> => {
  const threads = await getSupportChatThreads(maxItems);
  return threads.filter((thread) => thread.hasUnreadForAdmin).length;
};

/**
 * Obtiene si el usuario tiene mensajes no leídos en su chat.
 */
export const getSupportChatHasUnreadForUser = async (userId: string): Promise<boolean> => {
  const thread = await getSupportChatThread(userId);
  return Boolean(thread?.hasUnreadForUser);
};
