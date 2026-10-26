// Feriados oficiales de Costa Rica según el Código de Trabajo y leyes vigentes

/** Calcula el Domingo de Pascua (algoritmo de Butcher) */
function easterSunday(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Devuelve true si la fecha dada es feriado nacional en Costa Rica */
export function isCostaRicaHoliday(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1; // 1-based
  const day = date.getDate();
  const year = date.getFullYear();

  // Feriados de fecha fija
  const fixedHolidays: [number, number][] = [
    [1,  1],  // Año Nuevo
    [4, 11],  // Juan Santamaría
    [5,  1],  // Día del Trabajo
    [7, 25],  // Anexión de Guanacaste
    [8,  2],  // Virgen de los Ángeles
    [8, 15],  // Día de la Madre
    [9, 15],  // Día de la Independencia
    [10, 12], // Día de las Culturas
    [12, 25], // Navidad
  ];

  if (fixedHolidays.some(([m, d]) => m === month && d === day)) return true;

  // Semana Santa: Jueves y Viernes Santos (variables)
  const easter = easterSunday(year);
  const holyThursday = addDays(easter, -3);
  const goodFriday   = addDays(easter, -2);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  return isSameDay(date, holyThursday) || isSameDay(date, goodFriday);
}

/** Nombre del feriado si aplica, o null */
export function holidayName(date: Date = new Date()): string | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  const fixed: [number, number, string][] = [
    [1,  1,  'Año Nuevo'],
    [4, 11,  'Juan Santamaría'],
    [5,  1,  'Día del Trabajo'],
    [7, 25,  'Anexión de Guanacaste'],
    [8,  2,  'Virgen de los Ángeles'],
    [8, 15,  'Día de la Madre'],
    [9, 15,  'Día de la Independencia'],
    [10, 12, 'Día de las Culturas'],
    [12, 25, 'Navidad'],
  ];

  const found = fixed.find(([m, d]) => m === month && d === day);
  if (found) return found[2];

  const easter = easterSunday(year);
  const isSame = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSame(date, addDays(easter, -3))) return 'Jueves Santo';
  if (isSame(date, addDays(easter, -2))) return 'Viernes Santo';

  return null;
}
