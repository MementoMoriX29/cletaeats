const pool = require('../config/db');

const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];
};

const findAll = () => _rows('CALL sp_list_delivery_persons()');

const findAllWithStats = async () => {
  const [results] = await pool.query(
    `SELECT dp.id, dp.national_id, dp.name, dp.email, dp.address, dp.phone, dp.card_last4,
       dp.status, dp.current_distance, dp.daily_km, dp.warnings_count, dp.created_at,
       COALESCE(ROUND(AVG((c.friendliness + c.response_time + c.presentation) / 3.0), 1), 0) AS avg_rating,
       COUNT(c.id) AS total_complaints
     FROM delivery_person dp
     LEFT JOIN complaint c ON dp.id = c.delivery_person_id
     GROUP BY dp.id
     ORDER BY dp.name`
  );
  return [results, []];
};

const findRating = async (id) => {
  const [results] = await pool.query(
    `SELECT
       COALESCE(ROUND(AVG((c.friendliness + c.response_time + c.presentation) / 3.0), 1), 0) AS avg_rating,
       COUNT(c.id) AS total_complaints
     FROM complaint c
     WHERE c.delivery_person_id = ?`,
    [id]
  );
  return [results, []];
};
const findById         = (id)    => _rows('CALL sp_get_delivery_person_by_id(?)', [id]);
const findByNationalId = (nid)   => _rows('CALL sp_get_delivery_person_by_national_id(?)', [nid]);
const findByEmail      = (email) => _rows('CALL sp_get_delivery_person_by_email(?)', [email]);
const findAvailable    = ()      => _rows('CALL sp_get_available_delivery_person()');

const insert = async ({ national_id, name, email, password, address, phone, card_last4 }) => {
  const [results] = await pool.query(
    'CALL sp_create_delivery_person(?,?,?,?,?,?,?)',
    [national_id, name, email, password, address, phone, card_last4]
  );
  return [{ insertId: results[0][0].insertId, affectedRows: 1 }, []];
};

const update = async (id, { name, email, address, phone, card_last4 }) => {
  const [results] = await pool.query(
    'CALL sp_update_delivery_person(?,?,?,?,?,?)',
    [id, name, email, address, phone, card_last4]
  );
  return [{ affectedRows: results[0][0].affectedRows }, []];
};

const updateStatus = async (id, status) => {
  const [results] = await pool.query('CALL sp_update_delivery_person_status(?,?)', [id, status]);
  return [{ affectedRows: results[0][0].affectedRows }, []];
};

const incrementWarning = async (id) => {
  const [results] = await pool.query('CALL sp_increment_warning(?)', [id]);
  const row = results[0][0] ?? {};
  return [{ affectedRows: row.affectedRows ?? 0, warnings_count: row.warnings_count, status: row.status }, []];
};

const updateDailyKm = async (id, km) => {
  const [results] = await pool.query('CALL sp_update_daily_km(?,?)', [id, km]);
  return [{ affectedRows: results[0][0].affectedRows }, []];
};

const findNoWarnings     = () => _rows('CALL sp_list_delivery_persons_no_warnings()');
const findWithComplaints = () => _rows('CALL sp_report_delivery_persons_complaints()');

module.exports = {
  findAll, findAllWithStats, findRating,
  findById, findByNationalId, findByEmail, findAvailable,
  insert, update, updateStatus, incrementWarning, updateDailyKm,
  findNoWarnings, findWithComplaints,
};
