// Resumen del negocio: indicadores, ventas por día, horas pico y a dónde va el dinero.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { get } from '../../lib/api';
import { money, plural } from '../../lib/format';
import type { Overview } from '../../lib/adminTypes';
import { METHOD_LABEL } from '../../components/order/status';
import { Segmented } from '../../components/ui/Segmented';
import { PageSpinner } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/EmptyState';

// Validado con el script de la guía de visualización (rango de luminosidad, croma y daltonismo)
const SERIES = '#12855F';
const SPLIT_COLORS = ['#12855F', '#EDA100', '#2A78D6'];
const GRID = '#E2E7E4';
const AXIS = '#76807B';

const compact = new Intl.NumberFormat('es-CR', { notation: 'compact', maximumFractionDigits: 1 });
const dayLabel = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortDay = (iso: string) => dayLabel.format(new Date(`${iso}T00:00:00Z`));
const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-line">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="mt-1 font-wide text-2xl font-extrabold tracking-tight">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-3">{note}</p>}
    </div>
  );
}

function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 ring-1 ring-line">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChartTooltip({ active, payload, label, format }: {
  active?: boolean; payload?: { value: number }[]; label?: string | number; format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-float ring-1 ring-line">
      <p className="text-ink-2">{label}</p>
      <p className="money font-semibold">{format(payload[0].value)}</p>
    </div>
  );
}

