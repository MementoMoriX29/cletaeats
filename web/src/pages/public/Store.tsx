// Ficha del restaurante: menú por secciones y carrito.
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, Clock, MapPin, Plus, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { get } from '../../lib/api';
import { money } from '../../lib/format';
import type { MenuProduct, RestaurantDetail } from '../../lib/types';
import { useCart } from '../../context/CartContext';
import { useDeliveryLocation } from '../../context/LocationContext';
import { Cover } from '../../components/brand/Cover';
import { coverStyle } from '../../components/brand/categoryStyle';
import { RatingLabel } from '../../components/ui/Stars';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { CartLines } from '../../components/layout/CartDialog';
import { initials } from '../../lib/format';

const sectionId = (name: string) => `seccion-${name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}`;

function ProductTile({ product, quantity, disabled, onAdd }: { product: MenuProduct; quantity: number; disabled: boolean; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled || !product.available}
      className="group flex w-full items-stretch gap-3 rounded-xl p-4 text-left ring-1 ring-inset ring-line transition-shadow hover:ring-line-strong disabled:cursor-not-allowed disabled:hover:ring-line"
      aria-label={`Agregar ${product.name}, ${money(product.price)}`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold leading-snug ${product.available ? '' : 'text-ink-3'}`}>{product.name}</span>
        {product.description && <span className="mt-1 line-clamp-2 block text-sm text-ink-2">{product.description}</span>}
        <span className="mt-2 flex items-center gap-2">
          <span className={`money font-semibold ${product.available ? '' : 'text-ink-3 line-through'}`}>{money(product.price)}</span>
          {!product.available && <Badge>Agotado</Badge>}
        </span>
      </span>
      {product.available && (
        <span className={`flex h-9 shrink-0 items-center justify-center self-end rounded-full font-bold transition-colors ${
          quantity ? 'min-w-9 bg-ink px-2.5 text-sm text-white' : 'w-9 bg-canvas text-ink group-hover:bg-line group-disabled:opacity-40'}`}>
          {quantity ? <span className="money">{quantity}</span> : <Plus className="h-5 w-5" aria-hidden="true" />}
        </span>
      )}
    </button>
  );
}

export default function Store() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { location } = useDeliveryLocation();
  const [conflict, setConflict] = useState<MenuProduct | null>(null);

  const query = useQuery({
    queryKey: ['restaurant', id, location?.lat, location?.lng],
    queryFn: () => get<RestaurantDetail>(`/restaurants/${id}`, { lat: location?.lat, lng: location?.lng }),
    retry: (count, error) => (error as { response?: { status?: number } }).response?.status !== 404 && count < 2,
  });

  const restaurant = query.data;
  const quantities = useMemo(() => new Map(
    cart.restaurant?.id === restaurant?.id ? cart.lines.map((l) => [l.product_id, l.quantity]) : [],
  ), [cart, restaurant?.id]);

  if (query.isLoading) return <PageSpinner />;
  if (!restaurant) {
    return (
      <EmptyState title="Este restaurante no está disponible" className="py-24"
        action={<Link to="/" className="font-semibold text-brand-700 underline underline-offset-4">Ver otros restaurantes</Link>}>
        Puede que ya no esté en CletaEats.
      </EmptyState>
    );
  }

  const outOfRange = restaurant.delivery && !restaurant.delivery.in_range;
  const canOrder = restaurant.is_open && !outOfRange;
  const inThisCart = cart.restaurant?.id === restaurant.id && cart.count > 0;
  const ref = { id: restaurant.id, name: restaurant.name };

  const add = (product: MenuProduct) => {
    if (!cart.add(ref, product)) {
      setConflict(product);
      return;
    }
    toast.success(`${product.name} en tu pedido`, { id: 'cart-add', duration: 1500 });
  };

  const { fg } = coverStyle(restaurant.category);

  return (
    <div className="pb-28 lg:pb-16">
      <div className="relative">
        <Cover name={restaurant.name} category={restaurant.category} imageUrl={restaurant.image_url} showMonogram={false} className="h-40 w-full sm:h-56" />
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative -mt-10 mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white font-wide text-2xl font-extrabold shadow-float ring-4 ring-white" style={{ color: fg }} aria-hidden="true">
          {initials(restaurant.name)}
        </div>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <h1 className="font-wide text-3xl font-extrabold tracking-tight sm:text-4xl">{restaurant.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
              <RatingLabel rating={restaurant.rating} />
              <span>{restaurant.category}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{restaurant.address}</span>
            </div>
            {restaurant.description && <p className="mt-3 max-w-2xl text-ink-2">{restaurant.description}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {!restaurant.is_open && <Badge tone="danger">Cerrado ahora</Badge>}
              {outOfRange && <Badge tone="warning">No llega hasta tu dirección (máximo 7 km)</Badge>}
              {restaurant.delivery?.in_range && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-sm font-semibold">
                    <Clock className="h-4 w-4" aria-hidden="true" />{restaurant.delivery.eta_min}–{restaurant.delivery.eta_max} min
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-sm font-semibold">
                    <Bike className="h-4 w-4" aria-hidden="true" /><span className="money">Envío {money(restaurant.delivery.delivery_fee)}</span>
                  </span>
                </>
              )}
            </div>

            <nav aria-label="Secciones del menú" className="sticky top-16 z-30 -mx-4 mt-6 border-b border-line bg-white/95 px-4 backdrop-blur md:top-16">
              <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
                {restaurant.menu.map((section) => (
                  <a key={section.name} href={`#${sectionId(section.name)}`}
                    className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-2 hover:bg-canvas hover:text-ink">
                    {section.name}
                  </a>
                ))}
              </div>
            </nav>

            {restaurant.menu.map((section) => (
              <section key={section.name} id={sectionId(section.name)} className="scroll-mt-32 pt-8">
                <h2 className="mb-3 text-xl font-bold">{section.name}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {section.products.map((product) => (
                    <ProductTile key={product.id} product={product} quantity={quantities.get(product.id) ?? 0}
                      disabled={!canOrder} onAdd={() => add(product)} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl p-5 ring-1 ring-line">
              <h2 className="text-lg font-bold">Tu pedido</h2>
              {inThisCart ? (
                <>
                  <CartLines />
                  <Button block size="lg" className="mt-3" onClick={() => navigate('/checkout')}>
                    Ir a pagar <span className="money">{money(cart.subtotal)}</span>
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-2">
                  {canOrder ? 'Tocá un producto para agregarlo.' : 'Por ahora no podés pedir en este restaurante.'}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {inThisCart && (
        <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
          <Button block size="lg" className="shadow-float" onClick={() => navigate('/checkout')}
            icon={<ShoppingBag className="h-5 w-5" />}>
            Ver pedido ({cart.count}) <span className="money">{money(cart.subtotal)}</span>
          </Button>
        </div>
      )}

      <Modal open={Boolean(conflict)} onClose={() => setConflict(null)} title="¿Empezar un pedido nuevo?" size="sm"
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConflict(null)}>Seguir con el actual</Button>
            <Button onClick={() => {
              if (conflict) cart.startNew(ref, [{ product_id: conflict.id, name: conflict.name, price: conflict.price, quantity: 1 }]);
              setConflict(null);
            }}>
              Empezar nuevo
            </Button>
          </div>
        )}>
        <p className="text-ink-2">Tu carrito tiene productos de <span className="font-semibold text-ink">{cart.restaurant?.name}</span>. Cada pedido es de un solo restaurante: si seguís, se vacía.</p>
      </Modal>
    </div>
  );
}
