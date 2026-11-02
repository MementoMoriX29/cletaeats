import type { ReactNode } from 'react';
import { money } from '../../lib/format';

interface PriceBreakdownProps {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tip: number;
  total: number;
  ivaIncluded: number;
  isHoliday?: boolean;
  distanceKm?: number;
}

const Row = ({ label, value, strong = false }: { label: ReactNode; value: number; strong?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-4 ${strong ? 'text-base font-bold' : 'text-sm text-ink-2'}`}>
    <dt>{label}</dt>
    <dd className="money">{money(value)}</dd>
  </div>
);

export function PriceBreakdown({ subtotal, deliveryFee, serviceFee, tip, total, ivaIncluded, isHoliday, distanceKm }: PriceBreakdownProps) {
  return (
    <dl className="space-y-1.5">
      <Row label="Productos" value={subtotal} />
      <Row
        label={<>Envío{distanceKm !== undefined && <span className="text-ink-3"> ({distanceKm.toLocaleString('es-CR')} km{isHoliday ? ', feriado' : ''})</span>}</>}
        value={deliveryFee}
      />
      <Row label="Tarifa de servicio" value={serviceFee} />
      {tip > 0 && <Row label="Propina para el repartidor" value={tip} />}
      <div className="border-t border-line pt-2">
        <Row label="Total" value={total} strong />
      </div>
      <p className="text-right text-xs text-ink-3">Incluye IVA de {money(ivaIncluded)}</p>
    </dl>
  );
}
