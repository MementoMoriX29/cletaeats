// /api/auth — registro e inicio de sesión (un solo login para todos los roles)
const express = require('express');
const authService = require('../services/authService');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimits');

const router = express.Router();

router.post('/login', authLimiter, validate(schemas.login), async (req, res) => {
  res.json(await authService.login(req.valid.body));
});

router.post('/register', authLimiter, validate(schemas.registerClient), async (req, res) => {
  res.status(201).json(await authService.registerClient(req.valid.body));
});

router.post('/register-courier', authLimiter, validate(schemas.registerCourier), async (req, res) => {
  res.status(201).json(await authService.registerCourier(req.valid.body));
});

module.exports = router;
