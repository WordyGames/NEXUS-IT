import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, UserRole, Company, UserSession } from '../types';
import { getDefaultPermissionsForRole } from '../utils/permissions';

// Helper para localStorage compatible con Node/Browser
const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

const COLLECTION_NAME = 'users';
const SESSIONS_COLLECTION = 'sessions';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const toUtf8Bytes = (value: string): number[] => {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(value));
  }

  const bytes: number[] = [];

  for (let i = 0; i < value.length; i++) {
    const codePoint = value.charCodeAt(i);

    if (codePoint < 0x80) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint < 0x800) {
      bytes.push(
        0xc0 | (codePoint >> 6),
        0x80 | (codePoint & 0x3f)
      );
      continue;
    }

    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < value.length) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        i += 1;
        const fullCodePoint = 0x10000 + (((codePoint & 0x3ff) << 10) | (next & 0x3ff));
        bytes.push(
          0xf0 | (fullCodePoint >> 18),
          0x80 | ((fullCodePoint >> 12) & 0x3f),
          0x80 | ((fullCodePoint >> 6) & 0x3f),
          0x80 | (fullCodePoint & 0x3f)
        );
        continue;
      }
    }

    bytes.push(
      0xe0 | (codePoint >> 12),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f)
    );
  }

  return bytes;
};

const bytesToBase64 = (bytes: number[]): string => {
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i] ?? 0;
    const byte2 = bytes[i + 1] ?? 0;
    const byte3 = bytes[i + 2] ?? 0;

    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;

    output += BASE64_CHARS[(chunk >> 18) & 0x3f];
    output += BASE64_CHARS[(chunk >> 12) & 0x3f];
    output += i + 1 < bytes.length ? BASE64_CHARS[(chunk >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? BASE64_CHARS[chunk & 0x3f] : '=';
  }

  return output;
};

const encodeBase64 = (value: string): string => {
  return bytesToBase64(toUtf8Bytes(value));
};

/**
 * Hash simple de contraseña (en producción usar bcrypt)
 */
const hashPassword = async (password: string): Promise<string> => {
  // Por ahora usamos base64, en producción deberías usar bcrypt o similar
  return encodeBase64(password);
};

/**
 * Verifica contraseña
 */
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return encodeBase64(password) === hash;
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
  phone?: string,
  position?: string,
  email?: string
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
      permissions: getDefaultPermissionsForRole(role),
      company,
      department: department || '',
      position: position || department || '',
      phone: phone || '',
      email: email || '',
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
    const currentUserDoc = await getDoc(docRef);

    if (!currentUserDoc.exists()) {
      throw new Error('Usuario no encontrado');
    }

    const sanitizedData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    ) as Partial<User>;

    if (typeof sanitizedData.username === 'string') {
      const normalizedUsername = sanitizedData.username.trim().toLowerCase();

      if (normalizedUsername.length < 3) {
        throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
      }

      if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
        throw new Error('Solo se permiten letras minusculas, numeros, punto, guion y guion bajo');
      }

      const currentUsername = String(currentUserDoc.data().username || '')
        .trim()
        .toLowerCase();

      if (normalizedUsername !== currentUsername) {
        const existingUser = await getUserByUsername(normalizedUsername);
        if (existingUser && existingUser.id !== uid) {
          throw new Error('El nombre de usuario ya existe');
        }
      }

      sanitizedData.username = normalizedUsername;
    }

    await updateDoc(docRef, {
      ...sanitizedData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Elimina un usuario
 */
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, uid);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting user:', error);
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
