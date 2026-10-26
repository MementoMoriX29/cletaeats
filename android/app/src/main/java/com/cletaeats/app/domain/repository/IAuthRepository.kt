package com.cletaeats.app.domain.repository

import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.User

interface IAuthRepository {
    suspend fun login(email: String, password: String, rol: String): UiState<User>
    suspend fun registerCliente(nombre: String, email: String, password: String, telefono: String, direccion: String, cedula: String, tarjeta: String): UiState<String>
    suspend fun registerRepartidor(nombre: String, email: String, password: String, telefono: String, direccion: String, cedula: String, tarjeta: String): UiState<String>
}
