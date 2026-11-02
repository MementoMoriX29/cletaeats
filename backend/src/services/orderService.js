// Pedidos: cotización, creación, consulta y cambios de estado.
//
// Cada rol ve solo lo que necesita del pedido (minimización de datos, Ley 8968):
//   cliente      todo su pedido
//   restaurante  productos, nombre corto del cliente y método de pago; no ve la dirección ni el teléfono
//   repartidor   dirección y teléfono del cliente solo del pedido que aceptó
//   admin        todo
const orderDao = require('../dao/orderDao');
const addressDao = require('../dao/addressDao');
const restaurantDao = require('../dao/restaurantDao');
const incidentDao = require('../dao/incidentDao');
const events = require('../realtime/events');
const { calculateQuote, OutOfRangeError, PRICING } = require('./pricing');
const { isCostaRicaHoliday } = require('../utils/holidays');
const { AppError, notFound, conflict, forbidden, badRequest } = require('../utils/errors');

const FINISHED = ['delivered', 'cancelled'];
const MINUTE = 60 * 1000;

// "María García López" → "María G."; "Ana de la Cruz" → "Ana C."
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y']);
const shortName = (fullName) => {
  const [first, ...rest] = (fullName ?? '').trim().split(/\s+/);
  const surname = rest.find((word) => !PARTICLES.has(word.toLowerCase()));
  return surname ? `${first} ${surname[0].toUpperCase()}.` : first;
};

// Hora estimada de llegada según el estado. Nunca en el pasado mientras el pedido siga abierto.
const estimateArrival = (o) => {
  if (FINISHED.includes(o.status)) return null;
  const travel = (Math.ceil(o.distance_km * PRICING.minutesPerKm) + PRICING.handoffMinutes) * MINUTE;
  let eta;
  if (o.status === 'picked_up') {
    eta = new Date(o.picked_up_at).getTime() + travel;
  } else {
    const start = new Date(o.accepted_at ?? o.created_at).getTime();
    eta = start + (o.prep_minutes ?? o.restaurant_prep_minutes) * MINUTE + travel;
  }
  return new Date(Math.max(eta, Date.now() + 2 * MINUTE)).toISOString();
};

const canView = (viewer, o) => {
  switch (viewer.role) {
    case 'admin':      return true;
    case 'client':     return o.client_id === viewer.id;
    case 'restaurant': return o.restaurant_owner_id === viewer.id;
    case 'courier':    return o.courier_id === viewer.id;
    default:           return false;
  }
};

const toOrderDto = ({ order: o, items, incidents }, viewer) => {
  const isActive = !FINISHED.includes(o.status);
  const dto = {
    id: o.id,
    status: o.status,
    created_at: o.created_at,
    accepted_at: o.accepted_at,
    assigned_at: o.assigned_at,
    ready_at: o.ready_at,
    picked_up_at: o.picked_up_at,
    delivered_at: o.delivered_at,
    cancelled_at: o.cancelled_at,
    cancelled_by: o.cancelled_by,
    cancel_reason: o.cancel_reason,
    prep_minutes: o.prep_minutes,
    estimated_arrival: estimateArrival(o),
    notes: o.notes,
    distance_km: o.distance_km,
    restaurant: {
      id: o.restaurant_id,
      name: o.restaurant_name,
      address: o.restaurant_address,
      lat: o.restaurant_lat,
      lng: o.restaurant_lng,
      phone: o.restaurant_phone,
    },
    items: items.map((i) => ({
      product_id: i.product_id,
      name: i.name,
      unit_price: i.unit_price,
      quantity: i.quantity,
      line_total: i.unit_price * i.quantity,
    })),
    pricing: {
      subtotal: o.subtotal,
      iva_included: o.iva_included,
      delivery_fee: o.delivery_fee,
      service_fee: o.service_fee,
      tip: o.tip,
      total: o.total,
      is_holiday: o.is_holiday,
    },
    payment: {
      method: o.payment_method,
      status: o.payment_status,
      card_brand: o.card_brand,
      card_last4: o.card_last4,
      sinpe_reference: o.sinpe_reference,
      cash_change_for: o.cash_change_for,
    },
    delivery: { line: o.delivery_line, details: o.delivery_details, lat: o.delivery_lat, lng: o.delivery_lng },
    client: { name: o.client_name, phone: o.client_phone },
    courier: o.courier_id ? {
      id: o.courier_id,
      name: o.courier_name,
      // El teléfono del repartidor solo mientras la entrega está en curso
      phone: isActive ? o.courier_phone : null,
      vehicle: o.courier_vehicle,
      location: isActive && o.courier_lat !== null
        ? { lat: o.courier_lat, lng: o.courier_lng, at: o.courier_seen_at }
        : null,
    } : null,
    rating: o.courier_stars ? {
      courier_stars: o.courier_stars,
      restaurant_stars: o.restaurant_stars,
      comment: o.rating_comment,
      created_at: o.rated_at,
    } : null,
    incidents: incidents.map((i) => ({
      id: i.id,
      reason: i.reason,
      description: i.description,
      status: i.status,
      resolution: i.resolution,
      created_at: i.created_at,
      resolved_at: i.resolved_at,
    })),
  };

  if (viewer.role === 'restaurant') {
    delete dto.delivery;
    delete dto.incidents;
    delete dto.estimated_arrival;
    dto.client = { name: shortName(o.client_name) };
    dto.courier = dto.courier && { name: shortName(o.courier_name), vehicle: o.courier_vehicle };
    dto.pricing = { subtotal: o.subtotal, iva_included: o.iva_included };
    dto.payment = { method: o.payment_method, status: o.payment_status, sinpe_reference: o.sinpe_reference };
    dto.rating = dto.rating && { restaurant_stars: o.restaurant_stars, comment: o.rating_comment };
  }

  if (viewer.role === 'courier') {
    delete dto.incidents;
    dto.client = { name: shortName(o.client_name), phone: isActive ? o.client_phone : null };
    if (!isActive) dto.delivery = { line: o.delivery_line };
    dto.pricing = { total: o.total, delivery_fee: o.delivery_fee, tip: o.tip };
    dto.payment = { method: o.payment_method, status: o.payment_status, cash_change_for: o.cash_change_for };
    dto.earnings = o.delivery_fee + o.tip;
    dto.rating = dto.rating && { courier_stars: o.courier_stars };
  }

  return dto;
};

