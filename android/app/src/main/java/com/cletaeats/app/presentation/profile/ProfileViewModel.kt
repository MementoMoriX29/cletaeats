package com.cletaeats.app.presentation.profile

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.remote.dto.ClientProfileResponse
import com.cletaeats.app.data.remote.dto.UpdateClientRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ProfileViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as CletaEatsApp

    val userRole = app.sessionManager.userRoleFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), null)

    private val _profileState = MutableStateFlow<UiState<ClientProfileResponse>>(UiState.Loading)
    val profileState: StateFlow<UiState<ClientProfileResponse>> = _profileState.asStateFlow()

    private val _updateState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val updateState: StateFlow<UiState<String>> = _updateState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _profileState.value = UiState.Loading
            val id = app.sessionManager.getUserId() ?: return@launch
            _profileState.value = try {
                val response = app.authApiService.getClientProfile(id)
                if (response.isSuccessful) {
                    UiState.Success(response.body()!!)
                } else {
                    UiState.Error("Error cargando perfil (${response.code()})")
                }
            } catch (e: Exception) {
                UiState.Error("Sin conexión: ${e.localizedMessage}")
            }
        }
    }

    fun updateProfile(name: String, phone: String, address: String, cardNumber: String?, email: String) {
        viewModelScope.launch {
            _updateState.value = UiState.Loading
            val id = app.sessionManager.getUserId() ?: return@launch
            _updateState.value = try {
                val response = app.authApiService.updateClientProfile(
                    id, UpdateClientRequest(name, phone, address, cardNumber, email)
                )
                if (response.isSuccessful) {
                    loadProfile()
                    UiState.Success("Perfil actualizado")
                } else {
                    UiState.Error("Error actualizando perfil (${response.code()})")
                }
            } catch (e: Exception) {
                UiState.Error("Sin conexión: ${e.localizedMessage}")
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
