package com.cletaeats.app.data.repository

import com.cletaeats.app.core.network.errorMessage
import com.cletaeats.app.core.session.SessionManager
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.remote.api.AuthApiService
import com.cletaeats.app.data.remote.dto.CourierApplicationRequest
import com.cletaeats.app.data.remote.dto.LoginRequest
import com.cletaeats.app.data.remote.dto.RegisterRequest
import com.cletaeats.app.data.remote.dto.SessionResponse
import com.cletaeats.app.domain.model.User
import com.cletaeats.app.domain.repository.IAuthRepository
import retrofit2.Response

/**
 * Patrón Repository: abstrae la fuente de datos de auth.
 * Auth NO tiene caché local (Room): la sesión persiste con SessionManager (DataStore) y el JWT.
 *
 * Un solo login para todos los roles: el backend responde { token, user } y el rol sale de la cuenta.
 * En la app el rol se guarda como "cliente" o "repartidor" (así lo usan la navegación y las pantallas).
 * Las cuentas de restaurante y de soporte trabajan desde la web.
 */
class AuthRepository(
    private val apiService: AuthApiService,
    private val sessionManager: SessionManager
) : IAuthRepository {

    override suspend fun login(email: String, password: String): UiState<User> {
        val result = startSession { apiService.login(LoginRequest(email, password)) }
        // Un repartidor con la solicitud en revisión o rechazada todavía no puede usar la app
        if (result is UiState.Success && result.data.role == ROLE_REPARTIDOR && result.data.estado != "active") {
            return UiState.Error(applicationMessage(result.data.estado))
        }
        return result
    }

    override suspend fun registerCliente(
        nombre: String, email: String, telefono: String, password: String
    ): UiState<User> = startSession {
        apiService.register(RegisterRequest(name = nombre, email = email, phone = telefono, password = password))
    }

    override suspend fun registerRepartidor(
        nombre: String, email: String, telefono: String, password: String, cedula: String, vehiculo: String
    ): UiState<User> = startSession {
        apiService.registerCourier(
            CourierApplicationRequest(
                name = nombre, email = email, phone = telefono, password = password,
                nationalId = cedula, vehicle = vehiculo
            )
        )
    }

    // Llama a la API y, si la cuenta está activa, guarda la sesión que devuelve.
    private suspend fun startSession(call: suspend () -> Response<SessionResponse>): UiState<User> {
        return try {
            val response = call()
            val body = response.body()
            if (!response.isSuccessful || body == null) return UiState.Error(response.errorMessage())

            val role = appRole(body.user.role)
                ?: return UiState.Error("Las cuentas de restaurantes y de soporte se usan desde la web.")
            val user = User(
                id = body.user.id,
                nombre = body.user.name,
                email = body.user.email,
                role = role,
                telefono = body.user.phone,
                estado = body.user.status
            )
            if (user.estado == "active") {
                sessionManager.saveSession(
                    token = body.token,
                    userId = user.id,
                    role = role,
                    name = user.nombre,
                    email = user.email
                )
            }
            UiState.Success(user)
        } catch (e: Exception) {
            UiState.Error("No hay conexión con el servidor. Revisá tu internet.")
        }
    }

    companion object {
        const val ROLE_CLIENTE = "cliente"
        const val ROLE_REPARTIDOR = "repartidor"

        private fun appRole(apiRole: String): String? = when (apiRole) {
            "client" -> ROLE_CLIENTE
            "courier" -> ROLE_REPARTIDOR
            else -> null
        }

        fun applicationMessage(estado: String): String = when (estado) {
            "pending" -> "Recibimos tu solicitud. Soporte está revisando tus datos y te avisa cuando tu cuenta esté habilitada."
            "rejected" -> "Tu solicitud de repartidor no fue aprobada. Escribinos a soporte si tenés dudas."
            else -> "Tu cuenta no está activa. Contactá a soporte."
        }
    }
}
