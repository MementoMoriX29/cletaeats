// Emisión y verificación de los JWT de sesión.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const accountDao = require('../dao/accountDao');
const { unauthorized, forbidden } = require('../utils/errors');

// sub: id de la cuenta · role: rol · sv: versión de sesión (cambia al cambiar la contraseña)
const signToken = (account) =>
  jwt.sign({ sub: String(account.id), role: account.role, sv: account.session_version },
    env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });

const SESSION_EXPIRED = 'Tu sesión expiró. Iniciá sesión de nuevo.';

// Verifica la firma y además revisa la cuenta en la base: si fue suspendida o cambió la contraseña,
// el token deja de valer aunque no haya vencido.
const authenticateToken = async (token) => {
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized(SESSION_EXPIRED);
  }

  const account = await accountDao.getById(Number(payload.sub));
  if (!account || account.session_version !== payload.sv) throw unauthorized(SESSION_EXPIRED);
  if (account.status === 'suspended') throw forbidden('Tu cuenta está suspendida. Contactá a soporte.');

  return {
    id: account.id,
    role: account.role,
    status: account.status,
    name: account.name,
    email: account.email,
  };
};

module.exports = { signToken, authenticateToken };
