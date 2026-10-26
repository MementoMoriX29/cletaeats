import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { MapPin, Loader2, LocateFixed } from 'lucide-react';
import { haversineKm, reverseGeocode, getCurrentPosition, type LatLng } from '../../utils/geo';

const HEREDIA_CENTER: LatLng = [9.9985, -84.1197];

const pinIcon = divIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
    <div style="background:#FF6B00;border:3px solid #fff;border-radius:50% 50% 50% 0;width:32px;height:32px;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>
    <div style="width:8px;height:8px;background:#FF6B00;border-radius:50%;margin-top:2px;opacity:.6"></div>
  </div>`,
  className: '',
  iconSize: [32, 44],
  iconAnchor: [16, 44],
});

interface ClickHandlerProps {
  onPick: (pos: LatLng) => void;
}
const ClickHandler = ({ onPick }: ClickHandlerProps) => {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
};

export interface LocationResult {
  latlng: LatLng;
  address: string;
  distanceKm: number;
}

interface Props {
  origin?: LatLng;           // coordenadas del restaurante (o centro de Heredia)
  onLocationChange: (result: LocationResult) => void;
}

export const LocationPicker = ({ origin = HEREDIA_CENTER, onLocationChange }: Props) => {
  const [pin, setPin] = useState<LatLng | null>(null);
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<import('leaflet').Map | null>(null);

  const applyPin = async (pos: LatLng) => {
    setPin(pos);
    setGeocoding(true);
    const addr = await reverseGeocode(pos);
    const km = haversineKm(origin, pos);
    const result: LocationResult = {
      latlng: pos,
      address: addr ?? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`,
      distanceKm: Math.max(0.1, parseFloat(km.toFixed(2))),
    };
    setAddress(result.address);
    setGeocoding(false);
    onLocationChange(result);
  };

  const handleGps = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      mapRef.current?.setView(pos, 16);
      await applyPin(pos);
    } catch {
      // user denied or timeout — do nothing
    } finally {
      setLocating(false);
    }
  };

  // Intent to use GPS on mount
  useEffect(() => { handleGps(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Tocá el mapa para seleccionar tu dirección</p>
        <button
          type="button"
          onClick={handleGps}
          disabled={locating}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-orange-400 transition-colors disabled:opacity-50"
        >
          {locating
            ? <Loader2 size={13} className="animate-spin" />
            : <LocateFixed size={13} />}
          Mi ubicación
        </button>
      </div>

      {/* Mapa */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 260 }}>
        <MapContainer
          center={HEREDIA_CENTER}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={applyPin} />
          {pin && (
            <Marker position={pin} icon={pinIcon}>
              <Popup>Entregar aquí</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Dirección detectada */}
      {geocoding && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Loader2 size={12} className="animate-spin" />
          Detectando dirección…
        </div>
      )}
      {!geocoding && address && (
        <div className="flex items-start gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
          <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
          <p className="text-white text-xs leading-snug">{address}</p>
        </div>
      )}
    </div>
  );
};
