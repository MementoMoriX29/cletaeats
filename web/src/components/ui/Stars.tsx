import { Star } from 'lucide-react';
import type { Rating } from '../../lib/types';

// "4.6 (42)" con estrella. Sin calificaciones todavía: "Nuevo".
export function RatingLabel({ rating, className = '' }: { rating: Rating; className?: string }) {
  if (!rating.count) return <span className={`text-sm font-semibold text-brand-700 ${className}`}>Nuevo</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" aria-hidden="true" />
      <span className="font-semibold">{rating.average.toFixed(1)}</span>
      <span className="text-ink-3">({rating.count})</span>
      <span className="sr-only">de 5, {rating.count} calificaciones</span>
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

export function StarInput({ value, onChange, label }: StarInputProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((stars) => (
        <button
          key={stars}
          type="button"
          role="radio"
          aria-checked={value === stars}
          aria-label={`${stars} ${stars === 1 ? 'estrella' : 'estrellas'}`}
          onClick={() => onChange(stars)}
          className="rounded-full p-1 transition-transform hover:scale-110"
        >
          <Star className={`h-8 w-8 ${stars <= value ? 'fill-accent-400 text-accent-400' : 'text-line-strong'}`} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
