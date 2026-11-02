// Mapa con los puntos de un pedido (restaurante, destino y repartidor en vivo).
import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Point } from '../../lib/types';
import { courierIcon, homeIcon, restaurantIcon } from './markers';
import { HEREDIA, TILE_ATTRIBUTION, TILE_URL } from './tiles';
import { AutoResize } from './AutoResize';

export interface MapPoint extends Point {
  kind: 'restaurant' | 'home' | 'courier';
  label: string;
}

const ICONS = { restaurant: restaurantIcon, home: homeIcon, courier: courierIcon };

// Encuadra todos los puntos; se vuelve a encuadrar solo cuando cambia la cantidad de puntos,
// para que el mapa no "salte" cada vez que el repartidor se mueve.
function FitBounds({ points }: { points: Point[] }) {
  const map = useMap();
  const count = points.length;
  useEffect(() => {
    if (!count) return;
    if (count === 1) map.setView([points[0].lat, points[0].lng], 16);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, count]);
  return null;
}

interface MapViewProps {
  points: MapPoint[];
  route?: boolean;
  className?: string;
}

export function MapView({ points, route = true, className = 'h-72' }: MapViewProps) {
  const restaurant = points.find((p) => p.kind === 'restaurant');
  const home = points.find((p) => p.kind === 'home');
  return (
    <div className={`overflow-hidden ${className}`}>
      <MapContainer center={[HEREDIA.lat, HEREDIA.lng]} zoom={14} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {route && restaurant && home && (
          <Polyline
            positions={[[restaurant.lat, restaurant.lng], [home.lat, home.lng]]}
            pathOptions={{ color: '#0E6B4E', weight: 3, dashArray: '2 8', lineCap: 'round' }}
          />
        )}
        {points.map((point) => (
          <Marker key={point.kind} position={[point.lat, point.lng]} icon={ICONS[point.kind]} zIndexOffset={point.kind === 'courier' ? 1000 : 0}>
            <Tooltip direction="top" offset={[0, -18]}>{point.label}</Tooltip>
          </Marker>
        ))}
        <FitBounds points={points} />
        <AutoResize />
      </MapContainer>
    </div>
  );
}
