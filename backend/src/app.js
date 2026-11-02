// Aplicación Express (sin levantar el servidor): la usan server.js y los tests.
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const db      = require('./config/db');
const { isAllowedOrigin } = require('./config/cors');

const authRoutes       = require('./routes/authRoutes');
const meRoutes         = require('./routes/meRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const orderRoutes      = require('./routes/orderRoutes');
const courierRoutes    = require('./routes/courierRoutes');
const merchantRoutes   = require('./routes/merchantRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const { apiLimiter }   = require('./middleware/rateLimits');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Detrás de un proxy inverso (Caddy): usa la IP real del cliente para el rate limiting
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100kb' }));

// Health check: lo usan Docker y el monitoreo. Verifica también la conexión a la base de datos.
app.get(['/health', '/api/health'], async (_req, res) => {
  try {
    await db.ping();
    res.json({ status: 'ok', service: 'CletaEats API' });
  } catch {
    res.status(503).json({ status: 'error', service: 'CletaEats API', database: 'unreachable' });
  }
});

app.use('/api', apiLimiter);
app.use('/api/auth',        authRoutes);
app.use('/api/me',          meRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders',      orderRoutes);
app.use('/api/courier',     courierRoutes);
app.use('/api/merchant',    merchantRoutes);
app.use('/api/admin',       adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada', code: 'NOT_FOUND' }));
app.use(errorHandler);

module.exports = { app };
