import type { Order, OrderStatus, PaymentMethod } from '../../lib/types';
import type { Tone } from '../ui/Badge';

export const STATUS_BADGE: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Por confirmar', tone: 'warning' },
  accepted: { label: 'En preparación', tone: 'info' },
  ready: { label: 'Listo para retirar', tone: 'accent' },
  picked_up: { label: 'En camino', tone: 'brand' },
  delivered: { label: 'Entregado', tone: 'neutral' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
};

export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'accepted', 'ready', 'picked_up'];
export const isActive = (status: OrderStatus) => ACTIVE_STATUSES.includes(status);

const CANCELLED_BY: Record<string, string> = {
  client: 'Cancelaste el pedido',
  restaurant: 'El restaurante no pudo preparar el pedido',
  admin: 'Soporte canceló el pedido',
  system: 'El restaurante no confirmó a tiempo',
};

// Título grande del seguimiento del cliente
export const clientHeadline = (order: Order) => {
  switch (order.status) {
    case 'pending': return { title: 'Esperando que el restaurante confirme', detail: 'Suele tardar uno o dos minutos.' };
    case 'accepted': return {
      title: 'Preparando tu pedido',
      detail: order.courier ? `${order.courier.name.split(' ')[0]} lo va a recoger.` : 'Estamos buscando un repartidor cerca.',
    };
    case 'ready': return {
      title: 'Tu pedido está listo',
      detail: order.courier ? `${order.courier.name.split(' ')[0]} va camino al restaurante.` : 'Estamos buscando un repartidor cerca.',
    };
    case 'picked_up': return { title: 'Tu pedido va en camino', detail: `${order.courier?.name.split(' ')[0] ?? 'El repartidor'} ya lo recogió.` };
    case 'delivered': return { title: 'Pedido entregado', detail: '¡Buen provecho!' };
    case 'cancelled': return {
      title: CANCELLED_BY[order.cancelled_by ?? ''] ?? 'Pedido cancelado',
      detail: order.payment.status === 'refunded' ? 'Te devolvimos el pago.' : order.cancel_reason ?? '',
    };
    default: return { title: '', detail: '' };
  }
};

const BRANDS: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

export const paymentLabel = (payment: Order['payment']) => {
  if (payment.method === 'card') return `${BRANDS[payment.card_brand ?? ''] ?? 'Tarjeta'} terminada en ${payment.card_last4 ?? '····'}`;
  if (payment.method === 'sinpe') return 'SINPE Móvil';
  return 'Efectivo';
};

export const METHOD_LABEL: Record<PaymentMethod, string> = { card: 'Tarjeta', sinpe: 'SINPE Móvil', cash: 'Efectivo' };
// Para usar dentro de una frase: "pagó con tarjeta", "con SINPE Móvil", "en efectivo"
export const METHOD_PHRASE: Record<PaymentMethod, string> = { card: 'con tarjeta', sinpe: 'con SINPE Móvil', cash: 'en efectivo' };

export const INCIDENT_REASONS = {
  late: 'Llegó tarde',
  missing_items: 'Faltaron productos',
  wrong_order: 'Me llegó otro pedido',
  damaged: 'Llegó en mal estado',
  courier_behavior: 'Trato del repartidor',
  other: 'Otro problema',
} as const;
