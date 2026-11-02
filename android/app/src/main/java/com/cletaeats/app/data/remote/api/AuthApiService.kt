package com.cletaeats.app.data.remote.api

import com.cletaeats.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT

/**
 * Contrato Retrofit de cuentas y sesión.
 * El backend devuelve un JWT al iniciar sesión o registrarse; AuthInterceptor lo agrega
 * a las siguientes peticiones. /me siempre responde con la cuenta dueña del token.
 */
interface AuthApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<SessionResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<SessionResponse>

    @POST("auth/register-courier")
    suspend fun registerCourier(@Body request: CourierApplicationRequest): Response<SessionResponse>

    @GET("me")
    suspend fun getProfile(): Response<UserDto>

    @PUT("me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<UserDto>
}
