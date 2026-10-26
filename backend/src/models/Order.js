class Order {
  constructor({ client_id, restaurant_id, restaurante_id, items, distance_km, is_holiday,
                delivery_address, direccion_entrega, notes, notas }) {
    this.client_id        = client_id;
    this.restaurant_id    = restaurant_id ?? restaurante_id;
    this.items            = items; // [{ combo_id, quantity|cantidad }]
    this.distance_km      = distance_km;
    this.is_holiday       = is_holiday ?? false;
    this.delivery_address = delivery_address ?? direccion_entrega ?? null;
    this.notes            = notes ?? notas ?? null;
  }

  validate() {
    const errors = [];
    if (!this.client_id)     errors.push('client_id requerido');
    if (!this.restaurant_id) errors.push('restaurante_id requerido');
    if (!Array.isArray(this.items) || this.items.length === 0)
      errors.push('items requeridos (al menos 1 combo)');
    if (!this.distance_km || this.distance_km <= 0)
      errors.push('distance_km debe ser mayor a 0');
    if (!this.delivery_address)
      errors.push('direccion_entrega requerida');
    return errors;
  }
}

module.exports = Order;
