// Selector de opciones excluyentes (filtros, método de pago, propina)
interface Option<T extends string | number> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function Segmented<T extends string | number>({ options, value, onChange, label, className = '' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex gap-1 overflow-x-auto scrollbar-none ${className}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              selected ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-inset ring-line-strong hover:bg-canvas'
            }`}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <span className={`rounded-full px-1.5 text-xs ${selected ? 'bg-white/20' : 'bg-accent-400 text-ink'}`}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
