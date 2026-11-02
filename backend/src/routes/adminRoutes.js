// /api/admin — soporte y administración
const express = require('express');
const adminService = require('../services/adminService');
const orderService = require('../services/orderService');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { parseId } = require('../utils/params');
const { notFound } = require('../utils/errors');

const { z } = schemas;
const router = express.Router();
router.use(authenticate, requireRole('admin'));

const id = (req) => parseId(req.params.id);

// ── Indicadores ────────────────────────────────────────────────
const overviewQuery = z.object({ days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d)).default(30) });

router.get('/overview', validate(overviewQuery, 'query'), async (req, res) => {
  res.json(await adminService.overview(req.valid.query.days));
});

// ── Pedidos ────────────────────────────────────────────────────
const ordersQuery = z.object({
  filter: z.enum(['active', 'pending', 'accepted', 'ready', 'picked_up', 'delivered', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

router.get('/orders', validate(ordersQuery, 'query'), async (req, res) => {
  res.json(await adminService.listOrders(req.valid.query.filter ?? null, req.valid.query.limit));
});

router.post('/orders/:id/cancel', validate(schemas.adminCancel), async (req, res) => {
  res.json(await orderService.cancelByAdmin(req.user, id(req), req.valid.body));
});

// ── Repartidores ───────────────────────────────────────────────
const courierQuery = z.object({ status: z.enum(['pending', 'active', 'suspended', 'rejected']).optional() });
const COURIER_ACTIONS = ['approve', 'reject', 'suspend', 'reactivate'];

router.get('/couriers', validate(courierQuery, 'query'), async (req, res) => {
  res.json(await adminService.listCouriers(req.valid.query.status ?? null));
});

router.get('/couriers/:id/warnings', async (req, res) => {
  res.json(await adminService.courierWarnings(id(req)));
});

router.post('/couriers/:id/warnings', validate(schemas.courierWarning), async (req, res) => {
  res.status(201).json(await adminService.warnCourier(id(req), req.valid.body.reason));
});

router.post('/couriers/:id/:action', async (req, res) => {
  if (!COURIER_ACTIONS.includes(req.params.action)) throw notFound();
  res.json(await adminService.courierAction(id(req), req.params.action));
});

// ── Restaurantes ───────────────────────────────────────────────
router.get('/restaurants', async (_req, res) => {
  res.json(await adminService.listRestaurants());
});

router.post('/restaurants', validate(schemas.createRestaurant), async (req, res) => {
  res.status(201).json(await adminService.createRestaurant(req.valid.body));
});

router.put('/restaurants/:id', validate(schemas.restaurantAdmin), async (req, res) => {
  res.json(await adminService.updateRestaurant(id(req), req.valid.body));
});

router.post('/restaurants/:id/activate', async (req, res) => {
  res.json(await adminService.setRestaurantActive(id(req), true));
});

router.post('/restaurants/:id/deactivate', async (req, res) => {
  res.json(await adminService.setRestaurantActive(id(req), false));
});

// ── Clientes ───────────────────────────────────────────────────
const clientQuery = z.object({ search: z.string().trim().max(60).optional() });

router.get('/clients', validate(clientQuery, 'query'), async (req, res) => {
  res.json(await adminService.listClients(req.valid.query.search || null));
});

router.post('/clients/:id/suspend', async (req, res) => {
  res.json(await adminService.setClientStatus(id(req), 'suspended'));
});

router.post('/clients/:id/reactivate', async (req, res) => {
  res.json(await adminService.setClientStatus(id(req), 'active'));
});

// ── Incidentes ─────────────────────────────────────────────────
const incidentQuery = z.object({ status: z.enum(['open', 'resolved']).optional() });

router.get('/incidents', validate(incidentQuery, 'query'), async (req, res) => {
  res.json(await adminService.listIncidents(req.valid.query.status ?? null));
});

router.post('/incidents/:id/resolve', validate(schemas.resolveIncident), async (req, res) => {
  res.json(await adminService.resolveIncident(id(req), req.valid.body));
});

module.exports = router;
