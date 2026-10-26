package com.cletaeats.app.domain.model

data class Restaurant(
    val id: Int,
    val nombre: String,
    val tipoComida: String,
    val imagen: String?,
    val latitud: Double,
    val longitud: Double,
    val horario: String?,
    val distanciaKm: Double = 0.0    // Calculada en HomeViewModel con GPS
)
