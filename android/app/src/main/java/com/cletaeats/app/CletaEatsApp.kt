package com.cletaeats.app

import android.app.Application
import com.cletaeats.app.core.network.RetrofitClient
import com.cletaeats.app.core.session.SessionManager
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.data.local.db.CletaEatsDatabase
import com.cletaeats.app.data.remote.api.AuthApiService
import com.cletaeats.app.data.remote.api.DeliveryApiService
import com.cletaeats.app.data.remote.api.OrderApiService
import com.cletaeats.app.data.remote.api.RestaurantApiService
import com.cletaeats.app.data.repository.AuthRepository
import com.cletaeats.app.data.repository.DeliveryRepository
import com.cletaeats.app.data.repository.OrderRepository
import com.cletaeats.app.data.repository.RestaurantRepository

/**
 * Patrón Singleton: Application actúa como contenedor de dependencias (DI manual).
 * Una única instancia vive durante todo el ciclo de vida de la app.
 *
 * Inicializa Room, SessionManager y Retrofit de forma lazy para no bloquear
 * el hilo principal durante el arranque de la app.
 *
 * Todos los singletons se exponen aquí para que los ViewModels los accedan
 * via (context.applicationContext as CletaEatsApp), evitando un framework
 * de DI externo para mantener la simplicidad académica del proyecto.
 */
class CletaEatsApp : Application() {

    // Base de datos Room — Singleton (ver CletaEatsDatabase)
    val database by lazy { CletaEatsDatabase.getDatabase(this) }

    // Gestión de sesión JWT — Singleton con DataStore
    val sessionManager by lazy { SessionManager.getInstance(this) }

    // Observer de conectividad — compartido entre repositorios
    val connectivityObserver by lazy { ConnectivityObserver(this) }

    // RetrofitClient — Singleton que crea todos los servicios Retrofit
    private val retrofitClient by lazy { RetrofitClient.getInstance(sessionManager) }

    // Servicios Retrofit — creados lazy por RetrofitClient
    val authApiService: AuthApiService by lazy { retrofitClient.authApiService }
    val restaurantApiService: RestaurantApiService by lazy { retrofitClient.restaurantApiService }
    val orderApiService: OrderApiService by lazy { retrofitClient.orderApiService }
    val deliveryApiService: DeliveryApiService by lazy { retrofitClient.deliveryApiService }

    // Repositorios — implementan patrón Repository (abstracción Room vs Retrofit)
    val authRepository by lazy {
        AuthRepository(authApiService, sessionManager)
    }
    val restaurantRepository by lazy {
        RestaurantRepository(
            restaurantApiService, database.restaurantDao(),
            database.comboDao(), connectivityObserver
        )
    }
    val orderRepository by lazy {
        OrderRepository(
            orderApiService, database.orderDao(),
            database.cartDao(), connectivityObserver
        )
    }
    val deliveryRepository by lazy {
        DeliveryRepository(
            deliveryApiService, orderApiService,
            database.orderDao(), connectivityObserver
        )
    }
}
