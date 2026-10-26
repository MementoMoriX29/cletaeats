package com.cletaeats.app.core.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.network.AuthEventBus
import com.cletaeats.app.presentation.auth.LoginScreen
import com.cletaeats.app.presentation.auth.RegisterScreen
import com.cletaeats.app.presentation.cart.CartScreen
import com.cletaeats.app.presentation.delivery.DeliveryDashboardScreen
import com.cletaeats.app.presentation.delivery.DeliveryHistoryScreen
import com.cletaeats.app.presentation.delivery.OrderMapScreen
import com.cletaeats.app.presentation.delivery.UpdateStatusScreen
import com.cletaeats.app.presentation.history.OrderHistoryScreen
import com.cletaeats.app.presentation.home.HomeScreen
import com.cletaeats.app.presentation.order.OrderTrackingScreen
import com.cletaeats.app.presentation.profile.ProfileScreen
import com.cletaeats.app.presentation.restaurant.RestaurantDetailScreen
import com.cletaeats.app.presentation.splash.SplashScreen
import com.cletaeats.app.ui.theme.Background
import com.cletaeats.app.ui.theme.Primary
import com.cletaeats.app.ui.theme.Surface
import com.cletaeats.app.ui.theme.TextPrimary
import com.cletaeats.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

/**
 * NavGraph centraliza TODA la navegación de la app.
 *
 * Patrón Observer: observa AuthEventBus para detectar JWT expirado
 * y redirigir a Login automáticamente desde cualquier pantalla.
 *
 * ModalNavigationDrawer envuelve el contenido principal para ambos roles:
 *   Cliente → Home, Historial, Perfil
 *   Repartidor → Dashboard, Historial Entregas
 */
