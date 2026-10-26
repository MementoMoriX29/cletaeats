// Skeleton loader mientras carga datos — equivalente a placeholder en Compose
export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-secondary rounded ${className}`} />
);

export const SkeletonCard = () => (
  <div className="bg-surface rounded-xl p-4 flex flex-col gap-3">
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex gap-4 py-3 border-b border-border">
    <Skeleton className="h-4 w-1/4" />
    <Skeleton className="h-4 w-1/4" />
    <Skeleton className="h-4 w-1/4" />
    <Skeleton className="h-4 w-1/4" />
  </div>
);
