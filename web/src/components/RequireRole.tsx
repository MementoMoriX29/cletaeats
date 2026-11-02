// Protege rutas por rol. Sin sesión → al login (y vuelve después). Con otro rol → a su inicio.
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';
import type { Role } from '../lib/types';
import { PageSpinner } from './ui/Spinner';

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageSpinner />;
  if (!user) return <Navigate to={`/ingresar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
