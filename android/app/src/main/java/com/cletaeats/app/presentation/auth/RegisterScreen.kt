package com.cletaeats.app.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.repository.AuthRepository
import com.cletaeats.app.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Registro.
 * - [role] "cliente": cuenta para pedir (nombre, correo, teléfono y contraseña). Queda con la sesión iniciada.
 * - [role] "repartidor": solicitud para repartir; suma cédula y vehículo. Soporte la revisa antes de habilitarla.
 * Las direcciones de entrega y el pago se piden al hacer el pedido, no al crear la cuenta.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    role: String,
    onRegisterSuccess: (role: String) -> Unit,
    onBack: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val registerState by viewModel.registerState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val isCourier = role == AuthRepository.ROLE_REPARTIDOR

    var nombre by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var telefono by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var cedula by remember { mutableStateOf("") }
    var vehiculo by remember { mutableStateOf("bicicleta") }
    var passwordVisible by remember { mutableStateOf(false) }

    var nombreError by remember { mutableStateOf<String?>(null) }
    var emailError by remember { mutableStateOf<String?>(null) }
    var telefonoError by remember { mutableStateOf<String?>(null) }
    var passwordError by remember { mutableStateOf<String?>(null) }
    var cedulaError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(registerState) {
        when (val state = registerState) {
            is UiState.Success -> {
                viewModel.resetState()
                if (state.data.estado != "active") {
                    // Solicitud de repartidor: se avisa y se vuelve al inicio de sesión
                    snackbarHostState.showSnackbar(AuthRepository.applicationMessage(state.data.estado))
                }
                onRegisterSuccess(state.data.role)
            }
            is UiState.Error -> snackbarHostState.showSnackbar(state.message)
            else -> {}
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(if (isCourier) "Repartí con CletaEats" else "Creá tu cuenta") },
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
            Text(
                if (isCourier) "Llevá pedidos de restaurantes de tu zona. Soporte revisa tu solicitud y te habilita la cuenta."
                else "Para pedir y seguir tus pedidos en tiempo real.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(20.dp))

            RegisterField(
                label = "Nombre completo",
                value = nombre,
                icon = Icons.Filled.Person,
                error = nombreError,
                onValueChange = { nombre = it; nombreError = null },
                keyboardType = KeyboardType.Text
            )
            Spacer(Modifier.height(12.dp))

            if (isCourier) {
                RegisterField(
                    label = "Cédula",
                    value = cedula,
                    icon = Icons.Filled.Badge,
                    error = cedulaError,
                    supporting = "9 dígitos, o 11–12 si es DIMEX",
                    onValueChange = { cedula = it; cedulaError = null },
                    keyboardType = KeyboardType.Number
                )
                Spacer(Modifier.height(12.dp))

                Text("Vehículo", style = MaterialTheme.typography.titleSmall, color = TextPrimary, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    VehicleChip("Bicicleta", vehiculo == "bicicleta") { vehiculo = "bicicleta" }
                    VehicleChip("Scooter", vehiculo == "scooter") { vehiculo = "scooter" }
                }
                Spacer(Modifier.height(12.dp))
            }

            RegisterField(
                label = "Correo",
                value = email,
                icon = Icons.Filled.Email,
                error = emailError,
                onValueChange = { email = it; emailError = null },
                keyboardType = KeyboardType.Email
            )
            Spacer(Modifier.height(12.dp))

            RegisterField(
                label = "Teléfono",
                value = telefono,
                icon = Icons.Filled.Phone,
                error = telefonoError,
                supporting = if (isCourier) null else "El repartidor te llama a este número si hace falta",
                onValueChange = { telefono = it; telefonoError = null },
                keyboardType = KeyboardType.Phone
            )
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it; passwordError = null },
                label = { Text("Contraseña") },
                leadingIcon = { Icon(Icons.Filled.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                            contentDescription = if (passwordVisible) "Ocultar contraseña" else "Mostrar contraseña"
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                isError = passwordError != null,
                supportingText = { Text(passwordError ?: "Al menos 8 caracteres", color = if (passwordError != null) Error else TextSecondary) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                modifier = Modifier.fillMaxWidth(),
                colors = registerFieldColors()
            )

            Spacer(Modifier.height(28.dp))

            val isLoading = registerState is UiState.Loading
            Button(
                onClick = {
                    val valid = validateForm(
                        isCourier, nombre, email, telefono, password, cedula,
                        { nombreError = it }, { emailError = it }, { telefonoError = it },
                        { passwordError = it }, { cedulaError = it }
                    )
                    if (!valid) {
                        scope.launch { snackbarHostState.showSnackbar("Revisá los campos marcados en rojo") }
                    } else if (isCourier) {
                        viewModel.registerRepartidor(nombre.trim(), email.trim(), telefono.trim(), password, cedula.trim(), vehiculo)
                    } else {
                        viewModel.registerCliente(nombre.trim(), email.trim(), telefono.trim(), password)
                    }
                },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = TextPrimary, strokeWidth = 2.dp)
                } else {
                    Text(if (isCourier) "Enviar solicitud" else "Crear cuenta", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

@Composable
private fun VehicleChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = Primary.copy(alpha = 0.2f),
            selectedLabelColor = Primary
        )
    )
}

@Composable
private fun RegisterField(
    label: String,
    value: String,
    icon: ImageVector,
    error: String?,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType,
    supporting: String? = null
) {
    val supportText = error ?: supporting
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = { Icon(icon, null) },
        isError = error != null,
        supportingText = if (supportText != null) {
            { Text(supportText, color = if (error != null) Error else TextSecondary) }
        } else {
            null
        },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Next),
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        colors = registerFieldColors()
    )
}

@Composable
private fun registerFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Primary, focusedLabelColor = Primary,
    cursorColor = Primary, unfocusedBorderColor = Divider, unfocusedLabelColor = TextSecondary
)

// Mismas reglas que valida el servidor (el servidor igual revisa todo)
private fun validateForm(
    isCourier: Boolean, nombre: String, email: String, telefono: String, password: String, cedula: String,
    onNombreError: (String) -> Unit, onEmailError: (String) -> Unit, onTelefonoError: (String) -> Unit,
    onPasswordError: (String) -> Unit, onCedulaError: (String) -> Unit
): Boolean {
    var valid = true
    if (nombre.trim().length < 3) { onNombreError("Ingresá tu nombre completo"); valid = false }
    if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()) { onEmailError("Ingresá un correo válido"); valid = false }
    val digits = telefono.replace(Regex("[\\s-]"), "").removePrefix("+506")
    if (!digits.matches(Regex("[245678]\\d{7}"))) { onTelefonoError("Ingresá un teléfono de 8 dígitos"); valid = false }
    if (password.length < 8) { onPasswordError("La contraseña debe tener al menos 8 caracteres"); valid = false }
    if (isCourier && !cedula.replace(Regex("[\\s-]"), "").matches(Regex("\\d{9,12}"))) {
        onCedulaError("La cédula debe tener 9 dígitos (o 11–12 si es DIMEX)"); valid = false
    }
    return valid
}
