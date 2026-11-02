// Inicio: restaurantes cerca de la dirección elegida, con búsqueda y categorías.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bike, Clock, MapPin, SearchX } from 'lucide-react';
import { get } from '../../lib/api';
import { money } from '../../lib/format';
import type { Category, RestaurantSummary } from '../../lib/types';
import { useDeliveryLocation } from '../../context/LocationContext';
import { Cover } from '../../components/brand/Cover';
import { coverStyle } from '../../components/brand/categoryStyle';
import { RatingLabel } from '../../components/ui/Stars';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Button, ButtonLink } from '../../components/ui/Button';
import { AddressDialog } from '../../components/address/AddressDialog';

function RestaurantTile({ restaurant }: { restaurant: RestaurantSummary }) {
  const { delivery } = restaurant;
  const unavailable = !restaurant.is_open || (delivery && !delivery.in_range);
  return (
    <Link to={`/restaurante/${restaurant.id}`} className="group block rounded-xl focus-visible:ring-offset-4">
      <div className="relative">
        <Cover name={restaurant.name} category={restaurant.category} imageUrl={restaurant.image_url}
          className={`aspect-[16/9] rounded-xl ${unavailable ? 'grayscale-[60%]' : ''}`} />
        {unavailable && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-sm">
            {!restaurant.is_open ? 'Cerrado ahora' : 'No llega a tu dirección'}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug group-hover:underline group-hover:underline-offset-2">{restaurant.name}</h3>
        <RatingLabel rating={restaurant.rating} className="shrink-0" />
      </div>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-2">
        {delivery?.in_range ? (
          <>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{delivery.eta_min}–{delivery.eta_max} min</span>
            <span className="inline-flex items-center gap-1"><Bike className="h-3.5 w-3.5" aria-hidden="true" /><span className="money">Envío {money(delivery.delivery_fee)}</span></span>
          </>
        ) : (
          <span>{restaurant.category}</span>
        )}
      </p>
    </Link>
  );
}

function CategoryRail({ categories, active, onSelect }: { categories: Category[]; active: string; onSelect: (c: string) => void }) {
  return (
    <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
      {categories.map(({ category }) => {
        const { bg, fg, Icon } = coverStyle(category);
        const selected = active === category;
        return (
          <button key={category} type="button" onClick={() => onSelect(selected ? '' : category)} aria-pressed={selected}
            className="flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 hover:bg-canvas">
            <span className={`flex h-14 w-14 items-center justify-center rounded-full transition-shadow ${selected ? 'ring-2 ring-ink ring-offset-2' : ''}`}
              style={{ backgroundColor: bg }}>
              <Icon className="h-7 w-7" style={{ color: fg }} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className={`text-center text-xs leading-tight ${selected ? 'font-bold' : 'font-medium text-ink-2'}`}>{category}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const category = params.get('categoria') ?? '';
  const { location } = useDeliveryLocation();
  const [pickingAddress, setPickingAddress] = useState(false);

  const restaurants = useQuery({
    queryKey: ['restaurants', { search, category, lat: location?.lat, lng: location?.lng }],
    queryFn: () => get<RestaurantSummary[]>('/restaurants', {
      search: search || undefined, category: category || undefined, lat: location?.lat, lng: location?.lng,
    }),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/restaurants/categories'),
    staleTime: 5 * 60 * 1000,
  });

  const setCategory = (next: string) => {
    const updated = new URLSearchParams(params);
    if (next) updated.set('categoria', next);
    else updated.delete('categoria');
    setParams(updated);
  };

  const heading = search ? `Resultados para “${search}”`
    : category || (location ? 'Restaurantes cerca de vos' : 'Restaurantes en Heredia');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      {!location && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <p className="text-ink">
              <span className="font-semibold">¿Dónde te lo llevamos?</span>{' '}
              <span className="text-ink-2">Con tu dirección te mostramos cuánto cuesta el envío y cuánto tarda.</span>
            </p>
          </div>
          <Button onClick={() => setPickingAddress(true)}>Elegir dirección</Button>
        </div>
      )}

      {categories.data && categories.data.length > 1 && !search && (
        <CategoryRail categories={categories.data} active={category} onSelect={setCategory} />
      )}

      <div className="mb-4 mt-6 flex items-baseline justify-between gap-4">
        <h1 className="font-semiwide text-2xl font-extrabold tracking-tight sm:text-[28px]">{heading}</h1>
        {(search || category) && (
          <Link to="/" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">Ver todos</Link>
        )}
      </div>

      {restaurants.isLoading ? (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}><Skeleton className="aspect-[16/9] rounded-xl" /><Skeleton className="mt-3 h-4 w-2/3" /><Skeleton className="mt-2 h-3 w-1/2" /></div>
          ))}
        </div>
      ) : restaurants.isError ? (
        <ErrorState onRetry={() => restaurants.refetch()} />
      ) : restaurants.data?.length ? (
        <div className={`grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${restaurants.isPlaceholderData ? 'opacity-60' : ''}`}>
          {restaurants.data.map((restaurant) => <RestaurantTile key={restaurant.id} restaurant={restaurant} />)}
        </div>
      ) : (
        <EmptyState icon={<SearchX className="h-6 w-6" />} title="No encontramos restaurantes"
          action={<ButtonLink to="/" variant="outline">Ver todos los restaurantes</ButtonLink>}>
          Probá con otra palabra, por ejemplo “casado” o “pizza”.
        </EmptyState>
      )}

      <AddressDialog open={pickingAddress} onClose={() => setPickingAddress(false)} />
    </div>
  );
}
