const express               = require('express');
const deliveryPersonService = require('../services/deliveryPersonService');
const orderService          = require('../services/orderService');
const { verifyToken }       = require('../middleware/authMiddleware');
const { requireRole }       = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { res.json(await deliveryPersonService.list()); } catch (err) { next(err); }
});

router.get('/:id/rating', verifyToken, async (req, res, next) => {
  try {
    res.json(await deliveryPersonService.getRating(parseInt(req.params.id, 10)));
  } catch (err) { next(err); }
});

router.get('/:id/ratings', verifyToken, requireRole('admin', 'repartidor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.rol === 'repartidor' && req.user.id !== id)
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await deliveryPersonService.getComplaints(id));
  } catch (err) { next(err); }
});

router.get('/:id', verifyToken, requireRole('admin', 'repartidor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.rol === 'repartidor' && req.user.id !== id)
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await deliveryPersonService.getById(id));
  } catch (err) { next(err); }
});

router.put('/:id', verifyToken, requireRole('admin', 'repartidor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.rol === 'repartidor' && req.user.id !== id)
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await deliveryPersonService.updateProfile(id, req.body ?? {}));
  } catch (err) { next(err); }
});

router.put('/:id/status', verifyToken, requireRole('admin', 'repartidor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.rol === 'repartidor' && req.user.id !== id)
      return res.status(403).json({ error: 'Acceso denegado' });
    const status = req.body?.status ?? req.body?.estado;
    res.json(await deliveryPersonService.updateStatus(id, status, req.user));
  } catch (err) { next(err); }
});

router.get('/:id/deliveries', verifyToken, requireRole('admin', 'repartidor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.rol === 'repartidor' && req.user.id !== id)
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await orderService.getDeliveriesByPerson(id));
  } catch (err) { next(err); }
});

router.get('/:id/active-order', verifyToken, requireRole('admin', 'repartidor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.rol === 'repartidor' && req.user.id !== id)
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await orderService.getActiveOrderByDeliveryPerson(id));
  } catch (err) { next(err); }
});

router.get('/:id/complaints', verifyToken, requireRole('admin', 'repartidor'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.rol === 'repartidor' && req.user.id !== id)
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await deliveryPersonService.getComplaints(id));
  } catch (err) { next(err); }
});

router.post('/:id/warn', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    res.status(201).json(await deliveryPersonService.addAdminWarning(parseInt(req.params.id, 10)));
  } catch (err) { next(err); }
});

router.post('/:id/complaints', verifyToken, requireRole('cliente'), async (req, res, next) => {
  try {
    const deliveryPersonId = parseInt(req.params.id, 10);
    const { motivo, friendliness, response_time, presentation } = req.body ?? {};
    if (typeof motivo !== 'string' || !motivo.trim()) return res.status(400).json({ error: 'motivo requerido' });
    res.status(201).json(
      await deliveryPersonService.createComplaint(deliveryPersonId, req.user.id, motivo, { friendliness, response_time, presentation })
    );
  } catch (err) { next(err); }
});

module.exports = router;
