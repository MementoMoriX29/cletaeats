package com.cletaeats.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entidad Room para caché offline-first de restaurantes.
 * cachedAt permite invalidar el caché si supera cierto tiempo.
 */
@Entity(tableName = "restaurants")
data class RestaurantEntity(
    @PrimaryKey val id: Int,
    val nombre: String,
    val tipoComida: String,
    val imagen: String?,
    val latitud: Double,
    val longitud: Double,
    val horario: String?,
    val cachedAt: Long = System.currentTimeMillis()
)
