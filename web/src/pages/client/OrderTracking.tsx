// Equivalente a: OrderTrackingScreen.kt (Jetpack Compose)
// Mapa: Leaflet + React-Leaflet con OpenStreetMap (gratuito, sin API key)
// Geolocalización: navigator.geolocation nativo del navegador

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import toast from 'react-hot-toast';
import { getOrder } from '../../api/orders';
import { getDeliveryPersonRating, type DeliveryRating } from '../../api/deliveryPersons';
import { calcSubtotal, calcIva, calcTransportCost, calcTotal, formatCRC } from '../../utils/validation';
import type { Order, OrderStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StarRating } from '../../components/ui/StarRating';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { createTrackingSocket } from '../../socket/trackingSocket';

const statusColor: Record<OrderStatus, 'warning' | 'primary' | 'success' | 'error' | 'default'> = {
  pendiente: 'warning',
  confirmado: 'primary',
  en_camino: 'primary',
  entregado: 'success',
  cancelado: 'error',
};

const statusLabel: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const pinIcon = divIcon({
  html: '<span style="font-size:26px">📍</span>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 28],
});

const bikeIcon = divIcon({
  html: '<span style="font-size:28px">🚴</span>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Centro de Heredia, Costa Rica
const HEREDIA_CENTER: [number, number] = [9.9985, -84.1197];

export const OrderTracking = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState<DeliveryRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [deliveryPos, setDeliveryPos] = useState<[number, number] | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await getOrder(Number(id));
      setOrder(data);
      if (data.repartidor_id) {
        getDeliveryPersonRating(data.repartidor_id)
          .then(({ data: r }) => setRating(r))
          .catch(() => {});
      }
    } catch {
      toast.error('Sin conexión. Verificá tu internet.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const socket = createTrackingSocket();

    socket.on('connect', () => {
      if (id) socket.emit('join_order', id);
    });

    socket.on('connect_error', () => {
      // silencia errores de conexión — el polling de 15s suple el tracking
    });

    socket.on('repartidor_location', (payload: { lat: number; lng: number }) => {
      setDeliveryPos([payload.lat, payload.lng]);
    });

    // Polling cada 15s como respaldo al socket
    const interval = setInterval(() => { fetchOrder(); }, 15000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchOrder, id]);

  // Obtener posición del usuario con navigator.geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos(HEREDIA_CENTER)
    );
  }, []);

  if (loading) return <div className="flex flex-col gap-4"><SkeletonCard /><SkeletonCard /></div>;
  if (!order) return null;

  const mapCenter = deliveryPos ?? userPos ?? HEREDIA_CENTER;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Pedido #{order.id}</h1>
          <p className="text-muted-foreground text-sm">Seguimiento en tiempo real</p>
        </div>
        {order.estado === 'entregado' && !order.calificado && !localStorage.getItem(`rated_${order.id}`) && (
          <Button onClick={() => navigate(`/client/order/${order.id}/rate`)} size="sm">
            Calificar pedido
          </Button>
        )}
        {order.estado === 'entregado' && (order.calificado || !!localStorage.getItem(`rated_${order.id}`)) && (
          <span className="text-success text-xs font-medium flex items-center gap-1">
            ★ Calificado
          </span>
        )}
      </div>

      {/* Estado */}
      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Estado</p>
          <Badge label={statusLabel[order.estado]} color={statusColor[order.estado]} />
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-sm">Total</p>
          <p className="text-white font-bold">₡{order.total.toLocaleString()}</p>
        </div>
      </Card>

      {/* Mapa Leaflet */}
      <div className="rounded-xl overflow-hidden h-64 border border-border">
        <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userPos && (
            <Marker position={userPos} icon={pinIcon}>
              <Popup>Tu ubicación 📍</Popup>
            </Marker>
          )}
          {deliveryPos && order.estado === 'en_camino' && (
            <Marker position={mapCenter} icon={bikeIcon}>
              <Popup>Repartidor en camino 🚴</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Detalles */}
      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Restaurante</p>
          <p className="text-white">{order.restaurante_nombre ?? `Restaurante #${order.restaurante_id}`}</p>
        </div>
        {order.repartidor_nombre && (
          <div>
            <p className="text-muted-foreground text-xs">Repartidor</p>
            <p className="text-white">{order.repartidor_nombre}</p>
            {rating && rating.total_complaints > 0 && (
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating value={rating.avg_rating} size="sm" showValue />
                <span className="text-muted-foreground text-xs">
                  ({rating.total_complaints} calificación{rating.total_complaints !== 1 ? 'es' : ''})
                </span>
              </div>
            )}
            {rating && rating.total_complaints === 0 && (
              <p className="text-muted-foreground text-xs mt-0.5">Sin calificaciones aún</p>
            )}
          </div>
        )}
        <div>
          <p className="text-muted-foreground text-xs">Dirección</p>
          <p className="text-white">{order.direccion_entrega}</p>
        </div>
      </Card>

      {/* Factura */}
      {(() => {
        const subtotal = calcSubtotal(
          order.items.map((i) => ({ price: Number(i.precio_unitario), quantity: i.cantidad })),
        );
        const distKm   = order.distance_km != null ? Number(order.distance_km) : 0;
        const holiday  = Boolean(order.is_holiday);
        const transport = distKm > 0 ? calcTransportCost(distKm, holiday) : 0;
        const iva      = calcIva(subtotal);
        const total    = calcTotal(subtotal, transport);

        const fmtDT = (iso?: string | null) =>
          iso
            ? new Date(iso).toLocaleString('es-CR', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : null;

        return (
          <Card className="flex flex-col gap-0 p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-white font-semibold">Factura</p>
            </div>

            {/* Timestamps */}
            <div className="px-4 py-3 flex flex-col gap-1.5 border-b border-border">
              {fmtDT(order.fecha_pedido) && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Pedido realizado</span>
                  <span className="text-white">{fmtDT(order.fecha_pedido)}</span>
                </div>
              )}
              {fmtDT(order.fecha_entrega) && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Entregado</span>
                  <span className="text-white">{fmtDT(order.fecha_entrega)}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="px-4 py-3 flex flex-col gap-1.5 border-b border-border">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.nombre ?? `Combo #${item.combo_id}`} ×{item.cantidad}
                  </span>
                  <span className="text-white">
                    {formatCRC(Number(item.precio_unitario) * item.cantidad)}
                  </span>
                </div>
              ))}
            </div>

            {/* Desglose */}
            <div className="px-4 py-3 flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-white">{formatCRC(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Transporte{distKm > 0 ? ` (${distKm.toFixed(2)} km · ₡${holiday ? '1 500' : '1 000'}/km)` : ''}
                </span>
                <span className="text-white">{formatCRC(transport)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA 13%</span>
                <span className="text-white">{formatCRC(iva)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2.5 mt-1">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white text-lg font-bold">{formatCRC(total)}</span>
              </div>
            </div>
          </Card>
        );
      })()}

    </div>
  );
};
