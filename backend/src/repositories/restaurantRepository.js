const dao      = require('../dao/restaurantDao');
const comboDao = require('../dao/comboDao');

const getAll     = async () => { const [rows] = await dao.findAll();    return rows; };
const getById    = async (id)  => { const [rows] = await dao.findById(id); return rows[0] ?? null; };
const getByTaxId = async (tid) => { const [rows] = await dao.findByTaxId(tid); return rows[0] ?? null; };

const create = async (data) => { const [result] = await dao.insert(data); return result.insertId; };
const update = async (id, data) => { const [result] = await dao.update(id, data); return result.affectedRows; };
const remove = async (id) => { const [result] = await dao.remove(id); return result.affectedRows; };

const getCombos = async (restaurantId) => {
  const [rows] = await comboDao.findByRestaurant(restaurantId);
  return rows;
};

const getComboById = async (id) => {
  const [rows] = await comboDao.findById(id);
  return rows[0] ?? null;
};

const getComboByNumber = async (restaurantId, numero) => {
  const [rows] = await comboDao.findByRestaurantAndNumber(restaurantId, numero);
  return rows[0] ?? null;
};

const createCombo = async (restaurantId, data) => comboDao.insert(restaurantId, data);
const updateCombo = async (id, data) => comboDao.updateById(id, data);
const removeCombo = async (id) => comboDao.deleteById(id);

const getMostOrders        = async () => { const [rows] = await dao.findMostOrders();        return rows[0] ?? null; };
const getLeastOrders       = async () => { const [rows] = await dao.findLeastOrders();       return rows[0] ?? null; };
const getSalesByRestaurant = async () => { const [rows] = await dao.findSalesByRestaurant(); return rows; };
const getTotalSales        = async () => { const [rows] = await dao.findTotalSales();        return rows[0] ?? null; };

module.exports = {
  getAll, getById, getByTaxId, create, update, remove,
  getCombos, getComboById, getComboByNumber, createCombo, updateCombo, removeCombo,
  getMostOrders, getLeastOrders, getSalesByRestaurant, getTotalSales,
};
