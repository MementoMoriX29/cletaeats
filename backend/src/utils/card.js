// Manejo de tarjetas: el número completo solo se recibe para validarlo
// y nunca se guarda. En la BD queda únicamente card_last4 (principio de PCI DSS:
// no almacenar el PAN si no es necesario).

const isValidCardNumber = (value) => typeof value === 'string' && /^\d{13,19}$/.test(value);

const toLast4 = (cardNumber) => cardNumber.slice(-4);

module.exports = { isValidCardNumber, toLast4 };
