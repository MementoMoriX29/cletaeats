package com.cletaeats.app.presentation.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cletaeats.app.CletaEatsApp
import com.cletaeats.app.ui.theme.Background
import com.cletaeats.app.ui.theme.Primary
import com.cletaeats.app.ui.theme.TextPrimary
import kotlinx.coroutines.delay

/**
 * Pantalla de splash con animación Lottie.
 * Verifica el estado de sesión en DataStore y navega según el rol:
 *   token válido + role=cliente      → Home
 *   token válido + role=repartidor   → DeliveryDashboard
 *   sin token                        → Login
 *
 * Nota: Se usa un placeholder visual (Box naranja con texto) en lugar de
 * LottieAnimationView porque los archivos .json de Lottie deben descargarse
 * manualmente y colocarse en app/src/main/res/raw/.
 * Descargar animaciones gratuitas de: https://lottiefiles.com
 */
@Composable
fun SplashScreen(
    onNavigateToHome: () -> Unit,
    onNavigateToDelivery: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    val context = LocalContext.current
    val app = context.applicationContext as CletaEatsApp

    val token by app.sessionManager.tokenFlow.collectAsStateWithLifecycle(initialValue = "CHECKING")
    val userRole by app.sessionManager.userRoleFlow.collectAsStateWithLifecycle(initialValue = null)

    LaunchedEffect(token) {
        if (token == "CHECKING") return@LaunchedEffect

        // Mínimo 1.5s para que se aprecie la animación
        delay(1500L)

        when {
            token.isNullOrEmpty() -> onNavigateToLogin()
            userRole == "repartidor" -> onNavigateToDelivery()
            else -> onNavigateToHome()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            // Placeholder — reemplazar con LottieAnimationView(R.raw.lottie_splash)
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .background(Primary, shape = androidx.compose.foundation.shape.CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "🛵",
                    style = MaterialTheme.typography.displayLarge
                )
            }

            Spacer(Modifier.height(24.dp))

            Text(
                "CletaEats",
                style = MaterialTheme.typography.headlineLarge,
                color = Primary
            )
            Text(
                "Delivery Heredia",
                style = MaterialTheme.typography.bodyMedium,
                color = com.cletaeats.app.ui.theme.TextSecondary
            )
        }
    }
}
