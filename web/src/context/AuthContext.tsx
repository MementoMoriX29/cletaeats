// Sesión: un solo login para todos los roles. El token se guarda en este navegador y se valida al abrir la app.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { get, post, setAuthToken, setUnauthorizedHandler } from '../lib/api';
import { readJson, writeJson } from '../lib/storage';
import type { Role, Session, User } from '../lib/types';

const STORAGE_KEY = 'cleta.session';

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface CourierApplication extends RegisterInput {
  national_id: string;
  vehicle: 'bicicleta' | 'scooter';
}

interface AuthValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  applyAsCourier: (input: CourierApplication) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
  replaceSession: (session: Session) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

// Pantalla de inicio de cada rol después de iniciar sesión
export const homeFor = (role: Role) =>
  ({ client: '/', courier: '/repartidor', restaurant: '/negocio', admin: '/admin' })[role];

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => {
    const stored = readJson<Session | null>(STORAGE_KEY, null);
    setAuthToken(stored?.token ?? null);
    return stored;
  });
  const [ready, setReady] = useState(() => !session);

  const applySession = useCallback((next: Session | null) => {
    setAuthToken(next?.token ?? null);
    writeJson(STORAGE_KEY, next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    applySession(null);
    queryClient.clear();
  }, [applySession, queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      applySession(null);
      queryClient.clear();
      toast('Tu sesión terminó. Iniciá sesión de nuevo.', { id: 'session-ended' });
    });
  }, [applySession, queryClient]);

  // Revalida la sesión guardada (puede haber sido suspendida o cerrada desde otro dispositivo)
  useEffect(() => {
    const stored = readJson<Session | null>(STORAGE_KEY, null);
    if (!stored) return;
    get<User>('/me')
      .then((user) => applySession({ token: stored.token, user }))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [applySession]);

  const value = useMemo<AuthValue>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    ready,
    async login(email, password) {
      const next = await post<Session>('/auth/login', { email, password });
      queryClient.clear();
      applySession(next);
      return next.user;
    },
    async register(input) {
      const next = await post<Session>('/auth/register', input);
      applySession(next);
      return next.user;
    },
    async applyAsCourier(input) {
      const next = await post<Session>('/auth/register-courier', input);
      applySession(next);
      return next.user;
    },
    logout,
    updateUser(user) {
      if (session) applySession({ ...session, user });
    },
    replaceSession: applySession,
  }), [session, ready, applySession, logout, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth fuera de AuthProvider');
  return value;
};
