import { useEffect, useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getDeliveryPersons, addWarning, updateDeliveryStatus,
  getDeliveryComplaints, type DeliveryComplaint,
} from '../../api/deliveryPersons';
import type { DeliveryPerson } from '../../types';
import { DataTable } from '../../components/Table/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StarRating } from '../../components/ui/StarRating';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const col = createColumnHelper<DeliveryPerson>();

const RatingCell = ({ avg, count }: { avg?: number; count?: number }) => {
  const val = avg ?? 0;
  const low = count !== undefined && count > 0 && val <= 3;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <StarRating value={val} size="sm" showValue />
        {low && (
          <span className="text-xs font-semibold text-orange-400 whitespace-nowrap">⚠ Baja</span>
        )}
      </div>
      {count !== undefined && (
        <span className="text-muted-foreground text-xs">{count} queja{count !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
};

const ComplaintModal = ({
  person,
  onClose,
}: {
  person: DeliveryPerson;
  onClose: () => void;
}) => {
  const [complaints, setComplaints] = useState<DeliveryComplaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeliveryComplaints(person.id)
      .then(({ data }) => setComplaints(Array.isArray(data) ? data : []))
      .catch(() => toast.error('No se pudieron cargar las quejas'))
      .finally(() => setLoading(false));
  }, [person.id]);

  const avg = person.avg_rating ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 bg-background border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col mx-4">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <p className="text-white font-bold text-lg">{person.nombre}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StarRating value={avg} showValue />
              {(person.total_complaints ?? 0) > 0 && avg <= 3 && (
                <Badge label="Calificación baja" color="error" />
              )}
              <span className="text-muted-foreground text-sm">
                {person.total_complaints ?? 0} queja{(person.total_complaints ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Complaint list */}
        <div className="overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-6">Cargando...</p>
          ) : complaints.length === 0 ? (
            <EmptyState title="Sin quejas" description="Este repartidor no tiene quejas registradas." />
          ) : (
            complaints.map((c) => {
              const avgC = (c.friendliness + c.response_time + c.presentation) / 3;
              return (
                <Card key={c.id} className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-white font-medium">{c.client_name}</span>
                    <div className="flex items-center gap-2">
                      {c.adds_warning && <Badge label="Amonestación" color="error" />}
                      {c.order_id && (
                        <span className="text-muted-foreground text-xs">Pedido #{c.order_id}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <StarRating value={avgC} size="sm" showValue />
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-xs text-center">
                    <div>
                      <p className="text-muted-foreground">Amabilidad</p>
                      <StarRating value={c.friendliness} size="sm" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tiempo</p>
                      <StarRating value={c.response_time} size="sm" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Presentación</p>
                      <StarRating value={c.presentation} size="sm" />
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-muted-foreground italic">"{c.description}"</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {new Date(c.created_at).toLocaleDateString('es-CR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminDeliveryPersons = () => {
  const [persons, setPersons] = useState<DeliveryPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [modalPerson, setModalPerson] = useState<DeliveryPerson | null>(null);

  const fetchData = async () => {
    try {
      const { data } = await getDeliveryPersons();
      setPersons(data);
    } catch {
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplaint = async (person: DeliveryPerson) => {
    setActing(person.id);
    try {
      await addWarning(person.id);
      toast.success('Amonestación registrada');
      fetchData();
    } catch {
      toast.error('Error al registrar amonestación');
    } finally {
      setActing(null);
    }
  };

  const handleToggleStatus = async (person: DeliveryPerson) => {
    // El admin suspende o reactiva; desconectarse (inactivo) lo decide cada repartidor
    const next = person.estado === 'suspendido' ? 'disponible' : 'suspendido';
    setActing(person.id);
    try {
      await updateDeliveryStatus(person.id, next);
      setPersons((prev) =>
        prev.map((p) => p.id === person.id ? { ...p, estado: next as DeliveryPerson['estado'] } : p)
      );
      toast.success(`Estado: ${next}`);
    } catch {
      toast.error('Error al cambiar estado');
    } finally {
      setActing(null);
    }
  };

  const statusColor = (s: string) =>
    s === 'disponible' ? 'success' : s === 'ocupado' ? 'warning' : 'default';

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('email', { header: 'Correo' }),
      col.accessor('placa', { header: 'Cédula' }),
      col.accessor('estado', {
        header: 'Estado',
        cell: (info) => <Badge label={info.getValue()} color={statusColor(info.getValue())} />,
      }),
      col.accessor('amonestaciones', {
        header: 'Amonest.',
        cell: (info) => (
          <span className={info.getValue() >= 3 ? 'text-error font-bold' : 'text-white'}>
            {info.getValue()}/4
          </span>
        ),
      }),
      col.display({
        id: 'calificacion',
        header: 'Calificación',
        cell: ({ row }) => (
          <RatingCell
            avg={row.original.avg_rating}
            count={row.original.total_complaints}
          />
        ),
      }),
      col.display({
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalPerson(row.original)}
            >
              Quejas ({row.original.total_complaints ?? 0})
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={acting === row.original.id}
              onClick={() => handleComplaint(row.original)}
              disabled={row.original.amonestaciones >= 4}
            >
              <AlertTriangle size={14} />
              Amonestar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={acting === row.original.id}
              onClick={() => handleToggleStatus(row.original)}
            >
              {row.original.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
            </Button>
          </div>
        ),
      }),
    ],
    [acting]
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-white text-2xl font-bold">Repartidores</h1>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : persons.length === 0 ? (
        <EmptyState title="Sin repartidores registrados" />
      ) : (
        <DataTable data={persons} columns={columns} />
      )}

      {modalPerson && (
        <ComplaintModal
          person={modalPerson}
          onClose={() => setModalPerson(null)}
        />
      )}
    </div>
  );
};
