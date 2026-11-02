// Ventana modal con <dialog> nativo: atrapa el foco, cierra con Escape y se muestra sobre todo.
// En el celular se abre desde abajo, como una hoja.
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const WIDTHS = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-white p-0 text-ink shadow-float backdrop:bg-ink/45 sm:m-auto sm:rounded-2xl ${WIDTHS[size]}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
            <h2 className="text-lg font-bold">{title}</h2>
            <IconButton label="Cerrar" onClick={onClose} className="-mr-2">
              <X className="h-5 w-5" />
            </IconButton>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
