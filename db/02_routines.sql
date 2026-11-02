-- CletaEats · Procedimientos almacenados (versión 2)
--
-- La API no escribe SQL: cada operación llama a uno de estos procedimientos. Así las reglas que protegen
-- los datos (en qué estado se puede aceptar un pedido, que un pedido tenga un solo repartidor, quién es
-- dueño de qué) viven junto a los datos y corren dentro de una transacción. Además, la cuenta de MySQL
-- que usa la API en producción puede tener solo el permiso EXECUTE.
--
-- Errores de negocio: SIGNAL SQLSTATE '45000' con un código (ORDER_NOT_FOUND, ORDER_TAKEN…).
-- La API los traduce a respuestas HTTP en backend/src/utils/errors.js.
--
-- Los cambios de estado bloquean la fila del pedido con SELECT … FOR UPDATE antes de revisar el estado.
-- Si dos acciones llegan al mismo tiempo (dos repartidores aceptan el mismo pedido), la segunda espera,
-- ve el estado nuevo y falla con un error claro en vez de pisar a la primera.

DELIMITER //

-- ═══════════════════════════════════════════════════════════════
-- Cuentas
-- ═══════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS sp_account_get//
CREATE PROCEDURE sp_account_get(IN p_id INT)
BEGIN
  SELECT id, email, role, status, name, phone, session_version, created_at, last_login_at
  FROM account
  WHERE id = p_id;
END//

-- Solo estos dos procedimientos devuelven el hash de la contraseña.
DROP PROCEDURE IF EXISTS sp_account_get_credentials_by_email//
CREATE PROCEDURE sp_account_get_credentials_by_email(IN p_email VARCHAR(120))
BEGIN
  SELECT id, email, password_hash, role, status, name, phone, session_version
  FROM account
  WHERE email = p_email;
END//

DROP PROCEDURE IF EXISTS sp_account_get_credentials_by_id//
CREATE PROCEDURE sp_account_get_credentials_by_id(IN p_id INT)
BEGIN
  SELECT id, email, password_hash, role, status, name, phone, session_version
  FROM account
  WHERE id = p_id;
END//

DROP PROCEDURE IF EXISTS sp_account_create_client//
CREATE PROCEDURE sp_account_create_client(
  IN p_email VARCHAR(120), IN p_hash VARCHAR(100), IN p_name VARCHAR(100), IN p_phone VARCHAR(20))
BEGIN
  INSERT INTO account (email, password_hash, role, status, name, phone)
  VALUES (p_email, p_hash, 'client', 'active', p_name, p_phone);
  CALL sp_account_get(LAST_INSERT_ID());
END//

-- La solicitud de repartidor queda pendiente hasta que soporte la revise.
DROP PROCEDURE IF EXISTS sp_account_create_courier//
CREATE PROCEDURE sp_account_create_courier(
  IN p_email VARCHAR(120), IN p_hash VARCHAR(100), IN p_name VARCHAR(100), IN p_phone VARCHAR(20),
  IN p_national_id VARCHAR(20), IN p_vehicle VARCHAR(10))
BEGIN
  DECLARE v_id INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  INSERT INTO account (email, password_hash, role, status, name, phone)
  VALUES (p_email, p_hash, 'courier', 'pending', p_name, p_phone);
  SET v_id = LAST_INSERT_ID();
  INSERT INTO courier (account_id, national_id, vehicle) VALUES (v_id, p_national_id, p_vehicle);
  COMMIT;

  CALL sp_account_get(v_id);
END//

DROP PROCEDURE IF EXISTS sp_account_update_profile//
CREATE PROCEDURE sp_account_update_profile(IN p_id INT, IN p_name VARCHAR(100), IN p_phone VARCHAR(20))
BEGIN
  UPDATE account SET name = p_name, phone = p_phone WHERE id = p_id;
  CALL sp_account_get(p_id);
END//

-- Subir session_version invalida los tokens emitidos antes del cambio.
DROP PROCEDURE IF EXISTS sp_account_update_password//
CREATE PROCEDURE sp_account_update_password(IN p_id INT, IN p_hash VARCHAR(100))
BEGIN
  UPDATE account SET password_hash = p_hash, session_version = session_version + 1 WHERE id = p_id;
  SELECT session_version FROM account WHERE id = p_id;
END//

DROP PROCEDURE IF EXISTS sp_account_touch_login//
CREATE PROCEDURE sp_account_touch_login(IN p_id INT)
BEGIN
  UPDATE account SET last_login_at = NOW() WHERE id = p_id;
END//

-- Crea la cuenta de administración o le cambia la contraseña (npm run create-admin).
-- Nunca convierte en admin una cuenta que ya existe con otro rol.
DROP PROCEDURE IF EXISTS sp_admin_upsert//
CREATE PROCEDURE sp_admin_upsert(IN p_email VARCHAR(120), IN p_hash VARCHAR(100), IN p_name VARCHAR(100))
BEGIN
  DECLARE v_role VARCHAR(12);
  SET v_role = (SELECT role FROM account WHERE email = p_email);

  IF v_role IS NULL THEN
    INSERT INTO account (email, password_hash, role, status, name)
    VALUES (p_email, p_hash, 'admin', 'active', p_name);
    SELECT LAST_INSERT_ID() AS id, 'created' AS action;
  ELSEIF v_role = 'admin' THEN
    UPDATE account
       SET password_hash = p_hash, name = p_name, status = 'active', session_version = session_version + 1
     WHERE email = p_email;
    SELECT id, 'updated' AS action FROM account WHERE email = p_email;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'EMAIL_IN_USE';
  END IF;
END//

-- ═══════════════════════════════════════════════════════════════
-- Direcciones del cliente
-- ═══════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS sp_address_list//
CREATE PROCEDURE sp_address_list(IN p_client_id INT)
BEGIN
  SELECT id, label, line, details, lat, lng, created_at
  FROM address
  WHERE client_id = p_client_id
  ORDER BY created_at, id;
END//

DROP PROCEDURE IF EXISTS sp_address_get//
CREATE PROCEDURE sp_address_get(IN p_id INT, IN p_client_id INT)
BEGIN
  SELECT id, label, line, details, lat, lng, created_at
  FROM address
  WHERE id = p_id AND client_id = p_client_id;
END//

DROP PROCEDURE IF EXISTS sp_address_create//
CREATE PROCEDURE sp_address_create(
  IN p_client_id INT, IN p_label VARCHAR(30), IN p_line VARCHAR(200), IN p_details VARCHAR(150),
  IN p_lat DECIMAL(10,7), IN p_lng DECIMAL(10,7))
BEGIN
  IF (SELECT COUNT(*) FROM address WHERE client_id = p_client_id) >= 10 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ADDRESS_LIMIT';
  END IF;
  INSERT INTO address (client_id, label, line, details, lat, lng)
  VALUES (p_client_id, p_label, p_line, p_details, p_lat, p_lng);
  CALL sp_address_get(LAST_INSERT_ID(), p_client_id);
END//

DROP PROCEDURE IF EXISTS sp_address_update//
CREATE PROCEDURE sp_address_update(
  IN p_id INT, IN p_client_id INT, IN p_label VARCHAR(30), IN p_line VARCHAR(200), IN p_details VARCHAR(150),
  IN p_lat DECIMAL(10,7), IN p_lng DECIMAL(10,7))
