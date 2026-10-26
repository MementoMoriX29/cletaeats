const pool = require('../config/db');

const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];
};

const findAll      = ()     => _rows('CALL sp_list_restaurants()');
const findById     = (id)   => _rows('CALL sp_get_restaurant_by_id(?)', [id]);
const findByTaxId  = (tid)  => _rows('CALL sp_get_restaurant_by_tax_id(?)', [tid]);

const insert = async ({ name, tax_id, address, food_type, image_url, phone, description, latitude, longitude }) => {
  const [results] = await pool.query(
    'CALL sp_create_restaurant(?,?,?,?,?,?,?,?,?)',
    [name, tax_id, address, food_type, image_url || null, phone || null, description || null, latitude ?? null, longitude ?? null]
  );
  return [{ insertId: results[0][0].insertId, affectedRows: 1 }, []];
};

const update = async (id, { name, address, food_type, image_url, phone, description, latitude, longitude }) => {
  const [results] = await pool.query(
    'CALL sp_update_restaurant(?,?,?,?,?,?,?,?,?)',
    [id, name, address, food_type, image_url || null, phone || null, description || null, latitude ?? null, longitude ?? null]
  );
  return [{ affectedRows: results[0][0].affectedRows }, []];
};

const remove = async (id) => {
  const [result] = await pool.query('UPDATE restaurant SET active = FALSE WHERE id = ?', [id]);
  return [{ affectedRows: result.affectedRows }, []];
};

const findMostOrders        = () => _rows('CALL sp_report_restaurant_most_orders()');
const findLeastOrders       = () => _rows('CALL sp_report_restaurant_least_orders()');
const findSalesByRestaurant = () => _rows('CALL sp_report_sales_by_restaurant()');
const findTotalSales        = () => _rows('CALL sp_report_total_sales()');

module.exports = {
  findAll, findById, findByTaxId, insert, update, remove,
  findMostOrders, findLeastOrders, findSalesByRestaurant, findTotalSales,
};
