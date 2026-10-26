const pool = require('../config/db');

const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];
};

const findByDeliveryPerson = (dpId)    => _rows('CALL sp_list_complaints_by_delivery_person(?)', [dpId]);
const findByOrder          = (orderId) => _rows('CALL sp_list_complaints_by_order(?)', [orderId]);

const insert = async ({
  delivery_person_id, client_id, order_id,
  description, friendliness, response_time, presentation, adds_warning,
}) => {
  const [results] = await pool.query(
    'CALL sp_create_complaint(?,?,?,?,?,?,?,?)',
    [delivery_person_id, client_id, order_id, description,
      friendliness, response_time, presentation, adds_warning ? 1 : 0]
  );
  return [{ insertId: results[0][0].insertId, affectedRows: 1 }, []];
};

module.exports = { findByDeliveryPerson, findByOrder, insert };
