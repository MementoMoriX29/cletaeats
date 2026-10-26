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
 *
 * AndroidViewModel provee acceso a Application para obtener el repositorio
 * sin pasar el contexto directamente (violación de principios de MVVM).
 */
class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = (application as CletaEatsApp).authRepository

    private val _loginState = MutableStateFlow<UiState<User>>(UiState.Idle)
    val loginState: StateFlow<UiState<User>> = _loginState.asStateFlow()

    private val _registerState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val registerState: StateFlow<UiState<String>> = _registerState.asStateFlow()

    fun login(email: String, password: String, rol: String) {
        viewModelScope.launch {
            _loginState.value = UiState.Loading
            _loginState.value = repository.login(email, password, rol)
        }
    }

    fun registerCliente(nombre: String, email: String, password: String, telefono: String, direccion: String, cedula: String, tarjeta: String) {
        viewModelScope.launch {
            _registerState.value = UiState.Loading
            _registerState.value = repository.registerCliente(nombre, email, password, telefono, direccion, cedula, tarjeta)
        }
    }

    fun registerRepartidor(nombre: String, email: String, password: String, telefono: String, direccion: String, cedula: String, tarjeta: String) {
        viewModelScope.launch {
            _registerState.value = UiState.Loading
            _registerState.value = repository.registerRepartidor(nombre, email, password, telefono, direccion, cedula, tarjeta)
        }
    }

    fun resetState() {
        _loginState.value = UiState.Idle
        _registerState.value = UiState.Idle
    }
}
