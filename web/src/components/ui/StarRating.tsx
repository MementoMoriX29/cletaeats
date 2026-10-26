interface StarRatingProps {
  value: number;     // 0–5, can be decimal
  size?: 'sm' | 'md';
  showValue?: boolean;
}

export const StarRating = ({ value, size = 'md', showValue = false }: StarRatingProps) => {
  const pct = Math.max(0, Math.min(5, value));
  const full  = Math.floor(pct);
  const half  = pct - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const cls   = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span className={`inline-flex items-center gap-0.5 ${cls}`}>
      {'★'.repeat(full).split('').map((_, i) => (
        <span key={`f${i}`} className="text-yellow-400">★</span>
      ))}
      {half === 1 && <span className="text-yellow-400">½</span>}
      {'★'.repeat(empty).split('').map((_, i) => (
        <span key={`e${i}`} className="text-gray-600">★</span>
      ))}
      {showValue && (
        <span className="ml-1 text-muted-foreground text-xs">{pct.toFixed(1)}</span>
      )}
    </span>
  );
};
