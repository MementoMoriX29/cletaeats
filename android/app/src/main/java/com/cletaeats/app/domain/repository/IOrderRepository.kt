package com.cletaeats.app.domain.repository

import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.CartItem
import com.cletaeats.app.domain.model.Invoice
import com.cletaeats.app.domain.model.Order
import kotlinx.coroutines.flow.Flow

interface IOrderRepository {
    fun getOrdersByClient(clienteId: Int): Flow<UiState<List<Order>>>
    fun getOrderById(orderId: Int): Flow<UiState<Order>>
    suspend fun createOrder(clienteId: Int, restauranteId: Int, items: List<CartItem>, direccion: String): UiState<Order>
    suspend fun getInvoice(orderId: Int): UiState<Invoice>

    // Carrito — persistido en Room
    fun getCartItems(): Flow<List<CartItem>>
    fun getCartItemCount(): Flow<Int>
    suspend fun addToCart(item: CartItem)
    suspend fun removeFromCart(item: CartItem)
    suspend fun clearCart()
}
