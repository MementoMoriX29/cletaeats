const deliveryPersonRepo = require('../repositories/deliveryPersonRepository');
const complaintRepo      = require('../repositories/complaintRepository');
const orderRepo          = require('../repositories/orderRepository');
const { isValidCardNumber, toLast4 } = require('../utils/card');

const list        = () => deliveryPersonRepo.getAllWithStats();
const getRating   = (id) => deliveryPersonRepo.getRating(id);

const getById = async (id) => {
  const person = await deliveryPersonRepo.getById(id);
  if (!person) throw { status: 404, message: 'Repartidor no encontrado' };
  return person;
};

// offline   = el repartidor se desconectó por su cuenta (puede volver a conectarse)
// suspended = suspensión por el admin o por 4 amonestaciones (solo el admin la levanta)
const STATUS_MAP = {
  disponible: 'available',
  ocupado:    'busy',
  inactivo:   'offline',
  suspendido: 'suspended',
};

const updateStatus = async (id, status, user) => {
  const mapped = STATUS_MAP[status] ?? status;
  const person = await getById(id);

  if (user.rol === 'repartidor') {
    if (!['available', 'offline'].includes(mapped))
      throw { status: 400, message: 'Estado inválido. Use: disponible | inactivo' };
    if (person.status === 'suspended')
      throw { status: 403, message: 'Tu cuenta está suspendida. Contactá al administrador.' };
    if (person.status === 'busy')
      throw { status: 409, message: 'Tenés un pedido activo: terminalo antes de cambiar tu estado.' };
  } else if (!['available', 'busy', 'offline', 'suspended'].includes(mapped)) {
    throw { status: 400, message: 'Estado inválido. Use: disponible | ocupado | inactivo | suspendido' };
  }

  await deliveryPersonRepo.updateStatus(id, mapped);
  return deliveryPersonRepo.getById(id);
};

// La tarjeta es opcional al actualizar: si no viene, se conserva la actual.
const updateProfile = async (id, data) => {
  const current = await getById(id);

  const cardNumber = data.card_number ?? data.tarjeta;
  if (cardNumber !== undefined && cardNumber !== '' && !isValidCardNumber(String(cardNumber)))
    throw { status: 400, message: 'card_number inválido' };

  const email = data.email ?? current.email;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw { status: 400, message: 'email inválido' };
  if (email !== current.email) {
    const owner = await deliveryPersonRepo.getByEmail(email);
    if (owner && owner.id !== id) throw { status: 409, message: 'email ya registrado' };
  }

  await deliveryPersonRepo.update(id, {
    name:       data.name    ?? data.nombre    ?? current.name,
    email,
    address:    data.address ?? data.direccion ?? current.address,
    phone:      data.phone   ?? data.telefono  ?? current.phone,
    card_last4: cardNumber ? toLast4(String(cardNumber)) : current.card_last4,
  });
  return deliveryPersonRepo.getById(id);
};

const addAdminWarning = async (id) => {
  await getById(id);
  await deliveryPersonRepo.incrementWarning(id);
  const person = await deliveryPersonRepo.getById(id);
  return { message: `Amonestación registrada. Total: ${person.warnings_count}/4`, person };
};

const isRating = (value) => Number.isInteger(value) && value >= 1 && value <= 5;

// Un cliente solo puede quejarse de un repartidor que le haya entregado (o esté entregando) un pedido.
const createComplaint = async (deliveryPersonId, clientId, motivo, ratings = {}) => {
  await getById(deliveryPersonId);

  const orders = await orderRepo.getByClient(clientId);
  if (!orders.some((order) => order.delivery_person_id === deliveryPersonId))
    throw { status: 403, message: 'Solo podés reportar a repartidores que te hayan atendido' };

  const friendliness  = ratings.friendliness  ?? 3;
  const response_time = ratings.response_time ?? 3;
  const presentation  = ratings.presentation  ?? 3;
  if (![friendliness, response_time, presentation].every(isRating))
    throw { status: 400, message: 'Las calificaciones deben ser enteros entre 1 y 5' };

  await complaintRepo.create({
    delivery_person_id: deliveryPersonId,
    client_id:    clientId,
    order_id:     null,
    description:  String(motivo).slice(0, 1000),
    friendliness,
    response_time,
    presentation,
    adds_warning:  false,
  });

  return { message: 'Queja registrada correctamente' };
};

const getComplaints = async (id) => {
  await getById(id);
  return complaintRepo.getByDeliveryPerson(id);
};

module.exports = { list, getRating, getById, updateStatus, updateProfile, createComplaint, addAdminWarning, getComplaints };
