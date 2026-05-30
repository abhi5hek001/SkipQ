'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import { requestFcmToken } from '@/lib/firebase';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
  hydrated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) setToken(stored);
    setHydrated(true); // always mark ready, even when no token
    // Re-register FCM token on page reload in case it rotated
    requestFcmToken().then((fcmToken) => {
      if (!fcmToken) return;
      api.patch('/users/me/fcm-token', { fcmToken }, {
        headers: { Authorization: `Bearer ${stored}` },
      }).then(() => console.log('[FCM] Token registered with backend'))
        .catch((e) => console.error('[FCM] Backend registration failed:', e));
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
      }).then(() => console.log('[FCM] Token registered with backend'))
        .catch((e) => console.error('[FCM] Backend registration failed:', e));
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // Don't render children until localStorage has been read.
  // Without this, pages fire their useEffect before this one and see
  // isLoggedIn=false (initial state), triggering a spurious /login redirect.
  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoggedIn: !!token, hydrated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
