// Pedidos del restaurante en vivo: nuevos, en preparación y listos para retirar.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Clock, StickyNote } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage, get, post } from '../../lib/api';
import { clock, dateTime, minutesBetween, money, plural, timeAgo } from '../../lib/format';
import { playChime } from '../../lib/chime';
import type { KitchenOrder, Store } from '../../lib/types';
import { useSocketEvent } from '../../context/SocketContext';
import { STATUS_BADGE } from '../../components/order/status';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, Select, TextArea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Segmented } from '../../components/ui/Segmented';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';

// Igual que PENDING_ORDER_TIMEOUT_MIN en el servidor: después de esto el pedido se cancela solo
const ACCEPT_WINDOW_MIN = 15;
const PREP_OPTIONS = [10, 15, 20, 25, 30, 45];
const REJECT_REASONS = ['Se nos acabó un ingrediente', 'Tenemos demasiados pedidos en este momento', 'Estamos por cerrar'];

type Column = 'pending' | 'accepted' | 'ready';
const COLUMNS: { key: Column; title: string; empty: string }[] = [
  { key: 'pending', title: 'Nuevos', empty: 'Los pedidos nuevos aparecen acá con un aviso sonoro.' },
  { key: 'accepted', title: 'En preparación', empty: 'Nada en la cocina por ahora.' },
  { key: 'ready', title: 'Listos para retirar', empty: 'Cuando marqués un pedido como listo, aparece acá hasta que lo retiren.' },
];

function PaymentNote({ order }: { order: KitchenOrder }) {
  if (order.payment.method === 'sinpe') {
    return order.payment.status === 'paid'
      ? <Badge tone="brand">SINPE verificado</Badge>
      : <Badge tone="warning">SINPE: verificá el comprobante {order.payment.sinpe_reference}</Badge>;
  }
  if (order.payment.method === 'cash') return <Badge>Efectivo, lo cobra el repartidor</Badge>;
  return <Badge tone="brand">Pagado con tarjeta</Badge>;
}

