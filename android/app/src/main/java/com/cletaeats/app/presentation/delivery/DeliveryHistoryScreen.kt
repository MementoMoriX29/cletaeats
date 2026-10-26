package com.cletaeats.app.presentation.delivery

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
 * Historial de entregas del repartidor.
 * LazyColumn es el equivalente declarativo de RecyclerView en Jetpack Compose.
 */
@Composable
fun DeliveryHistoryScreen(
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
        topBar = { CletaEatsTopBar(title = "Historial de Entregas", onMenuClick = onOpenDrawer) },
        containerColor = Background
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            NoConnectionBanner(isConnected)

            when (val state = ordersState) {
                is UiState.Loading -> LoadingView()
                is UiState.Error -> ErrorStateView(state.message, 0, { repartidorId?.let { viewModel.loadAssignedOrders(it) } })
                is UiState.Success -> {
                    val delivered = state.data.filter { it.estado == "entregado" }
                    if (delivered.isEmpty()) {
                        EmptyStateView("Sin entregas completadas aún", 0)
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(delivered, key = { it.id }) { order ->
                                DeliveredOrderCard(order)
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
private fun DeliveredOrderCard(order: Order) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Filled.CheckCircle, null, tint = Success, modifier = Modifier.size(36.dp))
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Pedido #${order.id}", style = MaterialTheme.typography.titleMedium)
                Text(order.direccionEntrega, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                Text(order.creadoEn.take(10), style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            }
            Text(formatColones(order.total), style = MaterialTheme.typography.titleMedium, color = Primary)
        }
    }
}
