// Equivalente a: ProfileScreen.kt (Jetpack Compose)
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { User, Briefcase, Mail, Phone, Home, CreditCard, Pencil, type LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClient, updateClient } from '../../api/clients';
import type { Client } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';

const IconInput = ({
  icon: Icon, label, children,
}: { icon: LucideIcon; label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-muted-foreground text-xs">{label}</label>
    <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-2.5 bg-background focus-within:border-primary transition-colors">
      <Icon size={18} className="text-primary shrink-0" />
      {children}
    </div>
  </div>
);

const inputCls = 'flex-1 bg-transparent text-white text-sm placeholder:text-muted-foreground focus:outline-none';

export const Profile = () => {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', tarjeta: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await getClient(user.id);
        setClient(data);
        setForm({
          nombre:   data.nombre,
          telefono: data.telefono,
          direccion: data.direccion,
          tarjeta:  '',
        });
      } catch {
        toast.error('Sin conexión al servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { tarjeta, ...rest } = form;
      // La tarjeta solo se envía si se escribió una nueva
      await updateClient(user.id, tarjeta ? form : rest);
      setClient((c) => (c ? { ...c, ...rest, ...(tarjeta ? { tarjeta_last4: tarjeta.slice(-4) } : {}) } : c));
      setForm((f) => ({ ...f, tarjeta: '' }));
      toast.success('Perfil actualizado');
      setEditing(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm({
      nombre:    client?.nombre    ?? '',
      telefono:  client?.telefono  ?? '',
      direccion: client?.direccion ?? '',
      tarjeta:   '',
    });
  };

  if (loading) return <SkeletonCard />;

  const maskedCard = client?.tarjeta_last4 ? `**** ${client.tarjeta_last4}` : '—';

  const infoRows = [
    { Icon: Briefcase,  label: 'Cédula',    value: client?.cedula    ?? '—' },
    { Icon: Mail,       label: 'Correo',    value: client?.email     ?? '—' },
    { Icon: Phone,      label: 'Teléfono',  value: client?.telefono  ?? '—' },
    { Icon: Home,       label: 'Dirección', value: client?.direccion ?? '—' },
    { Icon: CreditCard, label: 'Tarjeta',   value: maskedCard },
  ];

  const roleLabel =
    user?.role === 'cliente' ? 'Cliente'
    : user?.role === 'repartidor' ? 'Repartidor'
    : 'Administrador';

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <h1 className="text-white text-2xl font-bold">Mi Perfil</h1>

      {/* Avatar + nombre + rol — siempre visible */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <User size={40} className="text-white" />
        </div>
        <p className="text-white text-2xl font-bold">{client?.nombre}</p>
        <p className="text-primary text-sm font-medium">{roleLabel}</p>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <p className="text-primary text-lg font-semibold text-center">Editar perfil</p>

          <IconInput icon={User} label="Nombre completo">
            <input
              className={inputCls}
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Tu nombre"
            />
          </IconInput>

          <IconInput icon={Phone} label="Teléfono">
            <input
              className={inputCls}
              inputMode="numeric"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
              placeholder="88889999"
            />
          </IconInput>

          <IconInput icon={Home} label="Dirección">
            <input
              className={inputCls}
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              placeholder="Tu dirección"
            />
          </IconInput>

          <IconInput icon={CreditCard} label={`Nueva tarjeta (actual: ${maskedCard})`}>
            <input
              className={inputCls}
              inputMode="numeric"
              autoComplete="off"
              value={form.tarjeta}
              onChange={(e) => setForm((f) => ({ ...f, tarjeta: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
              placeholder="Dejar vacío para mantener la actual"
            />
          </IconInput>

          <Button type="submit" size="lg" loading={saving} className="w-full mt-1">
            Guardar cambios
          </Button>
          <button
            type="button"
            onClick={cancelEdit}
            className="text-muted-foreground text-sm text-center hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <div className="bg-surface rounded-2xl overflow-hidden">
            {infoRows.map(({ Icon, label, value }, i) => (
              <div key={label}>
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <Icon size={20} className="text-primary shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="text-white text-sm truncate">{value}</span>
                  </div>
                </div>
                {i < infoRows.length - 1 && <div className="h-px bg-border mx-5" />}
              </div>
            ))}
          </div>

          <Button size="lg" onClick={() => setEditing(true)} className="w-full gap-2">
            <Pencil size={16} />
            Editar perfil
          </Button>
        </>
      )}
    </div>
  );
};
