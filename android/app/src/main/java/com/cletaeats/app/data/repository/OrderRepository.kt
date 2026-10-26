package com.cletaeats.app.data.repository

import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.local.dao.CartDao
import com.cletaeats.app.data.local.dao.OrderDao
import com.cletaeats.app.data.local.entities.CartItemEntity
import com.cletaeats.app.data.local.entities.OrderEntity
import com.cletaeats.app.data.remote.api.OrderApiService
import com.cletaeats.app.data.remote.dto.CreateOrderRequest
import com.cletaeats.app.data.remote.dto.OrderItemRequest
import com.cletaeats.app.domain.model.CartItem
import com.cletaeats.app.domain.model.Invoice
import com.cletaeats.app.domain.model.Order
import com.cletaeats.app.domain.model.OrderItem
import com.cletaeats.app.domain.repository.IOrderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map

/**
 * Patrón Repository con estrategia offline-first para pedidos.
 *
 * Estrategia createOrder() sin internet (responde RQ-2):
 *   SIN internet → guarda OrderEntity con syncStatus="PENDING_SYNC" en Room
 *                → WorkManager (SyncOrdersWorker) lo enviará cuando vuelva la red
 *                → el usuario ve el pedido en historial inmediatamente
 *
 * Estrategia getOrderById() (tracking offline-first):
 *   CON internet → refresca desde backend → actualiza Room
 *   SIN internet → muestra último estado de Room + banner "sin conexión"
 *
 * getOrdersByClient():
 *   CON internet → Retrofit → actualiza Room → retorna Flow de Room
 *   SIN internet → retorna Flow de Room directamente (historial en caché)
 */
