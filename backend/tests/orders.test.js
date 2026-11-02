// Pedidos de punta a punta: cotización, permisos, flujo completo, pagos y reportes.
const {
  api, auth, login, registerClient, createAdmin, createCourier, addAddress, placeOrder, rawQuery,
  SEED, PLACES,
} = require('./helpers');
const orderService = require('../src/services/orderService');

let client;
let otherClient;
let restaurant1;
let restaurant2;
let admin;
let addressId;

beforeAll(async () => {
  [client, otherClient, restaurant1, restaurant2, admin] = await Promise.all([
    registerClient(), registerClient(), login(SEED.restaurant1Owner), login(SEED.restaurant2Owner), createAdmin(),
  ]);
  addressId = (await addAddress(client.token)).id;
});

const get = (token, id) => api().get(`/api/orders/${id}`).set(auth(token));
const post = (token, path, body = {}) => api().post(`/api/orders/${path}`).set(auth(token)).send(body);

// Lleva un pedido del restaurante 1 hasta "entregado" con el repartidor indicado
const deliverOrder = async (orderId, courier) => {
  await post(restaurant1.token, `${orderId}/accept`, { prep_minutes: 10 }).expect(200);
  await post(courier.token, `${orderId}/claim`).expect(200);
  await post(courier.token, `${orderId}/pickup`).expect(200);
  return post(courier.token, `${orderId}/deliver`).expect(200);
};

