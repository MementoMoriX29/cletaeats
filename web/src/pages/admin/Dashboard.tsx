// Equivalente a: AdminDashboardScreen.kt (Jetpack Compose)
import { useEffect, useState } from 'react';
import { Users, UtensilsCrossed, Truck, ShoppingBag, ShoppingCart, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClients } from '../../api/clients';
import { getRestaurants } from '../../api/restaurants';
import { getDeliveryPersons } from '../../api/deliveryPersons';
import { getActiveClients, getSuspendedClients, getOrdersByClient, getTotalSales } from '../../api/reports';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { formatCRC } from '../../utils/validation';

interface Stat {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  helper?: string;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setError('');
    setLoading(true);
    try {
      const [clients, restaurants, delivery, activeClients, suspendedClients, ordersByClient, totalSales] = await Promise.all([
        getClients(),
        getRestaurants(),
        getDeliveryPersons(),
        getActiveClients(),
        getSuspendedClients(),
        getOrdersByClient(),
        getTotalSales(),
      ]);

      const available = delivery.data.filter((d) => d.estado === 'disponible').length;
      const busy = delivery.data.filter((d) => d.estado === 'ocupado').length;
      const totalOrders = ordersByClient.data.reduce((sum, row) => sum + Number((row as { total_pedidos?: number }).total_pedidos ?? 0), 0);
      const salesValue = Number((totalSales.data as { total_sales?: string | number } | null)?.total_sales ?? 0);

      setStats([
        { label: 'Clientes totales', value: String(clients.data.length), icon: Users, color: 'text-primary' },
        { label: 'Clientes activos', value: String(activeClients.data.length), icon: Users, color: 'text-success' },
        { label: 'Clientes suspendidos', value: String(suspendedClients.data.length), icon: Users, color: 'text-error' },
        { label: 'Restaurantes', value: String(restaurants.data.length), icon: UtensilsCrossed, color: 'text-primary' },
        { label: 'Repartidores disponibles', value: String(available), icon: Truck, color: 'text-success' },
        { label: 'Repartidores ocupados', value: String(busy), icon: ShoppingBag, color: 'text-warning' },
        { label: 'Pedidos registrados', value: String(totalOrders), icon: ShoppingCart, color: 'text-primary' },
        { label: 'Ventas totales', value: formatCRC(salesValue), icon: DollarSign, color: 'text-success' },
      ]);
    } catch {
      setError('Sin conexión al servidor');
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-white text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-muted-foreground text-sm">Resumen operativo del panel</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchStats}>Reintentar</Button>
      </div>

      {error && (
        <Card className="border border-border text-sm text-muted-foreground">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : stats.map((s) => (
              <Card key={s.label} className="flex flex-col gap-2 min-h-28">
                <s.icon size={24} className={s.color} />
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-muted-foreground text-sm">{s.label}</p>
                {s.helper && <p className="text-[11px] text-muted-foreground mt-1">{s.helper}</p>}
              </Card>
            ))}
      </div>
    </div>
  );
};
