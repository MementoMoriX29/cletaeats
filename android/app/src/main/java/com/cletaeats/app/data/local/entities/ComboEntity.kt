package com.cletaeats.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "combos")
data class ComboEntity(
    @PrimaryKey val id: Int,
    val nombre: String,
    val descripcion: String,
    val precio: Int,          // En colones — combo N = ₡(N+3)*1000
    val imagen: String?,
    val restauranteId: Int,
    val numero: Int           // 1-9
)
