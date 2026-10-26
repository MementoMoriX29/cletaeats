package com.cletaeats.app.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cletaeats.app.core.utils.UiState
import com.cletaeats.app.data.remote.dto.ClientProfileResponse
import com.cletaeats.app.presentation.components.CletaEatsTopBar
import com.cletaeats.app.presentation.components.LoadingView
import com.cletaeats.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    onOpenDrawer: () -> Unit,
    viewModel: ProfileViewModel = viewModel()
) {
    val profileState by viewModel.profileState.collectAsStateWithLifecycle()
    val updateState by viewModel.updateState.collectAsStateWithLifecycle()
    val userRole by viewModel.userRole.collectAsStateWithLifecycle()

    var editMode by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(updateState) {
        when (val s = updateState) {
            is UiState.Success -> {
                snackbarHostState.showSnackbar(s.data)
                editMode = false
                viewModel.resetUpdateState()
            }
            is UiState.Error -> {
                snackbarHostState.showSnackbar(s.message)
                viewModel.resetUpdateState()
            }
            else -> {}
        }
    }

    Scaffold(
        topBar = { CletaEatsTopBar(title = "Mi Perfil", onMenuClick = onOpenDrawer) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Background
    ) { padding ->
        when (val state = profileState) {
            is UiState.Loading -> LoadingView(Modifier.padding(padding))
            is UiState.Error   -> ErrorProfile(state.message, Modifier.padding(padding)) { viewModel.loadProfile() }
            is UiState.Success -> {
                if (editMode) {
                    EditProfileContent(
                        profile = state.data,
                        isLoading = updateState is UiState.Loading,
                        modifier = Modifier.padding(padding),
                        onSave = { name, phone, address, card ->
                            viewModel.updateProfile(name, phone, address, card.ifBlank { null }, state.data.email)
                        },
                        onCancel = { editMode = false }
                    )
                } else {
                    ViewProfileContent(
                        profile = state.data,
                        role = userRole ?: "cliente",
                        modifier = Modifier.padding(padding),
                        onEdit = { editMode = true }
                    )
                }
            }
            else -> {}
        }
    }
}

// ── Vista de solo lectura ─────────────────────────────────────────────────────

@Composable
private fun ViewProfileContent(
    profile: ClientProfileResponse,
    role: String,
    modifier: Modifier,
    onEdit: () -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(16.dp))

        Box(
            modifier = Modifier
                .size(96.dp)
                .background(Primary.copy(alpha = 0.15f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Filled.Person, null, tint = Primary, modifier = Modifier.size(56.dp))
        }

        Spacer(Modifier.height(12.dp))
        Text(profile.name, style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        Text(
            if (role == "repartidor") "Repartidor" else "Cliente",
            style = MaterialTheme.typography.bodyMedium,
            color = Primary
        )

        Spacer(Modifier.height(28.dp))

        ProfileRow(Icons.Filled.Badge,        "Cédula",          profile.nationalId)
        Divider()
        ProfileRow(Icons.Filled.Email,        "Correo",          profile.email)
        Divider()
        ProfileRow(Icons.Filled.Phone,        "Teléfono",        profile.phone ?: "—")
        Divider()
        ProfileRow(Icons.Filled.Home,         "Dirección",       profile.address ?: "—")
        Divider()
        ProfileRow(Icons.Filled.CreditCard,   "Tarjeta",         maskCard(profile.cardLast4))

        Spacer(Modifier.height(32.dp))

        Button(
            onClick = onEdit,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) {
            Icon(Icons.Filled.Edit, null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Editar perfil", style = MaterialTheme.typography.titleMedium)
        }
    }
}

// ── Formulario de edición ─────────────────────────────────────────────────────

@Composable
private fun EditProfileContent(
    profile: ClientProfileResponse,
    isLoading: Boolean,
    modifier: Modifier,
    onSave: (name: String, phone: String, address: String, card: String) -> Unit,
    onCancel: () -> Unit
) {
    var name    by remember { mutableStateOf(profile.name) }
    var phone   by remember { mutableStateOf(profile.phone ?: "") }
    var address by remember { mutableStateOf(profile.address ?: "") }
    // Vacío = conservar la tarjeta actual; solo se envía si se escribe una nueva
    var card    by remember { mutableStateOf("") }

    var nameError by remember { mutableStateOf<String?>(null) }
    var cardError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(8.dp))

        Text("Editar perfil", style = MaterialTheme.typography.titleLarge, color = Primary)

        Spacer(Modifier.height(24.dp))

        EditField(
            label = "Nombre completo",
            value = name,
            icon = Icons.Filled.Person,
            error = nameError,
            keyboardType = KeyboardType.Text,
            onValueChange = { name = it; nameError = null }
        )
        Spacer(Modifier.height(12.dp))
        EditField(
            label = "Teléfono",
            value = phone,
            icon = Icons.Filled.Phone,
            keyboardType = KeyboardType.Phone,
            onValueChange = { phone = it }
        )
        Spacer(Modifier.height(12.dp))
        EditField(
            label = "Dirección",
            value = address,
            icon = Icons.Filled.Home,
            keyboardType = KeyboardType.Text,
            onValueChange = { address = it }
        )
        Spacer(Modifier.height(12.dp))
        EditField(
            label = "Nueva tarjeta (actual: ${maskCard(profile.cardLast4)})",
            value = card,
            icon = Icons.Filled.CreditCard,
            error = cardError,
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done,
            onValueChange = { card = it; cardError = null }
        )

        Spacer(Modifier.height(32.dp))

        Button(
            onClick = {
                var valid = true
                if (name.length < 2)                      { nameError = "Mínimo 2 caracteres"; valid = false }
                if (card.isNotEmpty() && !card.matches(Regex("\\d{13,19}"))) { cardError = "Solo dígitos, 13–19 caracteres"; valid = false }
                if (valid) onSave(name, phone, address, card)
            },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary)
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), color = TextPrimary, strokeWidth = 2.dp)
            } else {
                Text("Guardar cambios", style = MaterialTheme.typography.titleMedium)
            }
        }

        Spacer(Modifier.height(12.dp))

        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = Primary),
            border = ButtonDefaults.outlinedButtonBorder.copy()
        ) {
            Text("Cancelar", style = MaterialTheme.typography.titleMedium)
        }
    }
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

@Composable
private fun ProfileRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = Primary, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(16.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall, color = TextSecondary)
            Text(value, style = MaterialTheme.typography.bodyLarge, color = TextPrimary)
        }
    }
}

@Composable
private fun Divider() = HorizontalDivider(color = com.cletaeats.app.ui.theme.Divider)

@Composable
private fun EditField(
    label: String,
    value: String,
    icon: ImageVector,
    error: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = { Icon(icon, null) },
        isError = error != null,
        supportingText = { error?.let { Text(it, color = Error) } },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Primary, focusedLabelColor = Primary,
            cursorColor = Primary, unfocusedBorderColor = com.cletaeats.app.ui.theme.Divider,
            unfocusedLabelColor = TextSecondary
        )
    )
}

@Composable
private fun ErrorProfile(message: String, modifier: Modifier, onRetry: () -> Unit) {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(message, color = Error, style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
            Text("Reintentar")
        }
    }
}

private fun maskCard(last4: String?): String {
    if (last4.isNullOrBlank()) return "—"
    return "**** ${last4.takeLast(4)}"
}
