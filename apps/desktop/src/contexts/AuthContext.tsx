import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  UserRole, 
  UserSession,
  signIn, 
  signOut, 
  getCurrentSession,
  getUserById 
} from '@nexus-it/shared';

interface AuthContextType {
  currentSession: UserSession | null;
  userData: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      setCurrentSession(session);
      
      if (session) {
        const data = await getUserById(session.userId);
        setUserData(data);
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
    const session = await signIn(username, password);
    setCurrentSession(session);
    
    const data = await getUserById(session.userId);
    setUserData(data);
    return data;
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
    logout,
    isAdmin: userData?.role === UserRole.ADMIN,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
