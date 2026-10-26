const env = require('./env');

// En desarrollo se permite cualquier localhost; en producción solo los orígenes de CORS_ORIGINS.
// Las peticiones sin Origin (apps móviles, curl, health checks) no son de navegador y se permiten.
const isAllowedOrigin = (origin) =>
  !origin ||
  env.corsOrigins.includes(origin) ||
  (!env.isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin));

module.exports = { isAllowedOrigin };
