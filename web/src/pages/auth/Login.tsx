// Equivalente a: LoginScreen.kt (Jetpack Compose)
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { login as loginApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import type { UserRole } from '../../types';

type RoleTab = 'cliente' | 'repartidor' | 'admin';

const ROLES: { value: RoleTab; label: string }[] = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'repartidor', label: 'Repartidor' },
  { value: 'admin', label: 'Admin' },
];

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', rol: 'cliente' as RoleTab });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suspendedError, setSuspendedError] = useState(false);

  useEffect(() => {
    const flash = sessionStorage.getItem('cletaeats:flash');
    if (!flash) return;
    toast.error(flash);
    sessionStorage.removeItem('cletaeats:flash');
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuspendedError(false);
    setLoading(true);
    try {
      const { data } = await loginApi(form);
      const role = data.user.rol as UserRole;
      login({
        id: data.user.id,
        nombre: data.user.name ?? data.user.email,
        email: data.user.email,
        role,
        token: data.token,
      });
      if (role === 'cliente') navigate('/client/home');
      else if (role === 'repartidor') navigate('/delivery/dashboard');
      else navigate('/admin/dashboard');
    } catch (err: unknown) {
      if ((err as { __cletaHandled?: boolean }).__cletaHandled) return;
      const response = (err as { response?: { status?: number; data?: { message?: string; error?: string } } })?.response;
      if (response?.status === 401) toast.error('Credenciales incorrectas');
      else if (response?.status === 403) setSuspendedError(true);
      else toast.error(response?.data?.message ?? response?.data?.error ?? 'Sin conexión. Verificá tu internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-8 w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-primary font-bold text-3xl tracking-tight">CletaEats</h1>
          <p className="text-muted-foreground text-sm mt-1">Delivery Heredia</p>
        </div>

        {suspendedError && (
          <div className="flex items-center gap-3 rounded-xl bg-error/15 border border-error/40 px-4 py-3">
            <XCircle size={20} className="text-error shrink-0" />
            <p className="text-error text-sm">Tu cuenta está suspendida. Contactá al administrador.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Selector de rol */}
          <div className="flex flex-col gap-2">
            <p className="text-foreground text-sm font-medium text-center">Soy...</p>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {ROLES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rol: value }))}
                  className={`flex-1 py-2 text-sm transition-colors ${
                    form.rol === value
                      ? 'bg-primary text-white font-semibold'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Correo electrónico</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Contraseña con toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button type="submit" loading={loading} size="lg">
            Iniciar Sesión
          </Button>
        </form>

        <p className="text-center text-muted-foreground text-sm">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
};
