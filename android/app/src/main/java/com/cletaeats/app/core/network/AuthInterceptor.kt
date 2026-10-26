package com.cletaeats.app.core.network

import com.cletaeats.app.core.session.SessionManager
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Interceptor OkHttp que agrega el JWT en el header Authorization de cada request.
 * Si el servidor responde con 401 (token expirado o inválido):
 *   1. Limpia la sesión en DataStore
 *   2. Emite un evento en AuthEventBus
 *   3. El NavGraph redirige automáticamente a Login al recibir el evento
 *
 * Patrón: Interceptor (parte del stack de OkHttp)
 */
class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        // runBlocking necesario porque getToken() es suspend y estamos en un thread normal de OkHttp
        val token = runBlocking { sessionManager.getToken() }

        val request = chain.request().newBuilder().apply {
            if (!token.isNullOrEmpty()) {
                addHeader("Authorization", "Bearer $token")
            }
        }.build()

        val response = chain.proceed(request)

        // JWT expirado o inválido → limpiar sesión y notificar al NavGraph
        if (response.code == 401) {
            runBlocking { sessionManager.clearSession() }
            AuthEventBus.emitSessionExpired()
        }

        return response
    }
}
