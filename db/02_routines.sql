-- CletaEats · Funciones y procedimientos almacenados
-- MySQL 8.0+ (probado en MySQL 8.0 y compatible con HeatWave MySQL).
-- Orden de ejecución: 01_schema.sql → 02_routines.sql → 03_seed.sql (se cargan con: cd backend && npm run db:setup)

DELIMITER //

-- ── FUNCTIONS ──────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS fn_calculate_combo_price //
CREATE FUNCTION fn_calculate_combo_price(p_number INT)
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN (p_number + 3) * 1000;
END //

DROP FUNCTION IF EXISTS fn_calculate_transport_cost //
CREATE FUNCTION fn_calculate_transport_cost(p_distance DECIMAL(8,2), p_is_holiday TINYINT(1))
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN p_distance * IF(p_is_holiday, 1500, 1000);
END //

DROP FUNCTION IF EXISTS fn_calculate_iva //
CREATE FUNCTION fn_calculate_iva(p_subtotal DECIMAL(10,2))
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN ROUND(p_subtotal * 0.13, 2);
END //

DROP FUNCTION IF EXISTS fn_calculate_total //
CREATE FUNCTION fn_calculate_total(p_subtotal DECIMAL(10,2), p_transport DECIMAL(10,2))
RETURNS DECIMAL(10,2) DETERMINISTIC
BEGIN
  RETURN p_subtotal + p_transport + fn_calculate_iva(p_subtotal);
END //

-- ── CLIENT STORED PROCEDURES ──────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_list_clients //
CREATE PROCEDURE sp_list_clients()
BEGIN
  SELECT id, national_id, name, address, card_last4, phone, email, status, created_at
  FROM client ORDER BY name;
END //

DROP PROCEDURE IF EXISTS sp_get_client_by_id //
CREATE PROCEDURE sp_get_client_by_id(IN p_id INT)
BEGIN
  SELECT id, national_id, name, address, card_last4, phone, email, status, created_at
  FROM client WHERE id = p_id;
END //

DROP PROCEDURE IF EXISTS sp_get_client_by_national_id //
CREATE PROCEDURE sp_get_client_by_national_id(IN p_national_id VARCHAR(20))
BEGIN
  SELECT * FROM client WHERE national_id = p_national_id COLLATE utf8mb4_unicode_ci;
END //

DROP PROCEDURE IF EXISTS sp_get_client_by_email //
CREATE PROCEDURE sp_get_client_by_email(IN p_email VARCHAR(100))
BEGIN
  SELECT * FROM client WHERE email = p_email COLLATE utf8mb4_unicode_ci;
END //

DROP PROCEDURE IF EXISTS sp_create_client //
CREATE PROCEDURE sp_create_client(
  IN p_national_id VARCHAR(20),
  IN p_name        VARCHAR(100),
  IN p_address     TEXT,
  IN p_card_last4  CHAR(4),
  IN p_phone       VARCHAR(20),
  IN p_email       VARCHAR(100),
  IN p_password    VARCHAR(255)
)
BEGIN
  INSERT INTO client (national_id, name, address, card_last4, phone, email, password)
  VALUES (p_national_id, p_name, p_address, p_card_last4, p_phone, p_email, p_password);
  SELECT LAST_INSERT_ID() AS insertId;
END //

DROP PROCEDURE IF EXISTS sp_update_client //
CREATE PROCEDURE sp_update_client(
  IN p_id          INT,
  IN p_name        VARCHAR(100),
  IN p_address     TEXT,
  IN p_card_last4  CHAR(4),
  IN p_phone       VARCHAR(20),
  IN p_email       VARCHAR(100)
)
BEGIN
  UPDATE client
  SET name = p_name, address = p_address, card_last4 = p_card_last4,
      phone = p_phone, email = p_email
  WHERE id = p_id;
  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS sp_update_client_status //
CREATE PROCEDURE sp_update_client_status(IN p_id INT, IN p_status VARCHAR(20))
BEGIN
  UPDATE client SET status = p_status WHERE id = p_id;
  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS sp_list_active_clients //
CREATE PROCEDURE sp_list_active_clients()
BEGIN
  SELECT id, national_id, name, email, phone, status, created_at
  FROM client WHERE status = 'active' ORDER BY name;
END //

