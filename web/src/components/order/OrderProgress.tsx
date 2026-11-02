// Barra de progreso del pedido en cuatro tramos. El tramo en curso se anima (único movimiento automático de la app).
import type { OrderStatus } from '../../lib/types';

const STEPS = ['Confirmado', 'Preparando', 'Retirando', 'En camino'];
const CURRENT: Record<OrderStatus, number> = { pending: 0, accepted: 1, ready: 2, picked_up: 3, delivered: 4, cancelled: -1 };

export function OrderProgress({ status }: { status: OrderStatus }) {
  const current = CURRENT[status];
  if (current < 0) return null;
  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {STEPS.map((step, index) => (
          <div key={step} className="relative h-1.5 overflow-hidden rounded-full bg-line">
            {index < current && <div className="absolute inset-0 bg-brand-600" />}
            {index === current && (
              <div className="absolute inset-y-0 left-0 w-2/5 animate-progress rounded-full bg-brand-600" />
            )}
          </div>
        ))}
      </div>
      <ol className="mt-2 grid grid-cols-4 gap-1.5 text-xs">
        {STEPS.map((step, index) => (
          <li key={step} className={index <= current ? 'font-semibold text-ink' : 'text-ink-3'} aria-current={index === current ? 'step' : undefined}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
