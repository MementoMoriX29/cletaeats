// Panel de soporte: indicadores, repartidores, restaurantes, clientes y pedidos.
const {
  api, auth, unique, uniquePhone, uniqueNationalId, login, registerClient, createAdmin, createCourier, addAddress,
  placeOrder, DEMO_PASSWORD,
} = require('./helpers');

let admin;
const adminApi = (method, path) => api()[method](`/api/admin${path}`).set(auth(admin.token));

const applyAsCourier = async () => {
  const res = await api().post('/api/auth/register-courier').send({
    name: 'Solicitante Prueba', email: unique('solicitud'), phone: uniquePhone(), password: DEMO_PASSWORD,
    national_id: uniqueNationalId(),
  });
  return res.body;
};

beforeAll(async () => {
  admin = await createAdmin();
});

test('solo administradores', async () => {
  const client = await registerClient();
  expect((await api().get('/api/admin/overview').set(auth(client.token))).status).toBe(403);
  expect((await api().get('/api/admin/overview')).status).toBe(401);
});

test('indicadores con series completas para los gráficos', async () => {
  const res = await adminApi('get', '/overview?days=7');
  expect(res.status).toBe(200);
  expect(res.body.daily).toHaveLength(7);
  expect(res.body.daily[6].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(res.body.hourly).toHaveLength(24);
  expect(res.body.kpis).toEqual(expect.objectContaining({
    orders_today: expect.any(Number), sales_period: expect.any(Number), courier_applications: expect.any(Number),
  }));
  const { revenue_split: split } = res.body;
  expect(split.restaurants + split.couriers + split.platform).toBe(split.total);
  expect((await adminApi('get', '/overview?days=5')).status).toBe(400);
});

describe('repartidores', () => {
  test('aprueba y rechaza solicitudes', async () => {
    const [first, second] = [await applyAsCourier(), await applyAsCourier()];
    const pending = await adminApi('get', '/couriers?status=pending');
    expect(pending.body.map((c) => c.id)).toEqual(expect.arrayContaining([first.user.id, second.user.id]));

    const approved = await adminApi('post', `/couriers/${first.user.id}/approve`);
    expect(approved.body).toMatchObject({ status: 'active', approved_at: expect.any(String) });
    const session = await login(first.user.email);
    await api().put('/api/courier/availability').set(auth(session.token)).send({ online: true }).expect(200);

    expect((await adminApi('post', `/couriers/${second.user.id}/reject`)).body.status).toBe('rejected');
    const again = await adminApi('post', `/couriers/${second.user.id}/reject`);
    expect(again.status).toBe(409);
    expect((await adminApi('post', `/couriers/${second.user.id}/fire`)).status).toBe(404);
  });

  test('con 4 amonestaciones queda suspendido; al reactivarlo se reinician', async () => {
    const courier = await createCourier(admin.token);
    const { id } = courier.user;
    for (let i = 1; i <= 3; i++) {
      const res = await adminApi('post', `/couriers/${id}/warnings`).send({ reason: `Amonestación número ${i}` });
      expect(res.body).toMatchObject({ status: 'active', warnings_count: i });
    }
    const fourth = await adminApi('post', `/couriers/${id}/warnings`).send({ reason: 'Amonestación número 4' });
    expect(fourth.body).toMatchObject({ status: 'suspended', warnings_count: 4, availability: 'offline' });
    expect((await api().get('/api/courier/me').set(auth(courier.token))).status).toBe(403);

    const reactivated = await adminApi('post', `/couriers/${id}/reactivate`);
    expect(reactivated.body).toMatchObject({ status: 'active', warnings_count: 0 });
    expect((await adminApi('get', `/couriers/${id}/warnings`)).body).toHaveLength(4);
    await login(courier.user.email);
  });

  test('no suspende a un repartidor que está entregando', async () => {
    const courier = await createCourier(admin.token);
    const client = await registerClient();
    const { id: addressId } = await addAddress(client.token);
    const order = await placeOrder(client.token, { addressId });
    const owner = await login('lacasona@example.com');
    await api().post(`/api/orders/${order.id}/accept`).set(auth(owner.token)).send({}).expect(200);
    await api().post(`/api/orders/${order.id}/claim`).set(auth(courier.token)).expect(200);

    const res = await adminApi('post', `/couriers/${courier.user.id}/suspend`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COURIER_HAS_ACTIVE_ORDER');

    const active = await adminApi('get', '/orders?filter=active');
    expect(active.body.find((o) => o.id === order.id)).toMatchObject({ status: 'accepted', courier_name: 'Repartidor de Prueba' });
    await adminApi('post', `/orders/${order.id}/cancel`).send({ reason: 'Prueba' }).expect(200);
    expect((await adminApi('post', `/couriers/${courier.user.id}/suspend`)).body.status).toBe('suspended');
  });
});

describe('restaurantes', () => {
  const newRestaurant = () => ({
    name: 'Panadería La Espiga', tax_id: `3-101-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
    category: 'Panadería', description: 'Pan recién horneado todos los días.',
    address: 'Heredia, 100 m sur de la iglesia de San Francisco', lat: 9.9917, lng: -84.1295, phone: '2260-9090',
    prep_minutes: 10, owner: { name: 'Rosa Jiménez Mora', email: unique('panaderia'), phone: uniquePhone() },
  });

  test('alta de un restaurante con la cuenta de su dueño', async () => {
    const data = newRestaurant();
    const res = await adminApi('post', '/restaurants').send(data);
    expect(res.status).toBe(201);
    expect(res.body.temporary_password).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(res.body.restaurant).toMatchObject({ name: 'Panadería La Espiga', is_open: false, active: true, owner: { email: data.owner.email } });

    const owner = await login(data.owner.email, res.body.temporary_password);
    expect(owner.user.role).toBe('restaurant');
    const own = await api().get('/api/merchant/store').set(auth(owner.token));
    expect(own.body).toMatchObject({ id: res.body.restaurant.id, is_open: false });

    // Sin menú no puede abrir; con un producto disponible, sí
    const empty = await api().put('/api/merchant/store/open').set(auth(owner.token)).send({ is_open: true });
    expect(empty.status).toBe(409);
    expect(empty.body.code).toBe('MENU_EMPTY');
    await api().post('/api/merchant/products').set(auth(owner.token))
      .send({ section: 'Panes', name: 'Pan casero', price: 1500 }).expect(201);
    await api().put('/api/merchant/store/open').set(auth(owner.token)).send({ is_open: true }).expect(200);

    expect((await adminApi('post', '/restaurants').send({ ...data, owner: { ...data.owner, email: unique('otro') } })).status).toBe(409);
    expect((await adminApi('post', '/restaurants').send({ ...newRestaurant(), owner: data.owner })).status).toBe(409);
  });

  test('deshabilitar un restaurante lo saca del catálogo y no lo deja abrir', async () => {
    const data = newRestaurant();
    const { body } = await adminApi('post', '/restaurants').send(data);
    const { id } = body.restaurant;
    const owner = await login(data.owner.email, body.temporary_password);

    await api().post('/api/merchant/products').set(auth(owner.token))
      .send({ section: 'Panes', name: 'Pan casero', price: 1500 }).expect(201);
    await api().put('/api/merchant/store/open').set(auth(owner.token)).send({ is_open: true }).expect(200);
    expect((await api().get(`/api/restaurants/${id}`)).status).toBe(200);

    const disabled = await adminApi('post', `/restaurants/${id}/deactivate`);
    expect(disabled.body).toMatchObject({ active: false, is_open: false });
    expect((await api().get(`/api/restaurants/${id}`)).status).toBe(404);
    const reopen = await api().put('/api/merchant/store/open').set(auth(owner.token)).send({ is_open: true });
    expect(reopen.status).toBe(409);
    expect(reopen.body.code).toBe('RESTAURANT_DISABLED');

    await adminApi('post', `/restaurants/${id}/activate`).expect(200);
    const edited = await adminApi('put', `/restaurants/${id}`).send({ ...data, name: 'Panadería La Espiga Heredia' });
    expect(edited.body.name).toBe('Panadería La Espiga Heredia');
    expect((await adminApi('put', '/restaurants/999999').send(data)).status).toBe(404);
  });
});

test('clientes: busca y suspende', async () => {
  const client = await registerClient();
  const found = await adminApi('get', '/clients').query({ search: client.user.email });
  expect(found.body).toEqual([expect.objectContaining({ id: client.user.id, orders: 0, status: 'active' })]);
  expect((await adminApi('post', `/clients/${client.user.id}/suspend`)).body.status).toBe('suspended');
  expect((await adminApi('post', '/clients/999999/suspend')).status).toBe(404);
  await adminApi('post', `/clients/${client.user.id}/reactivate`).expect(200);
});
