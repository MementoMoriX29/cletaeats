package com.cletaeats.app.data.remote.dto

import com.google.gson.annotations.SerializedName

// ── Request DTOs ──────────────────────────────────────────────────────────────

data class LoginRequest(
    val email: String,
    val password: String,
    val rol: String
)

data class RegisterClienteRequest(
    @SerializedName("national_id") val nationalId: String,
    val name: String,
    val address: String,
    @SerializedName("card_number") val cardNumber: String,
    val phone: String,
    val email: String,
    val password: String
)

data class RegisterRepartidorRequest(
    @SerializedName("national_id") val nationalId: String,
    val name: String,
    val email: String,
    val password: String,
    val address: String,
    val phone: String,
    @SerializedName("card_number") val cardNumber: String
)

// ── Response DTOs ─────────────────────────────────────────────────────────────

data class LoginResponse(
    val token: String,
    val user: UserDto
)

data class UserDto(
    val id: Int,
    val name: String,
    val email: String,
    @SerializedName("rol") val role: String,
    val phone: String? = null
)

data class MessageResponse(
    val message: String
)

// GET /clients/:id responde con claves en español (nombre, telefono, direccion);
// "alternate" acepta también las claves en inglés.
data class ClientProfileResponse(
    val id: Int,
    @SerializedName("national_id") val nationalId: String,
    @SerializedName(value = "nombre", alternate = ["name"]) val name: String,
    val email: String,
    @SerializedName(value = "telefono", alternate = ["phone"]) val phone: String? = null,
    @SerializedName(value = "direccion", alternate = ["address"]) val address: String? = null,
    // El backend solo guarda y devuelve los últimos 4 dígitos de la tarjeta
    @SerializedName("card_last4") val cardLast4: String? = null
)

data class UpdateClientRequest(
    val name: String,
    val phone: String,
    val address: String,
    // null = conservar la tarjeta actual (Gson omite los campos null)
    @SerializedName("card_number") val cardNumber: String? = null,
    val email: String
)
