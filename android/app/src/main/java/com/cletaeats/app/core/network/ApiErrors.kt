package com.cletaeats.app.core.network

import com.cletaeats.app.data.remote.dto.ApiErrorResponse
import com.google.gson.Gson
import retrofit2.Response

/**
 * Mensaje para mostrar cuando la API responde con error.
 * El backend manda { "error": "..." } en español (por ejemplo "Correo o contraseña incorrectos"),
 * así que se usa ese texto; si no viene, un mensaje según el código HTTP.
 */
fun Response<*>.errorMessage(): String {
    val parsed = try {
        errorBody()?.string()?.let { Gson().fromJson(it, ApiErrorResponse::class.java) }
    } catch (e: Exception) {
        null
    }
    parsed?.error?.takeIf { it.isNotBlank() }?.let { return it }
    return when (code()) {
        401 -> "Correo o contraseña incorrectos"
        403 -> "Tu cuenta no tiene acceso"
        429 -> "Demasiados intentos. Esperá unos minutos."
        in 500..599 -> "Error en el servidor. Intentá más tarde."
        else -> "No se pudo completar la acción (${code()})"
    }
}
