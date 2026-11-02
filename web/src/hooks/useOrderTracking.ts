// Sigue un pedido por el socket: avisos de cambio de estado y ubicación del repartidor en vivo.
import { useEffect, useState } from 'react';
import { useSocket, useSocketEvent } from '../context/SocketContext';
import type { Point } from '../lib/types';

interface LocationEvent extends Point {
  order_id: number;
  at: string;
}

export function useOrderTracking(orderId: number, initial: Point | null | undefined, active: boolean) {
  const socket = useSocket();
  const [live, setLive] = useState<(Point & { at?: string }) | null>(null);

  useEffect(() => {
    if (!socket || !active) return undefined;
    const watch = () => socket.emit('order:watch', orderId, () => undefined);
    watch();
    socket.on('connect', watch); // al reconectar hay que volver a unirse a la sala
    return () => {
      socket.off('connect', watch);
      socket.emit('order:unwatch', orderId);
    };
  }, [socket, orderId, active]);

  useSocketEvent<LocationEvent>('courier:location', (event) => {
    if (event.order_id === orderId) setLive({ lat: event.lat, lng: event.lng, at: event.at });
  });

  return live ?? initial ?? null;
}
