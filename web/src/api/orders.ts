// Equivalente a: OrderRepository.kt
import api from './axios';
import type { Order } from '../types';

export interface CreateOrderPayload {
  restaurante_id: number;
  direccion_entrega: string;
  notas?: string;
  distance_km: number;
  is_holiday: boolean;
  items: { combo_id: number; cantidad: number }[];
}

export interface RateOrderPayload {
  amabilidad: number;
  tiempo: number;
  presentacion: number;
  description: string;
}

export const createOrder = (data: CreateOrderPayload) =>
  api.post<Order>('/orders', data);

export const getClientOrders = (clientId: number) =>
  api.get<Order[]>(`/orders/client/${clientId}`);

export const getOrder = (id: number) =>
  api.get<Order>(`/orders/${id}`);

export const updateOrderStatus = (id: number, estado: string) =>
  api.put(`/orders/${id}/status`, { estado });

export const getInvoice = (id: number) =>
  api.get(`/orders/${id}/invoice`);

export const rateOrder = (id: number, data: RateOrderPayload) =>
  api.post(`/orders/${id}/rating`, data);