BEGIN
  UPDATE address
     SET label = p_label, line = p_line, details = p_details, lat = p_lat, lng = p_lng
   WHERE id = p_id AND client_id = p_client_id;
  CALL sp_address_get(p_id, p_client_id);
END//

DROP PROCEDURE IF EXISTS sp_address_delete//
CREATE PROCEDURE sp_address_delete(IN p_id INT, IN p_client_id INT)
BEGIN
  DELETE FROM address WHERE id = p_id AND client_id = p_client_id;
  SELECT ROW_COUNT() AS affected;
END//

-- ═══════════════════════════════════════════════════════════════
-- Catálogo público
-- ═══════════════════════════════════════════════════════════════

-- p_search busca en el nombre, la categoría y los productos (la API escapa % y _).
DROP PROCEDURE IF EXISTS sp_restaurant_list//
CREATE PROCEDURE sp_restaurant_list(IN p_search VARCHAR(60), IN p_category VARCHAR(40))
BEGIN
  SELECT r.id, r.name, r.category, r.description, r.address, r.lat, r.lng, r.image_url,
         r.prep_minutes, r.is_open,
         COALESCE(v.rating_avg, 0)   AS rating_avg,
         COALESCE(v.rating_count, 0) AS rating_count
  FROM restaurant r
  LEFT JOIN v_restaurant_rating v ON v.restaurant_id = r.id
  WHERE r.active
    AND (p_category IS NULL OR r.category = p_category)
    AND (p_search IS NULL
         OR r.name     LIKE CONCAT('%', p_search, '%')
         OR r.category LIKE CONCAT('%', p_search, '%')
         OR EXISTS (SELECT 1 FROM product p
                     WHERE p.restaurant_id = r.id AND p.deleted_at IS NULL
                       AND p.name LIKE CONCAT('%', p_search, '%')))
  ORDER BY r.is_open DESC, rating_avg DESC, r.name;
END//

DROP PROCEDURE IF EXISTS sp_restaurant_categories//
CREATE PROCEDURE sp_restaurant_categories()
BEGIN
  SELECT category, COUNT(*) AS restaurants
  FROM restaurant
  WHERE active
  GROUP BY category
  ORDER BY restaurants DESC, category;
END//

-- Ficha del restaurante y su menú. Incluye los productos agotados para mostrarlos como "Agotado".
DROP PROCEDURE IF EXISTS sp_restaurant_get//
CREATE PROCEDURE sp_restaurant_get(IN p_id INT)
BEGIN
  SELECT r.id, r.name, r.category, r.description, r.address, r.lat, r.lng, r.phone, r.sinpe_phone,
         r.image_url, r.prep_minutes, r.is_open, r.active,
         COALESCE(v.rating_avg, 0)   AS rating_avg,
         COALESCE(v.rating_count, 0) AS rating_count
  FROM restaurant r
  LEFT JOIN v_restaurant_rating v ON v.restaurant_id = r.id
  WHERE r.id = p_id;

  SELECT id, section, name, description, price, available, position
  FROM product
  WHERE restaurant_id = p_id AND deleted_at IS NULL
  ORDER BY position, id;
END//

-- ═══════════════════════════════════════════════════════════════
-- Panel del restaurante
-- ═══════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS sp_restaurant_get_by_owner//
CREATE PROCEDURE sp_restaurant_get_by_owner(IN p_owner_id INT)
BEGIN
  SELECT r.id, r.name, r.tax_id, r.category, r.description, r.address, r.lat, r.lng, r.phone,
         r.sinpe_phone, r.image_url, r.prep_minutes, r.is_open, r.active,
         COALESCE(v.rating_avg, 0)   AS rating_avg,
         COALESCE(v.rating_count, 0) AS rating_count
  FROM restaurant r
  LEFT JOIN v_restaurant_rating v ON v.restaurant_id = r.id
  WHERE r.owner_account_id = p_owner_id;
END//

DROP PROCEDURE IF EXISTS sp_restaurant_update_settings//
CREATE PROCEDURE sp_restaurant_update_settings(
  IN p_id INT, IN p_description VARCHAR(300), IN p_phone VARCHAR(20), IN p_sinpe VARCHAR(20),
  IN p_image VARCHAR(300), IN p_prep TINYINT)
BEGIN
  UPDATE restaurant
     SET description = p_description, phone = p_phone, sinpe_phone = p_sinpe,
         image_url = p_image, prep_minutes = p_prep
   WHERE id = p_id;
END//

