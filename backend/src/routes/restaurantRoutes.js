const express           = require('express');
const restaurantService = require('../services/restaurantService');
const { verifyToken }   = require('../middleware/authMiddleware');
const { requireRole }   = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json(await restaurantService.list()); } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try { res.json(await restaurantService.getById(parseInt(req.params.id, 10))); } catch (err) { next(err); }
});

router.get('/:id/combos', async (req, res, next) => {
  try { res.json(await restaurantService.getCombos(parseInt(req.params.id, 10))); } catch (err) { next(err); }
});

router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { res.status(201).json(await restaurantService.create(req.body)); } catch (err) { next(err); }
});

router.put('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { res.json(await restaurantService.update(parseInt(req.params.id, 10), req.body)); } catch (err) { next(err); }
});

router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { await restaurantService.remove(parseInt(req.params.id, 10)); res.status(204).send(); } catch (err) { next(err); }
});

router.post('/:id/combos', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { res.status(201).json(await restaurantService.createCombo(parseInt(req.params.id, 10), req.body)); } catch (err) { next(err); }
});

router.put('/:id/combos/:comboId', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { res.json(await restaurantService.updateComboById(parseInt(req.params.id, 10), parseInt(req.params.comboId, 10), req.body)); } catch (err) { next(err); }
});

router.delete('/:id/combos/:comboId', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { await restaurantService.removeCombo(parseInt(req.params.id, 10), parseInt(req.params.comboId, 10)); res.status(204).send(); } catch (err) { next(err); }
});

module.exports = router;
