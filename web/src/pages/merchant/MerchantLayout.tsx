// Marco del panel del restaurante, con el interruptor para abrir y cerrar la tienda siempre a mano.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Settings, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage, get, put } from '../../lib/api';
import type { KitchenOrder, Store } from '../../lib/types';
import { PanelLayout } from '../../components/layout/PanelLayout';
import { Switch } from '../../components/ui/Switch';

function OpenSwitch() {
  const queryClient = useQueryClient();
  const { data: store } = useQuery({ queryKey: ['store'], queryFn: () => get<Store>('/merchant/store') });
  const toggle = useMutation({
    mutationFn: (isOpen: boolean) => put<Store>('/merchant/store/open', { is_open: isOpen }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Store>(['store'], (current) => current && ({ ...current, ...updated }));
      toast.success(updated.is_open ? 'Tu tienda está abierta' : 'Cerraste la tienda: no vas a recibir pedidos');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  if (!store) return null;
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${store.is_open ? 'bg-brand-50' : 'bg-canvas'}`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{store.name}</p>
        <p className={`text-xs font-semibold ${store.is_open ? 'text-brand-700' : 'text-ink-3'}`}>
          {!store.active ? 'Deshabilitado por soporte' : store.is_open ? 'Abierto, recibiendo pedidos' : 'Cerrado'}
        </p>
      </div>
      <Switch label="Tienda abierta" checked={store.is_open} disabled={!store.active || toggle.isPending} onChange={(next) => toggle.mutate(next)} />
    </div>
  );
}

export function MerchantLayout() {
  const { data: orders } = useQuery({ queryKey: ['store-orders', 'active'], queryFn: () => get<KitchenOrder[]>('/merchant/orders') });
  const pending = orders?.filter((o) => o.status === 'pending').length ?? 0;
  return (
    <PanelLayout
      suffix="Restaurantes"
      sidebarSlot={<OpenSwitch />}
      nav={[
        { to: '/negocio', label: 'Pedidos', Icon: ClipboardList, end: true, badge: pending },
        { to: '/negocio/menu', label: 'Menú', Icon: UtensilsCrossed },
        { to: '/negocio/ajustes', label: 'Ajustes', Icon: Settings },
      ]}
    />
  );
}
