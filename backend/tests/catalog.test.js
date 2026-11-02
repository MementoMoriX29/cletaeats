// Catálogo público de restaurantes.
const { api, PLACES } = require('./helpers');

describe('catálogo', () => {
  test('se ve sin iniciar sesión, con los abiertos primero', async () => {
    const res = await api().get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(8);
    const firstClosed = res.body.findIndex((r) => !r.is_open);
    expect(res.body.slice(firstClosed).every((r) => !r.is_open)).toBe(true);
    // Datos internos del restaurante no se publican
    expect(res.body[0]).not.toHaveProperty('tax_id');
    expect(res.body[0]).not.toHaveProperty('sinpe_phone');
    expect(res.body[0].rating).toEqual({ average: expect.any(Number), count: expect.any(Number) });
  });

  test('con una ubicación agrega el costo de envío y el tiempo estimado', async () => {
    const res = await api().get('/api/restaurants').query(PLACES.mercedesNorte);
    const casona = res.body.find((r) => r.id === 1);
    expect(casona.delivery).toEqual({ distance_km: 1.3, in_range: true, delivery_fee: expect.any(Number), eta_min: 26, eta_max: 36 });
  });

  test('busca por nombre de plato', async () => {
    const res = await api().get('/api/restaurants').query({ search: 'ramen' });
    expect(res.body.map((r) => r.name)).toEqual(['Sakura Sushi Bar']);
  });

  test('los comodines de SQL se buscan como texto', async () => {
    expect((await api().get('/api/restaurants').query({ search: '%' })).body).toEqual([]);
    expect((await api().get('/api/restaurants').query({ search: '_' })).body).toEqual([]);
  });

  test('filtra por categoría', async () => {
    const res = await api().get('/api/restaurants').query({ category: 'Pizza' });
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r) => r.category === 'Pizza')).toBe(true);
    const categories = await api().get('/api/restaurants/categories');
    expect(categories.body.map((c) => c.category)).toContain('Comida típica');
  });

  test('la ficha trae el menú por secciones, incluidos los productos agotados', async () => {
    const res = await api().get('/api/restaurants/5');
    expect(res.status).toBe(200);
    expect(res.body.menu.map((s) => s.name)).toEqual(['Café', 'Desayunos', 'Repostería']);
    const pastry = res.body.menu.find((s) => s.name === 'Repostería').products;
    expect(pastry.find((p) => p.name === 'Empanada de chiverre')).toMatchObject({ available: false, price: 1100 });
  });

  test('id inválido o inexistente responde 404', async () => {
    expect((await api().get('/api/restaurants/abc')).status).toBe(404);
    expect((await api().get('/api/restaurants/99999')).status).toBe(404);
  });
});
