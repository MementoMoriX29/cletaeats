// Cálculo del precio de un pedido. Es una función pura (sin base de datos) para poder probarla aparte.
// Lo calcula siempre el servidor: el cliente solo elige productos, dirección, método de pago y propina.

const { roadDistanceKm } = require('../utils/geo');

const PRICING = {
  maxDistanceKm: 7,        // radio de entrega en bicicleta o scooter
  deliveryBase: 700,       // ₡
  deliveryPerKm: 350,      // ₡ por km recorrido
  holidaySurcharge: 0.25,  // +25 % en feriados nacionales
  serviceRate: 0.05,       // tarifa de servicio de la plataforma
  serviceMin: 250,
  serviceMax: 1500,
  ivaRate: 0.13,           // los precios del menú ya incluyen IVA
  minutesPerKm: 4,         // ~15 km/h en ciudad
  handoffMinutes: 5,       // estacionar, entregar, cobrar
  maxTip: 10000,
};

const roundTo = (value, step) => Math.round(value / step) * step;
const ceilTo = (value, step) => Math.ceil(value / step) * step;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

class OutOfRangeError extends Error {
  constructor(distanceKm) {
    super(`La dirección está a ${distanceKm} km del restaurante y el máximo es ${PRICING.maxDistanceKm} km`);
    this.distanceKm = distanceKm;
  }
}

const deliveryFeeFor = (distanceKm, isHoliday) => {
  let fee = PRICING.deliveryBase + PRICING.deliveryPerKm * distanceKm;
  if (isHoliday) fee *= 1 + PRICING.holidaySurcharge;
  return ceilTo(fee, 50);
};

// Minutos desde que el restaurante acepta hasta que el pedido llega: preparación + trayecto + entrega.
const etaRange = (prepMinutes, distanceKm) => {
  const min = prepMinutes + Math.ceil(distanceKm * PRICING.minutesPerKm) + PRICING.handoffMinutes;
  return { eta_min: min, eta_max: min + 10 };
};

// Para la lista de restaurantes: cuánto costaría el envío a la dirección elegida y cuánto tardaría.
const estimateDelivery = ({ restaurant, destination, isHoliday }) => {
  const distanceKm = roadDistanceKm(restaurant, destination);
  return {
    distance_km: distanceKm,
    in_range: distanceKm <= PRICING.maxDistanceKm,
    delivery_fee: deliveryFeeFor(distanceKm, isHoliday),
    ...etaRange(restaurant.prep_minutes, distanceKm),
  };
};

/**
 * Cotización completa de un pedido.
 * @param {object} input
 * @param {{lat:number, lng:number, prep_minutes:number}} input.restaurant
 * @param {{lat:number, lng:number}} input.destination
 * @param {{product_id:number, name:string, unit_price:number, quantity:number}[]} input.items
 * @param {boolean} input.isHoliday
 * @param {number} [input.tip]
 */
const calculateQuote = ({ restaurant, destination, items, isHoliday, tip = 0 }) => {
  const distanceKm = roadDistanceKm(restaurant, destination);
  if (distanceKm > PRICING.maxDistanceKm) throw new OutOfRangeError(distanceKm);

  const lines = items.map((item) => ({ ...item, line_total: item.unit_price * item.quantity }));
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
  const ivaIncluded = Math.round((subtotal * PRICING.ivaRate) / (1 + PRICING.ivaRate));
  const deliveryFee = deliveryFeeFor(distanceKm, isHoliday);
  const serviceFee = clamp(roundTo(subtotal * PRICING.serviceRate, 10), PRICING.serviceMin, PRICING.serviceMax);

  return {
    items: lines,
    distance_km: distanceKm,
    subtotal,
    iva_included: ivaIncluded,
    delivery_fee: deliveryFee,
    service_fee: serviceFee,
    tip,
    total: subtotal + deliveryFee + serviceFee + tip,
    is_holiday: Boolean(isHoliday),
    ...etaRange(restaurant.prep_minutes, distanceKm),
  };
};

module.exports = { calculateQuote, estimateDelivery, OutOfRangeError, PRICING };