-- El restaurante abre y cierra su tienda; si soporte lo deshabilitó, no puede abrir.
DROP PROCEDURE IF EXISTS sp_restaurant_set_open//
CREATE PROCEDURE sp_restaurant_set_open(IN p_id INT, IN p_open BOOLEAN)
BEGIN
  IF p_open AND NOT (SELECT active FROM restaurant WHERE id = p_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RESTAURANT_DISABLED';
  END IF;
  -- Sin productos disponibles los clientes verían un menú vacío
  IF p_open AND NOT EXISTS (SELECT 1 FROM product WHERE restaurant_id = p_id AND available AND deleted_at IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MENU_EMPTY';
  END IF;
  UPDATE restaurant SET is_open = p_open WHERE id = p_id;
END//

DROP PROCEDURE IF EXISTS sp_restaurant_summary//
CREATE PROCEDURE sp_restaurant_summary(IN p_id INT, IN p_since DATETIME)
BEGIN
  SELECT COUNT(*) AS orders_today,
         COALESCE(SUM(CASE WHEN status IN ('picked_up','delivered') THEN subtotal END), 0) AS sales_today,
         COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_today,
         ROUND(AVG(CASE WHEN ready_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, accepted_at, ready_at) END)) AS avg_prep_minutes
  FROM client_order
  WHERE restaurant_id = p_id AND created_at >= p_since;
END//

DROP PROCEDURE IF EXISTS sp_product_get//
CREATE PROCEDURE sp_product_get(IN p_id INT, IN p_restaurant_id INT)
BEGIN
  SELECT id, section, name, description, price, available, position
  FROM product
  WHERE id = p_id AND restaurant_id = p_restaurant_id AND deleted_at IS NULL;
END//

DROP PROCEDURE IF EXISTS sp_product_create//
CREATE PROCEDURE sp_product_create(
  IN p_restaurant_id INT, IN p_section VARCHAR(40), IN p_name VARCHAR(80), IN p_description VARCHAR(250),
  IN p_price INT, IN p_available BOOLEAN)
BEGIN
  DECLARE v_position SMALLINT;

  IF (SELECT COUNT(*) FROM product WHERE restaurant_id = p_restaurant_id AND deleted_at IS NULL) >= 150 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PRODUCT_LIMIT';
  END IF;
  SET v_position = COALESCE((SELECT MAX(position) FROM product WHERE restaurant_id = p_restaurant_id), 0) + 1;

  INSERT INTO product (restaurant_id, section, name, description, price, available, position)
  VALUES (p_restaurant_id, p_section, p_name, p_description, p_price, p_available, v_position);
  CALL sp_product_get(LAST_INSERT_ID(), p_restaurant_id);
END//

DROP PROCEDURE IF EXISTS sp_product_update//
CREATE PROCEDURE sp_product_update(
  IN p_id INT, IN p_restaurant_id INT, IN p_section VARCHAR(40), IN p_name VARCHAR(80),
  IN p_description VARCHAR(250), IN p_price INT, IN p_available BOOLEAN)
BEGIN
  UPDATE product
     SET section = p_section, name = p_name, description = p_description, price = p_price, available = p_available
   WHERE id = p_id AND restaurant_id = p_restaurant_id AND deleted_at IS NULL;
  CALL sp_product_get(p_id, p_restaurant_id);
END//

DROP PROCEDURE IF EXISTS sp_product_set_available//
CREATE PROCEDURE sp_product_set_available(IN p_id INT, IN p_restaurant_id INT, IN p_available BOOLEAN)
BEGIN
  UPDATE product SET available = p_available
   WHERE id = p_id AND restaurant_id = p_restaurant_id AND deleted_at IS NULL;
  CALL sp_product_get(p_id, p_restaurant_id);
END//

-- Borrado lógico: los pedidos anteriores siguen apuntando al producto.
DROP PROCEDURE IF EXISTS sp_product_delete//
CREATE PROCEDURE sp_product_delete(IN p_id INT, IN p_restaurant_id INT)
BEGIN
  UPDATE product SET deleted_at = NOW(), available = FALSE
   WHERE id = p_id AND restaurant_id = p_restaurant_id AND deleted_at IS NULL;
  SELECT ROW_COUNT() AS affected;
END//

-- ═══════════════════════════════════════════════════════════════
-- Pedidos: creación y consultas
-- ═══════════════════════════════════════════════════════════════

-- La API calcula la cotización (distancia, envío, servicio) y la manda junto con los productos.
-- Acá se vuelve a revisar, dentro de la transacción, que el restaurante esté abierto y que cada producto
-- siga disponible y con el mismo precio. Si algo cambió entre la cotización y el pedido: CART_CHANGED.
DROP PROCEDURE IF EXISTS sp_order_create//
CREATE PROCEDURE sp_order_create(
  IN p_client_id INT, IN p_restaurant_id INT, IN p_items JSON,
  IN p_line VARCHAR(200), IN p_details VARCHAR(150), IN p_lat DECIMAL(10,7), IN p_lng DECIMAL(10,7),
  IN p_notes VARCHAR(200), IN p_distance DECIMAL(4,1),
  IN p_subtotal INT, IN p_iva INT, IN p_delivery_fee INT, IN p_service_fee INT, IN p_tip INT, IN p_total INT,
  IN p_is_holiday BOOLEAN,
  IN p_method VARCHAR(5), IN p_card_brand VARCHAR(12), IN p_card_last4 CHAR(4),
  IN p_sinpe_reference VARCHAR(30), IN p_cash_change_for INT)
BEGIN
  DECLARE v_order_id INT;
  DECLARE v_open     TINYINT;
  DECLARE v_lines    INT;
  DECLARE v_valid    INT;
  DECLARE v_subtotal INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;

  SELECT (active AND is_open) INTO v_open FROM restaurant WHERE id = p_restaurant_id FOR SHARE;
  IF v_open IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RESTAURANT_NOT_FOUND'; END IF;
  IF v_open = 0     THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RESTAURANT_CLOSED';    END IF;

  SELECT COUNT(*),
         SUM(p.id IS NOT NULL AND p.available AND p.deleted_at IS NULL AND p.price = j.unit_price),
         SUM(j.unit_price * j.quantity)
    INTO v_lines, v_valid, v_subtotal
  FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
         product_id INT PATH '$.product_id',
         quantity   INT PATH '$.quantity',
         unit_price INT PATH '$.unit_price')) j
  LEFT JOIN product p ON p.id = j.product_id AND p.restaurant_id = p_restaurant_id;

  IF v_lines = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'EMPTY_ORDER'; END IF;
  IF v_valid < v_lines OR v_subtotal <> p_subtotal THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CART_CHANGED';
  END IF;

  INSERT INTO client_order (
    client_id, restaurant_id, status, delivery_line, delivery_details, delivery_lat, delivery_lng, notes,
    distance_km, subtotal, iva_included, delivery_fee, service_fee, tip, total, is_holiday)
  VALUES (
    p_client_id, p_restaurant_id, 'pending', p_line, p_details, p_lat, p_lng, p_notes,
    p_distance, p_subtotal, p_iva, p_delivery_fee, p_service_fee, p_tip, p_total, p_is_holiday);
  SET v_order_id = LAST_INSERT_ID();

  -- Se copian nombre y precio: el pedido no cambia si después el restaurante edita el menú.
  INSERT INTO order_item (order_id, product_id, name, unit_price, quantity)
  SELECT v_order_id, p.id, p.name, j.unit_price, j.quantity
  FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
         product_id INT PATH '$.product_id',
         quantity   INT PATH '$.quantity',
         unit_price INT PATH '$.unit_price')) j
  JOIN product p ON p.id = j.product_id;

  -- Tarjeta: el cobro (simulado) se hace al confirmar. SINPE: lo verifica el restaurante al aceptar.
  -- Efectivo: lo cobra el repartidor al entregar.
  INSERT INTO payment (order_id, method, status, amount, card_brand, card_last4, sinpe_reference,
                       cash_change_for, paid_at)
  VALUES (v_order_id, p_method, IF(p_method = 'card', 'paid', 'pending'), p_total, p_card_brand,
          p_card_last4, p_sinpe_reference, p_cash_change_for, IF(p_method = 'card', NOW(), NULL));

  COMMIT;
  SELECT v_order_id AS id;
END//

-- Detalle completo. La API decide qué partes ve cada rol (por ejemplo, el restaurante no ve la dirección).
DROP PROCEDURE IF EXISTS sp_order_get//
CREATE PROCEDURE sp_order_get(IN p_id INT)
BEGIN
  SELECT o.id, o.client_id, o.restaurant_id, o.courier_id, o.status,
         o.delivery_line, o.delivery_details, o.delivery_lat, o.delivery_lng, o.notes, o.distance_km,
         o.subtotal, o.iva_included, o.delivery_fee, o.service_fee, o.tip, o.total, o.is_holiday,
         o.prep_minutes, o.cancel_reason, o.cancelled_by,
         o.created_at, o.accepted_at, o.assigned_at, o.ready_at, o.picked_up_at, o.delivered_at, o.cancelled_at,
         r.name AS restaurant_name, r.address AS restaurant_address, r.lat AS restaurant_lat,
         r.lng AS restaurant_lng, r.phone AS restaurant_phone, r.sinpe_phone AS restaurant_sinpe_phone,
         r.owner_account_id AS restaurant_owner_id, r.prep_minutes AS restaurant_prep_minutes,
         c.name AS client_name, c.phone AS client_phone,
         ca.name AS courier_name, ca.phone AS courier_phone, cr.vehicle AS courier_vehicle,
         cr.last_lat AS courier_lat, cr.last_lng AS courier_lng, cr.last_seen_at AS courier_seen_at,
         pay.method AS payment_method, pay.status AS payment_status, pay.card_brand, pay.card_last4,
         pay.sinpe_reference, pay.cash_change_for, pay.paid_at,
         rt.courier_stars, rt.restaurant_stars, rt.comment AS rating_comment, rt.created_at AS rated_at
  FROM client_order o
  JOIN restaurant r    ON r.id = o.restaurant_id
  JOIN account c       ON c.id = o.client_id
  JOIN payment pay     ON pay.order_id = o.id
  LEFT JOIN account ca ON ca.id = o.courier_id
  LEFT JOIN courier cr ON cr.account_id = o.courier_id
  LEFT JOIN rating rt  ON rt.order_id = o.id
  WHERE o.id = p_id;

  SELECT product_id, name, unit_price, quantity
  FROM order_item
  WHERE order_id = p_id
  ORDER BY id;

  SELECT id, reason, description, status, resolution, created_at, resolved_at
  FROM incident
  WHERE order_id = p_id
  ORDER BY created_at;
