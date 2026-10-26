package com.cletaeats.app.data.repository

import com.cletaeats.app.core.session.SessionManager
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.remote.api.AuthApiService
import com.cletaeats.app.data.remote.dto.LoginRequest
import com.cletaeats.app.data.remote.dto.RegisterClienteRequest
import com.cletaeats.app.data.remote.dto.RegisterRepartidorRequest
import com.cletaeats.app.domain.model.User
import com.cletaeats.app.domain.repository.IAuthRepository

/**
 * Patrón Repository: abstrae la fuente de datos de auth.
 * Auth NO tiene caché local (Room) porque las credenciales no se almacenan localmente.
 * La sesión persiste via SessionManager (DataStore) con el JWT.
 *
 * RQ-2 (integración con backend Express.js):
 * El backend retorna { token, user } en login. AuthRepository extrae el token,
 * lo persiste en SessionManager y devuelve el modelo de dominio User.
 * Esto desacopla la estructura del backend del resto de la app.
 */
class AuthRepository(
    private val apiService: AuthApiService,
    private val sessionManager: SessionManager
) : IAuthRepository {

    override suspend fun login(email: String, password: String, rol: String): UiState<User> {
        return try {
            val response = apiService.login(LoginRequest(email, password, rol))
            if (response.isSuccessful) {
                val body = response.body()!!
                sessionManager.saveSession(
                    token = body.token,
                    userId = body.user.id,
                    role = body.user.role,
                    name = body.user.name,
                    email = body.user.email
                )
                UiState.Success(User(
                    id = body.user.id,
                    nombre = body.user.name,
                    email = body.user.email,
                    role = body.user.role,
                    telefono = body.user.phone
                ))
            } else {
                val msg = when (response.code()) {
                    401 -> "Credenciales incorrectas"
                    403 -> "Acceso no autorizado"
                    else -> "Error del servidor (${response.code()})"
                }
                UiState.Error(msg)
            }
        } catch (e: Exception) {
            UiState.Error("Sin conexión al servidor: ${e.localizedMessage}")
        }
    }

    override suspend fun registerCliente(
        nombre: String, email: String, password: String,
        telefono: String, direccion: String, cedula: String, tarjeta: String
    ): UiState<String> {
        return try {
            val response = apiService.registerCliente(
                RegisterClienteRequest(
                    nationalId = cedula,
                    name = nombre,
                    address = direccion,
                    cardNumber = tarjeta,
                    phone = telefono,
                    email = email,
                    password = password
                )
            )
            if (response.isSuccessful) {
                UiState.Success(response.body()?.message ?: "Registro exitoso")
            } else {
                UiState.Error("Error en el registro (${response.code()})")
            }
        } catch (e: Exception) {
            UiState.Error("Sin conexión: ${e.localizedMessage}")
        }
    }

    override suspend fun registerRepartidor(
        nombre: String, email: String, password: String,
        telefono: String, direccion: String, cedula: String, tarjeta: String
    ): UiState<String> {
        return try {
            val response = apiService.registerRepartidor(
                RegisterRepartidorRequest(
                    nationalId = cedula,
                    name = nombre,
                    email = email,
                    password = password,
                    address = direccion,
                    phone = telefono,
                    cardNumber = tarjeta
                )
            )
            if (response.isSuccessful) {
                UiState.Success(response.body()?.message ?: "Registro exitoso")
            } else {
                UiState.Error("Error en el registro (${response.code()})")
            }
        } catch (e: Exception) {
            UiState.Error("Sin conexión: ${e.localizedMessage}")
        }
    }
}
