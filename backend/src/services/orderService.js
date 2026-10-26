const orderRepo          = require('../repositories/orderRepository');
const clientRepo         = require('../repositories/clientRepository');
const restaurantRepo     = require('../repositories/restaurantRepository');
const deliveryPersonRepo = require('../repositories/deliveryPersonRepository');
const complaintRepo      = require('../repositories/complaintRepository');
const Order   = require('../models/Order');
const Invoice = require('../models/Invoice');
const { isCostaRicaHoliday } = require('../utils/holidays');

const MAX_DISTANCE_KM = 50;

// Quién puede ver un pedido: el cliente que lo hizo, el repartidor asignado o el admin.
const canViewOrder = (order, user) =>
  user.rol === 'admin' ||
  (user.rol === 'cliente'    && order.client_id          === user.id) ||
  (user.rol === 'repartidor' && order.delivery_person_id === user.id);

const getOrderFor = async (id, user) => {
  const order = await orderRepo.getById(id);
  // Mismo 404 si no existe o si no es suyo: no revela qué IDs existen
  if (!order || !canViewOrder(order, user)) throw { status: 404, message: 'Pedido no encontrado' };
  return order;
};

// ── Field mappers ─────────────────────────────────────────────────────────────

const STATUS_TO_ES = { preparing: 'pendiente', in_transit: 'en_camino', delivered: 'entregado', suspended: 'cancelado' };
const STATUS_TO_EN = { pendiente: 'preparing', confirmado: 'preparing', en_camino: 'in_transit', entregado: 'delivered', cancelado: 'suspended', preparando: 'preparing' };

const mapItem = (item) => ({
  combo_id:        item.combo_id,
  cantidad:        item.quantity,
  precio_unitario: item.price,
  nombre:          item.description,
  combo_number:    item.combo_number,
  image_url:       item.image_url ?? null,
});

const mapOrder = (order, items, invoice) => {
  const inv = (invoice && typeof invoice === 'object' && 'subtotal' in invoice) ? invoice : null;
  const result = {
    id:                order.id,
    cliente_id:        order.client_id,
    restaurante_id:    order.restaurant_id,
    repartidor_id:     order.delivery_person_id ?? null,
    estado:            STATUS_TO_ES[order.status] ?? order.status,
    total:             inv ? inv.total : (invoice ?? null),
    subtotal:          inv?.subtotal ?? null,
    transport_cost:    inv?.transport_cost ?? null,
    iva:               inv?.iva ?? null,
    direccion_entrega: order.delivery_address ?? null,
    notas:             order.notes ?? null,
    fecha_pedido:      order.placed_at,
    fecha_entrega:     order.delivered_at ?? null,
    restaurante_nombre:   order.restaurant_name ?? null,
    restaurante_direccion: order.restaurant_address ?? null,
    restaurante_lat:      order.restaurant_latitude  != null ? Number(order.restaurant_latitude)  : null,
    restaurante_lng:      order.restaurant_longitude != null ? Number(order.restaurant_longitude) : null,
    repartidor_nombre:    order.delivery_person_name ?? null,
    cliente_nombre:       order.client_name ?? null,
    distance_km:       order.distance_km,
    is_holiday:        order.is_holiday,
  };
  if (items !== undefined) result.items = items.map(mapItem);
  return result;
};

// ── Service functions ─────────────────────────────────────────────────────────

