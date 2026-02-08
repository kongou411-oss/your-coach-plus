package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.theme.*

class MealSlotSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<MealSlotSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                snackbarHostState.showSnackbar("設定を保存しました")
                navigator.pop()
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
                    title = { Text("食事スロット設定") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
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
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 食事回数
                    MealSlotSectionCard(title = "食事回数") {
                        Text("1日の食事回数", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            (2..8).forEach { count ->
                                FilterChip(
                                    onClick = { screenModel.updateMealsPerDay(count) },
                                    label = { Text("$count") },
                                    selected = uiState.mealsPerDay == count,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }

                    // タイムライン
                    MealSlotSectionCard(title = "タイムライン") {
                        TimePickerRow(
                            label = "起床時刻",
                            icon = Icons.Default.WbSunny,
                            currentTime = uiState.wakeUpTime,
                            onTimeChanged = { screenModel.updateWakeUpTime(it) }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        TimePickerRow(
                            label = "就寝時刻",
                            icon = Icons.Default.Bedtime,
                            currentTime = uiState.sleepTime,
                            onTimeChanged = { screenModel.updateSleepTime(it) }
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        TimePickerRow(
                            label = "トレーニング時刻",
                            icon = Icons.Default.FitnessCenter,
                            currentTime = uiState.trainingTime,
                            onTimeChanged = { screenModel.updateTrainingTime(it) }
                        )
                    }

                    // トレーニング設定
                    MealSlotSectionCard(title = "トレーニング設定") {
                        Text(
                            "トレーニング所要時間: ${uiState.trainingDuration}分",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Slider(
                            value = uiState.trainingDuration.toFloat(),
                            onValueChange = { screenModel.updateTrainingDuration(it.toInt()) },
                            valueRange = 30f..240f,
                            steps = 13,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("30分", style = MaterialTheme.typography.labelSmall)
                            Text("240分", style = MaterialTheme.typography.labelSmall)
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Text("何食目の後にトレーニング", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            (1..uiState.mealsPerDay).forEach { meal ->
                                FilterChip(
                                    onClick = {
                                        screenModel.updateTrainingAfterMeal(
                                            if (uiState.trainingAfterMeal == meal) null else meal
                                        )
                                    },
                                    label = { Text("$meal") },
                                    selected = uiState.trainingAfterMeal == meal,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                        Text(
                            "※ 選択すると食事スロットがトレーニング前後に最適化されます",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(80.dp))
                }
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
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = Primary, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium)
        }
        FilledTonalButton(onClick = { showTimePicker = true }) {
            Text(currentTime)
        }
    }

    if (showTimePicker) {
        // Simple time picker using dialog with hour/minute selection
        var selectedHour by remember { mutableStateOf(hours) }
        var selectedMinute by remember { mutableStateOf(minutes / 30 * 30) }

        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            title = { Text(label) },
            text = {
                Column {
                    Text("時", style = MaterialTheme.typography.labelMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        // Show common hours in rows
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            for (row in 0..2) {
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    for (col in 0..7) {
                                        val h = row * 8 + col
                                        if (h < 24) {
                                            FilterChip(
                                                onClick = { selectedHour = h },
                                                label = { Text("$h", style = MaterialTheme.typography.labelSmall) },
                                                selected = selectedHour == h,
                                                modifier = Modifier.width(44.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("分", style = MaterialTheme.typography.labelMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(0, 30).forEach { m ->
                            FilterChip(
                                onClick = { selectedMinute = m },
                                label = { Text(m.toString().padStart(2, '0')) },
                                selected = selectedMinute == m
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    onTimeChanged("${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}")
                    showTimePicker = false
                }) {
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

@Composable
private fun MealSlotSectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 12.dp))
            content()
        }
    }
}
