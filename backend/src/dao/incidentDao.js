// Reportes de problemas con un pedido.
const db = require('../config/db');

module.exports = {
  create: async (orderId, clientId, { reason, description }) =>
    (await db.callOne('sp_incident_create', [orderId, clientId, reason, description])).id,
  list: (status) => db.call('sp_incident_list', [status]),
  resolve: (id, { resolution, refund, warn_courier }) =>
    db.callOne('sp_incident_resolve', [id, resolution, refund, warn_courier]),
};
