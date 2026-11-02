// Repartidores: revisar solicitudes, amonestar, suspender y reactivar.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage, get, post } from '../../lib/api';
import { dateTime, plural, timeAgo } from '../../lib/format';
import type { AdminCourier } from '../../lib/adminTypes';
import type { AccountStatus } from '../../lib/types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Field, TextArea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Segmented } from '../../components/ui/Segmented';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';

type Action = 'approve' | 'reject' | 'suspend' | 'reactivate';
const ACTION_DONE: Record<Action, string> = {
  approve: 'Solicitud aprobada', reject: 'Solicitud rechazada', suspend: 'Cuenta suspendida', reactivate: 'Cuenta reactivada',
};
const AVAILABILITY = { available: { label: 'Conectado', tone: 'brand' }, busy: { label: 'Entregando', tone: 'info' }, offline: { label: 'Desconectado', tone: 'neutral' } } as const;

function WarnDialog({ courier, onClose }: { courier: AdminCourier | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const warn = useMutation({
    mutationFn: () => post<AdminCourier>(`/admin/couriers/${courier?.id}/warnings`, { reason }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success(updated.status === 'suspended' ? 'Cuarta amonestación: la cuenta quedó suspendida' : 'Amonestación registrada');
      setReason('');
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const warnings = useQuery({
    queryKey: ['admin', 'warnings', courier?.id],
    queryFn: () => get<{ id: number; reason: string; created_at: string }[]>(`/admin/couriers/${courier?.id}/warnings`),
    enabled: Boolean(courier),
  });
  return (
    <Modal open={Boolean(courier)} onClose={onClose} title={`Amonestar a ${courier?.name ?? ''}`}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" loading={warn.isPending} disabled={reason.trim().length < 5} onClick={() => warn.mutate()}>Registrar amonestación</Button></div>}>
      <div className="space-y-4">
        <p className="text-sm text-ink-2">Tiene {courier?.warnings_count ?? 0} de 4. Con la cuarta la cuenta se suspende sola.</p>
        <Field label="Motivo">
          {(props) => <TextArea {...props} rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-0" />}
        </Field>
        {warnings.data && warnings.data.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-semibold">Anteriores</p>
            <ul className="space-y-1 text-sm text-ink-2">
              {warnings.data.map((w) => <li key={w.id}>{dateTime(w.created_at)}: {w.reason}</li>)}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CourierRow({ courier, onWarn }: { courier: AdminCourier; onWarn: (c: AdminCourier) => void }) {
  const queryClient = useQueryClient();
  const act = useMutation({
    mutationFn: (action: Action) => post<AdminCourier>(`/admin/couriers/${courier.id}/${action}`),
    onSuccess: (_, action) => {
      toast.success(ACTION_DONE[action]);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const busy = act.isPending;
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {courier.name}
          {courier.status === 'active' && <Badge tone={AVAILABILITY[courier.availability].tone}>{AVAILABILITY[courier.availability].label}</Badge>}
          {courier.warnings_count > 0 && <Badge tone={courier.warnings_count >= 3 ? 'danger' : 'warning'}>{courier.warnings_count} de 4 amonestaciones</Badge>}
        </p>
        <p className="text-sm text-ink-2">Cédula {courier.national_id}, en {courier.vehicle}. {courier.email}, {courier.phone}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-3">
          {courier.status === 'pending' ? <span>Solicitó {timeAgo(courier.created_at)}</span> : <span>{plural(courier.deliveries, 'entrega', 'entregas')}</span>}
          {courier.rating.count > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" aria-hidden="true" />{courier.rating.average.toFixed(1)} ({courier.rating.count})</span>}
          {courier.last_seen_at && courier.status === 'active' && <span>Última ubicación {timeAgo(courier.last_seen_at)}</span>}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {courier.status === 'pending' && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => act.mutate('reject')}>Rechazar</Button>
            <Button size="sm" loading={busy} onClick={() => act.mutate('approve')}>Aprobar</Button>
          </>
        )}
        {courier.status === 'active' && (
          <>
            <Button size="sm" variant="outline" onClick={() => onWarn(courier)}>Amonestar</Button>
            <Button size="sm" variant="outline" className="text-danger-600" loading={busy} onClick={() => act.mutate('suspend')}>Suspender</Button>
          </>
        )}
        {courier.status === 'suspended' && <Button size="sm" loading={busy} onClick={() => act.mutate('reactivate')}>Reactivar</Button>}
        {courier.status === 'rejected' && <Button size="sm" variant="outline" loading={busy} onClick={() => act.mutate('approve')}>Aprobar de todos modos</Button>}
      </div>
    </li>
  );
}

export default function AdminCouriers() {
  const [status, setStatus] = useState<AccountStatus>('pending');
  const [warning, setWarning] = useState<AdminCourier | null>(null);
  const all = useQuery({ queryKey: ['admin', 'couriers'], queryFn: () => get<AdminCourier[]>('/admin/couriers'), refetchInterval: 30000 });
  const count = (s: AccountStatus) => all.data?.filter((c) => c.status === s).length ?? 0;
  const list = all.data?.filter((c) => c.status === status) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-wide text-3xl font-extrabold tracking-tight">Repartidores</h1>
        <Segmented label="Estado" value={status} onChange={setStatus} options={[
          { value: 'pending', label: 'Solicitudes', count: count('pending') },
          { value: 'active', label: 'Activos' },
          { value: 'suspended', label: 'Suspendidos' },
          { value: 'rejected', label: 'Rechazados' },
        ]} />
      </div>
      {all.isLoading ? <PageSpinner /> : all.isError ? <ErrorState onRetry={() => all.refetch()} /> : list.length ? (
        <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
          {list.map((courier) => <CourierRow key={courier.id} courier={courier} onWarn={setWarning} />)}
        </ul>
      ) : (
        <EmptyState title={status === 'pending' ? 'No hay solicitudes por revisar' : 'No hay repartidores en este estado'} />
      )}
      <WarnDialog courier={warning} onClose={() => setWarning(null)} />
    </div>
  );
}
