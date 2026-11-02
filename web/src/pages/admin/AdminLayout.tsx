import { useQuery } from '@tanstack/react-query';
import { Bike, ClipboardList, LayoutDashboard, LifeBuoy, Store, Users } from 'lucide-react';
import { get } from '../../lib/api';
import type { Overview } from '../../lib/adminTypes';
import { PanelLayout } from '../../components/layout/PanelLayout';

export function AdminLayout() {
  const { data } = useQuery({
    queryKey: ['admin', 'overview', 30],
    queryFn: () => get<Overview>('/admin/overview', { days: 30 }),
    refetchInterval: 60000,
  });
  return (
    <PanelLayout
      suffix="Soporte"
      nav={[
        { to: '/admin', label: 'Resumen', Icon: LayoutDashboard, end: true },
        { to: '/admin/pedidos', label: 'Pedidos', Icon: ClipboardList, badge: data?.kpis.active_orders },
        { to: '/admin/repartidores', label: 'Repartidores', Icon: Bike, badge: data?.kpis.courier_applications },
        { to: '/admin/restaurantes', label: 'Restaurantes', Icon: Store },
        { to: '/admin/clientes', label: 'Clientes', Icon: Users },
        { to: '/admin/reportes', label: 'Reportes', Icon: LifeBuoy, badge: data?.kpis.open_incidents },
      ]}
    />
  );
}
