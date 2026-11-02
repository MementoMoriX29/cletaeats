package com.cletaeats.app.presentation.profile

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.network.errorMessage
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.remote.dto.UpdateProfileRequest
import com.cletaeats.app.data.remote.dto.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

// Perfil de la cuenta con sesión iniciada (GET/PUT /me): no hace falta mandar el id,
// el servidor lo toma del token, así nadie puede pedir el perfil de otra persona.
class ProfileViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as CletaEatsApp

    val userRole = app.sessionManager.userRoleFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), null)

    private val _profileState = MutableStateFlow<UiState<UserDto>>(UiState.Loading)
    val profileState: StateFlow<UiState<UserDto>> = _profileState.asStateFlow()

    private val _updateState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val updateState: StateFlow<UiState<String>> = _updateState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _profileState.value = UiState.Loading
            _profileState.value = try {
                val response = app.authApiService.getProfile()
                val body = response.body()
                if (response.isSuccessful && body != null) UiState.Success(body)
                else UiState.Error(response.errorMessage())
            } catch (e: Exception) {
                UiState.Error("No hay conexión con el servidor. Revisá tu internet.")
            }
        }
    }

    fun updateProfile(name: String, phone: String) {
        viewModelScope.launch {
            _updateState.value = UiState.Loading
            _updateState.value = try {
                val response = app.authApiService.updateProfile(UpdateProfileRequest(name, phone))
                val body = response.body()
                if (response.isSuccessful && body != null) {
                    _profileState.value = UiState.Success(body)
                    UiState.Success("Datos guardados")
                } else {
                    UiState.Error(response.errorMessage())
                }
            } catch (e: Exception) {
                UiState.Error("No hay conexión con el servidor. Revisá tu internet.")
            }
        }
    }

    fun resetUpdateState() { _updateState.value = UiState.Idle }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            app.sessionManager.clearSession()
            onLoggedOut()
        }
    }
}
