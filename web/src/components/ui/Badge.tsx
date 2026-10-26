// Equivalente a: Chip en Compose
interface Props {
  label: string;
  color?: 'success' | 'error' | 'warning' | 'primary' | 'default';
}

const colors = {
  success: 'bg-green-900 text-success',
  error: 'bg-red-900 text-error',
  warning: 'bg-yellow-900 text-warning',
  primary: 'bg-orange-900 text-primary',
  default: 'bg-secondary text-muted-foreground',
};

export const Badge = ({ label, color = 'default' }: Props) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{label}</span>
);
