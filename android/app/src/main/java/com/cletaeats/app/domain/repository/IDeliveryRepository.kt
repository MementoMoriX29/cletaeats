package com.cletaeats.app.domain.repository

import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Order
import kotlinx.coroutines.flow.Flow

interface IDeliveryRepository {
    fun getAssignedOrders(repartidorId: Int): Flow<UiState<List<Order>>>
    suspend fun updateOrderStatus(orderId: Int, newStatus: String): UiState<Order>
    suspend fun updateDeliveryStatus(repartidorId: Int, status: String): UiState<String>
    suspend fun reportComplaint(repartidorId: Int, clienteId: Int, pedidoId: Int, descripcion: String): UiState<String>
}
