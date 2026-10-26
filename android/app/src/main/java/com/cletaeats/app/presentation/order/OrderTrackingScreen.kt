package com.cletaeats.app.presentation.order

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Order
import com.cletaeats.app.presentation.components.*
import com.cletaeats.app.ui.theme.*
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*

/**
 * Pantalla de seguimiento del pedido en tiempo real.
 *
 * Estrategia offline-first (RQ-2):
 * - CON internet: muestra estado actualizado desde el backend cada 15s
 * - SIN internet: muestra último estado conocido de Room + banner amarillo
 *
 * El mapa de Google Maps Compose muestra la posición del repartidor
 * actualizada en cada ciclo de polling.
 */
@Composable
fun OrderTrackingScreen(
    orderId: Int,
    onBack: () -> Unit,
    viewModel: OrderViewModel = viewModel()
) {
    val orderState by viewModel.orderState.collectAsStateWithLifecycle()
    val connectivity by viewModel.connectivityStatus.collectAsStateWithLifecycle()

    LaunchedEffect(orderId) {
        viewModel.loadOrder(orderId)
        viewModel.startTrackingPolling(orderId)
    }

    val isConnected = connectivity == ConnectivityObserver.Status.Available

    Scaffold(
        topBar = {
            CletaEatsTopBar(title = "Seguimiento de Pedido #$orderId", onBackClick = onBack)
        },
        containerColor = Background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            NoConnectionBanner(isConnected)

            when (val state = orderState) {
                is UiState.Loading -> LoadingView()
                is UiState.Error -> ErrorStateView(
                    message = state.message, lottieResId = 0,
                    onRetry = { viewModel.loadOrder(orderId) }
                )
                is UiState.Success -> OrderTrackingContent(order = state.data)
                else -> {}
            }
        }
    }
}

@Composable
private fun OrderTrackingContent(order: Order) {
    Column(modifier = Modifier.fillMaxSize()) {
        // Mapa de Google Maps Compose
        val repartidorPos = if (order.repartidorLatitud != null && order.repartidorLongitud != null) {
            LatLng(order.repartidorLatitud, order.repartidorLongitud)
        } else {
            LatLng(9.9281, -84.0907)  // Centro de Heredia como fallback
        }

        val cameraState = rememberCameraPositionState {
            position = CameraPosition.fromLatLngZoom(repartidorPos, 15f)
        }

        GoogleMap(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            cameraPositionState = cameraState
        ) {
            // Marcador del repartidor
            if (order.repartidorLatitud != null && order.repartidorLongitud != null) {
                Marker(
                    state = MarkerState(position = repartidorPos),
                    title = "Tu repartidor"
                )
            }
        }

        // Panel de información del pedido
        Surface(
            color = Surface,
            tonalElevation = 8.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Estado del pedido", style = MaterialTheme.typography.titleMedium)
                    OrderStatusChip(order.estado)
                }

                Spacer(Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.LocationOn, null, tint = Primary, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(order.direccionEntrega, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                }

                Spacer(Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Total:", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    Text(formatColones(order.total), style = MaterialTheme.typography.titleMedium, color = Primary)
                }

                if (order.isPendingSync) {
                    Spacer(Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.CloudOff, null, tint = Warning, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Pedido guardado — se enviará cuando vuelva la conexión",
                            style = MaterialTheme.typography.labelSmall,
                            color = Warning
                        )
                    }
                }
            }
        }
    }
}
