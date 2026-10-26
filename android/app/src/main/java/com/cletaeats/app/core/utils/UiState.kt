package com.cletaeats.app.core.utils

/**
 * Patrón Observer aplicado a estados de UI.
 * StateFlow<UiState<T>> en cada ViewModel permite que los Composables
 * reaccionen a cambios de estado sin polling ni callbacks explícitos.
 *
 * Cada pantalla observa su ViewModel con collectAsStateWithLifecycle()
 * y renderiza el estado apropiado: Loading → Success → Error.
 */
sealed class UiState<out T> {
    // Estado inicial — antes de lanzar cualquier operación
    object Idle : UiState<Nothing>()

    // Operación en curso — mostrar spinner o Lottie de carga
    object Loading : UiState<Nothing>()

    // Operación exitosa con datos
    data class Success<out T>(val data: T) : UiState<T>()

    // Error de red, servidor o validación — mostrar mensaje + botón reintentar
    data class Error(val message: String) : UiState<Nothing>()
}
