// Inicio del repartidor: conectarse, ver pedidos disponibles y hacer la entrega en curso.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Bike, CheckCircle2, Clock, MapPin, Navigation, PackageCheck, Store as StoreIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorCode, errorMessage, get, post, put } from '../../lib/api';
import { clock, km, money, plural } from '../../lib/format';
import { DEMO } from '../../lib/demo';
import type { CourierDashboard, CourierProfile, Offer, Order } from '../../lib/types';
import { useCourierLocation, type GpsStatus } from '../../hooks/useCourierLocation';
import { MapView, type MapPoint } from '../../components/map/MapView';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Switch } from '../../components/ui/Switch';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { CallButton } from '../client/OrderDetail';

function ApplicationStatus({ profile }: { profile: CourierProfile }) {
  if (profile.status === 'rejected') {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-line">
        <h1 className="font-wide text-2xl font-extrabold">Tu solicitud no fue aprobada</h1>
        <p className="mt-2 text-ink-2">Si creés que hubo un error, escribinos a soporte con tu número de cédula.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-line">
      <Badge tone="warning">En revisión</Badge>
      <h1 className="mt-3 font-wide text-2xl font-extrabold leading-tight">Recibimos tu solicitud, {profile.name.split(' ')[0]}</h1>
      <p className="mt-2 text-ink-2">Soporte está revisando tus datos. Cuando tu cuenta esté habilitada vas a poder conectarte desde esta pantalla.</p>
      <ol className="mt-6 space-y-4">
        {['Revisamos tus datos y tu cédula', 'Habilitamos tu cuenta', `Te conectás y empezás a repartir en ${profile.vehicle}`].map((step, index) => (
          <li key={step} className="flex items-center gap-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? 'bg-brand-600 text-white' : 'bg-canvas text-ink-3'}`}>{index + 1}</span>
            <span className={index === 0 ? 'font-semibold' : 'text-ink-2'}>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const GPS_MESSAGE: Partial<Record<GpsStatus, string>> = {
  denied: 'Activá la ubicación del navegador para que te lleguen pedidos cerca y el cliente te vea en el mapa.',
  unsupported: 'Este navegador no comparte la ubicación. Probá desde el celular.',
};

function OfferCard({ offer }: { offer: Offer }) {
  const queryClient = useQueryClient();
  const claim = useMutation({
    mutationFn: () => post<Order>(`/orders/${offer.id}/claim`),
    onSuccess: () => {
      toast.success('Pedido aceptado. Andá a retirarlo.');
      queryClient.invalidateQueries({ queryKey: ['courier'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
    onError: (error) => {
      toast.error(errorCode(error) === 'ORDER_TAKEN' ? 'Otro repartidor lo aceptó primero' : errorMessage(error));
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });
  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="money font-wide text-2xl font-extrabold">{money(offer.earnings)}</p>
          {offer.tip > 0 && <p className="text-sm text-brand-700">Incluye <span className="money">{money(offer.tip)}</span> de propina</p>}
        </div>
        {offer.ready ? <Badge tone="brand">Listo para retirar</Badge> : <Badge tone="info">Listo a las {clock(offer.ready_estimate)}</Badge>}
      </div>
      <p className="mt-3 flex items-center gap-2 font-semibold"><StoreIcon className="h-4 w-4 text-ink-2" aria-hidden="true" />{offer.restaurant.name}</p>
      <p className="text-sm text-ink-2">{offer.restaurant.address}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
        {offer.pickup_km !== null && <span className="inline-flex items-center gap-1"><Navigation className="h-3.5 w-3.5" aria-hidden="true" />Retiro a {km(offer.pickup_km)}</span>}
        <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" aria-hidden="true" />Entrega de {km(offer.dropoff_km)}</span>
        <span>{plural(offer.item_count, 'producto', 'productos')}</span>
      </div>
      {offer.cash_to_collect !== null && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-100 px-2.5 py-1 text-sm font-semibold text-accent-700">
          <Banknote className="h-4 w-4" aria-hidden="true" /> Cobrás <span className="money">{money(offer.cash_to_collect)}</span> en efectivo
        </p>
      )}
      <Button block size="lg" className="mt-4" loading={claim.isPending} onClick={() => claim.mutate()}>Aceptar pedido</Button>
    </li>
  );
}

function Offers() {
  const query = useQuery({
    queryKey: ['offers'],
    queryFn: () => get<{ availability: string; offers: Offer[] }>('/courier/offers'),
    refetchInterval: 20000,
  });
  if (query.isLoading) return <PageSpinner />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;
  const offers = query.data?.offers ?? [];
  if (!offers.length) {
    return (
      <EmptyState icon={<Clock className="h-6 w-6" />} title="Esperando pedidos">
        Cuando un restaurante cerca confirme un pedido, aparece acá.
      </EmptyState>
    );
  }
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">Pedidos disponibles</h2>
      <ul className="space-y-3">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</ul>
    </section>
  );
}

function ActiveDelivery({ order, location }: { order: Order; location: ReturnType<typeof useCourierLocation> }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const pickedUp = order.status === 'picked_up';
  const refresh = (updated: Order) => {
    queryClient.setQueryData<CourierDashboard>(['courier'], (current) => current && ({ ...current, active_order: updated }));
    queryClient.invalidateQueries({ queryKey: ['courier'] });
  };
  const pickup = useMutation({ mutationFn: () => post<Order>(`/orders/${order.id}/pickup`), onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const deliver = useMutation({
    mutationFn: () => post<Order>(`/orders/${order.id}/deliver`),
    onSuccess: () => {
      setConfirming(false);
      location.stopSimulation();
      toast.success(`Entrega lista. Ganaste ${money(order.earnings ?? 0)}.`);
      queryClient.invalidateQueries({ queryKey: ['courier'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const restaurant = { lat: order.restaurant.lat, lng: order.restaurant.lng };
  const destination = order.delivery?.lat !== undefined ? { lat: order.delivery.lat, lng: order.delivery.lng! } : null;
  const points: MapPoint[] = [{ kind: 'restaurant', ...restaurant, label: order.restaurant.name }];
  if (destination) points.push({ kind: 'home', ...destination, label: order.client.name });
  if (location.position) points.push({ kind: 'courier', ...location.position, label: 'Vos' });

  const cash = order.payment.method === 'cash';
  const total = order.pricing.total ?? 0;
  const change = cash && order.payment.cash_change_for ? order.payment.cash_change_for - total : null;
  const mapsUrl = (p: { lat: number; lng: number }) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=bicycling`;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-white ring-1 ring-line">
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <p className="text-sm font-semibold text-ink-2">Pedido #{order.id}</p>
          <p className="text-sm text-ink-2">Ganás <span className="money font-semibold text-ink">{money(order.earnings ?? 0)}</span></p>
        </div>
        <h1 className="px-4 pt-1 font-wide text-2xl font-extrabold">{pickedUp ? 'Entregá el pedido' : 'Retirá el pedido'}</h1>
        <MapView points={points} className="mt-3 h-56" route />

        <div className="space-y-3 p-4">
          {!pickedUp ? (
            <>
              <div>
                <p className="flex items-center gap-2 font-semibold"><StoreIcon className="h-4 w-4 text-ink-2" aria-hidden="true" />{order.restaurant.name}</p>
                <p className="text-sm text-ink-2">{order.restaurant.address}</p>
              </div>
              <p className="text-sm">
                {order.status === 'ready' ? <Badge tone="brand">Listo para retirar</Badge>
                  : <Badge tone="info">En preparación{order.prep_minutes && order.accepted_at ? `, listo a las ${clock(new Date(new Date(order.accepted_at).getTime() + order.prep_minutes * 60000).toISOString())}` : ''}</Badge>}
              </p>
              <ul className="text-sm text-ink-2">
                {order.items.map((item) => <li key={item.product_id}>{item.quantity}× {item.name}</li>)}
              </ul>
              <div className="flex flex-wrap gap-2">
                <CallButton phone={order.restaurant.phone} who={order.restaurant.name} />
                <a href={mapsUrl(restaurant)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-2 rounded-full border border-line-strong px-3 text-sm font-semibold hover:bg-canvas">
                  <Navigation className="h-4 w-4" aria-hidden="true" /> Cómo llegar
                </a>
              </div>
              <Button block size="lg" icon={<PackageCheck className="h-5 w-5" />} loading={pickup.isPending} onClick={() => pickup.mutate()}>Ya lo retiré</Button>
            </>
          ) : (
            <>
              <div>
                <p className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-ink-2" aria-hidden="true" />{order.client.name}</p>
                <p className="text-sm text-ink-2">{order.delivery?.line}{order.delivery?.details ? `. ${order.delivery.details}` : ''}</p>
                {order.notes && <p className="mt-1 rounded-lg bg-canvas px-3 py-2 text-sm"><span className="font-semibold">Instrucciones:</span> {order.notes}</p>}
              </div>
              {cash ? (
                <div className="rounded-xl bg-accent-100 px-4 py-3 text-accent-700">
                  <p className="font-semibold">Cobrá <span className="money">{money(total)}</span> en efectivo</p>
                  {change !== null && change > 0 && (
                    <p className="text-sm">Paga con <span className="money">{money(order.payment.cash_change_for!)}</span>: llevá <span className="money font-semibold">{money(change)}</span> de vuelto</p>
                  )}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-brand-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Ya está pagado. No cobrás nada.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <CallButton phone={order.client.phone} who={order.client.name} />
                {destination && (
                  <a href={mapsUrl(destination)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-2 rounded-full border border-line-strong px-3 text-sm font-semibold hover:bg-canvas">
                    <Navigation className="h-4 w-4" aria-hidden="true" /> Cómo llegar
                  </a>
                )}
              </div>
              <Button block size="lg" icon={<CheckCircle2 className="h-5 w-5" />} onClick={() => setConfirming(true)}>Marcar como entregado</Button>
            </>
          )}
          {DEMO && destination && (
            <Button variant="ghost" size="sm" block disabled={location.simulating}
              onClick={() => location.simulate(location.position ?? restaurant, pickedUp ? destination : restaurant)}>
              {location.simulating ? 'Simulando recorrido…' : 'Simular recorrido (demo)'}
            </Button>
          )}
        </div>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="¿Entregaste el pedido?" size="sm"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirming(false)}>Todavía no</Button>
          <Button loading={deliver.isPending} onClick={() => deliver.mutate()}>Sí, lo entregué</Button></div>}>
        <p className="text-ink-2">{cash ? `Confirmá que cobraste ${money(total)} en efectivo.` : 'El cliente recibe un aviso y puede calificar la entrega.'}</p>
      </Modal>
    </section>
  );
}

export default function CourierHome() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['courier'], queryFn: () => get<CourierDashboard>('/courier/me'), refetchInterval: 30000 });
  const profile = query.data?.profile;
  const online = profile?.availability !== undefined && profile.availability !== 'offline';
  const location = useCourierLocation(Boolean(profile?.status === 'active' && online));

  const toggle = useMutation({
    mutationFn: (next: boolean) => put<CourierProfile>('/courier/availability', { online: next }),
    onSuccess: (updated) => {
      queryClient.setQueryData<CourierDashboard>(['courier'], (current) => current && ({ ...current, profile: updated }));
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError || !query.data || !profile) return <ErrorState onRetry={() => query.refetch()} />;
  if (profile.status !== 'active') return <ApplicationStatus profile={profile} />;

  const { active_order: activeOrder, summary } = query.data;

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-4 rounded-2xl p-4 ${online ? 'bg-brand-600 text-white' : 'bg-white ring-1 ring-line'}`}>
        <div className="flex-1">
          <p className="font-wide text-xl font-extrabold">{online ? 'Estás conectado' : 'Estás desconectado'}</p>
          <p className={`text-sm ${online ? 'text-white/80' : 'text-ink-2'}`}>
            {activeOrder ? 'Terminá la entrega para desconectarte.' : online ? 'Te avisamos cuando haya pedidos cerca.' : 'Conectate para recibir pedidos.'}
          </p>
        </div>
        <Switch size="lg" label="Conectado" checked={online} disabled={toggle.isPending || Boolean(activeOrder)} onChange={(next) => toggle.mutate(next)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="text-sm text-ink-2">Ganado hoy</p>
          <p className="money font-wide text-2xl font-extrabold">{money(summary.today.earnings)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="text-sm text-ink-2">Entregas hoy</p>
          <p className="money font-wide text-2xl font-extrabold">{summary.today.deliveries}</p>
        </div>
      </div>

      {online && GPS_MESSAGE[location.status] && !activeOrder && (
        <p className="rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-600">{GPS_MESSAGE[location.status]}</p>
      )}

      {activeOrder ? <ActiveDelivery order={activeOrder} location={location} /> : online ? <Offers /> : null}
    </div>
  );
}
