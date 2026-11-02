// Formatos de Costa Rica: colones sin decimales y horas en hora local.
const TIME_ZONE = 'America/Costa_Rica';

const colones = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
export const money = (amount: number) => colones.format(amount);

const time = new Intl.DateTimeFormat('es-CR', { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });
export const clock = (iso: string | Date) => time.format(new Date(iso));

const day = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', timeZone: TIME_ZONE });
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });

// "Hoy, 7:45 p. m.", "Ayer, 1:10 p. m." o "28 oct, 12:30 p. m."
export const dateTime = (iso: string) => {
  const date = new Date(iso);
  const today = dayKey.format(new Date());
  const yesterday = dayKey.format(new Date(Date.now() - 86400000));
  const key = dayKey.format(date);
  const prefix = key === today ? 'Hoy' : key === yesterday ? 'Ayer' : day.format(date);
  return `${prefix}, ${clock(date)}`;
};

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
export const timeAgo = (iso: string, now = Date.now()) => {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60000);
  if (Math.abs(minutes) < 1) return 'ahora';
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  if (Math.abs(minutes) < 24 * 60) return relative.format(Math.round(minutes / 60), 'hour');
  return relative.format(Math.round(minutes / (24 * 60)), 'day');
};

export const minutesBetween = (from: string, to: string | number = Date.now()) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);

export const km = (value: number) => `${value.toLocaleString('es-CR', { maximumFractionDigits: 1 })} km`;

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');

export const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
