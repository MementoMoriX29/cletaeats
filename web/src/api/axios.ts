// Equivalente a: RetrofitClient.kt + AuthInterceptor.kt
// Pattern: Singleton con interceptor JWT (igual que OkHttpClient en Android)

import axios from 'axios';
import toast from 'react-hot-toast';

// En producción la web y la API comparten dominio (Caddy enruta /api al backend), así que basta con '/api'.
// En desarrollo, Vite redirige /api a localhost:3000 (ver vite.config.ts). VITE_API_URL solo hace falta
// si la API vive en otro dominio.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

const AUTH_FREE_PATHS = [
  '/auth/login',
  '/auth/register-client',
  '/auth/register-delivery-person',
];

const isAuthFreeRequest = (url?: string) =>
  AUTH_FREE_PATHS.some((path) => url?.includes(path));

const notifySessionExpired = () => {
  sessionStorage.setItem('cletaeats:flash', 'Tu sesión expiró, ingresá de nuevo');
  window.dispatchEvent(new Event('cletaeats:force-logout'));
  window.location.assign('/login');
};

const notifyNetworkIssue = (message: string) => {
  toast.error(message, { id: 'cletaeats-network' });
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: adjunta el token Bearer (= AuthInterceptor en Android)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: limpia sesión en 401 (= SessionManager en Android)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url as string | undefined;

    if (status === 401 && !isAuthFreeRequest(url)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      notifySessionExpired();
      error.__cletaHandled = true;
      return Promise.reject(error);
    }

    if (!status || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      notifyNetworkIssue('Sin conexión. Verificá tu internet.');
      error.__cletaHandled = true;
      return Promise.reject(error);
    }

    if (status >= 500) {
      toast.error('Error en el servidor. Intentá más tarde.');
      error.__cletaHandled = true;
    }

    return Promise.reject(error);
  }
);

export default api;
