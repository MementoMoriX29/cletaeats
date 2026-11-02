package com.cletaeats.app.presentation.auth

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Patrón MVVM: ViewModel de autenticación.
 * Patrón Observer: loginState y registerState son StateFlow observados
 * por LoginScreen y RegisterScreen respectivamente.
 *
 * viewModelScope: las coroutines se cancelan automáticamente cuando
 * el ViewModel se destruye — evita memory leaks.
 */
class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = (application as CletaEatsApp).authRepository

    private val _loginState = MutableStateFlow<UiState<User>>(UiState.Idle)
    val loginState: StateFlow<UiState<User>> = _loginState.asStateFlow()

    // Al registrarse la sesión queda iniciada (clientes); los repartidores quedan en revisión
    private val _registerState = MutableStateFlow<UiState<User>>(UiState.Idle)
    val registerState: StateFlow<UiState<User>> = _registerState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = UiState.Loading
            _loginState.value = repository.login(email, password)
        }
    }

    fun registerCliente(nombre: String, email: String, telefono: String, password: String) {
        viewModelScope.launch {
            _registerState.value = UiState.Loading
            _registerState.value = repository.registerCliente(nombre, email, telefono, password)
        }
    }

    fun registerRepartidor(nombre: String, email: String, telefono: String, password: String, cedula: String, vehiculo: String) {
        viewModelScope.launch {
            _registerState.value = UiState.Loading
            _registerState.value = repository.registerRepartidor(nombre, email, telefono, password, cedula, vehiculo)
        }
    }

    fun resetState() {
        _loginState.value = UiState.Idle
        _registerState.value = UiState.Idle
    }
}
