package com.cletaeats.app.core.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.data.remote.dto.CreateOrderRequest
import com.cletaeats.app.data.remote.dto.OrderItemRequest
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * WorkManager Worker para sincronizar pedidos creados offline.
 *
 * Se ejecuta cuando:
 *   1. ConnectivityObserver detecta que la red volvió
 *   2. WorkManager lo encola con Constraints.Builder().setRequiredNetworkType(CONNECTED)
 *
 * Flujo:
 *   1. Lee pedidos con syncStatus = "PENDING_SYNC" de Room
 *   2. Envía cada uno al backend via Retrofit
 *   3. Actualiza syncStatus a "SYNCED" en Room al éxito
 *   4. Si falla, retorna Result.retry() para que WorkManager reintente con backoff
 */
class SyncOrdersWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    private val gson = Gson()

    override suspend fun doWork(): Result {
        val app = applicationContext as CletaEatsApp

        return try {
            val pendingOrders = app.database.orderDao().getPendingOrders()

            for (order in pendingOrders) {
                // Deserializa items del JSON almacenado en Room
                val itemsType = object : TypeToken<List<OrderItemRequest>>() {}.type
                val items: List<OrderItemRequest> = try {
                    gson.fromJson(order.itemsJson, itemsType) ?: emptyList()
                } catch (e: Exception) {
                    emptyList()
                }

                val response = app.orderApiService.createOrder(
                    CreateOrderRequest(
                        clienteId = order.clienteId,
                        restauranteId = order.restauranteId,
                        items = items,
                        direccionEntrega = order.direccionEntrega
                    )
                )

                if (response.isSuccessful) {
                    app.database.orderDao().updateSyncStatus(order.id, "SYNCED")
                } else {
                    return Result.retry()
                }
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