DROP PROCEDURE IF EXISTS sp_list_suspended_clients //
CREATE PROCEDURE sp_list_suspended_clients()
BEGIN
  SELECT id, national_id, name, email, phone, status, created_at
  FROM client WHERE status = 'suspended' ORDER BY name;
END //

DROP PROCEDURE IF EXISTS sp_report_clients_most_orders //
CREATE PROCEDURE sp_report_clients_most_orders()
BEGIN
  SELECT c.id, c.name, c.email, c.status, COUNT(o.id) AS total_orders
  FROM client c
  LEFT JOIN client_order o ON c.id = o.client_id
  GROUP BY c.id
  ORDER BY total_orders DESC;
END //

-- ── RESTAURANT STORED PROCEDURES ─────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_list_restaurants //
CREATE PROCEDURE sp_list_restaurants()
BEGIN
  SELECT * FROM restaurant WHERE active = TRUE ORDER BY name;
END //

DROP PROCEDURE IF EXISTS sp_get_restaurant_by_id //
CREATE PROCEDURE sp_get_restaurant_by_id(IN p_id INT)
BEGIN
  SELECT * FROM restaurant WHERE id = p_id;
END //

DROP PROCEDURE IF EXISTS sp_get_restaurant_by_tax_id //
CREATE PROCEDURE sp_get_restaurant_by_tax_id(IN p_tax_id VARCHAR(20))
BEGIN
  SELECT * FROM restaurant WHERE tax_id = p_tax_id COLLATE utf8mb4_unicode_ci;
END //

DROP PROCEDURE IF EXISTS sp_create_restaurant //
CREATE PROCEDURE sp_create_restaurant(
  IN p_name        VARCHAR(100),
  IN p_tax_id      VARCHAR(20),
  IN p_address     TEXT,
  IN p_food_type   VARCHAR(50),
  IN p_image_url   TEXT,
  IN p_phone       VARCHAR(20),
  IN p_description TEXT,
  IN p_latitude    DECIMAL(10,7),
  IN p_longitude   DECIMAL(10,7)
)
BEGIN
  INSERT INTO restaurant (name, tax_id, address, food_type, image_url, phone, description, latitude, longitude)
  VALUES (p_name, p_tax_id, p_address, p_food_type, p_image_url, p_phone, p_description, p_latitude, p_longitude);
  SELECT LAST_INSERT_ID() AS insertId;
END //

DROP PROCEDURE IF EXISTS sp_update_restaurant //
CREATE PROCEDURE sp_update_restaurant(
  IN p_id          INT,
  IN p_name        VARCHAR(100),
  IN p_address     TEXT,
  IN p_food_type   VARCHAR(50),
  IN p_image_url   TEXT,
  IN p_phone       VARCHAR(20),
  IN p_description TEXT,
  IN p_latitude    DECIMAL(10,7),
  IN p_longitude   DECIMAL(10,7)
)
BEGIN
  UPDATE restaurant
  SET name=p_name, address=p_address, food_type=p_food_type,
      image_url=p_image_url, phone=p_phone, description=p_description,
      latitude=p_latitude, longitude=p_longitude
  WHERE id = p_id;
  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS sp_report_restaurant_most_orders //
CREATE PROCEDURE sp_report_restaurant_most_orders()
BEGIN
  SELECT r.id, r.name, r.food_type, COUNT(o.id) AS total_orders
  FROM restaurant r
  LEFT JOIN client_order o ON r.id = o.restaurant_id
  GROUP BY r.id
  ORDER BY total_orders DESC
  LIMIT 1;
END //

DROP PROCEDURE IF EXISTS sp_report_restaurant_least_orders //
CREATE PROCEDURE sp_report_restaurant_least_orders()
BEGIN
  SELECT r.id, r.name, r.food_type, COUNT(o.id) AS total_orders
  FROM restaurant r
  LEFT JOIN client_order o ON r.id = o.restaurant_id
  GROUP BY r.id
  ORDER BY total_orders ASC
  LIMIT 1;
END //

DROP PROCEDURE IF EXISTS sp_report_sales_by_restaurant //
CREATE PROCEDURE sp_report_sales_by_restaurant()
BEGIN
  SELECT r.name AS nombre, COALESCE(SUM(i.total), 0) AS total_ventas
  FROM restaurant r
  LEFT JOIN client_order o ON r.id = o.restaurant_id
  LEFT JOIN invoice i      ON o.id = i.order_id
  GROUP BY r.id
  ORDER BY total_ventas DESC;
