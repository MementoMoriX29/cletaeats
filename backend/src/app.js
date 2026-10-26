// Aplicación Express (sin levantar el servidor): la usan server.js y los tests.
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const db      = require('./config/db');
const { isAllowedOrigin } = require('./config/cors');

const authRoutes           = require('./routes/authRoutes');
const clientRoutes         = require('./routes/clientRoutes');
const restaurantRoutes     = require('./routes/restaurantRoutes');
const deliveryPersonRoutes = require('./routes/deliveryPersonRoutes');
const orderRoutes          = require('./routes/orderRoutes');
const reportRoutes         = require('./routes/reportRoutes');
const { errorHandler }     = require('./middleware/errorHandler');

const app = express();

// Detrás de un proxy inverso (Caddy): usa la IP real del cliente para el rate limiting
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100kb' }));

app.use('/api/auth',             authRoutes);
app.use('/api/clients',          clientRoutes);
app.use('/api/restaurants',      restaurantRoutes);
app.use('/api/delivery-persons', deliveryPersonRoutes);
app.use('/api/orders',           orderRoutes);
app.use('/api/reports',          reportRoutes);

// Health check: lo usan Docker y el monitoreo. Verifica también la conexión a la BD.
app.get(['/health', '/api/health'], async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', service: 'CletaEats API' });
  } catch {
    res.status(503).json({ status: 'error', service: 'CletaEats API', database: 'unreachable' });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

module.exports = { app };
