// Límites de "hoy" y "esta semana" en hora de Costa Rica (UTC-6 todo el año, sin horario de verano),
// expresados como instantes UTC para compararlos con las columnas TIMESTAMP.

const CR_OFFSET_HOURS = -6;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDayCR = (now = new Date()) => {
  const local = new Date(now.getTime() + CR_OFFSET_HOURS * 3600 * 1000);
  const midnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnightLocal - CR_OFFSET_HOURS * 3600 * 1000);
};

// La semana arranca el lunes.
const startOfWeekCR = (now = new Date()) => {
  const today = startOfDayCR(now);
  const local = new Date(today.getTime() + CR_OFFSET_HOURS * 3600 * 1000);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - daysSinceMonday * DAY_MS);
};

const daysAgoCR = (days, now = new Date()) => new Date(startOfDayCR(now).getTime() - days * DAY_MS);

module.exports = { startOfDayCR, startOfWeekCR, daysAgoCR, DAY_MS };
