// /api/me — la cuenta que inició sesión: perfil, contraseña y direcciones guardadas
const express = require('express');
const accountService = require('../services/accountService');
const authService = require('../services/authService');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimits');
const { parseId } = require('../utils/params');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  res.json(await accountService.getMe(req.user.id));
});

router.put('/', validate(schemas.updateProfile), async (req, res) => {
  res.json(await accountService.updateMe(req.user.id, req.valid.body));
});

// Devuelve una sesión nueva; las demás sesiones abiertas se cierran
router.put('/password', authLimiter, validate(schemas.changePassword), async (req, res) => {
  res.json(await authService.changePassword(req.user.id, req.valid.body));
});

const addressId = (req) => parseId(req.params.id, 'Dirección no encontrada');

router.get('/addresses', requireRole('client'), async (req, res) => {
  res.json(await accountService.listAddresses(req.user.id));
});

router.post('/addresses', requireRole('client'), validate(schemas.address), async (req, res) => {
  res.status(201).json(await accountService.createAddress(req.user.id, req.valid.body));
});

router.put('/addresses/:id', requireRole('client'), validate(schemas.address), async (req, res) => {
  res.json(await accountService.updateAddress(req.user.id, addressId(req), req.valid.body));
});

router.delete('/addresses/:id', requireRole('client'), async (req, res) => {
  await accountService.deleteAddress(req.user.id, addressId(req));
  res.status(204).end();
});

module.exports = router;
