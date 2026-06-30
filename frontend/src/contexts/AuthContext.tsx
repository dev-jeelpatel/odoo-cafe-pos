'use client';
import React, { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from 'react';
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

function readStorage() {
  try {
    const storedToken = localStorage.getItem('token');
    const s = localStorage.getItem('user');
    const storedUser = s ? (JSON.parse(s) as User) : null;
    return { storedToken, storedUser };
  } catch {
    return { storedToken: null, storedUser: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always start with null / isLoading=true so the server render and the client's
  // very first render agree — preventing the hydration mismatch that occurred when
  // the client read localStorage synchronously inside useState (server has no window).
  // useLayoutEffect fires synchronously before the browser paints, so returning users
  // see their real content on the first visible frame with zero perceptible flash.
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    const { storedToken, storedUser } = readStorage();
    setToken(storedToken);
    setUser(storedUser);
    setIsLoading(false);
  }, []);

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
