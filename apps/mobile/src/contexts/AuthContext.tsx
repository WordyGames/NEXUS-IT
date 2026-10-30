import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  Company,
  User,
  UserRole,
  UserSession,
  UserPermission,
  createUser,
  signIn,
  getCurrentSession,
  signOut,
  getUserById,
  hasUserPermission,
  refreshCompanies
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
  hasPermission: (permission: UserPermission) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const MOBILE_LAST_PROFILE_KEY = 'nexus-it-mobile-last-profile';
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

  const loadUserData = async () => {
    try {
      const session = await getCurrentSession();
      
      if (session) {
        const data = await getUserById(session.userId);
        setUserData(data);
        setCurrentSession(
          data
            ? {
                ...session,
                username: data.username,
                name: data.name,
                role: data.role,
                company: data.company
              }
            : session
        );

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

  useEffect(() => {
    if (userData?.id) void refreshCompanies();
  }, [userData?.id]);

  const login = async (username: string, password: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    const session = await signIn(normalizedUsername, password);

    const data = await getUserById(session.userId);
    setUserData(data);
    setCurrentSession(
      data
        ? {
            ...session,
            username: data.username,
            name: data.name,
            role: data.role,
            company: data.company
          }
        : session
    );

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
    hasPermission: (permission: UserPermission) => hasUserPermission(userData, permission),
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
