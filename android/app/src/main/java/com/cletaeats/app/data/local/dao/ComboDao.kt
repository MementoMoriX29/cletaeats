package com.cletaeats.app.data.local.dao

import androidx.room.*
import com.cletaeats.app.data.local.entities.ComboEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ComboDao {
    @Query("SELECT * FROM combos WHERE restauranteId = :restaurantId ORDER BY numero ASC")
    fun getCombosByRestaurant(restaurantId: Int): Flow<List<ComboEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(combos: List<ComboEntity>)

    @Query("DELETE FROM combos WHERE restauranteId = :restaurantId")
    suspend fun deleteByRestaurant(restaurantId: Int)
}
