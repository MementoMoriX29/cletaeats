// Ganancias e historial de entregas del repartidor.
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { get } from '../../lib/api';
import { dateTime, km, money, plural } from '../../lib/format';
import type { CourierDashboard, CourierHistoryItem } from '../../lib/types';
import { Badge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';

export default function CourierEarnings() {
  const dashboard = useQuery({ queryKey: ['courier'], queryFn: () => get<CourierDashboard>('/courier/me') });
  const history = useQuery({ queryKey: ['courier', 'history'], queryFn: () => get<CourierHistoryItem[]>('/courier/history') });

  if (dashboard.isLoading || history.isLoading) return <PageSpinner />;
  if (!dashboard.data || !history.data) return <ErrorState onRetry={() => { dashboard.refetch(); history.refetch(); }} />;

  const { summary, profile } = dashboard.data;
  const periods = [
    { label: 'Hoy', ...summary.today },
    { label: 'Esta semana', ...summary.week },
    { label: 'Desde que empezaste', ...summary.total },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-wide text-2xl font-extrabold">Ganancias</h1>
      <div className="rounded-2xl bg-white ring-1 ring-line">
        {periods.map((period, index) => (
          <div key={period.label} className={`flex items-baseline justify-between gap-4 px-4 py-4 ${index ? 'border-t border-line' : ''}`}>
            <div>
              <p className="font-semibold">{period.label}</p>
              <p className="text-sm text-ink-2">{plural(period.deliveries, 'entrega', 'entregas')}</p>
            </div>
            <p className={`money font-wide font-extrabold ${index === 0 ? 'text-3xl' : 'text-xl'}`}>{money(period.earnings)}</p>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <Star className="h-4 w-4 fill-accent-400 text-accent-400" aria-hidden="true" />
        {profile.rating.count ? <>Tu calificación: <span className="font-semibold text-ink">{profile.rating.average.toFixed(1)}</span> en {plural(profile.rating.count, 'entrega calificada', 'entregas calificadas')}</> : 'Todavía no tenés calificaciones.'}
      </p>

      <section>
        <h2 className="mb-2 text-lg font-bold">Entregas</h2>
        {history.data.length ? (
          <ul className="divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {history.data.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.restaurant_name}</p>
                  <p className="text-sm text-ink-2">
                    {dateTime(item.delivered_at ?? item.cancelled_at ?? item.created_at)}, {km(item.distance_km)}
                    {item.courier_stars && <span className="ml-2 inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-accent-400 text-accent-400" aria-hidden="true" />{item.courier_stars}</span>}
                  </p>
                </div>
                {item.status === 'cancelled' ? <Badge tone="danger">Cancelado</Badge> : <p className="money font-semibold">{money(item.earnings)}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Todavía no hiciste entregas">Conectate desde Inicio para recibir pedidos.</EmptyState>
        )}
      </section>
    </div>
  );
}
