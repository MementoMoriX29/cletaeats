// Equivalente a: RegisterScreen.kt (Jetpack Compose)
// Pattern: Context API (equivalente a ViewModel + StateFlow)

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerClient, registerDelivery } from '../../api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  isValidAddress,
  isValidCardNumber,
  isValidEmail,
  isValidName,
  isValidNationalId,
  isValidPassword,
  isValidPhoneCR,
} from '../../utils/validation';

type Tab = 'cliente' | 'repartidor';

type FormState = {
  cedula: string;
  nombre: string;
  correo: string;
  direcc: string;
  tel: string;
  tarjeta: string;
  contra: string;
  confirmContra: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  cedula: '',
  nombre: '',
  correo: '',
  direcc: '',
  tel: '',
  tarjeta: '',
  contra: '',
  confirmContra: '',
};

const validateForm = (form: FormState): FormErrors => {
  const errors: FormErrors = {};
  if (!isValidNationalId(form.cedula)) errors.cedula = 'La cédula debe tener entre 9 y 20 dígitos.';
  if (!isValidName(form.nombre)) errors.nombre = 'El nombre debe tener al menos 3 caracteres.';
  if (!isValidEmail(form.correo)) errors.correo = 'Ingresá un correo válido.';
  if (!isValidAddress(form.direcc)) errors.direcc = 'La dirección debe tener al menos 10 caracteres.';
  if (!isValidPhoneCR(form.tel)) errors.tel = 'El teléfono debe tener 8 dígitos y empezar con 6, 7 u 8.';
  if (!isValidCardNumber(form.tarjeta)) errors.tarjeta = 'La tarjeta debe tener exactamente 16 dígitos.';
  if (!isValidPassword(form.contra)) {
    errors.contra = 'La contraseña debe tener 8 caracteres, una mayúscula y un número.';
  }
  if (form.confirmContra !== form.contra) errors.confirmContra = 'Las contraseñas no coinciden.';
  return errors;
};

export const Register = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('cliente');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  const showError = (key: keyof FormState) => (touched[key] || Object.keys(errors).length > 0) ? errors[key] : '';

  const set = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Cédula: solo dígitos, máximo 20
    if (key === 'cedula') {
      value = value.replace(/\D/g, '').slice(0, 20);
    }
    // Teléfono: solo dígitos, máximo 8
    if (key === 'tel') {
      value = value.replace(/\D/g, '').slice(0, 8);
    }
    // Tarjeta: solo dígitos, máximo 16
    if (key === 'tarjeta') {
      value = value.replace(/\D/g, '').slice(0, 16);
    }
    
    const next = { ...form, [key]: value };
    setForm(next);
    if (Object.keys(errors).length > 0) setErrors(validateForm(next));
  };

  const handleBlur = (key: keyof FormState) => () => {
    setTouched((current) => ({ ...current, [key]: true }));
    setErrors(validateForm(form));
  };

  const resetDuplicates = () => {
    setErrors((current) => ({
      ...current,
      cedula: current.cedula?.includes('registrada') ? '' : current.cedula,
      correo: current.correo?.includes('uso') ? '' : current.correo,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setTouched({
      cedula: true,
      nombre: true,
      correo: true,
      direcc: true,
      tel: true,
      tarjeta: true,
      contra: true,
      confirmContra: true,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        national_id: form.cedula,
        name: form.nombre,
        address: form.direcc,
        card_number: form.tarjeta,
        phone: form.tel,
        email: form.correo,
        password: form.contra,
      };

      if (tab === 'cliente') await registerClient(payload);
      else await registerDelivery(payload);

      toast.success('Cuenta creada. Iniciá sesión.');
      navigate('/login');
    } catch (err: unknown) {
      if ((err as { __cletaHandled?: boolean }).__cletaHandled) return;

      const response = (err as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response;
      const message = response?.data?.message ?? response?.data?.error ?? '';

      if (response?.status === 409) {
        setErrors((current) => ({
          ...current,
          cedula: message.toLowerCase().includes('national_id') || message.toLowerCase().includes('cédula')
            ? 'Esta cédula ya está registrada.'
            : current.cedula,
          correo: message.toLowerCase().includes('email')
            ? 'Este correo ya está en uso.'
            : current.correo,
        }));
        return;
      }

      toast.error('No se pudo registrar. Revisá los datos e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = useMemo(() => 'text-sm px-2.5 py-1.5', []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-4 w-full max-w-[20rem] flex flex-col gap-3">
        <h1 className="text-white font-bold text-base text-center">Crear cuenta</h1>

        <div className="flex rounded-lg overflow-hidden border border-border">
          {(['cliente', 'repartidor'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm capitalize transition-colors ${
                tab === t ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Input label="Cédula" value={form.cedula} onChange={set('cedula')} onBlur={handleBlur('cedula')} required className={fieldClass} error={showError('cedula')} />
          <Input label="Nombre" value={form.nombre} onChange={set('nombre')} onBlur={handleBlur('nombre')} required className={fieldClass} error={showError('nombre')} />
          <Input label="Correo" type="email" value={form.correo} onChange={set('correo')} onBlur={handleBlur('correo')} required className={fieldClass} error={showError('correo')} />
          <Input label="Dirección" value={form.direcc} onChange={set('direcc')} onBlur={handleBlur('direcc')} required className={fieldClass} error={showError('direcc')} />
          <Input label="Teléfono" value={form.tel} onChange={set('tel')} onBlur={handleBlur('tel')} required className={fieldClass} error={showError('tel')} />
          <Input label="Tarjeta" value={form.tarjeta} onChange={set('tarjeta')} onBlur={handleBlur('tarjeta')} required className={fieldClass} error={showError('tarjeta')} />
          <Input label="Contraseña" type="password" value={form.contra} onChange={set('contra')} onBlur={handleBlur('contra')} required className={fieldClass} error={showError('contra')} />
          <Input label="Confirmar contraseña" type="password" value={form.confirmContra} onChange={set('confirmContra')} onBlur={handleBlur('confirmContra')} required className={fieldClass} error={showError('confirmContra')} />

          <Button type="submit" loading={loading} size="lg" className="mt-0.5 py-2 text-sm" onClick={resetDuplicates}>
            Registrarme
          </Button>
        </form>

        <p className="text-center text-muted-foreground text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
