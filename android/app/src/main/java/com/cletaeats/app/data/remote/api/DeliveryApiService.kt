package com.cletaeats.app.data.remote.api

import com.cletaeats.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface DeliveryApiService {
    // PUT /api/delivery-persons/:id/status
    @PUT("delivery-persons/{id}/status")
    suspend fun updateDeliveryStatus(
        @Path("id") repartidorId: Int,
        @Body request: UpdateDeliveryStatusRequest
    ): Response<MessageResponse>

    // POST /api/delivery-persons/:id/complaints
    @POST("delivery-persons/{id}/complaints")
    suspend fun reportComplaint(
        @Path("id") repartidorId: Int,
        @Body request: ReportRequest
    ): Response<ReportResponse>

    // No hay endpoint explícito para pedidos por repartidor en el backend.
    // Verificar con el equipo backend si existe una ruta diferente.
    @GET("orders/delivery-person/{id}")
    suspend fun getAssignedOrders(@Path("id") repartidorId: Int): Response<List<OrderDto>>
}
