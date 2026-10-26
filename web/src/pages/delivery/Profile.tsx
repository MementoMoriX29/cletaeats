import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { User, Mail, Phone, Home, CreditCard, Briefcase, Pencil, Route, type LucideIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { updateDeliveryProfile, getDeliveryHistory, type DeliveryOrder } from '../../api/deliveryPersons';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';

interface RawDeliveryPerson {
  id: number;
  national_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  card_last4: string;
  status: string;
  warnings_count: number;
  created_at: string;
}

const IconInput = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-muted-foreground text-xs">{label}</label>
    <div className="flex items-center gap-3 border border-border rounded-lg px-3 py-2.5 bg-background focus-within:border-primary transition-colors">
      <Icon size={18} className="text-primary shrink-0" />
      {children}
    </div>
  </div>
);

const inputCls = 'flex-1 bg-transparent text-white text-sm placeholder:text-muted-foreground focus:outline-none';

const STATUS_ES: Record<string, string> = { available: 'Disponible', busy: 'Ocupado', offline: 'Inactivo', suspended: 'Suspendido' };
const STATUS_COLOR: Record<string, 'success' | 'warning' | 'default'> = { available: 'success', busy: 'warning', offline: 'default', suspended: 'default' };

export const DeliveryProfile = () => {
  const { user } = useAuth();
  const [person, setPerson] = useState<RawDeliveryPerson | null>(null);
  const [history, setHistory] = useState<DeliveryOrder[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', card_number: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [profileRes, historyRes] = await Promise.all([
          api.get<RawDeliveryPerson>(`/delivery-persons/${user.id}`),
          getDeliveryHistory(user.id).catch(() => ({ data: [] as DeliveryOrder[] })),
        ]);
        const data = profileRes.data;
        setPerson(data);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
        setForm({
          name:        data.name        ?? '',
          email:       data.email       ?? '',
          phone:       data.phone       ?? '',
          address:     data.address     ?? '',
          card_number: '',
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
      const { card_number, ...rest } = form;
      // La tarjeta solo se envía si se escribió una nueva
      await updateDeliveryProfile(user.id, card_number ? form : rest);
      setPerson((p) => (p ? { ...p, ...rest, ...(card_number ? { card_last4: card_number.slice(-4) } : {}) } : p));
      setForm((f) => ({ ...f, card_number: '' }));
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
      name:        person?.name        ?? '',
      email:       person?.email       ?? '',
      phone:       person?.phone       ?? '',
      address:     person?.address     ?? '',
      card_number: '',
    });
  };

  if (loading) return <SkeletonCard />;

  const totalKm = history.reduce((sum, o) => sum + (o.distance_km != null ? Number(o.distance_km) : 0), 0);

  const maskedCard = person?.card_last4 ? `**** ${person.card_last4}` : '—';
  const statusLabel = STATUS_ES[person?.status ?? ''] ?? person?.status ?? '—';
  const statusColor = STATUS_COLOR[person?.status ?? ''] ?? 'default';

  const infoRows = [
    { Icon: Briefcase,  label: 'Cédula',          value: person?.national_id   ?? '—' },
    { Icon: Mail,       label: 'Correo',           value: person?.email         ?? '—' },
    { Icon: Phone,      label: 'Teléfono',         value: person?.phone         ?? '—' },
    { Icon: Home,       label: 'Dirección',        value: person?.address       ?? '—' },
    { Icon: CreditCard, label: 'Tarjeta',          value: maskedCard },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <h1 className="text-white text-2xl font-bold">Mi Perfil</h1>

      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <User size={40} className="text-white" />
        </div>
        <p className="text-white text-2xl font-bold">{person?.name}</p>
        <p className="text-primary text-sm font-medium">Repartidor</p>
        <div className="flex items-center gap-3">
          <Badge label={statusLabel} color={statusColor} />
          {(person?.warnings_count ?? 0) > 0 && (
            <span className={`text-xs font-semibold ${(person?.warnings_count ?? 0) >= 3 ? 'text-error' : 'text-muted-foreground'}`}>
              {person?.warnings_count}/4 amonestaciones
            </span>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-surface rounded-xl border border-border flex flex-col items-center gap-2 py-4">
        <div className="flex items-center gap-2">
          <Route size={18} className="text-primary" />
          <p className="text-white text-2xl font-bold">{totalKm.toFixed(1)}</p>
        </div>
        <p className="text-muted-foreground text-xs">km recorridos en total</p>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <p className="text-primary text-lg font-semibold text-center">Editar perfil</p>

          <IconInput icon={User} label="Nombre completo">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Tu nombre"
            />
          </IconInput>

          <IconInput icon={Mail} label="Correo electrónico">
            <input
              className={inputCls}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
            />
          </IconInput>

          <IconInput icon={Phone} label="Teléfono">
            <input
              className={inputCls}
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
              placeholder="88889999"
            />
          </IconInput>

          <IconInput icon={Home} label="Dirección">
            <input
              className={inputCls}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Tu dirección"
            />
          </IconInput>

          <IconInput icon={CreditCard} label={`Nueva tarjeta (actual: ${maskedCard})`}>
            <input
              className={inputCls}
              inputMode="numeric"
              autoComplete="off"
              value={form.card_number}
              onChange={(e) => setForm((f) => ({ ...f, card_number: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
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

          <p className="text-muted-foreground text-xs text-center">
            Miembro desde {person?.created_at ? new Date(person.created_at).toLocaleDateString('es-CR') : '—'}
          </p>

          <Button size="lg" onClick={() => setEditing(true)} className="w-full gap-2">
            <Pencil size={16} />
            Editar perfil
          </Button>
        </>
      )}
    </div>
  );
};
