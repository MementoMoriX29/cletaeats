import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getDeliveryComplaints, type DeliveryComplaint } from '../../api/deliveryPersons';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { StarRating } from '../../components/ui/StarRating';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const avgRating = (c: DeliveryComplaint) =>
  (c.friendliness + c.response_time + c.presentation) / 3;

export const DeliveryRatings = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<DeliveryComplaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getDeliveryComplaints(user.id);
      setRatings(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <SkeletonCard />;

  const globalAvg = ratings.length
    ? ratings.reduce((sum, c) => sum + avgRating(c), 0) / ratings.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold">Mis Calificaciones</h1>
          {ratings.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {ratings.length} calificación{ratings.length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData}>Reintentar</Button>
      </div>

      {/* Resumen */}
      {ratings.length > 0 && (
        <Card className="flex items-center gap-5">
          <div className="flex flex-col items-center gap-1">
            <span className="text-white text-4xl font-bold">{globalAvg.toFixed(1)}</span>
            <StarRating value={globalAvg} size="md" />
            <span className="text-muted-foreground text-xs">Promedio general</span>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3 text-center text-xs">
            {(['friendliness', 'response_time', 'presentation'] as const).map((key) => {
              const labels = { friendliness: 'Amabilidad', response_time: 'Tiempo', presentation: 'Presentación' };
              const avg = ratings.reduce((s, c) => s + c[key], 0) / ratings.length;
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <span className="text-muted-foreground">{labels[key]}</span>
                  <StarRating value={avg} size="sm" />
                  <span className="text-white font-medium">{avg.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {ratings.length === 0 ? (
        <EmptyState title="Sin calificaciones" description="Aún no has recibido calificaciones de clientes." />
      ) : (
        <div className="flex flex-col gap-3">
          {ratings.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-white font-medium">{c.client_name}</p>
                  {c.order_id && (
                    <p className="text-muted-foreground text-xs">Pedido #{c.order_id}</p>
                  )}
                </div>
                <StarRating value={avgRating(c)} size="md" showValue />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-muted-foreground mb-1">Amabilidad</p>
                  <StarRating value={c.friendliness} size="sm" />
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Tiempo</p>
                  <StarRating value={c.response_time} size="sm" />
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Presentación</p>
                  <StarRating value={c.presentation} size="sm" />
                </div>
              </div>

              <p className="text-muted-foreground text-xs">
                {new Date(c.created_at).toLocaleDateString('es-CR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