END//

DROP PROCEDURE IF EXISTS sp_order_list_by_client//
CREATE PROCEDURE sp_order_list_by_client(IN p_client_id INT)
BEGIN
  SELECT o.id, o.status, o.total, o.created_at, o.delivered_at, o.cancelled_at,
         o.restaurant_id, r.name AS restaurant_name, r.category AS restaurant_category,
         r.image_url AS restaurant_image_url,
         (SELECT SUM(i.quantity) FROM order_item i WHERE i.order_id = o.id) AS item_count,
         (SELECT GROUP_CONCAT(CONCAT(i.quantity, ' × ', i.name) ORDER BY i.id SEPARATOR ', ')
            FROM order_item i WHERE i.order_id = o.id) AS items_summary,
         (rt.order_id IS NOT NULL) AS rated
  FROM client_order o
  JOIN restaurant r   ON r.id = o.restaurant_id
  LEFT JOIN rating rt ON rt.order_id = o.id
  WHERE o.client_id = p_client_id
  ORDER BY o.created_at DESC, o.id DESC
  LIMIT 100;
END//

-- p_active = TRUE: lo que la cocina tiene que atender. FALSE: historial.
DROP PROCEDURE IF EXISTS sp_order_list_by_restaurant//
CREATE PROCEDURE sp_order_list_by_restaurant(IN p_restaurant_id INT, IN p_active BOOLEAN)
BEGIN
  SELECT o.id, o.status, o.subtotal, o.notes, o.prep_minutes,
         o.created_at, o.accepted_at, o.assigned_at, o.ready_at, o.picked_up_at, o.delivered_at,
         o.cancelled_at, o.cancel_reason, o.cancelled_by,
         c.name AS client_name, ca.name AS courier_name, cr.vehicle AS courier_vehicle,
         pay.method AS payment_method, pay.status AS payment_status, pay.sinpe_reference,
         (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', i.name, 'quantity', i.quantity, 'unit_price', i.unit_price))
            FROM order_item i WHERE i.order_id = o.id) AS items
  FROM client_order o
  JOIN account c       ON c.id = o.client_id
  JOIN payment pay     ON pay.order_id = o.id
  LEFT JOIN account ca ON ca.id = o.courier_id
  LEFT JOIN courier cr ON cr.account_id = o.courier_id
  WHERE o.restaurant_id = p_restaurant_id
    AND ((    p_active AND o.status IN ('pending','accepted','ready'))
      OR (NOT p_active AND o.status IN ('picked_up','delivered','cancelled')))
  ORDER BY o.created_at DESC, o.id DESC
  LIMIT 100;
END//

-- Pedidos aceptados por el restaurante que todavía no tienen repartidor. La API calcula a qué distancia
-- está cada repartidor del restaurante. La dirección exacta del cliente no se muestra hasta aceptar.
DROP PROCEDURE IF EXISTS sp_order_list_offers//
CREATE PROCEDURE sp_order_list_offers()
BEGIN
  SELECT o.id, o.status, o.distance_km, o.delivery_fee, o.tip, o.total, o.prep_minutes,
         o.created_at, o.accepted_at, o.ready_at,
         r.id AS restaurant_id, r.name AS restaurant_name, r.address AS restaurant_address,
         r.lat AS restaurant_lat, r.lng AS restaurant_lng,
         pay.method AS payment_method,
         (SELECT SUM(i.quantity) FROM order_item i WHERE i.order_id = o.id) AS item_count
  FROM client_order o
  JOIN restaurant r ON r.id = o.restaurant_id
  JOIN payment pay  ON pay.order_id = o.id
  WHERE o.courier_id IS NULL AND o.status IN ('accepted','ready')
  ORDER BY o.accepted_at, o.id
  LIMIT 50;
END//

DROP PROCEDURE IF EXISTS sp_order_active_for_courier//
CREATE PROCEDURE sp_order_active_for_courier(IN p_courier_id INT)
BEGIN
  SELECT id, client_id, restaurant_id, status
  FROM client_order
  WHERE courier_id = p_courier_id AND status IN ('accepted','ready','picked_up')
  ORDER BY id DESC
  LIMIT 1;
END//

DROP PROCEDURE IF EXISTS sp_order_list_by_courier//
CREATE PROCEDURE sp_order_list_by_courier(IN p_courier_id INT)
BEGIN
  SELECT o.id, o.status, o.distance_km, o.delivery_fee, o.tip, o.created_at, o.picked_up_at,
         o.delivered_at, o.cancelled_at, r.name AS restaurant_name, rt.courier_stars
  FROM client_order o
  JOIN restaurant r   ON r.id = o.restaurant_id
  LEFT JOIN rating rt ON rt.order_id = o.id
  WHERE o.courier_id = p_courier_id AND o.status IN ('delivered','cancelled')
  ORDER BY COALESCE(o.delivered_at, o.cancelled_at) DESC, o.id DESC
  LIMIT 100;
END//

-- p_filter: NULL (todos), 'active' (en curso) o un estado concreto.
DROP PROCEDURE IF EXISTS sp_order_list_admin//
CREATE PROCEDURE sp_order_list_admin(IN p_filter VARCHAR(12), IN p_limit INT)
BEGIN
  SELECT o.id, o.status, o.total, o.service_fee, o.created_at, o.delivered_at, o.cancelled_at,
         o.cancelled_by, o.cancel_reason,
         r.name AS restaurant_name, c.name AS client_name, ca.name AS courier_name,
         pay.method AS payment_method, pay.status AS payment_status
  FROM client_order o
  JOIN restaurant r    ON r.id = o.restaurant_id
  JOIN account c       ON c.id = o.client_id
  JOIN payment pay     ON pay.order_id = o.id
  LEFT JOIN account ca ON ca.id = o.courier_id
  WHERE p_filter IS NULL
     OR (p_filter = 'active' AND o.status IN ('pending','accepted','ready','picked_up'))
     OR o.status = p_filter
  ORDER BY o.created_at DESC, o.id DESC
  LIMIT p_limit;
END//

-- ═══════════════════════════════════════════════════════════════
-- Pedidos: cambios de estado
-- pending → accepted → ready → picked_up → delivered
-- ═══════════════════════════════════════════════════════════════

