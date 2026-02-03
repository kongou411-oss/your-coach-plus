package com.yourcoach.plus.shared.ui.screens.notification

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.theme.AccentOrange
import com.yourcoach.plus.shared.ui.theme.Primary

/**
 * Notification Settings Screen (Compose Multiplatform)
 */
class NotificationSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<NotificationSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        // Initialize
        LaunchedEffect(Unit) {
            screenModel.checkNotificationPermission()
            screenModel.registerFcmToken()
        }

        // Error display
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        // Success message display
        LaunchedEffect(uiState.successMessage) {
            uiState.successMessage?.let { message ->
                snackbarHostState.showSnackbar(message)
                screenModel.clearSuccessMessage()
            }
        }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Notification Settings") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                )
            },
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                ) {
                    // Permission card (shown when permission is not granted)
                    if (!uiState.hasNotificationPermission) {
                        PermissionCard(
                            onRequestPermission = {
                                // Platform-specific permission request will be handled elsewhere
                            },
                            modifier = Modifier.padding(16.dp)
                        )
                    }

                    // Show tabs and content only when permission is granted
                    if (uiState.hasNotificationPermission) {
                        // Tabs
                        NotificationTabRow(
                            selectedTab = uiState.selectedTab,
                            onTabSelected = { screenModel.selectTab(it) }
                        )

                        // Tab content
                        NotificationTabContent(
                            uiState = uiState,
                            onTimeChange = { screenModel.updateNewTime(it) },
                            onTitleChange = { screenModel.updateNewTitle(it) },
                            onBodyChange = { screenModel.updateNewBody(it) },
                            onAddNotification = { screenModel.addNotification() },
                            onRemoveNotification = { screenModel.removeNotification(it) },
                            modifier = Modifier
                                .fillMaxSize()
                                .weight(1f)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Permission card
 */
@Composable
private fun PermissionCard(
    onRequestPermission: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.NotificationsOff,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Notifications Disabled",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Please enable notifications to receive reminders",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onErrorContainer
            )

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = onRequestPermission,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error
                )
            ) {
                Text("Enable Notifications")
            }
        }
    }
}

/**
 * Notification tabs
 */
@Composable
private fun NotificationTabRow(
    selectedTab: NotificationTab,
    onTabSelected: (NotificationTab) -> Unit
) {
    val tabs = NotificationTab.entries

    ScrollableTabRow(
        selectedTabIndex = tabs.indexOf(selectedTab),
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.primary,
        edgePadding = 16.dp
    ) {
        tabs.forEach { tab ->
            val icon = when (tab) {
                NotificationTab.MEAL -> Icons.Default.Restaurant
                NotificationTab.WORKOUT -> Icons.Default.FitnessCenter
                NotificationTab.ANALYSIS -> Icons.Default.Analytics
                NotificationTab.CUSTOM -> Icons.Default.Tune
            }

            Tab(
                selected = selectedTab == tab,
                onClick = { onTabSelected(tab) },
                text = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = tab.label,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = if (selectedTab == tab) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            )
        }
    }
}

/**
 * Tab content
 */
