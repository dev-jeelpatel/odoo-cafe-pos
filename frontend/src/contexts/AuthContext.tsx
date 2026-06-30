'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Read localStorage synchronously so the first render already has the user —
// this eliminates the spinner that was blocking FCP by ~2.5 s on slow networks.
function readStorage() {
  if (typeof window === 'undefined') return { storedToken: null, storedUser: null };
  try {
    return {
      storedToken: localStorage.getItem('token'),
      storedUser: (() => {
        const s = localStorage.getItem('user');
        return s ? (JSON.parse(s) as User) : null;
      })(),
    };
  } catch {
    return { storedToken: null, storedUser: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { storedToken, storedUser } = readStorage();
  const [user, setUser] = useState<User | null>(storedUser);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(storedToken);
  // isLoading is false from the start because we read localStorage synchronously above
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      api.get('/sessions/current').then(r => setSession(r.data)).catch(() => {});
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSession(data.session);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setSession(data.session);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setSession(null);
    window.location.href = '/login';
  };

  const refreshSession = async () => {
    const { data } = await api.get('/sessions/current');
    setSession(data);
  };

  return (
    <AuthContext.Provider value={{ user, session, token, login, signup, logout, refreshSession, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
