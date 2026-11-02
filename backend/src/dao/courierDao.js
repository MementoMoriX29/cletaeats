// Repartidores: perfil, disponibilidad, ubicación y administración.
const db = require('../config/db');

module.exports = {
  get: (id) => db.callOne('sp_courier_get', [id]),
  setAvailability: (id, online) => db.callSets('sp_courier_set_availability', [id, online]),
  // Guarda la ubicación y devuelve el pedido en curso, si hay.
  updateLocation: (id, lat, lng) => db.callOne('sp_courier_update_location', [id, lat, lng]),
  summary: (id, today, week) => db.callOne('sp_courier_summary', [id, today, week]),

  list: (status) => db.call('sp_courier_list', [status]),
  adminAction: (id, action) => db.callOne('sp_courier_admin_action', [id, action]),
  warn: (id, reason) => db.callOne('sp_courier_warn', [id, reason]),
  warnings: (id) => db.call('sp_courier_warnings', [id]),
};
