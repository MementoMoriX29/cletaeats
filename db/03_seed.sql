-- CletaEats · Datos de prueba
-- MySQL 8.0+ (probado en MySQL 8.0 y compatible con HeatWave MySQL).
-- Orden de ejecución: 01_schema.sql → 02_routines.sql → 03_seed.sql (se cargan con: cd backend && npm run db:setup)

-- Contraseña de todos los usuarios de prueba: Password123
-- Las tarjetas son números de prueba públicos; solo se guardan los últimos 4 dígitos.

INSERT IGNORE INTO restaurant (name, tax_id, address, food_type, image_url) VALUES
('La Soda Tica',        '3-101-100001', 'San José, Barrio Escalante',   'Costa Rican',  'https://placehold.co/300x200?text=SodaTica'),
('Pizza Roma',          '3-101-100002', 'Alajuela, Centro',             'Italian',      'https://placehold.co/300x200?text=PizzaRoma'),
('Sushi Nippon',        '3-101-100003', 'Escazú, San Rafael',           'Japanese',     'https://placehold.co/300x200?text=SushiNippon'),
('Burger Queen',        '3-101-100004', 'Heredia, Mercado Central',     'Burgers',      'https://placehold.co/300x200?text=BurgerQueen'),
('Taquería El Jalapeño','3-101-100005', 'Liberia, Guanacaste',          'Mexican',      'https://placehold.co/300x200?text=Jalapeno'),
('Chifa Dragón Rojo',   '3-101-100006', 'San José, La Uruca',           'Chinese',      'https://placehold.co/300x200?text=ChifaDragon'),
('Mar y Tierra',        '3-101-100007', 'Puntarenas, Puerto',           'Seafood',      'https://placehold.co/300x200?text=MarYTierra');

-- Combos: price = (combo_number + 3) * 1000
-- Restaurant 1: La Soda Tica
INSERT IGNORE INTO combo (restaurant_id, combo_number, description, price) VALUES
(1,1,'Rice and beans with egg and sour cream',4000),(1,2,'Chicken casado with salad',5000),
(1,3,'Chicken soup with tortillas',6000),(1,4,'Hearty beef stew',7000),
(1,5,'Rice with chicken and patacones',8000),(1,6,'Tamales with coffee',9000),
(1,7,'Chifrijo with fried plantains',10000),(1,8,'Sea bass ceviche with crackers',11000),
(1,9,'Full executive plate',12000);

-- Restaurant 2: Pizza Roma
INSERT IGNORE INTO combo (restaurant_id, combo_number, description, price) VALUES
(2,1,'Personal margherita pizza',4000),(2,2,'Personal pepperoni pizza',5000),
(2,3,'Medium veggie pizza',6000),(2,4,'Medium Hawaiian pizza',7000),
(2,5,'Large four-cheese pizza',8000),(2,6,'Large house special pizza',9000),
(2,7,'Carbonara pasta + garlic bread',10000),(2,8,'Family lasagna + salad',11000),
(2,9,'Family combo: XL pizza + 2 pastas',12000);

-- Restaurant 3: Sushi Nippon
INSERT IGNORE INTO combo (restaurant_id, combo_number, description, price) VALUES
(3,1,'California roll x6',4000),(3,2,'Philadelphia roll x6',5000),
(3,3,'Sashimi mix x8',6000),(3,4,'Dragon roll x8 + miso soup',7000),
(3,5,'Nigiri mix x10',8000),(3,6,'Chicken teriyaki bento box',9000),
(3,7,'Spicy tuna roll x8 + wakame salad',10000),(3,8,'Premium sushi set x15 pieces',11000),
(3,9,'Chef omakase x20 pieces',12000);

-- Restaurant 4: Burger Queen
INSERT IGNORE INTO combo (restaurant_id, combo_number, description, price) VALUES
(4,1,'Simple burger + small fries',4000),(4,2,'Double burger + drink',5000),
(4,3,'BBQ burger + medium fries',6000),(4,4,'Family combo x2 burgers',7000),
(4,5,'Bacon burger + large fries + drink',8000),(4,6,'Veggie burger + salad + drink',9000),
(4,7,'Double smash burger + onion rings',10000),(4,8,'Couple combo x2 burgers + fries + drinks',11000),
(4,9,'Mega combo: 4 burgers + 4 fries + 4 drinks',12000);

