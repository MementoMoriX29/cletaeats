package com.cletaeats.app.data.repository

import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.local.dao.ComboDao
import com.cletaeats.app.data.local.dao.RestaurantDao
import com.cletaeats.app.data.local.entities.ComboEntity
import com.cletaeats.app.data.local.entities.RestaurantEntity
import com.cletaeats.app.data.remote.api.RestaurantApiService
import com.cletaeats.app.domain.model.Combo
import com.cletaeats.app.domain.model.Restaurant
import com.cletaeats.app.domain.repository.IRestaurantRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Patrón Repository — abstrae Room vs Retrofit para restaurantes y combos.
 *
 * Estrategia offline-first (responde RQ-2 del paper):
 *
 * getRestaurants():
 *   CON internet  → Retrofit → guarda en Room → retorna datos frescos
 *   SIN internet  → lee de Room → retorna caché + activa banner "sin conexión"
 *
 * getCombos():
 *   CON internet  → Retrofit → actualiza Room → retorna datos frescos
 *   SIN internet  → lee combos de Room (último fetch conocido)
 *
 * Esta decisión responde RQ-2: la integración con Express.js requiere que
 * el cliente Android maneje explícitamente la ausencia del servidor.
 * Room desacopla la UI del estado de conectividad.
 */
class RestaurantRepository(
    private val apiService: RestaurantApiService,
    private val restaurantDao: RestaurantDao,
    private val comboDao: ComboDao,
    private val connectivityObserver: ConnectivityObserver
) : IRestaurantRepository {

    override fun getRestaurants(): Flow<UiState<List<Restaurant>>> = flow {
        emit(UiState.Loading)

        if (connectivityObserver.isCurrentlyConnected()) {
            try {
                val response = apiService.getRestaurants()
                if (response.isSuccessful) {
                    val dtos = response.body() ?: emptyList()
                    restaurantDao.deleteAll()
                    restaurantDao.insertAll(dtos.map { dto ->
                        RestaurantEntity(
                            id = dto.id,
                            nombre = dto.name,
                            tipoComida = dto.foodType,
                            imagen = dto.imageUrl,
                            latitud = 0.0,
                            longitud = 0.0,
                            horario = null
                        )
                    })
                }
            } catch (e: Exception) { /* Fallback a Room */ }
        }

        restaurantDao.getAllRestaurants().collect { entities ->
            emit(UiState.Success(entities.map { it.toDomain() }))
        }
    }

    override fun getCombos(restaurantId: Int): Flow<UiState<List<Combo>>> = flow {
        emit(UiState.Loading)

        if (connectivityObserver.isCurrentlyConnected()) {
            try {
                val response = apiService.getCombos(restaurantId)
                if (response.isSuccessful) {
                    val dtos = response.body() ?: emptyList()
                    comboDao.deleteByRestaurant(restaurantId)
                    comboDao.insertAll(dtos.map { dto ->
                        ComboEntity(
                            id = dto.id,
                            nombre = dto.name,
                            descripcion = dto.description,
                            precio = dto.price.toInt(),
                            imagen = dto.image,
                            restauranteId = dto.restauranteId,
                            numero = dto.number
                        )
                    })
                }
            } catch (e: Exception) { /* Fallback a Room */ }
        }

        comboDao.getCombosByRestaurant(restaurantId).collect { entities ->
            emit(UiState.Success(entities.map { it.toDomain() }))
        }
    }
}

private fun RestaurantEntity.toDomain() = Restaurant(
    id = id, nombre = nombre, tipoComida = tipoComida,
    imagen = imagen, latitud = latitud, longitud = longitud, horario = horario
)

private fun ComboEntity.toDomain() = Combo(
    id = id, nombre = nombre, descripcion = descripcion,
    precio = precio, imagen = imagen, restauranteId = restauranteId, numero = numero
)
