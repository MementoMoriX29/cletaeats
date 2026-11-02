// Página para repartidores: qué ofrece CletaEats y la solicitud (queda pendiente hasta que soporte la revise).
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Bike, CalendarClock, HandCoins } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errorMessage, fieldErrors } from '../../lib/api';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { Logo } from '../../components/brand/Logo';
import { PasswordInput } from './PasswordInput';

const BENEFITS = [
  { Icon: HandCoins, title: 'Ganás por cada entrega', text: 'La tarifa de envío completa y el 100 % de las propinas.' },
  { Icon: CalendarClock, title: 'Vos decidís cuándo', text: 'Te conectás cuando querés y tomás los pedidos que te sirven.' },
  { Icon: Bike, title: 'En bici o scooter', text: 'Entregas cortas dentro de Heredia, de hasta 7 km.' },
];

export default function CourierApply() {
  const { user, applyAsCourier } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', national_id: '', email: '', phone: '', password: '' });
  const [vehicle, setVehicle] = useState<'bicicleta' | 'scooter'>('bicicleta');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  if (user?.role === 'courier') return <Navigate to="/repartidor" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setErrors({});
    setLoading(true);
    try {
      await applyAsCourier({ ...values, vehicle });
      navigate('/repartidor', { replace: true });
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) setError(errorMessage(err, 'No pudimos enviar tu solicitud'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="CletaEats, inicio"><Logo suffix="Repartidores" /></Link>
        <Link to="/ingresar" className="text-sm font-semibold hover:underline">Ya tengo cuenta</Link>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-8 lg:grid-cols-[1fr_420px] lg:pt-16">
        <section>
          <h1 className="max-w-xl font-wide text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Repartí en Heredia con tu bici
          </h1>
          <p className="mt-4 max-w-lg text-lg text-ink-2">
            Llevá pedidos de restaurantes de tu zona y cobrá cada semana. Sin horarios fijos.
          </p>
          <ul className="mt-10 max-w-lg space-y-6">
            {BENEFITS.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span><span className="block font-semibold">{title}</span><span className="text-ink-2">{text}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl p-6 ring-1 ring-line">
          <h2 className="text-xl font-bold">Enviá tu solicitud</h2>
          <p className="mt-1 text-sm text-ink-2">Soporte la revisa y te habilita la cuenta. Mientras tanto podés ver el estado al ingresar.</p>
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field label="Nombre completo" error={errors.name}>
              {(props) => <Input {...props} autoComplete="name" value={values.name} onChange={set('name')} />}
            </Field>
            <Field label="Cédula" hint="9 dígitos, o 11–12 si es DIMEX." error={errors.national_id}>
              {(props) => <Input {...props} inputMode="numeric" placeholder="1-2345-0678" value={values.national_id} onChange={set('national_id')} />}
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-semibold">Vehículo</p>
              <Segmented label="Vehículo" value={vehicle} onChange={setVehicle}
                options={[{ value: 'bicicleta', label: 'Bicicleta' }, { value: 'scooter', label: 'Scooter' }]} />
            </div>
            <Field label="Correo" error={errors.email}>
              {(props) => <Input {...props} type="email" autoComplete="email" value={values.email} onChange={set('email')} />}
            </Field>
            <Field label="Teléfono" error={errors.phone}>
              {(props) => <Input {...props} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="8888-8888" value={values.phone} onChange={set('phone')} />}
            </Field>
            <Field label="Contraseña" hint="Al menos 8 caracteres." error={errors.password}>
              {(props) => <PasswordInput {...props} autoComplete="new-password" value={values.password} onChange={set('password')} />}
            </Field>
            {error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
            <Button type="submit" block size="lg" loading={loading}>Enviar solicitud</Button>
          </form>
        </section>
      </main>
    </div>
  );
}
