package com.cletaeats.app.core.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.shareIn

/**
 * Observa el estado de conectividad de red como Flow reactivo.
 * Los repositorios lo usan para decidir si leer de Room o de Retrofit:
 *   isConnected = true  → Retrofit → guardar en Room → retornar datos frescos
 *   isConnected = false → leer de Room → mostrar banner "sin conexión"
 *
 * shareIn con WhileSubscribed garantiza que el NetworkCallback se registra/desregistra
 * automáticamente cuando hay/no hay colectores activos.
 */
class ConnectivityObserver(private val context: Context) {

    enum class Status { Available, Lost, Unavailable }

    val connectivityStatus: Flow<Status> = callbackFlow {
        val connectivityManager =
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { trySend(Status.Available) }
            override fun onLost(network: Network) { trySend(Status.Lost) }
            override fun onUnavailable() { trySend(Status.Unavailable) }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        connectivityManager.registerNetworkCallback(request, callback)

        // Emite el estado inicial inmediatamente
        val isConnected = connectivityManager.activeNetwork
            ?.let { connectivityManager.getNetworkCapabilities(it) }
            ?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true

        trySend(if (isConnected) Status.Available else Status.Unavailable)

        awaitClose { connectivityManager.unregisterNetworkCallback(callback) }
    }.shareIn(CoroutineScope(Dispatchers.IO), SharingStarted.WhileSubscribed(), replay = 1)

    // Lectura puntual (no reactiva) — usada en repositorios antes de cada request
    fun isCurrentlyConnected(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        return cm.activeNetwork
            ?.let { cm.getNetworkCapabilities(it) }
            ?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    }
}
