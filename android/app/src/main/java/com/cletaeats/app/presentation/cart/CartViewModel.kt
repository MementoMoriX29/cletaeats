package com.cletaeats.app.presentation.cart

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.CartItem
import com.cletaeats.app.domain.model.Combo
import com.cletaeats.app.domain.model.Order
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * ViewModel del carrito de compras.
 * El carrito persiste en Room (CartItemEntity) para sobrevivir rotaciones y
 * cierres accidentales de la app.
 *
 * CartViewModel es compartido entre RestaurantDetailScreen y CartScreen
 * gracias al scope del NavGraph — ambas pantallas acceden al mismo estado.
 */
class CartViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as CletaEatsApp
    private val repository = app.orderRepository

    // Ítems del carrito — Flow reactivo de Room
    val cartItems: StateFlow<List<CartItem>> = repository.getCartItems()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Cantidad total de ítems (para el badge en el botón del carrito)
    val cartItemCount: StateFlow<Int> = repository.getCartItemCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    // Estado de la orden al confirmar
    private val _orderState = MutableStateFlow<UiState<Order>>(UiState.Idle)
    val orderState: StateFlow<UiState<Order>> = _orderState.asStateFlow()

    // Subtotal, transporte, IVA y total calculados reactivamente
    val subtotal: StateFlow<Double> = cartItems
        .map { items -> items.sumOf { it.subtotal.toDouble() } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    val transporte: Double = 1500.0   // Tarifa fija por delivery en Heredia
    val ivaRate: Double = 0.13        // IVA Costa Rica: 13%

    val iva: StateFlow<Double> = subtotal
        .map { it * ivaRate }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    val total: StateFlow<Double> = subtotal
        .map { it + transporte + (it * ivaRate) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    fun addToCart(combo: Combo, quantity: Int) {
        viewModelScope.launch {
            repository.addToCart(
                CartItem(
                    comboId = combo.id,
                    comboNombre = combo.nombre,
                    comboPrecio = combo.precio,
                    cantidad = quantity,
                    restauranteId = combo.restauranteId,
                    comboImagen = combo.imagen
                )
            )
        }
    }

    fun removeFromCart(item: CartItem) {
        viewModelScope.launch { repository.removeFromCart(item) }
    }

    fun clearCart() {
        viewModelScope.launch { repository.clearCart() }
    }

    fun placeOrder(clienteId: Int, restauranteId: Int, direccion: String) {
        val items = cartItems.value
        if (items.isEmpty()) return

        viewModelScope.launch {
            _orderState.value = UiState.Loading
            val result = repository.createOrder(clienteId, restauranteId, items, direccion)
            _orderState.value = result
            if (result is UiState.Success) {
                repository.clearCart()
            }
        }
    }

    fun resetOrderState() { _orderState.value = UiState.Idle }
}
