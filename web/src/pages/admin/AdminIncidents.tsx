// Reportes de problemas con pedidos: soporte los revisa y los resuelve (con reembolso o amonestación si hace falta).
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage, fieldErrors, get, post } from '../../lib/api';
import { dateTime, money, timeAgo } from '../../lib/format';
import type { AdminIncident } from '../../lib/adminTypes';
import { INCIDENT_REASONS, METHOD_PHRASE, STATUS_BADGE } from '../../components/order/status';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, TextArea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Segmented } from '../../components/ui/Segmented';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { OrderDialog } from './AdminOrders';

type Filter = 'open' | 'resolved';

const PAYMENT_STATUS: Record<string, string> = { paid: 'pagado', pending: 'pendiente', refunded: 'reembolsado' };

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ring-line hover:bg-canvas">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
      <span className="text-sm">
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-ink-2">{hint}</span>}
      </span>
    </label>
  );
}

// Se monta solo mientras está abierto, así cada reporte empieza con el formulario limpio
function ResolveDialog({ incident, onClose }: { incident: AdminIncident; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState('');
  const [refund, setRefund] = useState(false);
  const [warn, setWarn] = useState(false);
  const canRefund = incident.order.payment.status === 'paid';

  const resolve = useMutation({
    mutationFn: () => post<AdminIncident>(`/admin/incidents/${incident.id}/resolve`, { resolution, refund, warn_courier: warn }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['order', incident.order_id] });
      toast.success('Reporte resuelto');
      onClose();
    },
  });
  const errors = fieldErrors(resolve.error);

  return (
    <Modal open onClose={onClose} title={`Resolver reporte del pedido #${incident.order_id}`}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button loading={resolve.isPending} disabled={resolution.trim().length < 5} onClick={() => resolve.mutate()}>Marcar como resuelto</Button></div>}>
      <div className="space-y-4">
        <blockquote className="rounded-xl bg-canvas p-4 text-sm">
          <p className="font-semibold">{INCIDENT_REASONS[incident.reason]}</p>
          <p className="mt-1 text-ink-2">{incident.description}</p>
        </blockquote>
        <Field label="Qué se hizo" hint="El cliente ve esta respuesta en su pedido." error={errors.resolution}>
          {(props) => <TextArea {...props} rows={3} maxLength={300} value={resolution} onChange={(e) => setResolution(e.target.value)}
            placeholder="Hablamos con el restaurante y te devolvimos el monto del pedido." />}
        </Field>
        {canRefund ? (
          <Check checked={refund} onChange={setRefund} label={`Reembolsar ${money(incident.order.total)}`}
            hint={incident.order.payment.method === 'cash' ? 'Pagó en efectivo: se le devuelve por SINPE Móvil.' : `Pagó ${METHOD_PHRASE[incident.order.payment.method]}: se le devuelve por el mismo medio.`} />
        ) : incident.order.payment.status === 'refunded' && (
          <p className="text-sm text-ink-2">El pago de este pedido ya fue reembolsado.</p>
        )}
        {incident.order.courier_id && (
          <Check checked={warn} onChange={setWarn} label={`Amonestar a ${incident.order.courier_name}`}
            hint="Suma una amonestación. Con la cuarta la cuenta se suspende sola." />
        )}
        {resolve.isError && !Object.keys(errors).length && <p className="text-sm text-danger-600">{errorMessage(resolve.error)}</p>}
      </div>
    </Modal>
  );
}

function IncidentCard({ incident, onResolve, onOpenOrder }: { incident: AdminIncident; onResolve: () => void; onOpenOrder: () => void }) {
  const { order } = incident;
  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {INCIDENT_REASONS[incident.reason]}
            {incident.status === 'open' ? <Badge tone="warning">Abierto</Badge> : <Badge>Resuelto</Badge>}
          </p>
          <p className="text-sm text-ink-2">
            <button type="button" onClick={onOpenOrder} className="font-semibold text-brand-700 underline-offset-4 hover:underline">Pedido #{incident.order_id}</button>
            {' '}de {order.restaurant_name}, <span className="money">{money(order.total)}</span> {METHOD_PHRASE[order.payment.method]} ({PAYMENT_STATUS[order.payment.status] ?? order.payment.status})
          </p>
          <p className="text-sm text-ink-3">
            Reportó {incident.reporter.name}{incident.reporter.phone ? `, ${incident.reporter.phone}` : ''}, {timeAgo(incident.created_at)}.
            {' '}Repartidor: {order.courier_name ?? 'sin asignar'}. <Badge tone={STATUS_BADGE[order.status].tone}>{STATUS_BADGE[order.status].label}</Badge>
          </p>
        </div>
        {incident.status === 'open' && <Button size="sm" onClick={onResolve}>Resolver</Button>}
      </div>
      <p className="rounded-xl bg-canvas px-4 py-3 text-sm">{incident.description}</p>
      {incident.status === 'resolved' && incident.resolution && (
        <p className="text-sm"><span className="font-semibold">Resolución</span>{incident.resolved_at ? ` (${dateTime(incident.resolved_at)})` : ''}: <span className="text-ink-2">{incident.resolution}</span></p>
      )}
    </li>
  );
}

export default function AdminIncidents() {
  const [filter, setFilter] = useState<Filter>('open');
  const [resolving, setResolving] = useState<AdminIncident | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'incidents', filter],
    queryFn: () => get<AdminIncident[]>('/admin/incidents', { status: filter }),
    refetchInterval: 30000,
  });
  const openCount = useQuery({
    queryKey: ['admin', 'incidents', 'open'],
    queryFn: () => get<AdminIncident[]>('/admin/incidents', { status: 'open' }),
    enabled: filter !== 'open',
  });
  const open = filter === 'open' ? query.data?.length : openCount.data?.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-wide text-3xl font-extrabold tracking-tight">Reportes</h1>
        <Segmented label="Estado" value={filter} onChange={setFilter} options={[
          { value: 'open', label: 'Abiertos', count: open ?? 0 },
          { value: 'resolved', label: 'Resueltos' },
        ]} />
      </div>
      {query.isLoading ? <PageSpinner /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : query.data?.length ? (
        <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
          {query.data.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} onResolve={() => setResolving(incident)} onOpenOrder={() => setOrderId(incident.order_id)} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<MessageSquareWarning className="h-6 w-6" />} title={filter === 'open' ? 'No hay reportes pendientes' : 'Todavía no hay reportes resueltos'}>
          {filter === 'open' && 'Cuando un cliente reporte un problema con su pedido aparece acá.'}
        </EmptyState>
      )}
      {resolving && <ResolveDialog key={resolving.id} incident={resolving} onClose={() => setResolving(null)} />}
      <OrderDialog orderId={orderId} onClose={() => setOrderId(null)} />
    </div>
  );
}
