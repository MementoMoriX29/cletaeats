import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { homeFor, useAuth } from '../../context/AuthContext';
import { errorMessage, fieldErrors } from '../../lib/api';
import { Field, Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { AuthShell } from './AuthShell';
import { PasswordInput } from './PasswordInput';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setErrors({});
    setLoading(true);
    try {
      await register(values);
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (!Object.keys(fields).length) setError(errorMessage(err, 'No pudimos crear tu cuenta'));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Creá tu cuenta"
      subtitle="Para pedir y seguir tus pedidos en tiempo real."
      footer={<p>¿Ya tenés cuenta? <Link to={`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-700 underline underline-offset-2">Ingresá</Link></p>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nombre completo" error={errors.name}>
          {(props) => <Input {...props} autoComplete="name" value={values.name} onChange={set('name')} />}
        </Field>
        <Field label="Correo" error={errors.email}>
          {(props) => <Input {...props} type="email" autoComplete="email" value={values.email} onChange={set('email')} />}
        </Field>
        <Field label="Teléfono" hint="El repartidor te llama a este número si hace falta." error={errors.phone}>
          {(props) => <Input {...props} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="8888-8888" value={values.phone} onChange={set('phone')} />}
        </Field>
        <Field label="Contraseña" hint="Al menos 8 caracteres." error={errors.password}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" value={values.password} onChange={set('password')} />}
        </Field>
        {error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</p>}
        <Button type="submit" block size="lg" loading={loading}>Crear cuenta</Button>
      </form>
    </AuthShell>
  );
}