-- El cliente solo puede cancelar mientras el restaurante no lo haya aceptado.
DROP PROCEDURE IF EXISTS sp_order_cancel_by_client//
CREATE PROCEDURE sp_order_cancel_by_client(IN p_id INT, IN p_client_id INT, IN p_reason VARCHAR(200))
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM client_order WHERE id = p_id AND client_id = p_client_id FOR UPDATE;
  IF v_status IS NULL       THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND';       END IF;
  IF v_status <> 'pending'  THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_CANCELLABLE'; END IF;

  UPDATE client_order
     SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'client', cancel_reason = p_reason
   WHERE id = p_id;
  UPDATE payment SET status = 'refunded' WHERE order_id = p_id AND status = 'paid';
  COMMIT;
END//

DROP PROCEDURE IF EXISTS sp_order_accept//
CREATE PROCEDURE sp_order_accept(IN p_id INT, IN p_restaurant_id INT, IN p_prep TINYINT)
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM client_order WHERE id = p_id AND restaurant_id = p_restaurant_id FOR UPDATE;
  IF v_status IS NULL      THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND';      END IF;
  IF v_status <> 'pending' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_STATE_CONFLICT'; END IF;

  UPDATE client_order SET status = 'accepted', accepted_at = NOW(), prep_minutes = p_prep WHERE id = p_id;
  -- Al aceptar, el restaurante confirma que le llegó el SINPE.
  UPDATE payment SET status = 'paid', paid_at = NOW()
   WHERE order_id = p_id AND method = 'sinpe' AND status = 'pending';
  COMMIT;
END//

DROP PROCEDURE IF EXISTS sp_order_reject//
CREATE PROCEDURE sp_order_reject(IN p_id INT, IN p_restaurant_id INT, IN p_reason VARCHAR(200))
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM client_order WHERE id = p_id AND restaurant_id = p_restaurant_id FOR UPDATE;
  IF v_status IS NULL      THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND';      END IF;
  IF v_status <> 'pending' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_STATE_CONFLICT'; END IF;

  UPDATE client_order
     SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'restaurant', cancel_reason = p_reason
   WHERE id = p_id;
  UPDATE payment SET status = 'refunded' WHERE order_id = p_id AND status = 'paid';
  COMMIT;
END//

DROP PROCEDURE IF EXISTS sp_order_mark_ready//
CREATE PROCEDURE sp_order_mark_ready(IN p_id INT, IN p_restaurant_id INT)
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM client_order WHERE id = p_id AND restaurant_id = p_restaurant_id FOR UPDATE;
  IF v_status IS NULL       THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND';      END IF;
  IF v_status <> 'accepted' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_STATE_CONFLICT'; END IF;

  UPDATE client_order SET status = 'ready', ready_at = NOW() WHERE id = p_id;
  COMMIT;
END//

-- El primer repartidor que acepta se queda con el pedido. Se bloquea primero al repartidor y después
-- al pedido, siempre en ese orden, para que dos aceptaciones simultáneas no se traben entre sí.
DROP PROCEDURE IF EXISTS sp_order_claim//
CREATE PROCEDURE sp_order_claim(IN p_id INT, IN p_courier_id INT)
BEGIN
  DECLARE v_availability VARCHAR(10);
  DECLARE v_status       VARCHAR(12);
  DECLARE v_courier      INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT availability INTO v_availability FROM courier WHERE account_id = p_courier_id FOR UPDATE;
  IF v_availability IS NULL      THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_NOT_FOUND'; END IF;
  IF v_availability = 'busy'     THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_BUSY';      END IF;
  IF v_availability = 'offline'  THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_OFFLINE';   END IF;

  SELECT status, courier_id INTO v_status, v_courier FROM client_order WHERE id = p_id FOR UPDATE;
  IF v_status IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND'; END IF;
  IF v_courier IS NOT NULL OR v_status NOT IN ('accepted','ready') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_TAKEN';
  END IF;

  UPDATE client_order SET courier_id = p_courier_id, assigned_at = NOW() WHERE id = p_id;
  UPDATE courier SET availability = 'busy' WHERE account_id = p_courier_id;
  COMMIT;
END//

-- El repartidor confirma que retiró el pedido. Puede hacerlo aunque la cocina no lo haya marcado como listo
-- (pasa seguido en la vida real: el pedido está en el mostrador y nadie tocó el botón).
DROP PROCEDURE IF EXISTS sp_order_pickup//
CREATE PROCEDURE sp_order_pickup(IN p_id INT, IN p_courier_id INT)
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM client_order WHERE id = p_id AND courier_id = p_courier_id FOR UPDATE;
  IF v_status IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND'; END IF;
  IF v_status NOT IN ('accepted','ready') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_STATE_CONFLICT';
  END IF;

  UPDATE client_order SET status = 'picked_up', picked_up_at = NOW() WHERE id = p_id;
  COMMIT;
END//

DROP PROCEDURE IF EXISTS sp_order_deliver//
CREATE PROCEDURE sp_order_deliver(IN p_id INT, IN p_courier_id INT)
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM client_order WHERE id = p_id AND courier_id = p_courier_id FOR UPDATE;
  IF v_status IS NULL        THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND';      END IF;
  IF v_status <> 'picked_up' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_STATE_CONFLICT'; END IF;

  UPDATE client_order SET status = 'delivered', delivered_at = NOW() WHERE id = p_id;
  -- En efectivo, el pago queda hecho cuando el repartidor cobra al entregar.
  UPDATE payment SET status = 'paid', paid_at = NOW()
   WHERE order_id = p_id AND method = 'cash' AND status = 'pending';
  UPDATE courier SET availability = 'available' WHERE account_id = p_courier_id AND availability = 'busy';
  COMMIT;
END//

-- Soporte puede cancelar cualquier pedido que no esté cerrado; si tenía repartidor, lo libera.
DROP PROCEDURE IF EXISTS sp_order_cancel_by_admin//
CREATE PROCEDURE sp_order_cancel_by_admin(IN p_id INT, IN p_reason VARCHAR(200))
BEGIN
  DECLARE v_status  VARCHAR(12);
  DECLARE v_courier INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status, courier_id INTO v_status, v_courier FROM client_order WHERE id = p_id FOR UPDATE;
  IF v_status IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND'; END IF;
  IF v_status IN ('delivered','cancelled') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_CLOSED'; END IF;

  UPDATE client_order
     SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'admin', cancel_reason = p_reason
   WHERE id = p_id;
  UPDATE payment SET status = 'refunded' WHERE order_id = p_id AND status = 'paid';
  IF v_courier IS NOT NULL THEN
    UPDATE courier SET availability = 'available' WHERE account_id = v_courier AND availability = 'busy';
  END IF;
  COMMIT;
END//

-- Pedidos que el restaurante no confirmó a tiempo. La API los cancela uno por uno con sp_order_expire.
DROP PROCEDURE IF EXISTS sp_order_list_expired//
CREATE PROCEDURE sp_order_list_expired(IN p_minutes INT)
BEGIN
  SELECT id
  FROM client_order
  WHERE status = 'pending' AND created_at < NOW() - INTERVAL p_minutes MINUTE
  ORDER BY id
  LIMIT 100;
END//

