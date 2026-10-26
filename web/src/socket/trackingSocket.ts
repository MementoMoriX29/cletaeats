import { io } from 'socket.io-client';

// Mismo origen que la web, salvo que VITE_API_URL apunte a otro dominio
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
const SOCKET_URL = apiUrl && /^https?:\/\//.test(apiUrl) ? apiUrl.replace(/\/api\/?$/, '') : undefined;

// El servidor exige el JWT en el handshake (auth.token)
export const createTrackingSocket = () =>
  io(SOCKET_URL, {
    auth: (cb) => cb({ token: localStorage.getItem('token') }),
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 3000,
    timeout: 10000,
  });
