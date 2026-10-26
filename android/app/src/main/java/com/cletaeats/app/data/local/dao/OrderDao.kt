package com.cletaeats.app.data.local.dao

import androidx.room.*
import com.cletaeats.app.data.local.entities.OrderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Query("SELECT * FROM orders WHERE clienteId = :clienteId ORDER BY creadoEn DESC")
    fun getOrdersByClient(clienteId: Int): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE id = :orderId")
    fun getOrderById(orderId: Int): Flow<OrderEntity?>

    @Query("SELECT * FROM orders WHERE syncStatus = 'PENDING_SYNC'")
    suspend fun getPendingOrders(): List<OrderEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(orders: List<OrderEntity>)

    @Query("UPDATE orders SET estado = :estado WHERE id = :orderId")
    suspend fun updateStatus(orderId: Int, estado: String)

    @Query("UPDATE orders SET syncStatus = :syncStatus WHERE id = :orderId")
    suspend fun updateSyncStatus(orderId: Int, syncStatus: String)

    @Query("UPDATE orders SET repartidorLatitud = :lat, repartidorLongitud = :lng WHERE id = :orderId")
    suspend fun updateDeliveryLocation(orderId: Int, lat: Double, lng: Double)
}
