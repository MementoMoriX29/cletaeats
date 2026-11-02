// Genera ~30 días de pedidos de ejemplo para que los paneles (ventas, ganancias, calificaciones)
// no arranquen vacíos. Usa el mismo cálculo de precios que la API y siempre produce los mismos datos
// (generador pseudoaleatorio con semilla fija). Solo corre si todavía no hay pedidos.
const { calculateQuote, OutOfRangeError } = require('../src/services/pricing');
const { isCostaRicaHoliday } = require('../src/utils/holidays');
const { startOfDayCR, DAY_MS } = require('../src/utils/time');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Pedidos por hora del día (hora de Costa Rica): picos de almuerzo y cena
const HOUR_WEIGHTS = [[7, 2], [8, 3], [9, 2], [10, 2], [11, 5], [12, 10], [13, 9], [14, 4], [15, 2], [16, 2],
  [17, 4], [18, 8], [19, 10], [20, 8], [21, 4]];
const RESTAURANT_WEIGHTS = [[1, 9], [2, 8], [3, 6], [4, 9], [5, 5], [6, 7], [7, 4], [8, 5]];
const TIPS = [[0, 5], [500, 3], [1000, 2], [1500, 1]];
const METHODS = [['card', 5], ['sinpe', 3], ['cash', 2]];
const OUTCOMES = [['delivered', 91], ['client', 3], ['restaurant', 3], ['system', 3]];
const STARS = [[5, 62], [4, 25], [3, 8], [2, 3], [1, 2]];
const COMMENTS = [
  'Llegó rapidísimo y todo caliente', 'Muy amable el repartidor', 'Todo excelente, como siempre',
  'La comida estaba buenísima', 'Tardó un poco más de lo estimado', 'Faltaron servilletas, pero todo bien',
  'Excelente servicio', 'El empaque llegó un poco golpeado', 'Muy buena porción', 'Volvería a pedir',
];
const CLIENT_CANCEL = ['Me equivoqué de dirección', 'Pedí por error', 'Ya no lo necesito'];
const RESTAURANT_CANCEL = ['Se nos acabó un ingrediente', 'Tenemos demasiados pedidos en este momento', 'Estamos por cerrar'];

// Generador pseudoaleatorio con semilla (mulberry32)
const createRandom = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

