import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, CalendarDays, Navigation } from 'lucide-react';

import toast from 'react-hot-toast';
import { createOrder } from '../../api/orders';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LocationPicker, type LocationResult } from '../../components/ui/LocationPicker';
import {
  calcIva,
  calcSubtotal,
  calcTotal,
  calcTransportCost,
  formatCRC,
} from '../../utils/validation';
import { isCostaRicaHoliday, holidayName } from '../../utils/holidays';

export const Cart = () => {
  const navigate = useNavigate();
  const { items, restauranteId, increment, decrement, removeItem, clear } = useCart();
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => new Date(), []);
  const isHoliday = useMemo(() => isCostaRicaHoliday(today), [today]);
  const todayHolidayName = useMemo(() => holidayName(today), [today]);

  const subtotal = calcSubtotal(items.map((i) => ({ price: i.combo.precio, quantity: i.cantidad })));
  const distanceKm = location?.distanceKm ?? 0;
  const transport = distanceKm > 0 ? calcTransportCost(distanceKm, isHoliday) : 0;
  const iva = calcIva(subtotal);
  const estimatedTotal = calcTotal(subtotal, transport);

  const handleLocationChange = (result: LocationResult) => {
    setLocation(result);
    setLocationError('');
  };

  const handleOrder = async () => {
    if (!location) {
      setLocationError('Seleccioná tu ubicación de entrega en el mapa.');
      return;
    }
    if (!restauranteId) return;
    setLoading(true);
    try {
      const { data } = await createOrder({
        restaurante_id: restauranteId,
        direccion_entrega: location.address,
        distance_km: distanceKm,
        is_holiday: isHoliday,
        items: items.map((i) => ({ combo_id: i.combo.id, cantidad: i.cantidad })),
      });
      clear();
      toast.success('¡Pedido realizado!');
      navigate(`/client/order/${data.id}`);
    } catch (err: unknown) {
      if ((err as { __cletaHandled?: boolean }).__cletaHandled) return;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-white text-2xl font-bold">Carrito</h1>
        <EmptyState title="Tu carrito está vacío" description="Agrega combos de un restaurante para continuar." />
        <Button onClick={() => navigate('/client/home')} className="self-center">
          Ver restaurantes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <h1 className="text-white text-2xl font-bold">Carrito</h1>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {items.map(({ combo, cantidad }) => (
          <div key={combo.id} className="bg-surface rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-white font-medium">{combo.nombre}</p>
              <p className="text-primary text-sm">₡{(combo.precio * cantidad).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => decrement(combo.id)} className="text-muted-foreground hover:text-white p-1">
                <Minus size={16} />
              </button>
              <span className="text-white w-5 text-center">{cantidad}</span>
              <button onClick={() => increment(combo.id)} className="text-muted-foreground hover:text-white p-1">
                <Plus size={16} />
              </button>
              <button onClick={() => removeItem(combo.id)} className="text-error p-1 ml-1">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selector de ubicación */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Navigation size={16} className="text-primary" />
          <p className="text-white font-semibold">Dirección de entrega</p>
        </div>

        <LocationPicker onLocationChange={handleLocationChange} />

        {locationError && (
          <p className="text-error text-xs">{locationError}</p>
        )}

        {/* Distancia calculada */}
        {location && (
          <div className="flex items-center justify-between bg-secondary border border-border rounded-lg px-3 py-2">
            <span className="text-muted-foreground text-xs">Distancia estimada</span>
            <span className="text-white text-sm font-semibold">{distanceKm.toFixed(2)} km</span>
          </div>
        )}

        {/* Feriado auto-detectado */}
        {isHoliday ? (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-2.5">
            <CalendarDays size={15} className="text-warning shrink-0" />
            <div>
              <p className="text-warning text-sm font-semibold">Hoy es feriado — {todayHolidayName}</p>
              <p className="text-warning/70 text-xs">Tarifa especial de transporte (₡1 500/km)</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
            <CalendarDays size={13} className="text-muted-foreground shrink-0" />
            <p className="text-muted-foreground text-xs">Día normal — tarifa estándar (₡1 000/km)</p>
          </div>
        )}

      </div>

      {/* Factura */}
      <div className="bg-surface rounded-xl p-4 flex flex-col gap-2 border border-border">
        <p className="text-white font-semibold mb-1">Factura previa</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-white">{formatCRC(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Transporte{distanceKm > 0 ? ` (${distanceKm.toFixed(2)} km)` : ''}
          </span>
          <span className="text-white">{formatCRC(transport)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">IVA 13%</span>
          <span className="text-white">{formatCRC(iva)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-border pt-3 mt-1">
          <span className="text-muted-foreground">Total</span>
          <span className="text-white text-xl font-bold">{formatCRC(estimatedTotal)}</span>
        </div>
      </div>

      <Button size="lg" onClick={handleOrder} loading={loading} disabled={!location}>
        Realizar pedido
      </Button>
    </div>
  );
};
