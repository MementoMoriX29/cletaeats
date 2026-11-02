// /api/courier — app del repartidor
const express = require('express');
const courierService = require('../services/courierService');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole, requireActive } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('courier'));

// Disponible también con la solicitud pendiente, para mostrar su estado
router.get('/me', async (req, res) => {
  res.json(await courierService.dashboard(req.user));
});

router.put('/availability', requireActive, validate(schemas.availability), async (req, res) => {
  res.json(await courierService.setAvailability(req.user, req.valid.body.online));
});

router.get('/offers', requireActive, async (req, res) => {
  res.json(await courierService.offers(req.user));
});

// Alternativa por HTTP al evento courier:location del socket
router.post('/location', requireActive, validate(schemas.location), async (req, res) => {
  await courierService.updateLocation(req.user.id, req.valid.body.lat, req.valid.body.lng);
  res.status(204).end();
});

router.get('/history', requireActive, async (req, res) => {
  res.json(await courierService.history(req.user));
});

module.exports = router;
