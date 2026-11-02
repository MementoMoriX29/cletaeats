// Pruebas unitarias del cálculo de precios y de las fechas en hora de Costa Rica.
const { calculateQuote, estimateDelivery, OutOfRangeError } = require('../src/services/pricing');
const { startOfDayCR, startOfWeekCR } = require('../src/utils/time');

const restaurant = { lat: 9.9981, lng: -84.1197, prep_minutes: 15 }; // Heredia centro
const near = { lat: 10.0065, lng: -84.1232 };                        // Mercedes Norte, ~1.3 km
const far = { lat: 9.8644, lng: -83.9194 };                          // Cartago
const items = [
  { product_id: 1, name: 'Casado', unit_price: 4200, quantity: 2 },
  { product_id: 2, name: 'Fresco', unit_price: 1200, quantity: 1 },
];

describe('cotización', () => {
  test('calcula subtotal, IVA incluido, envío, servicio, propina y total', () => {
    const quote = calculateQuote({ restaurant, destination: near, items, isHoliday: false, tip: 500 });
    expect(quote.distance_km).toBe(1.3);
    expect(quote.subtotal).toBe(9600);
    expect(quote.iva_included).toBe(1104);   // 9600 × 13 / 113
    expect(quote.delivery_fee).toBe(1200);   // 700 + 350 × 1.3 = 1155 → se redondea hacia arriba a 50
    expect(quote.service_fee).toBe(480);     // 5 %
    expect(quote.total).toBe(9600 + 1200 + 480 + 500);
    expect(quote.items[0].line_total).toBe(8400);
    expect(quote.eta_min).toBe(15 + 6 + 5);  // preparación + 1.3 km × 4 min + entrega
    expect(quote.eta_max).toBe(quote.eta_min + 10);
  });

  test('en feriado el envío sube 25 %', () => {
    const quote = calculateQuote({ restaurant, destination: near, items, isHoliday: true });
    expect(quote.delivery_fee).toBe(1450);   // 1155 × 1.25 = 1443.75 → 1450
    expect(quote.is_holiday).toBe(true);
  });

  test('la tarifa de servicio tiene un mínimo y un máximo', () => {
    const small = calculateQuote({ restaurant, destination: near, items: [{ ...items[1], quantity: 1 }], isHoliday: false });
    expect(small.service_fee).toBe(250);
    const big = calculateQuote({ restaurant, destination: near, items: [{ ...items[0], quantity: 20 }], isHoliday: false });
    expect(big.service_fee).toBe(1500);
  });

  test('no cotiza fuera del radio de entrega', () => {
    expect(() => calculateQuote({ restaurant, destination: far, items, isHoliday: false })).toThrow(OutOfRangeError);
  });

  test('la estimación para la lista de restaurantes indica si llega o no', () => {
    expect(estimateDelivery({ restaurant, destination: near, isHoliday: false }))
      .toEqual({ distance_km: 1.3, in_range: true, delivery_fee: 1200, eta_min: 26, eta_max: 36 });
    expect(estimateDelivery({ restaurant, destination: far, isHoliday: false }).in_range).toBe(false);
  });
});

describe('fechas en hora de Costa Rica (UTC-6)', () => {
  test('el día empieza a las 00:00 de Costa Rica aunque en UTC ya sea otro día', () => {
    // Domingo 1 de noviembre de 2026, 7:48 p. m. en Costa Rica
    const now = new Date('2026-11-02T01:48:00Z');
    expect(startOfDayCR(now).toISOString()).toBe('2026-11-01T06:00:00.000Z');
    expect(startOfWeekCR(now).toISOString()).toBe('2026-10-26T06:00:00.000Z'); // lunes
  });
});
