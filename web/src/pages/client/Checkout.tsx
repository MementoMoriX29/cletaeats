// Confirmar el pedido: dirección, pago, propina y resumen. El total lo calcula siempre el servidor.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Check, CreditCard, Lock, MapPin, Plus, ShoppingBag, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorBody, errorCode, errorMessage, post } from '../../lib/api';
import { money } from '../../lib/format';
import { DEMO, DEMO_CARD } from '../../lib/demo';
import {
  CardDeclinedError, detectBrand, digitsOnly, formatCardNumber, formatExpiry, tokenizeCard, validateCard, type CardInput,
} from '../../lib/gateway';
import type { Order, PaymentMethod, Quote } from '../../lib/types';
import { useCart } from '../../context/CartContext';
import { fromAddress, useDeliveryLocation } from '../../context/LocationContext';
import { AddressDialog } from '../../components/address/AddressDialog';
import { CartLines } from '../../components/layout/CartDialog';
import { PriceBreakdown } from '../../components/order/PriceBreakdown';
import { Field, Input, TextArea } from '../../components/ui/Field';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

const TIPS = [0, 500, 1000, 1500];
const BRAND_LABEL = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' } as const;

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

// compact: en el celular el ícono va arriba del texto (tres opciones caben en una fila)
function ChoiceButton({ selected, onClick, compact = false, children }: { selected: boolean; onClick: () => void; compact?: boolean; children: React.ReactNode }) {
  const layout = compact
    ? 'flex-col justify-center gap-1 px-2 text-center text-sm sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:text-left sm:text-base'
    : 'gap-2 px-4 text-left';
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      className={`flex items-center rounded-xl py-3 font-semibold ring-inset transition-colors ${layout} ${
        selected ? 'bg-brand-50 ring-2 ring-brand-600' : 'ring-1 ring-line-strong hover:bg-canvas'}`}>
      {children}
    </button>
  );
}

