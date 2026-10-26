-- CletaEats · Esquema
-- MySQL 8.0+ (probado en MySQL 8.0 y compatible con HeatWave MySQL).
-- Orden de ejecución: 01_schema.sql → 02_routines.sql → 03_seed.sql (se cargan con: cd backend && npm run db:setup)

CREATE TABLE IF NOT EXISTS client (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  national_id VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  address     TEXT         NOT NULL,
  card_last4  CHAR(4)      NOT NULL,  -- solo los últimos 4 dígitos (no se guarda el número completo)
  phone       VARCHAR(20)  NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  status      ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS restaurant (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  tax_id      VARCHAR(20)  NOT NULL UNIQUE,
  address     TEXT         NOT NULL,
  food_type   VARCHAR(50)  NOT NULL,
  image_url   TEXT,
  phone       VARCHAR(20),
  description TEXT,
  active      BOOLEAN      NOT NULL DEFAULT TRUE,
  latitude    DECIMAL(10,7) NULL,
  longitude   DECIMAL(10,7) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS combo (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT       NOT NULL,
  combo_number  TINYINT   NOT NULL,
  description   TEXT      NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  image_url     TEXT,
  available     BOOLEAN   NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_restaurant_combo (restaurant_id, combo_number),
  CONSTRAINT chk_combo_number CHECK (combo_number BETWEEN 1 AND 9),
  FOREIGN KEY (restaurant_id) REFERENCES restaurant(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delivery_person (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  national_id      VARCHAR(20)  NOT NULL UNIQUE,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(100) NOT NULL UNIQUE,
  password         VARCHAR(255) NOT NULL,
  address          TEXT         NOT NULL,
  phone            VARCHAR(20)  NOT NULL,
  card_last4       CHAR(4)      NOT NULL,  -- solo los últimos 4 dígitos
  -- offline = el repartidor se desconectó por su cuenta; suspended = suspendido (admin o 4 amonestaciones)
  status           ENUM('available','busy','offline','suspended') NOT NULL DEFAULT 'available',
  current_distance DECIMAL(8,2) DEFAULT 0,
  daily_km         DECIMAL(8,2) DEFAULT 0,
  workday_km_rate  DECIMAL(8,2) NOT NULL DEFAULT 1000,
  holiday_km_rate  DECIMAL(8,2) NOT NULL DEFAULT 1500,
  warnings_count   INT          NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "order" es palabra reservada en MySQL, por eso la tabla se llama client_order
CREATE TABLE IF NOT EXISTS client_order (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  client_id          INT     NOT NULL,
  restaurant_id      INT     NOT NULL,
  delivery_person_id INT,
  status             ENUM('preparing','in_transit','suspended','delivered') NOT NULL DEFAULT 'preparing',
  placed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at       TIMESTAMP NULL,
  distance_km        DECIMAL(8,2) NOT NULL DEFAULT 1,
  is_holiday         BOOLEAN  NOT NULL DEFAULT FALSE,
  delivery_address   TEXT,
  notes              TEXT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id)          REFERENCES client(id),
  FOREIGN KEY (restaurant_id)      REFERENCES restaurant(id),
  FOREIGN KEY (delivery_person_id) REFERENCES delivery_person(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_item (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  combo_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  FOREIGN KEY (order_id) REFERENCES client_order(id) ON DELETE CASCADE,
  FOREIGN KEY (combo_id) REFERENCES combo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  delivery_person_id INT  NOT NULL,
  client_id          INT  NOT NULL,
  order_id           INT  NULL,
  description        TEXT NOT NULL,
  friendliness       TINYINT NOT NULL,
  response_time      TINYINT NOT NULL,
  presentation       TINYINT NOT NULL,
  adds_warning       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_friendliness    CHECK (friendliness    BETWEEN 1 AND 5),
  CONSTRAINT chk_response_time   CHECK (response_time   BETWEEN 1 AND 5),
  CONSTRAINT chk_presentation    CHECK (presentation    BETWEEN 1 AND 5),
  FOREIGN KEY (delivery_person_id) REFERENCES delivery_person(id),
  FOREIGN KEY (client_id)          REFERENCES client(id),
  FOREIGN KEY (order_id)           REFERENCES client_order(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT NOT NULL UNIQUE,
  subtotal        DECIMAL(10,2) NOT NULL,
  transport_cost  DECIMAL(10,2) NOT NULL,
  iva             DECIMAL(10,2) NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES client_order(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
