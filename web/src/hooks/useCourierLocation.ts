// Ubicación del repartidor mientras está conectado: GPS del teléfono → servidor (por el socket).
// En la demo se puede simular el recorrido, porque en una computadora el GPS no se mueve.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { post } from '../lib/api';
import type { Point } from '../lib/types';

const SEND_EVERY_MS = 4000;

export type GpsStatus = 'idle' | 'locating' | 'watching' | 'denied' | 'unsupported';

export function useCourierLocation(enabled: boolean) {
  const socket = useSocket();
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [position, setPosition] = useState<Point | null>(null);
  const [simulating, setSimulating] = useState(false);
  const lastSent = useRef(0);
  const simulation = useRef<number | null>(null);

  const send = useCallback((point: Point, force = false) => {
    const now = Date.now();
    if (!force && now - lastSent.current < SEND_EVERY_MS) return;
    lastSent.current = now;
    if (socket?.connected) socket.emit('courier:location', point);
    else post('/courier/location', point).catch(() => undefined);
  }, [socket]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return undefined;
    }
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return undefined;
    }
    setStatus('locating');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (simulation.current !== null) return;
        const point = { lat: Number(pos.coords.latitude.toFixed(7)), lng: Number(pos.coords.longitude.toFixed(7)) };
        setPosition(point);
        setStatus('watching');
        send(point);
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'locating'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled, send]);

  const stopSimulation = useCallback(() => {
    if (simulation.current !== null) window.clearInterval(simulation.current);
    simulation.current = null;
    setSimulating(false);
  }, []);

  // Recorrido en línea recta de "from" a "to" en ~40 s
  const simulate = useCallback((from: Point, to: Point) => {
    stopSimulation();
    const steps = 14;
    let step = 0;
    setSimulating(true);
    const tick = () => {
      const t = step / steps;
      const point = { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
      setPosition(point);
      send(point, true);
      step += 1;
      if (step > steps) stopSimulation();
    };
    tick();
    simulation.current = window.setInterval(tick, 3000);
  }, [send, stopSimulation]);

  useEffect(() => stopSimulation, [stopSimulation]);

  return { status, position, simulating, simulate, stopSimulation };
}
