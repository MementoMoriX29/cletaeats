package com.cletaeats.app.domain.model

data class Order(
    val id: Int,
    val clienteId: Int,
    val restauranteId: Int,
    val repartidorId: Int?,
    val estado: String,                 // "en_preparacion" | "en_camino" | "entregado" | "cancelado"
    val subtotal: Double,
    val transporte: Double,
    val iva: Double,
    val total: Double,
    val direccionEntrega: String,
    val items: List<OrderItem> = emptyList(),
    val creadoEn: String,
    val repartidorLatitud: Double? = null,
    val repartidorLongitud: Double? = null,
    val isPendingSync: Boolean = false  // true = creado offline, aún no enviado
)

data class OrderItem(
    val comboId: Int,
    val cantidad: Int,
    val precioUnitario: Int,
    val nombre: String?
)
