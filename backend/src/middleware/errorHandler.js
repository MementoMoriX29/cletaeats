// Manejador global de errores.
// Los errores de negocio se lanzan como { status, message } y se devuelven tal cual.
// Cualquier otro error (BD, bugs) se registra en el log y el cliente solo recibe un mensaje genérico,
// para no exponer detalles internos como mensajes de MySQL o rutas de archivos.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // JSON mal formado en el body (lo genera express.json)
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;

  if (status === 500) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }

  res.status(status).json({ error: err.message ?? 'Solicitud inválida' });
};

module.exports = { errorHandler };
