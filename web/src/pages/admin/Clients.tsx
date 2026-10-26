// Equivalente a: AdminClientsScreen.kt (Jetpack Compose)
// Pattern: TanStack Table con paginación (equivalente a LazyColumn)

import { useEffect, useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClients, updateClientStatus } from '../../api/clients';
import type { Client } from '../../types';
import { DataTable } from '../../components/Table/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const col = createColumnHelper<Client>();

export const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchClients = async () => {
    try {
      const { data } = await getClients();
      setClients(data);
    } catch {
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const toggleStatus = async (client: Client) => {
    const next = client.estado === 'activo' ? 'suspendido' : 'activo';
    setToggling(client.id);
    try {
      await updateClientStatus(client.id, next);
      setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, estado: next } : c));
      toast.success(`Cliente ${next}`);
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setToggling(null);
    }
  };

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('email', { header: 'Correo' }),
      col.accessor('telefono', { header: 'Teléfono' }),
      col.accessor('estado', {
        header: 'Estado',
        cell: (info) => (
          <Badge label={info.getValue()} color={info.getValue() === 'activo' ? 'success' : 'error'} />
        ),
      }),
      col.display({
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => (
          <Button
            variant={row.original.estado === 'activo' ? 'danger' : 'primary'}
            size="sm"
            loading={toggling === row.original.id}
            onClick={() => toggleStatus(row.original)}
          >
            {row.original.estado === 'activo' ? <UserX size={14} /> : <UserCheck size={14} />}
            {row.original.estado === 'activo' ? 'Suspender' : 'Activar'}
          </Button>
        ),
      }),
    ],
    [toggling]
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-white text-2xl font-bold">Clientes</h1>
      {loading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : clients.length === 0 ? (
        <EmptyState title="Sin clientes registrados" />
      ) : (
        <DataTable data={clients} columns={columns} />
      )}
    </div>
  );
};
