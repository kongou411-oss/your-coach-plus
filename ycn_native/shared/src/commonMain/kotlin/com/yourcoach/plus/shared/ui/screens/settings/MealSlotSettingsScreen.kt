package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.TrainingStyle
import com.yourcoach.plus.shared.ui.components.ClockTimePickerDialog
import com.yourcoach.plus.shared.ui.theme.*

class MealSlotSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<MealSlotSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }
        var showResetDialog by remember { mutableStateOf(false) }

        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                snackbarHostState.showSnackbar("設定を保存しました")
                navigator.pop()
            }
        }

        LaunchedEffect(uiState.successMessage) {
            uiState.successMessage?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearSuccessMessage()
            }
        }

        LaunchedEffect(uiState.error) {
            uiState.error?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("クエスト連動設定") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
                        IconButton(onClick = { showResetDialog = true }) {
                            Icon(Icons.Default.Refresh, contentDescription = "リセット")
                        }
                        TextButton(
                            onClick = { screenModel.saveSettings() },
                            enabled = !uiState.isSaving
                        ) {
                            if (uiState.isSaving) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Text("保存", color = Primary)
                            }
                        }
                    }
                )
            }
        ) { paddingValues ->
            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 説明カード
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Info, null, tint = Primary, modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("クエスト連動設定", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Primary)
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "タイムラインの時刻設定とトレーニング連動テンプレートを管理できます。",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    // タイムライン設定セクション
                    item {
                        TimelineSettingsSection(
                            wakeUpTime = uiState.wakeUpTime,
                            sleepTime = uiState.sleepTime,
                            trainingTime = uiState.trainingTime,
                            trainingAfterMeal = uiState.trainingAfterMeal,
                            trainingDuration = uiState.trainingDuration,
                            trainingStyle = uiState.trainingStyle,
                            mealsPerDay = uiState.mealsPerDay,
                            onWakeUpTimeChange = { screenModel.updateWakeUpTime(it) },
                            onSleepTimeChange = { screenModel.updateSleepTime(it) },
                            onTrainingTimeChange = { screenModel.updateTrainingTime(it) },
                            onTrainingAfterMealChange = { screenModel.updateTrainingAfterMeal(it) },
                            onTrainingDurationChange = { screenModel.updateTrainingDuration(it) },
                            onTrainingStyleChange = { screenModel.updateTrainingStyle(it) },
                            onGenerateTimeline = { screenModel.generateTimelineRoutine() }
                        )
                    }

                    item { Spacer(modifier = Modifier.height(60.dp)) }
                }
            }
        }

        // リセット確認ダイアログ
        if (showResetDialog) {
            AlertDialog(
                onDismissRequest = { showResetDialog = false },
                title = { Text("デフォルトに戻す") },
                text = { Text("設定をデフォルトに戻しますか？\n\n現在の設定は失われます。") },
                confirmButton = {
                    TextButton(onClick = { screenModel.resetToDefault(); showResetDialog = false }) {
                        Text("リセット", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showResetDialog = false }) { Text("キャンセル") }
                }
            )
        }
    }
}

