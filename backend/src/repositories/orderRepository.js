const dao = require('../dao/orderDao');

const getById    = async (id)       => { const [rows] = await dao.findById(id);     return rows[0] ?? null; };
const getByClient = async (clientId) => { const [rows] = await dao.findByClient(clientId); return rows; };
const getItems   = async (orderId)  => { const [rows] = await dao.findItems(orderId); return rows; };
const getInvoice = async (orderId)  => { const [rows] = await dao.findInvoice(orderId); return rows[0] ?? null; };
const getOrdersByClient     = async ()                 => { const [rows] = await dao.findOrdersByClient();                     return rows; };
const getPeakHours          = async ()                 => { const [rows] = await dao.findPeakHours();                           return rows; };
const getDeliveriesByPerson = async (deliveryPersonId) => { const [rows] = await dao.findDeliveriesByPerson(deliveryPersonId); return rows; };
const getActiveOrderByDeliveryPerson = async (deliveryPersonId) => { const [rows] = await dao.findActiveByDeliveryPerson(deliveryPersonId); return rows[0] ?? null; };

const create = async (data) => { const [result] = await dao.insert(data); return result.insertId; };

const addItem = async (orderId, comboId, quantity) => {
  await dao.insertItem(orderId, comboId, quantity);
};

const updateStatus = async (id, status) => {
  const [result] = await dao.updateStatus(id, status);
  return result.affectedRows;
};

const createInvoice = async (data) => {
  const [result] = await dao.insertInvoice(data);
  return result.insertId;
};

module.exports = {
  getById, getByClient, create, addItem, getItems,
  updateStatus, createInvoice, getInvoice,
  getOrdersByClient, getPeakHours, getDeliveriesByPerson, getActiveOrderByDeliveryPerson,
};
