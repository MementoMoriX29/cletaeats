package com.cletaeats.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class UpdateDeliveryStatusRequest(
    val status: String   // "disponible" | "inactivo" (la suspensión la decide el admin)
)

data class ReportRequest(
    @SerializedName("clientId") val clienteId: Int,
    @SerializedName("orderId") val pedidoId: Int,
    val description: String
)

data class ReportResponse(
    val id: Int,
    val message: String
)
