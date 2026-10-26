// Equivalente a: data classes de Kotlin (Models)
// Todas las interfaces TypeScript del dominio CletaEats

export type UserRole = 'cliente' | 'repartidor' | 'admin';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterClientRequest {
  national_id: string;
  name: string;
  address: string;
  card_number: string;
  phone: string;
  email: string;
  password: string;
}

export interface RegisterDeliveryRequest {
  national_id: string;
  name: string;
  address: string;
  card_number: string;
  phone: string;
  email: string;
  password: string;
}

// ── Restaurantes ──────────────────────────────────────────────
export interface Restaurant {
  id: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  telefono: string;
  cedula_juridica: string;
  categoria: string;
  imagen_url?: string;
  activo: boolean;
}

export interface Combo {
  id: number;
  restaurante_id: number;
  numero: number;       // 1–9
  nombre: string;
  descripcion: string;
  precio: number;
  disponible: boolean;
  imagen_url?: string;
}

// ── Clientes ──────────────────────────────────────────────────
export interface Client {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  estado: 'activo' | 'suspendido';
  fecha_registro: string;
  cedula?: string;
  tarjeta_last4?: string;
}

// ── Repartidores ──────────────────────────────────────────────
export interface DeliveryPerson {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  placa: string;
  estado: 'disponible' | 'ocupado' | 'inactivo' | 'suspendido';
  amonestaciones: number;
  fecha_registro: string;
  avg_rating?: number;
  total_complaints?: number;
}

// ── Pedidos ───────────────────────────────────────────────────
export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface OrderItem {
  combo_id: number;
  cantidad: number;
  precio_unitario: number | string;
  nombre?: string;
  combo_number?: number;
  image_url?: string;
}

export interface Order {
  id: number;
  cliente_id: number;
  restaurante_id: number;
  repartidor_id?: number;
  estado: OrderStatus;
  total: number | string;
  direccion_entrega: string | null;
  notas?: string | null;
  fecha_pedido: string;
  fecha_entrega?: string | null;
  items: OrderItem[];
  restaurante_nombre?: string;
  restaurante_direccion?: string | null;
  restaurante_lat?: number | null;
  restaurante_lng?: number | null;
  calificado?: boolean;
  repartidor_nombre?: string | null;
  cliente_nombre?: string;
  distance_km?: string | number;
  is_holiday?: number | boolean;
}

export interface CartItem {
  combo: Combo;
  cantidad: number;
}

// ── Reportes ──────────────────────────────────────────────────
export interface ReportClient {
  id: number;
  nombre: string;
  email: string;
  estado: string;
  total_pedidos?: number;
  total_gastado?: number;
}

export interface ReportRestaurant {
  id: number;
  nombre: string;
  categoria: string;
  total_pedidos?: number;
  total_ventas?: number;
}

export interface ReportDelivery {
  id: number;
  nombre: string;
  amonestaciones: number;
  total_entregas?: number;
}

export interface ReportOrder {
  cliente_nombre?: string;
  hora?: string;
  total_pedidos: number;
}

export interface PeakHour {
  hora: number;
  total_pedidos: number;
}
