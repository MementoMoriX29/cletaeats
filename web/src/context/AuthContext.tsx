// Equivalente a: AuthViewModel.kt + SessionManager.kt
// Pattern: Context API (equivalente a ViewModel + StateFlow en Android)
// Observer: componentes se suscriben a cambios de sesión

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AuthUser, UserRole } from '../types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; payload: AuthUser }
  | { type: 'LOGOUT' }
  | { type: 'LOADED' };

const reducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
      return { user: action.payload, isLoading: false };
    case 'LOGOUT':
      return { user: null, isLoading: false };
    case 'LOADED':
      return { ...state, isLoading: false };
    default:
      return state;
  }
};

interface AuthContextValue extends AuthState {
  login: (user: AuthUser) => void;
  logout: () => void;
  isRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { user: null, isLoading: true });

  // Restaurar sesión desde localStorage (= DataStore en Android)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const id = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole') as UserRole | null;
    const nombre = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');

    if (token && id && role && nombre && email) {
      dispatch({
        type: 'LOGIN',
        payload: { id: Number(id), nombre, email, role, token },
      });
    } else {
      dispatch({ type: 'LOADED' });
    }
  }, []);

  useEffect(() => {
    const handleForceLogout = () => dispatch({ type: 'LOGOUT' });
    window.addEventListener('cletaeats:force-logout', handleForceLogout);
    return () => window.removeEventListener('cletaeats:force-logout', handleForceLogout);
  }, []);

  const login = (user: AuthUser) => {
    localStorage.setItem('token', user.token);
    localStorage.setItem('userId', String(user.id));
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userName', user.nombre);
    localStorage.setItem('userEmail', user.email);
    dispatch({ type: 'LOGIN', payload: user });
  };

  const logout = () => {
    localStorage.clear();
    dispatch({ type: 'LOGOUT' });
  };

  const isRole = (role: UserRole) => state.user?.role === role;

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
