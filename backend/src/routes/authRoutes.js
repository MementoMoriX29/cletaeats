const express        = require('express');
const bcrypt         = require('bcryptjs');
const rateLimit      = require('express-rate-limit');
const env            = require('../config/env');
const clientRepo     = require('../repositories/clientRepository');
const deliveryRepo   = require('../repositories/deliveryPersonRepository');
const Client         = require('../models/Client');
const DeliveryPerson = require('../models/DeliveryPerson');
const { signJwt }    = require('../middleware/authMiddleware');
const { toLast4 }    = require('../utils/card');

const router = express.Router();

// Máximo 20 intentos cada 15 minutos por IP (frena fuerza bruta sobre login y registro)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intente en 15 minutos.' },
});

// Hash fijo para comparar cuando el usuario no existe: así la respuesta tarda lo mismo
// y no se puede averiguar qué correos están registrados midiendo el tiempo.
const DUMMY_HASH = bcrypt.hashSync('cletaeats-dummy-password', 10);

router.post('/register-client', authLimiter, async (req, res, next) => {
  try {
    const model = new Client(req.body);
    const errors = model.validate();
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    if (await clientRepo.getByNationalId(model.national_id))
      return res.status(409).json({ error: 'national_id ya registrado' });
    if (await clientRepo.getByEmail(model.email))
      return res.status(409).json({ error: 'email ya registrado' });

    const id = await clientRepo.create({
      national_id: model.national_id,
      name:        model.name,
      address:     model.address,
      card_last4:  toLast4(model.card_number),
      phone:       model.phone,
      email:       model.email,
      password:    await bcrypt.hash(model.password, 10),
    });
    res.status(201).json({ message: 'Cliente registrado', client: await clientRepo.getById(id) });
  } catch (err) { next(err); }
});

router.post('/register-delivery-person', authLimiter, async (req, res, next) => {
  try {
    const model = new DeliveryPerson(req.body);
    const errors = model.validate();
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    if (await deliveryRepo.getByNationalId(model.national_id))
      return res.status(409).json({ error: 'national_id ya registrado' });
    if (await deliveryRepo.getByEmail(model.email))
      return res.status(409).json({ error: 'email ya registrado' });

    const id = await deliveryRepo.create({
      national_id: model.national_id,
      name:        model.name,
      email:       model.email,
      password:    await bcrypt.hash(model.password, 10),
      address:     model.address,
      phone:       model.phone,
      card_last4:  toLast4(model.card_number),
    });
    res.status(201).json({ message: 'Repartidor registrado', delivery_person: await deliveryRepo.getById(id) });
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password, rol } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || typeof rol !== 'string')
      return res.status(400).json({ error: 'email, password y rol son requeridos' });

    if (rol === 'admin') {
      const { email: adminEmail, passwordHash } = env.admin;
      // bcrypt se ejecuta siempre (también con correo incorrecto) para que el tiempo de respuesta no delate nada
      const passwordOk = await bcrypt.compare(password, passwordHash ?? DUMMY_HASH);
      const ok = Boolean(adminEmail && passwordHash) && email === adminEmail && passwordOk;
      if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });
      return res.json({
        token: signJwt({ id: 0, rol: 'admin' }),
        user: { id: 0, name: 'Administrador', email, rol: 'admin' },
      });
    }

    let user = null;
    if (rol === 'cliente')         user = await clientRepo.getByEmail(email);
    else if (rol === 'repartidor') user = await deliveryRepo.getByEmail(email);
    else return res.status(400).json({ error: 'Rol inválido. Use: cliente | repartidor | admin' });

    const passwordOk = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !passwordOk)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    if (user.status === 'suspended')
      return res.status(403).json({ error: 'Cuenta suspendida' });

    const token = signJwt({ id: user.id, rol });
    const { password: _pwd, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, rol } });
  } catch (err) { next(err); }
});

module.exports = router;
