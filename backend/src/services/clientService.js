const clientRepo = require('../repositories/clientRepository');
const { isValidCardNumber, toLast4 } = require('../utils/card');

const STATUS_TO_ES = { active: 'activo', suspended: 'suspendido' };

const mapClient = (client) => ({
  id:             client.id,
  national_id:    client.national_id,
  nombre:         client.name,
  email:          client.email,
  telefono:       client.phone,
  direccion:      client.address,
  card_last4:     client.card_last4,
  estado:         STATUS_TO_ES[client.status] ?? client.status,
  fecha_registro: client.created_at,
});

const list = async () => {
  const clients = await clientRepo.getAll();
  return clients.map(mapClient);
};

const getRaw = async (id) => {
  const client = await clientRepo.getById(id);
  if (!client) throw { status: 404, message: 'Cliente no encontrado' };
  return client;
};

const getById = async (id) => mapClient(await getRaw(id));

// La tarjeta es opcional al actualizar: si no viene, se conserva la actual.
// Si viene, se valida el número completo y solo se guardan los últimos 4 dígitos.
const update = async (id, data) => {
  const current = await getRaw(id);

  const cardNumber = data.tarjeta ?? data.card_number;
  if (cardNumber !== undefined && cardNumber !== '' && !isValidCardNumber(String(cardNumber)))
    throw { status: 400, message: 'card_number inválido' };

  const email = data.email ?? current.email;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw { status: 400, message: 'email inválido' };
  if (email !== current.email) {
    const owner = await clientRepo.getByEmail(email);
    if (owner && owner.id !== id) throw { status: 409, message: 'email ya registrado' };
  }

  await clientRepo.update(id, {
    name:       data.nombre    ?? data.name    ?? current.name,
    address:    data.direccion ?? data.address ?? current.address,
    card_last4: cardNumber ? toLast4(String(cardNumber)) : current.card_last4,
    phone:      data.telefono  ?? data.phone   ?? current.phone,
    email,
  });
  return getById(id);
};

const STATUS_MAP = { activo: 'active', suspendido: 'suspended' };

const updateStatus = async (id, status) => {
  const mapped = STATUS_MAP[status] ?? status;
  if (!['active', 'suspended'].includes(mapped))
    throw { status: 400, message: 'Estado inválido. Use: active | suspended | activo | suspendido' };
  await getRaw(id);
  await clientRepo.updateStatus(id, mapped);
  return getById(id);
};

module.exports = { list, getById, update, updateStatus };
