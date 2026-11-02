-- CletaEats · Datos de demostración
-- Restaurantes, menús y cuentas ficticias en Heredia. Los nombres, correos y teléfonos son inventados.
-- Contraseña de todas las cuentas: Password123
-- La cuenta de administración NO se crea acá: se crea con  npm run create-admin
-- Los pedidos de los últimos 30 días los genera backend/scripts/seed-history.js.
--
-- "ON DUPLICATE KEY UPDATE id = id" hace que se pueda correr varias veces sin duplicar nada
-- (a diferencia de INSERT IGNORE, no esconde otros errores).

SET @demo_hash = '$2a$10$i7U30qbxxENYhBb0GFadx.z/l/nzeGRxiy0NJ.rUvjctfid6YLfAK';

-- ─────────────────────────────────────────────────────────────
-- Dueños de restaurantes (cuentas 1–8)
-- ─────────────────────────────────────────────────────────────
INSERT INTO account (id, email, password_hash, role, status, name, phone) VALUES
(1, 'lacasona@example.com',   @demo_hash, 'restaurant', 'active', 'Marta Hernández Rojas', '8810-1101'),
(2, 'fornorosso@example.com', @demo_hash, 'restaurant', 'active', 'Luca Rossi Vargas',     '8810-2202'),
(3, 'sakura@example.com',     @demo_hash, 'restaurant', 'active', 'Akemi Mena Solís',      '8810-3303'),
(4, 'smashclub@example.com',  @demo_hash, 'restaurant', 'active', 'Diego Alvarado Pérez',  '8810-4404'),
(5, 'flordecafe@example.com', @demo_hash, 'restaurant', 'active', 'Sofía Chacón Murillo',  '8810-5505'),
(6, 'lalenera@example.com',   @demo_hash, 'restaurant', 'active', 'Rodrigo Villalobos Ureña', '8810-6606'),
(7, 'verdebowl@example.com',  @demo_hash, 'restaurant', 'active', 'Camila Fonseca Ramos',  '8810-7707'),
(8, 'loscuates@example.com',  @demo_hash, 'restaurant', 'active', 'Héctor Salazar Mena',   '8810-8808')
ON DUPLICATE KEY UPDATE id = id;

-- ─────────────────────────────────────────────────────────────
-- Clientes (cuentas 11–20)
-- ─────────────────────────────────────────────────────────────
INSERT INTO account (id, email, password_hash, role, status, name, phone) VALUES
(11, 'maria.garcia@example.com',     @demo_hash, 'client', 'active', 'María García López',      '8800-1001'),
(12, 'carlos.rodriguez@example.com', @demo_hash, 'client', 'active', 'Carlos Rodríguez Mora',   '8800-2002'),
(13, 'daniela.vargas@example.com',   @demo_hash, 'client', 'active', 'Daniela Vargas Solano',   '8800-3003'),
(14, 'jose.chaves@example.com',      @demo_hash, 'client', 'active', 'José Pablo Chaves Ruiz',  '8800-4004'),
(15, 'valeria.rojas@example.com',    @demo_hash, 'client', 'active', 'Valeria Rojas Méndez',    '8800-5005'),
(16, 'esteban.quesada@example.com',  @demo_hash, 'client', 'active', 'Esteban Quesada Alfaro',  '8800-6006'),
(17, 'natalia.araya@example.com',    @demo_hash, 'client', 'active', 'Natalia Araya Brenes',    '8800-7007'),
(18, 'sebastian.castro@example.com', @demo_hash, 'client', 'active', 'Sebastián Castro Jiménez','8800-8008'),
(19, 'fernanda.ulate@example.com',   @demo_hash, 'client', 'active', 'Fernanda Ulate Rojas',    '8800-9009'),
(20, 'gabriel.monge@example.com',    @demo_hash, 'client', 'active', 'Gabriel Monge Vega',      '8801-1010')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO address (id, client_id, label, line, details, lat, lng) VALUES
(1,  11, 'Casa',        'Mercedes Norte, 200 m norte de la plaza',            'Casa esquinera, portón negro',   10.0065000, -84.1232000),
(2,  11, 'Trabajo',     'Universidad Nacional, Campus Omar Dengo',           'Edificio de Ciencias Sociales',  10.0011000, -84.1106000),
(3,  12, 'Casa',        'San Francisco de Heredia, Residencial Las Flores',  'Casa 12B',                       9.9898000,  -84.1302000),
(4,  13, 'Apartamento', 'Heredia centro, 150 m oeste del Parque Central',    'Condominio Torres del Parque, apto 504', 9.9975000, -84.1158000),
(5,  14, 'Casa',        'Barreal de Heredia, 150 m este de la escuela',       'Casa verde con verjas blancas',  9.9872000,  -84.1335000),
(6,  15, 'Casa',        'San Pablo de Heredia, Urbanización Rincón Verde',   'Casa 33',                        9.9927000,  -84.0952000),
(7,  16, 'Oficina',     'Ulloa de Heredia, 100 m norte de la gasolinera',     'Edificio de 3 pisos, recepción', 9.9845000,  -84.1380000),
(8,  17, 'Casa',        'Santa Lucía de Barva, 100 m sur de la iglesia',      'Portón café',                    10.0198000, -84.1102000),
(9,  18, 'Casa',        'Barrio Fátima, del hospital 300 m norte',           'Casa amarilla de dos plantas',   10.0010000, -84.1210000),
(10, 19, 'Casa',        'Mercedes Sur, Residencial Los Lagos',               'Casa 7, timbre a la izquierda',  9.9930000,  -84.1350000),
(11, 20, 'Casa',        'San Rafael de Heredia, 400 m oeste del parque',     NULL,                             10.0118000, -84.1005000)
ON DUPLICATE KEY UPDATE id = id;

