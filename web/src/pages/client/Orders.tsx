// Mis pedidos: los que están en curso arriba y el historial abajo.
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Receipt, Star } from 'lucide-react';
import { get } from '../../lib/api';
import { dateTime, money } from '../../lib/format';
import type { OrderListItem } from '../../lib/types';
import { Cover } from '../../components/brand/Cover';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { STATUS_BADGE, isActive } from '../../components/order/status';

function OrderRow({ order }: { order: OrderListItem }) {
  const status = STATUS_BADGE[order.status];
  return (
    <li>
      <Link to={`/pedidos/${order.id}`} className="flex items-center gap-4 py-4 hover:bg-canvas sm:-mx-3 sm:rounded-xl sm:px-3">
        <Cover name={order.restaurant.name} category={order.restaurant.category} imageUrl={order.restaurant.image_url}
          showMonogram={false} className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{order.restaurant.name}</p>
            {order.status !== 'delivered' && <Badge tone={status.tone}>{status.label}</Badge>}
          </div>
          <p className="truncate text-sm text-ink-2">{order.items_summary}</p>
          <p className="text-sm text-ink-3">
            {dateTime(order.created_at)}, <span className="money">{money(order.total)}</span>
          </p>
        </div>
        {order.status === 'delivered' && !order.rated ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-100 px-3 py-1.5 text-sm font-semibold text-accent-700">
            <Star className="h-4 w-4" aria-hidden="true" /> Calificar
          </span>
        ) : <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" aria-hidden="true" />}
      </Link>
    </li>
  );
}

export default function Orders() {
  const query = useQuery({ queryKey: ['orders'], queryFn: () => get<OrderListItem[]>('/orders') });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const orders = query.data ?? [];
  const current = orders.filter((o) => isActive(o.status));
  const past = orders.filter((o) => !isActive(o.status));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <h1 className="font-wide text-3xl font-extrabold tracking-tight">Mis pedidos</h1>
      {!orders.length ? (
        <EmptyState icon={<Receipt className="h-6 w-6" />} title="Todavía no has pedido nada" className="py-20"
          action={<ButtonLink to="/">Ver restaurantes</ButtonLink>}>
          Cuando hagas un pedido lo vas a poder seguir desde acá.
        </EmptyState>
      ) : (
        <>
          {current.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-bold">En curso</h2>
              <ul className="divide-y divide-line">{current.map((o) => <OrderRow key={o.id} order={o} />)}</ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Anteriores</h2>
              <ul className="divide-y divide-line">{past.map((o) => <OrderRow key={o.id} order={o} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
