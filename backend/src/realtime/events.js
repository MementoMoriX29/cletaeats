// Avisos en tiempo real. Los servicios llaman a estas funciones después de cada cambio;
// el navegador recibe el aviso y vuelve a pedir los datos por la API (que aplica los permisos).
//
// Salas:
//   user:<id>          cada cuenta conectada
//   restaurant:<id>    el panel del restaurante
//   couriers           repartidores aprobados (para la lista de pedidos disponibles)
//   admins             soporte
//   order:<id>         quienes están mirando el seguimiento de un pedido (ubicación del repartidor)

let io = null;

const setServer = (server) => { io = server; };

const emit = (rooms, event, payload) => {
  if (!io) return;
  const targets = rooms.filter(Boolean);
  if (targets.length) io.to(targets).emit(event, payload);
};

// order: fila con id, status, client_id, restaurant_id, courier_id
const orderUpdated = (order, { offersChanged = false } = {}) => {
  emit([
    `user:${order.client_id}`,
    `restaurant:${order.restaurant_id}`,
    order.courier_id && `user:${order.courier_id}`,
    `order:${order.id}`,
    'admins',
  ], 'order:updated', { id: order.id, status: order.status });
  if (offersChanged) emit(['couriers'], 'offers:changed', {});
};

const orderCreated = (order) => {
  emit([`restaurant:${order.restaurant_id}`], 'order:created', { id: order.id });
  orderUpdated(order);
};

const courierLocation = (orderId, location) => emit([`order:${orderId}`], 'courier:location', location);

// Cierra los sockets de una cuenta (por ejemplo, al suspenderla).
const disconnectUser = (userId) => {
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
};

module.exports = { setServer, orderUpdated, orderCreated, courierLocation, disconnectUser };
