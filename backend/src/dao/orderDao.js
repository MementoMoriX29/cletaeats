// Pedidos: creación, consultas y cambios de estado.
const db = require('../config/db');

module.exports = {
  create: (o) => db.callOne('sp_order_create', [
    o.clientId, o.restaurantId, JSON.stringify(o.items),
    o.delivery.line, o.delivery.details, o.delivery.lat, o.delivery.lng,
    o.notes, o.quote.distance_km,
    o.quote.subtotal, o.quote.iva_included, o.quote.delivery_fee, o.quote.service_fee, o.quote.tip, o.quote.total,
    o.quote.is_holiday,
    o.payment.method, o.payment.card_brand, o.payment.card_last4, o.payment.sinpe_reference,
    o.payment.cash_change_for,
  ]),

  async get(id) {
    const [[order], items, incidents] = await db.callSets('sp_order_get', [id]);
    return order ? { order, items, incidents } : null;
  },

  listByClient: (clientId) => db.call('sp_order_list_by_client', [clientId]),
  listByRestaurant: (restaurantId, active) => db.call('sp_order_list_by_restaurant', [restaurantId, active]),
  listOffers: () => db.call('sp_order_list_offers'),
  activeForCourier: (courierId) => db.callOne('sp_order_active_for_courier', [courierId]),
  listByCourier: (courierId) => db.call('sp_order_list_by_courier', [courierId]),
  listAdmin: (filter, limit) => db.call('sp_order_list_admin', [filter, limit]),

  cancelByClient: (id, clientId, reason) => db.callSets('sp_order_cancel_by_client', [id, clientId, reason]),
  accept: (id, restaurantId, prepMinutes) => db.callSets('sp_order_accept', [id, restaurantId, prepMinutes]),
  reject: (id, restaurantId, reason) => db.callSets('sp_order_reject', [id, restaurantId, reason]),
  markReady: (id, restaurantId) => db.callSets('sp_order_mark_ready', [id, restaurantId]),
  claim: (id, courierId) => db.callSets('sp_order_claim', [id, courierId]),
  pickup: (id, courierId) => db.callSets('sp_order_pickup', [id, courierId]),
  deliver: (id, courierId) => db.callSets('sp_order_deliver', [id, courierId]),
  cancelByAdmin: (id, reason) => db.callSets('sp_order_cancel_by_admin', [id, reason]),

  listExpired: (minutes) => db.call('sp_order_list_expired', [minutes]),
  expire: async (id) => Boolean((await db.callOne('sp_order_expire', [id]))?.expired),

  rate: (id, clientId, { courier_stars, restaurant_stars, comment }) =>
    db.callSets('sp_order_rate', [id, clientId, courier_stars, restaurant_stars, comment]),
};
