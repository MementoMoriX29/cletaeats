import { type SelectHTMLAttributes } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
  error?: string;
}

export const Select = ({ label, options, error, className = '', ...rest }: Props) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm text-muted-foreground">{label}</label>
    <select
      className={`bg-card border ${error ? 'border-error' : 'border-border'} rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors ${className}`}
      {...rest}
    >
      <option value="" disabled className="text-muted-foreground bg-card">Seleccionar...</option>
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-card">{opt}</option>
      ))}
    </select>
    {error && <span className="text-xs text-error">{error}</span>}
  </div>
);