@Composable
fun CletaEatsNavGraph() {
    val navController = rememberNavController()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val app = context.applicationContext as CletaEatsApp

    val userRole by app.sessionManager.userRoleFlow.collectAsStateWithLifecycle(initialValue = null)
    val userName by app.sessionManager.userNameFlow.collectAsStateWithLifecycle(initialValue = null)

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Rutas que muestran el drawer (pantallas principales, no auth/detail)
    val drawerRoutes = setOf(
        Screen.Home.route, Screen.OrderHistory.route, Screen.Profile.route,
        Screen.DeliveryDashboard.route, Screen.DeliveryHistory.route
    )
    val showDrawer = currentRoute in drawerRoutes

    // Patrón Observer: escucha eventos de sesión expirada (JWT 401)
    LaunchedEffect(Unit) {
        AuthEventBus.events.collect { event ->
            when (event) {
                is AuthEventBus.AuthEvent.SessionExpired -> {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            }
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = showDrawer,
        drawerContent = {
            if (showDrawer) {
                AppDrawerContent(
                    userName = userName ?: "Usuario",
                    userRole = userRole ?: "cliente",
                    currentRoute = currentRoute,
                    onNavigate = { route ->
                        scope.launch { drawerState.close() }
                        navController.navigate(route) {
                            popUpTo(navController.graph.startDestinationId)
                            launchSingleTop = true
                        }
                    },
                    onLogout = {
                        scope.launch {
                            drawerState.close()
                            app.sessionManager.clearSession()
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    }
                )
            }
        }
    ) {
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route
        ) {
            // ── Splash ────────────────────────────────────────────────────────
            composable(Screen.Splash.route) {
                SplashScreen(
                    onNavigateToHome = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    },
                    onNavigateToDelivery = {
                        navController.navigate(Screen.DeliveryDashboard.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                )
            }

            // ── Auth ──────────────────────────────────────────────────────────
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = { role ->
                        val dest = if (role == "repartidor") Screen.DeliveryDashboard.route
                                   else Screen.Home.route
                        navController.navigate(dest) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = { role ->
                        navController.navigate(Screen.Register.createRoute(role))
                    }
                )
            }

            composable(
                route = Screen.Register.route,
                arguments = listOf(navArgument("role") { type = NavType.StringType })
            ) { backStack ->
                val role = backStack.arguments?.getString("role") ?: "cliente"
                RegisterScreen(
                    role = role,
                    onRegisterSuccess = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Register.route) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Cliente ────────────────────────────────────────────────────────
            composable(Screen.Home.route) {
                HomeScreen(
                    onRestaurantClick = { id ->
                        navController.navigate(Screen.RestaurantDetail.createRoute(id))
                    },
                    onOpenDrawer = { scope.launch { drawerState.open() } }
                )
            }

            composable(
                route = Screen.RestaurantDetail.route,
                arguments = listOf(navArgument("restaurantId") { type = NavType.IntType })
            ) { backStack ->
                val restaurantId = backStack.arguments?.getInt("restaurantId") ?: 0
                RestaurantDetailScreen(
                    restaurantId = restaurantId,
                    onNavigateToCart = { navController.navigate(Screen.Cart.route) },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Cart.route) {
                CartScreen(
                    onOrderPlaced = { orderId ->
                        navController.navigate(Screen.OrderTracking.createRoute(orderId)) {
                            popUpTo(Screen.Home.route)
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.OrderTracking.route,
                arguments = listOf(navArgument("orderId") { type = NavType.IntType })
            ) { backStack ->
                val orderId = backStack.arguments?.getInt("orderId") ?: 0
                OrderTrackingScreen(
                    orderId = orderId,
                    onBack = { navController.navigate(Screen.Home.route) { popUpTo(0) } }
                )
            }

            composable(Screen.OrderHistory.route) {
                OrderHistoryScreen(
                    onOrderClick = { id ->
                        navController.navigate(Screen.OrderTracking.createRoute(id))
                    },
                    onOpenDrawer = { scope.launch { drawerState.open() } }
                )
            }

            composable(Screen.Profile.route) {
                ProfileScreen(
                    onOpenDrawer = { scope.launch { drawerState.open() } }
                )
            }

            // ── Repartidor ─────────────────────────────────────────────────────
            composable(Screen.DeliveryDashboard.route) {
                DeliveryDashboardScreen(
                    onNavigateToMap = { id ->
                        navController.navigate(Screen.OrderMap.createRoute(id))
                    },
                    onOpenDrawer = { scope.launch { drawerState.open() } }
                )
            }

            composable(
                route = Screen.OrderMap.route,
                arguments = listOf(navArgument("orderId") { type = NavType.IntType })
            ) { backStack ->
                val orderId = backStack.arguments?.getInt("orderId") ?: 0
                OrderMapScreen(
                    orderId = orderId,
                    onNavigateToUpdateStatus = {
                        navController.navigate(Screen.UpdateStatus.createRoute(orderId))
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                route = Screen.UpdateStatus.route,
                arguments = listOf(navArgument("orderId") { type = NavType.IntType })
            ) { backStack ->
                val orderId = backStack.arguments?.getInt("orderId") ?: 0
                UpdateStatusScreen(
                    orderId = orderId,
                    onStatusUpdated = {
                        navController.navigate(Screen.DeliveryDashboard.route) {
                            popUpTo(Screen.DeliveryDashboard.route) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.DeliveryHistory.route) {
                DeliveryHistoryScreen(
                    onOpenDrawer = { scope.launch { drawerState.open() } }
                )
            }
        }
    }
}

@Composable
private fun AppDrawerContent(
    userName: String,
    userRole: String,
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit
) {
    ModalDrawerSheet(
        modifier = Modifier.width(280.dp),
        drawerContainerColor = Surface
    ) {
        // Header del drawer
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Primary)
                .padding(24.dp)
        ) {
            Column {
                Icon(
                    imageVector = Icons.Filled.Person,
                    contentDescription = null,
                    tint = TextPrimary,
                    modifier = Modifier.size(48.dp)
                )
                Spacer(Modifier.height(8.dp))
                Text(userName, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    if (userRole == "repartidor") "Repartidor" else "Cliente",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary.copy(alpha = 0.8f)
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        if (userRole == "repartidor") {
            // Menú repartidor
            DrawerItem(Icons.Filled.Dashboard, "Dashboard", Screen.DeliveryDashboard.route, currentRoute, onNavigate)
            DrawerItem(Icons.Filled.History, "Historial de Entregas", Screen.DeliveryHistory.route, currentRoute, onNavigate)
        } else {
            // Menú cliente
            DrawerItem(Icons.Filled.Home, "Inicio", Screen.Home.route, currentRoute, onNavigate)
            DrawerItem(Icons.Filled.Receipt, "Mis Pedidos", Screen.OrderHistory.route, currentRoute, onNavigate)
            DrawerItem(Icons.Filled.Person, "Perfil", Screen.Profile.route, currentRoute, onNavigate)
        }

        Spacer(Modifier.weight(1f))
        HorizontalDivider(color = com.cletaeats.app.ui.theme.Divider)

        NavigationDrawerItem(
            icon = { Icon(Icons.Filled.Logout, null, tint = com.cletaeats.app.ui.theme.Error) },
            label = { Text("Cerrar Sesión", color = com.cletaeats.app.ui.theme.Error) },
            selected = false,
            onClick = onLogout,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
        )
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun DrawerItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    route: String,
    currentRoute: String?,
    onNavigate: (String) -> Unit
) {
    NavigationDrawerItem(
        icon = { Icon(icon, contentDescription = null) },
        label = { Text(label) },
        selected = currentRoute == route,
        onClick = { onNavigate(route) },
        colors = NavigationDrawerItemDefaults.colors(
            selectedContainerColor = Primary.copy(alpha = 0.15f),
            selectedIconColor = Primary,
            selectedTextColor = Primary,
            unselectedIconColor = TextSecondary,
            unselectedTextColor = TextSecondary
        ),
        modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp)
    )
}