// Una parte de un total: barra fina segmentada y, debajo, la lista con nombre, monto y porcentaje
function SplitBar({ parts, format }: { parts: { label: string; value: number }[]; format: (v: number) => string }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img"
        aria-label={parts.map((p) => `${p.label} ${percent(p.value, total)} %`).join(', ')}>
        {parts.filter((p) => p.value > 0).map((part, index) => (
          <div key={part.label} style={{ flexGrow: part.value, backgroundColor: SPLIT_COLORS[index] }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {parts.map((part, index) => (
          <li key={part.label} className="flex items-center gap-3 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: SPLIT_COLORS[index] }} aria-hidden="true" />
            <span className="flex-1">{part.label}</span>
            <span className="money font-semibold">{format(part.value)}</span>
            <span className="money w-10 text-right text-ink-3">{percent(part.value, total)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const [measure, setMeasure] = useState<'sales' | 'orders'>('sales');
  const query = useQuery({
    queryKey: ['admin', 'overview', days],
    queryFn: () => get<Overview>('/admin/overview', { days }),
    refetchInterval: 60000,
  });

  if (query.isLoading) return <PageSpinner />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;
  const { kpis, daily, hourly, top_restaurants: top, revenue_split: split, payment_methods: methods } = query.data;
  const busyHours = hourly.filter((h) => h.hour >= 6 && h.hour <= 23);
  const topMax = Math.max(1, ...top.map((r) => r.sales));
  const formatMeasure = (v: number) => (measure === 'sales' ? money(v) : plural(v, 'pedido', 'pedidos'));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-wide text-3xl font-extrabold tracking-tight">Resumen</h1>
        <Segmented label="Período" value={days} onChange={setDays}
          options={[{ value: 7, label: '7 días' }, { value: 30, label: '30 días' }, { value: 90, label: '90 días' }]} />
      </div>

      {(kpis.courier_applications > 0 || kpis.open_incidents > 0) && (
        <div className="flex flex-wrap gap-3">
          {kpis.courier_applications > 0 && (
            <Link to="/admin/repartidores" className="inline-flex items-center gap-2 rounded-full bg-accent-100 px-4 py-2 text-sm font-semibold text-accent-700 hover:underline">
              {kpis.courier_applications} {kpis.courier_applications === 1 ? 'solicitud de repartidor' : 'solicitudes de repartidor'} por revisar <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          {kpis.open_incidents > 0 && (
            <Link to="/admin/reportes" className="inline-flex items-center gap-2 rounded-full bg-danger-50 px-4 py-2 text-sm font-semibold text-danger-700 hover:underline">
              {kpis.open_incidents} {kpis.open_incidents === 1 ? 'reporte abierto' : 'reportes abiertos'} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pedidos hoy" value={String(kpis.orders_today)} />
        <Stat label="Ventas hoy" value={money(kpis.sales_today)} note="Pedidos entregados" />
        <Stat label="Pedidos en curso" value={String(kpis.active_orders)} />
        <Stat label="Repartidores conectados" value={String(kpis.couriers_online)} />
        <Stat label={`Ventas en ${days} días`} value={money(kpis.sales_period)} note={plural(kpis.orders_period, 'pedido', 'pedidos')} />
        <Stat label="Ticket promedio" value={kpis.avg_ticket ? money(kpis.avg_ticket) : '—'} />
        <Stat label="Tiempo de entrega" value={kpis.avg_delivery_minutes ? `${kpis.avg_delivery_minutes} min` : '—'} note="Promedio, de pedir a recibir" />
        <Stat label="Cancelaciones" value={kpis.cancel_rate !== null ? `${kpis.cancel_rate.toLocaleString('es-CR')} %` : '—'} />
      </div>

      <ChartCard title={measure === 'sales' ? 'Ventas por día' : 'Pedidos por día'}
        action={<Segmented label="Medida" value={measure} onChange={setMeasure}
          options={[{ value: 'sales', label: 'Ventas' }, { value: 'orders', label: 'Pedidos' }]} />}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="date" tickFormatter={shortDay} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }}
                interval="preserveStartEnd" minTickGap={24} />
              <YAxis tickFormatter={(v: number) => (measure === 'sales' ? `₡${compact.format(v)}` : String(v))} tick={{ fill: AXIS, fontSize: 12 }}
                tickLine={false} axisLine={false} width={56} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#F3F5F4' }}
                content={(props) => <ChartTooltip active={props.active} payload={props.payload as { value: number }[] | undefined}
                  label={props.label ? shortDay(String(props.label)) : ''} format={formatMeasure} />} />
              <Bar dataKey={measure} fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>{measure === 'sales' ? 'Ventas por día' : 'Pedidos por día'}</caption>
          <tbody>{daily.map((d) => <tr key={d.date}><th>{d.date}</th><td>{formatMeasure(d[measure])}</td></tr>)}</tbody>
        </table>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Pedidos por hora del día">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busyHours} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="hour" tickFormatter={(h: number) => `${h}h`} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} interval={2} />
                <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#F3F5F4' }}
                  content={(props) => <ChartTooltip active={props.active} payload={props.payload as { value: number }[] | undefined}
                    label={props.label !== undefined ? `De ${props.label}:00 a ${Number(props.label) + 1}:00` : ''} format={(v) => plural(v, 'pedido', 'pedidos')} />} />
                <Bar dataKey="orders" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Pedidos por hora del día</caption>
            <tbody>{busyHours.map((h) => <tr key={h.hour}><th>{h.hour}:00</th><td>{h.orders}</td></tr>)}</tbody>
          </table>
        </ChartCard>

        <ChartCard title="Restaurantes con más ventas">
          {top.length ? (
            <ol className="space-y-3">
              {top.map((restaurant) => (
                <li key={restaurant.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{restaurant.name}</span>
                    <span className="money shrink-0 text-ink-2">{money(restaurant.sales)}</span>
                  </div>
                  <div className="mt-1 h-2">
                    <div className="h-2 rounded-r" style={{ width: `${(restaurant.sales / topMax) * 100}%`, backgroundColor: SERIES }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-ink-2">Sin ventas en este período.</p>}
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="A dónde va el dinero de los pedidos entregados">
          <SplitBar format={money} parts={[
            { label: 'Restaurantes (productos)', value: split.restaurants },
            { label: 'Repartidores (envío y propinas)', value: split.couriers },
            { label: 'CletaEats (tarifa de servicio)', value: split.platform },
          ]} />
        </ChartCard>
        <ChartCard title="Métodos de pago">
          <SplitBar format={(v) => plural(v, 'pedido', 'pedidos')} parts={(['card', 'sinpe', 'cash'] as const).map((method) => ({
            label: METHOD_LABEL[method], value: methods.find((m) => m.method === method)?.orders ?? 0,
          }))} />
        </ChartCard>
      </div>
    </div>
  );
}