const create = async (rawData) => {
  const data = {
    ...rawData,
    restaurant_id:    Number(rawData.restaurant_id ?? rawData.restaurante_id),
    distance_km:      Number(rawData.distance_km),
    // El recargo por feriado lo decide el servidor, no el cliente
    is_holiday:       isCostaRicaHoliday(),
    delivery_address: rawData.delivery_address ?? rawData.direccion_entrega ?? null,
    notes:            rawData.notes ?? rawData.notas ?? null,
  };

  const model = new Order(data);
  const errors = model.validate();
  if (errors.length) throw { status: 400, message: errors.join(', ') };
  if (data.distance_km > MAX_DISTANCE_KM)
    throw { status: 400, message: `distance_km no puede superar ${MAX_DISTANCE_KM} km` };

  const client = await clientRepo.getById(data.client_id);
  if (!client) throw { status: 404, message: 'Cliente no encontrado' };
  if (client.status === 'suspended')
    throw { status: 403, message: 'Cliente suspendido: no puede realizar pedidos' };

  const restaurant = await restaurantRepo.getById(data.restaurant_id);
  if (!restaurant) throw { status: 404, message: 'Restaurante no encontrado' };
  if (!restaurant.active) throw { status: 400, message: 'El restaurante no está recibiendo pedidos' };

  let subtotal = 0;
  const validatedItems = [];
  for (const item of data.items) {
    const combo = await restaurantRepo.getComboById(Number(item.combo_id));
    if (!combo) throw { status: 404, message: `Combo ${item.combo_id} no encontrado` };
    if (combo.restaurant_id !== data.restaurant_id)
      throw { status: 400, message: `Combo ${item.combo_id} no pertenece al restaurante indicado` };
    if (!combo.available)
      throw { status: 400, message: `Combo ${item.combo_id} no está disponible` };
    const qty = parseInt(item.quantity ?? item.cantidad, 10);
    if (!qty || qty < 1) throw { status: 400, message: 'cantidad debe ser >= 1' };
    subtotal += combo.price * qty;
    validatedItems.push({ combo_id: combo.id, quantity: qty });
  }

  const deliveryPerson = await deliveryPersonRepo.getAvailable();
  if (!deliveryPerson)
    throw { status: 503, message: 'No hay repartidores disponibles en este momento' };

  const orderId = await orderRepo.create({
    client_id:          data.client_id,
    restaurant_id:      data.restaurant_id,
    delivery_person_id: deliveryPerson.id,
    distance_km:        data.distance_km,
    is_holiday:         data.is_holiday,
    delivery_address:   data.delivery_address,
    notes:              data.notes,
  });

  for (const item of validatedItems)
    await orderRepo.addItem(orderId, item.combo_id, item.quantity);

  await deliveryPersonRepo.updateStatus(deliveryPerson.id, 'busy');
  await deliveryPersonRepo.updateDailyKm(deliveryPerson.id, data.distance_km);

  const transport_cost = Invoice.calcTransportCost(data.distance_km, data.is_holiday);
  const invoice = new Invoice({ order_id: orderId, subtotal, transport_cost });
  await orderRepo.createInvoice({ order_id: orderId, subtotal, transport_cost, iva: invoice.iva, total: invoice.total });

  const order = await orderRepo.getById(orderId);
  const items = await orderRepo.getItems(orderId);
  return mapOrder(order, items, invoice);
};

const getById = async (id, user) => {
  const order = await getOrderFor(id, user);
  const items   = await orderRepo.getItems(id);
  const invoice = await orderRepo.getInvoice(id);
  const result  = mapOrder(order, items, invoice ?? null);
  result.calificado = (await complaintRepo.getByOrder(id)).length > 0;
  return result;
};

const getByClient = async (clientId) => {
  const orders = await orderRepo.getByClient(clientId);
  return Promise.all(orders.map(async (order) => {
    const invoice = await orderRepo.getInvoice(order.id);
    return mapOrder(order, undefined, invoice ?? null);
  }));
};

