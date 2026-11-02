// Mi cuenta (cliente): datos, direcciones guardadas y contraseña.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { del, errorMessage, fieldErrors, post, put } from '../../lib/api';
import type { Address } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { useDeliveryLocation } from '../../context/LocationContext';
import { AddressForm, type AddressValues } from '../../components/address/AddressForm';
import { PasswordForm, ProfileForm } from '../../components/account/ProfileForms';
import { Button, IconButton } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

function AddressEditor({ address, open, onClose }: { address: Address | null; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (values: AddressValues & { point: { lat: number; lng: number } }) => {
      const body = { label: values.label, line: values.line, details: values.details || null, ...values.point };
      return address ? put<Address>(`/me/addresses/${address.id}`, body) : post<Address>('/me/addresses', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(address ? 'Dirección actualizada' : 'Dirección guardada');
      onClose();
    },
  });
  return (
    <Modal open={open} onClose={onClose} title={address ? 'Editar dirección' : 'Nueva dirección'}>
      <AddressForm
        key={address?.id ?? 'new'}
        submitLabel="Guardar dirección"
        saving={save.isPending}
        serverErrors={fieldErrors(save.error)}
        initial={address ? { label: address.label, line: address.line, details: address.details ?? '', point: address } : undefined}
        onSubmit={(values) => save.mutate(values)}
      />
      {save.isError && !Object.keys(fieldErrors(save.error)).length && <p className="mt-3 text-sm text-danger-600">{errorMessage(save.error)}</p>}
    </Modal>
  );
}

export default function Account() {
  const { logout } = useAuth();
  const { addresses } = useDeliveryLocation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Address | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const remove = useMutation({
    mutationFn: (id: number) => del(`/me/addresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <h1 className="font-wide text-3xl font-extrabold tracking-tight">Mi cuenta</h1>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold">Datos personales</h2>
        <ProfileForm />
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Direcciones</h2>
          <Button variant="outline" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setEditorOpen(true); }}>
            Agregar
          </Button>
        </div>
        {addresses.length ? (
          <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
            {addresses.map((address) => (
              <li key={address.id} className="flex items-center gap-3 px-4 py-3">
                <MapPin className="h-5 w-5 shrink-0 text-ink-3" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{address.label}</p>
                  <p className="truncate text-sm text-ink-2">{address.line}{address.details ? `. ${address.details}` : ''}</p>
                </div>
                <IconButton label={`Editar ${address.label}`} onClick={() => { setEditing(address); setEditorOpen(true); }}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label={`Borrar ${address.label}`} onClick={() => remove.mutate(address.id)} disabled={remove.isPending}><Trash2 className="h-4 w-4" /></IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2">No tenés direcciones guardadas.</p>
        )}
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="mb-4 text-lg font-bold">Contraseña</h2>
        <PasswordForm />
      </section>

      <section className="mt-10 border-t border-line pt-8">
        <Button variant="ghost" className="text-danger-600" onClick={logout}>Cerrar sesión</Button>
      </section>

      <AddressEditor address={editing} open={editorOpen} onClose={() => setEditorOpen(false)} />
    </div>
  );
}
