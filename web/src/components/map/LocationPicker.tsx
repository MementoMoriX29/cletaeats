// Marcar una ubicación tocando el mapa (en Costa Rica las direcciones son por referencias,
// así que el punto exacto lo pone la persona).
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Point } from '../../lib/types';
import { HEREDIA, TILE_ATTRIBUTION, TILE_URL } from './tiles';
import { pickerIcon } from './markers';
import { Button } from '../ui/Button';

function ClickToPick({ onPick }: { onPick: (point: Point) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: Number(event.latlng.lat.toFixed(7)), lng: Number(event.latlng.lng.toFixed(7)) });
    },
  });
  return null;
}

function Recenter({ point }: { point: Point | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16));
  }, [map, point]);
  return null;
}

interface LocationPickerProps {
  value: Point | null;
  onChange: (point: Point) => void;
  className?: string;
  emptyHint?: string;
}

export function LocationPicker({ value, onChange, className = 'h-64', emptyHint = 'Tocá el mapa donde hay que entregar.' }: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [centerOn, setCenterOn] = useState<Point | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no permite obtener la ubicación');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: Number(position.coords.latitude.toFixed(7)), lng: Number(position.coords.longitude.toFixed(7)) };
        onChange(point);
        setCenterOn(point);
        setLocating(false);
      },
      () => {
        toast.error('No pudimos obtener tu ubicación. Marcala en el mapa.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const start = value ?? HEREDIA;
  return (
    <div className="space-y-2">
      <div className={`relative overflow-hidden rounded-xl ring-1 ring-line ${className}`}>
        <MapContainer center={[start.lat, start.lng]} zoom={value ? 16 : 14} className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <ClickToPick onPick={onChange} />
          <Recenter point={centerOn} />
          {value && <Marker position={[value.lat, value.lng]} icon={pickerIcon} />}
        </MapContainer>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-3">{value ? 'Tocá el mapa para mover el punto.' : emptyHint}</p>
        <Button variant="outline" size="sm" icon={<LocateFixed className="h-4 w-4" />} loading={locating} onClick={useMyLocation}>
          Mi ubicación
        </Button>
      </div>
    </div>
  );
}
