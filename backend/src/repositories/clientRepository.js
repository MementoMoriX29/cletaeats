const dao = require('../dao/clientDao');

const getAll          = async ()      => { const [rows] = await dao.findAll();          return rows; };
const getByNationalId = async (nid)   => { const [rows] = await dao.findByNationalId(nid); return rows[0] ?? null; };
const getByEmail      = async (email) => { const [rows] = await dao.findByEmail(email); return rows[0] ?? null; };
const getActive       = async ()      => { const [rows] = await dao.findActive();       return rows; };
const getSuspended    = async ()      => { const [rows] = await dao.findSuspended();    return rows; };
const getMostOrders   = async ()      => { const [rows] = await dao.findMostOrders();   return rows; };

const getById = async (id) => {
  const [rows] = await dao.findById(id);
  return rows[0] ?? null;
};

const create = async (data) => {
  const [result] = await dao.insert(data);
  return result.insertId;
};

const update = async (id, data) => {
  const [result] = await dao.update(id, data);
  return result.affectedRows;
};

const updateStatus = async (id, status) => {
  const [result] = await dao.updateStatus(id, status);
  return result.affectedRows;
};

module.exports = {
  getAll, getById, getByNationalId, getByEmail,
  create, update, updateStatus,
  getActive, getSuspended, getMostOrders,
};