DROP PROCEDURE IF EXISTS sp_order_expire//
CREATE PROCEDURE sp_order_expire(IN p_id INT)
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM client_order WHERE id = p_id FOR UPDATE;
  IF v_status = 'pending' THEN
    UPDATE client_order
       SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'system',
           cancel_reason = 'El restaurante no confirmó el pedido a tiempo'
     WHERE id = p_id;
    UPDATE payment SET status = 'refunded' WHERE order_id = p_id AND status = 'paid';
  END IF;
  COMMIT;
  SELECT COALESCE(v_status = 'pending', FALSE) AS expired;
END//

-- ═══════════════════════════════════════════════════════════════
-- Calificaciones e incidentes
-- ═══════════════════════════════════════════════════════════════

-- Una por pedido (la llave primaria de rating lo garantiza), solo del cliente y solo si se entregó.
DROP PROCEDURE IF EXISTS sp_order_rate//
CREATE PROCEDURE sp_order_rate(
  IN p_id INT, IN p_client_id INT, IN p_courier_stars TINYINT, IN p_restaurant_stars TINYINT,
  IN p_comment VARCHAR(300))
BEGIN
  DECLARE v_status VARCHAR(12);
  SET v_status = (SELECT status FROM client_order WHERE id = p_id AND client_id = p_client_id);
  IF v_status IS NULL         THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND';     END IF;
  IF v_status <> 'delivered'  THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_DELIVERED'; END IF;

  INSERT INTO rating (order_id, courier_stars, restaurant_stars, comment)
  VALUES (p_id, p_courier_stars, p_restaurant_stars, p_comment);
END//

DROP PROCEDURE IF EXISTS sp_incident_create//
CREATE PROCEDURE sp_incident_create(
  IN p_order_id INT, IN p_client_id INT, IN p_reason VARCHAR(20), IN p_description VARCHAR(500))
BEGIN
  DECLARE v_status VARCHAR(12);
  SET v_status = (SELECT status FROM client_order WHERE id = p_order_id AND client_id = p_client_id);
  IF v_status IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_FOUND'; END IF;
  -- Mientras está pendiente, el cliente puede cancelarlo directamente.
  IF v_status = 'pending' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INCIDENT_TOO_EARLY'; END IF;
  IF EXISTS (SELECT 1 FROM incident WHERE order_id = p_order_id AND status = 'open') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INCIDENT_ALREADY_OPEN';
  END IF;

  INSERT INTO incident (order_id, reporter_id, reason, description)
  VALUES (p_order_id, p_client_id, p_reason, p_description);
  SELECT LAST_INSERT_ID() AS id;
END//

DROP PROCEDURE IF EXISTS sp_incident_list//
CREATE PROCEDURE sp_incident_list(IN p_status VARCHAR(10))
BEGIN
  SELECT i.id, i.order_id, i.reason, i.description, i.status, i.resolution, i.created_at, i.resolved_at,
         a.name AS reporter_name, a.email AS reporter_email, a.phone AS reporter_phone,
         o.status AS order_status, o.total AS order_total, o.courier_id,
         r.name AS restaurant_name, ca.name AS courier_name,
         pay.method AS payment_method, pay.status AS payment_status
  FROM incident i
  JOIN account a       ON a.id = i.reporter_id
  JOIN client_order o  ON o.id = i.order_id
  JOIN restaurant r    ON r.id = o.restaurant_id
  JOIN payment pay     ON pay.order_id = o.id
  LEFT JOIN account ca ON ca.id = o.courier_id
  WHERE p_status IS NULL OR i.status = p_status
  ORDER BY i.status = 'open' DESC, i.created_at DESC
  LIMIT 200;
END//

-- Uso interno: sin transacción propia, la abre quien lo llama.
-- Con 4 amonestaciones la cuenta del repartidor se suspende sola.
DROP PROCEDURE IF EXISTS sp_internal_courier_add_warning//
CREATE PROCEDURE sp_internal_courier_add_warning(IN p_courier_id INT, IN p_reason VARCHAR(200))
BEGIN
  DECLARE v_count INT;

  SELECT warnings_count + 1 INTO v_count FROM courier WHERE account_id = p_courier_id FOR UPDATE;
  IF v_count IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_NOT_FOUND'; END IF;

  INSERT INTO courier_warning (courier_id, reason) VALUES (p_courier_id, p_reason);
  UPDATE courier SET warnings_count = v_count WHERE account_id = p_courier_id;
  IF v_count >= 4 THEN
    UPDATE account SET status = 'suspended' WHERE id = p_courier_id AND status = 'active';
    UPDATE courier SET availability = 'offline' WHERE account_id = p_courier_id;
  END IF;
END//

DROP PROCEDURE IF EXISTS sp_incident_resolve//
CREATE PROCEDURE sp_incident_resolve(
  IN p_id INT, IN p_resolution VARCHAR(300), IN p_refund BOOLEAN, IN p_warn_courier BOOLEAN)
BEGIN
  DECLARE v_status  VARCHAR(10);
  DECLARE v_order   INT;
  DECLARE v_courier INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT i.status, i.order_id, o.courier_id INTO v_status, v_order, v_courier
  FROM incident i JOIN client_order o ON o.id = i.order_id
  WHERE i.id = p_id
  FOR UPDATE;
  IF v_status IS NULL    THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INCIDENT_NOT_FOUND';        END IF;
  IF v_status <> 'open'  THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INCIDENT_ALREADY_RESOLVED'; END IF;
  IF p_warn_courier AND v_courier IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_WITHOUT_COURIER';
  END IF;

  UPDATE incident SET status = 'resolved', resolution = p_resolution, resolved_at = NOW() WHERE id = p_id;
  IF p_refund THEN
    UPDATE payment SET status = 'refunded' WHERE order_id = v_order AND status = 'paid';
  END IF;
  IF p_warn_courier THEN
    CALL sp_internal_courier_add_warning(v_courier, CONCAT('Pedido #', v_order, ': ', p_resolution));
  END IF;
  COMMIT;

  SELECT v_order AS order_id, v_courier AS courier_id;
END//

-- ═══════════════════════════════════════════════════════════════
-- Repartidores
-- ═══════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS sp_courier_get//
CREATE PROCEDURE sp_courier_get(IN p_id INT)
BEGIN
  SELECT a.id, a.name, a.email, a.phone, a.status, a.created_at,
         c.national_id, c.vehicle, c.availability, c.warnings_count, c.approved_at,
         c.last_lat, c.last_lng, c.last_seen_at,
         COALESCE(v.rating_avg, 0)   AS rating_avg,
         COALESCE(v.rating_count, 0) AS rating_count
  FROM account a
  JOIN courier c ON c.account_id = a.id
  LEFT JOIN v_courier_rating v ON v.courier_id = a.id
  WHERE a.id = p_id;
END//

-- Conectarse o desconectarse. Con un pedido en curso no se puede desconectar.
DROP PROCEDURE IF EXISTS sp_courier_set_availability//
CREATE PROCEDURE sp_courier_set_availability(IN p_id INT, IN p_online BOOLEAN)
BEGIN
  DECLARE v_availability VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT availability INTO v_availability FROM courier WHERE account_id = p_id FOR UPDATE;
  IF v_availability IS NULL   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_NOT_FOUND'; END IF;
  IF v_availability = 'busy'  THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_BUSY';      END IF;

  UPDATE courier SET availability = IF(p_online, 'available', 'offline') WHERE account_id = p_id;
  COMMIT;
