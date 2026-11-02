import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, children, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center px-6 py-12 text-center ${className}`}>
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-2 ring-1 ring-line">{icon}</div>}
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <div className="mt-1 max-w-sm text-ink-2">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, message = 'No se pudo cargar la información.' }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-ink-2">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-brand-700 underline underline-offset-4">
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
