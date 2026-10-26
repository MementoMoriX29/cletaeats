package com.cletaeats.app.presentation.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.airbnb.lottie.compose.*
import com.cletaeats.app.ui.theme.*

// ── Lottie helper ─────────────────────────────────────────────────────────────

/**
 * Wrapper de Lottie para pantallas vacías, carga, error y sin conexión.
 * Coloca archivos .json en app/src/main/res/raw/:
 *   lottie_loading.json, lottie_empty.json, lottie_error.json,
 *   lottie_no_connection.json, lottie_splash.json
 *
 * LazyColumn es el equivalente declarativo de RecyclerView en Jetpack Compose:
 * en lugar de Adapter + ViewHolder, se usa una lambda que describe cada ítem.
 */
@Composable
fun LottieAnimationView(
    resId: Int,
    modifier: Modifier = Modifier,
    iterations: Int = LottieConstants.IterateForever
) {
    val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(resId))
    val progress by animateLottieCompositionAsState(
        composition = composition,
        iterations = iterations
    )
    LottieAnimation(
        composition = composition,
        progress = { progress },
        modifier = modifier
    )
}

// ── Banner de sin conexión ────────────────────────────────────────────────────

@Composable
fun NoConnectionBanner(isConnected: Boolean) {
    AnimatedVisibility(
        visible = !isConnected,
        enter = slideInVertically() + fadeIn(),
        exit = slideOutVertically() + fadeOut()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Warning)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Filled.WifiOff,
                contentDescription = null,
                tint = Color.Black,
                modifier = Modifier.size(16.dp)
            )
            Spacer(Modifier.width(8.dp))
            Text(
                "Sin conexión — mostrando último dato conocido",
                style = MaterialTheme.typography.labelLarge,
                color = Color.Black
            )
        }
    }
}

// ── Chips semánticos de estado de pedido ──────────────────────────────────────

@Composable
fun OrderStatusChip(status: String, modifier: Modifier = Modifier) {
    val (color, label) = when (status) {
        "en_preparacion" -> Pair(Warning, "En preparación")
        "en_camino"      -> Pair(Info, "En camino")
        "entregado"      -> Pair(Success, "Entregado")
        "cancelado"      -> Pair(Error, "Cancelado")
        "PENDING_SYNC"   -> Pair(TextSecondary, "Pendiente sync")
        else             -> Pair(TextSecondary, status)
    }

    FilterChip(
        selected = true,
        onClick = {},
        label = { Text(label, style = MaterialTheme.typography.labelLarge) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = color.copy(alpha = 0.2f),
            selectedLabelColor = color
        ),
        border = FilterChipDefaults.filterChipBorder(
            enabled = true,
            selected = true,
            selectedBorderColor = color.copy(alpha = 0.5f)
        ),
        modifier = modifier
    )
}

// ── Estados de pantalla vacía ─────────────────────────────────────────────────

@Composable
fun EmptyStateView(
    message: String,
    lottieResId: Int,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        LottieAnimationView(
            resId = lottieResId,
            modifier = Modifier.size(200.dp)
        )
        Spacer(Modifier.height(16.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyLarge,
            color = TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp)
        )
    }
}

@Composable
fun ErrorStateView(
    message: String,
    lottieResId: Int,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        LottieAnimationView(
            resId = lottieResId,
            modifier = Modifier.size(200.dp)
        )
        Spacer(Modifier.height(16.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyLarge,
            color = TextSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp)
        )
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) {
            Icon(Icons.Filled.Refresh, null)
            Spacer(Modifier.width(8.dp))
            Text("Reintentar")
        }
    }
}

@Composable
fun LoadingView(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Primary)
    }
}

// ── TopAppBar reutilizable ────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CletaEatsTopBar(
    title: String,
    onMenuClick: (() -> Unit)? = null,
    onBackClick: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    TopAppBar(
        title = { Text(title) },
        navigationIcon = {
            when {
                onMenuClick != null -> IconButton(onClick = onMenuClick) {
                    Icon(Icons.Filled.Menu, "Abrir menú")
                }
                onBackClick != null -> IconButton(onClick = onBackClick) {
                    Icon(Icons.Filled.ArrowBack, "Regresar")
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Surface,
            titleContentColor = TextPrimary,
            navigationIconContentColor = TextPrimary,
            actionIconContentColor = TextPrimary
        )
    )
}

// ── Tarjeta base para ítems ───────────────────────────────────────────────────

@Composable
fun ItemCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), content = content)
    }
}

// ── Precio formateado en Colones ──────────────────────────────────────────────

fun formatColones(amount: Double): String {
    return "₡${String.format("%,.0f", amount)}"
}

fun formatColones(amount: Int): String = formatColones(amount.toDouble())
