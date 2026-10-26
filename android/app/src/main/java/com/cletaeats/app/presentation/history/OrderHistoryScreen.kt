package com.cletaeats.app.presentation.history

import androidx.compose.animation.animateColorAsState
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
import androidx.compose.ui.graphics.Color
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
 * Historial de pedidos con SwipeToDismiss.
 * ← (EndToStart) rojo = marcar como archivado / ver detalle
 * → (StartToEnd) naranja = ver tracking del pedido
 *
 * LazyColumn es el equivalente declarativo de RecyclerView en Jetpack Compose:
 * sin Adapter, sin ViewHolder, sin notifyDataSetChanged().
 */
@Composable
fun OrderHistoryScreen(
    onOrderClick: (Int) -> Unit,
    onOpenDrawer: () -> Unit,
    viewModel: OrderHistoryViewModel = viewModel()
) {
    val ordersState by viewModel.ordersState.collectAsStateWithLifecycle()
    val connectivity by viewModel.connectivityStatus.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val app = context.applicationContext as CletaEatsApp
    val clienteId by app.sessionManager.userIdFlow.collectAsStateWithLifecycle(initialValue = null)

    LaunchedEffect(clienteId) {
        clienteId?.let { viewModel.loadOrders(it) }
    }

    val isConnected = connectivity == ConnectivityObserver.Status.Available

    Scaffold(
        topBar = { CletaEatsTopBar(title = "Mis Pedidos", onMenuClick = onOpenDrawer) },
        containerColor = Background
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            NoConnectionBanner(isConnected)

            when (val state = ordersState) {
                is UiState.Loading -> LoadingView()
                is UiState.Error -> ErrorStateView(state.message, 0, { clienteId?.let { viewModel.loadOrders(it) } })
                is UiState.Success -> {
                    if (state.data.isEmpty()) {
                        EmptyStateView("Aún no tenés pedidos", 0)
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.data, key = { it.id }) { order ->
                                OrderHistoryItem(
                                    order = order,
                                    onClick = { onOrderClick(order.id) }
                                )
                            }
                        }
                    }
                }
                else -> {}
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OrderHistoryItem(order: Order, onClick: () -> Unit) {
    val swipeState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.StartToEnd) { onClick(); false }
            else false
        }
    )

    SwipeToDismissBox(
        state = swipeState,
        enableDismissFromEndToStart = false,
        backgroundContent = {
            // Fondo naranja al deslizar → (ver tracking)
            val color by animateColorAsState(
                targetValue = if (swipeState.dismissDirection == SwipeToDismissBoxValue.StartToEnd)
                    Primary.copy(alpha = 0.7f) else Color.Transparent, label = ""
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(color, shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                    .padding(start = 16.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Icon(Icons.Filled.Visibility, "Ver tracking", tint = TextPrimary)
            }
        }
    ) {
        Card(
            onClick = onClick,
            modifier = Modifier.fillMaxWidth(),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Surface)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Pedido #${order.id}", style = MaterialTheme.typography.titleMedium)
                    Text(order.creadoEn.take(10), style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    Spacer(Modifier.height(4.dp))
                    OrderStatusChip(order.estado)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(formatColones(order.total), style = MaterialTheme.typography.titleMedium, color = Primary)
                    Icon(Icons.Filled.ChevronRight, null, tint = TextSecondary)
                }
            }
        }
    }
}
