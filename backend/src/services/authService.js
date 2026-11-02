// Registro, inicio de sesión y cambio de contraseña. Un solo login para todos los roles:
// el rol sale de la cuenta, no de lo que elija el usuario en pantalla.
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const accountDao = require('../dao/accountDao');
const { signToken } = require('./tokenService');
const { unauthorized, forbidden, badRequest } = require('../utils/errors');

// Si el correo no existe igual se ejecuta bcrypt contra este hash, así el tiempo de respuesta
// no revela qué correos tienen cuenta.
const DUMMY_HASH = bcrypt.hashSync('cletaeats-dummy-password', env.bcryptRounds);

const toUser = (account) => ({
  id: account.id,
  name: account.name,
  email: account.email,
  phone: account.phone,
  role: account.role,
  status: account.status,
});

const session = (account) => ({ token: signToken(account), user: toUser(account) });

const login = async ({ email, password }) => {
  const account = await accountDao.getCredentialsByEmail(email);
  const matches = await bcrypt.compare(password, account?.password_hash ?? DUMMY_HASH);
  if (!account || !matches) throw unauthorized('Correo o contraseña incorrectos');
  if (account.status === 'suspended') throw forbidden('Tu cuenta está suspendida. Contactá a soporte.');

  await accountDao.touchLogin(account.id);
  return session(account);
};

const registerClient = async ({ name, email, phone, password }) => {
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const account = await accountDao.createClient({ email, passwordHash, name, phone });
  return session(account);
};

// La solicitud queda pendiente. Con la sesión puede ver el estado de su solicitud, pero no tomar pedidos.
const registerCourier = async ({ name, email, phone, password, national_id, vehicle }) => {
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const account = await accountDao.createCourier({
    email, passwordHash, name, phone, nationalId: national_id, vehicle,
  });
  return { ...session(account), message: 'Recibimos tu solicitud. Te avisamos cuando esté aprobada.' };
};

// Devuelve una sesión nueva: las sesiones abiertas en otros dispositivos se cierran.
const changePassword = async (userId, { current_password, new_password }) => {
  const account = await accountDao.getCredentialsById(userId);
  if (!(await bcrypt.compare(current_password, account.password_hash))) {
    throw badRequest('La contraseña actual no es correcta', { fields: { current_password: 'No es correcta' } });
  }
  if (current_password === new_password) {
    throw badRequest('La contraseña nueva tiene que ser distinta', { fields: { new_password: 'Es igual a la actual' } });
  }
  await accountDao.updatePassword(userId, await bcrypt.hash(new_password, env.bcryptRounds));
  return session(await accountDao.getById(userId));
};

module.exports = { login, registerClient, registerCourier, changePassword, toUser };
