// Tipos de las respuestas de la API.

export type Role = 'client' | 'courier' | 'restaurant' | 'admin';
export type AccountStatus = 'active' | 'pending' | 'rejected' | 'suspended';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
}

export interface Session {
  token: string;
  user: User;
  message?: string;
}

export interface Rating {
  average: number;
  count: number;
}

export interface DeliveryEstimate {
  distance_km: number;
  in_range: boolean;
  delivery_fee: number;
  eta_min: number;
  eta_max: number;
}

export interface RestaurantSummary {
  id: number;
  name: string;
  category: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  image_url: string | null;
  prep_minutes: number;
  is_open: boolean;
  rating: Rating;
  delivery?: DeliveryEstimate;
}

export interface MenuProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  section?: string;
}

export interface MenuSection {
  name: string;
  products: MenuProduct[];
}

export interface RestaurantDetail extends RestaurantSummary {
  menu: MenuSection[];
}

export interface Category {
  category: string;
  restaurants: number;
}

export interface Address {
  id: number;
  label: string;
  line: string;
  details: string | null;
  lat: number;
  lng: number;
}

export interface Point {
  lat: number;
  lng: number;
}

export type OrderStatus = 'pending' | 'accepted' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'sinpe' | 'card';
export type CancelledBy = 'client' | 'restaurant' | 'admin' | 'system';

export interface QuoteItem {
  product_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Quote {
  restaurant: { id: number; name: string; is_open: boolean; sinpe_phone: string | null };
  delivery: { line: string; details: string | null; lat: number; lng: number };
  items: QuoteItem[];
  distance_km: number;
  subtotal: number;
  iva_included: number;
  delivery_fee: number;
  service_fee: number;
  tip: number;
  total: number;
  is_holiday: boolean;
  eta_min: number;
  eta_max: number;
}

export interface Incident {
  id: number;
  reason: IncidentReason;
  description: string;
  status: 'open' | 'resolved';
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export type IncidentReason = 'late' | 'missing_items' | 'wrong_order' | 'damaged' | 'courier_behavior' | 'other';

// Cada rol recibe una parte distinta del pedido; por eso casi todo es opcional.
export interface Order {
  id: number;
  status: OrderStatus;
  created_at: string;
  accepted_at: string | null;
  assigned_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancelled_by: CancelledBy | null;
  cancel_reason: string | null;
  prep_minutes: number | null;
  estimated_arrival?: string | null;
  notes: string | null;
  distance_km: number;
  restaurant: { id: number; name: string; address: string; lat: number; lng: number; phone: string | null };
  items: QuoteItem[];
  pricing: {
    subtotal?: number;
    iva_included?: number;
    delivery_fee?: number;
    service_fee?: number;
    tip?: number;
    total?: number;
    is_holiday?: boolean;
  };
  payment: {
    method: PaymentMethod;
    status: 'pending' | 'paid' | 'refunded';
    card_brand?: string | null;
    card_last4?: string | null;
    sinpe_reference?: string | null;
    cash_change_for?: number | null;
  };
  delivery?: { line: string; details?: string | null; lat?: number; lng?: number };
  client: { name: string; phone?: string | null };
  courier: {
    id?: number;
    name: string;
    phone?: string | null;
    vehicle: 'bicicleta' | 'scooter';
    location?: { lat: number; lng: number; at: string } | null;
  } | null;
  rating: { courier_stars?: number; restaurant_stars?: number; comment?: string | null } | null;
  incidents?: Incident[];
  earnings?: number;
}

export interface OrderListItem {
  id: number;
  status: OrderStatus;
  total: number;
  created_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  restaurant: { id: number; name: string; category: string; image_url: string | null };
  item_count: number;
  items_summary: string;
  rated: boolean;
}

export interface CourierProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: AccountStatus;
  vehicle: 'bicicleta' | 'scooter';
  availability: 'offline' | 'available' | 'busy';
  warnings_count: number;
  approved_at: string | null;
  created_at: string;
  rating: Rating;
}

export interface EarningsSummary {
  today: { earnings: number; deliveries: number };
  week: { earnings: number; deliveries: number };
  total: { earnings: number; deliveries: number };
}

export interface CourierDashboard {
  profile: CourierProfile;
  active_order: Order | null;
  summary: EarningsSummary;
}

export interface Offer {
  id: number;
  ready: boolean;
  restaurant: { id: number; name: string; address: string; lat: number; lng: number };
  pickup_km: number | null;
  dropoff_km: number;
  earnings: number;
  tip: number;
  item_count: number;
  payment_method: PaymentMethod;
  cash_to_collect: number | null;
  accepted_at: string;
  ready_estimate: string;
}

export interface CourierHistoryItem {
  id: number;
  status: OrderStatus;
  restaurant_name: string;
  distance_km: number;
  earnings: number;
  tip: number;
  created_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  courier_stars: number | null;
}

export interface Store {
  id: number;
  name: string;
  tax_id: string;
  category: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  sinpe_phone: string | null;
  image_url: string | null;
  prep_minutes: number;
  is_open: boolean;
  active: boolean;
  rating: Rating;
  today?: { orders: number; sales: number; cancelled: number; avg_prep_minutes: number | null };
}

export interface KitchenOrder {
  id: number;
  status: OrderStatus;
  client_name: string;
  notes: string | null;
  items: { name: string; quantity: number; unit_price: number }[];
  subtotal: number;
  prep_minutes: number | null;
  payment: { method: PaymentMethod; status: string; sinpe_reference: string | null };
  courier: { name: string; vehicle: string } | null;
  created_at: string;
  accepted_at: string | null;
  assigned_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancelled_by: CancelledBy | null;
  cancel_reason: string | null;
}
