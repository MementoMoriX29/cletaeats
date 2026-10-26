package com.cletaeats.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// Esquema de color oscuro Material3 — alineado con paleta CletaEats
private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = OnPrimary,
    secondary = Primary,
    onSecondary = OnPrimary,
    background = Background,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = TextSecondary,
    error = Error,
    onError = TextPrimary,
)

/**
 * Tema global de CletaEats.
 * Forced dark mode — la app no soporta tema claro intencionalmente
 * para mantener la estética de apps de delivery modernas (Uber Eats, Didi Food).
 */
@Composable
fun CletaEatsTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = CletaEatsTypography,
        content = content
    )
}
