// Cliente HTTP de la API. En desarrollo Vite redirige /api al backend; en producción lo hace Caddy.
import axios from 'axios';

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
  timeout: 15000,
});

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sesión vencida o cerrada desde otro dispositivo
    if (axios.isAxiosError(error) && error.response?.status === 401 && authToken) onUnauthorized?.();
    return Promise.reject(error);
  },
);

export interface ApiErrorBody {
  error?: string;
  code?: string;
  fields?: Record<string, string>;
  [key: string]: unknown;
}

const body = (err: unknown): ApiErrorBody | undefined =>
  axios.isAxiosError<ApiErrorBody>(err) ? err.response?.data : undefined;

export const errorMessage = (err: unknown, fallback = 'No se pudo completar la acción') => {
  if (axios.isAxiosError(err) && !err.response) return 'No hay conexión con el servidor. Revisá tu internet.';
  return body(err)?.error ?? fallback;
};

export const errorCode = (err: unknown) => body(err)?.code;
export const errorBody = body;
export const fieldErrors = (err: unknown): Record<string, string> => body(err)?.fields ?? {};

// Atajos tipados
export const get = async <T,>(url: string, params?: object) => (await api.get<T>(url, { params })).data;
export const post = async <T,>(url: string, data?: unknown) => (await api.post<T>(url, data)).data;
export const put = async <T,>(url: string, data?: unknown) => (await api.put<T>(url, data)).data;
export const patch = async <T,>(url: string, data?: unknown) => (await api.patch<T>(url, data)).data;
export const del = async (url: string) => {
  await api.delete(url);
};
