// /api/orders — pedidos. Cada acción la puede hacer un solo rol; además, el procedimiento almacenado
// revisa que el pedido sea de quien lo pide y que esté en el estado correcto.
const express = require('express');
const orderService = require('../services/orderService');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rateLimits');
const { parseId } = require('../utils/params');

const router = express.Router();
router.use(authenticate);

const orderId = (req) => parseId(req.params.id, 'Pedido no encontrado');
const client = requireRole('client');
const restaurant = requireRole('restaurant');
const courier = [requireRole('courier'), requireActive];

// Cliente
router.post('/quote', client, validate(schemas.quote), async (req, res) => {
  res.json(await orderService.quote(req.user, req.valid.body));
});

router.post('/', client, orderLimiter, validate(schemas.createOrder), async (req, res) => {
  res.status(201).json(await orderService.createOrder(req.user, req.valid.body));
});

router.get('/', client, async (req, res) => {
  res.json(await orderService.listForClient(req.user));
});

// Cualquier rol: el servicio responde 404 si el pedido no es suyo
router.get('/:id', async (req, res) => {
  res.json(await orderService.getOrder(req.user, orderId(req)));
});

router.post('/:id/cancel', client, validate(schemas.cancelOrder), async (req, res) => {
  res.json(await orderService.cancelByClient(req.user, orderId(req), req.valid.body));
});

router.post('/:id/rating', client, validate(schemas.rating), async (req, res) => {
  res.status(201).json(await orderService.rate(req.user, orderId(req), req.valid.body));
});

router.post('/:id/incidents', client, validate(schemas.incident), async (req, res) => {
  res.status(201).json(await orderService.reportIncident(req.user, orderId(req), req.valid.body));
});

// Restaurante
router.post('/:id/accept', restaurant, validate(schemas.acceptOrder), async (req, res) => {
  res.json(await orderService.accept(req.user, orderId(req), req.valid.body));
});

router.post('/:id/reject', restaurant, validate(schemas.rejectOrder), async (req, res) => {
  res.json(await orderService.reject(req.user, orderId(req), req.valid.body));
});

router.post('/:id/ready', restaurant, async (req, res) => {
  res.json(await orderService.markReady(req.user, orderId(req)));
});

// Repartidor
router.post('/:id/claim', courier, async (req, res) => {
  res.json(await orderService.claim(req.user, orderId(req)));
});

router.post('/:id/pickup', courier, async (req, res) => {
  res.json(await orderService.pickup(req.user, orderId(req)));
});

router.post('/:id/deliver', courier, async (req, res) => {
  res.json(await orderService.deliver(req.user, orderId(req)));
});

module.exports = router;
