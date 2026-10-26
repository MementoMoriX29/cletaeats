class Invoice {
  constructor({ order_id, subtotal, transport_cost }) {
    this.order_id       = order_id;
    this.subtotal       = subtotal;
    this.transport_cost = transport_cost;
    this.iva            = Math.round(subtotal * 0.13 * 100) / 100;
    this.total          = subtotal + transport_cost + this.iva;
  }

  static calcTransportCost(distance_km, is_holiday) {
    return distance_km * (is_holiday ? 1500 : 1000);
  }
}

module.exports = Invoice;
