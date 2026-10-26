const dao = require('../dao/complaintDao');

const getByDeliveryPerson = async (dpId)    => { const [rows] = await dao.findByDeliveryPerson(dpId); return rows; };
const getByOrder          = async (orderId) => { const [rows] = await dao.findByOrder(orderId);        return rows; };
const create              = async (data)    => { const [result] = await dao.insert(data); return result.insertId; };

module.exports = { getByDeliveryPerson, getByOrder, create };
