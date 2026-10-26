const { Server } = require('socket.io');
const { verifyJwt }       = require('../middleware/authMiddleware');
const { isAllowedOrigin } = require('../config/cors');
const orderRepo           = require('../repositories/orderRepository');

// orderId (string) -> { orderId, lat, lng, updatedAt }
const lastKnownLocations = new Map();

// Las ubicaciones viejas se descartan para no acumular memoria
const LOCATION_TTL_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
  const limit = Date.now() - LOCATION_TTL_MS;
  for (const [orderId, loc] of lastKnownLocations) {
    if (loc.updatedAt < limit) lastKnownLocations.delete(orderId);
  }
}, 10 * 60 * 1000).unref();

const isCoordinate = (value, max) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max;

// Mismas reglas que la API REST: cliente dueño, repartidor asignado o admin
const canViewOrder = (order, user) =>
  user.rol === 'admin' ||
  (user.rol === 'cliente'    && order.client_id          === user.id) ||
  (user.rol === 'repartidor' && order.delivery_person_id === user.id);

function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Autenticación: el cliente envía el JWT en io(url, { auth: { token } })
  io.use((socket, next) => {
    try {
      socket.data.user = verifyJwt(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    // Cliente, repartidor o admin se suscriben a un pedido que puedan ver
    socket.on('join_order', async (orderId) => {
      try {
        const id = Number(orderId);
        const order = Number.isInteger(id) ? await orderRepo.getById(id) : null;
        if (!order || !canViewOrder(order, user)) {
          socket.emit('tracking_error', { orderId, error: 'Pedido no encontrado' });
          return;
        }
        socket.join(`order_${id}`);

        // Envía la última posición conocida si el repartidor ya empezó a moverse
        const last = lastKnownLocations.get(String(id));
        if (last) socket.emit('repartidor_location', { orderId: last.orderId, lat: last.lat, lng: last.lng });
      } catch (err) {
        console.error(err);
      }
    });

    // Solo el repartidor asignado puede publicar la ubicación de su pedido
    socket.on('location_update', async ({ orderId, lat, lng } = {}) => {
      try {
        if (user.rol !== 'repartidor') return;
        if (!isCoordinate(lat, 90) || !isCoordinate(lng, 180) || (lat === 0 && lng === 0)) return;

        const id = Number(orderId);
        const order = Number.isInteger(id) ? await orderRepo.getById(id) : null;
        if (!order || order.delivery_person_id !== user.id || order.status !== 'in_transit') return;

        const payload = { orderId: id, lat, lng };
        lastKnownLocations.set(String(id), { ...payload, updatedAt: Date.now() });
        io.to(`order_${id}`).emit('repartidor_location', payload);
      } catch (err) {
        console.error(err);
      }
    });
  });

  return io;
}

module.exports = { attachSocket, lastKnownLocations };
