// Distancias sobre el mapa.

const EARTH_RADIUS_KM = 6371;
const toRad = (degrees) => (degrees * Math.PI) / 180;

// Distancia en línea recta (fórmula del haversine), en km.
const haversineKm = (a, b) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

// Las calles no van en línea recta. 1.3 es un factor de rodeo típico para ciudades pequeñas;
// sin un servicio de rutas (de pago) es una aproximación razonable.
const ROAD_FACTOR = 1.3;
const roadDistanceKm = (a, b) => Math.round(haversineKm(a, b) * ROAD_FACTOR * 10) / 10;

const isValidCoordinate = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

module.exports = { haversineKm, roadDistanceKm, isValidCoordinate, ROAD_FACTOR };
