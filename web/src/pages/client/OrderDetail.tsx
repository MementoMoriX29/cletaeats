// Seguimiento del pedido en vivo: estado, hora estimada, mapa con el repartidor y acciones.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, MessageCircleWarning, Phone, RotateCcw, Store as StoreIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage, fieldErrors, get, post } from '../../lib/api';
import { clock, dateTime, money } from '../../lib/format';
import { DEMO } from '../../lib/demo';
import type { IncidentReason, Order } from '../../lib/types';
import { useCart } from '../../context/CartContext';
import { useOrderTracking } from '../../hooks/useOrderTracking';
import { MapView, type MapPoint } from '../../components/map/MapView';
import { OrderProgress } from '../../components/order/OrderProgress';
import { PriceBreakdown } from '../../components/order/PriceBreakdown';
import { INCIDENT_REASONS, clientHeadline, isActive, paymentLabel } from '../../components/order/status';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, Select, TextArea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { StarInput } from '../../components/ui/Stars';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';

export function CallButton({ phone, who }: { phone: string | null | undefined; who: string }) {
  if (!phone) return null;
  if (DEMO) {
    return (
      <Button variant="outline" size="sm" icon={<Phone className="h-4 w-4" />}
        onClick={() => toast(`En la demo las llamadas están desactivadas (${who}: ${phone})`, { id: 'call' })}>
        Llamar
      </Button>
    );
  }
  return (
    <a href={`tel:${phone.replace(/\D/g, '')}`} className="inline-flex h-8 items-center gap-2 rounded-full border border-line-strong px-3 text-sm font-semibold hover:bg-canvas">
      <Phone className="h-4 w-4" aria-hidden="true" /> Llamar
    </a>
  );
}

function RatingCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [courierStars, setCourierStars] = useState(0);
  const [restaurantStars, setRestaurantStars] = useState(0);
  const [comment, setComment] = useState('');
  const rate = useMutation({
    mutationFn: () => post<Order>(`/orders/${order.id}/rating`, {
      courier_stars: courierStars, restaurant_stars: restaurantStars, comment: comment.trim() || null,
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('¡Gracias por calificar!');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <section className="rounded-2xl bg-brand-50 p-5">
      <h2 className="text-lg font-bold">¿Qué tal estuvo todo?</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><p className="mb-1 text-sm font-semibold">{order.courier?.name.split(' ')[0] ?? 'El repartidor'}</p><StarInput label="Calificación del repartidor" value={courierStars} onChange={setCourierStars} /></div>
        <div><p className="mb-1 text-sm font-semibold">{order.restaurant.name}</p><StarInput label="Calificación del restaurante" value={restaurantStars} onChange={setRestaurantStars} /></div>
      </div>
      <TextArea aria-label="Comentario (opcional)" placeholder="Contanos algo más (opcional)" rows={2} maxLength={300}
        value={comment} onChange={(e) => setComment(e.target.value)} className="mt-4 min-h-0" />
      <Button className="mt-3" disabled={!courierStars || !restaurantStars} loading={rate.isPending} onClick={() => rate.mutate()}>
        Enviar calificación
      </Button>
    </section>
  );
}

function ReportDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<IncidentReason>('late');
  const [description, setDescription] = useState('');
  const report = useMutation({
    mutationFn: () => post<Order>(`/orders/${order.id}/incidents`, { reason, description }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated);
      toast.success('Recibimos tu reporte. Soporte lo va a revisar.');
      onClose();
    },
  });
  const errors = fieldErrors(report.error);
  return (
    <Modal open={open} onClose={onClose} title="Reportar un problema"
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button loading={report.isPending} onClick={() => report.mutate()}>Enviar reporte</Button></div>}>
      <div className="space-y-4">
        <Field label="¿Qué pasó?">
          {(props) => (
            <Select {...props} value={reason} onChange={(e) => setReason(e.target.value as IncidentReason)}>
              {Object.entries(INCIDENT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Contanos los detalles" error={errors.description}>
          {(props) => <TextArea {...props} rows={4} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        {report.isError && !errors.description && <p className="text-sm text-danger-600">{errorMessage(report.error)}</p>}
      </div>
    </Modal>
  );
}

function CancelDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => post<Order>(`/orders/${order.id}/cancel`, { reason: 'Cancelado por el cliente' }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', order.id], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      onClose();
    },
  });
  return (
    <Modal open={open} onClose={onClose} title="¿Cancelar el pedido?" size="sm"
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Volver</Button>
        <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()}>Cancelar pedido</Button></div>}>
      <p className="text-ink-2">
        El restaurante todavía no lo empezó a preparar.{order.payment.method === 'card' ? ' Te devolvemos el pago a la tarjeta.' : ''}
      </p>
    </Modal>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const cart = useCart();
  const [reporting, setReporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const query = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => get<Order>(`/orders/${orderId}`),
    enabled: Number.isInteger(orderId) && orderId > 0,
    // Respaldo por si se pierde algún aviso del socket
    refetchInterval: (q) => (q.state.data && isActive(q.state.data.status) ? 30000 : false),
  });
  const order = query.data;
  const active = order ? isActive(order.status) : false;
  const courierLocation = useOrderTracking(orderId, order?.courier?.location, active);

  if (query.isLoading) return <PageSpinner />;
  if (!order) {
    return <EmptyState title="No encontramos este pedido" className="py-24"
      action={<Link to="/pedidos" className="font-semibold text-brand-700 underline underline-offset-4">Ver mis pedidos</Link>} />;
  }

  const headline = clientHeadline(order);
  const points: MapPoint[] = [{ kind: 'restaurant', lat: order.restaurant.lat, lng: order.restaurant.lng, label: order.restaurant.name }];
  if (order.delivery?.lat !== undefined && order.delivery.lng !== undefined) {
    points.push({ kind: 'home', lat: order.delivery.lat, lng: order.delivery.lng, label: 'Tu dirección' });
  }
  if (active && courierLocation && order.courier) {
    points.push({ kind: 'courier', lat: courierLocation.lat, lng: courierLocation.lng, label: order.courier.name.split(' ')[0] });
  }
  const openIncident = order.incidents?.find((incident) => incident.status === 'open');
  const canReport = order.status !== 'pending' && !openIncident;

  const orderAgain = () => {
    cart.startNew(
      { id: order.restaurant.id, name: order.restaurant.name },
      order.items.map((item) => ({ product_id: item.product_id, name: item.name, price: item.unit_price, quantity: item.quantity })),
    );
    navigate(`/restaurante/${order.restaurant.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:pt-8">
      <p className="text-sm text-ink-2">
        <Link to="/pedidos" className="hover:underline">Mis pedidos</Link> <span aria-hidden="true">/</span> Pedido #{order.id}
      </p>

      <section className="mt-3" aria-live="polite">
        <h1 className="font-wide text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{headline.title}</h1>
        {active && order.estimated_arrival ? (
          <p className="mt-2 text-lg text-ink-2">
            {/* "9:46 a. m." ya termina en punto: no se agrega otro */}
            Llega aprox. a las <span className="font-semibold text-ink">{clock(order.estimated_arrival)}</span>
            {clock(order.estimated_arrival).endsWith('.') ? ' ' : '. '}{headline.detail}
          </p>
        ) : (
          <p className="mt-2 text-lg text-ink-2">{headline.detail}</p>
        )}
        {active && <div className="mt-5 max-w-2xl"><OrderProgress status={order.status} /></div>}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <MapView points={points} route={order.status !== 'picked_up' || !courierLocation} className="h-72 rounded-2xl ring-1 ring-line sm:h-96" />

          {order.courier && active && (
            <div className="flex items-center gap-4 rounded-2xl p-4 ring-1 ring-line">
              <Avatar name={order.courier.name} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{order.courier.name}</p>
                <p className="flex items-center gap-1.5 text-sm text-ink-2"><Bike className="h-4 w-4" aria-hidden="true" /> En {order.courier.vehicle}</p>
              </div>
              <CallButton phone={order.courier.phone} who={order.courier.name.split(' ')[0]} />
            </div>
          )}

          {order.status === 'delivered' && !order.rating && <RatingCard order={order} />}
          {order.rating && (
            <p className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-2">
              Calificaste con {order.rating.courier_stars} estrellas al repartidor y {order.rating.restaurant_stars} al restaurante.
            </p>
          )}

          {order.incidents?.map((incident) => (
            <div key={incident.id} className="rounded-2xl p-4 ring-1 ring-line">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{INCIDENT_REASONS[incident.reason]}</p>
                <Badge tone={incident.status === 'open' ? 'warning' : 'brand'}>{incident.status === 'open' ? 'En revisión' : 'Resuelto'}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink-2">{incident.description}</p>
              {incident.resolution && <p className="mt-2 text-sm"><span className="font-semibold">Respuesta de soporte:</span> {incident.resolution}</p>}
            </div>
          ))}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl p-5 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold"><StoreIcon className="h-4 w-4 text-ink-2" aria-hidden="true" />{order.restaurant.name}</h2>
                <p className="mt-0.5 text-sm text-ink-2">{dateTime(order.created_at)}</p>
              </div>
              <CallButton phone={active ? order.restaurant.phone : null} who={order.restaurant.name} />
            </div>
            <ul className="mt-4 space-y-2 border-t border-line pt-4">
              {order.items.map((item) => (
                <li key={item.product_id} className="flex justify-between gap-3 text-sm">
                  <span><span className="font-semibold">{item.quantity}×</span> {item.name}</span>
                  <span className="money text-ink-2">{money(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <PriceBreakdown subtotal={order.pricing.subtotal ?? 0} deliveryFee={order.pricing.delivery_fee ?? 0}
                serviceFee={order.pricing.service_fee ?? 0} tip={order.pricing.tip ?? 0} total={order.pricing.total ?? 0}
                ivaIncluded={order.pricing.iva_included ?? 0} isHoliday={order.pricing.is_holiday} />
            </div>
            <dl className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
              <div>
                <dt className="font-semibold">Pago</dt>
                <dd className="text-ink-2">
                  {paymentLabel(order.payment)}
                  {order.payment.status === 'refunded' && ' (reembolsado)'}
                  {order.payment.method === 'cash' && order.payment.cash_change_for && order.pricing.total !== undefined && (
                    <>, pagás con <span className="money">{money(order.payment.cash_change_for)}</span></>
                  )}
                </dd>
              </div>
              {order.delivery && (
                <div>
                  <dt className="font-semibold">Entrega</dt>
                  <dd className="text-ink-2">{order.delivery.line}{order.delivery.details ? `. ${order.delivery.details}` : ''}</dd>
                </div>
              )}
              {order.notes && <div><dt className="font-semibold">Instrucciones</dt><dd className="text-ink-2">{order.notes}</dd></div>}
            </dl>
          </section>

          <div className="flex flex-col gap-2">
            {order.status === 'pending' && <Button variant="outline" onClick={() => setCancelling(true)}>Cancelar pedido</Button>}
            {canReport && (
              <Button variant="ghost" icon={<MessageCircleWarning className="h-4 w-4" />} onClick={() => setReporting(true)}>
                Reportar un problema
              </Button>
            )}
            {!active && <Button variant="dark" icon={<RotateCcw className="h-4 w-4" />} onClick={orderAgain}>Pedir de nuevo</Button>}
          </div>
        </aside>
      </div>

      <ReportDialog order={order} open={reporting} onClose={() => setReporting(false)} />
      <CancelDialog order={order} open={cancelling} onClose={() => setCancelling(false)} />
    </div>
  );
}
