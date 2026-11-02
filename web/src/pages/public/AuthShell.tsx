// Marco de las pantallas de ingreso y registro
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/brand/Logo';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
        <Link to="/" aria-label="CletaEats, inicio"><Logo /></Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-sm">
          <h1 className="font-wide text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-ink-2">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-8 space-y-2 text-sm text-ink-2">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
