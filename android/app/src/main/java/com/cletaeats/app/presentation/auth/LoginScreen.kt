package com.cletaeats.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.ui.theme.*

/**
 * Pantalla de inicio de sesión.
 *
 * Patrón MVVM (RQ-1): la pantalla NO contiene lógica de negocio.
 * Solo observa loginState (StateFlow) y delega acciones al ViewModel.
 * Esto contrasta con React donde el estado y la lógica suelen coexistir
 * en el mismo componente (useState + fetch directo).
 *
 * Un solo login para todos: no se elige "soy cliente / soy repartidor". El rol sale de la cuenta
 * y la navegación lleva a cada quien a su inicio.
 *
 * Validaciones client-side antes de hacer el request:
 * - Email con formato válido
 * - Contraseña no vacía
 * - Botón deshabilitado durante carga
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: (role: String) -> Unit,
    // "cliente" para crear una cuenta, "repartidor" para enviar una solicitud
    onNavigateToRegister: (role: String) -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val loginState by viewModel.loginState.collectAsStateWithLifecycle()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    // Errores de validación locales
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    // Observa el estado de login — reacciona a Success o Error
    LaunchedEffect(loginState) {
        when (val state = loginState) {
            is UiState.Success -> {
                viewModel.resetState()
                onLoginSuccess(state.data.role)
            }
            is UiState.Error -> {
                snackbarHostState.showSnackbar(state.message)
            }
            else -> {}
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo / Header
            Text("CletaEats", style = MaterialTheme.typography.headlineLarge, color = Primary)
            Text("Comida de Heredia, en bici", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)

            Spacer(Modifier.height(48.dp))

            Text("Iniciá sesión", style = MaterialTheme.typography.titleLarge, color = TextPrimary)

            Spacer(Modifier.height(24.dp))

            // Campo email
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; emailError = null },
                label = { Text("Correo") },
                leadingIcon = { Icon(Icons.Filled.Email, null) },
                isError = emailError != null,
                supportingText = { emailError?.let { Text(it, color = Error) } },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                modifier = Modifier.fillMaxWidth(),
                colors = outlinedTextFieldColors()
            )

            Spacer(Modifier.height(12.dp))

            // Campo password
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; passwordError = null },
                label = { Text("Contraseña") },
                leadingIcon = { Icon(Icons.Filled.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                            contentDescription = if (passwordVisible) "Ocultar" else "Mostrar"
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                isError = passwordError != null,
                supportingText = { passwordError?.let { Text(it, color = Error) } },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                ),
                modifier = Modifier.fillMaxWidth(),
                colors = outlinedTextFieldColors()
            )

            Spacer(Modifier.height(32.dp))

            // Botón de login — deshabilitado durante carga
            val isLoading = loginState is UiState.Loading
            Button(
                onClick = {
                    if (validateLoginForm(email, password,
                            onEmailError = { emailError = it },
                            onPasswordError = { passwordError = it })) {
                        viewModel.login(email.trim(), password)
                    }
                },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = TextPrimary,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Ingresar", style = MaterialTheme.typography.titleMedium)
                }
            }

            Spacer(Modifier.height(16.dp))

            // Registro de clientes y solicitud para repartir
            TextButton(onClick = { onNavigateToRegister("cliente") }) {
                Text("¿No tenés cuenta? Creá una", color = Primary, textAlign = TextAlign.Center)
            }
            TextButton(onClick = { onNavigateToRegister("repartidor") }) {
                Text("¿Querés repartir? Enviá tu solicitud", color = TextSecondary, textAlign = TextAlign.Center)
            }
        }
    }
}

private fun validateLoginForm(
    email: String, password: String,
    onEmailError: (String) -> Unit,
    onPasswordError: (String) -> Unit
): Boolean {
    var valid = true
    if (email.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
        onEmailError("Ingresá un correo válido")
        valid = false
    }
    if (password.isBlank()) {
        onPasswordError("Ingresá tu contraseña")
        valid = false
    }
    return valid
}

@Composable
private fun outlinedTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Primary,
    focusedLabelColor = Primary,
    cursorColor = Primary,
    unfocusedBorderColor = Divider,
    unfocusedLabelColor = TextSecondary
)
