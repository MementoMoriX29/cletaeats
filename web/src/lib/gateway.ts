// Pasarela de pago simulada, con la misma forma que una real (Stripe, BAC Credomatic):
// el número de la tarjeta se valida y se "tokeniza" en el navegador y nunca llega a nuestro servidor.
// Al servidor solo viajan el token, la marca y los últimos 4 dígitos.

export type CardBrand = 'visa' | 'mastercard' | 'amex';

export interface CardInput {
  number: string;
  expiry: string; // MM/AA
  cvc: string;
  name: string;
}

export const digitsOnly = (value: string) => value.replace(/\D/g, '');

export const detectBrand = (digits: string): CardBrand | null => {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return null;
};

// Algoritmo de Luhn: detecta errores de digitación
const passesLuhn = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

// 4242 4242 4242 4242 (o 3782 822463 10005 para American Express)
export const formatCardNumber = (value: string) => {
  const digits = digitsOnly(value).slice(0, 19);
  if (detectBrand(digits) === 'amex') {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

export const formatExpiry = (value: string) => {
  const digits = digitsOnly(value).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export const validateCard = (card: CardInput, now = new Date()) => {
  const errors: Partial<Record<keyof CardInput, string>> = {};
  const digits = digitsOnly(card.number);
  const brand = detectBrand(digits);
  if (!brand) errors.number = 'Aceptamos Visa, Mastercard y American Express';
  else if (digits.length < 15 || !passesLuhn(digits)) errors.number = 'Revisá el número de la tarjeta';

  const [month, year] = card.expiry.split('/').map(Number);
  const endOfMonth = new Date(2000 + (year || 0), month || 0, 1);
  if (!month || month > 12 || !year) errors.expiry = 'Usá el formato MM/AA';
  else if (endOfMonth <= now) errors.expiry = 'La tarjeta está vencida';

  if (!new RegExp(`^\\d{${brand === 'amex' ? 4 : 3}}$`).test(card.cvc)) errors.cvc = 'Revisá el código de seguridad';
  if (card.name.trim().length < 3) errors.name = 'Escribí el nombre como aparece en la tarjeta';
  return errors;
};

const randomId = (length: number) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join('');
};

export class CardDeclinedError extends Error {}

export const tokenizeCard = async (card: CardInput) => {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const digits = digitsOnly(card.number);
  // Como en las tarjetas de prueba de Stripe: terminada en 0002 simula un rechazo del banco
  if (digits.endsWith('0002')) throw new CardDeclinedError('El banco rechazó la tarjeta. Probá con otra.');
  return { token: `tok_${randomId(24)}`, brand: detectBrand(digits) as CardBrand, last4: digits.slice(-4) };
};
