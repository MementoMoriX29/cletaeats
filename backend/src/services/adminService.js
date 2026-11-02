// Panel de soporte: indicadores, pedidos, repartidores, restaurantes, clientes e incidentes.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const reportDao = require('../dao/reportDao');
const orderDao = require('../dao/orderDao');
const courierDao = require('../dao/courierDao');
const restaurantDao = require('../dao/restaurantDao');
const accountDao = require('../dao/accountDao');
const incidentDao = require('../dao/incidentDao');
const events = require('../realtime/events');
const { toProfile } = require('./courierService');
const { startOfDayCR, daysAgoCR, DAY_MS } = require('../utils/time');
const { notFound } = require('../utils/errors');
const { escapeLike } = require('../utils/search');

const CR_OFFSET_MS = -6 * 60 * 60 * 1000;
const crDate = (date) => new Date(date.getTime() + CR_OFFSET_MS).toISOString().slice(0, 10);

const overview = async (days) => {
  const today = startOfDayCR();
  const from = daysAgoCR(days - 1);
  const { kpis, daily, hourly, topRestaurants, split, paymentMethods } = await reportDao.overview(today, from);

  // Los días y horas sin pedidos también aparecen (en cero) para que los gráficos no salten.
  const byDay = new Map(daily.map((d) => [d.order_day, d]));
  const series = Array.from({ length: days }, (_, i) => {
    const day = crDate(new Date(from.getTime() + i * DAY_MS));
    const row = byDay.get(day);
    return { date: day, orders: Number(row?.orders ?? 0), sales: Number(row?.sales ?? 0) };
  });
  const byHour = new Map(hourly.map((h) => [Number(h.order_hour), Number(h.orders)]));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: byHour.get(hour) ?? 0 }));

  const num = (value) => (value === null || value === undefined ? null : Number(value));
  return {
    days,
    kpis: {
      orders_today: num(kpis.orders_today),
      sales_today: num(kpis.sales_today),
      active_orders: num(kpis.active_orders),
      couriers_online: num(kpis.couriers_online),
      courier_applications: num(kpis.courier_applications),
      open_incidents: num(kpis.open_incidents),
      orders_period: num(kpis.orders_period),
      sales_period: num(kpis.sales_period),
      avg_ticket: num(kpis.avg_ticket),
      avg_delivery_minutes: num(kpis.avg_delivery_minutes),
      cancel_rate: num(kpis.cancel_rate),
    },
    daily: series,
    hourly: hours,
    top_restaurants: topRestaurants.map((r) => ({ id: r.id, name: r.name, orders: Number(r.orders), sales: Number(r.sales) })),
    revenue_split: {
      restaurants: Number(split.restaurants),
      couriers: Number(split.couriers),
      platform: Number(split.platform),
      total: Number(split.total),
    },
    payment_methods: paymentMethods.map((p) => ({ method: p.method, orders: Number(p.orders) })),
  };
};

const listOrders = async (filter, limit) => (await orderDao.listAdmin(filter, limit)).map((o) => ({
  id: o.id,
  status: o.status,
  total: o.total,
  service_fee: o.service_fee,
  restaurant_name: o.restaurant_name,
  client_name: o.client_name,
  courier_name: o.courier_name,
  payment: { method: o.payment_method, status: o.payment_status },
  created_at: o.created_at,
  delivered_at: o.delivered_at,
  cancelled_at: o.cancelled_at,
  cancelled_by: o.cancelled_by,
  cancel_reason: o.cancel_reason,
}));

// ── Repartidores ───────────────────────────────────────────────
const listCouriers = async (status) => (await courierDao.list(status)).map((c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  status: c.status,
  national_id: c.national_id,
  vehicle: c.vehicle,
  availability: c.availability,
  warnings_count: c.warnings_count,
  deliveries: Number(c.deliveries),
  rating: { average: Number(c.rating_avg), count: Number(c.rating_count) },
  created_at: c.created_at,
  approved_at: c.approved_at,
  last_seen_at: c.last_seen_at,
}));

