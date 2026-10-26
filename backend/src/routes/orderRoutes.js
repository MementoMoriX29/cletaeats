const express       = require('express');
const orderService  = require('../services/orderService');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { lastKnownLocations } = require('../socket/trackingSocket');

const router = express.Router();

router.post('/', verifyToken, requireRole('cliente'), async (req, res, next) => {
  try {
    // El client_id sale del token, nunca del body
    res.status(201).json(await orderService.create({ ...(req.body ?? {}), client_id: req.user.id }));
  } catch (err) { next(err); }
});

router.get('/client/:clientId', verifyToken, requireRole('cliente', 'admin'), async (req, res, next) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);
    if (req.user.rol === 'cliente' && req.user.id !== clientId)
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await orderService.getByClient(clientId));
  } catch (err) { next(err); }
});

router.get('/:id', verifyToken, async (req, res, next) => {
  try { res.json(await orderService.getById(parseInt(req.params.id, 10), req.user)); } catch (err) { next(err); }
});

router.put('/:id/status', verifyToken, requireRole('repartidor', 'admin'), async (req, res, next) => {
  try {
    const status = req.body?.status ?? req.body?.estado;
    res.json(await orderService.updateStatus(parseInt(req.params.id, 10), status, req.user));
  } catch (err) { next(err); }
});

router.get('/:id/invoice', verifyToken, async (req, res, next) => {
  try { res.json(await orderService.getInvoice(parseInt(req.params.id, 10), req.user)); } catch (err) { next(err); }
});

router.post('/:id/rating', verifyToken, requireRole('cliente'), async (req, res, next) => {
  try {
    res.status(201).json(await orderService.rateDelivery(parseInt(req.params.id, 10), req.user.id, req.body ?? {}));
  } catch (err) { next(err); }
});

router.get('/:id/location', verifyToken, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await orderService.getById(id, req.user); // 404 si no existe o no es suyo
    const loc = lastKnownLocations.get(String(id));
    if (!loc) return res.status(404).json({ error: 'Ubicación no disponible' });
    res.json({ orderId: loc.orderId, lat: loc.lat, lng: loc.lng });
  } catch (err) { next(err); }
});

module.exports = router;
