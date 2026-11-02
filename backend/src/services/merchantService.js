// Panel del restaurante: pedidos en vivo, menú y ajustes de la tienda.
const restaurantDao = require('../dao/restaurantDao');
const productDao = require('../dao/productDao');
const orderDao = require('../dao/orderDao');
const { ownRestaurant, shortName } = require('./orderService');
const { groupMenu } = require('./catalogService');
const { startOfDayCR } = require('../utils/time');
const { notFound } = require('../utils/errors');

const toStore = (row) => ({
  id: row.id,
  name: row.name,
  tax_id: row.tax_id,
  category: row.category,
  description: row.description,
  address: row.address,
  lat: row.lat,
  lng: row.lng,
  phone: row.phone,
  sinpe_phone: row.sinpe_phone,
  image_url: row.image_url,
  prep_minutes: row.prep_minutes,
  is_open: row.is_open,
  active: row.active,
  rating: { average: Number(row.rating_avg), count: Number(row.rating_count) },
});

const toProduct = (row) => ({
  id: row.id,
  section: row.section,
  name: row.name,
  description: row.description,
  price: row.price,
  available: row.available,
});

const toKitchenOrder = (o) => ({
  id: o.id,
  status: o.status,
  client_name: shortName(o.client_name),
  notes: o.notes,
  items: (o.items ?? []).map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
  subtotal: o.subtotal,
  prep_minutes: o.prep_minutes,
  payment: { method: o.payment_method, status: o.payment_status, sinpe_reference: o.sinpe_reference },
  courier: o.courier_name ? { name: shortName(o.courier_name), vehicle: o.courier_vehicle } : null,
  created_at: o.created_at,
  accepted_at: o.accepted_at,
  assigned_at: o.assigned_at,
  ready_at: o.ready_at,
  picked_up_at: o.picked_up_at,
  delivered_at: o.delivered_at,
  cancelled_at: o.cancelled_at,
  cancelled_by: o.cancelled_by,
  cancel_reason: o.cancel_reason,
});

module.exports = {
  async getStore(viewer) {
    const restaurant = await ownRestaurant(viewer);
    const today = await restaurantDao.summary(restaurant.id, startOfDayCR());
    return {
      ...toStore(restaurant),
      today: {
        orders: Number(today.orders_today),
        sales: Number(today.sales_today),
        cancelled: Number(today.cancelled_today),
        avg_prep_minutes: today.avg_prep_minutes === null ? null : Number(today.avg_prep_minutes),
      },
    };
  },

  async updateSettings(viewer, data) {
    const restaurant = await ownRestaurant(viewer);
    await restaurantDao.updateSettings(restaurant.id, data);
    return toStore(await restaurantDao.getByOwner(viewer.id));
  },

  async setOpen(viewer, isOpen) {
    const restaurant = await ownRestaurant(viewer);
    await restaurantDao.setOpen(restaurant.id, isOpen);
    return toStore(await restaurantDao.getByOwner(viewer.id));
  },

  async listOrders(viewer, scope) {
    const restaurant = await ownRestaurant(viewer);
    const rows = await orderDao.listByRestaurant(restaurant.id, scope !== 'history');
    return rows.map(toKitchenOrder);
  },

  async getMenu(viewer) {
    const restaurant = await ownRestaurant(viewer);
    const { products } = await restaurantDao.getWithMenu(restaurant.id);
    return groupMenu(products).map((section) => ({
      ...section,
      products: section.products.map((p) => ({ ...p, section: section.name })),
    }));
  },

  async createProduct(viewer, data) {
    const restaurant = await ownRestaurant(viewer);
    return toProduct(await productDao.create(restaurant.id, data));
  },

  async updateProduct(viewer, id, data) {
    const restaurant = await ownRestaurant(viewer);
    const row = await productDao.update(id, restaurant.id, data);
    if (!row) throw notFound('Producto no encontrado');
    return toProduct(row);
  },

  async setProductAvailable(viewer, id, available) {
    const restaurant = await ownRestaurant(viewer);
    const row = await productDao.setAvailable(id, restaurant.id, available);
    if (!row) throw notFound('Producto no encontrado');
    return toProduct(row);
  },

  async deleteProduct(viewer, id) {
    const restaurant = await ownRestaurant(viewer);
    if (!(await productDao.remove(id, restaurant.id))) throw notFound('Producto no encontrado');
  },
};
