// Equivalente a: RestaurantRepository.kt
import api from './axios';
import type { Restaurant, Combo } from '../types';

// BE devuelve inglés → FE usa español
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromApi = (r: any): Restaurant => ({
  id:               r.id,
  nombre:           r.name            ?? r.nombre           ?? '',
  descripcion:      r.description     ?? r.descripcion      ?? '',
  direccion:        r.address         ?? r.direccion        ?? '',
  telefono:         r.phone           ?? r.telefono         ?? '',
  cedula_juridica:  r.tax_id          ?? r.cedula_juridica  ?? '',
  categoria:        r.food_type       ?? r.categoria        ?? '',
  imagen_url:       r.image_url       ?? r.imagen_url       ?? '',
  activo:           r.active          ?? r.activo           ?? true,
});

const toApiBody = (data: Partial<Restaurant>) => ({
  name:        data.nombre,
  tax_id:      data.cedula_juridica,
  phone:       data.telefono,
  address:     data.direccion,
  description: data.descripcion,
  food_type:   data.categoria,
  image_url:   data.imagen_url ?? null,
});

export const getRestaurants = () =>
  api.get<Restaurant[]>('/restaurants').then((res) => ({ ...res, data: res.data.map(fromApi) }));

export const getRestaurant = (id: number) =>
  api.get<Restaurant>(`/restaurants/${id}`).then((res) => ({ ...res, data: fromApi(res.data) }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const comboFromApi = (c: any): Combo => ({
  id:            c.id,
  restaurante_id: c.restaurant_id ?? c.restaurante_id,
  numero:        c.combo_number   ?? c.numero,
  nombre:        c.nombre         ?? `Combo ${c.combo_number ?? c.numero}`,
  descripcion:   c.description    ?? c.descripcion ?? '',
  precio:        Number(c.price   ?? c.precio      ?? 0),
  disponible:    c.available      ?? c.disponible  ?? true,
  imagen_url:    c.image_url      ?? c.imagen_url  ?? '',
});

export const getCombos = (restaurantId: number) =>
  api.get<Combo[]>(`/restaurants/${restaurantId}/combos`)
    .then((res) => ({ ...res, data: res.data.map(comboFromApi) }));


export const createRestaurant = (data: Partial<Restaurant>) =>
  api.post('/restaurants', toApiBody(data));

export const updateRestaurant = (id: number, data: Partial<Restaurant>) =>
  api.put(`/restaurants/${id}`, toApiBody(data));

export const createCombo = (restaurantId: number, data: { numero: number; descripcion: string; imagen_url?: string }) =>
  api.post<Combo[]>(`/restaurants/${restaurantId}/combos`, data)
    .then((res) => ({ ...res, data: res.data.map(comboFromApi) }));

export const updateCombo = (restaurantId: number, comboId: number, data: Partial<Combo>) =>
  api.put(`/restaurants/${restaurantId}/combos/${comboId}`, data);

export const deleteRestaurant = (id: number) =>
  api.delete(`/restaurants/${id}`);

export const deleteCombo = (restaurantId: number, comboId: number) =>
  api.delete(`/restaurants/${restaurantId}/combos/${comboId}`);