class OrderRepository(
    private val apiService: OrderApiService,
    private val orderDao: OrderDao,
    private val cartDao: CartDao,
    private val connectivityObserver: ConnectivityObserver
) : IOrderRepository {

    // ── Pedidos ───────────────────────────────────────────────────────────────

    override fun getOrdersByClient(clienteId: Int): Flow<UiState<List<Order>>> = flow {
        emit(UiState.Loading)

        if (connectivityObserver.isCurrentlyConnected()) {
            try {
                val response = apiService.getOrdersByClient(clienteId)
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
            } catch (e: Exception) { /* Fallback a Room */ }
        }

        // Room como fuente de verdad — Flow reactivo actualiza la UI automáticamente
        orderDao.getOrdersByClient(clienteId).collect { entities ->
            emit(UiState.Success(entities.map { it.toDomain() }))
        }
    }

    override fun getOrderById(orderId: Int): Flow<UiState<Order>> = flow {
        emit(UiState.Loading)

        if (connectivityObserver.isCurrentlyConnected()) {
            try {
                val response = apiService.getOrderById(orderId)
                if (response.isSuccessful) {
                    val dto = response.body()!!
                    orderDao.insertOrder(OrderEntity(
                        id = dto.id, clienteId = dto.clienteId,
                        restauranteId = dto.restauranteId, repartidorId = dto.repartidorId,
                        estado = dto.status, subtotal = dto.subtotal,
                        transporte = dto.transporte, iva = dto.tax, total = dto.total,
                        direccionEntrega = dto.direccionEntrega, creadoEn = dto.creadoEn,
                        repartidorLatitud = dto.repartidorLatitud,
                        repartidorLongitud = dto.repartidorLongitud,
                        syncStatus = "SYNCED"
                    ))
                }
            } catch (e: Exception) { /* Usa Room */ }
        }

        // Tracking offline-first: Room tiene el último estado conocido del pedido
        orderDao.getOrderById(orderId).collect { entity ->
            if (entity != null) emit(UiState.Success(entity.toDomain()))
            else emit(UiState.Error("Pedido no encontrado"))
        }
    }

    override suspend fun createOrder(
        clienteId: Int, restauranteId: Int,
        items: List<CartItem>, direccion: String
    ): UiState<Order> {
        if (connectivityObserver.isCurrentlyConnected()) {
            return try {
                val response = apiService.createOrder(
                    CreateOrderRequest(
                        clienteId = clienteId,
                        restauranteId = restauranteId,
                        items = items.map { OrderItemRequest(it.comboId, it.cantidad) },
                        direccionEntrega = direccion
                    )
                )
                if (response.isSuccessful) {
                    val dto = response.body()!!
                    orderDao.insertOrder(OrderEntity(
                        id = dto.id, clienteId = dto.clienteId,
                        restauranteId = dto.restauranteId, repartidorId = dto.repartidorId,
                        estado = dto.status, subtotal = dto.subtotal,
                        transporte = dto.transporte, iva = dto.tax, total = dto.total,
                        direccionEntrega = dto.direccionEntrega, creadoEn = dto.creadoEn,
                        syncStatus = "SYNCED"
                    ))
                    UiState.Success(Order(
                        id = dto.id, clienteId = dto.clienteId,
                        restauranteId = dto.restauranteId, repartidorId = dto.repartidorId,
                        estado = dto.status, subtotal = dto.subtotal,
                        transporte = dto.transporte, iva = dto.tax, total = dto.total,
                        direccionEntrega = dto.direccionEntrega, creadoEn = dto.creadoEn
                    ))
                } else {
                    UiState.Error("Error al crear pedido (${response.code()})")
                }
            } catch (e: Exception) {
                UiState.Error("Error de red: ${e.localizedMessage}")
            }
        } else {
            // SIN internet: guarda en Room con PENDING_SYNC
            // WorkManager (SyncOrdersWorker) sincronizará cuando vuelva la red
            val tempId = System.currentTimeMillis().toInt()
            val subtotal = items.sumOf { it.subtotal }.toDouble()
            val transporte = 1500.0
            val iva = subtotal * 0.13
            val total = subtotal + transporte + iva

            val pendingOrder = OrderEntity(
                id = tempId, clienteId = clienteId, restauranteId = restauranteId,
                repartidorId = null, estado = "en_preparacion",
                subtotal = subtotal, transporte = transporte, iva = iva, total = total,
                direccionEntrega = direccion, syncStatus = "PENDING_SYNC",
                creadoEn = java.time.Instant.now().toString()
            )
            orderDao.insertOrder(pendingOrder)
            return UiState.Success(pendingOrder.toDomain())
        }
    }

    override suspend fun getInvoice(orderId: Int): UiState<Invoice> {
        return try {
            val response = apiService.getInvoice(orderId)
            if (response.isSuccessful) {
                val dto = response.body()!!
                UiState.Success(Invoice(
                    pedidoId = dto.pedidoId,
                    subtotal = dto.subtotal,
                    transporte = dto.transporte,
                    iva = dto.tax,
                    total = dto.total,
                    items = dto.items.map {
                        OrderItem(it.comboId, it.quantity, it.precioUnitario.toInt(), it.name)
                    },
                    restaurante = dto.restaurant,
                    cliente = dto.client,
                    fechaEmision = dto.fechaEmision
                ))
            } else {
                UiState.Error("No se pudo obtener la factura")
            }
        } catch (e: Exception) {
            UiState.Error("Sin conexión para factura")
        }
    }

    // ── Carrito ───────────────────────────────────────────────────────────────

    override fun getCartItems(): Flow<List<CartItem>> =
        cartDao.getAllCartItems().map { entities -> entities.map { it.toDomain() } }

    override fun getCartItemCount(): Flow<Int> = cartDao.getCartItemCount()

    override suspend fun addToCart(item: CartItem) {
        val existing = cartDao.getItemByComboId(item.comboId)
        if (existing != null) {
            cartDao.updateItem(existing.copy(cantidad = existing.cantidad + item.cantidad))
        } else {
            cartDao.insertItem(CartItemEntity(
                comboId = item.comboId, comboNombre = item.comboNombre,
                comboPrecio = item.comboPrecio, cantidad = item.cantidad,
                restauranteId = item.restauranteId, comboImagen = item.comboImagen
            ))
        }
    }

    override suspend fun removeFromCart(item: CartItem) {
        cartDao.deleteItem(CartItemEntity(
            id = item.id, comboId = item.comboId, comboNombre = item.comboNombre,
            comboPrecio = item.comboPrecio, cantidad = item.cantidad,
            restauranteId = item.restauranteId
        ))
    }

    override suspend fun clearCart() = cartDao.clearCart()
}

private fun OrderEntity.toDomain() = Order(
    id = id, clienteId = clienteId, restauranteId = restauranteId,
    repartidorId = repartidorId, estado = estado,
    subtotal = subtotal, transporte = transporte, iva = iva, total = total,
    direccionEntrega = direccionEntrega, creadoEn = creadoEn,
    repartidorLatitud = repartidorLatitud, repartidorLongitud = repartidorLongitud,
    isPendingSync = syncStatus == "PENDING_SYNC"
)

private fun CartItemEntity.toDomain() = CartItem(
    id = id, comboId = comboId, comboNombre = comboNombre,
    comboPrecio = comboPrecio, cantidad = cantidad,
    restauranteId = restauranteId, comboImagen = comboImagen
)
