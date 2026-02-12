import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, UserRole, Company, UserSession } from '../types';

// Helper para localStorage compatible con Node/Browser
const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

const COLLECTION_NAME = 'users';
const SESSIONS_COLLECTION = 'sessions';

/**
 * Hash simple de contraseña (en producción usar bcrypt)
 */
const hashPassword = async (password: string): Promise<string> => {
  // Por ahora usamos btoa, en producción deberías usar bcrypt o similar
  return btoa(password);
};

/**
 * Verifica contraseña
 */
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return btoa(password) === hash;
};

/**
 * Crea un usuario en Firestore
 */
export const createUser = async (
  username: string,
  password: string,
  name: string,
  company: Company,
  role: UserRole = UserRole.USER,
  department?: string,
  phone?: string
): Promise<string> => {
  try {
    // Verificar que el username no exista
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      throw new Error('El nombre de usuario ya existe');
    }
    
    // Hash de contraseña
    const passwordHash = await hashPassword(password);
    
    // Crear documento en Firestore
    const userData = {
      username,
      password: passwordHash,
      name,
      role,
      company,
      department: department || '',
      phone: phone || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true
    };
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), userData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Obtiene usuario por username
 */
export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
};

/**
 * Inicia sesión
 */
export const signIn = async (username: string, password: string): Promise<UserSession> => {
  try {
    console.log('[AUTH] Iniciando sesión con usuario:', username);
    
    // Buscar usuario
    const user = await getUserByUsername(username);
    
    if (!user) {
      console.error('[AUTH] Usuario no encontrado:', username);
      throw new Error('Usuario o contraseña incorrectos');
    }
    
    console.log('[AUTH] Usuario encontrado:', user.username, 'isActive:', user.isActive);
    
    if (!user.isActive) {
      console.error('[AUTH] Usuario inactivo:', username);
      throw new Error('Usuario inactivo');
    }
    
    // Verificar contraseña
    console.log('[AUTH] Verificando contraseña...');
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      console.error('[AUTH] Contraseña incorrecta para:', username);
      throw new Error('Usuario o contraseña incorrectos');
    }
    
    console.log('[AUTH] Contraseña correcta. Actualizando último login...');
    
    // Actualizar último login
    await updateDoc(doc(db, COLLECTION_NAME, user.id), {
      lastLogin: Timestamp.now()
    });
    
    // Crear sesión (expira en 7 días)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const session: Omit<UserSession, 'id'> = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      company: user.company,
      loginAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt)
    };
    
    const sessionRef = await addDoc(collection(db, SESSIONS_COLLECTION), session);
    
    // Guardar ID de sesión en localStorage
    const storage = getStorage();
    if (storage) {
      storage.setItem('nexus-it-session', sessionRef.id);
      console.log('[AUTH] Sesión guardada:', sessionRef.id);
    }
    
    console.log('[AUTH] ✅ Login exitoso para:', username);
    return { id: sessionRef.id, ...session } as unknown as UserSession;
  } catch (error) {
    console.error('[AUTH] Error signing in:', error);
    throw error;
  }
};

/**
 * Obtener sesión actual
 */
export const getCurrentSession = async (): Promise<UserSession | null> => {
  try {
    const storage = getStorage();
    if (!storage) return null;
    
    const sessionId = storage.getItem('nexus-it-session');
    if (!sessionId) return null;
    
    const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      storage.removeItem('nexus-it-session');
      return null;
    }
    
    const session = { id: docSnap.id, ...docSnap.data() } as unknown as UserSession;
    
    // Verificar si expiró
    const now = new Date();
    const expiresAt = session.expiresAt instanceof Timestamp 
      ? session.expiresAt.toDate() 
      : session.expiresAt;
    
    if (expiresAt < now) {
      storage.removeItem('nexus-it-session');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
};

/**
 * Cierra sesión
 */
export const signOut = async (): Promise<void> => {
  try {
    const storage = getStorage();
    if (storage) {
      const sessionId = storage.getItem('nexus-it-session');
      if (sessionId) {
        // Opcional: eliminar sesión de Firestore
        // await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
      }
      storage.removeItem('nexus-it-session');
    }
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Obtiene datos de usuario por UID
 */
export const getUserById = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Obtiene todos los usuarios
 */
export const getUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

/**
 * Obtiene usuarios por empresa
 */
export const getUsersByCompany = async (company: Company): Promise<User[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('company', '==', company));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];
  } catch (error) {
    console.error('Error getting users by company:', error);
    throw error;
  }
};

/**
 * Actualiza un usuario
 */
export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Verifica si el usuario es administrador
 */
export const isAdmin = async (uid: string): Promise<boolean> => {
  try {
    const user = await getUserById(uid);
    return user?.role === UserRole.ADMIN;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Obtiene el usuario actual completo
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const session = await getCurrentSession();
    if (!session) return null;
    
    return await getUserById(session.userId);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Cambia la contraseña de un usuario
 */
export const changePassword = async (userId: string, newPassword: string): Promise<void> => {
  try {
    const passwordHash = await hashPassword(newPassword);
    await updateDoc(doc(db, COLLECTION_NAME, userId), {
      password: passwordHash,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
};
