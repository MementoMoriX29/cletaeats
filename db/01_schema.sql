-- CletaEats · Esquema (versión 2)
-- MySQL 8.0+ (probado en MySQL 8.0 y compatible con HeatWave MySQL).
-- Orden de ejecución: 01_schema.sql → 02_routines.sql → 03_seed.sql (se cargan con: cd backend && npm run db:setup)
--
-- Modelo:
--   account ─┬─ courier          (1:1, perfil del repartidor; comparte la llave primaria)
--            ├─ restaurant       (1:1, dueño del restaurante)
--            ├─ address          (1:N, direcciones guardadas del cliente)
--            └─ client_order     (1:N, pedidos del cliente)
--   restaurant ── product        (1:N, menú)
--   client_order ─┬─ order_item  (1:N, copia de nombre y precio al momento de pedir)
--                 ├─ payment     (1:1)
--                 ├─ rating      (1:1, una calificación por pedido)
--                 └─ incident    (1:N, reportes de problemas)
--
-- Montos en colones enteros, con IVA incluido (así se muestran los precios al consumidor en Costa Rica).

-- Versión del esquema: db-setup la revisa para no mezclar una base vieja con procedimientos nuevos.
CREATE TABLE IF NOT EXISTS app_meta (
  meta_key   VARCHAR(40) PRIMARY KEY,
  meta_value VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_meta (meta_key, meta_value) VALUES ('schema_version', '2')
  ON DUPLICATE KEY UPDATE meta_value = meta_value;

-- ─────────────────────────────────────────────────────────────
-- Cuentas: un solo login para todos los roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(120) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('client','courier','restaurant','admin') NOT NULL,
  -- pending/rejected: solicitudes de repartidor; suspended: bloqueada por el admin
  status        ENUM('active','pending','rejected','suspended') NOT NULL DEFAULT 'active',
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  -- va en el token; al cambiar la contraseña sube y las sesiones abiertas en otros dispositivos se cierran
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_account_email (email),
  KEY ix_account_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Perfil del repartidor. Su llave primaria es la misma de la cuenta.
-- availability (conectado/ocupado) es independiente de account.status (aprobado/suspendido).
CREATE TABLE IF NOT EXISTS courier (
  account_id     INT PRIMARY KEY,
  national_id    VARCHAR(20) NOT NULL,
  vehicle        ENUM('bicicleta','scooter') NOT NULL DEFAULT 'bicicleta',
  availability   ENUM('offline','available','busy') NOT NULL DEFAULT 'offline',
  last_lat       DECIMAL(10,7) NULL,
  last_lng       DECIMAL(10,7) NULL,
  last_seen_at   TIMESTAMP NULL,
  warnings_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  approved_at    TIMESTAMP NULL,
  UNIQUE KEY uq_courier_national_id (national_id),
  CONSTRAINT fk_courier_account FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courier_warning (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  courier_id INT NOT NULL,
  reason     VARCHAR(200) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_warning_courier FOREIGN KEY (courier_id) REFERENCES courier(account_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Restaurantes y menú
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  owner_account_id INT NULL,
  name             VARCHAR(100) NOT NULL,
  tax_id           VARCHAR(20)  NOT NULL,           -- cédula jurídica
  category         VARCHAR(40)  NOT NULL,
  description      VARCHAR(300) NULL,
  address          VARCHAR(200) NOT NULL,
  lat              DECIMAL(10,7) NOT NULL,
  lng              DECIMAL(10,7) NOT NULL,
  phone            VARCHAR(20)  NULL,
  sinpe_phone      VARCHAR(20)  NULL,               -- número de SINPE Móvil para recibir pagos
  image_url        VARCHAR(300) NULL,
  prep_minutes     TINYINT UNSIGNED NOT NULL DEFAULT 20,
  is_open          BOOLEAN NOT NULL DEFAULT FALSE,   -- lo abre y cierra el restaurante
  active           BOOLEAN NOT NULL DEFAULT TRUE,    -- lo habilita o deshabilita el admin
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_restaurant_tax_id (tax_id),
  UNIQUE KEY uq_restaurant_owner (owner_account_id),
  KEY ix_restaurant_category (category),
  CONSTRAINT fk_restaurant_owner FOREIGN KEY (owner_account_id) REFERENCES account(id) ON DELETE SET NULL,
  CONSTRAINT chk_restaurant_prep CHECK (prep_minutes BETWEEN 5 AND 90)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  section       VARCHAR(40)  NOT NULL DEFAULT 'Menú', -- sección del menú: Entradas, Bebidas…
  name          VARCHAR(80)  NOT NULL,
  description   VARCHAR(250) NULL,
  price         INT UNSIGNED NOT NULL,              -- colones, IVA incluido
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  position      SMALLINT NOT NULL DEFAULT 0,
  deleted_at    TIMESTAMP NULL,                     -- borrado lógico: los pedidos viejos lo siguen referenciando
  KEY ix_product_restaurant (restaurant_id, deleted_at, position),
  CONSTRAINT fk_product_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurant(id) ON DELETE CASCADE,
  CONSTRAINT chk_product_price CHECK (price BETWEEN 100 AND 200000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Direcciones del cliente (en Costa Rica se dan por referencias: "200 m norte de la iglesia")
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS address (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  client_id  INT NOT NULL,
  label      VARCHAR(30)  NOT NULL,
  line       VARCHAR(200) NOT NULL,
  details    VARCHAR(150) NULL,
  lat        DECIMAL(10,7) NOT NULL,
  lng        DECIMAL(10,7) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_address_client (client_id),
  CONSTRAINT fk_address_client FOREIGN KEY (client_id) REFERENCES account(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Pedidos
-- pending → accepted (el restaurante lo confirma) → ready (listo para recoger)
--         → picked_up (el repartidor lo lleva) → delivered
-- El cliente puede cancelar mientras está pending y el restaurante puede rechazarlo (pending → cancelled).
-- Soporte (admin) puede cancelar cualquier pedido que no esté cerrado.
-- "order" es palabra reservada en MySQL, por eso la tabla se llama client_order.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_order (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  client_id        INT NOT NULL,
  restaurant_id    INT NOT NULL,
  courier_id       INT NULL,
  status           ENUM('pending','accepted','ready','picked_up','delivered','cancelled') NOT NULL DEFAULT 'pending',
  -- copia de la dirección: el pedido no cambia si después se edita o borra la dirección
  delivery_line    VARCHAR(200) NOT NULL,
  delivery_details VARCHAR(150) NULL,
  delivery_lat     DECIMAL(10,7) NOT NULL,
  delivery_lng     DECIMAL(10,7) NOT NULL,
  notes            VARCHAR(200) NULL,
  distance_km      DECIMAL(4,1) NOT NULL,
  subtotal         INT UNSIGNED NOT NULL,
  iva_included     INT UNSIGNED NOT NULL,           -- parte del subtotal que corresponde al IVA (13 %)
  delivery_fee     INT UNSIGNED NOT NULL,           -- lo que gana el repartidor
  service_fee      INT UNSIGNED NOT NULL,           -- lo que cobra la plataforma
  tip              INT UNSIGNED NOT NULL DEFAULT 0, -- propina, completa para el repartidor
  total            INT UNSIGNED NOT NULL,
  is_holiday       BOOLEAN NOT NULL DEFAULT FALSE,
  prep_minutes     TINYINT UNSIGNED NULL,           -- lo define el restaurante al aceptar
  cancel_reason    VARCHAR(200) NULL,
  cancelled_by     ENUM('client','restaurant','admin','system') NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at      TIMESTAMP NULL,
  assigned_at      TIMESTAMP NULL,
  ready_at         TIMESTAMP NULL,
  picked_up_at     TIMESTAMP NULL,
  delivered_at     TIMESTAMP NULL,
  cancelled_at     TIMESTAMP NULL,
  KEY ix_order_client (client_id, created_at),
  KEY ix_order_restaurant (restaurant_id, status),
  KEY ix_order_courier (courier_id, status),
  KEY ix_order_status (status),
  CONSTRAINT fk_order_client     FOREIGN KEY (client_id)     REFERENCES account(id),
  CONSTRAINT fk_order_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurant(id),
  CONSTRAINT fk_order_courier    FOREIGN KEY (courier_id)    REFERENCES courier(account_id),
  CONSTRAINT chk_order_total     CHECK (total = subtotal + delivery_fee + service_fee + tip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_item (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  name       VARCHAR(80) NOT NULL,                 -- copia al momento de pedir
  unit_price INT UNSIGNED NOT NULL,                -- copia al momento de pedir
  quantity   TINYINT UNSIGNED NOT NULL,
  KEY ix_item_order (order_id),
  CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES client_order(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES product(id),
  CONSTRAINT chk_item_quantity CHECK (quantity BETWEEN 1 AND 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- El número completo de una tarjeta nunca llega al servidor: solo marca y últimos 4 dígitos.
CREATE TABLE IF NOT EXISTS payment (
  order_id        INT PRIMARY KEY,
  method          ENUM('cash','sinpe','card') NOT NULL,
  status          ENUM('pending','paid','refunded') NOT NULL DEFAULT 'pending',
  amount          INT UNSIGNED NOT NULL,
  card_brand      VARCHAR(12) NULL,
  card_last4      CHAR(4) NULL,
  sinpe_reference VARCHAR(30) NULL,
  cash_change_for INT UNSIGNED NULL,               -- "¿con cuánto vas a pagar?"
  paid_at         TIMESTAMP NULL,
  CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES client_order(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Una calificación por pedido: al repartidor y al restaurante por separado.
CREATE TABLE IF NOT EXISTS rating (
  order_id         INT PRIMARY KEY,
  courier_stars    TINYINT UNSIGNED NOT NULL,
  restaurant_stars TINYINT UNSIGNED NOT NULL,
  comment          VARCHAR(300) NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rating_order FOREIGN KEY (order_id) REFERENCES client_order(id) ON DELETE CASCADE,
  CONSTRAINT chk_rating_courier    CHECK (courier_stars BETWEEN 1 AND 5),
  CONSTRAINT chk_rating_restaurant CHECK (restaurant_stars BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reportes de problemas con un pedido; los atiende el admin.
CREATE TABLE IF NOT EXISTS incident (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  reporter_id INT NOT NULL,
  reason      ENUM('late','missing_items','wrong_order','damaged','courier_behavior','other') NOT NULL,
  description VARCHAR(500) NOT NULL,
  status      ENUM('open','resolved') NOT NULL DEFAULT 'open',
  resolution  VARCHAR(300) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  KEY ix_incident_status (status, created_at),
  CONSTRAINT fk_incident_order    FOREIGN KEY (order_id)    REFERENCES client_order(id) ON DELETE CASCADE,
  CONSTRAINT fk_incident_reporter FOREIGN KEY (reporter_id) REFERENCES account(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Vistas de calificación promedio
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_restaurant_rating AS
SELECT o.restaurant_id,
       ROUND(AVG(r.restaurant_stars), 1) AS rating_avg,
       COUNT(*)                          AS rating_count
FROM rating r
JOIN client_order o ON o.id = r.order_id
GROUP BY o.restaurant_id;

CREATE OR REPLACE VIEW v_courier_rating AS
SELECT o.courier_id,
       ROUND(AVG(r.courier_stars), 1) AS rating_avg,
       COUNT(*)                       AS rating_count
FROM rating r
JOIN client_order o ON o.id = r.order_id
WHERE o.courier_id IS NOT NULL
GROUP BY o.courier_id;
