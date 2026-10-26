package com.cletaeats.app.core.session

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

// Extensión de Context para obtener la instancia única de DataStore
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "cletaeats_session")

/**
 * Patrón Singleton: una única instancia de SessionManager en toda la app.
 * Responsabilidad: persistir y proveer los datos de sesión del usuario (JWT, rol, ID).
 *
 * Usa DataStore Preferences en lugar de SharedPreferences porque:
 * - API basada en Coroutines (no bloquea el hilo principal)
 * - Type-safe mediante Preferences.Key
 * - Manejo correcto de excepciones IO
 *
 * Al iniciar la app:
 *   token válido → navegar a Home (cliente) o DeliveryDashboard (repartidor)
 *   sin token    → navegar a Login
 *
 * Token expirado (HTTP 401) → clearSession() → redirigir a Login automáticamente
 * (manejado en AuthInterceptor + AuthEventBus)
 */
class SessionManager private constructor(private val context: Context) {

    // Claves tipadas para DataStore (evita errores de typo en strings)
    private object Keys {
        val TOKEN = stringPreferencesKey("jwt_token")
        val USER_ID = intPreferencesKey("user_id")
        val USER_ROLE = stringPreferencesKey("user_role")   // "cliente" | "repartidor"
        val USER_NAME = stringPreferencesKey("user_name")
        val USER_EMAIL = stringPreferencesKey("user_email")
    }

    // Flows reactivos — los Composables los observan directamente
    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[Keys.TOKEN] }
    val userIdFlow: Flow<Int?> = context.dataStore.data.map { it[Keys.USER_ID] }
    val userRoleFlow: Flow<String?> = context.dataStore.data.map { it[Keys.USER_ROLE] }
    val userNameFlow: Flow<String?> = context.dataStore.data.map { it[Keys.USER_NAME] }
    val userEmailFlow: Flow<String?> = context.dataStore.data.map { it[Keys.USER_EMAIL] }

    // Guarda todos los datos de sesión tras un login exitoso
    suspend fun saveSession(token: String, userId: Int, role: String, name: String, email: String) {
        context.dataStore.edit { prefs ->
            prefs[Keys.TOKEN] = token
            prefs[Keys.USER_ID] = userId
            prefs[Keys.USER_ROLE] = role
            prefs[Keys.USER_NAME] = name
            prefs[Keys.USER_EMAIL] = email
        }
    }

    // Elimina todos los datos de sesión — llamado en logout o cuando el JWT expira
    suspend fun clearSession() {
        context.dataStore.edit { it.clear() }
    }

    // Lecturas puntuales (no reactivas) — usadas en interceptores y workers
    suspend fun getToken(): String? = context.dataStore.data.map { it[Keys.TOKEN] }.first()
    suspend fun getUserId(): Int? = context.dataStore.data.map { it[Keys.USER_ID] }.first()
    suspend fun getUserRole(): String? = context.dataStore.data.map { it[Keys.USER_ROLE] }.first()
    suspend fun getUserName(): String? = context.dataStore.data.map { it[Keys.USER_NAME] }.first()
    suspend fun isLoggedIn(): Boolean = !getToken().isNullOrEmpty()

    companion object {
        @Volatile private var INSTANCE: SessionManager? = null

        fun getInstance(context: Context): SessionManager =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: SessionManager(context.applicationContext).also { INSTANCE = it }
            }
    }
}
