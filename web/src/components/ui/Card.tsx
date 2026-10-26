// Equivalente a: Card composable en Compose
import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, className = '', onClick }: Props) =>
  onClick ? (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`bg-surface rounded-xl p-4 ${className}`}
    >
      {children}
    </div>
  ) : (
    <div className={`bg-surface rounded-xl p-4 ${className}`}>{children}</div>
  );
