package com.cletaeats.app.domain.model

/**
 * Factura electrónica del pedido.
 * IVA: 13% sobre el subtotal (tasa de Costa Rica).
 * Transporte: tarifa fija definida por el backend.
 */
data class Invoice(
    val pedidoId: Int,
    val subtotal: Double,
    val transporte: Double,
    val iva: Double,
    val total: Double,
    val items: List<OrderItem>,
    val restaurante: String,
    val cliente: String,
    val fechaEmision: String
)
