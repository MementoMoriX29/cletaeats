// Feriados nacionales de Costa Rica (Código de Trabajo).
// El recargo de transporte en feriado lo decide el servidor, no el cliente,
// para que nadie pueda pagar menos enviando is_holiday = false.

const TIME_ZONE = 'America/Costa_Rica';

const FIXED_HOLIDAYS = [
  [1, 1],   // Año Nuevo
  [4, 11],  // Juan Santamaría
  [5, 1],   // Día del Trabajo
  [7, 25],  // Anexión de Guanacaste
  [8, 2],   // Virgen de los Ángeles
  [8, 15],  // Día de la Madre
  [9, 15],  // Independencia
  [10, 12], // Día de las Culturas
  [12, 25], // Navidad
];

// Domingo de Pascua (algoritmo de Butcher). Devuelve [mes (1-12), día].
const easterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
};

// Fecha (año, mes, día) en hora de Costa Rica, sin importar la zona horaria del servidor
const dateInCostaRica = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day') };
};

const isCostaRicaHoliday = (date = new Date()) => {
  const { year, month, day } = dateInCostaRica(date);
  if (FIXED_HOLIDAYS.some(([m, d]) => m === month && d === day)) return true;

  // Jueves y Viernes Santo
  const [em, ed] = easterSunday(year);
  const easter = Date.UTC(year, em - 1, ed);
  const today  = Date.UTC(year, month - 1, day);
  const diffDays = (easter - today) / 86400000;
  return diffDays === 3 || diffDays === 2;
};

module.exports = { isCostaRicaHoliday };
