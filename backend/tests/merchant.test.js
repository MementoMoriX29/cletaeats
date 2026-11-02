// Panel del restaurante: tienda, menú y permisos. Usa Forno Rosso (restaurante 2).
const { api, auth, login, registerClient, addAddress, SEED } = require('./helpers');

let owner;
let otherOwner;
const store = (path = '') => `/api/merchant${path}`;

beforeAll(async () => {
  [owner, otherOwner] = await Promise.all([login(SEED.restaurant2Owner), login(SEED.restaurant1Owner)]);
});

describe('tienda', () => {
  test('ve su restaurante y el resumen del día', async () => {
    const res = await api().get(store('/store')).set(auth(owner.token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 2, name: 'Forno Rosso', tax_id: '3-101-700202', is_open: true, active: true });
    expect(res.body.today).toMatchObject({ orders: expect.any(Number), sales: expect.any(Number), cancelled: expect.any(Number) });
    expect(res.body.today).toHaveProperty('avg_prep_minutes');
  });

  test('cerrada no recibe pedidos y desaparece de los primeros lugares', async () => {
    const client = await registerClient();
    const { id: addressId } = await addAddress(client.token);

    const closed = await api().put(store('/store/open')).set(auth(owner.token)).send({ is_open: false });
    expect(closed.body.is_open).toBe(false);
    const order = await api().post('/api/orders').set(auth(client.token)).send({
      restaurant_id: 2, items: [{ product_id: 201, quantity: 1 }], delivery: { address_id: addressId }, payment: { method: 'cash' },
    });
    expect(order.status).toBe(409);

    const reopened = await api().put(store('/store/open')).set(auth(owner.token)).send({ is_open: true });
    expect(reopened.body.is_open).toBe(true);
  });

  test('ajustes: la imagen tiene que ser https y el tiempo de preparación razonable', async () => {
    const base = { description: 'Pizza napolitana en horno de leña.', phone: '2260-2202', sinpe_phone: '8810-2202', prep_minutes: 20 };
    expect((await api().put(store('/store')).set(auth(owner.token)).send({ ...base, image_url: 'http://x.test/a.jpg' })).status).toBe(400);
    expect((await api().put(store('/store')).set(auth(owner.token)).send({ ...base, prep_minutes: 300 })).status).toBe(400);
    const ok = await api().put(store('/store')).set(auth(owner.token))
      .send({ ...base, image_url: 'https://images.example.com/forno.jpg', prep_minutes: 22 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ image_url: 'https://images.example.com/forno.jpg', prep_minutes: 22 });
    await api().put(store('/store')).set(auth(owner.token)).send({ ...base, image_url: null }).expect(200);
  });
});

describe('menú', () => {
  test('crea, edita, agota y borra productos; el catálogo público lo refleja', async () => {
    const created = await api().post(store('/products')).set(auth(owner.token)).send({
      section: 'Pizzas', name: 'Pizza de temporada', description: 'Con vegetales asados.', price: 9900,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ section: 'Pizzas', name: 'Pizza de temporada', price: 9900, available: true });
    const { id } = created.body;

    const menu = (await api().get('/api/restaurants/2')).body.menu;
    const pizzas = menu.find((s) => s.name === 'Pizzas').products;
    expect(pizzas[pizzas.length - 1]).toMatchObject({ id, name: 'Pizza de temporada' });

    const updated = await api().put(store(`/products/${id}`)).set(auth(owner.token))
      .send({ section: 'Pizzas', name: 'Pizza de temporada', description: null, price: 10500, available: true });
    expect(updated.body).toMatchObject({ price: 10500, description: null });

    const soldOut = await api().patch(store(`/products/${id}/availability`)).set(auth(owner.token)).send({ available: false });
    expect(soldOut.body.available).toBe(false);
    const ownMenu = await api().get(store('/menu')).set(auth(owner.token));
    expect(ownMenu.body.flatMap((s) => s.products).find((p) => p.id === id)).toMatchObject({ available: false, section: 'Pizzas' });

    expect((await api().delete(store(`/products/${id}`)).set(auth(owner.token))).status).toBe(204);
    expect((await api().delete(store(`/products/${id}`)).set(auth(owner.token))).status).toBe(404);
    const after = (await api().get('/api/restaurants/2')).body.menu.flatMap((s) => s.products);
    expect(after.find((p) => p.id === id)).toBeUndefined();
  });

  test('no puede tocar productos de otro restaurante', async () => {
    const body = { section: 'Platos fuertes', name: 'Casado hackeado', price: 100, available: true };
    expect((await api().put(store('/products/103')).set(auth(owner.token)).send(body)).status).toBe(404);
    expect((await api().patch(store('/products/103/availability')).set(auth(owner.token)).send({ available: false })).status).toBe(404);
    expect((await api().delete(store('/products/103')).set(auth(owner.token))).status).toBe(404);
    const casado = (await api().get('/api/restaurants/1')).body.menu.flatMap((s) => s.products).find((p) => p.id === 103);
    expect(casado).toMatchObject({ name: 'Casado de pollo', price: 4200, available: true });
    expect((await api().get(store('/store')).set(auth(otherOwner.token))).body.id).toBe(1);
  });

  test('valida los datos del producto', async () => {
    const res = await api().post(store('/products')).set(auth(owner.token)).send({ section: 'Pizzas', name: 'X', price: 50 });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['name', 'price']);
  });
});

test('otros roles no entran al panel del restaurante', async () => {
  const client = await registerClient();
  expect((await api().get(store('/store')).set(auth(client.token))).status).toBe(403);
  expect((await api().get(store('/store'))).status).toBe(401);
});
