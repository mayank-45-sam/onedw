import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { authService, type LoginPayload, type RegisterPayload } from '@/services/auth.service';
import { STORAGE_KEYS } from '@/constants/storage';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.token));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(STORAGE_KEYS.token);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await authService.me();
      setUser(me);
    } catch {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const persistSession = (newToken: string, newRefreshToken: string, newUser: User) => {
    localStorage.setItem(STORAGE_KEYS.token, newToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    persistSession(res.accessToken, res.refreshToken, res.user);
    return res.user;
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    persistSession(res.accessToken, res.refreshToken, res.user);
    return res.user;
  };

  const logout = () => {
    const rt = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (rt) authService.logout(rt).catch(() => undefined);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated: !!token && !!user, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
