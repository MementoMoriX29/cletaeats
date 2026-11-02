// Autenticación y autorización de las rutas.
const { authenticateToken } = require('../services/tokenService');
const { forbidden } = require('../utils/errors');

// Exige "Authorization: Bearer <token>" y deja la cuenta en req.user.
const authenticate = async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  req.user = await authenticateToken(scheme === 'Bearer' ? token : null);
  next();
};

const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) return next(forbidden());
  next();
};

// Para repartidores: la solicitud tiene que estar aprobada.
const requireActive = (req, _res, next) => {
  if (req.user?.status !== 'active') {
    return next(forbidden('Tu cuenta todavía no está habilitada para esta acción'));
  }
  next();
};

module.exports = { authenticate, requireRole, requireActive };
