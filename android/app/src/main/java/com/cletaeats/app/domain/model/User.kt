package com.cletaeats.app.domain.model

data class User(
    val id: Int,
    val nombre: String,
    val email: String,
    val role: String,       // "cliente" | "repartidor"
    val telefono: String? = null
)
