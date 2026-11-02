// /api/restaurants — catálogo público (no requiere sesión)
// ?lat=&lng= agrega a cada restaurante el costo de envío y el tiempo estimado hasta esa ubicación.
const express = require('express');
const catalogService = require('../services/catalogService');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');
const { parseId } = require('../utils/params');

const router = express.Router();

router.get('/', validate(schemas.catalogQuery, 'query'), async (req, res) => {
  res.json(await catalogService.listRestaurants(req.valid.query));
});

router.get('/categories', async (_req, res) => {
  res.json(await catalogService.categories());
});

router.get('/:id', validate(schemas.catalogQuery, 'query'), async (req, res) => {
  res.json(await catalogService.getRestaurant(parseId(req.params.id, 'Restaurante no encontrado'), req.valid.query));
});

module.exports = router;
