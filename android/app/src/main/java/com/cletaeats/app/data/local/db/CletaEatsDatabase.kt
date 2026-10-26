package com.cletaeats.app.data.local.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.cletaeats.app.data.local.dao.CartDao
import com.cletaeats.app.data.local.dao.ComboDao
import com.cletaeats.app.data.local.dao.OrderDao
import com.cletaeats.app.data.local.dao.RestaurantDao
import com.cletaeats.app.data.local.entities.CartItemEntity
import com.cletaeats.app.data.local.entities.ComboEntity
import com.cletaeats.app.data.local.entities.OrderEntity
import com.cletaeats.app.data.local.entities.RestaurantEntity

/**
 * Patrón Singleton: una única instancia de la base de datos Room para toda la app.
 * Room es el ORM de Android que abstrae SQLite con type-safety en tiempo de compilación.
 *
 * Estrategia offline-first: Room actúa como fuente de verdad local.
 * Los repositorios escriben aquí después de cada respuesta exitosa del backend,
 * y leen de aquí cuando no hay conectividad.
 *
 * fallbackToDestructiveMigration: en v1 es aceptable; en producción real
 * se implementarían Migration objects para preservar datos del usuario.
 */
@Database(
    entities = [
        RestaurantEntity::class,
        ComboEntity::class,
        OrderEntity::class,
        CartItemEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class CletaEatsDatabase : RoomDatabase() {
    abstract fun restaurantDao(): RestaurantDao
    abstract fun comboDao(): ComboDao
    abstract fun orderDao(): OrderDao
    abstract fun cartDao(): CartDao

    companion object {
        @Volatile private var INSTANCE: CletaEatsDatabase? = null

        fun getDatabase(context: Context): CletaEatsDatabase =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    CletaEatsDatabase::class.java,
                    "cletaeats_db"
                )
                .fallbackToDestructiveMigration()
                .build()
                .also { INSTANCE = it }
            }
    }
}
