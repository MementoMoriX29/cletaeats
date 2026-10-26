import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  Users, UserX, ShoppingBag, Store, TrendingUp, TrendingDown,
  DollarSign, AlertTriangle, Clock, Star, Package, BarChart2,
} from 'lucide-react';
import {
  getActiveClients, getSuspendedClients, getMostOrdersClients,
  getRestaurantsReport, getMostOrdersRestaurant, getLeastOrdersRestaurant,
  getSalesByRestaurant, getTotalSales,
  getDeliveryNoWarnings, getDeliveryComplaints,
  getOrdersByClient, getPeakHours,
} from '../../api/reports';
import { DataTable } from '../../components/Table/DataTable';
import { Skeleton } from '../../components/ui/Skeleton';
import { Card } from '../../components/ui/Card';
import { formatCRC } from '../../utils/validation';

type ReportKey = 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p';
type Category = 'clientes' | 'restaurantes' | 'repartidores' | 'pedidos';
type ChartType = 'bar' | 'pie';

interface ReportDef {
  key: ReportKey;
  label: string;
  description: string;
  icon: React.ElementType;
  category: Category;
  chartType?: ChartType;
  accentColor?: string;
}

const REPORTS: ReportDef[] = [
  {
    key: 'e', label: 'Clientes activos',
    description: 'Lista de todos los clientes con cuenta activa',
    icon: Users, category: 'clientes', accentColor: '#22C55E',
  },
  {
    key: 'f', label: 'Clientes suspendidos',
    description: 'Clientes con cuenta suspendida o bloqueada',
    icon: UserX, category: 'clientes', accentColor: '#EF4444',
  },
  {
    key: 'o', label: 'Cliente con más pedidos',
    description: 'El cliente que ha realizado más pedidos',
    icon: Star, category: 'clientes', accentColor: '#EAB308',
  },
  {
    key: 'n', label: 'Pedidos por cliente',
    description: 'Cantidad de pedidos agrupados por cliente',
    icon: ShoppingBag, category: 'clientes', chartType: 'bar', accentColor: '#FF6B00',
  },
  {
    key: 'h', label: 'Lista de restaurantes',
    description: 'Todos los restaurantes registrados en el sistema',
    icon: Store, category: 'restaurantes', accentColor: '#9CA3AF',
  },
  {
    key: 'i', label: 'Restaurante más pedidos',
    description: 'El restaurante que ha recibido más pedidos',
    icon: TrendingUp, category: 'restaurantes', accentColor: '#22C55E',
  },
  {
    key: 'l', label: 'Restaurante menos pedidos',
    description: 'El restaurante con menor cantidad de pedidos',
    icon: TrendingDown, category: 'restaurantes', accentColor: '#EF4444',
  },
  {
    key: 'j', label: 'Ventas por restaurante',
    description: 'Total de ventas desglosado por restaurante',
    icon: BarChart2, category: 'restaurantes', chartType: 'bar', accentColor: '#FF6B00',
  },
  {
    key: 'k', label: 'Ventas totales',
    description: 'Suma total de todas las ventas del sistema',
    icon: DollarSign, category: 'restaurantes', chartType: 'pie', accentColor: '#22C55E',
  },
  {
    key: 'g', label: 'Sin amonestaciones',
    description: 'Repartidores sin amonestaciones registradas',
    icon: Star, category: 'repartidores', accentColor: '#22C55E',
  },
  {
    key: 'm', label: 'Quejas por repartidor',
    description: 'Cantidad de quejas recibidas por repartidor',
    icon: AlertTriangle, category: 'repartidores', accentColor: '#EF4444',
  },
  {
    key: 'p', label: 'Hora pico',
    description: 'Horarios con mayor volumen de pedidos',
    icon: Clock, category: 'pedidos', chartType: 'bar', accentColor: '#FF6B00',
  },
];

const fetchMap: Record<ReportKey, () => Promise<{ data: unknown }>> = {
  e: getActiveClients, f: getSuspendedClients, g: getDeliveryNoWarnings,
  h: getRestaurantsReport, i: getMostOrdersRestaurant, j: getSalesByRestaurant,
  k: getTotalSales, l: getLeastOrdersRestaurant, m: getDeliveryComplaints,
  n: getOrdersByClient, o: getMostOrdersClients, p: getPeakHours,
};

