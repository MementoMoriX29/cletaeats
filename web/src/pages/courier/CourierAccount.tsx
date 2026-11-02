import { useQuery } from '@tanstack/react-query';
import { get } from '../../lib/api';
import type { CourierDashboard } from '../../lib/types';
import { PasswordForm, ProfileForm } from '../../components/account/ProfileForms';

export default function CourierAccount() {
  const { data } = useQuery({ queryKey: ['courier'], queryFn: () => get<CourierDashboard>('/courier/me') });
  const profile = data?.profile;
  return (
    <div className="space-y-6">
      <h1 className="font-wide text-2xl font-extrabold">Cuenta</h1>
      {profile && (
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <dt className="text-sm text-ink-2">Vehículo</dt>
            <dd className="font-semibold capitalize">{profile.vehicle}</dd>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <dt className="text-sm text-ink-2">Amonestaciones</dt>
            <dd className={`font-semibold ${profile.warnings_count >= 3 ? 'text-danger-600' : ''}`}>{profile.warnings_count} de 4</dd>
          </div>
        </dl>
      )}
      <p className="text-sm text-ink-2">Con 4 amonestaciones la cuenta se suspende hasta que soporte la revise.</p>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <h2 className="mb-4 font-bold">Datos personales</h2>
        <ProfileForm />
      </section>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <h2 className="mb-4 font-bold">Contraseña</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
