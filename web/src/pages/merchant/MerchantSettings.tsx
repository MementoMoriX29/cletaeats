// Ajustes de la tienda que maneja el restaurante. Nombre, cédula jurídica y dirección los cambia soporte.
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { errorMessage, fieldErrors, get, put } from '../../lib/api';
import type { Store } from '../../lib/types';
import { Cover } from '../../components/brand/Cover';
import { Button } from '../../components/ui/Button';
import { Field, Input, TextArea } from '../../components/ui/Field';
import { PageSpinner } from '../../components/ui/Spinner';
import { PasswordForm, ProfileForm } from '../../components/account/ProfileForms';

export default function MerchantSettings() {
  const queryClient = useQueryClient();
  const store = useQuery({ queryKey: ['store'], queryFn: () => get<Store>('/merchant/store') });
  const [form, setForm] = useState({ description: '', phone: '', sinpe_phone: '', image_url: '', prep_minutes: '20' });

  useEffect(() => {
    if (!store.data) return;
    setForm({
      description: store.data.description ?? '',
      phone: store.data.phone ?? '',
      sinpe_phone: store.data.sinpe_phone ?? '',
      image_url: store.data.image_url ?? '',
      prep_minutes: String(store.data.prep_minutes),
    });
  }, [store.data]);

  const save = useMutation({
    mutationFn: () => put<Store>('/merchant/store', { ...form, prep_minutes: Number(form.prep_minutes) }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Store>(['store'], (current) => current && ({ ...current, ...updated }));
      toast.success('Ajustes guardados');
    },
  });

  if (store.isLoading || !store.data) return <PageSpinner />;
  const errors = fieldErrors(save.error);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((c) => ({ ...c, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-wide text-3xl font-extrabold tracking-tight">Ajustes</h1>

      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-lg font-bold">{store.data.name}</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink-2 sm:grid-cols-2">
          <div><dt className="inline font-semibold text-ink">Cédula jurídica: </dt><dd className="inline">{store.data.tax_id}</dd></div>
          <div><dt className="inline font-semibold text-ink">Categoría: </dt><dd className="inline">{store.data.category}</dd></div>
          <div className="sm:col-span-2"><dt className="inline font-semibold text-ink">Dirección: </dt><dd className="inline">{store.data.address}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-ink-3">Para cambiar estos datos escribinos a soporte.</p>
      </section>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl bg-white p-5 ring-1 ring-line" noValidate>
        <h2 className="text-lg font-bold">Tu tienda en la app</h2>
        <Field label="Descripción" error={errors.description}>
          {(props) => <TextArea {...props} rows={2} maxLength={300} value={form.description} onChange={set('description')} className="min-h-0" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono del local" error={errors.phone}>
            {(props) => <Input {...props} type="tel" value={form.phone} onChange={set('phone')} />}
          </Field>
          <Field label="Número de SINPE Móvil" hint="Donde los clientes te pagan por SINPE." error={errors.sinpe_phone}>
            {(props) => <Input {...props} type="tel" value={form.sinpe_phone} onChange={set('sinpe_phone')} />}
          </Field>
        </div>
        <Field label="Tiempo de preparación habitual (minutos)" hint="Se usa para calcular la hora de llegada. Podés ajustarlo en cada pedido." error={errors.prep_minutes}>
          {(props) => <Input {...props} inputMode="numeric" value={form.prep_minutes} onChange={(e) => setForm((c) => ({ ...c, prep_minutes: e.target.value.replace(/\D/g, '').slice(0, 2) }))} className="max-w-[140px]" />}
        </Field>
        <Field label="Foto de portada (enlace https, opcional)" hint="Si no ponés una, usamos una portada con el color de tu categoría." error={errors.image_url}>
          {(props) => <Input {...props} type="url" placeholder="https://" value={form.image_url} onChange={set('image_url')} />}
        </Field>
        <Cover name={store.data.name} category={store.data.category} imageUrl={form.image_url || null} className="aspect-[16/6] rounded-xl" />
        {save.isError && !Object.keys(errors).length && <p className="text-sm text-danger-600">{errorMessage(save.error)}</p>}
        <Button type="submit" loading={save.isPending}>Guardar ajustes</Button>
      </form>

      <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="mb-4 text-lg font-bold">Tu cuenta</h2>
        <ProfileForm />
        <div className="mt-6 border-t border-line pt-6"><PasswordForm /></div>
      </section>
    </div>
  );
}