-- Restaurant 5: Taquería El Jalapeño
INSERT IGNORE INTO combo (restaurant_id, combo_number, description, price) VALUES
(5,1,'2 al pastor tacos',4000),(5,2,'3 mixed tacos',5000),
(5,3,'Chicken burrito + agua fresca',6000),(5,4,'Large quesadilla + guacamole',7000),
(5,5,'Nachos with beef + jalapeños',8000),(5,6,'Beef fajitas + tortillas + pico de gallo',9000),
(5,7,'Green enchiladas x3 + rice',10000),(5,8,'Mexican combo: burrito + taco + quesadilla',11000),
(5,9,'Party platter: 10 tacos + 2 burritos + nachos',12000);

-- Restaurant 6: Chifa Dragón Rojo
INSERT IGNORE INTO combo (restaurant_id, combo_number, description, price) VALUES
(6,1,'Small chaufa rice',4000),(6,2,'Fried wonton x6',5000),
(6,3,'Chicken stir-fry noodles',6000),(6,4,'Lomo saltado + chaufa',7000),
(6,5,'Seafood chop suey',8000),(6,6,'Duck in sauce + fried rice',9000),
(6,7,'Assorted dim sum x8 pieces',10000),(6,8,'Family chifa banquet x2',11000),
(6,9,'Imperial grand banquet x4 persons',12000);

-- Restaurant 7: Mar y Tierra
INSERT IGNORE INTO combo (restaurant_id, combo_number, description, price) VALUES
(7,1,'Shrimp ceviche + crackers',4000),(7,2,'Fried tilapia fillet + salad',5000),
(7,3,'Garlic shrimp + rice',6000),(7,4,'Grilled corvina + patacones',7000),
(7,5,'Steamed crab + butter',8000),(7,6,'Mixed seafood platter',9000),
(7,7,'Lobster with butter + mashed potatoes',10000),(7,8,'Seafood paella for 2',11000),
(7,9,'Grand seafood banquet for 4',12000);

-- Test clients (password: Password123)
INSERT IGNORE INTO client (national_id, name, address, card_last4, phone, email, password, status) VALUES
('101110111','María García López','San José, Barrio Amón, Casa #45','1111','88001001','maria.garcia@email.com','$2a$10$i7U30qbxxENYhBb0GFadx.z/l/nzeGRxiy0NJ.rUvjctfid6YLfAK','active'),
('202220222','Carlos Rodríguez Mora','Alajuela, Urbanización Las Flores, Apt 3B','5559','88002002','carlos.rodriguez@email.com','$2a$10$i7U30qbxxENYhBb0GFadx.z/l/nzeGRxiy0NJ.rUvjctfid6YLfAK','active');

-- Test delivery persons (password: Password123)
INSERT IGNORE INTO delivery_person (national_id, name, email, password, address, phone, card_last4, status) VALUES
('303330333','Andrés Jiménez Vega','andres.jimenez@email.com','$2a$10$i7U30qbxxENYhBb0GFadx.z/l/nzeGRxiy0NJ.rUvjctfid6YLfAK','San José, Desamparados, Calle 10','87003003','4444','available'),
('404440444','Laura Solís Campos','laura.solis@email.com','$2a$10$i7U30qbxxENYhBb0GFadx.z/l/nzeGRxiy0NJ.rUvjctfid6YLfAK','Heredia, Santo Domingo, Av. 5','87004004','3333','available');

-- Coordenadas de los restaurantes de prueba (Heredia)
UPDATE restaurant SET latitude = 9.9981,  longitude = -84.1197 WHERE id = 1;
UPDATE restaurant SET latitude = 9.9947,  longitude = -84.1123 WHERE id = 2;
UPDATE restaurant SET latitude = 10.0006, longitude = -84.1143 WHERE id = 3;
UPDATE restaurant SET latitude = 9.9921,  longitude = -84.1089 WHERE id = 4;
UPDATE restaurant SET latitude = 9.9963,  longitude = -84.1215 WHERE id = 5;
