const pool = require('../config/db');

const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];
};

const findByRestaurant = (restaurantId) =>
  _rows('CALL sp_list_combos_by_restaurant(?)', [restaurantId]);

const findById = (id) => _rows('CALL sp_get_combo_by_id(?)', [id]);

const findByRestaurantAndNumber = (restaurantId, number) =>
  _rows('CALL sp_get_combo_by_restaurant_and_number(?,?)', [restaurantId, number]);

const insert = async (restaurantId, { combo_number, description, price, image_url }) => {
  const [result] = await pool.query(
    'INSERT INTO combo (restaurant_id, combo_number, description, price, image_url) VALUES (?, ?, ?, ?, ?)',
    [restaurantId, combo_number, description, price, image_url || null]
  );
  return result.insertId;
};

const updateById = async (id, { description, image_url }) => {
  const [result] = await pool.query(
    'UPDATE combo SET description = ?, image_url = ? WHERE id = ?',
    [description, image_url || null, id]
  );
  return result.affectedRows;
};

const deleteById = async (id) => {
  const [result] = await pool.query('DELETE FROM combo WHERE id = ?', [id]);
  return result.affectedRows;
};

module.exports = { findByRestaurant, findById, findByRestaurantAndNumber, insert, updateById, deleteById };
