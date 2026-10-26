package com.cletaeats.app.presentation.restaurant

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Combo
import com.cletaeats.app.domain.model.Restaurant
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class RestaurantViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as CletaEatsApp

    private val _combosState = MutableStateFlow<UiState<List<Combo>>>(UiState.Loading)
    val combosState: StateFlow<UiState<List<Combo>>> = _combosState.asStateFlow()

    private val _restaurant = MutableStateFlow<Restaurant?>(null)
    val restaurant: StateFlow<Restaurant?> = _restaurant.asStateFlow()

    val connectivityStatus = app.connectivityObserver.connectivityStatus
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000),
            com.cletaeats.app.core.utils.ConnectivityObserver.Status.Available)

    fun loadCombos(restaurantId: Int) {
        viewModelScope.launch {
            app.restaurantRepository.getCombos(restaurantId).collect { state ->
                _combosState.value = state
            }
        }
    }
}
