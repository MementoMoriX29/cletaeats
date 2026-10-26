package com.cletaeats.app.data.remote.api

import com.cletaeats.app.data.remote.dto.ComboDto
import com.cletaeats.app.data.remote.dto.RestaurantDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface RestaurantApiService {
    // GET /api/restaurants
    @GET("restaurants")
    suspend fun getRestaurants(): Response<List<RestaurantDto>>

    // GET /api/restaurants/:id/combos
    @GET("restaurants/{id}/combos")
    suspend fun getCombos(@Path("id") restaurantId: Int): Response<List<ComboDto>>
}
