// Restaurantes: alta junto con la cuenta del dueño, datos legales y ubicación, habilitar o deshabilitar.
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage, fieldErrors, get, post, put } from '../../lib/api';
import { money } from '../../lib/format';
import type { AdminRestaurant } from '../../lib/adminTypes';
import type { Point } from '../../lib/types';
import { Cover } from '../../components/brand/Cover';
import { KNOWN_CATEGORIES } from '../../components/brand/categoryStyle';
import { LocationPicker } from '../../components/map/LocationPicker';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, Input, TextArea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { RatingLabel } from '../../components/ui/Stars';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';

interface FormState {
  name: string;
  tax_id: string;
  category: string;
  address: string;
  phone: string;
  point: Point | null;
  description: string;
  prep_minutes: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
}

const EMPTY: FormState = {
  name: '', tax_id: '', category: '', address: '', phone: '', point: null,
  description: '', prep_minutes: '20', owner_name: '', owner_email: '', owner_phone: '',
};

const fromRestaurant = (r: AdminRestaurant): FormState => ({
  ...EMPTY,
  name: r.name,
  tax_id: r.tax_id,
  category: r.category,
  address: r.address,
  phone: r.phone ?? '',
  point: { lat: r.lat, lng: r.lng },
});

// 3101123456 → 3-101-123456 mientras se escribe
const formatTaxId = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  return [digits.slice(0, 1), digits.slice(1, 4), digits.slice(4)].filter(Boolean).join('-');
};

interface Created {
  restaurant: AdminRestaurant;
  temporary_password: string;
}

