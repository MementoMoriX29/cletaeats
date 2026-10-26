const jwt = require('jsonwebtoken');
const env = require('../config/env');

const JWT_OPTIONS = { algorithms: ['HS256'] };

// Verifica un token y devuelve su payload ({ id, rol, ... }). Lanza si es inválido o expiró.
const verifyJwt = (token) => jwt.verify(token, env.jwtSecret, JWT_OPTIONS);

const signJwt = (payload) => jwt.sign(payload, env.jwtSecret, { algorithm: 'HS256', expiresIn: '2h' });

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = verifyJwt(authHeader.split(' ')[1]);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { verifyToken, verifyJwt, signJwt };
