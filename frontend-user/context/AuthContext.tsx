'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { requestFcmToken } from '@/lib/firebase';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) return;
    setToken(stored);
    // Re-register FCM token on page reload in case it rotated
    requestFcmToken().then((fcmToken) => {
      if (!fcmToken) return;
      api.patch('/users/me/fcm-token', { fcmToken }, {
        headers: { Authorization: `Bearer ${stored}` },
      }).catch(() => {});
    });
  }, []);

  const login = (t: string) => {
    localStorage.setItem('token', t);
    setToken(t);
    // Register FCM token after login so push notifications work
    requestFcmToken().then((fcmToken) => {
      if (!fcmToken) return;
      api.patch('/users/me/fcm-token', { fcmToken }, {
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => {});
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
