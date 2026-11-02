// Restaurantes: catálogo público, panel del dueño y administración.
const db = require('../config/db');

module.exports = {
  // Catálogo
  list: ({ search, category }) => db.call('sp_restaurant_list', [search, category]),
  categories: () => db.call('sp_restaurant_categories'),
  async getWithMenu(id) {
    const [[restaurant], products] = await db.callSets('sp_restaurant_get', [id]);
    return restaurant ? { restaurant, products } : null;
  },

  // Panel del restaurante
  getByOwner: (ownerId) => db.callOne('sp_restaurant_get_by_owner', [ownerId]),
  updateSettings: (id, { description, phone, sinpe_phone, image_url, prep_minutes }) =>
    db.callSets('sp_restaurant_update_settings', [id, description, phone, sinpe_phone, image_url, prep_minutes]),
  setOpen: (id, isOpen) => db.callSets('sp_restaurant_set_open', [id, isOpen]),
  summary: (id, since) => db.callOne('sp_restaurant_summary', [id, since]),

  // Administración
  listAdmin: () => db.call('sp_restaurant_list_admin'),
  create: ({ owner, name, tax_id, category, description, address, lat, lng, phone, prep_minutes }) =>
    db.callOne('sp_restaurant_create', [
      owner.email, owner.passwordHash, owner.name, owner.phone,
      name, tax_id, category, description, address, lat, lng, phone, prep_minutes,
    ]),
  updateAdmin: (id, { name, tax_id, category, address, lat, lng, phone }) =>
    db.callOne('sp_restaurant_update_admin', [id, name, tax_id, category, address, lat, lng, phone]),
  setActive: (id, active) => db.callOne('sp_restaurant_set_active', [id, active]),
};
