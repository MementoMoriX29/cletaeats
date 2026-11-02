// Pedidos de toda la plataforma. Soporte puede ver el detalle completo y cancelar un pedido abierto.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { errorMessage, fieldErrors, get, post } from '../../lib/api';
import { dateTime, money } from '../../lib/format';
import type { AdminOrder } from '../../lib/adminTypes';
import type { Order } from '../../lib/types';
import { METHOD_LABEL, STATUS_BADGE, isActive, paymentLabel } from '../../components/order/status';
import { PriceBreakdown } from '../../components/order/PriceBreakdown';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Field, TextArea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Segmented } from '../../components/ui/Segmented';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';

type Filter = 'active' | 'all' | 'delivered' | 'cancelled';

export function OrderDialog({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const query = useQuery({ queryKey: ['order', orderId], queryFn: () => get<Order>(`/orders/${orderId}`), enabled: orderId !== null });
  const cancel = useMutation({
    mutationFn: () => post<Order>(`/admin/orders/${orderId}/cancel`, { reason }),
    onSuccess: (order) => {
      queryClient.setQueryData(['order', orderId], order);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setReason('');
      toast.success(`Pedido #${orderId} cancelado`);
    },
  });
  const order = query.data;
  return (
    <Modal open={orderId !== null} onClose={onClose} title={`Pedido #${orderId ?? ''}`} size="lg">
      {!order ? <PageSpinner /> : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_BADGE[order.status].tone}>{STATUS_BADGE[order.status].label}</Badge>
            <span className="text-ink-2">{dateTime(order.created_at)}</span>
            {order.cancel_reason && <span className="text-ink-2">Motivo: {order.cancel_reason}</span>}
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div><dt className="font-semibold">Restaurante</dt><dd className="text-ink-2">{order.restaurant.name}</dd></div>
            <div><dt className="font-semibold">Cliente</dt><dd className="text-ink-2">{order.client.name}<br />{order.client.phone}</dd></div>
            <div><dt className="font-semibold">Repartidor</dt><dd className="text-ink-2">{order.courier ? <>{order.courier.name}<br />{order.courier.phone}</> : 'Sin asignar'}</dd></div>
            <div className="sm:col-span-2"><dt className="font-semibold">Entrega</dt><dd className="text-ink-2">{order.delivery?.line}{order.delivery?.details ? `. ${order.delivery.details}` : ''}</dd></div>
            <div><dt className="font-semibold">Pago</dt><dd className="text-ink-2">{paymentLabel(order.payment)} ({order.payment.status === 'paid' ? 'pagado' : order.payment.status === 'refunded' ? 'reembolsado' : 'pendiente'})</dd></div>
          </dl>
          <ul className="space-y-1 border-t border-line pt-4">
            {order.items.map((item) => (
              <li key={item.product_id} className="flex justify-between gap-3"><span>{item.quantity}× {item.name}</span><span className="money text-ink-2">{money(item.line_total)}</span></li>
            ))}
          </ul>
          <div className="border-t border-line pt-4">
            <PriceBreakdown subtotal={order.pricing.subtotal ?? 0} deliveryFee={order.pricing.delivery_fee ?? 0} serviceFee={order.pricing.service_fee ?? 0}
              tip={order.pricing.tip ?? 0} total={order.pricing.total ?? 0} ivaIncluded={order.pricing.iva_included ?? 0} isHoliday={order.pricing.is_holiday} />
          </div>
          {isActive(order.status) && (
            <div className="space-y-3 rounded-xl bg-danger-50 p-4">
              <Field label="Cancelar el pedido" hint="El cliente ve este motivo. Si pagó con tarjeta o SINPE, se le reembolsa." error={fieldErrors(cancel.error).reason}>
                {(props) => <TextArea {...props} rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-0 bg-white" />}
              </Field>
              {cancel.isError && !fieldErrors(cancel.error).reason && <p className="text-danger-700">{errorMessage(cancel.error)}</p>}
              <Button variant="danger" loading={cancel.isPending} disabled={reason.trim().length < 3} onClick={() => cancel.mutate()}>Cancelar pedido</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function AdminOrders() {
  const [filter, setFilter] = useState<Filter>('active');
  const [selected, setSelected] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'orders', filter],
    queryFn: () => get<AdminOrder[]>('/admin/orders', { filter: filter === 'all' ? undefined : filter, limit: 200 }),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-wide text-3xl font-extrabold tracking-tight">Pedidos</h1>
        <Segmented label="Filtro" value={filter} onChange={setFilter} options={[
          { value: 'active', label: 'En curso' }, { value: 'all', label: 'Todos' },
          { value: 'delivered', label: 'Entregados' }, { value: 'cancelled', label: 'Cancelados' },
        ]} />
      </div>
      {query.isLoading ? <PageSpinner /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : !query.data?.length ? (
        <EmptyState title={filter === 'active' ? 'No hay pedidos en curso' : 'No hay pedidos'} />
      ) : (
        <DataTable rows={query.data} rowKey={(o) => o.id} onRowClick={(o) => setSelected(o.id)} caption="Pedidos" columns={[
          { header: 'Pedido', cell: (o) => <span className="font-semibold">#{o.id}</span> },
          { header: 'Fecha', cell: (o) => <span className="whitespace-nowrap text-ink-2">{dateTime(o.created_at)}</span> },
          { header: 'Restaurante', cell: (o) => o.restaurant_name },
          { header: 'Cliente', cell: (o) => o.client_name },
          { header: 'Repartidor', cell: (o) => o.courier_name ?? <span className="text-ink-3">Sin asignar</span> },
          { header: 'Pago', cell: (o) => METHOD_LABEL[o.payment.method] },
          { header: 'Estado', cell: (o) => <Badge tone={STATUS_BADGE[o.status].tone}>{STATUS_BADGE[o.status].label}</Badge> },
          { header: 'Total', align: 'right', cell: (o) => money(o.total) },
        ]} />
      )}
      <OrderDialog orderId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
