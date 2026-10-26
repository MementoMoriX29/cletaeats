import { type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger:  { icon: AlertTriangle, iconColor: '#EF4444', iconBg: '#EF444420', confirmClass: 'bg-destructive hover:bg-red-600 text-white' },
  warning: { icon: AlertTriangle, iconColor: '#EAB308', iconBg: '#EAB30820', confirmClass: 'bg-warning hover:bg-yellow-500 text-black' },
  info:    { icon: AlertTriangle, iconColor: '#FF6B00', iconBg: '#FF6B0020', confirmClass: 'bg-primary hover:bg-orange-600 text-white' },
};

export const ConfirmModal = ({
  open, title, message,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'warning',
  onConfirm, onCancel,
}: Props) => {
  if (!open) return null;

  const { icon: Icon, iconColor, iconBg, confirmClass } = VARIANT_STYLES[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5 animate-in">
        {/* Botón cerrar */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Ícono + título */}
        <div className="flex items-start gap-4">
          <div className="rounded-xl p-3 shrink-0" style={{ backgroundColor: iconBg }}>
            <Icon size={22} style={{ color: iconColor }} />
          </div>
          <div className="pt-1">
            <p className="text-white font-bold text-base leading-tight">{title}</p>
          </div>
        </div>

        {/* Mensaje */}
        <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>

        {/* Acciones */}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
