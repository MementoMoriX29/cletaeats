package com.cletaeats.app.domain.model

data class CartItem(
    val id: Int = 0,
    val comboId: Int,
    val comboNombre: String,
    val comboPrecio: Int,
    val cantidad: Int,
    val restauranteId: Int,
    val comboImagen: String? = null
) {
    val subtotal: Int get() = comboPrecio * cantidad
}
