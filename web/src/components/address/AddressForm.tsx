// Formulario de dirección: referencia escrita (como se dan en Costa Rica) + punto en el mapa.
import { lazy, Suspense, useState, type FormEvent } from 'react';
import type { Point } from '../../lib/types';
import { Field, Input } from '../ui/Field';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

// El mapa (Leaflet) se descarga recién cuando se abre el formulario
const LocationPicker = lazy(() => import('../map/LocationPicker').then((m) => ({ default: m.LocationPicker })));

export interface AddressValues {
  label: string;
  line: string;
  details: string;
  point: Point | null;
}

interface AddressFormProps {
  initial?: Partial<AddressValues>;
  withLabel?: boolean;
  submitLabel: string;
  saving?: boolean;
  serverErrors?: Record<string, string>;
  onSubmit: (values: AddressValues & { point: Point }) => void;
}

const LABELS = ['Casa', 'Trabajo', 'Universidad'];

export function AddressForm({ initial, withLabel = true, submitLabel, saving, serverErrors = {}, onSubmit }: AddressFormProps) {
  const [values, setValues] = useState<AddressValues>({
    label: initial?.label ?? 'Casa',
    line: initial?.line ?? '',
    details: initial?.details ?? '',
    point: initial?.point ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<AddressValues>) => setValues((current) => ({ ...current, ...patch }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (withLabel && !values.label.trim()) next.label = 'Poné un nombre, por ejemplo Casa';
    if (values.line.trim().length < 5) next.line = 'Escribí la dirección con alguna referencia';
    if (!values.point) next.point = 'Marcá en el mapa dónde hay que entregar';
    setErrors(next);
    if (Object.keys(next).length || !values.point) return;
    onSubmit({ ...values, point: values.point });
  };

  const error = (key: string) => errors[key] ?? serverErrors[key];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {withLabel && (
        <Field label="Nombre" error={error('label')}>
          {(props) => (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {LABELS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set({ label })}
                    className={`h-8 rounded-full px-3 text-sm font-semibold ring-1 ring-inset ${values.label === label ? 'bg-ink text-white ring-ink' : 'ring-line-strong hover:bg-canvas'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Input {...props} value={values.label} maxLength={30} onChange={(e) => set({ label: e.target.value })} />
            </div>
          )}
        </Field>
      )}
      <Field label="Dirección" hint="Con señas, como se las darías a alguien: 200 m norte de la iglesia, casa esquinera." error={error('line')}>
        {(props) => (
          <Input {...props} value={values.line} maxLength={200} autoComplete="street-address"
            placeholder="Mercedes Norte, 200 m norte de la plaza" onChange={(e) => set({ line: e.target.value })} />
        )}
      </Field>
      <Field label="Detalles (opcional)" error={error('details')}>
        {(props) => (
          <Input {...props} value={values.details} maxLength={150} placeholder="Casa verde, portón negro, apartamento 4"
            onChange={(e) => set({ details: e.target.value })} />
        )}
      </Field>
      <div>
        <p className="mb-1.5 text-sm font-semibold">Ubicación en el mapa</p>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <LocationPicker value={values.point} onChange={(point) => set({ point })} />
        </Suspense>
        {(error('point') ?? error('lat')) && <p className="mt-1.5 text-sm text-danger-600">{error('point') ?? error('lat')}</p>}
      </div>
      <Button type="submit" block size="lg" loading={saving}>{submitLabel}</Button>
    </form>
  );
}
