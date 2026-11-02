// Catálogo público: restaurantes y menús. No requiere iniciar sesión.
const restaurantDao = require('../dao/restaurantDao');
const { estimateDelivery } = require('./pricing');
const { isCostaRicaHoliday } = require('../utils/holidays');
const { isValidCoordinate } = require('../utils/geo');
const { notFound } = require('../utils/errors');
const { escapeLike } = require('../utils/search');


const toRestaurant = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  description: row.description,
  address: row.address,
  lat: row.lat,
  lng: row.lng,
  image_url: row.image_url,
  prep_minutes: row.prep_minutes,
  is_open: row.is_open,
  rating: { average: Number(row.rating_avg), count: Number(row.rating_count) },
});

const destinationFrom = ({ lat, lng }) => (isValidCoordinate(lat, lng) ? { lat, lng } : null);

const withEstimate = (restaurant, destination, isHoliday) =>
  (destination ? { ...restaurant, delivery: estimateDelivery({ restaurant, destination, isHoliday }) } : restaurant);

// Las secciones del menú en el orden en que aparece su primer producto.
const groupMenu = (products) => {
  const sections = new Map();
  for (const product of products) {
    if (!sections.has(product.section)) sections.set(product.section, []);
    sections.get(product.section).push({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      available: product.available,
    });
  }
  return [...sections].map(([name, items]) => ({ name, products: items }));
};

module.exports = {
  async listRestaurants(query) {
    const rows = await restaurantDao.list({
      search: query.search ? escapeLike(query.search) : null,
      category: query.category || null,
    });
    const destination = destinationFrom(query);
    const isHoliday = isCostaRicaHoliday();
    const restaurants = rows.map((row) => withEstimate(toRestaurant(row), destination, isHoliday));

    // Primero los abiertos que llegan a la dirección; los que no llegan, al final.
    const rank = (r) => (r.is_open ? 0 : 1) + (r.delivery && !r.delivery.in_range ? 2 : 0);
    return restaurants.sort((a, b) => rank(a) - rank(b));
  },

  categories: () => restaurantDao.categories(),

  async getRestaurant(id, query) {
    const found = await restaurantDao.getWithMenu(id);
    if (!found || !found.restaurant.active) throw notFound('Restaurante no encontrado');
    const restaurant = withEstimate(toRestaurant(found.restaurant), destinationFrom(query), isCostaRicaHoliday());
    return { ...restaurant, menu: groupMenu(found.products) };
  },

  toRestaurant,
  groupMenu,
};
