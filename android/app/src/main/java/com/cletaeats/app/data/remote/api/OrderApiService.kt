package com.cletaeats.app.data.remote.api

import com.cletaeats.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface OrderApiService {
    // POST /api/orders
    @POST("orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): Response<OrderDto>

    // GET /api/orders/client/:clientId
    @GET("orders/client/{clientId}")
    suspend fun getOrdersByClient(@Path("clientId") clientId: Int): Response<List<OrderDto>>

    // GET /api/orders/:id
    @GET("orders/{id}")
    suspend fun getOrderById(@Path("id") orderId: Int): Response<OrderDto>

    // PUT /api/orders/:id/status
    @PUT("orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: Int,
        @Body request: UpdateOrderStatusRequest
    ): Response<OrderDto>

    // GET /api/orders/:id/invoice
    @GET("orders/{id}/invoice")
    suspend fun getInvoice(@Path("id") orderId: Int): Response<InvoiceDto>
}
