// App del repartidor: conectarse, ver pedidos disponibles, entregar y ver ganancias.
const courierDao = require('../dao/courierDao');
const orderDao = require('../dao/orderDao');
const events = require('../realtime/events');
const { toOrderDto } = require('./orderService');
const { roadDistanceKm } = require('../utils/geo');
const { startOfDayCR, startOfWeekCR } = require('../utils/time');
const { notFound } = require('../utils/errors');

// No se ofrecen pedidos cuyo restaurante esté más lejos que esto del repartidor
const MAX_PICKUP_KM = 8;

const toProfile = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  status: row.status,
  vehicle: row.vehicle,
  availability: row.availability,
  warnings_count: row.warnings_count,
  approved_at: row.approved_at,
  created_at: row.created_at,
  rating: { average: Number(row.rating_avg), count: Number(row.rating_count) },
});

const summary = async (courierId) => {
  const row = await courierDao.summary(courierId, startOfDayCR(), startOfWeekCR());
  return {
    today: { earnings: Number(row.earnings_today), deliveries: Number(row.deliveries_today) },
    week: { earnings: Number(row.earnings_week), deliveries: Number(row.deliveries_week) },
    total: { earnings: Number(row.earnings_total), deliveries: Number(row.deliveries_total) },
  };
};

const getProfile = async (courierId) => {
  const row = await courierDao.get(courierId);
  if (!row) throw notFound('Repartidor no encontrado');
  return row;
};

module.exports = {
  // Todo lo que necesita la pantalla principal en una sola llamada
  async dashboard(viewer) {
    const profile = toProfile(await getProfile(viewer.id));
    const active = await orderDao.activeForCourier(viewer.id);
    return {
      profile,
      active_order: active ? toOrderDto(await orderDao.get(active.id), viewer) : null,
      summary: await summary(viewer.id),
    };
  },

  async setAvailability(viewer, online) {
    await courierDao.setAvailability(viewer.id, online);
    return toProfile(await getProfile(viewer.id));
  },

  // Pedidos sin repartidor, del más cercano al más lejano. La dirección exacta del cliente
  // se muestra recién después de aceptar; acá solo la distancia del trayecto.
  async offers(viewer) {
    const courier = await getProfile(viewer.id);
    if (courier.availability !== 'available') return { availability: courier.availability, offers: [] };

    const origin = courier.last_lat !== null ? { lat: courier.last_lat, lng: courier.last_lng } : null;
    const offers = (await orderDao.listOffers())
      .map((o) => ({
        id: o.id,
        ready: o.status === 'ready',
        restaurant: { id: o.restaurant_id, name: o.restaurant_name, address: o.restaurant_address, lat: o.restaurant_lat, lng: o.restaurant_lng },
        pickup_km: origin ? roadDistanceKm(origin, { lat: o.restaurant_lat, lng: o.restaurant_lng }) : null,
        dropoff_km: o.distance_km,
        earnings: o.delivery_fee + o.tip,
        tip: o.tip,
        item_count: Number(o.item_count),
        payment_method: o.payment_method,
        cash_to_collect: o.payment_method === 'cash' ? o.total : null,
        accepted_at: o.accepted_at,
        ready_estimate: o.ready_at ?? new Date(new Date(o.accepted_at).getTime() + o.prep_minutes * 60000).toISOString(),
      }))
      .filter((o) => o.pickup_km === null || o.pickup_km <= MAX_PICKUP_KM)
      .sort((a, b) => (a.pickup_km ?? Infinity) - (b.pickup_km ?? Infinity));

    return { availability: courier.availability, offers };
  },

  // Guarda la ubicación y se la reenvía a quien esté mirando el pedido en curso.
  async updateLocation(courierId, lat, lng) {
    const active = await courierDao.updateLocation(courierId, lat, lng);
    if (active) {
      events.courierLocation(active.id, { order_id: active.id, lat, lng, at: new Date().toISOString() });
    }
    return Boolean(active);
  },

  async history(viewer) {
    return (await orderDao.listByCourier(viewer.id)).map((o) => ({
      id: o.id,
      status: o.status,
      restaurant_name: o.restaurant_name,
      distance_km: o.distance_km,
      earnings: o.status === 'delivered' ? o.delivery_fee + o.tip : 0,
      tip: o.tip,
      created_at: o.created_at,
      delivered_at: o.delivered_at,
      cancelled_at: o.cancelled_at,
      courier_stars: o.courier_stars,
    }));
  },

  summary: (viewer) => summary(viewer.id),
  toProfile,
};
