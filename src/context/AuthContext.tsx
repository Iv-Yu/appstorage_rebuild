/**
 * Authentication Context (Server-Authoritative)
 * FieldOps IT Inventory Rebuild
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, UserProfile } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, passwordAttempt: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Verifikasi sesi server saat aplikasi dimuat
  useEffect(() => {
    let isMounted = true;
    api.getMe()
      .then(res => {
        if (isMounted) {
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            setUser(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const login = async (username: string, passwordAttempt: string) => {
    try {
      const res = await api.login(username, passwordAttempt);
      if (res.success && res.user) {
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login gagal.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Terjadi kesalahan jaringan.' };
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
