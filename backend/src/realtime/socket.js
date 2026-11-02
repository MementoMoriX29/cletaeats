// Socket.IO: avisos en tiempo real y ubicación del repartidor.
//
// Cliente → servidor
//   order:watch (orderId, ack)     empezar a seguir un pedido (mismas reglas de acceso que la API)
//   order:unwatch (orderId)
//   courier:location ({lat, lng})  el repartidor envía su ubicación cada pocos segundos
// Servidor → cliente
//   order:created, order:updated, offers:changed, courier:location
const { Server } = require('socket.io');
const events = require('./events');
const { authenticateToken } = require('../services/tokenService');
const orderService = require('../services/orderService');
const courierService = require('../services/courierService');
const restaurantDao = require('../dao/restaurantDao');
const { isAllowedOrigin } = require('../config/cors');
const { isValidCoordinate } = require('../utils/geo');

// Como mucho una ubicación cada 3 s por repartidor
const LOCATION_INTERVAL_MS = 3000;

const attachSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) },
  });

  // La misma verificación que la API: firma del token y estado actual de la cuenta.
  // Las salas se calculan acá, antes de aceptar la conexión, para no perder avisos de los primeros instantes.
  io.use(async (socket, next) => {
    try {
      const user = await authenticateToken(socket.handshake.auth?.token);
      const rooms = [`user:${user.id}`];
      if (user.role === 'admin') rooms.push('admins');
      if (user.role === 'courier' && user.status === 'active') rooms.push('couriers');
      if (user.role === 'restaurant') {
        const restaurant = await restaurantDao.getByOwner(user.id);
        if (restaurant) rooms.push(`restaurant:${restaurant.id}`);
      }
      socket.data.user = user;
      socket.data.rooms = rooms;
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });

  io.on('connection', (socket) => {
    const { user, rooms } = socket.data;
    socket.join(rooms);

    socket.on('order:watch', async (rawId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const order = await orderService.getOrder(user, Number(rawId));
        socket.join(`order:${order.id}`);
        reply({ ok: true, location: order.courier?.location ?? null });
      } catch {
        reply({ ok: false, error: 'Pedido no encontrado' });
      }
    });

    socket.on('order:unwatch', (rawId) => socket.leave(`order:${Number(rawId)}`));

    let lastLocationAt = 0;
    socket.on('courier:location', async (payload) => {
      if (user.role !== 'courier' || user.status !== 'active') return;
      const lat = Number(payload?.lat);
      const lng = Number(payload?.lng);
      if (!isValidCoordinate(lat, lng)) return;
      const now = Date.now();
      if (now - lastLocationAt < LOCATION_INTERVAL_MS) return;
      lastLocationAt = now;
      await courierService.updateLocation(user.id, lat, lng).catch((err) => console.error(err));
    });
  });

  events.setServer(io);
  return io;
};

module.exports = { attachSocket };
