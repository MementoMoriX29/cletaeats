// Datos de la cuenta y direcciones guardadas del cliente.
const accountDao = require('../dao/accountDao');
const addressDao = require('../dao/addressDao');
const { toUser } = require('./authService');
const { notFound } = require('../utils/errors');

const toAddress = (row) => ({
  id: row.id,
  label: row.label,
  line: row.line,
  details: row.details,
  lat: row.lat,
  lng: row.lng,
});

module.exports = {
  getMe: async (userId) => toUser(await accountDao.getById(userId)),
  updateMe: async (userId, data) => toUser(await accountDao.updateProfile(userId, data)),

  listAddresses: async (clientId) => (await addressDao.list(clientId)).map(toAddress),
  createAddress: async (clientId, data) => toAddress(await addressDao.create(clientId, data)),
  async updateAddress(clientId, id, data) {
    const row = await addressDao.update(id, clientId, data);
    if (!row) throw notFound('Dirección no encontrada');
    return toAddress(row);
  },
  async deleteAddress(clientId, id) {
    if (!(await addressDao.remove(id, clientId))) throw notFound('Dirección no encontrada');
  },
};
