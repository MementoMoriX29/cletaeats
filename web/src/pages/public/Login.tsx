// Un solo login para clientes, restaurantes, repartidores y soporte: el rol sale de la cuenta.
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { homeFor, useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';
import { DEMO } from '../../lib/demo';
import type { Role } from '../../lib/types';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';
import { PasswordInput } from './PasswordInput';

// Rutas a las que puede volver cada rol después de ingresar
const allowedNext = (role: Role, next: string | null) => {
  if (!next?.startsWith('/') || next.startsWith('//')) return null;
  const prefixes: Record<Role, string[]> = {
    client: ['/checkout', '/pedidos', '/cuenta', '/restaurante'],
    courier: ['/repartidor'],
    restaurant: ['/negocio'],
    admin: ['/admin'],
  };
  return prefixes[role].some((prefix) => next.startsWith(prefix)) ? next : null;
};

const DEMO_ACCOUNTS = [
  { label: 'Cliente', email: 'maria.garcia@example.com' },
  { label: 'Restaurante', email: 'lacasona@example.com' },
  { label: 'Repartidor', email: 'andres.jimenez@example.com' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={allowedNext(user.role, next) ?? homeFor(user.role)} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const account = await login(email, password);
      navigate(allowedNext(account.role, next) ?? homeFor(account.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'No pudimos iniciar tu sesión'));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Ingresá a tu cuenta"
      footer={(
        <>
          <p>¿No tenés cuenta? <Link to={`/registro${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-700 underline underline-offset-2">Creá una</Link></p>
          <p>¿Querés repartir? <Link to="/repartidores" className="font-semibold text-brand-700 underline underline-offset-2">Aplicá como repartidor</Link></p>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Correo">
          {(props) => <Input {...props} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Contraseña">
          {(props) => <PasswordInput {...props} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
        <Button type="submit" block size="lg" loading={loading}>Ingresar</Button>
      </form>

      {DEMO && (
        <details className="mt-6 rounded-xl bg-canvas px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ink-2">Cuentas de prueba de la demo</summary>
          <p className="mt-2 text-ink-2">Contraseña de todas: <span className="font-semibold text-ink">Password123</span></p>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button type="button" className="text-left hover:underline" onClick={() => { setEmail(account.email); setPassword('Password123'); }}>
                  <span className="font-semibold">{account.label}:</span> {account.email}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </AuthShell>
  );
}
