// Carga y valida las variables de entorno al arrancar.
// Si falta algo obligatorio el proceso termina con un mensaje claro,
// en lugar de fallar más tarde en la primera petición.
require('dotenv').config({ quiet: true });

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Faltan variables de entorno: ${missing.join(', ')} (ver backend/.env.example)`);
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres (generalo con: openssl rand -base64 48)');
}

const number = (key, fallback) => {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isFinite(value)) throw new Error(`${key} debe ser un número`);
  return value;
};

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const env = {
  isProduction,
  isTest,
  port: number('PORT', 3000),

  db: {
    host:     process.env.DB_HOST,
    port:     number('DB_PORT', 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
  },

  jwtSecret: process.env.JWT_SECRET,
  // Sesiones largas como en cualquier app de delivery. Igual se revisa la cuenta en cada petición,
  // así una suspensión o un cambio de contraseña aplican de inmediato.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptRounds: number('BCRYPT_ROUNDS', 12),

  // Orígenes permitidos por CORS, separados por coma: https://cletaeats.duckdns.org,http://localhost:5173
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Si el restaurante no acepta un pedido en este tiempo, se cancela solo y se reembolsa.
  pendingOrderTimeoutMin: number('PENDING_ORDER_TIMEOUT_MIN', 15),
};

module.exports = env;
