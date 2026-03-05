import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { 
  Company,
  User, 
  UserRole, 
  UserSession,
  db,
  createUser,
  signIn, 
  signOut, 
  getUserById 
} from '@nexus-it/shared';

interface AuthContextType {
  currentSession: UserSession | null;
  userData: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    name: string;
    position: string;
    company: Company;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const MOBILE_SESSION_KEY = 'nexus-it-mobile-session-id';
const MOBILE_LAST_PROFILE_KEY = 'nexus-it-mobile-last-profile';
const SESSION_RESTORE_TIMEOUT_MS = 8000;

type SessionWithId = UserSession & { id?: string };

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
  let timeoutRef: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutRef = setTimeout(() => resolve(null), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);

  if (timeoutRef) {
    clearTimeout(timeoutRef);
  }

  return result as T | null;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = async (): Promise<SessionWithId | null> => {
    const sessionId = await AsyncStorage.getItem(MOBILE_SESSION_KEY);
    if (!sessionId) return null;

    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await withTimeout(getDoc(sessionRef), SESSION_RESTORE_TIMEOUT_MS);

    if (!sessionSnap || !sessionSnap.exists()) {
      await AsyncStorage.removeItem(MOBILE_SESSION_KEY);
      return null;
    }

    const session = {
      id: sessionSnap.id,
      ...sessionSnap.data()
    } as SessionWithId;

    const expiresAtRaw = session.expiresAt as any;
    const expiresAt = expiresAtRaw instanceof Timestamp
      ? expiresAtRaw.toDate()
      : new Date(expiresAtRaw);

    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      await AsyncStorage.removeItem(MOBILE_SESSION_KEY);
      return null;
    }

    return session;
  };

  const loadUserData = async () => {
    try {
      const session = await restoreSession();
      setCurrentSession(session);
      
      if (session) {
        const data = await getUserById(session.userId);
        setUserData(data);

        if (data?.username) {
          await AsyncStorage.setItem(
            MOBILE_LAST_PROFILE_KEY,
            JSON.stringify({
              username: data.username,
              name: data.name || ''
            })
          );
        }
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setCurrentSession(null);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const login = async (username: string, password: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    const session = await signIn(normalizedUsername, password) as SessionWithId;

    if (session.id) {
      await AsyncStorage.setItem(MOBILE_SESSION_KEY, session.id);
    }

    setCurrentSession(session);
    
    const data = await getUserById(session.userId);
    setUserData(data);

    if (data?.username) {
      await AsyncStorage.setItem(
        MOBILE_LAST_PROFILE_KEY,
        JSON.stringify({
          username: data.username,
          name: data.name || ''
        })
      );
    }
  };

  const register: AuthContextType['register'] = async ({
    username,
    password,
    name,
    position,
    company,
    phone
  }) => {
    await createUser(
      username.trim().toLowerCase(),
      password,
      name.trim(),
      company,
      UserRole.USER,
      position.trim(),
      (phone || '').trim(),
      position.trim()
    );

    await login(username.trim().toLowerCase(), password);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(MOBILE_SESSION_KEY);
    await signOut();
    setCurrentSession(null);
    setUserData(null);
  };

  const refreshUser = async () => {
    await loadUserData();
  };

  const value: AuthContextType = {
    currentSession,
    userData,
    loading,
    login,
    register,
    logout,
    isAdmin: userData?.role === UserRole.ADMIN,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={styles.loadingText}>Iniciando NEXUS IT...</Text>
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    gap: 12
  },
  loadingText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600'
  }
});
