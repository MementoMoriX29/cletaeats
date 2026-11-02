import { initials } from '../../lib/format';

export function Avatar({ name, className = 'h-10 w-10 text-sm' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 ${className}`}>
      {initials(name)}
    </span>
  );
}