async function seedHistory(connection, { days = 30, now = new Date(), seed = 20261101, log = () => {} } = {}) {
  const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM client_order');
  if (total > 0) {
    log('  Ya hay pedidos: no se generan pedidos de ejemplo');
    return 0;
  }

  const random = createRandom(seed);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const weighted = (entries) => {
    let r = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of entries) {
      r -= weight;
      if (r <= 0) return value;
    }
    return entries[entries.length - 1][0];
  };

  const [restaurants] = await connection.query('SELECT id, lat, lng, prep_minutes FROM restaurant');
  const [products] = await connection.query(
    'SELECT id, restaurant_id, name, price FROM product WHERE available AND deleted_at IS NULL');
  const [addresses] = await connection.query('SELECT client_id, line, details, lat, lng FROM address');
  const [couriers] = await connection.query(
    "SELECT c.account_id AS id FROM courier c JOIN account a ON a.id = c.account_id WHERE a.status = 'active'");
  if (!restaurants.length || !addresses.length || !couriers.length) return 0;

  const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
  const menuByRestaurant = new Map();
  for (const product of products) {
    if (!menuByRestaurant.has(product.restaurant_id)) menuByRestaurant.set(product.restaurant_id, []);
    menuByRestaurant.get(product.restaurant_id).push(product);
  }

  const orders = [];
  const items = [];
  const payments = [];
  const ratings = [];
  const todayStart = startOfDayCR(now).getTime();

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = todayStart - d * DAY_MS;
    const weekday = new Date(dayStart - 6 * HOUR).getUTCDay();
    const count = (weekday === 0 || weekday === 6 ? 11 : 8) + Math.floor(random() * 5);

    for (let n = 0; n < count; n++) {
      const createdAt = new Date(dayStart + weighted(HOUR_WEIGHTS) * HOUR + Math.floor(random() * HOUR));
      // Solo pedidos que ya terminaron
      if (createdAt.getTime() > now.getTime() - 90 * MINUTE) continue;

      const restaurant = restaurantById.get(weighted(RESTAURANT_WEIGHTS));
      const menu = menuByRestaurant.get(restaurant?.id);
      if (!menu?.length) continue;
      const address = pick(addresses);

      const lines = new Map();
      const lineCount = 1 + Math.floor(random() * 3);
      for (let i = 0; i < lineCount; i++) {
        const product = pick(menu);
        const quantity = Math.min(3, (lines.get(product.id)?.quantity ?? 0) + (random() < 0.2 ? 2 : 1));
        lines.set(product.id, { product_id: product.id, name: product.name, unit_price: product.price, quantity });
      }

      let quote;
      try {
        quote = calculateQuote({
          restaurant, destination: address, items: [...lines.values()],
          isHoliday: isCostaRicaHoliday(createdAt), tip: weighted(TIPS),
        });
      } catch (err) {
        if (err instanceof OutOfRangeError) continue;
        throw err;
      }

      const id = orders.length + 1;
      const at = (minutes) => new Date(createdAt.getTime() + minutes * MINUTE);
      const outcome = weighted(OUTCOMES);
      const method = weighted(METHODS);
      const order = {
        id, client_id: address.client_id, restaurant_id: restaurant.id, courier_id: null, status: 'cancelled',
        delivery_line: address.line, delivery_details: address.details, delivery_lat: address.lat,
        delivery_lng: address.lng, notes: random() < 0.15 ? 'Por favor tocar el timbre' : null,
        distance_km: quote.distance_km, subtotal: quote.subtotal, iva_included: quote.iva_included,
        delivery_fee: quote.delivery_fee, service_fee: quote.service_fee, tip: quote.tip, total: quote.total,
        is_holiday: quote.is_holiday, prep_minutes: null, cancel_reason: null, cancelled_by: null,
        created_at: createdAt, accepted_at: null, assigned_at: null, ready_at: null, picked_up_at: null,
        delivered_at: null, cancelled_at: null,
      };

      if (outcome === 'delivered') {
        const prep = Math.max(5, restaurant.prep_minutes + Math.floor(random() * 9) - 3);
        const accepted = 1 + random() * 3;
        const assigned = accepted + 1 + random() * 4;
        const ready = accepted + prep;
        const pickedUp = Math.max(ready, assigned + 4) + random() * 4;
        const delivered = pickedUp + quote.distance_km * 4 + 2 + random() * 6;
        Object.assign(order, {
          status: 'delivered', courier_id: pick(couriers).id, prep_minutes: prep,
          accepted_at: at(accepted), assigned_at: at(assigned), ready_at: at(ready),
          picked_up_at: at(pickedUp), delivered_at: at(delivered),
        });
      } else if (outcome === 'client') {
        Object.assign(order, { cancelled_by: 'client', cancel_reason: pick(CLIENT_CANCEL), cancelled_at: at(1 + random() * 3) });
      } else if (outcome === 'restaurant') {
        Object.assign(order, { cancelled_by: 'restaurant', cancel_reason: pick(RESTAURANT_CANCEL), cancelled_at: at(2 + random() * 4) });
      } else {
        Object.assign(order, { cancelled_by: 'system', cancel_reason: 'El restaurante no confirmó el pedido a tiempo', cancelled_at: at(15) });
      }
      orders.push(order);

      for (const line of quote.items) items.push([id, line.product_id, line.name, line.unit_price, line.quantity]);

      const delivered = order.status === 'delivered';
      let paymentStatus = 'pending';
      let paidAt = null;
      if (method === 'card') {
        paymentStatus = delivered ? 'paid' : 'refunded';
        paidAt = createdAt;
      } else if (delivered) {
        paymentStatus = 'paid';
        paidAt = method === 'sinpe' ? order.accepted_at : order.delivered_at;
      }
      payments.push([
        id, method, paymentStatus, quote.total,
        method === 'card' ? pick(['visa', 'mastercard', 'visa', 'amex']) : null,
        method === 'card' ? String(1000 + Math.floor(random() * 9000)) : null,
        method === 'sinpe' ? String(Math.floor(1e9 + random() * 9e9)) : null,
        method === 'cash' && random() < 0.6 ? Math.ceil(quote.total / 5000) * 5000 : null,
        paidAt,
      ]);

      if (delivered && random() < 0.65) {
        ratings.push([id, weighted(STARS), weighted(STARS), random() < 0.4 ? pick(COMMENTS) : null,
          new Date(order.delivered_at.getTime() + (10 + random() * 120) * MINUTE)]);
      }
    }
  }

  if (!orders.length) return 0;

  const orderColumns = Object.keys(orders[0]);
  await connection.query(`INSERT INTO client_order (${orderColumns.join(', ')}) VALUES ?`,
    [orders.map((o) => orderColumns.map((column) => o[column]))]);
  await connection.query(
    'INSERT INTO order_item (order_id, product_id, name, unit_price, quantity) VALUES ?', [items]);
  await connection.query(
    `INSERT INTO payment (order_id, method, status, amount, card_brand, card_last4, sinpe_reference,
                          cash_change_for, paid_at) VALUES ?`, [payments]);
  if (ratings.length) {
    await connection.query(
      'INSERT INTO rating (order_id, courier_stars, restaurant_stars, comment, created_at) VALUES ?', [ratings]);
  }

  // Algunos reportes para la bandeja de soporte: dos resueltos y uno abierto
  const recentDelivered = orders.filter((o) => o.status === 'delivered').slice(-12);
  if (recentDelivered.length >= 3) {
    const [late, missing, open] = [recentDelivered[0], recentDelivered[4], recentDelivered[recentDelivered.length - 1]];
    const after = (o, minutes) => new Date(o.delivered_at.getTime() + minutes * MINUTE);
    await connection.query(
      `INSERT INTO incident (order_id, reporter_id, reason, description, status, resolution, created_at, resolved_at)
       VALUES ?`, [[
        [late.id, late.client_id, 'late', 'El pedido llegó casi 30 minutos después de lo estimado y la comida estaba fría.',
          'resolved', 'Hablamos con el repartidor sobre los tiempos de entrega y le ofrecimos una disculpa al cliente.', after(late, 20), after(late, 90)],
        [missing.id, missing.client_id, 'missing_items', 'Faltó una bebida del pedido.',
          'resolved', 'El restaurante confirmó el faltante; se reembolsó el pedido.', after(missing, 15), after(missing, 60)],
        [open.id, open.client_id, 'wrong_order', 'Me llegó un plato distinto al que pedí.',
          'open', null, after(open, 10), null],
      ]]);
    await connection.query(
      'INSERT INTO courier_warning (courier_id, reason, created_at) VALUES (?, ?, ?)',
      [late.courier_id, `Pedido #${late.id}: entrega con mucho atraso`, after(late, 90)]);
    await connection.query('UPDATE courier SET warnings_count = warnings_count + 1 WHERE account_id = ?', [late.courier_id]);
    await connection.query("UPDATE payment SET status = 'refunded' WHERE order_id = ?", [missing.id]);
  }

  return orders.length;
}

module.exports = { seedHistory };