function RejectDialog({ order, onClose }: { order: KitchenOrder | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [other, setOther] = useState('');
  const reject = useMutation({
    mutationFn: () => post(`/orders/${order?.id}/reject`, { reason: reason === 'other' ? other : reason }),
    onSuccess: () => {
      toast('Rechazaste el pedido. Le avisamos al cliente.');
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <Modal open={Boolean(order)} onClose={onClose} title={`Rechazar el pedido #${order?.id ?? ''}`} size="sm"
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Volver</Button>
        <Button variant="danger" loading={reject.isPending} disabled={reason === 'other' && other.trim().length < 3} onClick={() => reject.mutate()}>Rechazar</Button></div>}>
      <div className="space-y-4">
        <Field label="Motivo (lo ve el cliente)">
          {(props) => (
            <Select {...props} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="other">Otro motivo</option>
            </Select>
          )}
        </Field>
        {reason === 'other' && (
          <Field label="Contale al cliente qué pasó">
            {(props) => <TextArea {...props} rows={2} maxLength={200} value={other} onChange={(e) => setOther(e.target.value)} className="min-h-0" />}
          </Field>
        )}
        {order?.payment.method === 'card' && <p className="text-sm text-ink-2">Al cliente se le devuelve el pago automáticamente.</p>}
      </div>
    </Modal>
  );
}

function KitchenCard({ order, defaultPrep, onReject }: { order: KitchenOrder; defaultPrep: number; onReject: (o: KitchenOrder) => void }) {
  const queryClient = useQueryClient();
  const [prep, setPrep] = useState(PREP_OPTIONS.includes(defaultPrep) ? defaultPrep : 20);
  const done = () => queryClient.invalidateQueries({ queryKey: ['store-orders'] });
  const accept = useMutation({ mutationFn: () => post(`/orders/${order.id}/accept`, { prep_minutes: prep }), onSuccess: done, onError: (e) => toast.error(errorMessage(e)) });
  const ready = useMutation({ mutationFn: () => post(`/orders/${order.id}/ready`), onSuccess: done, onError: (e) => toast.error(errorMessage(e)) });

  const waiting = minutesBetween(order.created_at);
  const left = ACCEPT_WINDOW_MIN - waiting;
  const readyAt = order.accepted_at && order.prep_minutes
    ? new Date(new Date(order.accepted_at).getTime() + order.prep_minutes * 60000).toISOString() : null;
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <li className={`rounded-xl bg-white p-4 ring-1 ${order.status === 'pending' && left <= 5 ? 'ring-2 ring-danger-600' : 'ring-line'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-wide text-lg font-extrabold">#{order.id}</p>
          <p className="text-sm text-ink-2">{order.client_name}, {timeAgo(order.created_at)}</p>
        </div>
        <p className="money text-sm font-semibold">{money(order.subtotal)}</p>
      </div>

      <ul className="mt-3 space-y-1 border-t border-line pt-3">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex gap-2 text-[15px]">
            <span className="w-7 shrink-0 font-bold">{item.quantity}×</span><span>{item.name}</span>
          </li>
        ))}
      </ul>
      {order.notes && (
        <p className="mt-3 flex gap-2 rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-700">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{order.notes}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2"><PaymentNote order={order} /></div>

      {order.status !== 'pending' && (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-2">
          <Bike className="h-4 w-4" aria-hidden="true" />
          {order.courier ? `${order.courier.name} lo va a retirar en ${order.courier.vehicle}` : 'Buscando repartidor'}
        </p>
      )}

      {order.status === 'pending' && (
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <p className={`flex items-center gap-1.5 text-sm ${left <= 5 ? 'font-semibold text-danger-600' : 'text-ink-2'}`}>
            <Clock className="h-4 w-4" aria-hidden="true" />
            {left > 0 ? `Quedan ${left} min para aceptarlo` : 'Se va a cancelar por falta de respuesta'}
          </p>
          <div className="flex items-center gap-2">
            <Select aria-label="Tiempo de preparación" value={prep} onChange={(e) => setPrep(Number(e.target.value))} className="h-10 w-[120px] text-sm">
              {PREP_OPTIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
            </Select>
            <Button className="flex-1" loading={accept.isPending} onClick={() => accept.mutate()}>Aceptar</Button>
          </div>
          <Button variant="ghost" size="sm" block className="text-danger-600" onClick={() => onReject(order)}>Rechazar pedido</Button>
        </div>
      )}
      {order.status === 'accepted' && (
        <div className="mt-4 border-t border-line pt-3">
          {readyAt && <p className="mb-2 text-sm text-ink-2">Prometido para las {clock(readyAt)} ({units} {units === 1 ? 'producto' : 'productos'})</p>}
          <Button variant="dark" block loading={ready.isPending} onClick={() => ready.mutate()}>Marcar como listo</Button>
        </div>
      )}
    </li>
  );
}

function History() {
  const query = useQuery({ queryKey: ['store-orders', 'history'], queryFn: () => get<KitchenOrder[]>('/merchant/orders', { scope: 'history' }) });
  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  if (!query.data?.length) return <EmptyState title="Todavía no hay pedidos terminados" />;
  return (
    <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
      {query.data.map((order) => (
        <li key={order.id} className="flex items-center gap-4 px-4 py-3">
          <p className="w-16 font-bold">#{order.id}</p>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
            <p className="text-sm text-ink-3">{order.client_name}, {dateTime(order.created_at)}{order.cancel_reason ? `. ${order.cancel_reason}` : ''}</p>
          </div>
          <Badge tone={STATUS_BADGE[order.status].tone}>{STATUS_BADGE[order.status].label}</Badge>
          <p className="money hidden w-24 text-right text-sm font-semibold sm:block">{money(order.subtotal)}</p>
        </li>
      ))}
    </ul>
  );
}

export default function MerchantOrders() {
  const [view, setView] = useState<'board' | 'history'>('board');
  const [mobileColumn, setMobileColumn] = useState<Column>('pending');
  const [rejecting, setRejecting] = useState<KitchenOrder | null>(null);
  const store = useQuery({ queryKey: ['store'], queryFn: () => get<Store>('/merchant/store') });
  const orders = useQuery({
    queryKey: ['store-orders', 'active'],
    queryFn: () => get<KitchenOrder[]>('/merchant/orders'),
    refetchInterval: 30000,
  });

  // Aviso de pedido nuevo: sonido, notificación en pantalla y el título de la pestaña
  useSocketEvent<{ id: number }>('order:created', ({ id }) => {
    playChime();
    toast.success(`Pedido nuevo #${id}`, { duration: 6000 });
    if (document.hidden) document.title = 'Pedido nuevo | CletaEats';
  });
  useEffect(() => {
    const restore = () => { if (!document.hidden) document.title = 'CletaEats'; };
    document.addEventListener('visibilitychange', restore);
    return () => document.removeEventListener('visibilitychange', restore);
  }, []);

  // Para que los minutos de espera se actualicen solos
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const today = store.data?.today;
  const byColumn = (key: Column) => (orders.data ?? []).filter((o) => o.status === key)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-wide text-3xl font-extrabold tracking-tight">Pedidos</h1>
          {today && (
            <p className="mt-1 text-ink-2">
              Hoy: <span className="font-semibold text-ink">{plural(today.orders, 'pedido', 'pedidos')}</span>, <span className="money font-semibold text-ink">{money(today.sales)}</span> en ventas
              {today.avg_prep_minutes !== null && today.avg_prep_minutes > 0 && <>, preparación promedio de {today.avg_prep_minutes} min</>}
            </p>
          )}
        </div>
        <Segmented label="Vista" value={view} onChange={setView}
          options={[{ value: 'board', label: 'En curso' }, { value: 'history', label: 'Historial' }]} />
      </div>

      {store.data && !store.data.is_open && view === 'board' && (
        <p className="mt-4 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-600">La tienda está cerrada: los clientes no pueden hacer pedidos nuevos.</p>
      )}

      <div className="mt-6">
        {view === 'history' ? <History /> : orders.isLoading ? <PageSpinner /> : orders.isError ? <ErrorState onRetry={() => orders.refetch()} /> : (
          <>
            <Segmented className="mb-4 lg:hidden" label="Columna" value={mobileColumn} onChange={setMobileColumn}
              options={COLUMNS.map((c) => ({ value: c.key, label: c.title, count: byColumn(c.key).length }))} />
            <div className="grid gap-6 lg:grid-cols-3">
              {COLUMNS.map((column) => {
                const list = byColumn(column.key);
                return (
                  <section key={column.key} className={mobileColumn === column.key ? '' : 'hidden lg:block'}>
                    <h2 className="mb-3 hidden items-center gap-2 font-bold lg:flex">
                      {column.title}
                      <span className="money rounded-full bg-white px-2 text-sm ring-1 ring-line">{list.length}</span>
                    </h2>
                    {list.length ? (
                      <ul className="space-y-3">
                        {list.map((order) => (
                          <KitchenCard key={order.id} order={order} defaultPrep={store.data?.prep_minutes ?? 20} onReject={setRejecting} />
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-3">{column.empty}</p>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      <RejectDialog order={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}
