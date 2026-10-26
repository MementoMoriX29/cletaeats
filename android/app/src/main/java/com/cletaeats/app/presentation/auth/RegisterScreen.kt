package com.cletaeats.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.ui.theme.*

private fun String.sinTildes(): String {
    val nfd = java.text.Normalizer.normalize(this, java.text.Normalizer.Form.NFD)
    return nfd.replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
}

/**
 * Pantalla de registro — cliente y repartidor comparten los mismos 7 campos:
 * national_id, name, email, password, address, phone, card_number.
 * El parámetro [role] solo determina qué endpoint se llama.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    role: String,
    onRegisterSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val registerState by viewModel.registerState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    var cedula by remember { mutableStateOf("") }
    var nombre by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var direccion by remember { mutableStateOf("") }
    var telefono by remember { mutableStateOf("") }
    var tarjeta by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    var cedulaError by remember { mutableStateOf<String?>(null) }
    var nombreError by remember { mutableStateOf<String?>(null) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var confirmPasswordError by remember { mutableStateOf<String?>(null) }
    var tarjetaError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(registerState) {
        when (val state = registerState) {
            is UiState.Success -> {
                snackbarHostState.showSnackbar("Registro exitoso. Inicia sesión.")
                viewModel.resetState()
                onRegisterSuccess()
            }
            is UiState.Error -> snackbarHostState.showSnackbar(state.message)
            else -> {}
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(if (role == "repartidor") "Registro Repartidor" else "Registro Cliente") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Regresar")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Background)
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            RegisterField(
                label = "Cédula",
                value = cedula,
                icon = Icons.Filled.Badge,
                error = cedulaError,
                onValueChange = { cedula = it; cedulaError = null },
                keyboardType = KeyboardType.Number
            )
            Spacer(Modifier.height(12.dp))

            RegisterField(
                label = "Nombre completo",
                value = nombre,
                icon = Icons.Filled.Person,
                error = nombreError,
                onValueChange = { nombre = it; nombreError = null },
                keyboardType = KeyboardType.Text
            )
            Spacer(Modifier.height(12.dp))

            RegisterField(
                label = "Correo electrónico",
                value = email,
                icon = Icons.Filled.Email,
                error = emailError,
                onValueChange = { email = it; emailError = null },
                keyboardType = KeyboardType.Email
            )
            Spacer(Modifier.height(12.dp))

            RegisterField(
                label = "Dirección",
                value = direccion,
                icon = Icons.Filled.Home,
                error = null,
                onValueChange = { direccion = it },
                keyboardType = KeyboardType.Text
            )
            Spacer(Modifier.height(12.dp))

            RegisterField(
                label = "Teléfono",
                value = telefono,
                icon = Icons.Filled.Phone,
                error = null,
                onValueChange = { telefono = it },
                keyboardType = KeyboardType.Phone
            )
            Spacer(Modifier.height(12.dp))

            RegisterField(
                label = "Número de tarjeta",
                value = tarjeta,
                icon = Icons.Filled.CreditCard,
                error = tarjetaError,
                onValueChange = { tarjeta = it; tarjetaError = null },
                keyboardType = KeyboardType.Number
            )
            Spacer(Modifier.height(12.dp))

            // Contraseña
            OutlinedTextField(
                value = password,
                onValueChange = { password = it.sinTildes(); passwordError = null },
                label = { Text("Contraseña") },
                leadingIcon = { Icon(Icons.Filled.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                            null
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                isError = passwordError != null,
                supportingText = { passwordError?.let { Text(it, color = Error) } },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth(),
                colors = registerFieldColors()
            )
            Spacer(Modifier.height(12.dp))

            // Confirmar contraseña
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it.sinTildes(); confirmPasswordError = null },
                label = { Text("Confirmar contraseña") },
                leadingIcon = { Icon(Icons.Filled.Lock, null) },
                visualTransformation = PasswordVisualTransformation(),
                isError = confirmPasswordError != null,
                supportingText = { confirmPasswordError?.let { Text(it, color = Error) } },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                modifier = Modifier.fillMaxWidth(),
                colors = registerFieldColors()
            )

            Spacer(Modifier.height(32.dp))

            val isLoading = registerState is UiState.Loading
            Button(
                onClick = {
                    val formValid = validateForm(
                        cedula, nombre, email, password, confirmPassword, tarjeta,
                        { cedulaError = it }, { nombreError = it }, { emailError = it },
                        { passwordError = it }, { confirmPasswordError = it }, { tarjetaError = it }
                    )
                    if (formValid) {
                        if (role == "repartidor") {
                            viewModel.registerRepartidor(nombre, email, password, telefono, direccion, cedula, tarjeta)
                        } else {
                            viewModel.registerCliente(nombre, email, password, telefono, direccion, cedula, tarjeta)
                        }
                    } else {
                        scope.launch { snackbarHostState.showSnackbar("Revisá los campos marcados en rojo") }
                    }
                },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = TextPrimary, strokeWidth = 2.dp)
                } else {
                    Text("Crear Cuenta", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

@Composable
private fun RegisterField(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    error: String?,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType
) {
    OutlinedTextField(
        value = value,
        onValueChange = { onValueChange(it.sinTildes()) },
        label = { Text(label) },
        leadingIcon = { Icon(icon, null) },
        isError = error != null,
        supportingText = { error?.let { Text(it, color = Error) } },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Next),
        modifier = Modifier.fillMaxWidth(),
        colors = registerFieldColors()
    )
}

@Composable
private fun registerFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Primary, focusedLabelColor = Primary,
    cursorColor = Primary, unfocusedBorderColor = Divider, unfocusedLabelColor = TextSecondary
)

private fun validateForm(
    cedula: String, nombre: String, email: String,
    password: String, confirmPassword: String, tarjeta: String,
    onCedulaError: (String) -> Unit, onNombreError: (String) -> Unit,
    onEmailError: (String) -> Unit, onPasswordError: (String) -> Unit,
    onConfirmError: (String) -> Unit, onTarjetaError: (String) -> Unit
): Boolean {
    var valid = true
    if (cedula.length < 8) { onCedulaError("Mínimo 8 caracteres"); valid = false }
    if (nombre.length < 2) { onNombreError("Mínimo 2 caracteres"); valid = false }
    if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) { onEmailError("Correo inválido"); valid = false }
    if (password.length < 8) { onPasswordError("Mínimo 8 caracteres"); valid = false }
    if (password != confirmPassword) { onConfirmError("Las contraseñas no coinciden"); valid = false }
    if (!tarjeta.matches(Regex("\\d{13,19}"))) { onTarjetaError("Solo dígitos, 13–19 caracteres"); valid = false }
    return valid
}
