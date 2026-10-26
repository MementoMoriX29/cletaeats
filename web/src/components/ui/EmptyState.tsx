// Pantalla vacía con SVG inline — equivalente a EmptyStateScreen en Compose
interface Props {
  title: string;
  description?: string;
}

export const EmptyState = ({ title, description }: Props) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="#1E1E1E" />
      <path d="M26 50h28M30 34h20M34 42h12" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="26" r="4" fill="#FF6B00" opacity="0.5" />
    </svg>
    <p className="text-white font-semibold text-lg">{title}</p>
    {description && <p className="text-muted-foreground text-sm max-w-xs">{description}</p>}
  </div>
);