END //

DROP PROCEDURE IF EXISTS sp_report_total_sales //
CREATE PROCEDURE sp_report_total_sales()
BEGIN
  SELECT COALESCE(SUM(total), 0) AS total_sales FROM invoice;
END //

-- ── COMBO STORED PROCEDURES ───────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_list_combos_by_restaurant //
CREATE PROCEDURE sp_list_combos_by_restaurant(IN p_restaurant_id INT)
BEGIN
  SELECT * FROM combo WHERE restaurant_id = p_restaurant_id ORDER BY combo_number;
END //

DROP PROCEDURE IF EXISTS sp_get_combo_by_id //
CREATE PROCEDURE sp_get_combo_by_id(IN p_id INT)
BEGIN
  SELECT * FROM combo WHERE id = p_id;
END //

DROP PROCEDURE IF EXISTS sp_get_combo_by_restaurant_and_number //
CREATE PROCEDURE sp_get_combo_by_restaurant_and_number(IN p_restaurant_id INT, IN p_number INT)
BEGIN
  SELECT * FROM combo WHERE restaurant_id = p_restaurant_id AND combo_number = p_number;
END //

-- ── DELIVERY PERSON STORED PROCEDURES ────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_list_delivery_persons //
CREATE PROCEDURE sp_list_delivery_persons()
BEGIN
  SELECT id, national_id, name, email, address, phone, card_last4,
         status, current_distance, daily_km, warnings_count, created_at
  FROM delivery_person ORDER BY name;
END //

DROP PROCEDURE IF EXISTS sp_get_delivery_person_by_id //
CREATE PROCEDURE sp_get_delivery_person_by_id(IN p_id INT)
BEGIN
  SELECT id, national_id, name, email, address, phone, card_last4,
         status, current_distance, daily_km,
         workday_km_rate, holiday_km_rate, warnings_count, created_at
  FROM delivery_person WHERE id = p_id;
END //

DROP PROCEDURE IF EXISTS sp_get_delivery_person_by_national_id //
CREATE PROCEDURE sp_get_delivery_person_by_national_id(IN p_national_id VARCHAR(20))
BEGIN
  SELECT * FROM delivery_person WHERE national_id = p_national_id COLLATE utf8mb4_unicode_ci;
END //

DROP PROCEDURE IF EXISTS sp_get_delivery_person_by_email //
CREATE PROCEDURE sp_get_delivery_person_by_email(IN p_email VARCHAR(100))
BEGIN
  SELECT * FROM delivery_person WHERE email = p_email COLLATE utf8mb4_unicode_ci;
END //

DROP PROCEDURE IF EXISTS sp_get_available_delivery_person //
CREATE PROCEDURE sp_get_available_delivery_person()
BEGIN
  SELECT * FROM delivery_person
  WHERE status = 'available' AND warnings_count < 4
  ORDER BY id ASC
  LIMIT 1;
END //

DROP PROCEDURE IF EXISTS sp_create_delivery_person //
CREATE PROCEDURE sp_create_delivery_person(
  IN p_national_id VARCHAR(20),
  IN p_name        VARCHAR(100),
  IN p_email       VARCHAR(100),
  IN p_password    VARCHAR(255),
  IN p_address     TEXT,
  IN p_phone       VARCHAR(20),
  IN p_card_last4  CHAR(4)
)
BEGIN
  INSERT INTO delivery_person (national_id, name, email, password, address, phone, card_last4)
  VALUES (p_national_id, p_name, p_email, p_password, p_address, p_phone, p_card_last4);
  SELECT LAST_INSERT_ID() AS insertId;
END //

DROP PROCEDURE IF EXISTS sp_update_delivery_person //
CREATE PROCEDURE sp_update_delivery_person(
  IN p_id          INT,
  IN p_name        VARCHAR(100),
  IN p_email       VARCHAR(100),
  IN p_address     TEXT,
  IN p_phone       VARCHAR(20),
  IN p_card_last4  CHAR(4)
)
BEGIN
  UPDATE delivery_person
  SET name = p_name, email = p_email, address = p_address,
      phone = p_phone, card_last4 = p_card_last4
  WHERE id = p_id;
  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS sp_update_delivery_person_status //
