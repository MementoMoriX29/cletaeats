package com.cletaeats.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class RestaurantDto(
    val id: Int,
    val name: String,
    @SerializedName("food_type") val foodType: String,
    @SerializedName("image_url") val imageUrl: String? = null,
    val address: String? = null,
    @SerializedName("tax_id") val taxId: String? = null
)

data class ComboDto(
    val id: Int,
    val name: String,
    val description: String,
    val price: Double,
    val image: String? = null,
    @SerializedName("restaurantId") val restauranteId: Int,
    val number: Int
)
