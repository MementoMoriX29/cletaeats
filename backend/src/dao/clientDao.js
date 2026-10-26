const pool = require('../config/db');

const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];
};

const findAll          = ()      => _rows('CALL sp_list_clients()');
const findById         = (id)    => _rows('CALL sp_get_client_by_id(?)', [id]);
const findByNationalId = (nid)   => _rows('CALL sp_get_client_by_national_id(?)', [nid]);
const findByEmail      = (email) => _rows('CALL sp_get_client_by_email(?)', [email]);

const insert = async ({ national_id, name, address, card_last4, phone, email, password }) => {
  const [results] = await pool.query(
    'CALL sp_create_client(?,?,?,?,?,?,?)',
    [national_id, name, address, card_last4, phone, email, password]
  );
  return [{ insertId: results[0][0].insertId, affectedRows: 1 }, []];
};

const update = async (id, { name, address, card_last4, phone, email }) => {
  const [results] = await pool.query(
    'CALL sp_update_client(?,?,?,?,?,?)',
    [id, name, address, card_last4, phone, email]
  );
  return [{ affectedRows: results[0][0].affectedRows }, []];
};

const updateStatus = async (id, status) => {
  const [results] = await pool.query('CALL sp_update_client_status(?,?)', [id, status]);
  return [{ affectedRows: results[0][0].affectedRows }, []];
};

const findActive     = () => _rows('CALL sp_list_active_clients()');
const findSuspended  = () => _rows('CALL sp_list_suspended_clients()');
const findMostOrders = () => _rows('CALL sp_report_clients_most_orders()');

module.exports = {
  findAll, findById, findByNationalId, findByEmail,
  insert, update, updateStatus,
  findActive, findSuspended, findMostOrders,
};
