package com.cletaeats.app.presentation.delivery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Order
import com.cletaeats.app.presentation.components.*
import com.cletaeats.app.ui.theme.*

/**
 * Dashboard del repartidor — muestra pedidos asignados.
 * Al presionar "Ver Mapa" navega a OrderMapScreen con el mapa de ruta.
 *
 * LazyColumn es el equivalente declarativo de RecyclerView en Jetpack Compose.
 */
@Composable
fun DeliveryDashboardScreen(
    onNavigateToMap: (Int) -> Unit,
    onOpenDrawer: () -> Unit,
    viewModel: DeliveryViewModel = viewModel()
) {
    val ordersState by viewModel.assignedOrdersState.collectAsStateWithLifecycle()
    val connectivity by viewModel.connectivityStatus.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val app = context.applicationContext as CletaEatsApp
    val repartidorId by app.sessionManager.userIdFlow.collectAsStateWithLifecycle(initialValue = null)

    LaunchedEffect(repartidorId) {
        repartidorId?.let { viewModel.loadAssignedOrders(it) }
    }

    val isConnected = connectivity == ConnectivityObserver.Status.Available

    Scaffold(
        topBar = { CletaEatsTopBar(title = "Mis Entregas", onMenuClick = onOpenDrawer) },
        containerColor = Background
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            NoConnectionBanner(isConnected)

            when (val state = ordersState) {
                is UiState.Loading -> LoadingView()
                is UiState.Error -> ErrorStateView(state.message, 0, { repartidorId?.let { viewModel.loadAssignedOrders(it) } })
                is UiState.Success -> {
                    if (state.data.isEmpty()) {
                        EmptyStateView("Sin pedidos asignados por ahora", 0)
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(state.data, key = { it.id }) { order ->
                                AssignedOrderCard(order = order, onViewMap = { onNavigateToMap(order.id) })
                            }
                        }
                    }
                }
                else -> {}
            }
        }
    }
}

@Composable
private fun AssignedOrderCard(order: Order, onViewMap: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Pedido #${order.id}", style = MaterialTheme.typography.titleMedium)
                OrderStatusChip(order.estado)
            }

            Spacer(Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.LocationOn, null, tint = Primary, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(order.direccionEntrega, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            }

            Spacer(Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Total: ${formatColones(order.total)}", style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
            }

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = onViewMap,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Icon(Icons.Filled.Map, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Ver Ruta en Mapa")
            }
        }
    }
}
