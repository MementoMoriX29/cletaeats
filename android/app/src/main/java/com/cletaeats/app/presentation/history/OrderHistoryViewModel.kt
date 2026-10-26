package com.cletaeats.app.presentation.history

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Order
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class OrderHistoryViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as CletaEatsApp

    private val _ordersState = MutableStateFlow<UiState<List<Order>>>(UiState.Loading)
    val ordersState: StateFlow<UiState<List<Order>>> = _ordersState.asStateFlow()

    val connectivityStatus = app.connectivityObserver.connectivityStatus
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConnectivityObserver.Status.Available)

    fun loadOrders(clienteId: Int) {
        viewModelScope.launch {
            app.orderRepository.getOrdersByClient(clienteId).collect { state ->
                _ordersState.value = state
            }
        }
    }
}