CREATE PROCEDURE sp_update_delivery_person_status(IN p_id INT, IN p_status VARCHAR(20))
BEGIN
  UPDATE delivery_person SET status = p_status WHERE id = p_id;
  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS sp_increment_warning //
CREATE PROCEDURE sp_increment_warning(IN p_id INT)
BEGIN
  DECLARE v_rows INT;
  UPDATE delivery_person SET warnings_count = warnings_count + 1 WHERE id = p_id;
  SET v_rows = ROW_COUNT();
  UPDATE delivery_person SET status = 'suspended' WHERE id = p_id AND warnings_count >= 4;
  SELECT v_rows AS affectedRows, warnings_count, status FROM delivery_person WHERE id = p_id;
END //

DROP PROCEDURE IF EXISTS sp_update_daily_km //
CREATE PROCEDURE sp_update_daily_km(IN p_id INT, IN p_km DECIMAL(8,2))
BEGIN
  UPDATE delivery_person
  SET daily_km = daily_km + p_km, current_distance = p_km
  WHERE id = p_id;
  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS sp_list_delivery_persons_no_warnings //
CREATE PROCEDURE sp_list_delivery_persons_no_warnings()
BEGIN
  SELECT id, national_id, name, email, status, warnings_count
  FROM delivery_person WHERE warnings_count = 0 ORDER BY name;
END //

DROP PROCEDURE IF EXISTS sp_report_delivery_persons_complaints //
CREATE PROCEDURE sp_report_delivery_persons_complaints()
BEGIN
  SELECT dp.id, dp.name, dp.email, dp.status,
         COUNT(c.id) AS total_complaints,
         dp.warnings_count
  FROM delivery_person dp
  LEFT JOIN complaint c ON dp.id = c.delivery_person_id
  GROUP BY dp.id
  ORDER BY total_complaints DESC;
END //

-- ── COMPLAINT STORED PROCEDURES ───────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_list_complaints_by_delivery_person //
CREATE PROCEDURE sp_list_complaints_by_delivery_person(IN p_delivery_person_id INT)
BEGIN
  SELECT cp.*, cl.name AS client_name
  FROM complaint cp
  JOIN client cl ON cp.client_id = cl.id
  WHERE cp.delivery_person_id = p_delivery_person_id
  ORDER BY cp.created_at DESC;
END //

DROP PROCEDURE IF EXISTS sp_list_complaints_by_order //
CREATE PROCEDURE sp_list_complaints_by_order(IN p_order_id INT)
BEGIN
  SELECT * FROM complaint WHERE order_id = p_order_id;
END //

DROP PROCEDURE IF EXISTS sp_create_complaint //
CREATE PROCEDURE sp_create_complaint(
  IN p_delivery_person_id INT,
  IN p_client_id          INT,
  IN p_order_id           INT,
  IN p_description        TEXT,
  IN p_friendliness       TINYINT,
  IN p_response_time      TINYINT,
  IN p_presentation       TINYINT,
  IN p_adds_warning       BOOLEAN
)
BEGIN
  INSERT INTO complaint
    (delivery_person_id, client_id, order_id, description,
     friendliness, response_time, presentation, adds_warning)
  VALUES
    (p_delivery_person_id, p_client_id, p_order_id, p_description,
     p_friendliness, p_response_time, p_presentation, p_adds_warning);
  SELECT LAST_INSERT_ID() AS insertId;
END //

-- ── ORDER STORED PROCEDURES ───────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_get_order_by_id //
CREATE PROCEDURE sp_get_order_by_id(IN p_id INT)
BEGIN
  SELECT o.*,
         cl.name      AS client_name,
         r.name       AS restaurant_name,
         r.address    AS restaurant_address,
         r.latitude   AS restaurant_latitude,
         r.longitude  AS restaurant_longitude,
         dp.name      AS delivery_person_name
  FROM client_order o
  JOIN client      cl ON o.client_id          = cl.id
  JOIN restaurant  r  ON o.restaurant_id      = r.id
  LEFT JOIN delivery_person dp ON o.delivery_person_id = dp.id
  WHERE o.id = p_id;
END //

DROP PROCEDURE IF EXISTS sp_list_orders_by_client //
CREATE PROCEDURE sp_list_orders_by_client(IN p_client_id INT)
BEGIN
  SELECT o.*, r.name AS restaurant_name
  FROM client_order o
  JOIN restaurant r ON o.restaurant_id = r.id
  WHERE o.client_id = p_client_id
  ORDER BY o.created_at DESC;
