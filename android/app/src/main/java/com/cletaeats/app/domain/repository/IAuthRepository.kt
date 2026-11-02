package com.cletaeats.app.domain.repository

import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.User

interface IAuthRepository {
    suspend fun login(email: String, password: String): UiState<User>
    suspend fun registerCliente(nombre: String, email: String, telefono: String, password: String): UiState<User>
    suspend fun registerRepartidor(nombre: String, email: String, telefono: String, password: String, cedula: String, vehiculo: String): UiState<User>
}