@Composable
private fun TimelineSettingsSection(
    wakeUpTime: String,
    sleepTime: String,
    trainingTime: String,
    trainingAfterMeal: Int?,
    trainingDuration: Int,
    trainingStyle: TrainingStyle,
    mealsPerDay: Int,
    onWakeUpTimeChange: (String) -> Unit,
    onSleepTimeChange: (String) -> Unit,
    onTrainingTimeChange: (String) -> Unit,
    onTrainingAfterMealChange: (Int?) -> Unit,
    onTrainingDurationChange: (Int) -> Unit,
    onTrainingStyleChange: (TrainingStyle) -> Unit,
    onGenerateTimeline: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Schedule, null, tint = Primary, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("タイムライン設定", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            }

            Text(
                "起床・就寝・トレーニング時刻を設定すると、食事の推奨タイミングが自動生成されます。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // 起床時刻
            TimePickerRow(label = "起床", icon = Icons.Default.WbSunny, currentTime = wakeUpTime, onTimeChanged = onWakeUpTimeChange)

            // 就寝時刻
            TimePickerRow(label = "就寝", icon = Icons.Default.Bedtime, currentTime = sleepTime, onTimeChanged = onSleepTimeChange)
            Text("睡眠は8〜9時間を推奨", style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 40.dp, top = 4.dp))

            // トレーニング時刻
            TimePickerRow(label = "トレーニング", icon = Icons.Default.FitnessCenter, currentTime = trainingTime, onTimeChanged = onTrainingTimeChange)

            // トレーニング前食事
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                var showTrainingMealHelp by remember { mutableStateOf(false) }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("トレーニング前の食事番号は？", style = MaterialTheme.typography.bodyMedium)
                    IconButton(onClick = { showTrainingMealHelp = true }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Info, "ヘルプ", modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (showTrainingMealHelp) {
                    AlertDialog(
                        onDismissRequest = { showTrainingMealHelp = false },
                        confirmButton = { TextButton(onClick = { showTrainingMealHelp = false }) { Text("OK") } },
                        title = { Text("トレーニング前の食事番号は？") },
                        text = { Text("何食目の後にトレーニングを行うかを選択します。\n\n例: 「3」を選択 → 3食目がトレーニング2時間前の食事として配置され、4食目がトレーニング直後に自動配置されます。\n\nタイムラインの食事タイミングとトレーニング前後の栄養配分に影響します。") }
                    )
                }
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    (1..mealsPerDay).forEach { mealNum ->
                        FilterChip(
                            selected = trainingAfterMeal == mealNum,
                            onClick = { onTrainingAfterMealChange(if (trainingAfterMeal == mealNum) null else mealNum) },
                            label = { Text("$mealNum") }
                        )
                    }
                }
            }

            // トレーニング時間
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("トレーニング時間", style = MaterialTheme.typography.bodyMedium)
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(60 to "1h", 90 to "1.5h", 120 to "2h", 150 to "2.5h", 180 to "3h").forEach { (minutes, label) ->
                        FilterChip(
                            selected = trainingDuration == minutes,
                            onClick = { onTrainingDurationChange(minutes) },
                            label = { Text(label) }
                        )
                    }
                }
            }

            // トレーニングスタイル
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                var showStyleHelp by remember { mutableStateOf(false) }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("トレーニングスタイル", style = MaterialTheme.typography.bodyMedium)
                    IconButton(onClick = { showStyleHelp = true }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Info, "ヘルプ", modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (showStyleHelp) {
                    AlertDialog(
                        onDismissRequest = { showStyleHelp = false },
                        confirmButton = { TextButton(onClick = { showStyleHelp = false }) { Text("OK") } },
                        title = { Text("トレーニングスタイル") },
                        text = { Text("クエストで生成されるワークアウトのレップ数に反映されます。\n\nパワー - 高重量・低レップ（5回/セット）。筋力向上向け\nパンプ - 中重量・高レップ（10回/セット）。筋肥大・ボディメイク向け") }
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TrainingStyle.entries.forEach { style ->
                        FilterChip(
                            selected = trainingStyle == style,
                            onClick = { onTrainingStyleChange(style) },
                            label = {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(style.displayName)
                                    Text("${style.repsPerSet}回/セット", style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        )
                    }
                }
            }

            // タイムライン生成ボタン
            Button(
                onClick = onGenerateTimeline,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("タイムラインを自動生成")
            }
        }
    }
}

@Composable
private fun TimePickerRow(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    currentTime: String,
    onTimeChanged: (String) -> Unit
) {
    var showTimePicker by remember { mutableStateOf(false) }
    val hours = currentTime.substringBefore(":").toIntOrNull() ?: 7
    val minutes = currentTime.substringAfter(":").toIntOrNull() ?: 0

    Row(
        modifier = Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { showTimePicker = true }
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Primary, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium)
        }
        Text(currentTime, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, color = Primary)
    }

    if (showTimePicker) {
        ClockTimePickerDialog(
            label = label,
            initialHour = hours,
            initialMinute = minutes,
            onConfirm = { time ->
                onTimeChanged(time)
                showTimePicker = false
            },
            onDismiss = { showTimePicker = false }
        )
    }
}
