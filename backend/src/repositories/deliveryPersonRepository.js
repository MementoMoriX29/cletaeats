const dao = require('../dao/deliveryPersonDao');

const getAll          = async ()      => { const [rows] = await dao.findAll();          return rows; };
const getAllWithStats  = async ()      => { const [rows] = await dao.findAllWithStats();  return rows; };
const getRating       = async (id)    => { const [rows] = await dao.findRating(id);      return rows[0] ?? { avg_rating: 0, total_complaints: 0 }; };
const getById         = async (id)    => { const [rows] = await dao.findById(id);       return rows[0] ?? null; };
const getByNationalId = async (nid)   => { const [rows] = await dao.findByNationalId(nid); return rows[0] ?? null; };
const getByEmail      = async (email) => { const [rows] = await dao.findByEmail(email); return rows[0] ?? null; };
const getAvailable    = async ()      => { const [rows] = await dao.findAvailable();    return rows[0] ?? null; };
const getNoWarnings   = async ()      => { const [rows] = await dao.findNoWarnings();   return rows; };
const getWithComplaints = async ()    => { const [rows] = await dao.findWithComplaints(); return rows; };

const create = async (data) => { const [result] = await dao.insert(data); return result.insertId; };
const update = async (id, data) => { const [result] = await dao.update(id, data); return result.affectedRows; };

const updateStatus = async (id, status) => {
  const [result] = await dao.updateStatus(id, status);
  return result.affectedRows;
};

const incrementWarning = async (id) => {
  const [result] = await dao.incrementWarning(id);
  return result;
};

const updateDailyKm = async (id, km) => {
  await dao.updateDailyKm(id, km);
};

module.exports = {
  getAll, getAllWithStats, getRating,
  getById, getByNationalId, getByEmail, getAvailable,
  create, update, updateStatus, incrementWarning, updateDailyKm,
  getNoWarnings, getWithComplaints,
};
