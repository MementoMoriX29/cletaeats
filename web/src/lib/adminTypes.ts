// Tipos del panel de soporte.
import type { AccountStatus, IncidentReason, OrderStatus, PaymentMethod, Rating } from './types';

export interface Overview {
  days: number;
  kpis: {
    orders_today: number;
    sales_today: number;
    active_orders: number;
    couriers_online: number;
    courier_applications: number;
    open_incidents: number;
    orders_period: number;
    sales_period: number;
    avg_ticket: number | null;
    avg_delivery_minutes: number | null;
    cancel_rate: number | null;
  };
  daily: { date: string; orders: number; sales: number }[];
  hourly: { hour: number; orders: number }[];
  top_restaurants: { id: number; name: string; orders: number; sales: number }[];
  revenue_split: { restaurants: number; couriers: number; platform: number; total: number };
  payment_methods: { method: PaymentMethod; orders: number }[];
}

export interface AdminOrder {
  id: number;
  status: OrderStatus;
  total: number;
  service_fee: number;
  restaurant_name: string;
  client_name: string;
  courier_name: string | null;
  payment: { method: PaymentMethod; status: string };
  created_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
}

export interface AdminCourier {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: AccountStatus;
  national_id: string;
  vehicle: 'bicicleta' | 'scooter';
  availability: 'offline' | 'available' | 'busy';
  warnings_count: number;
  deliveries: number;
  rating: Rating;
  created_at: string;
  approved_at: string | null;
  last_seen_at: string | null;
}

export interface AdminRestaurant {
  id: number;
  name: string;
  tax_id: string;
  category: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  prep_minutes: number;
  is_open: boolean;
  active: boolean;
  owner: { id: number; name: string; email: string; phone: string | null } | null;
  rating: Rating;
  delivered_orders: number;
  gross_sales: number;
  created_at: string;
}

export interface AdminClient {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: AccountStatus;
  orders: number;
  total_spent: number;
  last_order_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminIncident {
  id: number;
  order_id: number;
  reason: IncidentReason;
  description: string;
  status: 'open' | 'resolved';
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter: { name: string; email: string; phone: string | null };
  order: {
    status: OrderStatus;
    total: number;
    restaurant_name: string;
    courier_id: number | null;
    courier_name: string | null;
    payment: { method: PaymentMethod; status: string };
  };
}
