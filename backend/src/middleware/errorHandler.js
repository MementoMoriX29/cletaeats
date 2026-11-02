// Manejador global de errores.
// Los errores de negocio (AppError) se devuelven con su código HTTP y un mensaje para el usuario.
// Cualquier otro error (base de datos, bugs) se registra en el log y el cliente solo recibe un
// mensaje genérico, para no exponer detalles internos como mensajes de MySQL o rutas de archivos.
const { AppError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // JSON mal formado en el body (lo genera express.json)
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido', code: 'BAD_JSON' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La solicitud es demasiado grande', code: 'TOO_LARGE' });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code, ...err.extra });
  }

  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL' });
};

module.exports = { errorHandler };