// Se monta solo mientras está abierto: cada apertura empieza con el formulario y los errores limpios
function RestaurantDialog({ editing, onClose, onCreated }: {
  editing: AdminRestaurant | null;
  onClose: () => void;
  onCreated: (created: Created) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => (editing ? fromRestaurant(editing) : EMPTY));

  const payload = () => ({
    name: form.name,
    tax_id: form.tax_id,
    category: form.category,
    address: form.address,
    phone: form.phone,
    lat: form.point?.lat,
    lng: form.point?.lng,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return { updated: await put<AdminRestaurant>(`/admin/restaurants/${editing.id}`, payload()) };
      const created = await post<Created>('/admin/restaurants', {
        ...payload(),
        description: form.description,
        prep_minutes: Number(form.prep_minutes) || undefined,
        owner: { name: form.owner_name, email: form.owner_email, phone: form.owner_phone },
      });
      return { created };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      if (result.created) onCreated(result.created);
      else toast.success('Datos del restaurante guardados');
      onClose();
    },
  });

  const errors = fieldErrors(save.error);
  const set = (key: keyof FormState) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={editing ? `Editar ${editing.name}` : 'Agregar restaurante'}
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="restaurant-form" loading={save.isPending}>{editing ? 'Guardar cambios' : 'Crear restaurante'}</Button>
        </div>
      )}>
      <form id="restaurant-form" onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial" error={errors.name}>
            {(props) => <Input {...props} value={form.name} onChange={set('name')} maxLength={100} />}
          </Field>
          <Field label="Cédula jurídica" hint="Formato 3-101-123456" error={errors.tax_id}>
            {(props) => <Input {...props} inputMode="numeric" placeholder="3-101-123456" value={form.tax_id}
              onChange={(e) => setForm((c) => ({ ...c, tax_id: formatTaxId(e.target.value) }))} />}
          </Field>
          <Field label="Categoría" error={errors.category}>
            {(props) => (
              <>
                <Input {...props} list="restaurant-categories" value={form.category} onChange={set('category')} maxLength={40} />
                <datalist id="restaurant-categories">
                  {KNOWN_CATEGORIES.map((category) => <option key={category} value={category} />)}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Teléfono del local (opcional)" error={errors.phone}>
            {(props) => <Input {...props} type="tel" value={form.phone} onChange={set('phone')} />}
          </Field>
        </div>

        <Field label="Dirección" hint="Como la daría un cliente: distrito y referencias." error={errors.address}>
          {(props) => <Input {...props} value={form.address} onChange={set('address')} maxLength={200}
            placeholder="Heredia centro, 100 m norte del parque central" />}
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Ubicación del local</p>
          <LocationPicker value={form.point} onChange={(point) => setForm((c) => ({ ...c, point }))} className="h-56"
            emptyHint="Tocá el mapa donde está el local." />
          {(errors.lat || errors.lng) && <p className="mt-1.5 text-sm text-danger-600">{errors.lat ?? errors.lng}</p>}
        </div>

        {!editing && (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Descripción (opcional)" error={errors.description}>
                {(props) => <TextArea {...props} rows={2} maxLength={300} value={form.description} onChange={set('description')} className="min-h-0" />}
              </Field>
              <Field label="Preparación (min)" error={errors.prep_minutes}>
                {(props) => <Input {...props} inputMode="numeric" value={form.prep_minutes}
                  onChange={(e) => setForm((c) => ({ ...c, prep_minutes: e.target.value.replace(/\D/g, '').slice(0, 2) }))} />}
              </Field>
            </div>
            <div role="group" aria-labelledby="owner-title" className="space-y-4 rounded-xl bg-canvas p-4">
              <div>
                <p id="owner-title" className="font-semibold">Cuenta del dueño</p>
                <p className="text-sm text-ink-2">Con esta cuenta maneja los pedidos y el menú. Le damos una contraseña temporal.</p>
              </div>
              <Field label="Nombre completo" error={errors['owner.name']}>
                {(props) => <Input {...props} className="bg-white" value={form.owner_name} onChange={set('owner_name')} maxLength={100} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Correo" error={errors['owner.email']}>
                  {(props) => <Input {...props} type="email" className="bg-white" value={form.owner_email} onChange={set('owner_email')} />}
                </Field>
                <Field label="Teléfono" error={errors['owner.phone']}>
                  {(props) => <Input {...props} type="tel" className="bg-white" value={form.owner_phone} onChange={set('owner_phone')} />}
                </Field>
              </div>
            </div>
          </>
        )}
        {save.isError && !Object.keys(errors).length && <p className="text-sm text-danger-600">{errorMessage(save.error)}</p>}
      </form>
    </Modal>
  );
}

function CredentialsDialog({ created, onClose }: { created: Created | null; onClose: () => void }) {
  const owner = created?.restaurant.owner;
  const text = owner ? `CletaEats, panel de restaurantes\nCorreo: ${owner.email}\nContraseña temporal: ${created.temporary_password}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado');
    } catch {
      toast.error('No se pudo copiar. Seleccioná el texto y copialo.');
    }
  };
  return (
    <Modal open={Boolean(created)} onClose={onClose} title="Restaurante creado" size="sm"
      footer={<div className="flex justify-end gap-2"><Button variant="outline" icon={<Copy className="h-4 w-4" />} onClick={copy}>Copiar</Button><Button onClick={onClose}>Listo</Button></div>}>
      {created && owner && (
        <div className="space-y-4 text-sm">
          <p>Entregale estos datos a <span className="font-semibold">{owner.name}</span> para que entre al panel de <span className="font-semibold">{created.restaurant.name}</span>.</p>
          <dl className="space-y-2 rounded-xl bg-canvas p-4">
            <div><dt className="text-ink-2">Correo</dt><dd className="font-semibold">{owner.email}</dd></div>
            <div><dt className="text-ink-2">Contraseña temporal</dt><dd className="select-all font-mono text-base font-semibold">{created.temporary_password}</dd></div>
          </dl>
          <p className="text-ink-2">Solo se muestra esta vez. Al entrar la puede cambiar en Ajustes. La tienda queda cerrada hasta que cargue el menú y la abra.</p>
        </div>
      )}
    </Modal>
  );
}

function RestaurantRow({ restaurant, onEdit, onToggle }: {
  restaurant: AdminRestaurant;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const status = !restaurant.active
    ? <Badge tone="danger">Deshabilitado</Badge>
    : restaurant.is_open ? <Badge tone="brand">Abierto</Badge> : <Badge>Cerrado</Badge>;
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <Cover name={restaurant.name} category={restaurant.category} showMonogram={false} className={`h-14 w-14 shrink-0 rounded-lg ${restaurant.active ? '' : 'opacity-50'}`} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">{restaurant.name}{status}</p>
        <p className="truncate text-sm text-ink-2">{restaurant.category}. {restaurant.address}</p>
        <p className="truncate text-sm text-ink-3">
          {restaurant.owner ? <>Dueño: {restaurant.owner.name}, {restaurant.owner.email}</> : 'Sin cuenta de dueño'}
        </p>
      </div>
      <div className="flex items-center gap-5 text-sm sm:justify-end">
        <RatingLabel rating={restaurant.rating} />
        <div className="text-right">
          <p className="money font-semibold">{money(restaurant.gross_sales)}</p>
          <p className="text-ink-3">{restaurant.delivered_orders} entregados</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>Editar</Button>
        <Button size="sm" variant="outline" className={restaurant.active ? 'text-danger-600' : ''} onClick={onToggle}>
          {restaurant.active ? 'Deshabilitar' : 'Habilitar'}
        </Button>
      </div>
    </li>
  );
}

export default function AdminRestaurants() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; editing: AdminRestaurant | null }>({ open: false, editing: null });
  const [created, setCreated] = useState<Created | null>(null);
  const [toggling, setToggling] = useState<AdminRestaurant | null>(null);

  const query = useQuery({ queryKey: ['admin', 'restaurants'], queryFn: () => get<AdminRestaurant[]>('/admin/restaurants') });
  const toggle = useMutation({
    mutationFn: (restaurant: AdminRestaurant) =>
      post<AdminRestaurant>(`/admin/restaurants/${restaurant.id}/${restaurant.active ? 'deactivate' : 'activate'}`),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success(updated.active ? `${updated.name} vuelve a aparecer en la app` : `${updated.name} quedó deshabilitado`);
      setToggling(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const term = search.trim().toLowerCase();
  const list = (query.data ?? []).filter((r) =>
    !term || [r.name, r.category, r.address, r.owner?.name ?? '', r.owner?.email ?? ''].some((v) => v.toLowerCase().includes(term)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-wide text-3xl font-extrabold tracking-tight">Restaurantes</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" aria-label="Buscar restaurantes" className="h-10 pl-9" />
          </div>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setDialog({ open: true, editing: null })}>Agregar</Button>
        </div>
      </div>

      {query.isLoading ? <PageSpinner /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : list.length ? (
        <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
          {list.map((restaurant) => (
            <RestaurantRow key={restaurant.id} restaurant={restaurant}
              onEdit={() => setDialog({ open: true, editing: restaurant })}
              onToggle={() => (restaurant.active ? setToggling(restaurant) : toggle.mutate(restaurant))} />
          ))}
        </ul>
      ) : (
        <EmptyState title={term ? 'Ningún restaurante coincide con la búsqueda' : 'Todavía no hay restaurantes'} />
      )}

      {dialog.open && (
        <RestaurantDialog key={dialog.editing?.id ?? 'new'} editing={dialog.editing}
          onClose={() => setDialog({ open: false, editing: null })} onCreated={setCreated} />
      )}
      <CredentialsDialog created={created} onClose={() => setCreated(null)} />
      <Modal open={Boolean(toggling)} onClose={() => setToggling(null)} title={`¿Deshabilitar ${toggling?.name ?? ''}?`} size="sm"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setToggling(null)}>Cancelar</Button>
          <Button variant="danger" loading={toggle.isPending} onClick={() => toggling && toggle.mutate(toggling)}>Deshabilitar</Button></div>}>
        <p className="text-sm text-ink-2">Deja de aparecer en la app y se cierra la tienda. Los pedidos que ya están en curso siguen normalmente.</p>
      </Modal>
    </div>
  );
}
