// Conexión en tiempo real (Socket.IO). Se abre con la sesión y se cierra al salir.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const SOCKET_URL = apiUrl.startsWith('http') ? new URL(apiUrl).origin : undefined;

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return undefined;
    }
    const connection = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    let connectedBefore = false;

    // Avisos del servidor → se vuelven a pedir los datos afectados (la API aplica los permisos)
    const refreshOrders = ({ id }: { id: number }) => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      for (const key of ['orders', 'store-orders', 'store', 'courier', 'admin']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    };
    connection.on('order:updated', refreshOrders);
    connection.on('order:created', refreshOrders);
    connection.on('offers:changed', () => queryClient.invalidateQueries({ queryKey: ['offers'] }));
    // Al reconectar pudo haberse perdido algún aviso: se actualiza todo lo que está en pantalla
    connection.on('connect', () => {
      if (connectedBefore) queryClient.invalidateQueries();
      connectedBefore = true;
    });

    setSocket(connection);
    return () => {
      connection.disconnect();
    };
  }, [token, queryClient]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

// Escucha un evento mientras el componente está montado
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const socket = useSocket();
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}