const loadVisible = async (viewer, id) => {
  const data = await orderDao.get(id);
  if (!data || !canView(viewer, data.order)) throw notFound('Pedido no encontrado');
  return data;
};

const getOrder = async (viewer, id) => toOrderDto(await loadVisible(viewer, id), viewer);

// ── Cotización ─────────────────────────────────────────────────
const resolveDelivery = async (clientId, delivery) => {
  if ('address_id' in delivery) {
    const address = await addressDao.get(delivery.address_id, clientId);
    if (!address) throw notFound('Dirección no encontrada');
    return { line: address.line, details: address.details, lat: address.lat, lng: address.lng };
  }
  return { line: delivery.line, details: delivery.details ?? null, lat: delivery.lat, lng: delivery.lng };
};

const buildQuote = async (clientId, { restaurant_id, items, delivery, tip }) => {
  const found = await restaurantDao.getWithMenu(restaurant_id);
  if (!found || !found.restaurant.active) throw notFound('Restaurante no encontrado');
  const { restaurant } = found;

  // El mismo producto dos veces en el carrito se suma en una sola línea
  const quantities = new Map();
  for (const { product_id, quantity } of items) {
    quantities.set(product_id, (quantities.get(product_id) ?? 0) + quantity);
  }

  const menu = new Map(found.products.map((p) => [p.id, p]));
  const lines = [];
  const unavailable = [];
  for (const [productId, quantity] of quantities) {
    const product = menu.get(productId);
    if (!product || !product.available) unavailable.push(productId);
    else if (quantity > 20) throw badRequest(`Máximo 20 unidades de ${product.name}`);
    else lines.push({ product_id: product.id, name: product.name, unit_price: product.price, quantity });
  }
  if (unavailable.length) {
    throw conflict('Algunos productos ya no están disponibles. Revisá tu carrito.', 'CART_CHANGED', {
      unavailable_product_ids: unavailable,
    });
  }

  const destination = await resolveDelivery(clientId, delivery);
  let quote;
  try {
    quote = calculateQuote({ restaurant, destination, items: lines, isHoliday: isCostaRicaHoliday(), tip });
  } catch (err) {
    if (err instanceof OutOfRangeError) {
      throw new AppError(422, `${err.message}. Elegí otra dirección o un restaurante más cerca.`, 'OUT_OF_RANGE');
    }
    throw err;
  }
  return { restaurant, destination, quote };
};

const quote = async (viewer, body) => {
  const { restaurant, destination, quote: result } = await buildQuote(viewer.id, body);
  return {
    restaurant: { id: restaurant.id, name: restaurant.name, is_open: restaurant.is_open, sinpe_phone: restaurant.sinpe_phone },
    delivery: destination,
    ...result,
  };
};

// ── Creación ───────────────────────────────────────────────────
const paymentFor = (payment, total) => {
  switch (payment.method) {
    case 'cash':
      if (payment.cash_change_for && payment.cash_change_for < total) {
        throw badRequest('El monto con el que vas a pagar tiene que cubrir el total', {
          fields: { 'payment.cash_change_for': 'Menor que el total' },
        });
      }
      return { method: 'cash', cash_change_for: payment.cash_change_for || null };
    case 'sinpe':
      return { method: 'sinpe', sinpe_reference: payment.sinpe_reference };
    case 'card':
      // Pago simulado: en producción acá se confirmaría el cobro con la pasarela usando card_token.
      return { method: 'card', card_brand: payment.card_brand, card_last4: payment.card_last4 };
    default:
      throw badRequest('Método de pago no válido');
  }
};

