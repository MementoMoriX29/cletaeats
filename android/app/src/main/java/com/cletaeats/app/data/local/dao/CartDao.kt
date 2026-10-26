package com.cletaeats.app.data.local.dao

import androidx.room.*
import com.cletaeats.app.data.local.entities.CartItemEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CartDao {
    @Query("SELECT * FROM cart_items ORDER BY id ASC")
    fun getAllCartItems(): Flow<List<CartItemEntity>>

    @Query("SELECT COUNT(*) FROM cart_items")
    fun getCartItemCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItem(item: CartItemEntity)

    @Update
    suspend fun updateItem(item: CartItemEntity)

    @Delete
    suspend fun deleteItem(item: CartItemEntity)

    @Query("DELETE FROM cart_items")
    suspend fun clearCart()

    @Query("SELECT * FROM cart_items WHERE comboId = :comboId LIMIT 1")
    suspend fun getItemByComboId(comboId: Int): CartItemEntity?
}