const updateStatus = async (id, status, user) => {
  const mapped = STATUS_TO_EN[status] ?? status;
  const valid = ['preparing', 'in_transit', 'suspended', 'delivered'];
  if (!valid.includes(mapped))
    throw { status: 400, message: `Estado inválido. Use: pendiente | en_camino | entregado | cancelado` };

  const order = await orderRepo.getById(id);
  if (!order) throw { status: 404, message: 'Pedido no encontrado' };

  if (user.rol === 'repartidor' && order.delivery_person_id !== user.id)
    throw { status: 403, message: 'Solo podés actualizar tu pedido asignado' };
  if (['delivered', 'suspended'].includes(order.status))
    throw { status: 409, message: 'El pedido ya fue cerrado y no se puede modificar' };

  await orderRepo.updateStatus(id, mapped);

  // Al entregar o cancelar, el repartidor queda libre para otro pedido
  if (['delivered', 'suspended'].includes(mapped) && order.delivery_person_id)
    await deliveryPersonRepo.updateStatus(order.delivery_person_id, 'available');

  const updatedOrder = await orderRepo.getById(id);
  const invoice = await orderRepo.getInvoice(id);
  return mapOrder(updatedOrder, undefined, invoice ?? null);
};

const getInvoice = async (orderId, user) => {
  await getOrderFor(orderId, user);
  const invoice = await orderRepo.getInvoice(orderId);
  if (!invoice) throw { status: 404, message: 'Factura no encontrada' };
  return invoice;
};

const rateDelivery = async (orderId, clientId, data) => {
  const order = await orderRepo.getById(orderId);
  if (!order) throw { status: 404, message: 'Pedido no encontrado' };
  if (order.client_id !== clientId)
    throw { status: 403, message: 'Solo podés calificar tus propios pedidos' };
  if (order.status !== 'delivered')
    throw { status: 400, message: 'Solo podés calificar pedidos entregados' };

  // Siempre se califica al repartidor que hizo la entrega (el cliente no lo elige)
  const deliveryPersonId = order.delivery_person_id;
  if (!deliveryPersonId) throw { status: 400, message: 'El pedido no tiene repartidor asignado' };

  // Una sola calificación por pedido: evita acumular amonestaciones repitiendo la calificación
  if ((await complaintRepo.getByOrder(orderId)).length)
    throw { status: 409, message: 'Este pedido ya fue calificado' };

  const friendliness  = Number(data.amabilidad   ?? data.friendliness  ?? 5);
  const response_time = Number(data.tiempo       ?? data.response_time ?? 5);
  const presentation  = Number(data.presentacion ?? data.presentation  ?? 5);
  const isRating = (value) => Number.isInteger(value) && value >= 1 && value <= 5;
  if (![friendliness, response_time, presentation].every(isRating))
    throw { status: 400, message: 'Las calificaciones deben ser enteros entre 1 y 5' };

  const description   = String(data.description ?? data.descripcion ?? 'Calificación del cliente').slice(0, 1000);
  const avg = (friendliness + response_time + presentation) / 3;
  const adds_warning  = avg < 2;

  await complaintRepo.create({ delivery_person_id: deliveryPersonId, client_id: clientId, order_id: orderId, description, friendliness, response_time, presentation, adds_warning });

  if (adds_warning) {
    await deliveryPersonRepo.incrementWarning(deliveryPersonId);
  }

  return { message: 'Calificación registrada' };
};

const getDeliveriesByPerson = async (deliveryPersonId) => {
  const orders = await orderRepo.getDeliveriesByPerson(deliveryPersonId);
  return Promise.all(orders.map(async (order) => {
    const invoice = await orderRepo.getInvoice(order.id);
    return mapOrder(order, undefined, invoice ?? null);
  }));
};

const getActiveOrderByDeliveryPerson = async (deliveryPersonId) => {
  const order = await orderRepo.getActiveOrderByDeliveryPerson(deliveryPersonId);
  if (!order) return null;
  const items   = await orderRepo.getItems(order.id);
  const invoice = await orderRepo.getInvoice(order.id);
  return mapOrder(order, items, invoice ?? null);
};

module.exports = { create, getById, getByClient, updateStatus, getInvoice, rateDelivery, getDeliveriesByPerson, getActiveOrderByDeliveryPerson };
