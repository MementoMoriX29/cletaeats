const mysql = require('mysql2/promise');
const env   = require('./env');
const { translateDbError } = require('../utils/errors');

const pool = mysql.createPool({
  ...env.db,
  charset: 'UTF8MB4_UNICODE_CI',
  connectionLimit: 5,
  waitForConnections: true,
  maxIdle: 2,
  // Recicla conexiones inactivas antes de que un proxy o firewall las corte
  idleTimeout: 10000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000,
  connectTimeout: 30000,
  // Fechas siempre en UTC: la API devuelve ISO 8601 y el navegador las muestra en hora local
  timezone: 'Z',
  decimalNumbers: true,
  // Columnas BOOLEAN (TINYINT(1)) como true/false en lugar de 1/0
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const value = field.string();
      return value === null ? null : value === '1';
    }
    return next();
  },
});

// La sesión de MySQL también en UTC, sin importar la zona horaria del servidor de base de datos.
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'", (err) => {
    if (err) console.error('No se pudo fijar la zona horaria de la sesión:', err.message);
  });
});

// Errores transitorios que vale la pena reintentar. Un deadlock deshace la transacción completa,
// así que repetir la llamada es seguro.
const transientErrors = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'ECONNRESET',
  'ETIMEDOUT',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'ECONNREFUSED',
  'ER_LOCK_DEADLOCK',
]);

const withRetry = async (operation, maxRetries = 4) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!transientErrors.has(error?.code) || attempt === maxRetries) throw error;
      // Backoff: 200 ms, 400 ms, 600 ms
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  return undefined;
};

// Llama a un procedimiento almacenado y devuelve sus conjuntos de resultados (sin el OkPacket final).
// Los errores de negocio (SIGNAL) y de llaves duplicadas se convierten en AppError.
const callProcedure = async (name, params = []) => {
  if (!/^sp_[a-z_]+$/.test(name)) throw new Error(`Nombre de procedimiento inválido: ${name}`);
  const placeholders = params.map(() => '?').join(', ');
  try {
    const [results] = await withRetry(() => pool.query(`CALL ${name}(${placeholders})`, params));
    return Array.isArray(results) ? results.filter(Array.isArray) : [];
  } catch (err) {
    throw translateDbError(err);
  }
};

module.exports = {
  // Todos los conjuntos de resultados: [[filas], [filas], …]
  callSets: callProcedure,
  // Las filas del primer conjunto
  call: async (name, params) => (await callProcedure(name, params))[0] ?? [],
  // La primera fila del primer conjunto, o null
  callOne: async (name, params) => (await callProcedure(name, params))[0]?.[0] ?? null,
  ping: () => withRetry(() => pool.query('SELECT 1')),
  end: () => pool.end(),
};
