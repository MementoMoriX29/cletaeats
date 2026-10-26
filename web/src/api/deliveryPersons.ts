// Equivalente a: DeliveryRepository.kt
import api from './axios';
import type { DeliveryPerson } from '../types';

const STATUS_ES: Record<string, DeliveryPerson['estado']> = {
  available:  'disponible',
  busy:       'ocupado',
  offline:    'inactivo',
  suspended:  'suspendido',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromApi = (d: any): DeliveryPerson => ({
  id:               d.id,
  nombre:           d.name          ?? d.nombre          ?? '',
  email:            d.email         ?? '',
  telefono:         d.phone         ?? d.telefono        ?? '',
  placa:            d.national_id   ?? d.placa           ?? '',
  estado:           STATUS_ES[d.status] ?? d.estado      ?? 'inactivo',
  amonestaciones:   d.warnings_count ?? d.amonestaciones ?? 0,
  fecha_registro:   d.created_at    ?? d.fecha_registro  ?? '',
  avg_rating:       d.avg_rating    != null ? Number(d.avg_rating) : undefined,
  total_complaints: d.total_complaints != null ? Number(d.total_complaints) : undefined,
});

export const getDeliveryPersons = () =>
  api.get('/delivery-persons').then((res) => ({ ...res, data: res.data.map(fromApi) }));

export const getDeliveryPerson = (id: number) =>
  api.get(`/delivery-persons/${id}`).then((res) => ({ ...res, data: fromApi(res.data) }));

export const updateDeliveryStatus = (id: number, estado: string) =>
  api.put(`/delivery-persons/${id}/status`, { status: estado });

export const addWarning = (id: number) =>
  api.post(`/delivery-persons/${id}/warn`);

export const addComplaint = (id: number, motivo: string) =>
  api.post(`/delivery-persons/${id}/complaints`, { motivo });

export const getDeliveryHistory = (id: number) =>
  api.get<DeliveryOrder[]>(`/delivery-persons/${id}/deliveries`);

export const getActiveDeliveryOrder = (id: number) =>
  api.get<import('../types').Order | null>(`/delivery-persons/${id}/active-order`);

export interface DeliveryRating {
  avg_rating: number;
  total_complaints: number;
}

export const getDeliveryPersonRating = (id: number) =>
  api.get<DeliveryRating>(`/delivery-persons/${id}/rating`);

export interface DeliveryComplaint {
  id: number;
  client_name: string;
  order_id: number | null;
  description: string;
  friendliness: number;
  response_time: number;
  presentation: number;
  adds_warning: boolean;
  created_at: string;
}

export const getDeliveryComplaints = (id: number) =>
  api.get<DeliveryComplaint[]>(`/delivery-persons/${id}/complaints`);

// card_number (opcional): número completo nuevo; el backend guarda solo los últimos 4 dígitos
export const updateDeliveryProfile = (id: number, data: { name: string; email: string; phone: string; address: string; card_number?: string }) =>
  api.put(`/delivery-persons/${id}`, data);

export interface DeliveryOrder {
  id: number;
  restaurante_nombre: string;
  cliente_nombre: string;
  total: number;
  fecha_entrega: string;
  direccion_entrega: string;
  distance_km?: number | string;
}
