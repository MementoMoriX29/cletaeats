// Menú del restaurante: productos por sección, precio y disponibilidad ("Agotado").
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { del, errorMessage, fieldErrors, get, patch, post, put } from '../../lib/api';
import { money } from '../../lib/format';
import type { MenuProduct, MenuSection } from '../../lib/types';
import { Button, IconButton } from '../../components/ui/Button';
import { Field, Input, TextArea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Switch } from '../../components/ui/Switch';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';

interface Draft {
  section: string;
  name: string;
  description: string;
  price: string;
  available: boolean;
}

function ProductDialog({ product, sections, open, onClose }: { product: MenuProduct | null; sections: string[]; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => ({
    section: product?.section ?? sections[0] ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    available: product?.available ?? true,
  }));
  const save = useMutation({
    mutationFn: () => {
      const body = { ...draft, description: draft.description || null, price: Number(draft.price) };
      return product ? put<MenuProduct>(`/merchant/products/${product.id}`, body) : post<MenuProduct>('/merchant/products', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success(product ? 'Producto actualizado' : 'Producto agregado al menú');
      onClose();
    },
  });
  const errors = fieldErrors(save.error);
  const set = (patchValue: Partial<Draft>) => setDraft((current) => ({ ...current, ...patchValue }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <Modal open={open} onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="product-form" loading={save.isPending}>Guardar</Button></div>}>
      <form id="product-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Sección del menú" hint="Por ejemplo: Platos fuertes, Bebidas, Postres." error={errors.section}>
          {(props) => (
            <>
              <Input {...props} list="menu-sections" value={draft.section} maxLength={40} onChange={(e) => set({ section: e.target.value })} />
              <datalist id="menu-sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Nombre" error={errors.name}>
          {(props) => <Input {...props} value={draft.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />}
        </Field>
        <Field label="Descripción (opcional)" error={errors.description}>
          {(props) => <TextArea {...props} rows={2} maxLength={250} value={draft.description} onChange={(e) => set({ description: e.target.value })} className="min-h-0" />}
        </Field>
        <Field label="Precio con IVA (₡)" error={errors.price}>
          {(props) => <Input {...props} inputMode="numeric" value={draft.price} onChange={(e) => set({ price: e.target.value.replace(/\D/g, '').slice(0, 6) })} />}
        </Field>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Disponible para pedir</span>
          <Switch label="Disponible para pedir" checked={draft.available} onChange={(available) => set({ available })} />
        </label>
        {save.isError && !Object.keys(errors).length && <p className="text-sm text-danger-600">{errorMessage(save.error)}</p>}
      </form>
    </Modal>
  );
}

export default function MerchantMenu() {
  const queryClient = useQueryClient();
  const menu = useQuery({ queryKey: ['menu'], queryFn: () => get<MenuSection[]>('/merchant/menu') });
  const [editing, setEditing] = useState<{ product: MenuProduct | null } | null>(null);
  const [deleting, setDeleting] = useState<MenuProduct | null>(null);

  const toggle = useMutation({
    mutationFn: ({ id, available }: { id: number; available: boolean }) => patch<MenuProduct>(`/merchant/products/${id}/availability`, { available }),
    onMutate: async ({ id, available }) => {
      await queryClient.cancelQueries({ queryKey: ['menu'] });
      queryClient.setQueryData<MenuSection[]>(['menu'], (sections) => sections?.map((s) => ({
        ...s, products: s.products.map((p) => (p.id === id ? { ...p, available } : p)),
      })));
    },
    onError: (error) => {
      toast.error(errorMessage(error));
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => del(`/merchant/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setDeleting(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (menu.isLoading) return <PageSpinner />;
  if (menu.isError || !menu.data) return <ErrorState onRetry={() => menu.refetch()} />;
  const sections = menu.data.map((s) => s.name);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-wide text-3xl font-extrabold tracking-tight">Menú</h1>
          <p className="mt-1 text-ink-2">Los cambios se ven al instante en la app. Marcá como agotado lo que no tengás hoy.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ product: null })}>Agregar producto</Button>
      </div>

      {menu.data.length === 0 ? (
        <EmptyState title="Tu menú está vacío" action={<Button onClick={() => setEditing({ product: null })}>Agregar el primer producto</Button>}>
          Agregá productos con su precio para empezar a recibir pedidos.
        </EmptyState>
      ) : menu.data.map((section) => (
        <section key={section.name} className="mt-8">
          <h2 className="mb-2 text-lg font-bold">{section.name}</h2>
          <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
            {section.products.map((product) => (
              <li key={product.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${product.available ? '' : 'text-ink-3'}`}>{product.name}</p>
                  {product.description && <p className="truncate text-sm text-ink-2">{product.description}</p>}
                </div>
                <p className="money w-24 text-right font-semibold">{money(product.price)}</p>
                <div className="flex w-32 items-center justify-end gap-2">
                  <span className={`text-sm ${product.available ? 'text-brand-700' : 'text-ink-3'}`}>{product.available ? 'Disponible' : 'Agotado'}</span>
                  <Switch label={`${product.name} disponible`} checked={product.available}
                    onChange={(available) => toggle.mutate({ id: product.id, available })} />
                </div>
                <IconButton label={`Editar ${product.name}`} onClick={() => setEditing({ product })}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label={`Borrar ${product.name}`} onClick={() => setDeleting(product)}><Trash2 className="h-4 w-4" /></IconButton>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && <ProductDialog key={editing.product?.id ?? 'new'} product={editing.product} sections={sections} open onClose={() => setEditing(null)} />}
      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="¿Borrar el producto?" size="sm"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>Borrar</Button></div>}>
        <p className="text-ink-2"><span className="font-semibold text-ink">{deleting?.name}</span> deja de aparecer en el menú. Los pedidos anteriores no cambian.</p>
      </Modal>
    </div>
  );
}