@Composable
private fun NotificationTabContent(
    uiState: NotificationSettingsUiState,
    onTimeChange: (String) -> Unit,
    onTitleChange: (String) -> Unit,
    onBodyChange: (String) -> Unit,
    onAddNotification: () -> Unit,
    onRemoveNotification: (NotificationItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val currentList = when (uiState.selectedTab) {
        NotificationTab.MEAL -> uiState.mealNotifications
        NotificationTab.WORKOUT -> uiState.workoutNotifications
        NotificationTab.ANALYSIS -> uiState.analysisNotifications
        NotificationTab.CUSTOM -> uiState.customNotifications
    }

    val helpText = when (uiState.selectedTab) {
        NotificationTab.MEAL -> "You can set multiple notifications for breakfast, lunch, dinner, etc."
        NotificationTab.WORKOUT -> "Get daily workout reminders at your preferred time."
        NotificationTab.ANALYSIS -> "Review your nutrition at the end of the day with AI analysis."
        NotificationTab.CUSTOM -> "Create custom notifications with any title and message. Great for medication reminders."
    }

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Help text
        item {
            HelpCard(text = helpText)
        }

        // Registered notifications list
        if (currentList.isNotEmpty()) {
            item {
                Text(
                    text = "Active Notifications",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }

            items(currentList, key = { it.id }) { item ->
                NotificationItemCard(
                    item = item,
                    onRemove = { onRemoveNotification(item) },
                    isLoading = uiState.isSaving
                )
            }
        }

        // New notification section
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Create New Notification",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            NewNotificationForm(
                time = uiState.newTime,
                title = uiState.newTitle,
                body = uiState.newBody,
                onTimeChange = onTimeChange,
                onTitleChange = onTitleChange,
                onBodyChange = onBodyChange,
                onAdd = onAddNotification,
                isLoading = uiState.isSaving,
                isCustomTab = uiState.selectedTab == NotificationTab.CUSTOM
            )
        }

        // Notes
        item {
            Spacer(modifier = Modifier.height(8.dp))
            NoteCard()
        }

        item {
            Spacer(modifier = Modifier.height(60.dp))
        }
    }
}

/**
 * Help card
 */
@Composable
private fun HelpCard(text: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = Primary.copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Outlined.Info,
                contentDescription = null,
                tint = Primary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = text,
                style = MaterialTheme.typography.bodySmall,
                color = Primary
            )
        }
    }
}

/**
 * Notification item card
 */
@Composable
private fun NotificationItemCard(
    item: NotificationItem,
    onRemove: () -> Unit,
    isLoading: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (item.body.isNotEmpty()) {
                    Text(
                        text = item.body,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = item.time,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            IconButton(
                onClick = onRemove,
                enabled = !isLoading
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

/**
 * New notification form
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewNotificationForm(
    time: String,
    title: String,
    body: String,
    onTimeChange: (String) -> Unit,
    onTitleChange: (String) -> Unit,
    onBodyChange: (String) -> Unit,
    onAdd: () -> Unit,
    isLoading: Boolean,
    isCustomTab: Boolean
) {
    var showTimePicker by remember { mutableStateOf(false) }

    // Parse time
    val parts = time.split(":")
    val initialHour = parts.getOrNull(0)?.toIntOrNull() ?: 12
    val initialMinute = parts.getOrNull(1)?.toIntOrNull() ?: 0

    val timePickerState = rememberTimePickerState(
        initialHour = initialHour,
        initialMinute = initialMinute,
        is24Hour = true
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Title input
            OutlinedTextField(
                value = title,
                onValueChange = onTitleChange,
                label = { Text(if (isCustomTab) "Title (e.g., Take medicine)" else "Title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(8.dp)
            )

            // Body input
            OutlinedTextField(
                value = body,
                onValueChange = onBodyChange,
                label = { Text(if (isCustomTab) "Message (e.g., Don't forget your supplements)" else "Message") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 3,
                shape = RoundedCornerShape(8.dp)
            )

            // Time and add button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Time selection
                OutlinedCard(
                    onClick = { showTimePicker = true },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Schedule,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = time,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Add button
                Button(
                    onClick = onAdd,
                    enabled = !isLoading && title.isNotBlank() && body.isNotBlank(),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = null
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add")
                    }
                }
            }
        }
    }

    // Time picker dialog
    if (showTimePicker) {
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            title = { Text("Notification Time") },
            text = {
                TimePicker(state = timePickerState)
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val newTime = "${timePickerState.hour.toString().padStart(2, '0')}:${timePickerState.minute.toString().padStart(2, '0')}"
                        onTimeChange(newTime)
                        showTimePicker = false
                    }
                ) {
                    Text("OK")
                }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

/**
 * Note card
 */
@Composable
private fun NoteCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = AccentOrange.copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = Icons.Default.Info,
                contentDescription = null,
                tint = AccentOrange,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Notifications will arrive within a few seconds of the scheduled time. For more precise timing, please use your phone's built-in alarm feature.",
                style = MaterialTheme.typography.bodySmall,
                color = AccentOrange
            )
        }
    }
}