const CATEGORY_LABELS: Record<Category, string> = {
  clientes: 'Clientes',
  restaurantes: 'Restaurantes',
  repartidores: 'Repartidores',
  pedidos: 'Pedidos',
};

const CATEGORY_ICONS: Record<Category, React.ElementType> = {
  clientes: Users,
  restaurantes: Store,
  repartidores: Package,
  pedidos: Clock,
};

const CHART_COLORS = ['#FF6B00', '#22C55E', '#EAB308', '#3B82F6', '#8B5CF6', '#EC4899'];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  available:  { label: 'Disponible',  color: '#22C55E', bg: '#22C55E20' },
  active:     { label: 'Activo',      color: '#22C55E', bg: '#22C55E20' },
  suspended:  { label: 'Suspendido',  color: '#EF4444', bg: '#EF444420' },
  inactive:   { label: 'Inactivo',    color: '#9CA3AF', bg: '#9CA3AF20' },
  offline:    { label: 'Inactivo',    color: '#9CA3AF', bg: '#9CA3AF20' },
  busy:       { label: 'Ocupado',     color: '#EAB308', bg: '#EAB30820' },
  pending:    { label: 'Pendiente',   color: '#EAB308', bg: '#EAB30820' },
  delivered:  { label: 'Entregado',   color: '#22C55E', bg: '#22C55E20' },
  cancelled:  { label: 'Cancelado',   color: '#EF4444', bg: '#EF444420' },
};

