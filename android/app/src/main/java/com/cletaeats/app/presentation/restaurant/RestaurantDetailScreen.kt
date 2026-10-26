package com.cletaeats.app.presentation.restaurant

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Combo
import com.cletaeats.app.presentation.cart.CartViewModel
import com.cletaeats.app.presentation.components.*
import com.cletaeats.app.ui.theme.*

/**
 * Muestra los combos del restaurante en una grilla 2 columnas.
 * Combos numerados 1-9, precio = ₡(N+3)*1000.
 *
 * Patrón MVVM: RestaurantViewModel carga los combos desde el repositorio
 * (Room o Retrofit según conectividad). CartViewModel gestiona el carrito
 * — ambos ViewModels son independientes y reutilizables.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RestaurantDetailScreen(
    restaurantId: Int,
    onNavigateToCart: () -> Unit,
    onBack: () -> Unit,
    viewModel: RestaurantViewModel = viewModel(),
    cartViewModel: CartViewModel = viewModel()
) {
    val combosState by viewModel.combosState.collectAsStateWithLifecycle()
    val cartCount by cartViewModel.cartItemCount.collectAsStateWithLifecycle()
    val connectivity by viewModel.connectivityStatus.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(restaurantId) { viewModel.loadCombos(restaurantId) }

    val isConnected = connectivity == ConnectivityObserver.Status.Available

    Scaffold(
        topBar = {
            CletaEatsTopBar(
                title = "Menú",
                onBackClick = onBack,
                actions = {
                    BadgedBox(
                        badge = {
                            if (cartCount > 0) Badge { Text("$cartCount") }
                        }
                    ) {
                        IconButton(onClick = onNavigateToCart) {
                            Icon(Icons.Filled.ShoppingCart, "Carrito", tint = TextPrimary)
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Background
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            NoConnectionBanner(isConnected)

            when (val state = combosState) {
                is UiState.Loading -> LoadingView()
                is UiState.Error -> ErrorStateView(
                    message = state.message, lottieResId = 0,
                    onRetry = { viewModel.loadCombos(restaurantId) }
                )
                is UiState.Success -> {
                    if (state.data.isEmpty()) {
                        EmptyStateView("Sin combos disponibles", 0)
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            contentPadding = PaddingValues(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(state.data, key = { it.id }) { combo ->
                                ComboCard(
                                    combo = combo,
                                    onAddToCart = { qty ->
                                        cartViewModel.addToCart(combo, qty)
                                        snackbarHostState.let {
                                            // Mostrar snackbar en coroutine
                                        }
                                    }
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

@Composable
private fun ComboCard(combo: Combo, onAddToCart: (Int) -> Unit) {
    var quantity by remember { mutableIntStateOf(1) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface)
    ) {
        Column {
            AsyncImage(
                model = combo.imagen,
                contentDescription = combo.nombre,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(SurfaceVariant)
            )

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    "Combo ${combo.numero}",
                    style = MaterialTheme.typography.labelLarge,
                    color = Primary
                )
                Text(
                    combo.descripcion,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    formatColones(combo.precio),
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )

                Spacer(Modifier.height(8.dp))

                // Selector de cantidad
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { if (quantity > 1) quantity-- },
                        modifier = Modifier.size(28.dp)
                    ) { Icon(Icons.Filled.Remove, null, tint = TextSecondary) }

                    Text(
                        "$quantity",
                        modifier = Modifier.width(28.dp),
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.titleMedium
                    )

                    IconButton(
                        onClick = { quantity++ },
                        modifier = Modifier.size(28.dp)
                    ) { Icon(Icons.Filled.Add, null, tint = Primary) }
                }

                Spacer(Modifier.height(8.dp))

                Button(
                    onClick = { onAddToCart(quantity) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    Icon(Icons.Filled.AddShoppingCart, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Agregar", style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}