END //

DROP PROCEDURE IF EXISTS sp_create_order //
CREATE PROCEDURE sp_create_order(
  IN p_client_id          INT,
  IN p_restaurant_id      INT,
  IN p_delivery_person_id INT,
  IN p_distance_km        DECIMAL(8,2),
  IN p_is_holiday         BOOLEAN,
  IN p_delivery_address   TEXT,
  IN p_notes              TEXT
)
BEGIN
  INSERT INTO client_order (client_id, restaurant_id, delivery_person_id, distance_km, is_holiday, delivery_address, notes)
  VALUES (p_client_id, p_restaurant_id, p_delivery_person_id, p_distance_km, p_is_holiday, p_delivery_address, p_notes);
  SELECT LAST_INSERT_ID() AS insertId;
END //

DROP PROCEDURE IF EXISTS sp_add_order_item //
CREATE PROCEDURE sp_add_order_item(
  IN p_order_id INT,
  IN p_combo_id INT,
  IN p_quantity INT
)
BEGIN
  INSERT INTO order_item (order_id, combo_id, quantity) VALUES (p_order_id, p_combo_id, p_quantity);
  SELECT LAST_INSERT_ID() AS insertId;
END //

DROP PROCEDURE IF EXISTS sp_list_deliveries_by_delivery_person //
CREATE PROCEDURE sp_list_deliveries_by_delivery_person(IN p_delivery_person_id INT)
BEGIN
  SELECT o.*,
         r.name AS restaurant_name,
         c.name AS client_name
  FROM client_order o
  JOIN restaurant r ON o.restaurant_id = r.id
  JOIN client     c ON o.client_id     = c.id
  WHERE o.delivery_person_id = p_delivery_person_id
    AND o.status = 'delivered'
  ORDER BY o.delivered_at DESC;
END //

DROP PROCEDURE IF EXISTS sp_list_order_items //
CREATE PROCEDURE sp_list_order_items(IN p_order_id INT)
BEGIN
  SELECT oi.id, oi.order_id, oi.combo_id, oi.quantity,
         c.description, c.price, c.combo_number, c.image_url
  FROM order_item oi
  JOIN combo c ON oi.combo_id = c.id
  WHERE oi.order_id = p_order_id;
END //

DROP PROCEDURE IF EXISTS sp_update_order_status //
CREATE PROCEDURE sp_update_order_status(IN p_id INT, IN p_status VARCHAR(30))
BEGIN
  UPDATE client_order
  SET status       = p_status,
      delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END
  WHERE id = p_id;
  SELECT ROW_COUNT() AS affectedRows;
END //

DROP PROCEDURE IF EXISTS sp_create_invoice //
CREATE PROCEDURE sp_create_invoice(
  IN p_order_id       INT,
  IN p_subtotal       DECIMAL(10,2),
  IN p_transport_cost DECIMAL(10,2),
  IN p_iva            DECIMAL(10,2),
  IN p_total          DECIMAL(10,2)
)
BEGIN
  INSERT INTO invoice (order_id, subtotal, transport_cost, iva, total)
  VALUES (p_order_id, p_subtotal, p_transport_cost, p_iva, p_total);
  SELECT LAST_INSERT_ID() AS insertId;
END //

DROP PROCEDURE IF EXISTS sp_get_invoice //
CREATE PROCEDURE sp_get_invoice(IN p_order_id INT)
BEGIN
  SELECT * FROM invoice WHERE order_id = p_order_id;
END //

DROP PROCEDURE IF EXISTS sp_report_orders_by_client //
CREATE PROCEDURE sp_report_orders_by_client()
BEGIN
  SELECT c.name AS cliente_nombre, COUNT(o.id) AS total_pedidos
  FROM client c
  LEFT JOIN client_order o ON c.id = o.client_id
  GROUP BY c.id
  ORDER BY total_pedidos DESC;
END //

DROP PROCEDURE IF EXISTS sp_report_peak_hours //
CREATE PROCEDURE sp_report_peak_hours()
BEGIN
  SELECT HOUR(placed_at) AS hora, COUNT(*) AS total_pedidos
  FROM client_order
  GROUP BY hora
  ORDER BY total_pedidos DESC;
END //

DELIMITER ;
