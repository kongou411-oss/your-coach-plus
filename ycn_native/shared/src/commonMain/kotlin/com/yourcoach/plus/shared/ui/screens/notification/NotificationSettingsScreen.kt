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
 * 通知設定画面 (Compose Multiplatform)
 */
class NotificationSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<NotificationSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        LaunchedEffect(Unit) {
            screenModel.checkNotificationPermission()
            screenModel.registerFcmToken()
        }

        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        LaunchedEffect(uiState.successMessage) {
            uiState.successMessage?.let { message ->
                snackbarHostState.showSnackbar(message)
                screenModel.clearSuccessMessage()
            }
        }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("通知設定") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
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
                    if (!uiState.hasNotificationPermission) {
                        PermissionCard(
                            onRequestPermission = {
                                screenModel.requestNotificationPermission()
                            },
                            modifier = Modifier.padding(16.dp)
                        )
                    }

                    if (uiState.hasNotificationPermission) {
                        NotificationTabRow(
                            selectedTab = uiState.selectedTab,
                            onTabSelected = { screenModel.selectTab(it) }
                        )

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
 * 通知許可カード
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
                    text = "通知が無効です",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "リマインダーを受け取るには通知を有効にしてください",
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
                Text("通知を有効にする")
            }
        }
    }
}

/**
 * 通知タブ
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
 * タブコンテンツ
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
        NotificationTab.MEAL -> "朝食、昼食、夕食など、複数の通知を設定できます"
        NotificationTab.WORKOUT -> "お好みの時間に毎日の運動リマインダーを受け取れます"
        NotificationTab.ANALYSIS -> "1日の終わりにAI分析で栄養を振り返りましょう"
        NotificationTab.CUSTOM -> "自由なタイトルとメッセージでカスタム通知を作成できます。お薬のリマインダーにも便利です"
    }

    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            HelpCard(text = helpText)
        }

        if (currentList.isNotEmpty()) {
            item {
                Text(
                    text = "設定中の通知",
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

        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "新しい通知を作成",
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
 * ヘルプカード
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
 * 通知アイテムカード
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
                    contentDescription = "削除",
                    tint = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

/**
 * 新しい通知フォーム
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
            OutlinedTextField(
                value = title,
                onValueChange = onTitleChange,
                label = { Text(if (isCustomTab) "タイトル（例：お薬を飲む）" else "タイトル") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(8.dp)
            )

            OutlinedTextField(
                value = body,
                onValueChange = onBodyChange,
                label = { Text(if (isCustomTab) "メッセージ（例：サプリメントを忘れずに）" else "メッセージ") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 3,
                shape = RoundedCornerShape(8.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
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
                        Text("追加")
                    }
                }
            }
        }
    }

    if (showTimePicker) {
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            title = { Text("通知時間") },
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
                    Text("キャンセル")
                }
            }
        )
    }
}

/**
 * 注意事項カード
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
                text = "通知は設定した時間から数秒以内に届きます。より正確な時間管理には、スマホの標準アラーム機能をご利用ください。",
                style = MaterialTheme.typography.bodySmall,
                color = AccentOrange
            )
        }
    }
}