// Traduce claves de API a etiquetas legibles en español
const fieldLabel = (key: string): string => {
  const map: Record<string, string> = {
    id: 'ID', name: 'Nombre', email: 'Correo', phone: 'Teléfono',
    status: 'Estado', address: 'Dirección',
    national_id: 'Cédula', cedula: 'Cédula',
    total_orders: 'Total pedidos', order_count: 'Pedidos', orders: 'Pedidos',
    total_sales: 'Ventas totales', sales: 'Ventas', revenue: 'Ingresos',
    complaints: 'Quejas', total_complaints: 'Total quejas', warnings_count: 'Amonestaciones',
    warnings: 'Amonestaciones', rating: 'Calificación',
    hour: 'Hora', peak_hour: 'Hora pico',
    restaurant_name: 'Restaurante', client_name: 'Cliente', full_name: 'Nombre completo',
    created_at: 'Fecha registro', username: 'Usuario', restaurant: 'Restaurante',
    category: 'Categoría', description: 'Descripción', price: 'Precio',
    quantity: 'Cantidad', num_orders: 'Pedidos', complaint_count: 'Quejas',
  };
  return map[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatHour = (h: number): string => {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildColumns(data: Record<string, unknown>[], reportKey?: ReportKey): any[] {
  if (!data.length) return [];
  return Object.keys(data[0]).map((key) => ({
    accessorKey: key,
    header: fieldLabel(key),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cell: (info: any) => {
      const val = info.getValue();
      if (val === null || val === undefined) return '—';

      // Hora formateada para reporte de hora pico
      if (reportKey === 'p' && (key === 'hour' || key === 'hora' || key === 'peak_hour')) {
        const h = Number(val);
        return (
          <span className="font-mono text-white">{formatHour(h)}</span>
        );
      }

      // Badge de estado con color y texto en español
      if (key === 'status' || key === 'estado') {
        const rawVal = String(val).toLowerCase();
        // 'offline' = desconectado por su cuenta; 'suspended' = suspendido por el admin o por amonestaciones
        const s = STATUS_LABELS[rawVal];
        if (s) {
          return (
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ color: s.color, backgroundColor: s.bg }}
            >
              {s.label}
            </span>
          );
        }
      }

      // Moneda para campos de ventas/precio
      if (typeof val === 'number' && (key.includes('sale') || key.includes('revenue') || key.includes('price')))
        return formatCRC(val);

      return String(val);
    },
  }));
}

const CustomTooltip = ({
  active, payload, label, isCurrency,
}: { active?: boolean; payload?: { value: number }[]; label?: string; isCurrency: boolean }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="text-white font-semibold text-sm">
        {isCurrency ? formatCRC(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
};

export const AdminReports = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('clientes');
  const [activeReport, setActiveReport] = useState<ReportDef | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const categories: Category[] = ['clientes', 'restaurantes', 'repartidores', 'pedidos'];
  const filteredReports = REPORTS.filter((r) => r.category === activeCategory);

  const handleRun = async (report: ReportDef) => {
    if (activeReport?.key === report.key && data.length > 0) return;
    setActiveReport(report);
    setLoading(true);
    setData([]);
    try {
      const { data: res } = await fetchMap[report.key]();
      let arr = Array.isArray(res) ? res : [res];
      // El backend retorna todos los repartidores; filtrar solo los que tienen quejas
      if (report.key === 'm') {
        arr = arr.filter((row) => {
          const r = row as Record<string, unknown>;
          return Number(r.total_complaints ?? r.complaint_count ?? r.complaints ?? 0) > 0;
        });
      }
      setData(arr as Record<string, unknown>[]);
    } catch {
      toast.error('No se pudo conectar con el servidor');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const isCurrency = useMemo(
    () => activeReport?.key === 'k' || activeReport?.key === 'j',
    [activeReport],
  );

  const totalSalesValue = useMemo(() => {
    if (activeReport?.key !== 'k' || !data.length) return null;
    const row = data[0] as { total_sales?: string | number };
    return Number(row?.total_sales ?? 0);
  }, [activeReport, data]);

  const chartDataKey = useMemo(() => {
    if (!data.length) return { x: '', y: '' };
    const keys = Object.keys(data[0]);
    return { x: keys[0], y: keys[1] ?? keys[0] };
  }, [data]);

  // Para hora pico: rellenar las 24 horas y formatear
  const peakHoursData = useMemo(() => {
    if (activeReport?.key !== 'p' || !data.length) return null;
    const yKey = chartDataKey.y;
    const xKey = chartDataKey.x;
    const byHour: Record<number, number> = {};
    for (const row of data) byHour[Number(row[xKey])] = Number(row[yKey] ?? 0);
    return Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      label: h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`,
      pedidos: byHour[h] ?? 0,
    }));
  }, [activeReport, data, chartDataKey]);

  const peakMaxValue = useMemo(
    () => peakHoursData ? Math.max(...peakHoursData.map((r) => r.pedidos)) : 0,
    [peakHoursData],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualizá estadísticas y métricas del sistema
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-1.5 border border-border">
          <BarChart2 size={14} className="text-primary" />
          <span className="text-muted-foreground text-xs">{REPORTS.length} reportes disponibles</span>
        </div>
      </div>

      {/* Tabs de categorías */}
      <div className="flex gap-2 border-b border-border pb-0">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary bg-surface'
                  : 'border-transparent text-muted-foreground hover:text-white hover:border-border',
              ].join(' ')}
            >
              <Icon size={15} />
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Tarjetas de reportes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredReports.map((report) => {
          const Icon = report.icon;
          const isSelected = activeReport?.key === report.key;
          return (
            <button
              key={report.key}
              onClick={() => handleRun(report)}
              className={[
                'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                  : 'border-border bg-surface hover:border-muted-foreground/40 hover:bg-secondary',
              ].join(' ')}
            >
              <div
                className="rounded-lg p-2 shrink-0 mt-0.5"
                style={{ backgroundColor: `${report.accentColor}20` }}
              >
                <Icon size={18} style={{ color: report.accentColor }} />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${isSelected ? 'text-primary' : 'text-white'}`}>
                  {report.label}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-snug">
                  {report.description}
                </p>
                {report.chartType && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                    <BarChart2 size={10} />
                    Incluye gráfico
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Resultado */}
      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {!loading && activeReport && data.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Header del resultado */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ backgroundColor: `${activeReport.accentColor}20` }}
              >
                <activeReport.icon size={20} style={{ color: activeReport.accentColor }} />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{activeReport.label}</p>
                <p className="text-muted-foreground text-xs">{activeReport.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalSalesValue !== null && (
                <div className="bg-success/10 border border-success/30 rounded-lg px-4 py-2">
                  <p className="text-xs text-success/70 mb-0.5">Total</p>
                  <p className="text-success font-bold text-lg">{formatCRC(totalSalesValue)}</p>
                </div>
              )}
              <div className="bg-secondary border border-border rounded-lg px-3 py-2 text-center">
                <p className="text-white font-bold text-lg">{data.length}</p>
                <p className="text-muted-foreground text-xs">registros</p>
              </div>
            </div>
          </div>

          {/* Gráfica hora pico — muestra las 24 horas completas */}
          {activeReport.key === 'p' && peakHoursData && (
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="text-white font-semibold text-sm">Actividad por hora del día</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Total de pedidos recibidos en cada hora — las 24 horas del día
                  </p>
                </div>
                {peakMaxValue > 0 && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-right">
                    <p className="text-xs text-muted-foreground">Hora pico</p>
                    <p className="text-primary font-bold text-sm">
                      {peakHoursData.find((r) => r.pedidos === peakMaxValue)?.label}
                    </p>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={peakHoursData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tickCount={Math.min(peakMaxValue + 2, 8)}
                  />
                  <Tooltip
                    cursor={{ fill: '#2A2A2A' }}
                    contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                    formatter={(v: number) => [v, 'Pedidos']}
                    labelFormatter={(label) => `Hora: ${label}`}
                  />
                  <Bar dataKey="pedidos" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {peakHoursData.map((row, i) => (
                      <Cell
                        key={i}
                        fill={row.pedidos === peakMaxValue && peakMaxValue > 0 ? '#FF6B00' : '#3B4A5A'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-muted-foreground text-xs mt-3 text-center">
                Las barras naranjas indican la hora con más pedidos
              </p>
            </Card>
          )}

          {/* Gráfica de barras genérica (otros reportes) */}
          {activeReport.chartType === 'bar' && activeReport.key !== 'p' && data.length > 0 && (
            <Card className="p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-4">
                Gráfico comparativo
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                  <XAxis
                    dataKey={chartDataKey.x}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    tickFormatter={(v) => String(v).length > 12 ? String(v).slice(0, 12) + '…' : String(v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tickFormatter={(v) => isCurrency ? `₡${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip
                    content={<CustomTooltip isCurrency={isCurrency} />}
                    cursor={{ fill: '#2A2A2A' }}
                  />
                  <Bar dataKey={chartDataKey.y} radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {data.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Gráfica de pie (ventas totales por restaurante, si aplica) */}
          {activeReport.chartType === 'pie' && data.length > 1 && (
            <Card className="p-5">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-4">
                Distribución porcentual
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey={chartDataKey.y}
                    nameKey={chartDataKey.x}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={55}
                    paddingAngle={3}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => isCurrency ? formatCRC(Number(v)) : v}
                    contentStyle={{ background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '8px' }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: '#9CA3AF', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Tabla de datos */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-white">Detalle de datos</p>
            </div>
            <div className="p-4">
              <DataTable
                data={data}
                columns={buildColumns(data, activeReport?.key) as never}
                pageSize={15}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Estado vacío inicial */}
      {!loading && !activeReport && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="bg-secondary rounded-full p-5">
            <BarChart2 size={32} className="text-muted-foreground" />
          </div>
          <p className="text-white font-semibold text-lg">Seleccioná un reporte</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Elegí una categoría arriba y seleccioná el reporte que querés visualizar
          </p>
        </div>
      )}

      {/* Sin datos */}
      {!loading && activeReport && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="bg-secondary rounded-full p-4">
            <Package size={28} className="text-muted-foreground" />
          </div>
          <p className="text-white font-semibold">Sin datos disponibles</p>
          <p className="text-muted-foreground text-sm">Este reporte no tiene información en este momento</p>
        </div>
      )}
    </div>
  );
};
