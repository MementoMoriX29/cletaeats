import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'brand' | 'accent' | 'danger' | 'warning' | 'info' | 'dark';

const TONES: Record<Tone, string> = {
  neutral: 'bg-canvas text-ink-2 ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  accent: 'bg-accent-100 text-accent-700 ring-accent-400/40',
  danger: 'bg-danger-50 text-danger-700 ring-danger-600/20',
  warning: 'bg-warning-50 text-warning-600 ring-warning-600/20',
  info: 'bg-info-50 text-info-600 ring-info-600/20',
  dark: 'bg-ink text-white ring-ink',
};

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
