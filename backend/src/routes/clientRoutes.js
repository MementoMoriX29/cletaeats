const express       = require('express');
const clientService = require('../services/clientService');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

// Un cliente solo puede ver o editar su propio perfil; el admin puede ver y editar todos.
const canAccessClient = (user, clientId) =>
  user.rol === 'admin' || (user.rol === 'cliente' && user.id === clientId);

router.get('/', verifyToken, requireRole('admin'), async (req, res, next) => {
  try { res.json(await clientService.list()); } catch (err) { next(err); }
});

router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!canAccessClient(req.user, id))
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await clientService.getById(id));
  } catch (err) { next(err); }
});

router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!canAccessClient(req.user, id))
      return res.status(403).json({ error: 'Acceso denegado' });
    res.json(await clientService.update(id, req.body ?? {}));
  } catch (err) { next(err); }
});

router.put('/:id/status', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const status = req.body?.status ?? req.body?.estado;
    res.json(await clientService.updateStatus(parseInt(req.params.id, 10), status));
  } catch (err) { next(err); }
});

module.exports = router;
