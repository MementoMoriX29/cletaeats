package com.cletaeats.app.presentation.home

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Restaurant
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlin.math.*

/**
 * Patrón MVVM + Observer: HomeViewModel expone StateFlow para que HomeScreen
 * lo observe con collectAsStateWithLifecycle().
 *
 * Calcula la distancia de cada restaurante usando la fórmula de Haversine
 * con las coordenadas del GPS del usuario (Fused Location Provider).
 */
class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as CletaEatsApp
    private val repository = app.restaurantRepository

    // Estado de UI observable
    private val _restaurantsState = MutableStateFlow<UiState<List<Restaurant>>>(UiState.Loading)
    val restaurantsState: StateFlow<UiState<List<Restaurant>>> = _restaurantsState.asStateFlow()

    // Conectividad — usada para mostrar/ocultar el banner "sin conexión"
    val connectivityStatus = app.connectivityObserver.connectivityStatus
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConnectivityObserver.Status.Available)

    // Filtros de búsqueda
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _filterType = MutableStateFlow<String?>(null)
    val filterType: StateFlow<String?> = _filterType.asStateFlow()

    // Ubicación actual del usuario (provista por Fused Location Provider en la pantalla)
    private var userLat: Double = 0.0
    private var userLng: Double = 0.0

    init {
        loadRestaurants()
    }

    fun loadRestaurants() {
        viewModelScope.launch {
            repository.getRestaurants().collect { state ->
                if (state is UiState.Success) {
                    // Calcula distancia con la última ubicación conocida
                    val withDistance = state.data.map { it.withDistance(userLat, userLng) }
                    _restaurantsState.value = UiState.Success(withDistance.sortedBy { it.distanciaKm })
                } else {
                    _restaurantsState.value = state
                }
            }
        }
    }

    fun updateUserLocation(lat: Double, lng: Double) {
        userLat = lat
        userLng = lng
        // Recalcula distancias con la nueva ubicación
        val current = _restaurantsState.value
        if (current is UiState.Success) {
            val updated = current.data.map { it.withDistance(lat, lng) }
            _restaurantsState.value = UiState.Success(updated.sortedBy { it.distanciaKm })
        }
    }

    fun setSearchQuery(query: String) { _searchQuery.value = query }

    fun setFilterType(type: String?) { _filterType.value = type }

    // Restaurantes filtrados por búsqueda y tipo de comida
    val filteredRestaurants: StateFlow<List<Restaurant>> = combine(
        _restaurantsState, _searchQuery, _filterType
    ) { state, query, type ->
        if (state !is UiState.Success) return@combine emptyList()
        state.data.filter { r ->
            (query.isBlank() || r.nombre.contains(query, ignoreCase = true)) &&
            (type == null || r.tipoComida.equals(type, ignoreCase = true))
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
}

// Fórmula de Haversine — calcula distancia en km entre dos coordenadas GPS
private fun Restaurant.withDistance(userLat: Double, userLng: Double): Restaurant {
    if (userLat == 0.0 && userLng == 0.0) return copy(distanciaKm = 0.0)
    val r = 6371.0
    val dLat = Math.toRadians(latitud - userLat)
    val dLng = Math.toRadians(longitud - userLng)
    val a = sin(dLat / 2).pow(2) +
            cos(Math.toRadians(userLat)) * cos(Math.toRadians(latitud)) * sin(dLng / 2).pow(2)
    val c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return copy(distanciaKm = r * c)
}
