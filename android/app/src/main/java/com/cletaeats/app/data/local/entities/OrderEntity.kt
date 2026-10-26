package com.cletaeats.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entidad Room para pedidos.
 * syncStatus soporta la estrategia offline-first:
 *   SYNCED        → pedido confirmado por el backend
 *   PENDING_SYNC  → creado sin conexión, WorkManager lo enviará al volver la red
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: Int,
    val clienteId: Int,
    val restauranteId: Int,
    val repartidorId: Int?,
    val estado: String,               // "en_preparacion" | "en_camino" | "entregado" | "cancelado"
    val subtotal: Double,
    val transporte: Double,
    val iva: Double,
    val total: Double,
    val direccionEntrega: String,
    val syncStatus: String = "SYNCED", // "PENDING_SYNC" cuando se crea offline
    val itemsJson: String = "[]",      // JSON serializado de los items
    val creadoEn: String,
    val repartidorLatitud: Double? = null,
    val repartidorLongitud: Double? = null
)
