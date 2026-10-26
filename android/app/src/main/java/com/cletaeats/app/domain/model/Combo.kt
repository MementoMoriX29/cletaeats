package com.cletaeats.app.domain.model

/**
 * Modelo de dominio para combos.
 * Regla de negocio: precio del combo N = ₡(N+3)*1000
 * Ejemplo: Combo 1 = ₡4.000, Combo 5 = ₡8.000, Combo 9 = ₡12.000
 */
data class Combo(
    val id: Int,
    val nombre: String,
    val descripcion: String,
    val precio: Int,
    val imagen: String?,
    val restauranteId: Int,
    val numero: Int         // 1-9
)
