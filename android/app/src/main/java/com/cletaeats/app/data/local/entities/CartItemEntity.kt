package com.cletaeats.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Carrito persistido en Room para sobrevivir rotaciones y cierres de app.
 * Se limpia completamente al confirmar el pedido o al vaciarlo manualmente.
 */
@Entity(tableName = "cart_items")
data class CartItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val comboId: Int,
    val comboNombre: String,
    val comboPrecio: Int,       // En colones
    val cantidad: Int,
    val restauranteId: Int,
    val comboImagen: String? = null
)