END//

-- Guarda la última ubicación y devuelve el pedido en curso (si hay) para avisarle al cliente.
DROP PROCEDURE IF EXISTS sp_courier_update_location//
CREATE PROCEDURE sp_courier_update_location(IN p_id INT, IN p_lat DECIMAL(10,7), IN p_lng DECIMAL(10,7))
BEGIN
  UPDATE courier SET last_lat = p_lat, last_lng = p_lng, last_seen_at = NOW() WHERE account_id = p_id;
  CALL sp_order_active_for_courier(p_id);
END//

-- Ganancias = tarifa de envío + propina de los pedidos entregados.
DROP PROCEDURE IF EXISTS sp_courier_summary//
CREATE PROCEDURE sp_courier_summary(IN p_id INT, IN p_today DATETIME, IN p_week DATETIME)
BEGIN
  SELECT COALESCE(SUM(CASE WHEN delivered_at >= p_today THEN delivery_fee + tip END), 0) AS earnings_today,
         COALESCE(SUM(delivered_at >= p_today), 0)                                       AS deliveries_today,
         COALESCE(SUM(CASE WHEN delivered_at >= p_week THEN delivery_fee + tip END), 0)  AS earnings_week,
         COALESCE(SUM(delivered_at >= p_week), 0)                                        AS deliveries_week,
         COALESCE(SUM(delivery_fee + tip), 0)                                            AS earnings_total,
         COUNT(*)                                                                        AS deliveries_total
  FROM client_order
  WHERE courier_id = p_id AND status = 'delivered';
END//

-- p_status: NULL (todos) o un estado de cuenta (pending, active, suspended, rejected).
DROP PROCEDURE IF EXISTS sp_courier_list//
CREATE PROCEDURE sp_courier_list(IN p_status VARCHAR(10))
BEGIN
  SELECT a.id, a.name, a.email, a.phone, a.status, a.created_at,
         c.national_id, c.vehicle, c.availability, c.warnings_count, c.approved_at, c.last_seen_at,
         COALESCE(v.rating_avg, 0)   AS rating_avg,
         COALESCE(v.rating_count, 0) AS rating_count,
         (SELECT COUNT(*) FROM client_order o WHERE o.courier_id = a.id AND o.status = 'delivered') AS deliveries
  FROM account a
  JOIN courier c ON c.account_id = a.id
  LEFT JOIN v_courier_rating v ON v.courier_id = a.id
  WHERE p_status IS NULL OR a.status = p_status
  ORDER BY a.status = 'pending' DESC, a.created_at DESC;
END//

-- approve (pending o rejected → active), reject (pending → rejected),
-- suspend (active → suspended) y reactivate (suspended → active, reinicia las amonestaciones).
DROP PROCEDURE IF EXISTS sp_courier_admin_action//
CREATE PROCEDURE sp_courier_admin_action(IN p_id INT, IN p_action VARCHAR(12))
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT a.status INTO v_status
  FROM account a JOIN courier c ON c.account_id = a.id
  WHERE a.id = p_id
  FOR UPDATE;
  IF v_status IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_NOT_FOUND'; END IF;

  CASE p_action
    WHEN 'approve' THEN
      IF v_status NOT IN ('pending','rejected') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_TRANSITION';
      END IF;
      UPDATE account SET status = 'active' WHERE id = p_id;
      UPDATE courier SET approved_at = NOW() WHERE account_id = p_id;
    WHEN 'reject' THEN
      IF v_status <> 'pending' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_TRANSITION'; END IF;
      UPDATE account SET status = 'rejected' WHERE id = p_id;
    WHEN 'suspend' THEN
      IF v_status <> 'active' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_TRANSITION'; END IF;
      IF EXISTS (SELECT 1 FROM client_order
                  WHERE courier_id = p_id AND status IN ('accepted','ready','picked_up')) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_HAS_ACTIVE_ORDER';
      END IF;
      UPDATE account SET status = 'suspended' WHERE id = p_id;
      UPDATE courier SET availability = 'offline' WHERE account_id = p_id;
    WHEN 'reactivate' THEN
      IF v_status <> 'suspended' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_TRANSITION'; END IF;
      UPDATE account SET status = 'active' WHERE id = p_id;
      UPDATE courier SET warnings_count = 0 WHERE account_id = p_id;
    ELSE
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_ACTION';
  END CASE;
  COMMIT;

  CALL sp_courier_get(p_id);
END//

DROP PROCEDURE IF EXISTS sp_courier_warn//
CREATE PROCEDURE sp_courier_warn(IN p_id INT, IN p_reason VARCHAR(200))
BEGIN
  DECLARE v_status VARCHAR(12);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT a.status INTO v_status
  FROM account a JOIN courier c ON c.account_id = a.id
  WHERE a.id = p_id
  FOR UPDATE;
  IF v_status IS NULL     THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'COURIER_NOT_FOUND';  END IF;
  IF v_status <> 'active' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_TRANSITION'; END IF;
  CALL sp_internal_courier_add_warning(p_id, p_reason);
  COMMIT;

  CALL sp_courier_get(p_id);
END//

DROP PROCEDURE IF EXISTS sp_courier_warnings//
CREATE PROCEDURE sp_courier_warnings(IN p_id INT)
BEGIN
  SELECT id, reason, created_at FROM courier_warning WHERE courier_id = p_id ORDER BY created_at DESC, id DESC;
END//

-- ═══════════════════════════════════════════════════════════════
-- Administración: restaurantes y clientes
-- ═══════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS sp_restaurant_list_admin//
CREATE PROCEDURE sp_restaurant_list_admin()
BEGIN
  SELECT r.id, r.name, r.tax_id, r.category, r.description, r.address, r.lat, r.lng, r.phone,
         r.prep_minutes, r.is_open, r.active, r.created_at,
         a.id AS owner_id, a.name AS owner_name, a.email AS owner_email, a.phone AS owner_phone,
         COALESCE(v.rating_avg, 0)   AS rating_avg,
         COALESCE(v.rating_count, 0) AS rating_count,
         (SELECT COUNT(*) FROM client_order o WHERE o.restaurant_id = r.id AND o.status = 'delivered') AS delivered_orders,
         (SELECT COALESCE(SUM(o.subtotal), 0) FROM client_order o
           WHERE o.restaurant_id = r.id AND o.status = 'delivered') AS gross_sales
  FROM restaurant r
  LEFT JOIN account a ON a.id = r.owner_account_id
  LEFT JOIN v_restaurant_rating v ON v.restaurant_id = r.id
  ORDER BY r.name;
END//

