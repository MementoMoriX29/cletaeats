package com.cletaeats.app.data.remote.dto

import com.google.gson.annotations.SerializedName

// ── Request DTOs ──────────────────────────────────────────────────────────────

data class CreateOrderRequest(
    @SerializedName("clientId") val clienteId: Int,
    @SerializedName("restaurantId") val restauranteId: Int,
    val items: List<OrderItemRequest>,
    @SerializedName("deliveryAddress") val direccionEntrega: String
)

data class OrderItemRequest(
    val comboId: Int,
    val quantity: Int
)

data class UpdateOrderStatusRequest(
    val status: String   // "en_preparacion" | "en_camino" | "entregado" | "cancelado"
)

// ── Response DTOs ─────────────────────────────────────────────────────────────

data class OrderDto(
    val id: Int,
    @SerializedName("clientId") val clienteId: Int,
    @SerializedName("restaurantId") val restauranteId: Int,
    @SerializedName("deliveryPersonId") val repartidorId: Int? = null,
    val status: String,
    val subtotal: Double,
    @SerializedName("deliveryFee") val transporte: Double,
    val tax: Double,
    val total: Double,
    @SerializedName("deliveryAddress") val direccionEntrega: String,
    val items: List<OrderItemDto>? = null,
    @SerializedName("createdAt") val creadoEn: String,
    @SerializedName("deliveryPersonLatitude") val repartidorLatitud: Double? = null,
    @SerializedName("deliveryPersonLongitude") val repartidorLongitud: Double? = null
)

data class OrderItemDto(
    val id: Int,
    val comboId: Int,
    val quantity: Int,
    @SerializedName("unitPrice") val precioUnitario: Double,
    val name: String? = null
)

data class InvoiceDto(
    @SerializedName("orderId") val pedidoId: Int,
    val subtotal: Double,
    @SerializedName("deliveryFee") val transporte: Double,
    val tax: Double,
    val total: Double,
    val items: List<OrderItemDto>,
    val restaurant: String,
    val client: String,
    @SerializedName("issuedAt") val fechaEmision: String
)
