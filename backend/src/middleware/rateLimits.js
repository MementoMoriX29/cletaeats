// Límites de peticiones por IP (detrás de Caddy, app.js confía en el primer proxy para leer la IP real).
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const options = (windowMs, limit, message) => ({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: message, code: 'RATE_LIMITED' },
  // En los tests se hacen muchas peticiones seguidas desde la misma IP
  skip: () => env.isTest,
});

// Login y registro: frena ataques de fuerza bruta
const authLimiter = rateLimit(options(15 * 60 * 1000, 20, 'Demasiados intentos. Esperá unos minutos.'));

// Crear pedidos
const orderLimiter = rateLimit(options(60 * 1000, 10, 'Estás haciendo demasiados pedidos seguidos.'));

// Toda la API
const apiLimiter = rateLimit(options(60 * 1000, 300, 'Demasiadas solicitudes. Probá de nuevo en un minuto.'));

module.exports = { authLimiter, orderLimiter, apiLimiter };
