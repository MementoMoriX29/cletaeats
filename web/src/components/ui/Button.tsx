// Equivalente a: Button composable reutilizable en Compose
import { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-primary hover:bg-orange-600 text-white',
  secondary: 'bg-secondary hover:bg-border text-white border border-border',
  danger: 'bg-error hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-surface text-muted-foreground',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...rest }: Props) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    disabled={disabled || loading}
    {...rest}
  >
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
  </button>
);
