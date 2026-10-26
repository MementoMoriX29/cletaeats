import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, User } from 'lucide-react';
import { getDeliveryComplaints, type DeliveryComplaint } from '../../api/deliveryPersons';
import { useAuth } from '../../context/AuthContext';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const fmtDate = (iso: string) =>
  new Date(iso).toISOString().slice(0, 10); // "2026-06-13"

export const DeliveryComplaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<DeliveryComplaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getDeliveryComplaints(user.id);
      const withWarning = Array.isArray(data) ? data.filter((c) => c.adds_warning) : [];
      setComplaints(withWarning);
    } catch {
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <SkeletonCard />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-white text-2xl font-bold">Quejas</h1>

      {/* Resumen */}
      {complaints.length > 0 && (
        <div className="flex items-center gap-3 bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3">
          <AlertCircle className="text-error flex-shrink-0" size={22} />
          <div>
            <p className="text-error text-xs font-medium">Total de quejas activas</p>
            <p className="text-white font-bold">{complaints.length} queja{complaints.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {complaints.length === 0 ? (
        <EmptyState title="Sin quejas" description="No has recibido quejas que hayan generado amonestaciones." />
      ) : (
        <div className="flex flex-col gap-2">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="bg-surface rounded-xl border border-border px-4 py-3 flex gap-3 items-start"
            >
              {/* Icono rojo */}
              <div className="mt-0.5 flex-shrink-0">
                <AlertCircle className="text-error" size={20} />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                {/* Pedido + fecha */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-semibold text-sm">
                    {c.order_id ? `Pedido #${c.order_id}` : 'Sin pedido'}
                  </p>
                  <p className="text-muted-foreground text-xs flex-shrink-0">{fmtDate(c.created_at)}</p>
                </div>

                {/* Cliente */}
                <div className="flex items-center gap-1 mt-0.5">
                  <User size={12} className="text-muted-foreground" />
                  <p className="text-muted-foreground text-xs">{c.client_name}</p>
                </div>

                {/* Descripción */}
                {c.description && (
                  <p className="text-muted-foreground text-sm mt-2">{c.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