export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { location, setLocation, addresses, addressesLoading } = useDeliveryLocation();
  const [addressOpen, setAddressOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [card, setCard] = useState<CardInput>({ number: '', expiry: '', cvc: '', name: '' });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardInput, string>>>({});
  const [sinpeReference, setSinpeReference] = useState('');
  const [sinpeError, setSinpeError] = useState('');
  const [cashFor, setCashFor] = useState<number | null>(null);
  const [formError, setFormError] = useState('');

  const addressId = location?.addressId;
  const items = useMemo(() => cart.lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })), [cart.lines]);
  const tipAmount = customTip ? Math.min(10000, Math.max(0, Math.round(Number(customTip) || 0))) : tip;

  const quote = useQuery({
    queryKey: ['quote', cart.restaurant?.id, items, addressId, tipAmount],
    queryFn: () => post<Quote>('/orders/quote', {
      restaurant_id: cart.restaurant?.id, items, delivery: { address_id: addressId }, tip: tipAmount,
    }),
    enabled: Boolean(cart.restaurant && items.length && addressId),
    placeholderData: keepPreviousData,
    retry: false,
  });

  // Si algún producto se agotó mientras tanto, se saca del carrito y se avisa
  useEffect(() => {
    if (errorCode(quote.error) !== 'CART_CHANGED') return;
    const ids = (errorBody(quote.error)?.unavailable_product_ids as number[] | undefined) ?? [];
    if (ids.length) {
      cart.remove(ids);
      toast.error('Sacamos de tu carrito productos que ya no están disponibles');
    }
  }, [quote.error, cart]);

  const placeOrder = useMutation({
    mutationFn: async () => {
      const total = quote.data!.total;
      let payment: Record<string, unknown>;
      if (method === 'card') {
        const { token, brand, last4 } = await tokenizeCard(card);
        payment = { method, card_token: token, card_brand: brand, card_last4: last4 };
      } else if (method === 'sinpe') {
        payment = { method, sinpe_reference: sinpeReference.trim() };
      } else {
        // Si el total subió (por ejemplo, con la propina) y el monto elegido ya no alcanza, se paga el monto exacto
        payment = { method, cash_change_for: cashFor !== null && cashFor >= total ? cashFor : null };
      }
      return post<Order>('/orders', {
        restaurant_id: cart.restaurant!.id,
        items,
        delivery: { address_id: addressId },
        notes: notes.trim() || null,
        tip: tipAmount,
        payment,
        expected_total: total,
      });
    },
    onSuccess: (order) => {
      cart.clear();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['order', order.id], order);
      navigate(`/pedidos/${order.id}`, { replace: true });
    },
    onError: (error) => {
      if (error instanceof CardDeclinedError) {
        setFormError(error.message);
        return;
      }
      const code = errorCode(error);
      if (code === 'TOTAL_CHANGED') {
        quote.refetch();
        setFormError('El total de tu pedido cambió. Revisalo y confirmá de nuevo.');
      } else if (code === 'CART_CHANGED') {
        quote.refetch();
        setFormError(errorMessage(error));
      } else {
        setFormError(errorMessage(error, 'No pudimos hacer tu pedido'));
      }
    },
  });

  if (!cart.count || !cart.restaurant) {
    return (
      <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title="Tu carrito está vacío" className="py-24"
        action={<ButtonLink to="/">Ver restaurantes</ButtonLink>}>
        Elegí un restaurante y agregá lo que se te antoje.
      </EmptyState>
    );
  }

  const submit = () => {
    setFormError('');
    if (method === 'card') {
      const errors = validateCard(card);
      setCardErrors(errors);
      if (Object.keys(errors).length) return;
    }
    if (method === 'sinpe') {
      const ok = /^[A-Za-z0-9-]{4,30}$/.test(sinpeReference.trim());
      setSinpeError(ok ? '' : 'Escribí el número de comprobante del SINPE');
      if (!ok) return;
    }
    placeOrder.mutate();
  };

  const data = quote.data;
  const outOfRange = errorCode(quote.error) === 'OUT_OF_RANGE';
  const closed = data && !data.restaurant.is_open;
  const cardBrand = detectBrand(digitsOnly(card.number));
  const cashOptions = data ? [...new Set([data.total, ...[5000, 10000, 20000].map((step) => Math.ceil(data.total / step) * step)])].slice(0, 4) : [];
  // El monto elegido deja de valer si el total sube por encima (al agregar propina, por ejemplo)
  const cashAmount = cashFor !== null && data && cashFor >= data.total ? cashFor : null;
  const setCardField = (key: keyof CardInput, value: string) => setCard((current) => ({ ...current, [key]: value }));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10">
      <h1 className="font-wide text-3xl font-extrabold tracking-tight">Confirmá tu pedido</h1>
      <p className="mt-1 text-ink-2">
        De <Link to={`/restaurante/${cart.restaurant.id}`} className="font-semibold text-ink underline underline-offset-2">{cart.restaurant.name}</Link>
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Section title="Entrega" aside={addresses.length > 0 && (
            <button type="button" onClick={() => setAddressOpen(true)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              <Plus className="h-4 w-4" /> Nueva dirección
            </button>
          )}>
            {addressesLoading ? <Skeleton className="h-16" /> : addresses.length ? (
              <div role="radiogroup" aria-label="Dirección de entrega" className="grid gap-2 sm:grid-cols-2">
                {addresses.map((address) => (
                  <ChoiceButton key={address.id} selected={addressId === address.id} onClick={() => setLocation(fromAddress(address))}>
                    <MapPin className={`h-5 w-5 shrink-0 ${addressId === address.id ? 'text-brand-600' : 'text-ink-3'}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block">{address.label}</span>
                      <span className="block truncate text-sm font-normal text-ink-2">{address.line}</span>
                    </span>
                  </ChoiceButton>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setAddressOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong px-4 py-4 text-left hover:bg-canvas">
                <Plus className="h-5 w-5 text-brand-600" /> <span className="font-semibold">Agregar dirección de entrega</span>
              </button>
            )}
            {outOfRange && (
              <p role="alert" className="mt-3 rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning-600">{errorMessage(quote.error)}</p>
            )}
            <Field label="Instrucciones para el repartidor (opcional)" className="mt-4">
              {(props) => <TextArea {...props} rows={2} maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Tocar el timbre, dejar en la caseta del guarda…" className="min-h-0" />}
            </Field>
          </Section>

          <Section title="Pago">
            <div role="radiogroup" aria-label="Método de pago" className="grid grid-cols-3 gap-2">
              <ChoiceButton compact selected={method === 'card'} onClick={() => setMethod('card')}><CreditCard className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="truncate">Tarjeta</span></ChoiceButton>
              <ChoiceButton compact selected={method === 'sinpe'} onClick={() => setMethod('sinpe')}><Smartphone className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="truncate">SINPE</span></ChoiceButton>
              <ChoiceButton compact selected={method === 'cash'} onClick={() => setMethod('cash')}><Banknote className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="truncate">Efectivo</span></ChoiceButton>
            </div>

            <div className="mt-4">
              {method === 'card' && (
                <div className="space-y-4">
                  {DEMO && (
                    <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-700">
                      Demo: no se cobra nada. Usá la tarjeta de prueba <button type="button" className="font-semibold underline underline-offset-2"
                        onClick={() => setCard({ number: DEMO_CARD, expiry: '12/30', cvc: '123', name: 'Cliente Demo' })}>{DEMO_CARD}</button>.
                    </p>
                  )}
                  <Field label="Número de tarjeta" error={cardErrors.number}>
                    {(props) => (
                      <div className="relative">
                        <Input {...props} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"
                          value={card.number} onChange={(e) => setCardField('number', formatCardNumber(e.target.value))} className="pr-36" />
                        {cardBrand && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-2">{BRAND_LABEL[cardBrand]}</span>}
                      </div>
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vencimiento" error={cardErrors.expiry}>
                      {(props) => <Input {...props} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={card.expiry}
                        onChange={(e) => setCardField('expiry', formatExpiry(e.target.value))} />}
                    </Field>
                    <Field label="Código de seguridad" error={cardErrors.cvc}>
                      {(props) => <Input {...props} inputMode="numeric" autoComplete="cc-csc" placeholder={cardBrand === 'amex' ? '4 dígitos' : '3 dígitos'}
                        value={card.cvc} onChange={(e) => setCardField('cvc', digitsOnly(e.target.value).slice(0, 4))} />}
                    </Field>
                  </div>
                  <Field label="Nombre en la tarjeta" error={cardErrors.name}>
                    {(props) => <Input {...props} autoComplete="cc-name" value={card.name} onChange={(e) => setCardField('name', e.target.value)} />}
                  </Field>
                  <p className="flex items-start gap-2 text-sm text-ink-3">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    Los datos de la tarjeta van directo a la pasarela de pago. CletaEats solo guarda la marca y los últimos 4 dígitos.
                  </p>
                </div>
              )}

              {method === 'sinpe' && (
                <div className="space-y-4">
                  {DEMO ? (
                    <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-700">
                      Demo: no hagas ninguna transferencia. Escribí cualquier número de comprobante, por ejemplo 123456.
                    </p>
                  ) : (
                    <p className="text-ink-2">
                      Hacé un SINPE Móvil por <span className="money font-semibold text-ink">{data ? money(data.total) : '…'}</span> al{' '}
                      <span className="font-semibold text-ink">{data?.restaurant.sinpe_phone ?? '…'}</span> ({cart.restaurant.name}) y escribí el número de comprobante.
                      El restaurante lo verifica antes de aceptar.
                    </p>
                  )}
                  <Field label="Número de comprobante" error={sinpeError}>
                    {(props) => <Input {...props} inputMode="numeric" value={sinpeReference} maxLength={30}
                      onChange={(e) => setSinpeReference(e.target.value)} />}
                  </Field>
                </div>
              )}

              {method === 'cash' && (
                <div>
                  <p className="text-ink-2">Le pagás al repartidor cuando llega. ¿Con cuánto vas a pagar?</p>
                  <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Monto en efectivo">
                    {cashOptions.map((amount, index) => (
                      <button key={amount} type="button" role="radio" aria-checked={cashAmount === amount || (index === 0 && cashAmount === null)}
                        onClick={() => setCashFor(index === 0 ? null : amount)}
                        className={`money h-9 rounded-full px-3.5 text-sm font-semibold ring-inset ${
                          cashAmount === amount || (index === 0 && cashAmount === null) ? 'bg-ink text-white' : 'ring-1 ring-line-strong hover:bg-canvas'}`}>
                        {index === 0 ? 'Monto exacto' : money(amount)}
                      </button>
                    ))}
                  </div>
                  {cashAmount !== null && data && <p className="mt-2 text-sm text-ink-2">Tu vuelto: <span className="money font-semibold text-ink">{money(cashAmount - data.total)}</span></p>}
                </div>
              )}
            </div>
          </Section>

          <Section title="Propina para el repartidor">
            <p className="-mt-1 mb-3 text-sm text-ink-2">El 100 % es para quien te lleva el pedido.</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Propina">
              {TIPS.map((amount) => (
                <button key={amount} type="button" role="radio" aria-checked={!customTip && tip === amount}
                  onClick={() => { setTip(amount); setCustomTip(''); }}
                  className={`money h-9 rounded-full px-3.5 text-sm font-semibold ring-inset ${
                    !customTip && tip === amount ? 'bg-ink text-white' : 'ring-1 ring-line-strong hover:bg-canvas'}`}>
                  {amount ? money(amount) : 'Sin propina'}
                </button>
              ))}
              <Input aria-label="Otro monto de propina" inputMode="numeric" placeholder="Otro monto" value={customTip}
                onChange={(e) => setCustomTip(digitsOnly(e.target.value).slice(0, 5))} className="h-9 w-32 rounded-full" />
            </div>
          </Section>
        </div>

        <aside>
          <div className="sticky top-24 rounded-2xl p-5 ring-1 ring-line">
            <h2 className="text-lg font-bold">Resumen</h2>
            <CartLines />
            <div className="mt-2 border-t border-line pt-4">
              {data ? (
                <div className={quote.isFetching ? 'opacity-60 transition-opacity' : ''}>
                  <PriceBreakdown subtotal={data.subtotal} deliveryFee={data.delivery_fee} serviceFee={data.service_fee}
                    tip={data.tip} total={data.total} ivaIncluded={data.iva_included} isHoliday={data.is_holiday} distanceKm={data.distance_km} />
                  <p className="mt-3 text-sm text-ink-2">Llega en {data.eta_min}–{data.eta_max} min después de que el restaurante lo confirme.</p>
                </div>
              ) : addressId && quote.isLoading ? (
                <div className="space-y-2"><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-6" /></div>
              ) : (
                <p className="text-sm text-ink-2">Elegí la dirección de entrega para calcular el envío.</p>
              )}
            </div>
            {closed && <p role="alert" className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">El restaurante cerró. Podés pedir más tarde.</p>}
            {formError && <p role="alert" className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{formError}</p>}
            <Button block size="lg" className="mt-4 justify-between px-5" onClick={submit}
              disabled={!data || closed || outOfRange || quote.isFetching} loading={placeOrder.isPending}
              icon={placeOrder.isPending ? undefined : <Check className="h-5 w-5" />}>
              <span className="flex-1 text-left">{placeOrder.isPending && method === 'card' ? 'Procesando pago' : 'Hacer pedido'}</span>
              {data && <span className="money">{money(data.total)}</span>}
            </Button>
          </div>
        </aside>
      </div>

      <AddressDialog open={addressOpen} onClose={() => setAddressOpen(false)} startWithForm />
    </div>
  );
}
