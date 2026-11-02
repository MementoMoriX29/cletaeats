// Elegir dónde se entrega. Clientes: sus direcciones guardadas o una nueva. Sin cuenta: un punto en el mapa.
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorMessage, fieldErrors, post } from '../../lib/api';
import type { Address } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { fromAddress, useDeliveryLocation } from '../../context/LocationContext';
import { Modal } from '../ui/Modal';
import { AddressForm, type AddressValues } from './AddressForm';

export function AddressDialog({ open, onClose, startWithForm = false }: { open: boolean; onClose: () => void; startWithForm?: boolean }) {
  const { user } = useAuth();
  const { location, setLocation, addresses } = useDeliveryLocation();
  const queryClient = useQueryClient();
  const isClient = user?.role === 'client';
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) setAdding(startWithForm);
  }, [open, startWithForm]);

  const create = useMutation({
    mutationFn: (values: AddressValues & { point: { lat: number; lng: number } }) => post<Address>('/me/addresses', {
      label: values.label, line: values.line, details: values.details || null, ...values.point,
    }),
    onSuccess: (address) => {
      queryClient.setQueryData<Address[]>(['addresses'], (current = []) => [...current, address]);
      setLocation(fromAddress(address));
      setAdding(false);
      onClose();
    },
  });

  const close = () => {
    setAdding(false);
    onClose();
  };

  const showForm = adding || !isClient || addresses.length === 0;

  return (
    <Modal open={open} onClose={close} title={showForm ? 'Nueva dirección' : '¿Dónde te lo llevamos?'}>
      {showForm ? (
        <div className="space-y-4">
          {!isClient && (
            <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink-2">
              <Link to="/ingresar" onClick={close} className="font-semibold text-brand-700 underline underline-offset-2">Iniciá sesión</Link>{' '}
              para guardar tus direcciones.
            </p>
          )}
          <AddressForm
            withLabel={isClient}
            submitLabel={isClient ? 'Guardar dirección' : 'Usar esta ubicación'}
            saving={create.isPending}
            serverErrors={fieldErrors(create.error)}
            initial={!isClient && location ? { line: location.line, details: location.details ?? '', point: location } : undefined}
            onSubmit={(values) => {
              if (isClient) create.mutate(values);
              else {
                setLocation({ label: 'Ubicación', line: values.line, details: values.details || null, ...values.point });
                close();
              }
            }}
          />
          {create.isError && !Object.keys(fieldErrors(create.error)).length && (
            <p className="text-sm text-danger-600">{errorMessage(create.error)}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
            {addresses.map((address) => {
              const selected = location?.addressId === address.id;
              return (
                <li key={address.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(fromAddress(address));
                      close();
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{address.label}</span>
                      <span className="block truncate text-sm text-ink-2">{address.line}</span>
                    </span>
                    {selected && <Check className="mt-1 h-5 w-5 text-brand-600" aria-label="Seleccionada" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-3 font-semibold text-brand-700 hover:bg-brand-50">
            <Plus className="h-5 w-5" /> Agregar dirección
          </button>
        </div>
      )}
    </Modal>
  );
}
