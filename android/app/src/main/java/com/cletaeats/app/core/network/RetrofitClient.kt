package com.cletaeats.app.core.network

import com.cletaeats.app.BuildConfig
import com.cletaeats.app.core.session.SessionManager
import com.cletaeats.app.data.remote.api.AuthApiService
import com.cletaeats.app.data.remote.api.DeliveryApiService
import com.cletaeats.app.data.remote.api.OrderApiService
import com.cletaeats.app.data.remote.api.RestaurantApiService
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Patrón Singleton: una única instancia de Retrofit y OkHttpClient para toda la app.
 * Centraliza la configuración de red: timeouts, interceptores, base URL.
 *
 * La URL del backend sale de BuildConfig.API_BASE_URL: en debug apunta al backend local
 * (10.0.2.2 desde el emulador) y en release al dominio desplegado (ver app/build.gradle.kts).
 */
class RetrofitClient private constructor(sessionManager: SessionManager) {

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                else HttpLoggingInterceptor.Level.NONE
        // El token nunca se escribe en el log
        redactHeader("Authorization")
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(sessionManager))   // JWT en cada request
        .addInterceptor(loggingInterceptor)                 // Logs en modo debug
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    // Servicios creados lazy — solo se instancian cuando se usan por primera vez
    val authApiService: AuthApiService = retrofit.create(AuthApiService::class.java)
    val restaurantApiService: RestaurantApiService = retrofit.create(RestaurantApiService::class.java)
    val orderApiService: OrderApiService = retrofit.create(OrderApiService::class.java)
    val deliveryApiService: DeliveryApiService = retrofit.create(DeliveryApiService::class.java)

    companion object {
        @Volatile private var INSTANCE: RetrofitClient? = null

        fun getInstance(sessionManager: SessionManager): RetrofitClient =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: RetrofitClient(sessionManager).also { INSTANCE = it }
            }
    }
}
