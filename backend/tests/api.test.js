// Tests de integración contra MySQL real: autenticación, control de acceso y reglas de negocio.
// Los datos de prueba vienen de db/03_seed.sql:
//   clientes:     1 María, 2 Carlos         (contraseña Password123)
//   repartidores: 1 Andrés, 2 Laura         (contraseña Password123)
const http    = require('http');
const request = require('supertest');
const { io: ioClient } = require('socket.io-client');
const { app }          = require('../src/app');
const { attachSocket } = require('../src/socket/trackingSocket');
const db               = require('../src/config/db');
const { isCostaRicaHoliday } = require('../src/utils/holidays');

const api = request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const login = async (email, rol, password = 'Password123') => {
  const res = await api.post('/api/auth/login').send({ email, password, rol });
  expect(res.status).toBe(200);
  return res.body.token;
};

const tokens = {};
let orderId;

beforeAll(async () => {
  tokens.maria  = await login('maria.garcia@email.com', 'cliente');
  tokens.carlos = await login('carlos.rodriguez@email.com', 'cliente');
  tokens.andres = await login('andres.jimenez@email.com', 'repartidor');
  tokens.laura  = await login('laura.solis@email.com', 'repartidor');
  tokens.admin  = await login('admin@test.local', 'admin', 'Admin-Test-2026!');
});

afterAll(async () => {
  await db.end();
});

describe('Autenticación', () => {
  test('contraseña incorrecta y correo inexistente devuelven el mismo error', async () => {
    const wrong = await api.post('/api/auth/login')
      .send({ email: 'maria.garcia@email.com', password: 'otra-cosa', rol: 'cliente' });
    const unknown = await api.post('/api/auth/login')
      .send({ email: 'nadie@email.com', password: 'otra-cosa', rol: 'cliente' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
  });

  test('admin con contraseña incorrecta es rechazado', async () => {
    const res = await api.post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'Password123', rol: 'admin' });
    expect(res.status).toBe(401);
  });

  test('sin token o con token alterado no hay acceso', async () => {
    expect((await api.get('/api/clients/1')).status).toBe(401);
    expect((await api.get('/api/clients/1').set(auth(tokens.maria + 'x'))).status).toBe(401);
  });

  test('el registro guarda solo los últimos 4 dígitos de la tarjeta y no devuelve el hash', async () => {
    const res = await api.post('/api/auth/register-client').send({
      national_id: '505550555', name: 'Ana Prueba', address: 'Heredia centro',
      card_number: '4242424242424242', phone: '88885555',
      email: 'ana.prueba@email.com', password: 'ClaveSegura1',
    });
    expect(res.status).toBe(201);
    expect(res.body.client.card_last4).toBe('4242');
    expect(res.body.client).not.toHaveProperty('card_number');
    expect(res.body.client).not.toHaveProperty('password');

    const [rows] = await db.query('SELECT card_last4 FROM client WHERE email = ?', ['ana.prueba@email.com']);
    expect(rows[0].card_last4).toBe('4242');
  });

  test('contraseñas de menos de 8 caracteres se rechazan', async () => {
    const res = await api.post('/api/auth/register-client').send({
      national_id: '606660666', name: 'Corta', address: 'Heredia',
      card_number: '4242424242424242', phone: '88886666',
      email: 'corta@email.com', password: '1234567',
    });
    expect(res.status).toBe(400);
  });
});

