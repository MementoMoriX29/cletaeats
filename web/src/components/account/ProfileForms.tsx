// Formularios de cuenta compartidos por todos los roles: datos personales y contraseña.
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { errorMessage, fieldErrors, put } from '../../lib/api';
import type { Session, User } from '../../lib/types';
import { useAuth } from '../../context/AuthContext';
import { Field, Input } from '../ui/Field';
import { Button } from '../ui/Button';
import { PasswordInput } from '../../pages/public/PasswordInput';

export function ProfileForm() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const save = useMutation({
    mutationFn: () => put<User>('/me', { name, phone }),
    onSuccess: (updated) => {
      updateUser(updated);
      setPhone(updated.phone ?? '');
      toast.success('Datos guardados');
    },
  });
  const errors = fieldErrors(save.error);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Nombre completo" error={errors.name}>
        {(props) => <Input {...props} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Teléfono" error={errors.phone}>
        {(props) => <Input {...props} type="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} />}
      </Field>
      <Field label="Correo" hint="Para cambiar el correo escribinos a soporte.">
        {(props) => <Input {...props} value={user?.email ?? ''} disabled readOnly />}
      </Field>
      {save.isError && !Object.keys(errors).length && <p className="text-sm text-danger-600">{errorMessage(save.error)}</p>}
      <Button type="submit" loading={save.isPending}>Guardar cambios</Button>
    </form>
  );
}

export function PasswordForm() {
  const { replaceSession } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const change = useMutation({
    mutationFn: () => put<Session>('/me/password', { current_password: current, new_password: next }),
    onSuccess: (session) => {
      replaceSession(session);
      setCurrent('');
      setNext('');
      toast.success('Contraseña actualizada. Cerramos tu sesión en los demás dispositivos.');
    },
  });
  const errors = fieldErrors(change.error);
  return (
    <form onSubmit={(e) => { e.preventDefault(); change.mutate(); }} className="space-y-4" noValidate>
      <Field label="Contraseña actual" error={errors.current_password}>
        {(props) => <PasswordInput {...props} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
      </Field>
      <Field label="Contraseña nueva" hint="Al menos 8 caracteres." error={errors.new_password}>
        {(props) => <PasswordInput {...props} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
      </Field>
      {change.isError && !Object.keys(errors).length && <p className="text-sm text-danger-600">{errorMessage(change.error)}</p>}
      <Button type="submit" variant="outline" loading={change.isPending} disabled={!current || !next}>Cambiar contraseña</Button>
    </form>
  );
}
