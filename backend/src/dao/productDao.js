// Productos del menú. Las operaciones del panel filtran siempre por el restaurante del dueño.
const db = require('../config/db');

module.exports = {
  create: (restaurantId, { section, name, description, price, available }) =>
    db.callOne('sp_product_create', [restaurantId, section, name, description, price, available]),

  update: (id, restaurantId, { section, name, description, price, available }) =>
    db.callOne('sp_product_update', [id, restaurantId, section, name, description, price, available]),

  setAvailable: (id, restaurantId, available) =>
    db.callOne('sp_product_set_available', [id, restaurantId, available]),

  remove: async (id, restaurantId) => (await db.callOne('sp_product_delete', [id, restaurantId])).affected > 0,
};
