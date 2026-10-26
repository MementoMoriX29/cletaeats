package com.cletaeats.app.presentation.delivery

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
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.presentation.components.CletaEatsTopBar
import com.cletaeats.app.presentation.components.LoadingView
import com.cletaeats.app.ui.theme.*

/**
 * Pantalla para que el repartidor actualice el estado del pedido.
 * Flujo: en_preparacion → en_camino → entregado
 */
@Composable
fun UpdateStatusScreen(
    orderId: Int,
    onStatusUpdated: () -> Unit,
    onBack: () -> Unit,
    viewModel: DeliveryViewModel = viewModel()
) {
    val updateState by viewModel.updateStatusState.collectAsStateWithLifecycle()
    val currentOrder by viewModel.currentOrder.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(updateState) {
        when (val state = updateState) {
            is UiState.Success -> {
                viewModel.resetUpdateState()
                onStatusUpdated()
            }
            is UiState.Error -> snackbarHostState.showSnackbar(state.message)
            else -> {}
        }
    }

    Scaffold(
        topBar = { CletaEatsTopBar(title = "Actualizar Estado", onBackClick = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Background
    ) { padding ->
        if (updateState is UiState.Loading) {
            LoadingView()
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Pedido #$orderId", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Seleccioná el nuevo estado:",
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary
            )

            Spacer(Modifier.height(16.dp))

            // Botones para cada transición de estado
            StatusButton(
                label = "En Preparación",
                description = "El restaurante está preparando el pedido",
                icon = Icons.Filled.Restaurant,
                color = Warning,
                onClick = { viewModel.updateOrderStatus(orderId, "en_preparacion") }
            )

            StatusButton(
                label = "En Camino",
                description = "Recogiste el pedido y vas hacia el cliente",
                icon = Icons.Filled.TwoWheeler,
                color = Info,
                onClick = { viewModel.updateOrderStatus(orderId, "en_camino") }
            )

            StatusButton(
                label = "Entregado",
                description = "El cliente recibió su pedido",
                icon = Icons.Filled.CheckCircle,
                color = Success,
                onClick = { viewModel.updateOrderStatus(orderId, "entregado") }
            )
        }
    }
}

@Composable
private fun StatusButton(
    label: String,
    description: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(36.dp))
            Spacer(Modifier.width(16.dp))
            Column {
                Text(label, style = MaterialTheme.typography.titleMedium, color = color)
                Text(description, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
            }
        }
    }
}