const afterCourierChange = (row) => {
  if (row.status === 'suspended') events.disconnectUser(row.id);
  return toProfile(row);
};

const courierAction = async (id, action) => afterCourierChange(await courierDao.adminAction(id, action));
const warnCourier = async (id, reason) => afterCourierChange(await courierDao.warn(id, reason));
const courierWarnings = async (id) => {
  if (!(await courierDao.get(id))) throw notFound('Repartidor no encontrado');
  return courierDao.warnings(id);
};

// ── Restaurantes ───────────────────────────────────────────────
const listRestaurants = async () => (await restaurantDao.listAdmin()).map((r) => ({
  id: r.id,
  name: r.name,
  tax_id: r.tax_id,
  category: r.category,
  description: r.description,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  phone: r.phone,
  prep_minutes: r.prep_minutes,
  is_open: r.is_open,
  active: r.active,
  owner: r.owner_id ? { id: r.owner_id, name: r.owner_name, email: r.owner_email, phone: r.owner_phone } : null,
  rating: { average: Number(r.rating_avg), count: Number(r.rating_count) },
  delivered_orders: Number(r.delivered_orders),
  gross_sales: Number(r.gross_sales),
  created_at: r.created_at,
}));

// Crea el restaurante y la cuenta de su dueño con una contraseña temporal que se muestra una sola vez.
const createRestaurant = async (data) => {
  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, env.bcryptRounds);
  const { id } = await restaurantDao.create({ ...data, owner: { ...data.owner, passwordHash } });
  const restaurant = (await listRestaurants()).find((r) => r.id === id);
  return { restaurant, temporary_password: temporaryPassword };
};

const updateRestaurant = async (id, data) => {
  if (!(await restaurantDao.updateAdmin(id, data))) throw notFound('Restaurante no encontrado');
  return (await listRestaurants()).find((r) => r.id === id);
};

const setRestaurantActive = async (id, active) => {
  if (!(await restaurantDao.setActive(id, active))) throw notFound('Restaurante no encontrado');
  return (await listRestaurants()).find((r) => r.id === id);
};

// ── Clientes ───────────────────────────────────────────────────
const listClients = async (search) => (await accountDao.listClients(search ? escapeLike(search) : null)).map((c) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  status: c.status,
  orders: Number(c.orders),
  total_spent: Number(c.total_spent),
  last_order_at: c.last_order_at,
  last_login_at: c.last_login_at,
  created_at: c.created_at,
}));

const setClientStatus = async (id, status) => {
  const row = await accountDao.setClientStatus(id, status);
  if (!row) throw notFound('Cliente no encontrado');
  if (status === 'suspended') events.disconnectUser(id);
  return { id: row.id, status: row.status };
};

// ── Incidentes ─────────────────────────────────────────────────
const listIncidents = async (status) => (await incidentDao.list(status)).map((i) => ({
  id: i.id,
  order_id: i.order_id,
  reason: i.reason,
  description: i.description,
  status: i.status,
  resolution: i.resolution,
  created_at: i.created_at,
  resolved_at: i.resolved_at,
  reporter: { name: i.reporter_name, email: i.reporter_email, phone: i.reporter_phone },
  order: {
    status: i.order_status,
    total: i.order_total,
    restaurant_name: i.restaurant_name,
    courier_id: i.courier_id,
    courier_name: i.courier_name,
    payment: { method: i.payment_method, status: i.payment_status },
  },
}));

const resolveIncident = async (id, data) => {
  const { courier_id: courierId } = await incidentDao.resolve(id, data);
  if (data.warn_courier && courierId) {
    const courier = await courierDao.get(courierId);
    if (courier?.status === 'suspended') events.disconnectUser(courierId);
  }
  return (await listIncidents(null)).find((i) => i.id === id);
};

module.exports = {
  overview,
  listOrders,
  listCouriers,
  courierAction,
  warnCourier,
  courierWarnings,
  listRestaurants,
  createRestaurant,
  updateRestaurant,
  setRestaurantActive,
  listClients,
  setClientStatus,
  listIncidents,
  resolveIncident,
};
