// App del repartidor: pensada para el celular, con navegación abajo.
import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, LogOut, UserRound, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../brand/Logo';
import { IconButton } from '../ui/Button';
import { PageSpinner } from '../ui/Spinner';

const TABS = [
  { to: '/repartidor', label: 'Inicio', Icon: Home, end: true },
  { to: '/repartidor/ganancias', label: 'Ganancias', Icon: Wallet, end: false },
  { to: '/repartidor/cuenta', label: 'Cuenta', Icon: UserRound, end: false },
];

export function CourierLayout() {
  const { user, logout } = useAuth();
  const active = user?.status === 'active';
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Logo suffix="Repartidores" />
          <IconButton label="Cerrar sesión" onClick={logout}><LogOut className="h-5 w-5" /></IconButton>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">
        <Suspense fallback={<PageSpinner />}><Outlet /></Suspense>
      </main>
      {active && (
        <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto grid max-w-lg grid-cols-3">
            {TABS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${isActive ? 'text-brand-700' : 'text-ink-3'}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />{label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
