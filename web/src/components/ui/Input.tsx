// Equivalente a: OutlinedTextField en Compose
import { type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = ({ label, error, className = '', ...rest }: Props) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm text-muted-foreground">{label}</label>
    <input
      className={`bg-card border ${error ? 'border-error' : 'border-border'} rounded-lg px-3 py-2 text-white placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors ${className}`}
      {...rest}
    />
    {error && <span className="text-xs text-error">{error}</span>}
  </div>
);
