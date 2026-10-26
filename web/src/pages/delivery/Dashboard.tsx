import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { CheckCircle, XCircle, Bike, MapPin, Map } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDeliveryPerson, updateDeliveryStatus, getActiveDeliveryOrder } from '../../api/deliveryPersons';
import { updateOrderStatus } from '../../api/orders';
import type { DeliveryPerson, Order, OrderStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { createTrackingSocket } from '../../socket/trackingSocket';
import type { Socket } from 'socket.io-client';

const HEREDIA_CENTER: [number, number] = [9.9985, -84.1197];

const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch { /* sin conexión o sin resultado */ }
  return null;
};

const statusLabel: Record<OrderStatus, string> = {
  pendiente: 'Pendiente', confirmado: 'Confirmado', en_camino: 'En camino',
  entregado: 'Entregado', cancelado: 'Cancelado',
};
const orderStatusColor: Record<OrderStatus, 'warning' | 'primary' | 'success' | 'error' | 'default'> = {
  pendiente: 'warning', confirmado: 'primary', en_camino: 'primary',
  entregado: 'success', cancelado: 'error',
};

const bikeIcon = divIcon({
  html: '<span style="font-size:28px">🚴</span>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const restaurantIcon = divIcon({
  html: '<span style="font-size:28px">🍽️</span>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<DeliveryPerson | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [restaurantPos, setRestaurantPos] = useState<[number, number] | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, activeRes] = await Promise.all([
        getDeliveryPerson(user.id),
        getActiveDeliveryOrder(user.id),
      ]);
      setDelivery(profileRes.data);
      setActiveOrder(activeRes.data ?? null);
    } catch {
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setUserPos(HEREDIA_CENTER)
    );
  }, []);

  useEffect(() => {
    setRestaurantPos(null);
    // Si el restaurante tiene coordenadas guardadas se usan directo; si no, se geocodifica la dirección
    if (activeOrder?.restaurante_lat != null && activeOrder?.restaurante_lng != null) {
      setRestaurantPos([activeOrder.restaurante_lat, activeOrder.restaurante_lng]);
      return;
    }
    if (!activeOrder?.restaurante_direccion) return;
    geocodeAddress(activeOrder.restaurante_direccion).then(setRestaurantPos);
  }, [activeOrder?.restaurante_direccion, activeOrder?.restaurante_lat, activeOrder?.restaurante_lng]);

  // Conecta el socket solo cuando hay un pedido en_camino
  useEffect(() => {
    const enCamino = activeOrder?.estado === 'en_camino';
    if (!enCamino) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    if (!socketRef.current) {
      socketRef.current = createTrackingSocket();
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [activeOrder?.id, activeOrder?.estado]);

  // Emite la ubicación GPS cada vez que cambia mientras está en_camino
  useEffect(() => {
    if (!socketRef.current || !userPos || activeOrder?.estado !== 'en_camino' || !activeOrder?.id) return;
    socketRef.current.emit('location_update', {
      orderId: activeOrder.id,
      lat: userPos[0],
      lng: userPos[1],
    });
  }, [userPos, activeOrder?.estado, activeOrder?.id]);

  const toggleStatus = async () => {
    if (!delivery) return;
    const next = delivery.estado === 'disponible' ? 'inactivo' : 'disponible';
    setUpdating(true);
    try {
      await updateDeliveryStatus(delivery.id, next);
      setDelivery({ ...delivery, estado: next as DeliveryPerson['estado'] });
      toast.success(`Estado cambiado a ${next}`);
    } catch {
      toast.error('Error al actualizar estado');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (orderId: number, estado: string) => {
    setUpdatingOrder(true);
    try {
      await updateOrderStatus(orderId, estado);
      toast.success(`Pedido marcado como ${statusLabel[estado as OrderStatus] ?? estado}`);
      await fetchData();
    } catch {
      toast.error('Error al actualizar el estado del pedido');
    } finally {
      setUpdatingOrder(false);
    }
  };

  if (loading) return <SkeletonCard />;

  const isAvailable = delivery?.estado === 'disponible';
  const isOccupied  = delivery?.estado === 'ocupado';
  const isSuspended = (delivery?.amonestaciones ?? 0) >= 4;
  const canToggle   = !isSuspended && !updating;
  const mapCenter   = restaurantPos ?? userPos ?? HEREDIA_CENTER;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-white text-2xl font-bold">Mis Entregas</h1>

      {/* Info rápida */}
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-white font-semibold">{delivery?.nombre}</p>
          <p className="text-muted-foreground text-xs">Cédula: {delivery?.placa}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Amonestaciones</p>
          <p className={`font-bold text-lg ${isSuspended ? 'text-error' : 'text-white'}`}>
            {delivery?.amonestaciones ?? 0}/4
          </p>
          {isSuspended && <p className="text-error text-xs">Cuenta suspendida</p>}
        </div>
      </Card>

      {/* Estado con toggle */}
      <Card className={`flex items-center gap-4 ${canToggle ? 'cursor-pointer' : ''}`} onClick={canToggle ? toggleStatus : undefined}>
        {isOccupied ? (
          <Bike className="text-warning flex-shrink-0" size={28} />
        ) : isAvailable ? (
          <CheckCircle className="text-success flex-shrink-0" size={28} />
        ) : (
          <XCircle className="text-muted-foreground flex-shrink-0" size={28} />
        )}
        <div className="flex-1">
          <p className="text-white font-semibold">
            {isOccupied ? 'Ocupado' : isAvailable ? 'Disponible' : 'Inactivo'}
          </p>
          <p className="text-muted-foreground text-xs">Tu estado de disponibilidad</p>
        </div>

        {/* Toggle switch visual */}
        <div
          role="switch"
          aria-checked={isAvailable || isOccupied}
          onClick={(e) => { e.stopPropagation(); if (canToggle) toggleStatus(); }}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${!canToggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ backgroundColor: (isAvailable || isOccupied) ? '#F97316' : '#374151' }}
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: (isAvailable || isOccupied) ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </div>
      </Card>

      {/* Pedido activo */}
      <div className="flex flex-col gap-3">
        <h2 className="text-white font-semibold">Pedido activo</h2>

        {activeOrder ? (
          <Card className="flex flex-col gap-4">
            {/* Número + estado */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-white font-semibold text-base">Pedido #{activeOrder.id}</p>
              <Badge label={statusLabel[activeOrder.estado]} color={orderStatusColor[activeOrder.estado]} />
            </div>

            {/* Dirección */}
            <div className="flex items-start gap-2">
              <MapPin className="text-primary flex-shrink-0 mt-0.5" size={16} />
              <p className="text-muted-foreground text-sm leading-snug">{activeOrder.direccion_entrega}</p>
            </div>

            {/* Total */}
            <p className="text-white font-semibold">Total: ₡{Number(activeOrder.total).toLocaleString()}</p>

            {/* Botón ver mapa */}
            <button
              onClick={() => setShowMap((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 active:opacity-75 transition-opacity"
            >
              <Map size={18} />
              {showMap ? 'Ocultar mapa' : 'Ver Ruta en Mapa'}
            </button>

            {/* Mapa colapsable */}
            {showMap && (
              <div className="rounded-xl overflow-hidden h-64 border border-border">
                <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {restaurantPos && (
                    <Marker position={restaurantPos} icon={restaurantIcon}>
                      <Popup>
                        <strong>{activeOrder.restaurante_nombre ?? 'Restaurante'}</strong>
                        {activeOrder.restaurante_direccion && (
                          <><br />{activeOrder.restaurante_direccion}</>
                        )}
                      </Popup>
                    </Marker>
                  )}
                  {userPos && (
                    <Marker position={userPos} icon={bikeIcon}>
                      <Popup>Tu ubicación 🚴</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            )}

            {/* Acciones de estado */}
            <div className="flex gap-2 flex-wrap">
              {(activeOrder.estado === 'pendiente' || activeOrder.estado === 'confirmado') && (
                <Button size="sm" onClick={() => handleStatusChange(activeOrder.id, 'en_camino')} loading={updatingOrder}>
                  Marcar en camino
                </Button>
              )}
              {activeOrder.estado === 'en_camino' && (
                <Button size="sm" onClick={() => handleStatusChange(activeOrder.id, 'entregado')} loading={updatingOrder}>
                  Marcar entregado
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <EmptyState title="Sin pedido activo" description="Cuando te asignen un pedido, aparecerá aquí." />
        )}
      </div>
    </div>
  );
};
