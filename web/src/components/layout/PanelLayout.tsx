// Panel de escritorio (restaurante y soporte): navegación a la izquierda; en el celular, pestañas arriba.
import { Suspense, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogOut, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../brand/Logo';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { PageSpinner } from '../ui/Spinner';

export interface PanelNavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

interface PanelLayoutProps {
  suffix: string;
  nav: PanelNavItem[];
  sidebarSlot?: ReactNode;
}

export function PanelLayout({ suffix, nav, sidebarSlot }: PanelLayoutProps) {
  const { user, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-2 hover:bg-canvas hover:text-ink'}`;

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white px-3 py-4 lg:flex">
        <div className="px-2"><Logo suffix={suffix} /></div>
        {sidebarSlot && <div className="mt-5 px-1">{sidebarSlot}</div>}
        <nav aria-label="Secciones" className="mt-5 flex-1 space-y-0.5">
          {nav.map(({ to, label, Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {Boolean(badge) && <span className="money rounded-full bg-accent-400 px-1.5 text-xs font-bold text-ink">{badge}</span>}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="flex items-center gap-3 border-t border-line px-1 pt-3">
            <Avatar name={user.name} className="h-9 w-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-ink-3">{user.email}</p>
            </div>
            <IconButton label="Cerrar sesión" onClick={logout}><LogOut className="h-4 w-4" /></IconButton>
          </div>
        )}
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-line bg-white lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo suffix={suffix} />
            <IconButton label="Cerrar sesión" onClick={logout}><LogOut className="h-5 w-5" /></IconButton>
          </div>
          {sidebarSlot && <div className="px-4 pb-2">{sidebarSlot}</div>}
          <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
            {nav.map(({ to, label, end, badge }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-ink text-white' : 'text-ink-2'}`}>
                {label}{badge ? ` (${badge})` : ''}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          <Suspense fallback={<PageSpinner />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}