-- ─────────────────────────────────────────────────────────────
-- Repartidores (cuentas 31–36). Dos solicitudes quedan pendientes de revisión.
-- ─────────────────────────────────────────────────────────────
INSERT INTO account (id, email, password_hash, role, status, name, phone) VALUES
(31, 'andres.jimenez@example.com', @demo_hash, 'courier', 'active',  'Andrés Jiménez Vega',  '8700-3003'),
(32, 'laura.solis@example.com',    @demo_hash, 'courier', 'active',  'Laura Solís Campos',   '8700-4004'),
(33, 'kevin.ramirez@example.com',  @demo_hash, 'courier', 'active',  'Kevin Ramírez Solano', '8700-5005'),
(34, 'monica.soto@example.com',    @demo_hash, 'courier', 'active',  'Mónica Soto Arias',    '8700-6006'),
(35, 'diego.mora@example.com',     @demo_hash, 'courier', 'pending', 'Diego Mora Calvo',     '8700-7007'),
(36, 'paula.herrera@example.com',  @demo_hash, 'courier', 'pending', 'Paula Herrera Núñez',  '8700-8008')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO courier (account_id, national_id, vehicle, availability, last_lat, last_lng, last_seen_at, approved_at) VALUES
(31, '303330333', 'bicicleta', 'offline', 9.9985000,  -84.1172000, NOW(), NOW() - INTERVAL 120 DAY),
(32, '404440444', 'scooter',   'offline', 10.0008000, -84.1115000, NOW(), NOW() - INTERVAL 95 DAY),
(33, '112340567', 'bicicleta', 'offline', 9.9870000,  -84.1300000, NOW(), NOW() - INTERVAL 60 DAY),
(34, '113450678', 'scooter',   'offline', 9.9940000,  -84.1000000, NOW(), NOW() - INTERVAL 45 DAY),
(35, '114560789', 'bicicleta', 'offline', NULL, NULL, NULL, NULL),
(36, '115670890', 'scooter',   'offline', NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE account_id = account_id;

-- ─────────────────────────────────────────────────────────────
-- Restaurantes
-- ─────────────────────────────────────────────────────────────
INSERT INTO restaurant (id, owner_account_id, name, tax_id, category, description, address, lat, lng, phone, sinpe_phone, prep_minutes, is_open) VALUES
(1, 1, 'Soda La Casona',       '3-101-700101', 'Comida típica',
    'Casados, gallo pinto y comida casera como la de la abuela.',
    'Heredia centro, 100 m sur del Mercado Municipal',             9.9981000,  -84.1197000, '2260-1101', '8810-1101', 15, TRUE),
(2, 2, 'Forno Rosso',          '3-101-700202', 'Pizza',
    'Pizza napolitana en horno de leña y pastas frescas.',
    'Heredia, 75 m este del Parque Central',                       9.9947000,  -84.1123000, '2260-2202', '8810-2202', 20, TRUE),
(3, 3, 'Sakura Sushi Bar',     '3-101-700303', 'Sushi',
    'Rolls, nigiri y ramen preparados al momento.',
    'Heredia, 200 m oeste de la Universidad Nacional',             10.0006000, -84.1143000, '2260-3303', '8810-3303', 25, TRUE),
(4, 4, 'Smash Club Burgers',   '3-101-700404', 'Hamburguesas',
    'Hamburguesas smash, papas cortadas a mano y malteadas.',
    'San Francisco de Heredia, 50 m norte de la iglesia',          9.9921000,  -84.1089000, '2260-4404', '8810-4404', 18, TRUE),
(5, 5, 'Flor de Café',         '3-101-700505', 'Café y repostería',
    'Café de altura de Barva, repostería del día y desayunos.',
    'Heredia, costado norte del Parque Central',                   9.9963000,  -84.1215000, '2260-5505', '8810-5505', 10, TRUE),
(6, 6, 'La Leñera',            '3-101-700606', 'Pollo',
    'Pollo a la leña, costillas y acompañamientos para compartir.',
    'Barreal de Heredia, 300 m sur de la plaza',                   9.9855000,  -84.1290000, '2260-6606', '8810-6606', 20, TRUE),
(7, 7, 'Verde Bowl',           '3-101-700707', 'Saludable',
    'Bowls, ensaladas y batidos naturales.',
    'Mercedes Norte, frente a la plaza de deportes',               10.0078000, -84.1251000, '2260-7707', '8810-7707', 12, TRUE),
(8, 8, 'Taquería Los Cuates',  '3-101-700808', 'Mexicana',
    'Tacos al pastor, birria y burritos.',
    'San Pablo de Heredia, 100 m oeste del templo católico',       9.9952000,  -84.0985000, '2260-8808', '8810-8808', 15, FALSE)
ON DUPLICATE KEY UPDATE id = id;

-- ─────────────────────────────────────────────────────────────
-- Menús (precios en colones, IVA incluido). Ids: restaurante × 100 + número.
-- ─────────────────────────────────────────────────────────────
INSERT INTO product (id, restaurant_id, section, name, description, price, available, position) VALUES
-- Soda La Casona
(101, 1, 'Desayunos',      'Gallo pinto con huevo',   'Gallo pinto, huevo al gusto, plátano maduro, natilla y tortilla.', 3200, TRUE, 1),
(102, 1, 'Desayunos',      'Pinto completo',          'Gallo pinto, huevos, salchichón, queso frito, maduro y café.',     4300, TRUE, 2),
(103, 1, 'Platos fuertes', 'Casado de pollo',         'Arroz, frijoles, ensalada, maduro, picadillo y pechuga a la plancha.', 4200, TRUE, 3),
(104, 1, 'Platos fuertes', 'Casado de bistec',        'Bistec encebollado con arroz, frijoles, ensalada, maduro y picadillo.', 4600, TRUE, 4),
(105, 1, 'Platos fuertes', 'Casado de pescado',       'Filete empanizado con los acompañamientos de la casa.',            4800, TRUE, 5),
(106, 1, 'Platos fuertes', 'Olla de carne',           'Sopa de res con yuca, chayote, elote y plátano. Arroz aparte.',    4500, TRUE, 6),
(107, 1, 'Platos fuertes', 'Arroz con pollo',         'Con papas tostadas y ensalada rusa.',                              3900, TRUE, 7),
(108, 1, 'Bebidas',        'Fresco natural',          'Cas, mora o maracuyá, en agua o en leche.',                        1200, TRUE, 8),
(109, 1, 'Bebidas',        'Agua dulce',              'Sola o con leche.',                                                 900, TRUE, 9),
(110, 1, 'Postres',        'Arroz con leche',         'Receta de la casa, con canela.',                                   1300, TRUE, 10),
-- Forno Rosso
(201, 2, 'Pizzas',  'Margherita',              'Salsa de tomate, mozzarella fresca y albahaca. Grande, 8 porciones.', 8900, TRUE, 1),
(202, 2, 'Pizzas',  'Pepperoni',               'Doble pepperoni y mozzarella. Grande, 8 porciones.',               9500, TRUE, 2),
(203, 2, 'Pizzas',  'Cuatro quesos',           'Mozzarella, gorgonzola, parmesano y provolone.',                   10200, TRUE, 3),
(204, 2, 'Pizzas',  'Hawaiana',                'Jamón, piña y mozzarella.',                                        9800, TRUE, 4),
(205, 2, 'Pizzas',  'Prosciutto e funghi',     'Prosciutto, hongos frescos y mozzarella.',                         10900, TRUE, 5),
(206, 2, 'Pastas',  'Lasaña boloñesa',         'Capas de pasta fresca, ragú de res y bechamel.',                   6500, TRUE, 6),
(207, 2, 'Pastas',  'Fettuccine Alfredo con pollo', 'Salsa de crema y parmesano.',                                 6200, TRUE, 7),
(208, 2, 'Entradas','Pan de ajo con queso',    '6 unidades.',                                                       2500, TRUE, 8),
(209, 2, 'Bebidas', 'Limonada con hierbabuena','500 ml.',                                                           1600, TRUE, 9),
(210, 2, 'Bebidas', 'Refresco en lata',        'Varios sabores.',                                         900, TRUE, 10),
(211, 2, 'Postres', 'Tiramisú',                'Receta tradicional con café y mascarpone.',                        2800, TRUE, 11),
-- Sakura Sushi Bar
(301, 3, 'Rolls',     'Philadelphia roll',  'Salmón, queso crema y pepino. 10 piezas.',                           6200, TRUE, 1),
(302, 3, 'Rolls',     'California roll',    'Kanikama, aguacate y pepino con ajonjolí. 10 piezas.',               5400, TRUE, 2),
(303, 3, 'Rolls',     'Dragon roll',        'Tempura de camarón cubierta de aguacate y salsa anguila. 10 piezas.', 7400, TRUE, 3),
(304, 3, 'Rolls',     'Spicy tuna roll',    'Atún picante, pepino y cebollino. 10 piezas.',                       6800, TRUE, 4),
(305, 3, 'Combos',    'Combo para dos',     '3 rolls a elección (30 piezas) y 2 sopas miso.',                     16500, TRUE, 5),
(306, 3, 'Calientes', 'Ramen tonkotsu',     'Caldo de cerdo, chashu, huevo marinado y fideos.',                   6900, TRUE, 6),
(307, 3, 'Calientes', 'Gyozas de cerdo',    '6 unidades con salsa ponzu.',                                        3600, TRUE, 7),
(308, 3, 'Calientes', 'Sopa miso',          'Tofu, alga wakame y cebollino.',                                     1800, TRUE, 8),
(309, 3, 'Bebidas',   'Té verde frío',      '500 ml, sin azúcar.',                                                1500, TRUE, 9),
-- Smash Club Burgers
(401, 4, 'Hamburguesas',     'Clásica smash',      'Doble torta smash, queso americano, pepinillos y salsa de la casa.', 5600, TRUE, 1),
(402, 4, 'Hamburguesas',     'Bacon BBQ',          'Doble torta, tocineta, cheddar, cebolla crispy y salsa BBQ.',  6400, TRUE, 2),
(403, 4, 'Hamburguesas',     'Hongos y suizo',     'Doble torta, hongos salteados y queso suizo.',                6300, TRUE, 3),
(404, 4, 'Hamburguesas',     'Crispy chicken',     'Pechuga empanizada, repollo morado y mayonesa picante.',      5800, TRUE, 4),
(405, 4, 'Acompañamientos',  'Papas a mano',       'Cortadas en casa, con sal de mar.',                           2200, TRUE, 5),
(406, 4, 'Acompañamientos',  'Aros de cebolla',    'Con salsa ranch.',                                            2500, TRUE, 6),
(407, 4, 'Acompañamientos',  'Papas con queso y tocineta', 'Cheddar fundido, tocineta y cebollino.',              3300, TRUE, 7),
(408, 4, 'Bebidas',          'Malteada de vainilla', '400 ml.',                                                    2900, TRUE, 8),
(409, 4, 'Bebidas',          'Malteada de chocolate', '400 ml.',                                                   2900, TRUE, 9),
(410, 4, 'Bebidas',          'Refresco en lata',   'Varios sabores.',                                   900, TRUE, 10),
-- Flor de Café
(501, 5, 'Café',       'Café chorreado',          'Café de Barva preparado en chorreador.',              1400, TRUE, 1),
(502, 5, 'Café',       'Capuchino',               'Doble shot con leche texturizada.',                   1900, TRUE, 2),
(503, 5, 'Café',       'Latte de vainilla',       'Con jarabe de vainilla de la casa.',                  2200, TRUE, 3),
(504, 5, 'Café',       'Frappé de moca',          'Café, chocolate y hielo, con crema batida.',          2600, TRUE, 4),
(505, 5, 'Desayunos',  'Tostadas francesas',      'Con frutas de temporada y miel de maple.',            3400, TRUE, 5),
(506, 5, 'Desayunos',  'Sándwich de jamón y queso','En pan de masa madre.',                               2800, TRUE, 6),
(507, 5, 'Repostería', 'Queque seco',             'Porción.',                                            1200, TRUE, 7),
(508, 5, 'Repostería', 'Cheesecake de maracuyá',  'Porción.',                                            2600, TRUE, 8),
(509, 5, 'Repostería', 'Empanada de chiverre',    'Solo en temporada.',                                  1100, FALSE, 9),
(510, 5, 'Repostería', 'Croissant de almendra',   'Horneado en la mañana.',                              1900, TRUE, 10),
-- La Leñera
(601, 6, 'Pollo',           '1/4 de pollo a la leña', 'Con papas y ensalada.',                       3600, TRUE, 1),
(602, 6, 'Pollo',           '1/2 pollo a la leña',    'Con papas, ensalada y tortillas.',            6200, TRUE, 2),
(603, 6, 'Pollo',           'Pollo entero',           'Con papas grandes, ensalada y tortillas. Para 4 personas.', 11500, TRUE, 3),
(604, 6, 'Parrilla',        'Costillas BBQ',          'Media costilla de cerdo con salsa BBQ y papas.', 7900, TRUE, 4),
(605, 6, 'Parrilla',        'Chuleta ahumada',        'Con arroz, frijoles y ensalada.',             5900, TRUE, 5),
(606, 6, 'Acompañamientos', 'Papas fritas',           'Porción grande.',                             1800, TRUE, 6),
(607, 6, 'Acompañamientos', 'Ensalada de repollo',    'Con limón y culantro.',                       1200, TRUE, 7),
(608, 6, 'Acompañamientos', 'Yuca frita',             'Con chimichurri.',                            1900, TRUE, 8),
(609, 6, 'Bebidas',         'Fresco natural (1 litro)','Cas, mora o tamarindo.',                     2300, TRUE, 9),
-- Verde Bowl
(701, 7, 'Bowls',     'Bowl de pollo teriyaki', 'Arroz integral, pollo, edamame, zanahoria, aguacate y ajonjolí.', 5900, TRUE, 1),
(702, 7, 'Bowls',     'Poke de atún',           'Atún fresco, arroz, mango, pepino y salsa ponzu.',              7200, TRUE, 2),
(703, 7, 'Bowls',     'Bowl vegano de garbanzo','Garbanzos especiados, quinoa, vegetales asados y hummus.',      5400, TRUE, 3),
(704, 7, 'Ensaladas', 'César con pollo',        'Lechuga romana, pollo a la plancha, parmesano y crutones.',     4900, TRUE, 4),
(705, 7, 'Ensaladas', 'Ensalada griega',        'Pepino, tomate, aceitunas, cebolla morada y queso feta.',       4600, TRUE, 5),
(706, 7, 'Batidos',   'Batido verde',           'Espinaca, piña, manzana y jengibre.',                           2400, TRUE, 6),
(707, 7, 'Batidos',   'Batido de fresa y banano','Con leche de almendras.',                                      2400, TRUE, 7),
(708, 7, 'Snacks',    'Wrap de pollo',          'Tortilla integral, pollo, aguacate y vegetales.',               4200, TRUE, 8),
(709, 7, 'Snacks',    'Yogur con granola',      'Yogur griego, granola de la casa y frutas.',                    2300, TRUE, 9),
-- Taquería Los Cuates
(801, 8, 'Tacos',   'Tacos al pastor',       '3 tacos con piña, cebolla y culantro.',      3900, TRUE, 1),
(802, 8, 'Tacos',   'Tacos de birria',       '3 tacos con consomé para mojar.',            4800, TRUE, 2),
(803, 8, 'Tacos',   'Tacos de pollo',        '3 tacos con pico de gallo.',                 3600, TRUE, 3),
(804, 8, 'Platos',  'Burrito de carne asada','Con arroz, frijoles, queso y guacamole.',    4900, TRUE, 4),
(805, 8, 'Platos',  'Quesadilla de queso y hongos', 'Tortilla de harina, queso Oaxaca y hongos.', 3800, TRUE, 5),
(806, 8, 'Platos',  'Nachos supremos',       'Carne, frijoles, queso, pico de gallo y natilla.', 5200, TRUE, 6),
(807, 8, 'Bebidas', 'Horchata',              '500 ml.',                                    1500, TRUE, 7),
(808, 8, 'Bebidas', 'Agua de jamaica',       '500 ml.',                                    1500, TRUE, 8)
ON DUPLICATE KEY UPDATE id = id;
