// /api/merchant — panel del restaurante
const express = require('express');
const merchantService = require('../services/merchantService');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { parseId } = require('../utils/params');

const router = express.Router();
router.use(authenticate, requireRole('restaurant'));

const productId = (req) => parseId(req.params.id, 'Producto no encontrado');

router.get('/store', async (req, res) => {
  res.json(await merchantService.getStore(req.user));
});

router.put('/store', validate(schemas.restaurantSettings), async (req, res) => {
  res.json(await merchantService.updateSettings(req.user, req.valid.body));
});

router.put('/store/open', validate(schemas.openStatus), async (req, res) => {
  res.json(await merchantService.setOpen(req.user, req.valid.body.is_open));
});

// ?scope=active (por defecto) o history
router.get('/orders', async (req, res) => {
  res.json(await merchantService.listOrders(req.user, req.query.scope === 'history' ? 'history' : 'active'));
});

router.get('/menu', async (req, res) => {
  res.json(await merchantService.getMenu(req.user));
});

router.post('/products', validate(schemas.product), async (req, res) => {
  res.status(201).json(await merchantService.createProduct(req.user, req.valid.body));
});

router.put('/products/:id', validate(schemas.product), async (req, res) => {
  res.json(await merchantService.updateProduct(req.user, productId(req), req.valid.body));
});

router.patch('/products/:id/availability', validate(schemas.productAvailability), async (req, res) => {
  res.json(await merchantService.setProductAvailable(req.user, productId(req), req.valid.body.available));
});

router.delete('/products/:id', async (req, res) => {
  await merchantService.deleteProduct(req.user, productId(req));
  res.status(204).end();
});

module.exports = router;
