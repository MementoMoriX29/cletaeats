// Direcciones guardadas del cliente. Todas las consultas filtran por el dueño.
const db = require('../config/db');

module.exports = {
  list: (clientId) => db.call('sp_address_list', [clientId]),
  get: (id, clientId) => db.callOne('sp_address_get', [id, clientId]),

  create: (clientId, { label, line, details, lat, lng }) =>
    db.callOne('sp_address_create', [clientId, label, line, details, lat, lng]),

  update: (id, clientId, { label, line, details, lat, lng }) =>
    db.callOne('sp_address_update', [id, clientId, label, line, details, lat, lng]),

  remove: async (id, clientId) => (await db.callOne('sp_address_delete', [id, clientId])).affected > 0,
};
