// Marcar una ubicación tocando el mapa (en Costa Rica las direcciones son por referencias,
// así que el punto exacto lo pone la persona).
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Point } from '../../lib/types';
import { HEREDIA, TILE_ATTRIBUTION, TILE_URL } from './tiles';
import { AutoResize } from './AutoResize';
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

  const useMyLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no permite obtener la ubicación. Marcala en el mapa.');
      return;
    }
    // Si el permiso ya está bloqueado, el navegador no vuelve a preguntar: se avisa de una vez
    try {
      const status = await navigator.permissions?.query({ name: 'geolocation' });
      if (status?.state === 'denied') {
        toast.error('El navegador tiene bloqueada la ubicación para este sitio. Activala en el candado de la barra de direcciones o marcá el punto en el mapa.', { duration: 6000 });
        return;
      }
    } catch {
      // navegadores sin la API de permisos: se intenta igual
    }

    setLocating(true);
    let finished = false;
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      setLocating(false);
      toast.error(message, { duration: 6000 });
    };
    // El tiempo límite del navegador no corre mientras la pregunta de permiso sigue abierta: este sí
    const guard = window.setTimeout(
      () => fail('No pudimos obtener tu ubicación. Revisá que aceptaste el permiso o marcá el punto en el mapa.'), 15000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (finished) return;
        finished = true;
        window.clearTimeout(guard);
        const point = { lat: Number(position.coords.latitude.toFixed(7)), lng: Number(position.coords.longitude.toFixed(7)) };
        onChange(point);
        setCenterOn(point);
        setLocating(false);
      },
      (error) => {
        window.clearTimeout(guard);
        fail(error.code === error.PERMISSION_DENIED
          ? 'No diste permiso para usar tu ubicación. Marcá el punto en el mapa.'
          : 'No pudimos obtener tu ubicación (en una computadora puede fallar si la ubicación de Windows está apagada). Marcá el punto en el mapa.');
      },
      // En computadoras sin GPS la alta precisión tarda o falla; para una dirección alcanza la normal
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 },
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
          <AutoResize />
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
