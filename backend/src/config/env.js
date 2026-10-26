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

const isProduction = process.env.NODE_ENV === 'production';

const env = {
  isProduction,
  port: Number(process.env.PORT ?? 3000),

  db: {
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT ?? 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
  },

  jwtSecret: process.env.JWT_SECRET,

  // Orígenes permitidos por CORS, separados por coma: https://cletaeats.duckdns.org,http://localhost:5173
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  // Admin único definido por entorno. La contraseña se guarda como hash bcrypt
  // (generarlo con: npm run hash-password -- "tu-contraseña").
  admin: {
    email:        process.env.ADMIN_EMAIL || null,
    passwordHash: process.env.ADMIN_PASSWORD_HASH || null,
  },
};

module.exports = env;
