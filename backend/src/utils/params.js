// Lectura de ids en la URL. Un id inválido responde 404, igual que uno que no existe.
const { notFound } = require('./errors');

const parseId = (value, message) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw notFound(message);
  return id;
};

module.exports = { parseId };
