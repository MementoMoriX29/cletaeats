// Equivalente a: OrderHistoryScreen.kt (Jetpack Compose)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getClientOrders } from '../../api/orders';
import type { Order, OrderStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRow } from '../../components/ui/Skeleton';

const statusColor: Record<OrderStatus, 'warning' | 'primary' | 'success' | 'error' | 'default'> = {
  pendiente: 'warning', confirmado: 'primary', en_camino: 'primary', entregado: 'success', cancelado: 'error',
};
const statusLabel: Record<OrderStatus, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado',
};

export const ClientHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await getClientOrders(user.id);
        setOrders(data.sort((a, b) => new Date(b.fecha_pedido).getTime() - new Date(a.fecha_pedido).getTime()));
      } catch {
        toast.error('Sin conexión al servidor');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-white text-2xl font-bold">Mis pedidos</h1>

      {loading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState title="Sin pedidos" description="Aún no has realizado ningún pedido." />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => navigate(`/client/order/${order.id}`)}
              className="bg-surface rounded-xl p-4 text-left hover:ring-1 hover:ring-primary transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-white font-medium">Pedido #{order.id}</p>
                <p className="text-muted-foreground text-sm">
                  {order.restaurante_nombre ?? `Restaurante #${order.restaurante_id}`}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {new Date(order.fecha_pedido).toLocaleDateString('es-CR')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge label={statusLabel[order.estado]} color={statusColor[order.estado]} />
                <span className="text-white font-semibold text-sm">₡{order.total.toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
