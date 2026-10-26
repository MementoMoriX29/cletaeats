package com.cletaeats.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.cletaeats.app.core.navigation.CletaEatsNavGraph
import com.cletaeats.app.ui.theme.CletaEatsTheme

/**
 * Punto de entrada único de la app (Single Activity Architecture).
 * Toda la UI se gestiona mediante Navigation Compose dentro del NavHost.
 * Esto es consistente con la filosofía de Jetpack Compose: una sola Activity,
 * múltiples Composables en lugar de múltiples Activities/Fragments.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CletaEatsTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    // NavGraph maneja toda la navegación y el ciclo de sesión
                    CletaEatsNavGraph()
                }
            }
        }
    }
}
