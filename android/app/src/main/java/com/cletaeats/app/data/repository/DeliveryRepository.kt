package com.cletaeats.app.data.repository

import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.local.dao.OrderDao
import com.cletaeats.app.data.local.entities.OrderEntity
import com.cletaeats.app.data.remote.api.DeliveryApiService
import com.cletaeats.app.data.remote.api.OrderApiService
import com.cletaeats.app.data.remote.dto.ReportRequest
import com.cletaeats.app.data.remote.dto.UpdateDeliveryStatusRequest
import com.cletaeats.app.data.remote.dto.UpdateOrderStatusRequest
import com.cletaeats.app.domain.model.Order
import com.cletaeats.app.domain.repository.IDeliveryRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Repositorio para el flujo del repartidor.
 *
 * Estrategia offline-first (RQ-2):
 * getAssignedOrders() guarda el pedido asignado en Room para que el repartidor
 * tenga la dirección de entrega disponible aunque pierda señal en ruta.
 *
 * updateOrderStatus() aplica optimistic update en Room antes de llamar al backend,
 * garantizando que la UI refleje el cambio de estado inmediatamente.
 */
class DeliveryRepository(
    private val deliveryApiService: DeliveryApiService,
    private val orderApiService: OrderApiService,
    private val orderDao: OrderDao,
    private val connectivityObserver: ConnectivityObserver
) : IDeliveryRepository {

    override fun getAssignedOrders(repartidorId: Int): Flow<UiState<List<Order>>> = flow {
        emit(UiState.Loading)

        if (connectivityObserver.isCurrentlyConnected()) {
            try {
                val response = deliveryApiService.getAssignedOrders(repartidorId)
                if (response.isSuccessful) {
                    val orders = response.body() ?: emptyList()
                    orderDao.insertAll(orders.map { dto ->
                        OrderEntity(
                            id = dto.id, clienteId = dto.clienteId,
                            restauranteId = dto.restauranteId, repartidorId = dto.repartidorId,
                            estado = dto.status, subtotal = dto.subtotal,
                            transporte = dto.transporte, iva = dto.tax, total = dto.total,
                            direccionEntrega = dto.direccionEntrega, creadoEn = dto.creadoEn,
                            syncStatus = "SYNCED"
                        )
                    })
                }
            } catch (e: Exception) { /* Usa caché de Room */ }
        }

        orderDao.getOrdersByClient(repartidorId).collect { entities ->
            val active = entities.filter { it.estado !in listOf("entregado", "cancelado") }
            emit(UiState.Success(active.map { it.toDomain() }))
        }
    }

    override suspend fun updateOrderStatus(orderId: Int, newStatus: String): UiState<Order> {
        // Optimistic update: actualiza Room primero para respuesta inmediata en UI
        orderDao.updateStatus(orderId, newStatus)

        return try {
            val response = orderApiService.updateOrderStatus(
                orderId, UpdateOrderStatusRequest(newStatus)
            )
            if (response.isSuccessful) {
                val dto = response.body()!!
                UiState.Success(Order(
                    id = dto.id, clienteId = dto.clienteId,
                    restauranteId = dto.restauranteId, repartidorId = dto.repartidorId,
                    estado = dto.status, subtotal = dto.subtotal,
                    transporte = dto.transporte, iva = dto.tax, total = dto.total,
                    direccionEntrega = dto.direccionEntrega, creadoEn = dto.creadoEn
                ))
            } else {
                UiState.Error("Error al actualizar estado (${response.code()})")
            }
        } catch (e: Exception) {
            UiState.Error("Sin conexión — estado actualizado localmente")
        }
    }

    override suspend fun updateDeliveryStatus(repartidorId: Int, status: String): UiState<String> {
        return try {
            val response = deliveryApiService.updateDeliveryStatus(
                repartidorId, UpdateDeliveryStatusRequest(status)
            )
            if (response.isSuccessful) UiState.Success(response.body()?.message ?: "OK")
            else UiState.Error("Error al actualizar disponibilidad")
        } catch (e: Exception) {
            UiState.Error("Sin conexión")
        }
    }

    override suspend fun reportComplaint(
        repartidorId: Int, clienteId: Int, pedidoId: Int, descripcion: String
    ): UiState<String> {
        return try {
            val response = deliveryApiService.reportComplaint(
                repartidorId, ReportRequest(clienteId, pedidoId, descripcion)
            )
            if (response.isSuccessful) UiState.Success("Queja enviada correctamente")
            else UiState.Error("No se pudo enviar la queja")
        } catch (e: Exception) {
            UiState.Error("Sin conexión")
        }
    }
}

private fun OrderEntity.toDomain() = Order(
    id = id, clienteId = clienteId, restauranteId = restauranteId,
    repartidorId = repartidorId, estado = estado,
    subtotal = subtotal, transporte = transporte, iva = iva, total = total,
    direccionEntrega = direccionEntrega, creadoEn = creadoEn,
    repartidorLatitud = repartidorLatitud, repartidorLongitud = repartidorLongitud,
    isPendingSync = syncStatus == "PENDING_SYNC"
)
