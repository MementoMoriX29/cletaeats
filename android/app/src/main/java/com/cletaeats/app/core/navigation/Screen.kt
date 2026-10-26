package com.cletaeats.app.core.navigation

/**
 * Rutas de navegación tipadas para Navigation Compose.
 * Centralizar las rutas aquí evita strings hardcoded dispersos en la UI,
 * reduciendo errores de navegación (equivalente a SafeArgs en Navigation Fragment).
 */
sealed class Screen(val route: String) {

    // ── Comunes ──────────────────────────────────────────────────────────────
    object Splash : Screen("splash")
    object Login : Screen("login")

    object Register : Screen("register/{role}") {
        fun createRoute(role: String) = "register/$role"  // "cliente" | "repartidor"
    }

    // ── Flujo Cliente ─────────────────────────────────────────────────────────
    object Home : Screen("home")

    object RestaurantDetail : Screen("restaurant/{restaurantId}") {
        fun createRoute(restaurantId: Int) = "restaurant/$restaurantId"
    }

    object Cart : Screen("cart")

    object OrderTracking : Screen("order_tracking/{orderId}") {
        fun createRoute(orderId: Int) = "order_tracking/$orderId"
    }

    object OrderHistory : Screen("order_history")

    object Profile : Screen("profile")

    // ── Flujo Repartidor ──────────────────────────────────────────────────────
    object DeliveryDashboard : Screen("delivery_dashboard")

    object OrderMap : Screen("order_map/{orderId}") {
        fun createRoute(orderId: Int) = "order_map/$orderId"
    }

    object UpdateStatus : Screen("update_status/{orderId}") {
        fun createRoute(orderId: Int) = "update_status/$orderId"
    }

    object DeliveryHistory : Screen("delivery_history")
}
