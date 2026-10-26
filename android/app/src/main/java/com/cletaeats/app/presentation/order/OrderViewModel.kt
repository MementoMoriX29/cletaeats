package com.cletaeats.app.presentation.order

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Order
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * ViewModel para tracking de pedidos.
 * Implementa polling periódico cuando hay conexión para obtener la ubicación
 * del repartidor en tiempo (quasi-)real. Sin conexión, muestra el último
 * estado de Room y activa el banner de "sin conexión".
 */
class OrderViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as CletaEatsApp
    private val repository = app.orderRepository

    private val _orderState = MutableStateFlow<UiState<Order>>(UiState.Loading)
    val orderState: StateFlow<UiState<Order>> = _orderState.asStateFlow()

    val connectivityStatus = app.connectivityObserver.connectivityStatus
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConnectivityObserver.Status.Available)

    fun loadOrder(orderId: Int) {
        viewModelScope.launch {
            repository.getOrderById(orderId).collect { state ->
                _orderState.value = state
            }
        }
    }

    // Polling cada 15 segundos para actualizar tracking cuando hay conexión
    fun startTrackingPolling(orderId: Int) {
        viewModelScope.launch {
            while (true) {
                delay(15_000L)
                val isConnected = connectivityStatus.value == ConnectivityObserver.Status.Available
                if (isConnected) {
                    repository.getOrderById(orderId).collect { state ->
                        _orderState.value = state
                        return@collect
                    }
                }
            }
        }
    }
}