-- Alta de un restaurante junto con la cuenta de su dueño. Arranca cerrado.
DROP PROCEDURE IF EXISTS sp_restaurant_create//
CREATE PROCEDURE sp_restaurant_create(
  IN p_owner_email VARCHAR(120), IN p_owner_hash VARCHAR(100), IN p_owner_name VARCHAR(100),
  IN p_owner_phone VARCHAR(20), IN p_name VARCHAR(100), IN p_tax_id VARCHAR(20), IN p_category VARCHAR(40),
  IN p_description VARCHAR(300), IN p_address VARCHAR(200), IN p_lat DECIMAL(10,7), IN p_lng DECIMAL(10,7),
  IN p_phone VARCHAR(20), IN p_prep TINYINT)
BEGIN
  DECLARE v_owner_id INT;
  DECLARE v_id       INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  INSERT INTO account (email, password_hash, role, status, name, phone)
  VALUES (p_owner_email, p_owner_hash, 'restaurant', 'active', p_owner_name, p_owner_phone);
  SET v_owner_id = LAST_INSERT_ID();

  INSERT INTO restaurant (owner_account_id, name, tax_id, category, description, address, lat, lng,
                          phone, prep_minutes, is_open)
  VALUES (v_owner_id, p_name, p_tax_id, p_category, p_description, p_address, p_lat, p_lng,
          p_phone, p_prep, FALSE);
  SET v_id = LAST_INSERT_ID();
  COMMIT;

  SELECT v_id AS id, v_owner_id AS owner_id;
END//

DROP PROCEDURE IF EXISTS sp_restaurant_update_admin//
CREATE PROCEDURE sp_restaurant_update_admin(
  IN p_id INT, IN p_name VARCHAR(100), IN p_tax_id VARCHAR(20), IN p_category VARCHAR(40),
  IN p_address VARCHAR(200), IN p_lat DECIMAL(10,7), IN p_lng DECIMAL(10,7), IN p_phone VARCHAR(20))
BEGIN
  UPDATE restaurant
     SET name = p_name, tax_id = p_tax_id, category = p_category, address = p_address,
         lat = p_lat, lng = p_lng, phone = p_phone
   WHERE id = p_id;
  SELECT id FROM restaurant WHERE id = p_id;
END//

-- Deshabilitar un restaurante también lo cierra.
DROP PROCEDURE IF EXISTS sp_restaurant_set_active//
CREATE PROCEDURE sp_restaurant_set_active(IN p_id INT, IN p_active BOOLEAN)
BEGIN
  UPDATE restaurant SET active = p_active, is_open = IF(p_active, is_open, FALSE) WHERE id = p_id;
  SELECT id, active, is_open FROM restaurant WHERE id = p_id;
END//

DROP PROCEDURE IF EXISTS sp_client_list//
CREATE PROCEDURE sp_client_list(IN p_search VARCHAR(60))
BEGIN
  SELECT a.id, a.name, a.email, a.phone, a.status, a.created_at, a.last_login_at,
         COUNT(o.id) AS orders,
         COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total END), 0) AS total_spent,
         MAX(o.created_at) AS last_order_at
  FROM account a
  LEFT JOIN client_order o ON o.client_id = a.id
  WHERE a.role = 'client'
    AND (p_search IS NULL OR a.name LIKE CONCAT('%', p_search, '%') OR a.email LIKE CONCAT('%', p_search, '%'))
  GROUP BY a.id, a.name, a.email, a.phone, a.status, a.created_at, a.last_login_at
  ORDER BY a.created_at DESC, a.id DESC
  LIMIT 200;
END//

DROP PROCEDURE IF EXISTS sp_client_set_status//
CREATE PROCEDURE sp_client_set_status(IN p_id INT, IN p_status VARCHAR(12))
BEGIN
  UPDATE account SET status = p_status WHERE id = p_id AND role = 'client';
  SELECT id, status FROM account WHERE id = p_id AND role = 'client';
END//

-- ═══════════════════════════════════════════════════════════════
-- Reportes (hora de Costa Rica: UTC-6 todo el año, sin horario de verano)
-- ═══════════════════════════════════════════════════════════════

DROP PROCEDURE IF EXISTS sp_report_overview//
CREATE PROCEDURE sp_report_overview(IN p_today DATETIME, IN p_from DATETIME)
BEGIN
  -- 1. Indicadores
  SELECT
    (SELECT COUNT(*) FROM client_order WHERE created_at >= p_today) AS orders_today,
    (SELECT COALESCE(SUM(total), 0) FROM client_order
      WHERE created_at >= p_today AND status = 'delivered') AS sales_today,
    (SELECT COUNT(*) FROM client_order WHERE status IN ('pending','accepted','ready','picked_up')) AS active_orders,
    (SELECT COUNT(*) FROM courier c JOIN account a ON a.id = c.account_id
      WHERE a.status = 'active' AND c.availability <> 'offline') AS couriers_online,
    (SELECT COUNT(*) FROM account WHERE role = 'courier' AND status = 'pending') AS courier_applications,
    (SELECT COUNT(*) FROM incident WHERE status = 'open') AS open_incidents,
    (SELECT COUNT(*) FROM client_order WHERE created_at >= p_from) AS orders_period,
    (SELECT COALESCE(SUM(total), 0) FROM client_order
      WHERE created_at >= p_from AND status = 'delivered') AS sales_period,
    (SELECT ROUND(AVG(total)) FROM client_order
      WHERE created_at >= p_from AND status = 'delivered') AS avg_ticket,
    (SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, delivered_at))) FROM client_order
      WHERE created_at >= p_from AND status = 'delivered') AS avg_delivery_minutes,
    (SELECT ROUND(100 * AVG(status = 'cancelled'), 1) FROM client_order
      WHERE created_at >= p_from AND status IN ('delivered','cancelled')) AS cancel_rate;

  -- 2. Pedidos y ventas por día
  SELECT DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '-06:00'), '%Y-%m-%d') AS order_day,
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN status = 'delivered' THEN total END), 0) AS sales
  FROM client_order
  WHERE created_at >= p_from
  GROUP BY order_day
  ORDER BY order_day;

  -- 3. Pedidos por hora del día
  SELECT HOUR(CONVERT_TZ(created_at, '+00:00', '-06:00')) AS order_hour, COUNT(*) AS orders
  FROM client_order
  WHERE created_at >= p_from
  GROUP BY order_hour
  ORDER BY order_hour;

  -- 4. Restaurantes con más ventas
  SELECT r.id, r.name, COUNT(*) AS orders, SUM(o.subtotal) AS sales
  FROM client_order o
  JOIN restaurant r ON r.id = o.restaurant_id
  WHERE o.created_at >= p_from AND o.status = 'delivered'
  GROUP BY r.id, r.name
  ORDER BY sales DESC
  LIMIT 5;

  -- 5. A dónde va el dinero de los pedidos entregados
  SELECT COALESCE(SUM(subtotal), 0)           AS restaurants,
         COALESCE(SUM(delivery_fee + tip), 0) AS couriers,
         COALESCE(SUM(service_fee), 0)        AS platform,
         COALESCE(SUM(total), 0)              AS total
  FROM client_order
  WHERE created_at >= p_from AND status = 'delivered';

  -- 6. Métodos de pago
  SELECT pay.method, COUNT(*) AS orders
  FROM client_order o
  JOIN payment pay ON pay.order_id = o.id
  WHERE o.created_at >= p_from AND o.status = 'delivered'
  GROUP BY pay.method
  ORDER BY orders DESC;
END//

DELIMITER ;
