// Clientes: búsqueda, historial de compra y suspensión de cuentas.
import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { errorMessage, get, post } from '../../lib/api';
import { dateTime, money } from '../../lib/format';
import type { AdminClient } from '../../lib/adminTypes';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';

export default function AdminClients() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [suspending, setSuspending] = useState<AdminClient | null>(null);

  // Busca en el servidor cuando se deja de escribir
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(input.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  const query = useQuery({
    queryKey: ['admin', 'clients', search],
    queryFn: () => get<AdminClient[]>('/admin/clients', { search: search || undefined }),
    placeholderData: keepPreviousData,
  });

  const setStatus = useMutation({
    mutationFn: ({ client, action }: { client: AdminClient; action: 'suspend' | 'reactivate' }) =>
      post<{ id: number; status: string }>(`/admin/clients/${client.id}/${action}`),
    onSuccess: (_, { client, action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
      toast.success(action === 'suspend' ? `Cuenta de ${client.name} suspendida` : `Cuenta de ${client.name} reactivada`);
      setSuspending(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-wide text-3xl font-extrabold tracking-tight">Clientes</h1>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nombre, correo o teléfono"
            aria-label="Buscar clientes" className="h-10 pl-9" />
        </div>
      </div>

      {query.isLoading ? <PageSpinner /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : !query.data?.length ? (
        <EmptyState title={search ? 'Ningún cliente coincide con la búsqueda' : 'Todavía no hay clientes'} />
      ) : (
        <DataTable rows={query.data} rowKey={(c) => c.id} caption="Clientes" columns={[
          {
            header: 'Cliente',
            cell: (c) => (
              <div className="min-w-0">
                <p className="font-semibold">{c.name}</p>
                <p className="text-ink-3">{c.email}</p>
              </div>
            ),
          },
          { header: 'Teléfono', cell: (c) => <span className="whitespace-nowrap">{c.phone ?? '—'}</span> },
          { header: 'Pedidos', align: 'right', cell: (c) => c.orders },
          { header: 'Total comprado', align: 'right', cell: (c) => money(c.total_spent) },
          { header: 'Último pedido', cell: (c) => <span className="whitespace-nowrap text-ink-2">{c.last_order_at ? dateTime(c.last_order_at) : 'Nunca'}</span> },
          {
            header: 'Cuenta',
            cell: (c) => (c.status === 'suspended' ? <Badge tone="danger">Suspendida</Badge> : <Badge tone="brand">Activa</Badge>),
          },
          {
            header: 'Acciones',
            cell: (c) => (c.status === 'suspended'
              ? <Button size="sm" variant="outline" loading={setStatus.isPending && setStatus.variables?.client.id === c.id}
                  onClick={() => setStatus.mutate({ client: c, action: 'reactivate' })}>Reactivar</Button>
              : <Button size="sm" variant="outline" className="text-danger-600" onClick={() => setSuspending(c)}>Suspender</Button>),
          },
        ]} />
      )}

      <Modal open={Boolean(suspending)} onClose={() => setSuspending(null)} title={`¿Suspender a ${suspending?.name ?? ''}?`} size="sm"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setSuspending(null)}>Cancelar</Button>
          <Button variant="danger" loading={setStatus.isPending} onClick={() => suspending && setStatus.mutate({ client: suspending, action: 'suspend' })}>Suspender</Button></div>}>
        <p className="text-sm text-ink-2">Se cierra su sesión y no puede volver a ingresar ni hacer pedidos hasta que la reactives.</p>
      </Modal>
    </div>
  );
}
