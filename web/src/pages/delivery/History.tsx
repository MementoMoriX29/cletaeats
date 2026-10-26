// Equivalente a: DeliveryHistoryScreen.kt (Jetpack Compose)
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getDeliveryPerson, getDeliveryHistory, type DeliveryOrder } from '../../api/deliveryPersons';
import type { DeliveryPerson } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';

export const DeliveryHistory = () => {
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<DeliveryPerson | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      const [profileRes, historyRes] = await Promise.all([
        getDeliveryPerson(user.id),
        getDeliveryHistory(user.id),
      ]);
      setDelivery(profileRes.data);
      setOrders(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch {
      setError('Sin conexión al servidor');
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <SkeletonCard />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-white text-2xl font-bold">Mi historial</h1>
        <Button variant="secondary" size="sm" onClick={fetchData}>Reintentar</Button>
      </div>

      {error && <Card className="text-sm text-muted-foreground">{error}</Card>}

      {delivery && (
        <Card className="flex flex-col gap-3">
          <p className="text-white font-semibold">{delivery.nombre}</p>
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Estado actual</p>
              <Badge
                label={delivery.estado}
                color={delivery.estado === 'disponible' ? 'success' : delivery.estado === 'ocupado' ? 'warning' : 'default'}
              />
            </div>
            <div>
              <p className="text-muted-foreground">Amonestaciones</p>
              <p className={`font-bold ${delivery.amonestaciones >= 3 ? 'text-error' : 'text-white'}`}>
                {delivery.amonestaciones}/4
              </p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Miembro desde</p>
            <p className="text-white text-sm">{new Date(delivery.fecha_registro).toLocaleDateString('es-CR')}</p>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-white font-semibold">
          Entregas completadas{orders.length > 0 ? ` (${orders.length})` : ''}
        </h2>

        {orders.length === 0 ? (
          <EmptyState
            title="Sin entregas aún"
            description="Tus entregas completadas aparecerán aquí."
          />
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">Pedido #{order.id}</p>
                <p className="text-primary font-semibold text-sm">₡{Number(order.total).toLocaleString()}</p>
              </div>
              <p className="text-muted-foreground text-sm">{order.restaurante_nombre}</p>
              <p className="text-muted-foreground text-xs">{order.direccion_entrega}</p>
              {order.distance_km != null && (
                <p className="text-muted-foreground text-xs">{Number(order.distance_km).toFixed(2)} km recorridos</p>
              )}
              {order.fecha_entrega && (
                <p className="text-muted-foreground text-xs">
                  {new Date(order.fecha_entrega).toLocaleDateString('es-CR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
