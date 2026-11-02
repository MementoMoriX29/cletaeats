// Esquemas de validación de las peticiones (zod). Normalizan los datos además de validarlos:
// correos en minúscula, teléfonos como 8888-8888, espacios recortados.
const { z } = require('zod');

z.config(z.locales.es());

// ── Campos comunes ────────────────────────────────────────────
const text = (min, max, message) => z.string({ error: message }).trim().min(min, { error: message }).max(max);
const optionalText = (max) =>
  z.string().trim().max(max).optional().nullable().transform((value) => (value ? value : null));

const email = z.string({ error: 'Ingresá tu correo' }).trim().toLowerCase().max(120)
  .pipe(z.email({ error: 'Ingresá un correo válido' }));

// bcrypt solo usa los primeros 72 bytes
const password = z.string({ error: 'Ingresá una contraseña' })
  .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' })
  .max(72, { error: 'La contraseña puede tener hasta 72 caracteres' });

const name = text(3, 100, 'Ingresá tu nombre completo');

// Teléfonos de Costa Rica: 8 dígitos, fijos (2) o celulares (5–8). Acepta +506, espacios y guiones.
const phone = z.string({ error: 'Ingresá un teléfono' }).trim()
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^\+?506/, ''))
  .pipe(z.string().regex(/^[245678]\d{7}$/, { error: 'Ingresá un teléfono de 8 dígitos' }))
  .transform((value) => `${value.slice(0, 4)}-${value.slice(4)}`);

const optionalPhone = z.union([phone, z.literal('').transform(() => null), z.null()]).optional()
  .transform((value) => value ?? null);

// Cédula física (9 dígitos) o DIMEX (11–12)
const nationalId = z.string({ error: 'Ingresá tu número de cédula' }).trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{9,12}$/, { error: 'La cédula debe tener 9 dígitos (o 11–12 si es DIMEX)' }));

// Por ahora se entrega solo en Costa Rica
const latitude = z.number({ error: 'Marcá la ubicación en el mapa' })
  .min(8, { error: 'La ubicación tiene que estar en Costa Rica' })
  .max(11.3, { error: 'La ubicación tiene que estar en Costa Rica' });
const longitude = z.number({ error: 'Marcá la ubicación en el mapa' })
  .min(-86, { error: 'La ubicación tiene que estar en Costa Rica' })
  .max(-82.5, { error: 'La ubicación tiene que estar en Costa Rica' });

const id = z.coerce.number().int().positive();
const money = (max) => z.number().int().min(0).max(max);

// ── Cuentas ───────────────────────────────────────────────────
const login = z.object({
  email,
  password: z.string({ error: 'Ingresá tu contraseña' }).min(1, { error: 'Ingresá tu contraseña' }).max(200),
});

const registerClient = z.object({ name, email, phone, password });

const registerCourier = z.object({
  name,
  email,
  phone,
  password,
  national_id: nationalId,
  vehicle: z.enum(['bicicleta', 'scooter'], { error: 'Elegí bicicleta o scooter' }).default('bicicleta'),
});

const updateProfile = z.object({ name, phone });

const changePassword = z.object({
  current_password: z.string({ error: 'Ingresá tu contraseña actual' }).min(1).max(200),
  new_password: password,
});

const address = z.object({
  label: text(1, 30, 'Poné un nombre a la dirección, por ejemplo Casa'),
  line: text(5, 200, 'Escribí la dirección con alguna referencia'),
  details: optionalText(150),
  lat: latitude,
  lng: longitude,
});

// ── Catálogo ──────────────────────────────────────────────────
const catalogQuery = z.object({
  search: z.string().trim().max(60).optional(),
  category: z.string().trim().max(40).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

// ── Pedidos ───────────────────────────────────────────────────
const cartItems = z.array(z.object({
  product_id: id,
  quantity: z.number().int().min(1).max(20, { error: 'Máximo 20 unidades por producto' }),
}), { error: 'El carrito está vacío' })
  .min(1, { error: 'El carrito está vacío' })
  .max(30, { error: 'El pedido tiene demasiados productos' });

// La entrega puede ser una dirección guardada o una ubicación marcada en el momento.
const delivery = z.union([
  z.object({ address_id: id }),
  z.object({
    line: text(5, 200, 'Escribí la dirección de entrega'),
    details: optionalText(150),
    lat: latitude,
    lng: longitude,
  }),
], { error: 'Elegí una dirección de entrega' });

const tip = money(10000).default(0);

const quote = z.object({ restaurant_id: id, items: cartItems, delivery, tip });

// El número de tarjeta nunca llega al servidor: la pasarela de pago (simulada en la web) lo cambia
// por un token y solo se recibe la marca y los últimos 4 dígitos.
const payment = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('cash'),
    cash_change_for: money(100000).optional().nullable(),
  }),
  z.object({
    method: z.literal('sinpe'),
    sinpe_reference: z.string({ error: 'Ingresá el número de comprobante del SINPE' }).trim()
      .regex(/^[A-Za-z0-9-]{4,30}$/, { error: 'Ingresá el número de comprobante del SINPE' }),
  }),
  z.object({
    method: z.literal('card'),
    card_token: z.string().regex(/^tok_[A-Za-z0-9]{16,40}$/, { error: 'El pago con tarjeta no se pudo procesar' }),
    card_brand: z.enum(['visa', 'mastercard', 'amex']),
    card_last4: z.string().regex(/^\d{4}$/),
  }),
], { error: 'Elegí un método de pago' });

