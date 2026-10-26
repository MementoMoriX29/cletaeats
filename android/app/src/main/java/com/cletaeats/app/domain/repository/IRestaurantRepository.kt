package com.cletaeats.app.domain.repository

import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Combo
import com.cletaeats.app.domain.model.Restaurant
import kotlinx.coroutines.flow.Flow

interface IRestaurantRepository {
    // Flow reactivo — los Composables reaccionan automáticamente a cambios en Room
    fun getRestaurants(): Flow<UiState<List<Restaurant>>>
    fun getCombos(restaurantId: Int): Flow<UiState<List<Combo>>>
}
