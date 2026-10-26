class Restaurant {
  constructor({ name, tax_id, address, food_type, image_url, phone, description, latitude, longitude }) {
    this.name        = name;
    this.tax_id      = tax_id;
    this.address     = address;
    this.food_type   = food_type;
    this.image_url   = image_url   ?? null;
    this.phone       = phone       ?? null;
    this.description = description ?? null;
    this.latitude    = latitude    ?? null;
    this.longitude   = longitude   ?? null;
  }

  validate() {
    const errors = [];
    if (!this.name)      errors.push('name requerido');
    if (!this.tax_id)    errors.push('tax_id requerido');
    if (!this.address)   errors.push('address requerida');
    if (!this.food_type) errors.push('food_type requerido');
    return errors;
  }
}

module.exports = Restaurant;
