package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.SplitTypes
import com.yourcoach.plus.shared.domain.model.TrainingCalorieBonus
import com.yourcoach.plus.shared.ui.theme.*

class RoutineSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<RoutineSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                snackbarHostState.showSnackbar("ルーティンを保存しました")
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
                    title = { Text("ルーティン設定") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
                        TextButton(
                            onClick = { screenModel.savePattern() },
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
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            "7日分のトレーニング分割",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(bottom = 8.dp)
                        )
                    }

                    items(uiState.days) { day ->
                        RoutineDayCard(
                            day = day,
                            onSplitTypeChanged = { screenModel.updateDaySplitType(day.dayNumber, it) },
                            onToggleRestDay = { screenModel.toggleRestDay(day.dayNumber) }
                        )
                    }

                    // トレーニング加算カロリーセクション
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        TrainingCalorieBonusSection(
                            bonuses = uiState.trainingCalorieBonuses,
                            userLbm = uiState.userLbm,
                            isSaving = uiState.bonusSaving,
                            onUpdateBonus = { splitType, value ->
                                screenModel.updateTrainingBonus(splitType, value)
                            },
                            onSave = { screenModel.saveTrainingBonuses() }
                        )
                    }

                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
private fun RoutineDayCard(
    day: RoutineDay,
    onSplitTypeChanged: (String) -> Unit,
    onToggleRestDay: () -> Unit
) {
    var showSplitPicker by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (day.isRestDay)
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            else
                MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Day ${day.dayNumber}",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        if (day.isRestDay) "休養日" else day.splitType.ifEmpty { "未設定" },
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (day.splitType.isEmpty() && !day.isRestDay)
                            MaterialTheme.colorScheme.onSurfaceVariant
                        else
                            MaterialTheme.colorScheme.onSurface
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        onClick = onToggleRestDay,
                        label = { Text("休み") },
                        selected = day.isRestDay
                    )
                    if (!day.isRestDay) {
                        FilledTonalButton(
                            onClick = { showSplitPicker = true },
                            contentPadding = PaddingValues(horizontal = 12.dp)
                        ) {
                            Text("分割選択")
                        }
                    }
                }
            }

            if (!day.isRestDay && day.workouts.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                day.workouts.forEach { workout ->
                    Text(
                        "  ${workout.templateName} (${workout.estimatedDuration}分)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }

    if (showSplitPicker) {
        AlertDialog(
            onDismissRequest = { showSplitPicker = false },
            title = { Text("Day ${day.dayNumber} の分割を選択") },
            text = {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 400.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(SplitTypes.TRAINING_DAYS) { split ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    onSplitTypeChanged(split)
                                    showSplitPicker = false
                                }
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.FitnessCenter,
                                contentDescription = null,
                                tint = if (day.splitType == split) Primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                split,
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = if (day.splitType == split) FontWeight.Bold else FontWeight.Normal,
                                color = if (day.splitType == split) Primary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSplitPicker = false }) {
                    Text("キャンセル")
                }
            }
        )
    }
}

@Composable
private fun TrainingCalorieBonusSection(
    bonuses: Map<String, Int>,
    userLbm: Float?,
    isSaving: Boolean,
    onUpdateBonus: (String, Int) -> Unit,
    onSave: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val defaultBases = TrainingCalorieBonus.DEFAULT_BASES
    val referenceLbm = TrainingCalorieBonus.REFERENCE_LBM

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "トレーニング加算カロリー",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null
                )
            }

            if (expanded) {
                Spacer(modifier = Modifier.height(8.dp))

                if (userLbm != null) {
                    Text(
                        "LBM: ${"%.1f".format(userLbm)}kg",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                defaultBases.forEach { (splitType, defaultBase) ->
                    val currentBase = bonuses[splitType] ?: defaultBase
                    val lbm = userLbm ?: referenceLbm
                    val actualValue = ((currentBase + 100) * (lbm / referenceLbm)).toInt()

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            splitType,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.weight(1f)
                        )

                        var textValue by remember(currentBase) { mutableStateOf(currentBase.toString()) }
                        OutlinedTextField(
                            value = textValue,
                            onValueChange = { newVal ->
                                textValue = newVal
                                newVal.toIntOrNull()?.let { intVal ->
                                    if (intVal in 0..2000) onUpdateBonus(splitType, intVal)
                                }
                            },
                            modifier = Modifier.width(72.dp).height(48.dp),
                            textStyle = MaterialTheme.typography.bodySmall.copy(textAlign = TextAlign.Center),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true
                        )

                        Text(
                            "${actualValue}kcal",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.width(72.dp),
                            textAlign = TextAlign.End
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onSave,
                    enabled = !isSaving,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text("保存")
                }
            }
        }
    }
}
