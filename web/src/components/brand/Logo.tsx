// Marca: una rueda de bicicleta (la "cleta") con el centro color maracuyá.
export function WheelMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0E6B4E" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="M16 6.5v19M7.8 11.25l16.4 9.5M7.8 20.75l16.4-9.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.6" fill="#F4B400" />
    </svg>
  );
}

// compact: en pantallas chicas muestra solo el ícono
export function Logo({ suffix, className = '', compact = false }: { suffix?: string; className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <WheelMark />
      <span className={compact ? 'hidden flex-col sm:flex' : 'flex flex-col'}>
        <span className="font-wide text-[19px] font-extrabold leading-none tracking-tight text-ink">CletaEats</span>
        {suffix && <span className="mt-1 text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-brand-700">{suffix}</span>}
      </span>
    </span>
  );
}
