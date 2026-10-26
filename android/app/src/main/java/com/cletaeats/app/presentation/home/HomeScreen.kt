package com.cletaeats.app.presentation.home

import android.Manifest
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.cletaeats.app.core.utils.ConnectivityObserver
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.domain.model.Restaurant
import com.cletaeats.app.presentation.components.*
import com.cletaeats.app.ui.theme.*
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices

/**
 * Pantalla principal para clientes — lista de restaurantes.
 *
 * RQ-1 (comparación con React): LazyColumn es el equivalente declarativo de
 * RecyclerView en Jetpack Compose. A diferencia de RecyclerView que requiere
 * Adapter + ViewHolder, LazyColumn describe los ítems con una lambda Kotlin.
 * En React, la equivalencia es un .map() dentro del JSX — ambos son declarativos,
 * pero LazyColumn maneja virtualización automáticamente.
 *
 * Conectividad GPS: usa Fused Location Provider con el permiso solicitado
 * mediante Accompanist Permissions para el flujo Compose-nativo.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    onRestaurantClick: (Int) -> Unit,
    onOpenDrawer: () -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val restaurantsState by viewModel.restaurantsState.collectAsStateWithLifecycle()
    val filteredRestaurants by viewModel.filteredRestaurants.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    val connectivity by viewModel.connectivityStatus.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Solicita permiso de ubicación con Accompanist
    val locationPermission = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)

    LaunchedEffect(locationPermission.status) {
        if (!locationPermission.status.isGranted) {
            locationPermission.launchPermissionRequest()
        }
    }

    // Obtiene ubicación actual cuando el permiso está concedido
    LaunchedEffect(locationPermission.status.isGranted) {
        if (locationPermission.status.isGranted) {
            val fusedLocation = LocationServices.getFusedLocationProviderClient(context)
            fusedLocation.lastLocation.addOnSuccessListener { location ->
                location?.let { viewModel.updateUserLocation(it.latitude, it.longitude) }
            }
        }
    }

    val isConnected = connectivity == ConnectivityObserver.Status.Available

    Scaffold(
        topBar = {
            CletaEatsTopBar(
                title = "Restaurantes",
                onMenuClick = onOpenDrawer
            )
        },
        containerColor = Background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Banner offline — visible solo cuando no hay conexión
            NoConnectionBanner(isConnected)

            // Barra de búsqueda
            OutlinedTextField(
                value = searchQuery,
                onValueChange = viewModel::setSearchQuery,
                placeholder = { Text("Buscar restaurantes...", color = TextSecondary) },
                leadingIcon = { Icon(Icons.Filled.Search, null, tint = TextSecondary) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Primary, unfocusedBorderColor = Divider,
                    cursorColor = Primary
                ),
                singleLine = true
            )

            // Filtros por tipo de comida
            val foodTypes = remember(restaurantsState) {
                if (restaurantsState is UiState.Success) {
                    (restaurantsState as UiState.Success).data.map { it.tipoComida }.distinct()
                } else emptyList()
            }
            val selectedFilter by viewModel.filterType.collectAsStateWithLifecycle()

            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedFilter == null,
                        onClick = { viewModel.setFilterType(null) },
                        label = { Text("Todos") }
                    )
                }
                items(foodTypes) { type ->
                    FilterChip(
                        selected = selectedFilter == type,
                        onClick = { viewModel.setFilterType(type) },
                        label = { Text(type) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Primary.copy(alpha = 0.2f),
                            selectedLabelColor = Primary
                        )
                    )
                }
            }

            // Contenido principal según estado
            when (restaurantsState) {
                is UiState.Loading -> LoadingView()
                is UiState.Error -> ErrorStateView(
                    message = (restaurantsState as UiState.Error).message,
                    lottieResId = 0, // Reemplazar con R.raw.lottie_error
                    onRetry = viewModel::loadRestaurants
                )
                else -> {
                    if (filteredRestaurants.isEmpty()) {
                        EmptyStateView(
                            message = "No hay restaurantes disponibles",
                            lottieResId = 0 // Reemplazar con R.raw.lottie_empty
                        )
                    } else {
                        // LazyColumn es el equivalente declarativo de RecyclerView en Jetpack Compose
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(filteredRestaurants, key = { it.id }) { restaurant ->
                                RestaurantCard(
                                    restaurant = restaurant,
                                    onClick = { onRestaurantClick(restaurant.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RestaurantCard(restaurant: Restaurant, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface)
    ) {
        Column {
            // Imagen del restaurante
            AsyncImage(
                model = restaurant.imagen,
                contentDescription = restaurant.nombre,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .background(SurfaceVariant)
            )

            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        restaurant.nombre,
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    if (restaurant.distanciaKm > 0) {
                        Text(
                            "%.1f km".format(restaurant.distanciaKm),
                            style = MaterialTheme.typography.labelSmall,
                            color = Primary
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))
                Text(restaurant.tipoComida, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)

                restaurant.horario?.let {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Schedule, null, modifier = Modifier.size(14.dp), tint = TextSecondary)
                        Spacer(Modifier.width(4.dp))
                        Text(it, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                    }
                }
            }
        }
    }
}
