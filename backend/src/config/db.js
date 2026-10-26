const mysql = require('mysql2/promise');
const env   = require('./env');

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
});

// Errores de red transitorios que vale la pena reintentar
const transientErrors = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'ECONNRESET',
  'ETIMEDOUT',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'ECONNREFUSED',
]);

const withRetry = async (operation, maxRetries = 4) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!transientErrors.has(error?.code) || attempt === maxRetries) throw error;
      // Backoff exponencial: 500 ms, 1 s, 1.5 s
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
};

module.exports = {
  query: (sql, params) => withRetry(() => pool.query(sql, params)),
  execute: (sql, params) => withRetry(() => pool.execute(sql, params)),
  getConnection: () => pool.getConnection(),
  end: () => pool.end(),
};
