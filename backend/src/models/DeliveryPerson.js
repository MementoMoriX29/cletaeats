const { isValidCardNumber } = require('../utils/card');

const isText = (value, minLength = 1) => typeof value === 'string' && value.trim().length >= minLength;

class DeliveryPerson {
  constructor({ national_id, name, email, password, address, phone, card_number }) {
    this.national_id = national_id;
    this.name        = name;
    this.email       = email;
    this.password    = password;
    this.address     = address;
    this.phone       = phone;
    this.card_number = card_number;
  }

  validate() {
    const errors = [];
    if (!isText(this.national_id, 8))                                  errors.push('national_id inválido');
    if (!isText(this.name, 2))                                         errors.push('name requerido');
    if (!isText(this.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) errors.push('email inválido');
    if (typeof this.password !== 'string' || this.password.length < 8) errors.push('password mínimo 8 caracteres');
    if (!isText(this.address))                                         errors.push('address requerida');
    if (!isText(this.phone))                                           errors.push('phone requerido');
    if (!isValidCardNumber(this.card_number))                          errors.push('card_number inválido');
    return errors;
  }
}

module.exports = DeliveryPerson;
