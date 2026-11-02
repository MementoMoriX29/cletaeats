// Utilidades compartidas por los tests de integración.
const request = require('supertest');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { app } = require('../src/app');
const accountDao = require('../src/dao/accountDao');

const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

let counter = 0;
const unique = (prefix) => `${prefix}.${process.pid}.${Date.now()}.${++counter}@test.local`;
const uniquePhone = () => `8${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
const uniqueNationalId = () => String(100000000 + Math.floor(Math.random() * 899999999));

const DEMO_PASSWORD = 'Password123';

// Cuentas de los datos de demostración
const SEED = {
  client: 'maria.garcia@example.com',
  restaurant1Owner: 'lacasona@example.com',   // Soda La Casona (id 1)
  restaurant2Owner: 'fornorosso@example.com', // Forno Rosso (id 2)
  closedRestaurantOwner: 'loscuates@example.com', // Taquería Los Cuates (id 8, cerrada)
};

// Ubicaciones en Heredia
const PLACES = {
  mercedesNorte: { lat: 10.0065, lng: -84.1232 },   // ~1.3 km de Soda La Casona
  parqueCentral: { lat: 9.9985, lng: -84.1172 },
  cartago: { lat: 9.8644, lng: -83.9194 },          // fuera del radio de entrega
};

const login = async (email, password = DEMO_PASSWORD) => {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login de ${email} falló: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
};

const registerClient = async () => {
  const res = await api().post('/api/auth/register').send({
    name: 'Cliente de Prueba', email: unique('cliente'), phone: uniquePhone(), password: DEMO_PASSWORD,
  });
  if (res.status !== 201) throw new Error(`Registro falló: ${JSON.stringify(res.body)}`);
  return res.body;
};

const createAdmin = async () => {
  const email = unique('admin');
  await accountDao.upsertAdmin({ email, passwordHash: await bcrypt.hash('Admin-Test-2026!', 4), name: 'Soporte' });
  return login(email, 'Admin-Test-2026!');
};

// Repartidor nuevo, aprobado y conectado cerca del centro de Heredia
const createCourier = async (adminToken, { online = true, place = PLACES.parqueCentral } = {}) => {
  const res = await api().post('/api/auth/register-courier').send({
    name: 'Repartidor de Prueba', email: unique('courier'), phone: uniquePhone(), password: DEMO_PASSWORD,
    national_id: uniqueNationalId(), vehicle: 'bicicleta',
  });
  if (res.status !== 201) throw new Error(`Registro de repartidor falló: ${JSON.stringify(res.body)}`);
  const { id } = res.body.user;
  const approve = await api().post(`/api/admin/couriers/${id}/approve`).set(auth(adminToken));
  if (approve.status !== 200) throw new Error(`Aprobación falló: ${JSON.stringify(approve.body)}`);
  const session = await login(res.body.user.email);
  await api().post('/api/courier/location').set(auth(session.token)).send(place).expect(204);
  if (online) await api().put('/api/courier/availability').set(auth(session.token)).send({ online: true }).expect(200);
  return session;
};

const addAddress = async (token, place = PLACES.mercedesNorte) => {
  const res = await api().post('/api/me/addresses').set(auth(token)).send({
    label: 'Casa', line: 'Mercedes Norte, 200 m norte de la plaza', details: 'Portón negro', ...place,
  });
  if (res.status !== 201) throw new Error(`No se pudo crear la dirección: ${JSON.stringify(res.body)}`);
  return res.body;
};

const CARD = { method: 'card', card_token: 'tok_testtesttesttest1234', card_brand: 'visa', card_last4: '4242' };

// Pedido en Soda La Casona (restaurante 1): 2 casados de pollo y un fresco
const placeOrder = async (token, { addressId, payment = CARD, items, restaurantId = 1, tip = 0 } = {}) => {
  const res = await api().post('/api/orders').set(auth(token)).send({
    restaurant_id: restaurantId,
    items: items ?? [{ product_id: 103, quantity: 2 }, { product_id: 108, quantity: 1 }],
    delivery: { address_id: addressId },
    payment,
    tip,
  });
  if (res.status !== 201) throw new Error(`Pedido falló: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
};

// Conexión directa para preparar casos que no se pueden provocar por la API (por ejemplo, el paso del tiempo)
const rawQuery = async (sql, params) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '', database: process.env.DB_NAME, timezone: 'Z',
  });
  try {
    await connection.query("SET time_zone = '+00:00'");
    const [rows] = await connection.query(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
};

module.exports = {
  api, auth, unique, uniquePhone, uniqueNationalId, login, registerClient, createAdmin, createCourier,
  addAddress, placeOrder, rawQuery, CARD, SEED, PLACES, DEMO_PASSWORD,
};
