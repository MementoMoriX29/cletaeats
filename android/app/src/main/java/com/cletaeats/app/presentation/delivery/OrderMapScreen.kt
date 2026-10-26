package com.cletaeats.app.presentation.delivery

import android.Manifest
import androidx.compose.foundation.layout.*
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
import com.cletaeats.app.presentation.components.CletaEatsTopBar
import com.cletaeats.app.ui.theme.Background
import com.cletaeats.app.ui.theme.Primary
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*

/**
 * Mapa de ruta para el repartidor.
 * Fused Location Provider provee la ubicación actual del repartidor.
 * Google Maps Compose renderiza el mapa con marcadores de origen y destino.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun OrderMapScreen(
    orderId: Int,
    onNavigateToUpdateStatus: () -> Unit,
    onBack: () -> Unit,
    viewModel: DeliveryViewModel = viewModel()
) {
    val currentOrder by viewModel.currentOrder.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Ubicación del repartidor via Fused Location Provider
    var repartidorLocation by remember { mutableStateOf<LatLng?>(null) }
    val locationPermission = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)

    LaunchedEffect(locationPermission.status) {
        if (!locationPermission.status.isGranted) {
            locationPermission.launchPermissionRequest()
        }
    }

    LaunchedEffect(locationPermission.status.isGranted) {
        if (locationPermission.status.isGranted) {
            LocationServices.getFusedLocationProviderClient(context)
                .lastLocation.addOnSuccessListener { location ->
                    location?.let { repartidorLocation = LatLng(it.latitude, it.longitude) }
                }
        }
    }

    // Centro de Heredia como posición por defecto
    val heredia = LatLng(9.9981, -84.1197)
    val cameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(repartidorLocation ?: heredia, 14f)
    }

    Scaffold(
        topBar = { CletaEatsTopBar(title = "Ruta de Entrega", onBackClick = onBack) },
        containerColor = Background
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Mapa ocupa la mayor parte de la pantalla
            GoogleMap(
                modifier = Modifier.fillMaxWidth().weight(1f),
                cameraPositionState = cameraState
            ) {
                // Marcador de la ubicación del repartidor
                repartidorLocation?.let { loc ->
                    Marker(state = MarkerState(position = loc), title = "Mi ubicación")
                }
                // Marcador del destino de entrega (placeholder — backend debería proveer coords)
                Marker(
                    state = MarkerState(position = heredia),
                    title = currentOrder?.direccionEntrega ?: "Destino de entrega"
                )
            }

            // Panel inferior con info del pedido y botón de actualizar estado
            Surface(color = com.cletaeats.app.ui.theme.Surface, tonalElevation = 8.dp) {
                Column(modifier = Modifier.padding(16.dp)) {
                    currentOrder?.let { order ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocationOn, null, tint = Primary)
                            Spacer(Modifier.width(8.dp))
                            Text(order.direccionEntrega, style = MaterialTheme.typography.bodyMedium)
                        }
                        Spacer(Modifier.height(12.dp))
                    }
                    Button(
                        onClick = onNavigateToUpdateStatus,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        Icon(Icons.Filled.Update, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Actualizar Estado del Pedido")
                    }
                }
            }
        }
    }
}