describe('Pedidos', () => {
  test('el cliente crea un pedido y el servidor decide el recargo por feriado', async () => {
    const res = await api.post('/api/orders').set(auth(tokens.maria)).send({
      restaurante_id: 1,
      items: [{ combo_id: 1, cantidad: 2 }],
      distance_km: 3,
      direccion_entrega: 'Heredia, San Francisco',
      is_holiday: true, // se ignora
    });
    expect(res.status).toBe(201);
    orderId = res.body.id;
    expect(res.body.repartidor_id).toBe(1);
    expect(Number(res.body.transport_cost)).toBe(3 * (isCostaRicaHoliday() ? 1500 : 1000));
  });

  test('distancias fuera de rango se rechazan', async () => {
    const res = await api.post('/api/orders').set(auth(tokens.maria)).send({
      restaurante_id: 1, items: [{ combo_id: 1, cantidad: 1 }], distance_km: 500, direccion_entrega: 'Lejos',
    });
    expect(res.status).toBe(400);
  });

  test('solo el cliente dueño, el repartidor asignado y el admin pueden ver el pedido', async () => {
    for (const who of ['maria', 'andres', 'admin']) {
      expect((await api.get(`/api/orders/${orderId}`).set(auth(tokens[who]))).status).toBe(200);
      expect((await api.get(`/api/orders/${orderId}/invoice`).set(auth(tokens[who]))).status).toBe(200);
    }
    for (const who of ['carlos', 'laura']) {
      expect((await api.get(`/api/orders/${orderId}`).set(auth(tokens[who]))).status).toBe(404);
      expect((await api.get(`/api/orders/${orderId}/invoice`).set(auth(tokens[who]))).status).toBe(404);
      expect((await api.get(`/api/orders/${orderId}/location`).set(auth(tokens[who]))).status).toBe(404);
    }
  });

  test('el historial de un cliente solo lo ven él y el admin', async () => {
    expect((await api.get('/api/orders/client/1').set(auth(tokens.maria))).status).toBe(200);
    expect((await api.get('/api/orders/client/1').set(auth(tokens.admin))).status).toBe(200);
    expect((await api.get('/api/orders/client/1').set(auth(tokens.carlos))).status).toBe(403);
    expect((await api.get('/api/orders/client/1').set(auth(tokens.andres))).status).toBe(403);
  });

  test('un repartidor no asignado no puede cambiar el estado del pedido', async () => {
    const res = await api.put(`/api/orders/${orderId}/status`).set(auth(tokens.laura)).send({ estado: 'en_camino' });
    expect(res.status).toBe(403);
  });

  test('el repartidor asignado lo pone en camino', async () => {
    const res = await api.put(`/api/orders/${orderId}/status`).set(auth(tokens.andres)).send({ estado: 'en_camino' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('en_camino');
  });
});

describe('Seguimiento en tiempo real (Socket.IO)', () => {
  let server;
  let url;
  const sockets = [];

  const connect = (token) => {
    const socket = ioClient(url, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    return socket;
  };
  const once = (socket, event, ms = 1500) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });

  beforeAll((done) => {
    server = http.createServer(app);
    attachSocket(server);
    server.listen(0, () => {
      url = `http://localhost:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    sockets.forEach((s) => s.close());
    server.close(done);
  });

  test('sin token la conexión se rechaza', async () => {
    const error = await once(connect(undefined), 'connect_error');
    expect(error?.message).toBe('No autorizado');
  });

  test('un cliente no puede suscribirse al pedido de otro', async () => {
    const carlos = connect(tokens.carlos);
    await once(carlos, 'connect');
    const answer = once(carlos, 'tracking_error');
    carlos.emit('join_order', orderId);
    expect(await answer).toEqual({ orderId, error: 'Pedido no encontrado' });
  });

  test('el cliente recibe la ubicación del repartidor asignado, pero no la de otro repartidor', async () => {
    const maria  = connect(tokens.maria);
    const andres = connect(tokens.andres);
    const laura  = connect(tokens.laura);
    await Promise.all([once(maria, 'connect'), once(andres, 'connect'), once(laura, 'connect')]);

    maria.emit('join_order', orderId);
    await new Promise((r) => setTimeout(r, 200));

    // Laura no está asignada: su ubicación falsa se ignora
    const fake = once(maria, 'repartidor_location', 600);
    laura.emit('location_update', { orderId, lat: 9.9, lng: -84.1 });
    expect(await fake).toBeNull();

    const real = once(maria, 'repartidor_location');
    andres.emit('location_update', { orderId, lat: 9.998, lng: -84.117 });
    expect(await real).toEqual({ orderId, lat: 9.998, lng: -84.117 });
  });
});

describe('Cierre del pedido y calificación', () => {
  test('al entregar, el repartidor queda libre y el pedido ya no se puede modificar', async () => {
    const delivered = await api.put(`/api/orders/${orderId}/status`).set(auth(tokens.andres)).send({ estado: 'entregado' });
    expect(delivered.status).toBe(200);

    const [rows] = await db.query('SELECT status FROM delivery_person WHERE id = 1');
    expect(rows[0].status).toBe('available');

    const again = await api.put(`/api/orders/${orderId}/status`).set(auth(tokens.andres)).send({ estado: 'en_camino' });
    expect(again.status).toBe(409);
  });

  test('otro cliente no puede calificar el pedido', async () => {
    const res = await api.post(`/api/orders/${orderId}/rating`).set(auth(tokens.carlos)).send({ amabilidad: 1, tiempo: 1, presentacion: 1 });
    expect(res.status).toBe(403);
  });

  test('calificaciones fuera de rango se rechazan', async () => {
    const res = await api.post(`/api/orders/${orderId}/rating`).set(auth(tokens.maria)).send({ amabilidad: 9, tiempo: 1, presentacion: 1 });
    expect(res.status).toBe(400);
  });

  test('la calificación va al repartidor que entregó (aunque se envíe otro) y solo una vez', async () => {
    const first = await api.post(`/api/orders/${orderId}/rating`).set(auth(tokens.maria))
      .send({ amabilidad: 5, tiempo: 4, presentacion: 5, delivery_person_id: 2 });
    expect(first.status).toBe(201);

    const [rows] = await db.query('SELECT delivery_person_id FROM complaint WHERE order_id = ?', [orderId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].delivery_person_id).toBe(1);

    const second = await api.post(`/api/orders/${orderId}/rating`).set(auth(tokens.maria)).send({ amabilidad: 1, tiempo: 1, presentacion: 1 });
    expect(second.status).toBe(409);
  });

  test('solo se puede reportar a un repartidor que te atendió', async () => {
    expect((await api.post('/api/delivery-persons/1/complaints').set(auth(tokens.carlos)).send({ motivo: 'x' })).status).toBe(403);
    expect((await api.post('/api/delivery-persons/1/complaints').set(auth(tokens.maria)).send({ motivo: 'Llegó tarde' })).status).toBe(201);
  });
});

describe('Perfiles', () => {
  test('un repartidor no puede ver ni editar clientes', async () => {
    expect((await api.get('/api/clients/1').set(auth(tokens.andres))).status).toBe(403);
    expect((await api.put('/api/clients/1').set(auth(tokens.andres)).send({ nombre: 'Hackeado' })).status).toBe(403);
    expect((await api.get('/api/clients/1').set(auth(tokens.carlos))).status).toBe(403);
  });

  test('el cliente ve su perfil con la tarjeta enmascarada', async () => {
    const res = await api.get('/api/clients/1').set(auth(tokens.maria));
    expect(res.status).toBe(200);
    expect(res.body.card_last4).toBe('1111');
    expect(res.body).not.toHaveProperty('card_number');
  });

  test('actualizar sin tarjeta conserva la actual; una tarjeta inválida se rechaza', async () => {
    const keep = await api.put('/api/clients/1').set(auth(tokens.maria)).send({ nombre: 'María G.', tarjeta: '' });
    expect(keep.status).toBe(200);
    expect(keep.body.nombre).toBe('María G.');
    expect(keep.body.card_last4).toBe('1111');

    const bad = await api.put('/api/clients/1').set(auth(tokens.maria)).send({ tarjeta: '123' });
    expect(bad.status).toBe(400);
  });

  test('no se puede usar el correo de otro cliente', async () => {
    const res = await api.put('/api/clients/1').set(auth(tokens.maria)).send({ email: 'carlos.rodriguez@email.com' });
    expect(res.status).toBe(409);
  });

  test('el listado de repartidores del admin no incluye hashes de contraseña', async () => {
    const res = await api.get('/api/delivery-persons').set(auth(tokens.admin));
    expect(res.status).toBe(200);
    res.body.forEach((person) => expect(person).not.toHaveProperty('password'));
  });
});

describe('Estados del repartidor', () => {
  test('un repartidor no puede suspenderse ni cambiar el estado de otro', async () => {
    expect((await api.put('/api/delivery-persons/1/status').set(auth(tokens.andres)).send({ estado: 'suspendido' })).status).toBe(400);
    expect((await api.put('/api/delivery-persons/2/status').set(auth(tokens.andres)).send({ estado: 'inactivo' })).status).toBe(403);
  });

  test('desconectarse (inactivo) no bloquea el inicio de sesión', async () => {
    expect((await api.put('/api/delivery-persons/1/status').set(auth(tokens.andres)).send({ estado: 'inactivo' })).status).toBe(200);
    await login('andres.jimenez@email.com', 'repartidor');
    expect((await api.put('/api/delivery-persons/1/status').set(auth(tokens.andres)).send({ estado: 'disponible' })).status).toBe(200);
  });

  test('un repartidor suspendido por el admin no puede reactivarse ni iniciar sesión', async () => {
    expect((await api.put('/api/delivery-persons/2/status').set(auth(tokens.admin)).send({ estado: 'suspendido' })).status).toBe(200);
    expect((await api.put('/api/delivery-persons/2/status').set(auth(tokens.laura)).send({ estado: 'disponible' })).status).toBe(403);

    const res = await api.post('/api/auth/login').send({ email: 'laura.solis@email.com', password: 'Password123', rol: 'repartidor' });
    expect(res.status).toBe(403);
  });
});

describe('Errores', () => {
  test('JSON mal formado devuelve 400 sin detalles internos', async () => {
    const res = await api.post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'JSON inválido' });
  });

  test('ruta inexistente devuelve 404', async () => {
    expect((await api.get('/api/no-existe')).status).toBe(404);
  });

  test('health check verifica la base de datos', async () => {
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