const createOrder = async (viewer, body) => {
  const { restaurant, destination, quote: result } = await buildQuote(viewer.id, body);
  if (!restaurant.is_open) throw conflict('El restaurante está cerrado en este momento', 'RESTAURANT_CLOSED');
  if (body.expected_total !== undefined && body.expected_total !== result.total) {
    throw conflict('El total de tu pedido cambió. Revisalo antes de confirmar.', 'TOTAL_CHANGED', {
      quote: result,
    });
  }

  const payment = {
    card_brand: null, card_last4: null, sinpe_reference: null, cash_change_for: null,
    ...paymentFor(body.payment, result.total),
  };

  const { id } = await orderDao.create({
    clientId: viewer.id,
    restaurantId: restaurant.id,
    items: result.items.map(({ product_id, quantity, unit_price }) => ({ product_id, quantity, unit_price })),
    delivery: destination,
    notes: body.notes ?? null,
    quote: result,
    payment,
  });

  const data = await orderDao.get(id);
  events.orderCreated(data.order);
  return toOrderDto(data, viewer);
};

// ── Listas ─────────────────────────────────────────────────────
const listForClient = async (viewer) => (await orderDao.listByClient(viewer.id)).map((o) => ({
  id: o.id,
  status: o.status,
  total: o.total,
  created_at: o.created_at,
  delivered_at: o.delivered_at,
  cancelled_at: o.cancelled_at,
  restaurant: { id: o.restaurant_id, name: o.restaurant_name, category: o.restaurant_category, image_url: o.restaurant_image_url },
  item_count: Number(o.item_count),
  items_summary: o.items_summary,
  rated: Boolean(o.rated),
}));

// ── Cambios de estado ──────────────────────────────────────────
// Ejecuta la acción (el procedimiento valida permisos y estado dentro de la transacción),
// avisa por tiempo real y devuelve el pedido actualizado.
const transition = async (viewer, id, action, { offersChanged = false } = {}) => {
  await action();
  const data = await orderDao.get(id);
  events.orderUpdated(data.order, { offersChanged });
  return toOrderDto(data, viewer);
};

const ownRestaurant = async (viewer) => {
  const restaurant = await restaurantDao.getByOwner(viewer.id);
  if (!restaurant) throw forbidden('Tu cuenta no tiene un restaurante asignado');
  return restaurant;
};

const cancelByClient = (viewer, id, { reason }) =>
  transition(viewer, id, () => orderDao.cancelByClient(id, viewer.id, reason ?? 'Cancelado por el cliente'));

const accept = async (viewer, id, { prep_minutes }) => {
  const restaurant = await ownRestaurant(viewer);
  return transition(viewer, id, () => orderDao.accept(id, restaurant.id, prep_minutes ?? restaurant.prep_minutes),
    { offersChanged: true });
};

const reject = async (viewer, id, { reason }) => {
  const restaurant = await ownRestaurant(viewer);
  return transition(viewer, id, () => orderDao.reject(id, restaurant.id, reason));
};

const markReady = async (viewer, id) => {
  const restaurant = await ownRestaurant(viewer);
  return transition(viewer, id, () => orderDao.markReady(id, restaurant.id), { offersChanged: true });
};

const claim = (viewer, id) => transition(viewer, id, () => orderDao.claim(id, viewer.id), { offersChanged: true });
const pickup = (viewer, id) => transition(viewer, id, () => orderDao.pickup(id, viewer.id));
const deliver = (viewer, id) => transition(viewer, id, () => orderDao.deliver(id, viewer.id));

const cancelByAdmin = (viewer, id, { reason }) =>
  transition(viewer, id, () => orderDao.cancelByAdmin(id, reason), { offersChanged: true });

// Pedidos que el restaurante no confirmó a tiempo: se cancelan solos y se reembolsan.
const expirePending = async (minutes) => {
  const expired = [];
  for (const { id } of await orderDao.listExpired(minutes)) {
    if (await orderDao.expire(id)) {
      const data = await orderDao.get(id);
      events.orderUpdated(data.order);
      expired.push(id);
    }
  }
  return expired;
};

// ── Después de la entrega ──────────────────────────────────────
const rate = async (viewer, id, rating) => {
  await orderDao.rate(id, viewer.id, rating);
  return getOrder(viewer, id);
};

const reportIncident = async (viewer, id, incident) => {
  await incidentDao.create(id, viewer.id, incident);
  return getOrder(viewer, id);
};

module.exports = {
  getOrder,
  quote,
  createOrder,
  listForClient,
  cancelByClient,
  accept,
  reject,
  markReady,
  claim,
  pickup,
  deliver,
  cancelByAdmin,
  expirePending,
  rate,
  reportIncident,
  ownRestaurant,
  toOrderDto,
  shortName,
};
