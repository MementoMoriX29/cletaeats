package com.cletaeats.app.core.network

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Bus de eventos de autenticación — desacopla el interceptor de OkHttp
 * de la navegación en Compose.
 *
 * Cuando AuthInterceptor recibe un 401, no puede navegar directamente
 * (corre en el thread pool de OkHttp). En cambio emite un evento aquí,
 * y el NavGraph lo observa para redirigir a Login.
 *
 * Patrón Observer + Singleton.
 */
object AuthEventBus {

    private val _events = MutableSharedFlow<AuthEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<AuthEvent> = _events.asSharedFlow()

    sealed class AuthEvent {
        object SessionExpired : AuthEvent()
    }

    // tryEmit es thread-safe y no suspende — seguro para llamar desde OkHttp thread pool
    fun emitSessionExpired() {
        _events.tryEmit(AuthEvent.SessionExpired)
    }
}