describe('cotización', () => {
  test('el servidor calcula todo a partir de los productos y la dirección', async () => {
    const res = await post(client.token, 'quote', {
      restaurant_id: 1,
      items: [{ product_id: 103, quantity: 2 }, { product_id: 108, quantity: 1 }, { product_id: 103, quantity: 1 }],
      delivery: { address_id: addressId },
      tip: 500,
    });
    expect(res.status).toBe(200);
    // El mismo producto dos veces se suma en una línea
    expect(res.body.items).toEqual([
      expect.objectContaining({ product_id: 103, quantity: 3, unit_price: 4200, line_total: 12600 }),
      expect.objectContaining({ product_id: 108, quantity: 1, unit_price: 1200 }),
    ]);
    expect(res.body.subtotal).toBe(13800);
    expect(res.body.total).toBe(13800 + res.body.delivery_fee + res.body.service_fee + 500);
    expect(res.body.restaurant).toEqual({ id: 1, name: 'Soda La Casona', is_open: true, sinpe_phone: '8810-1101' });
    expect(res.body.delivery).toMatchObject({ line: 'Mercedes Norte, 200 m norte de la plaza' });
  });

  test('no entrega fuera del radio del restaurante', async () => {
    const res = await post(client.token, 'quote', {
      restaurant_id: 1, items: [{ product_id: 103, quantity: 1 }],
      delivery: { line: 'Cartago centro, frente a la Basílica', ...PLACES.cartago },
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OUT_OF_RANGE');
  });

  test('productos agotados o de otro restaurante: hay que revisar el carrito', async () => {
    const soldOut = await post(client.token, 'quote', {
      restaurant_id: 5, items: [{ product_id: 509, quantity: 1 }], delivery: { address_id: addressId },
    });
    expect(soldOut.status).toBe(409);
    expect(soldOut.body).toMatchObject({ code: 'CART_CHANGED', unavailable_product_ids: [509] });

    const otherMenu = await post(client.token, 'quote', {
      restaurant_id: 1, items: [{ product_id: 201, quantity: 1 }], delivery: { address_id: addressId },
    });
    expect(otherMenu.status).toBe(409);
  });

  test('no se puede usar la dirección de otro cliente', async () => {
    const res = await post(otherClient.token, 'quote', {
      restaurant_id: 1, items: [{ product_id: 103, quantity: 1 }], delivery: { address_id: addressId },
    });
    expect(res.status).toBe(404);
  });

  test('solo los clientes hacen pedidos', async () => {
    const res = await post(restaurant1.token, 'quote', {
      restaurant_id: 1, items: [{ product_id: 103, quantity: 1 }], delivery: { address_id: addressId },
    });
    expect(res.status).toBe(403);
  });
});

describe('crear un pedido', () => {
  test('con tarjeta queda pendiente y pagado; solo se guardan la marca y los últimos 4 dígitos', async () => {
    const order = await placeOrder(client.token, { addressId });
    expect(order.status).toBe('pending');
    expect(order.payment).toMatchObject({ method: 'card', status: 'paid', card_brand: 'visa', card_last4: '4242' });
    expect(JSON.stringify(order)).not.toMatch(/tok_/);
    expect(order.items).toHaveLength(2);
    expect(order.estimated_arrival).toEqual(expect.any(String));
  });

  test('un restaurante cerrado no recibe pedidos', async () => {
    const res = await api().post('/api/orders').set(auth(client.token)).send({
      restaurant_id: 8, items: [{ product_id: 801, quantity: 1 }], delivery: { address_id: addressId },
      payment: { method: 'cash' },
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('RESTAURANT_CLOSED');
  });

  test('si el total cambió desde que lo vio el cliente, avisa en lugar de cobrar otro monto', async () => {
    const res = await api().post('/api/orders').set(auth(client.token)).send({
      restaurant_id: 1, items: [{ product_id: 103, quantity: 1 }], delivery: { address_id: addressId },
      payment: { method: 'cash' }, expected_total: 1,
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TOTAL_CHANGED');
    expect(res.body.quote.total).toBeGreaterThan(1);
  });

  test('valida los datos del pago', async () => {
    const base = { restaurant_id: 1, items: [{ product_id: 103, quantity: 1 }], delivery: { address_id: addressId } };
    const change = await api().post('/api/orders').set(auth(client.token))
      .send({ ...base, payment: { method: 'cash', cash_change_for: 1000 } });
    expect(change.status).toBe(400);
    const sinpe = await api().post('/api/orders').set(auth(client.token)).send({ ...base, payment: { method: 'sinpe' } });
    expect(sinpe.status).toBe(400);
    expect(sinpe.body.fields).toHaveProperty(['payment.sinpe_reference']);
    const fullCard = await api().post('/api/orders').set(auth(client.token))
      .send({ ...base, payment: { method: 'card', card_number: '4242424242424242' } });
    expect(fullCard.status).toBe(400);
  });
});

describe('quién ve qué', () => {
  test('cada rol ve solo lo que le corresponde', async () => {
    const order = await placeOrder(client.token, { addressId });

    const own = await get(client.token, order.id);
    expect(own.status).toBe(200);
    expect(own.body.delivery).toMatchObject({ details: 'Portón negro' });

    expect((await get(otherClient.token, order.id)).status).toBe(404);
    expect((await get(restaurant2.token, order.id)).status).toBe(404);

    // El restaurante no ve la dirección ni el teléfono, y el nombre va abreviado
    const kitchen = await get(restaurant1.token, order.id);
    expect(kitchen.status).toBe(200);
    expect(kitchen.body.delivery).toBeUndefined();
    expect(kitchen.body.client).toEqual({ name: 'Cliente P.' });
    expect(kitchen.body.pricing).toEqual({ subtotal: order.pricing.subtotal, iva_included: order.pricing.iva_included });

    const courier = await createCourier(admin.token);
    expect((await get(courier.token, order.id)).status).toBe(404);

    expect((await get(admin.token, order.id)).status).toBe(200);
    expect((await get(client.token, 999999)).status).toBe(404);
    expect((await get(client.token, 'abc')).status).toBe(404);
  });

  test('la lista del cliente solo trae sus pedidos', async () => {
    const order = await placeOrder(client.token, { addressId });
    const mine = await api().get('/api/orders').set(auth(client.token));
    expect(mine.body.find((o) => o.id === order.id)).toMatchObject({
      status: 'pending', restaurant: { id: 1, name: 'Soda La Casona' }, item_count: 3, rated: false,
    });
    const theirs = await api().get('/api/orders').set(auth(otherClient.token));
    expect(theirs.body.find((o) => o.id === order.id)).toBeUndefined();
  });
});

describe('flujo completo', () => {
  test('el restaurante acepta, un repartidor lo toma, lo retira y lo entrega; el cliente califica', async () => {
    const courier = await createCourier(admin.token);
    const order = await placeOrder(client.token, { addressId, tip: 1000 });

    const board = await api().get('/api/merchant/orders').set(auth(restaurant1.token));
    expect(board.body.find((o) => o.id === order.id)).toMatchObject({ status: 'pending', client_name: 'Cliente P.' });

    // Mientras el restaurante no acepte, no se ofrece a los repartidores
    let offers = await api().get('/api/courier/offers').set(auth(courier.token));
    expect(offers.body.offers.map((o) => o.id)).not.toContain(order.id);

    const accepted = await post(restaurant1.token, `${order.id}/accept`, { prep_minutes: 15 });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({ status: 'accepted', prep_minutes: 15 });

    // Ya aceptado, el cliente no puede cancelarlo
    const late = await post(client.token, `${order.id}/cancel`);
    expect(late.status).toBe(409);
    expect(late.body.code).toBe('ORDER_NOT_CANCELLABLE');

    offers = await api().get('/api/courier/offers').set(auth(courier.token));
    const offer = offers.body.offers.find((o) => o.id === order.id);
    expect(offer).toMatchObject({ earnings: order.pricing.delivery_fee + 1000, tip: 1000, ready: false, payment_method: 'card' });
    expect(offer.pickup_km).toEqual(expect.any(Number));
    // La dirección exacta del cliente no se muestra antes de aceptar
    expect(JSON.stringify(offer)).not.toMatch(/Mercedes Norte/);

    const claimed = await post(courier.token, `${order.id}/claim`);
    expect(claimed.status).toBe(200);
    expect(claimed.body.client).toMatchObject({ name: 'Cliente P.', phone: expect.any(String) });
    expect(claimed.body.delivery.line).toBe('Mercedes Norte, 200 m norte de la plaza');
    expect(claimed.body.earnings).toBe(order.pricing.delivery_fee + 1000);

    // Con una entrega en curso no puede desconectarse
    const offline = await api().put('/api/courier/availability').set(auth(courier.token)).send({ online: false });
    expect(offline.status).toBe(409);

    await post(restaurant1.token, `${order.id}/ready`).expect(200);
    expect((await post(courier.token, `${order.id}/pickup`)).body.status).toBe('picked_up');
    const delivered = await post(courier.token, `${order.id}/deliver`);
    expect(delivered.body.status).toBe('delivered');

    const dashboard = await api().get('/api/courier/me').set(auth(courier.token));
    expect(dashboard.body.profile.availability).toBe('available');
    expect(dashboard.body.active_order).toBeNull();
    expect(dashboard.body.summary.today).toEqual({ earnings: order.pricing.delivery_fee + 1000, deliveries: 1 });
    const history = await api().get('/api/courier/history').set(auth(courier.token));
    expect(history.body[0]).toMatchObject({ id: order.id, status: 'delivered', earnings: order.pricing.delivery_fee + 1000 });

    const rated = await post(client.token, `${order.id}/rating`, { courier_stars: 5, restaurant_stars: 4, comment: 'Todo bien' });
    expect(rated.status).toBe(201);
    expect(rated.body.rating).toMatchObject({ courier_stars: 5, restaurant_stars: 4, comment: 'Todo bien' });
    const twice = await post(client.token, `${order.id}/rating`, { courier_stars: 1, restaurant_stars: 1 });
    expect(twice.status).toBe(409);

    // Terminada la entrega, el teléfono del repartidor ya no se muestra
    const after = await get(client.token, order.id);
    expect(after.body.courier).toMatchObject({ name: expect.any(String), phone: null, location: null });
    expect(after.body.estimated_arrival).toBeNull();
    expect((await api().get('/api/orders').set(auth(client.token))).body.find((o) => o.id === order.id).rated).toBe(true);
  });

  test('si dos repartidores aceptan el mismo pedido a la vez, solo uno se lo lleva', async () => {
    const couriers = await Promise.all([createCourier(admin.token), createCourier(admin.token)]);
    const order = await placeOrder(client.token, { addressId });
    await post(restaurant1.token, `${order.id}/accept`).expect(200);

    const results = await Promise.all(couriers.map((c) => post(c.token, `${order.id}/claim`)));
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409).body.code).toBe('ORDER_TAKEN');

    // Soporte cancela: el repartidor que lo tenía queda libre
    const winner = couriers[results.findIndex((r) => r.status === 200)];
    await api().post(`/api/admin/orders/${order.id}/cancel`).set(auth(admin.token))
      .send({ reason: 'Prueba de cancelación' }).expect(200);
    const dashboard = await api().get('/api/courier/me').set(auth(winner.token));
    expect(dashboard.body.profile.availability).toBe('available');
    expect((await get(client.token, order.id)).body).toMatchObject({ status: 'cancelled', cancelled_by: 'admin' });
  });

  test('un repartidor solo lleva un pedido a la vez y uno desconectado no ve ofertas', async () => {
    const courier = await createCourier(admin.token);
    const [first, second] = [await placeOrder(client.token, { addressId }), await placeOrder(client.token, { addressId })];
    await post(restaurant1.token, `${first.id}/accept`).expect(200);
    await post(restaurant1.token, `${second.id}/accept`).expect(200);

    await post(courier.token, `${first.id}/claim`).expect(200);
    const busy = await post(courier.token, `${second.id}/claim`);
    expect(busy.status).toBe(409);
    expect(busy.body.code).toBe('COURIER_BUSY');

    const idle = await createCourier(admin.token, { online: false });
    expect((await api().get('/api/courier/offers').set(auth(idle.token))).body).toEqual({ availability: 'offline', offers: [] });
    expect((await post(idle.token, `${second.id}/claim`)).body.code).toBe('COURIER_OFFLINE');

    // Retira sin que la cocina lo marque listo (el pedido estaba en el mostrador)
    expect((await post(courier.token, `${first.id}/pickup`)).body.status).toBe('picked_up');
    await post(courier.token, `${first.id}/deliver`).expect(200);
    await api().post(`/api/admin/orders/${second.id}/cancel`).set(auth(admin.token)).send({ reason: 'Limpieza' }).expect(200);
  });

  test('acciones fuera de orden o de otro restaurante no cambian nada', async () => {
    const order = await placeOrder(client.token, { addressId });
    expect((await post(restaurant1.token, `${order.id}/ready`)).status).toBe(409);
    expect((await post(restaurant2.token, `${order.id}/accept`)).status).toBe(404);
    expect((await post(client.token, `${order.id}/accept`)).status).toBe(403);
    expect((await get(client.token, order.id)).body.status).toBe('pending');
  });
});

describe('pagos', () => {
  test('efectivo: el repartidor sabe cuánto cobrar y el pago queda hecho al entregar', async () => {
    const courier = await createCourier(admin.token);
    const total = (await post(client.token, 'quote', {
      restaurant_id: 1, items: [{ product_id: 103, quantity: 2 }, { product_id: 108, quantity: 1 }], delivery: { address_id: addressId },
    })).body.total;
    const cashFor = Math.ceil(total / 5000) * 5000;
    const order = await placeOrder(client.token, { addressId, payment: { method: 'cash', cash_change_for: cashFor } });
    expect(order.payment).toMatchObject({ method: 'cash', status: 'pending', cash_change_for: cashFor });

    await post(restaurant1.token, `${order.id}/accept`).expect(200);
    const offer = (await api().get('/api/courier/offers').set(auth(courier.token))).body.offers.find((o) => o.id === order.id);
    expect(offer.cash_to_collect).toBe(total);

    const claimed = await post(courier.token, `${order.id}/claim`);
    expect(claimed.body.payment).toEqual({ method: 'cash', status: 'pending', cash_change_for: cashFor });
    expect(claimed.body.pricing.total).toBe(total);
    await post(courier.token, `${order.id}/pickup`).expect(200);
    await post(courier.token, `${order.id}/deliver`).expect(200);
    expect((await get(client.token, order.id)).body.payment.status).toBe('paid');
  });

  test('SINPE Móvil: el restaurante ve el comprobante y queda pagado al aceptar', async () => {
    const order = await placeOrder(client.token, { addressId, payment: { method: 'sinpe', sinpe_reference: '2026110112345' } });
    expect(order.payment).toMatchObject({ method: 'sinpe', status: 'pending' });
    const kitchen = (await api().get('/api/merchant/orders').set(auth(restaurant1.token))).body.find((o) => o.id === order.id);
    expect(kitchen.payment).toEqual({ method: 'sinpe', status: 'pending', sinpe_reference: '2026110112345' });
    await post(restaurant1.token, `${order.id}/accept`).expect(200);
    expect((await get(client.token, order.id)).body.payment.status).toBe('paid');
    await api().post(`/api/admin/orders/${order.id}/cancel`).set(auth(admin.token)).send({ reason: 'Limpieza' }).expect(200);
    expect((await get(client.token, order.id)).body.payment.status).toBe('refunded');
  });

  test('si el cliente cancela mientras está pendiente, se le devuelve el pago con tarjeta', async () => {
    const order = await placeOrder(client.token, { addressId });
    const res = await post(client.token, `${order.id}/cancel`, { reason: 'Pedí por error' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'cancelled', cancelled_by: 'client', cancel_reason: 'Pedí por error' });
    expect(res.body.payment.status).toBe('refunded');
  });

  test('el restaurante puede rechazar, con un motivo para el cliente', async () => {
    const order = await placeOrder(client.token, { addressId });
    expect((await post(restaurant1.token, `${order.id}/reject`)).status).toBe(400);
    const res = await post(restaurant1.token, `${order.id}/reject`, { reason: 'Se nos acabó el pollo' });
    expect(res.status).toBe(200);
    const seen = await get(client.token, order.id);
    expect(seen.body).toMatchObject({ status: 'cancelled', cancelled_by: 'restaurant', cancel_reason: 'Se nos acabó el pollo' });
    expect(seen.body.payment.status).toBe('refunded');
  });

  test('si el restaurante no responde a tiempo, el pedido se cancela solo y se reembolsa', async () => {
    const order = await placeOrder(client.token, { addressId });
    await rawQuery('UPDATE client_order SET created_at = NOW() - INTERVAL 20 MINUTE WHERE id = ?', [order.id]);
    expect(await orderService.expirePending(15)).toContain(order.id);
    const res = await get(client.token, order.id);
    expect(res.body).toMatchObject({ status: 'cancelled', cancelled_by: 'system' });
    expect(res.body.payment.status).toBe('refunded');
  });
});

describe('reportes de problemas', () => {
  test('el cliente reporta y soporte resuelve con reembolso y amonestación al repartidor', async () => {
    const courier = await createCourier(admin.token);
    const order = await placeOrder(client.token, { addressId });
    await deliverOrder(order.id, courier);

    const report = await post(client.token, `${order.id}/incidents`, { reason: 'late', description: 'Llegó una hora tarde y frío' });
    expect(report.status).toBe(201);
    expect(report.body.incidents).toEqual([expect.objectContaining({ reason: 'late', status: 'open' })]);
    const again = await post(client.token, `${order.id}/incidents`, { reason: 'other', description: 'Otro problema distinto' });
    expect(again.status).toBe(409);

    const inbox = await api().get('/api/admin/incidents').query({ status: 'open' }).set(auth(admin.token));
    const incident = inbox.body.find((i) => i.order_id === order.id);
    expect(incident).toMatchObject({ reason: 'late', order: { courier_id: courier.user.id, payment: { status: 'paid' } } });

    const resolved = await api().post(`/api/admin/incidents/${incident.id}/resolve`).set(auth(admin.token))
      .send({ resolution: 'Se reembolsó el pedido completo', refund: true, warn_courier: true });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ status: 'resolved', resolution: 'Se reembolsó el pedido completo' });

    expect((await get(client.token, order.id)).body.payment.status).toBe('refunded');
    const profile = await api().get('/api/courier/me').set(auth(courier.token));
    expect(profile.body.profile.warnings_count).toBe(1);
    const warnings = await api().get(`/api/admin/couriers/${courier.user.id}/warnings`).set(auth(admin.token));
    expect(warnings.body[0].reason).toMatch(new RegExp(`^Pedido #${order.id}`));
  });

  test('mientras está pendiente no se reporta: se cancela', async () => {
    const order = await placeOrder(client.token, { addressId });
    const res = await post(client.token, `${order.id}/incidents`, { reason: 'late', description: 'Todavía no lo aceptan' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INCIDENT_TOO_EARLY');
    await post(client.token, `${order.id}/cancel`).expect(200);
  });
});
