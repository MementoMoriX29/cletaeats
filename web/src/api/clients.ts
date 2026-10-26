// Equivalente a: ClientRepository.kt
import api from './axios';
import type { Client } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromApi = (c: any): Client => ({
  id:              c.id,
  nombre:          c.name          ?? c.nombre          ?? '',
  email:           c.email         ?? '',
  telefono:        c.phone         ?? c.telefono        ?? '',
  direccion:       c.address       ?? c.direccion       ?? '',
  estado:          c.status        ?? c.estado          ?? 'activo',
  fecha_registro:  c.created_at    ?? c.fecha_registro  ?? '',
  cedula:          c.national_id   ?? c.cedula,
  tarjeta_last4:   c.card_last4,
});

export const getClients = () =>
  api.get('/clients').then((res) => ({ ...res, data: res.data.map(fromApi) }));

export const getClient = (id: number) =>
  api.get(`/clients/${id}`).then((res) => ({ ...res, data: fromApi(res.data) }));

// tarjeta (opcional): número completo nuevo; el backend guarda solo los últimos 4 dígitos
export const updateClient = (id: number, data: Partial<Client> & { tarjeta?: string }) =>
  api.put(`/clients/${id}`, data);

export const updateClientStatus = (id: number, estado: 'activo' | 'suspendido') =>
  api.put(`/clients/${id}/status`, { estado });