const createOrder = quote.extend({
  notes: optionalText(200),
  payment,
  // Total que vio el cliente al confirmar; si cambió, se le avisa en lugar de cobrar otro monto.
  expected_total: z.number().int().optional(),
});

const cancelOrder = z.object({ reason: optionalText(200) });
const rejectOrder = z.object({ reason: text(3, 200, 'Contale al cliente por qué no podés preparar el pedido') });
const acceptOrder = z.object({ prep_minutes: z.number().int().min(5).max(90).optional() });

const rating = z.object({
  courier_stars: z.number().int().min(1).max(5),
  restaurant_stars: z.number().int().min(1).max(5),
  comment: optionalText(300),
});

const incident = z.object({
  reason: z.enum(['late', 'missing_items', 'wrong_order', 'damaged', 'courier_behavior', 'other'], {
    error: 'Elegí qué pasó',
  }),
  description: text(10, 500, 'Contanos qué pasó (mínimo 10 caracteres)'),
});

// ── Repartidor ────────────────────────────────────────────────
const availability = z.object({ online: z.boolean() });
const location = z.object({ lat: latitude, lng: longitude });

// ── Restaurante ───────────────────────────────────────────────
const restaurantSettings = z.object({
  description: optionalText(300),
  phone: optionalPhone,
  sinpe_phone: optionalPhone,
  image_url: z.union([
    z.url({ protocol: /^https$/, error: 'La imagen tiene que ser un enlace https' }).max(300),
    z.literal('').transform(() => null),
    z.null(),
  ]).optional().transform((value) => value ?? null),
  prep_minutes: z.number().int().min(5).max(90),
});

const openStatus = z.object({ is_open: z.boolean() });

const product = z.object({
  section: text(2, 40, 'Indicá la sección del menú'),
  name: text(2, 80, 'Indicá el nombre del producto'),
  description: optionalText(250),
  price: z.number({ error: 'Indicá el precio' }).int().min(100, { error: 'El precio mínimo es ₡100' }).max(200000),
  available: z.boolean().default(true),
});

const productAvailability = z.object({ available: z.boolean() });

// ── Administración ────────────────────────────────────────────
const restaurantAdmin = z.object({
  name: text(2, 100, 'Indicá el nombre del restaurante'),
  tax_id: z.string().trim().regex(/^\d-\d{3}-\d{6}$/, { error: 'Cédula jurídica con formato 3-101-123456' }),
  category: text(2, 40, 'Indicá la categoría'),
  address: text(5, 200, 'Indicá la dirección'),
  lat: latitude,
  lng: longitude,
  phone: optionalPhone,
});

const createRestaurant = restaurantAdmin.extend({
  description: optionalText(300),
  prep_minutes: z.number().int().min(5).max(90).default(20),
  owner: z.object({ name, email, phone }),
});

const courierWarning = z.object({ reason: text(5, 200, 'Indicá el motivo de la amonestación') });

const resolveIncident = z.object({
  resolution: text(5, 300, 'Describí cómo se resolvió'),
  refund: z.boolean().default(false),
  warn_courier: z.boolean().default(false),
});

const adminCancel = z.object({ reason: text(3, 200, 'Indicá el motivo de la cancelación') });

module.exports = {
  z,
  id,
  login,
  registerClient,
  registerCourier,
  updateProfile,
  changePassword,
  address,
  catalogQuery,
  quote,
  createOrder,
  cancelOrder,
  rejectOrder,
  acceptOrder,
  rating,
  incident,
  availability,
  location,
  restaurantSettings,
  openStatus,
  product,
  productAvailability,
  restaurantAdmin,
  createRestaurant,
  courierWarning,
  resolveIncident,
  adminCancel,
};
