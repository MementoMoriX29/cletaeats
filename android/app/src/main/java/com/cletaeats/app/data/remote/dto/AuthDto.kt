package com.cletaeats.app.data.remote.dto

import com.google.gson.annotations.SerializedName

// ── Peticiones ────────────────────────────────────────────────────────────────

// Un solo login para todos los roles: el rol sale de la cuenta, no se elige al entrar.
data class LoginRequest(
    val email: String,
    val password: String
)

// POST /auth/register — cuenta de cliente
data class RegisterRequest(
    val name: String,
    val email: String,
    val phone: String,
    val password: String
)

// POST /auth/register-courier — solicitud de repartidor (queda pendiente hasta que soporte la apruebe)
data class CourierApplicationRequest(
    val name: String,
    val email: String,
    val phone: String,
    val password: String,
    @SerializedName("national_id") val nationalId: String,
    val vehicle: String        // "bicicleta" | "scooter"
)

// PUT /me
data class UpdateProfileRequest(
    val name: String,
    val phone: String
)

// ── Respuestas ────────────────────────────────────────────────────────────────

// Login y registro responden { token, user }: la sesión queda iniciada de una vez.
data class SessionResponse(
    val token: String,
    val user: UserDto
)

// GET /me y PUT /me
data class UserDto(
    val id: Int,
    val name: String,
    val email: String,
    val phone: String? = null,
    val role: String,          // "client" | "courier" | "restaurant" | "admin"
    val status: String         // "active" | "pending" | "rejected" | "suspended"
)

// Errores de la API: { error, code, fields }. "fields" trae el mensaje de cada campo inválido.
data class ApiErrorResponse(
    val error: String? = null,
    val code: String? = null,
    val fields: Map<String, String>? = null
)

data class MessageResponse(
    val message: String
)
