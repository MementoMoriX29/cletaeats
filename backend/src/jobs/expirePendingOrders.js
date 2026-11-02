// Cada minuto cancela los pedidos que el restaurante no aceptó a tiempo (y reembolsa los pagados con tarjeta).
const env = require('../config/env');
const orderService = require('../services/orderService');

const start = (intervalMs = 60 * 1000) => {
  const run = () => orderService.expirePending(env.pendingOrderTimeoutMin)
    .then((ids) => {
      if (ids.length) console.log(`Pedidos cancelados por falta de respuesta del restaurante: ${ids.join(', ')}`);
    })
    .catch((err) => console.error('Error revisando pedidos vencidos:', err));
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
};

module.exports = { start };
