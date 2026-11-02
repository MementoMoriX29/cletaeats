import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  dark: 'bg-ink text-white hover:bg-ink/85',
  outline: 'border border-line-strong bg-white text-ink hover:bg-canvas',
  ghost: 'text-ink hover:bg-ink/5',
  subtle: 'bg-canvas text-ink hover:bg-line',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

const buttonClass = (variant: Variant = 'primary', size: Size = 'md', block = false) =>
  [
    'inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-semibold transition-colors',
    'disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    block ? 'w-full' : '',
  ].join(' ');

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', block, loading, icon, className = '', children, disabled, type = 'button', ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonClass(variant, size, block)} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function ButtonLink({ variant = 'primary', size = 'md', block, className = '', ...rest }: ButtonLinkProps) {
  return <Link className={`${buttonClass(variant, size, block)} ${className}`} {...rest} />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className = '', children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
