// Errores de la aplicación y traducción de los errores de MySQL a respuestas HTTP.

class AppError extends Error {
  constructor(status, message, code, extra) {
    super(message);
    this.status = status;
    this.code = code;
    if (extra) this.extra = extra;
  }
}

const badRequest = (message, extra) => new AppError(400, message, 'BAD_REQUEST', extra);
const unauthorized = (message = 'Iniciá sesión para continuar') => new AppError(401, message, 'UNAUTHORIZED');
const forbidden = (message = 'No tenés permiso para hacer esto') => new AppError(403, message, 'FORBIDDEN');
const notFound = (message = 'No encontrado') => new AppError(404, message, 'NOT_FOUND');
const conflict = (message, code = 'CONFLICT', extra) => new AppError(409, message, code, extra);

// Códigos que lanzan los procedimientos almacenados con SIGNAL SQLSTATE '45000'.
const BUSINESS_ERRORS = {
  ORDER_NOT_FOUND:           [404, 'Pedido no encontrado'],
  ORDER_NOT_CANCELLABLE:     [409, 'El restaurante ya aceptó tu pedido. Si hay un problema, reportalo desde el pedido.'],
  ORDER_STATE_CONFLICT:      [409, 'El pedido cambió de estado. Actualizá para ver la información más reciente.'],
  ORDER_TAKEN:               [409, 'Otro repartidor ya aceptó este pedido'],
  ORDER_NOT_DELIVERED:       [409, 'Solo podés calificar pedidos entregados'],
  ORDER_CLOSED:              [409, 'El pedido ya está cerrado'],
  ORDER_WITHOUT_COURIER:     [409, 'Ese pedido no tuvo repartidor'],
  EMPTY_ORDER:               [400, 'El pedido no tiene productos'],
  CART_CHANGED:              [409, 'Algunos productos cambiaron de precio o ya no están disponibles. Revisá tu carrito.'],
  RESTAURANT_NOT_FOUND:      [404, 'Restaurante no encontrado'],
  RESTAURANT_CLOSED:         [409, 'El restaurante está cerrado en este momento'],
  RESTAURANT_DISABLED:       [409, 'El restaurante está deshabilitado. Contactá a soporte.'],
  MENU_EMPTY:                [409, 'Agregá al menos un producto disponible al menú antes de abrir la tienda.'],
  COURIER_NOT_FOUND:         [404, 'Repartidor no encontrado'],
  COURIER_BUSY:              [409, 'Tenés una entrega en curso. Terminala antes de continuar.'],
  COURIER_OFFLINE:           [409, 'Conectate para aceptar pedidos'],
  COURIER_HAS_ACTIVE_ORDER:  [409, 'El repartidor tiene una entrega en curso. Cancelá ese pedido o esperá a que termine.'],
  ADDRESS_LIMIT:             [409, 'Podés guardar hasta 10 direcciones'],
  PRODUCT_LIMIT:             [409, 'El menú llegó al máximo de 150 productos'],
  INCIDENT_TOO_EARLY:        [409, 'Mientras el restaurante no confirme el pedido, podés cancelarlo directamente'],
  INCIDENT_ALREADY_OPEN:     [409, 'Ya reportaste un problema con este pedido. Soporte lo está revisando.'],
  INCIDENT_NOT_FOUND:        [404, 'Reporte no encontrado'],
  INCIDENT_ALREADY_RESOLVED: [409, 'Ese reporte ya fue resuelto'],
  INVALID_TRANSITION:        [409, 'Esa acción no aplica al estado actual de la cuenta'],
  INVALID_ACTION:            [400, 'Acción no válida'],
  EMAIL_IN_USE:              [409, 'Ya existe una cuenta con ese correo'],
};

// Llaves únicas del esquema → mensaje para el usuario.
const DUPLICATE_KEYS = {
  uq_account_email:       'Ya existe una cuenta con ese correo',
  uq_courier_national_id: 'Esa cédula ya está registrada',
  uq_restaurant_tax_id:   'Ya existe un restaurante con esa cédula jurídica',
  'rating.PRIMARY':       'Ya calificaste este pedido',
};

const translateDbError = (err) => {
  if (err?.errno === 1644 && err.sqlState === '45000') {
    const code = err.sqlMessage;
    const [status, message] = BUSINESS_ERRORS[code] ?? [409, 'No se pudo completar la operación'];
    return new AppError(status, message, code);
  }
  if (err?.code === 'ER_DUP_ENTRY') {
    const key = Object.keys(DUPLICATE_KEYS).find((name) => err.sqlMessage?.includes(`'${name}'`)
      || err.sqlMessage?.includes(`.${name}'`));
    if (key) return new AppError(409, DUPLICATE_KEYS[key], 'DUPLICATE');
  }
  return err;
};

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, translateDbError, BUSINESS_ERRORS };
