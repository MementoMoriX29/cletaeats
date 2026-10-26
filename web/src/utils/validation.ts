export const isValidNationalId = (value: string) => /^\d{9,20}$/.test(value);

export const isValidPhoneCR = (value: string) => /^[678]\d{7}$/.test(value);

export const isValidCardNumber = (value: string) => /^\d{16}$/.test(value);

export const isValidPassword = (value: string) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isValidName = (value: string) => value.trim().length >= 3;

export const isValidAddress = (value: string) => value.trim().length >= 10;

export const formatCRC = (value: number) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(value);

export const calcTransportCost = (distanceKm: number, isHoliday: boolean) =>
  distanceKm * (isHoliday ? 1500 : 1000);

export const calcSubtotal = (items: { price: number; quantity: number }[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const calcIva = (subtotal: number) => subtotal * 0.13;

export const calcTotal = (subtotal: number, transport: number) => subtotal + calcIva(subtotal) + transport;