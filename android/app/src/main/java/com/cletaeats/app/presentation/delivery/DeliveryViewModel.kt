package com.cletaeats.app.presentation.delivery

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Order
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * Patrón MVVM para el flujo del repartidor.
 * Comparte el mismo patrón Observer (StateFlow) que los ViewModels de cliente,
 * evidenciando la consistencia arquitectural del proyecto — responde RQ-3.
 */
class DeliveryViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as CletaEatsApp

    private val _assignedOrdersState = MutableStateFlow<UiState<List<Order>>>(UiState.Loading)
    val assignedOrdersState: StateFlow<UiState<List<Order>>> = _assignedOrdersState.asStateFlow()

    private val _updateStatusState = MutableStateFlow<UiState<Order>>(UiState.Idle)
    val updateStatusState: StateFlow<UiState<Order>> = _updateStatusState.asStateFlow()

    private val _currentOrder = MutableStateFlow<Order?>(null)
    val currentOrder: StateFlow<Order?> = _currentOrder.asStateFlow()

    val connectivityStatus = app.connectivityObserver.connectivityStatus
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConnectivityObserver.Status.Available)

    fun loadAssignedOrders(repartidorId: Int) {
        viewModelScope.launch {
            app.deliveryRepository.getAssignedOrders(repartidorId).collect { state ->
                _assignedOrdersState.value = state
                if (state is UiState.Success && state.data.isNotEmpty()) {
                    _currentOrder.value = state.data.first()
                }
            }
        }
    }

    fun updateOrderStatus(orderId: Int, newStatus: String) {
        viewModelScope.launch {
            _updateStatusState.value = UiState.Loading
            val result = app.deliveryRepository.updateOrderStatus(orderId, newStatus)
            _updateStatusState.value = result
        }
    }

    fun updateDeliveryAvailability(repartidorId: Int, status: String) {
        viewModelScope.launch {
            app.deliveryRepository.updateDeliveryStatus(repartidorId, status)
        }
    }

    fun resetUpdateState() { _updateStatusState.value = UiState.Idle }
}
