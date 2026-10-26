package com.cletaeats.app.presentation.cart

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
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.CartItem
import com.cletaeats.app.presentation.components.*
import com.cletaeats.app.ui.theme.*

/**
 * Pantalla del carrito con SwipeToDismiss para eliminar ítems.
 *
 * SwipeToDismissBox:
 *   ← (EndToStart) rojo = eliminar ítem
 *   → (StartToEnd) naranja = editar cantidad (no implementado en esta demo)
 *
 * Resumen de precios:
 *   Subtotal = Σ(precio × cantidad)
 *   IVA 13%  = subtotal × 0.13
 *   Transporte = ₡1.500 fijo
 *   Total    = subtotal + IVA + transporte
 */
@Composable
fun CartScreen(
    onOrderPlaced: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: CartViewModel = viewModel()
) {
    val cartItems by viewModel.cartItems.collectAsStateWithLifecycle()
    val subtotal by viewModel.subtotal.collectAsStateWithLifecycle()
    val iva by viewModel.iva.collectAsStateWithLifecycle()
    val total by viewModel.total.collectAsStateWithLifecycle()
    val orderState by viewModel.orderState.collectAsStateWithLifecycle()

    val context = LocalContext.current
    val app = context.applicationContext as CletaEatsApp
    val clienteId by app.sessionManager.userIdFlow.collectAsStateWithLifecycle(initialValue = null)
    val snackbarHostState = remember { SnackbarHostState() }

    var direccion by remember { mutableStateOf("") }
    var showAddressDialog by remember { mutableStateOf(false) }

    LaunchedEffect(orderState) {
        when (val state = orderState) {
            is UiState.Success -> {
                viewModel.resetOrderState()
                onOrderPlaced(state.data.id)
            }
            is UiState.Error -> snackbarHostState.showSnackbar(state.message)
            else -> {}
        }
    }

    Scaffold(
        topBar = {
            CletaEatsTopBar(
                title = "Mi Carrito (${cartItems.size})",
                onBackClick = onBack,
                actions = {
                    if (cartItems.isNotEmpty()) {
                        IconButton(onClick = { viewModel.clearCart() }) {
                            Icon(Icons.Filled.DeleteSweep, "Vaciar carrito", tint = Error)
                        }
                    }
                }
            )
        },
        bottomBar = {
            if (cartItems.isNotEmpty()) {
                CartSummary(
                    subtotal = subtotal,
                    iva = iva,
                    transporte = viewModel.transporte,
                    total = total,
                    isLoading = orderState is UiState.Loading,
                    onConfirm = { showAddressDialog = true }
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Background
    ) { padding ->
        if (cartItems.isEmpty()) {
            EmptyStateView(
                message = "Tu carrito está vacío.\n¡Agrega combos desde el menú!",
                lottieResId = 0,  // R.raw.lottie_empty
                modifier = Modifier.padding(padding)
            )
        } else {
            // LazyColumn es el equivalente declarativo de RecyclerView en Jetpack Compose
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(padding)
            ) {
                items(cartItems, key = { it.id }) { item ->
                    CartItemRow(
                        item = item,
                        onDelete = { viewModel.removeFromCart(item) }
                    )
                }
            }
        }
    }

    // Diálogo para ingresar dirección de entrega
    if (showAddressDialog) {
        AlertDialog(
            onDismissRequest = { showAddressDialog = false },
            title = { Text("¿Dónde te entregamos?") },
            text = {
                OutlinedTextField(
                    value = direccion,
                    onValueChange = { direccion = it },
                    label = { Text("Dirección de entrega") },
                    placeholder = { Text("Ej: Heredia centro, frente al parque") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (direccion.isNotBlank()) {
                            showAddressDialog = false
                            val restauranteId = cartItems.firstOrNull()?.restauranteId ?: 0
                            viewModel.placeOrder(clienteId ?: 0, restauranteId, direccion)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) { Text("Confirmar Pedido") }
            },
            dismissButton = {
                TextButton(onClick = { showAddressDialog = false }) { Text("Cancelar") }
            },
            containerColor = Surface
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CartItemRow(item: CartItem, onDelete: () -> Unit) {
    val swipeState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) { onDelete(); true }
            else false
        }
    )

    SwipeToDismissBox(
        state = swipeState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            // Fondo rojo al deslizar ← (eliminar)
            val color by animateColorAsState(
                targetValue = if (swipeState.dismissDirection == SwipeToDismissBoxValue.EndToStart)
                    Error else Color.Transparent, label = ""
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(color, shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
                    .padding(end = 16.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(Icons.Filled.Delete, "Eliminar", tint = TextPrimary)
            }
        }
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Surface)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.comboNombre, style = MaterialTheme.typography.titleMedium)
                    Text("Cantidad: ${item.cantidad}", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                }
                Text(formatColones(item.subtotal), style = MaterialTheme.typography.titleMedium, color = Primary)
            }
        }
    }
}

@Composable
private fun CartSummary(
    subtotal: Double, iva: Double, transporte: Double, total: Double,
    isLoading: Boolean, onConfirm: () -> Unit
) {
    Surface(color = Surface, tonalElevation = 8.dp) {
        Column(modifier = Modifier.padding(16.dp)) {
            SummaryRow("Subtotal", formatColones(subtotal))
            SummaryRow("IVA (13%)", formatColones(iva))
            SummaryRow("Transporte", formatColones(transporte))
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = Divider)
            SummaryRow("Total", formatColones(total), isTotal = true)
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = onConfirm,
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = TextPrimary, strokeWidth = 2.dp)
                else Text("Confirmar Pedido ✓", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, isTotal: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = if (isTotal) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (isTotal) TextPrimary else TextSecondary)
        Text(value, style = if (isTotal) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (isTotal) Primary else TextPrimary)
    }
}
