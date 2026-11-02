import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const inputClass = [
  'w-full rounded-lg border border-line-strong bg-white px-3 text-[15px] text-ink placeholder:text-ink-3',
  'transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
  'aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:ring-danger-600/20 disabled:bg-canvas',
].join(' ');

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}

// Etiqueta, ayuda y error conectados al control por id (accesible con lector de pantalla)
export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = '', ref, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={`${inputClass} h-11 ${className}`} {...rest} />;
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-[88px] py-2.5 ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputClass} h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234A544F' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}
    >
      {children}
    </select>
  );
}
