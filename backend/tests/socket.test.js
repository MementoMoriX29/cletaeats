// Tiempo real: autenticación del socket, avisos de pedidos y ubicación del repartidor.
const http = require('node:http');
const { io: connect } = require('socket.io-client');
const { app } = require('../src/app');
const { attachSocket } = require('../src/realtime/socket');
const {
  api, auth, login, registerClient, createAdmin, createCourier, addAddress, placeOrder, SEED,
} = require('./helpers');

let ioServer;
let url;
const sockets = [];

beforeAll((done) => {
  const server = http.createServer(app);
  ioServer = attachSocket(server);
  server.listen(0, () => {
    url = `http://localhost:${server.address().port}`;
    done();
  });
});

afterAll(() => {
  sockets.forEach((s) => s.disconnect());
  ioServer.close();
});

const connectAs = (token) => new Promise((resolve, reject) => {
  const socket = connect(url, { auth: { token }, transports: ['websocket'], reconnection: false });
  sockets.push(socket);
  socket.on('connect', () => resolve(socket));
  socket.on('connect_error', (err) => reject(err));
});

const nextEvent = (socket, event, predicate = () => true) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`No llegó ${event}`)), 5000);
  const handler = (payload) => {
    if (!predicate(payload)) return;
    clearTimeout(timer);
    socket.off(event, handler);
    resolve(payload);
  };
  socket.on(event, handler);
});

const watch = (socket, orderId) => new Promise((resolve) => socket.emit('order:watch', orderId, resolve));

test('sin una sesión válida no se conecta', async () => {
  await expect(connectAs(undefined)).rejects.toThrow('No autorizado');
  await expect(connectAs('token-falso')).rejects.toThrow('No autorizado');
});

test('pedido en vivo: el restaurante recibe el pedido, el cliente ve los cambios y al repartidor en el mapa', async () => {
  const [client, stranger, owner, admin] = await Promise.all([
    registerClient(), registerClient(), login(SEED.restaurant1Owner), createAdmin(),
  ]);
  const courier = await createCourier(admin.token);
  const { id: addressId } = await addAddress(client.token);

  const kitchenSocket = await connectAs(owner.token);
  const clientSocket = await connectAs(client.token);
  const courierSocket = await connectAs(courier.token);
  const strangerSocket = await connectAs(stranger.token);

  const created = nextEvent(kitchenSocket, 'order:created');
  const order = await placeOrder(client.token, { addressId });
  expect(await created).toEqual({ id: order.id });

  expect(await watch(clientSocket, order.id)).toEqual({ ok: true, location: null });
  expect(await watch(strangerSocket, order.id)).toEqual({ ok: false, error: 'Pedido no encontrado' });

  const offersChanged = nextEvent(courierSocket, 'offers:changed');
  const accepted = nextEvent(clientSocket, 'order:updated', (p) => p.status === 'accepted');
  await api().post(`/api/orders/${order.id}/accept`).set(auth(owner.token)).send({}).expect(200);
  expect(await accepted).toEqual({ id: order.id, status: 'accepted' });
  await offersChanged;

  await api().post(`/api/orders/${order.id}/claim`).set(auth(courier.token)).expect(200);

  const moved = nextEvent(clientSocket, 'courier:location');
  courierSocket.emit('courier:location', { lat: 10.0012, lng: -84.1188 });
  expect(await moved).toEqual({ order_id: order.id, lat: 10.0012, lng: -84.1188, at: expect.any(String) });

  // La última ubicación queda guardada para quien abra el seguimiento después
  const seen = await api().get(`/api/orders/${order.id}`).set(auth(client.token));
  expect(seen.body.courier.location).toMatchObject({ lat: 10.0012, lng: -84.1188 });
  expect(await watch(clientSocket, order.id)).toMatchObject({ ok: true, location: { lat: 10.0012, lng: -84.1188 } });

  const delivered = nextEvent(clientSocket, 'order:updated', (p) => p.status === 'delivered');
  await api().post(`/api/orders/${order.id}/pickup`).set(auth(courier.token)).expect(200);
  await api().post(`/api/orders/${order.id}/deliver`).set(auth(courier.token)).expect(200);
  await delivered;
});

test('al suspender una cuenta se cierran sus sockets', async () => {
  const [client, admin] = await Promise.all([registerClient(), createAdmin()]);
  const socket = await connectAs(client.token);
  const closed = new Promise((resolve) => socket.on('disconnect', resolve));
  await api().post(`/api/admin/clients/${client.user.id}/suspend`).set(auth(admin.token)).expect(200);
  expect(await closed).toBe('io server disconnect');
});
