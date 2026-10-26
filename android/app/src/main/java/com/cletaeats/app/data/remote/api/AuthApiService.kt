package com.cletaeats.app.data.remote.api

import com.cletaeats.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Contrato Retrofit para los endpoints de autenticación.
 * Reto de integración RQ-2: el backend Express.js devuelve JWT en la respuesta de login.
 * AuthInterceptor inyecta este token en los headers de las siguientes requests.
 */
interface AuthApiService {
    // POST /api/auth/login
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    // POST /api/auth/register-client
    @POST("auth/register-client")
    suspend fun registerCliente(@Body request: RegisterClienteRequest): Response<MessageResponse>

    // POST /api/auth/register-delivery-person
    @POST("auth/register-delivery-person")
    suspend fun registerRepartidor(@Body request: RegisterRepartidorRequest): Response<MessageResponse>

    // GET /api/clients/:id
    @GET("clients/{id}")
    suspend fun getClientProfile(@Path("id") id: Int): Response<ClientProfileResponse>

    // PUT /api/clients/:id
    @PUT("clients/{id}")
    suspend fun updateClientProfile(
        @Path("id") id: Int,
        @Body request: UpdateClientRequest
    ): Response<MessageResponse>
}
