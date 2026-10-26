const pool = require('../config/db');

const _rows = async (sql, params = []) => {
  const [results] = await pool.query(sql, params);
  return [results[0], []];
};

const findById     = (id)       => _rows('CALL sp_get_order_by_id(?)', [id]);
const findByClient = (clientId) => _rows('CALL sp_list_orders_by_client(?)', [clientId]);

const insert = async ({ client_id, restaurant_id, delivery_person_id, distance_km, is_holiday, delivery_address, notes }) => {
  const [results] = await pool.query(
    'CALL sp_create_order(?,?,?,?,?,?,?)',
    [client_id, restaurant_id, delivery_person_id ?? null, distance_km, is_holiday ? 1 : 0,
     delivery_address ?? null, notes ?? null]
  );
  return [{ insertId: results[0][0].insertId, affectedRows: 1 }, []];
};

const insertItem = async (orderId, comboId, quantity) => {
  await pool.query('CALL sp_add_order_item(?,?,?)', [orderId, comboId, quantity]);
};

const findItems = (orderId) => _rows('CALL sp_list_order_items(?)', [orderId]);

const updateStatus = async (id, status) => {
  const [results] = await pool.query('CALL sp_update_order_status(?,?)', [id, status]);
  return [{ affectedRows: results[0][0].affectedRows }, []];
};

const insertInvoice = async ({ order_id, subtotal, transport_cost, iva, total }) => {
  const [results] = await pool.query(
    'CALL sp_create_invoice(?,?,?,?,?)',
    [order_id, subtotal, transport_cost, iva, total]
  );
  return [{ insertId: results[0][0].insertId, affectedRows: 1 }, []];
};

const findInvoice              = (orderId)          => _rows('CALL sp_get_invoice(?)', [orderId]);
const findOrdersByClient       = ()                  => _rows('CALL sp_report_orders_by_client()');
const findPeakHours            = ()                  => _rows('CALL sp_report_peak_hours()');
const findDeliveriesByPerson   = (deliveryPersonId)  => _rows('CALL sp_list_deliveries_by_delivery_person(?)', [deliveryPersonId]);

const findActiveByDeliveryPerson = async (deliveryPersonId) => {
  const [results] = await pool.query(
    `SELECT o.*, r.name AS restaurant_name, r.address AS restaurant_address,
            r.latitude AS restaurant_latitude, r.longitude AS restaurant_longitude,
            c.name AS client_name
     FROM client_order o
     JOIN restaurant r ON o.restaurant_id = r.id
     JOIN client     c ON o.client_id     = c.id
     WHERE o.delivery_person_id = ?
       AND o.status NOT IN ('delivered', 'suspended')
     ORDER BY o.placed_at DESC
     LIMIT 1`,
    [deliveryPersonId]
  );
  return [results, []];
};

module.exports = {
  findById, findByClient,
  insert, insertItem, findItems,
  updateStatus,
  insertInvoice, findInvoice,
  findOrdersByClient, findPeakHours,
  findDeliveriesByPerson, findActiveByDeliveryPerson,
};
