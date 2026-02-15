package com.yourcoach.plus.shared.ui.screens.workout

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.ui.theme.*

/**
 * ワークアウトレコーダー画面（セット単位記録）
 */
class WorkoutRecorderScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<WorkoutRecorderScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        var showRpeSheet by remember { mutableStateOf(false) }
        var showExercisePicker by remember { mutableStateOf(uiState.exerciseName.isEmpty()) }
        val snackbarHostState = remember { SnackbarHostState() }

        LaunchedEffect(uiState.savedSuccessfully) {
            if (uiState.savedSuccessfully) {
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
                    title = { Text("トレーニング記録") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
                        if (uiState.completedExercises.isNotEmpty()) {
                            TextButton(
                                onClick = { screenModel.saveWorkout { navigator.pop() } },
                                enabled = !uiState.isSaving
                            ) {
                                if (uiState.isSaving) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                } else {
                                    Text("保存")
                                }
                            }
                        }
                    }
                )
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // 統計サマリー
                if (uiState.completedExercises.isNotEmpty() || uiState.sets.isNotEmpty()) {
                    SessionStatsBar(screenModel.getSessionStats())
                }

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 完了した種目
                    if (uiState.completedExercises.isNotEmpty()) {
                        item {
                            Text(
                                "完了した種目",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }

                        itemsIndexed(uiState.completedExercises) { _, exercise ->
                            CompletedExerciseCard(exercise)
                        }
                    }

                    // 現在の種目
                    if (uiState.exerciseName.isNotEmpty()) {
                        item {
                            CurrentExerciseSection(
                                uiState = uiState,
                                screenModel = screenModel,
                                onShowRpeSheet = { showRpeSheet = true }
                            )
                        }
                    } else {
                        item {
                            AddExerciseButton(onClick = { showExercisePicker = true })
                        }
                    }

                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }

                // 種目完了ボタン
                if (uiState.exerciseName.isNotEmpty() && uiState.sets.isNotEmpty()) {
                    Button(
                        onClick = { screenModel.finishCurrentExercise() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("種目を完了して次へ")
                    }
                }
            }

            // RPE選択シート
            if (showRpeSheet) {
                RpeSelectionSheet(
                    selectedRpe = uiState.selectedRpe,
                    onRpeSelected = { rpe ->
                        screenModel.updateRpe(rpe)
                        showRpeSheet = false
                    },
                    onDismiss = { showRpeSheet = false }
                )
            }

            // 種目選択ダイアログ
            if (showExercisePicker) {
                ExercisePickerDialog(
                    onExerciseSelected = { name, category ->
                        screenModel.startExercise(name, category)
                        showExercisePicker = false
                    },
                    onDismiss = { showExercisePicker = false }
                )
            }
        }
    }
}

@Composable
private fun SessionStatsBar(stats: SessionStats) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        StatItem("セット", "${stats.totalSets}")
        StatItem("Volume", "${stats.totalVolume.toInt()}kg")
        stats.averageRpe?.let {
            val rounded = (it * 10).toInt() / 10.0
            StatItem("Avg RPE", "$rounded")
        }
        StatItem("kcal", "${stats.estimatedCalories}")
    }
}

@Composable
private fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun CompletedExerciseCard(exercise: Exercise) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    exercise.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    "${exercise.mainSets}セット × ${exercise.reps}rep | ${exercise.totalVolume}kg",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if ((exercise.warmupSets ?: 0) > 0) {
                Text(
                    "W${exercise.warmupSets}+M${exercise.mainSets}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun CurrentExerciseSection(
    uiState: WorkoutRecorderUiState,
    screenModel: WorkoutRecorderScreenModel,
    onShowRpeSheet: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    uiState.exerciseName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.weight(1f))
                uiState.previousRecord?.let { record ->
                    Text(
                        "前回: ${record.weight}kg × ${record.reps}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ウォームアップ切り替え
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Switch(
                    checked = uiState.warmupEnabled,
                    onCheckedChange = { screenModel.toggleWarmup(it) }
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Smart Ramp-up（ウォームアップ自動生成）",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            // セットリスト
            uiState.sets.forEachIndexed { index, set ->
                SetRow(
                    set = set,
                    isCurrentSet = index == uiState.currentSetIndex,
                    onComplete = {
                        if (set.type == SetType.WARMUP && !set.isCompleted) {
                            screenModel.completeWarmupSet(index)
                        }
                    },
                    onRemove = { screenModel.removeSet(index) }
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 新規セット入力
            SetInputRow(
                weight = uiState.inputWeight,
                reps = uiState.inputReps,
                setType = uiState.selectedSetType,
                rpe = uiState.selectedRpe,
                onWeightChange = screenModel::updateWeight,
                onRepsChange = screenModel::updateReps,
                onSetTypeChange = screenModel::updateSetType,
                onRpeTap = onShowRpeSheet,
                onAdd = screenModel::addSet
            )
        }
    }
}

@Composable
private fun SetRow(
    set: ExerciseSet,
    isCurrentSet: Boolean,
    onComplete: () -> Unit,
    onRemove: () -> Unit
) {
    val backgroundColor = when {
        set.type == SetType.WARMUP -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        isCurrentSet -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        else -> Color.Transparent
    }

    val textColor = when (set.type) {
        SetType.WARMUP -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
        else -> MaterialTheme.colorScheme.onSurface
    }

    val fontWeight = when (set.type) {
        SetType.WARMUP -> FontWeight.Normal
        SetType.MAIN -> FontWeight.Bold
        else -> FontWeight.Medium
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(backgroundColor)
            .clickable(enabled = set.type == SetType.WARMUP && !set.isCompleted) { onComplete() }
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .alpha(if (set.isCompleted && set.type == SetType.WARMUP) 0.5f else 1f),
        verticalAlignment = Alignment.CenterVertically
    ) {
        SetTypeBadge(set.type)
        Spacer(modifier = Modifier.width(12.dp))

        Text(
            "#${set.setNumber}",
            style = MaterialTheme.typography.bodyMedium,
            color = textColor,
            fontWeight = fontWeight,
            modifier = Modifier.width(32.dp)
        )

        Text(
            "${set.weight}kg × ${set.reps}",
            style = MaterialTheme.typography.bodyLarge,
            color = textColor,
            fontWeight = fontWeight,
            modifier = Modifier.weight(1f)
        )

        set.rpe?.takeIf { set.type != SetType.WARMUP }?.let { rpe ->
            RpeBadge(rpe)
        }

        if (set.isCompleted) {
            Icon(
                Icons.Default.Check,
                contentDescription = "完了",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
        }

        IconButton(
            onClick = onRemove,
            modifier = Modifier.size(32.dp)
        ) {
            Icon(
                Icons.Outlined.Close,
                contentDescription = "削除",
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
private fun SetTypeBadge(type: SetType) {
    val (bgColor, txtColor) = when (type) {
        SetType.WARMUP -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
        SetType.MAIN -> Color(0xFFFF9800) to Color.White
        SetType.DROP -> Color(0xFF2196F3) to Color.White
        SetType.FAILURE -> Color(0xFFF44336) to Color.White
    }

    Text(
        type.shortLabel,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = txtColor,
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bgColor)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}

@Composable
private fun RpeBadge(rpe: Int) {
    val color = when (rpe) {
        10 -> Color(0xFFF44336)
        9 -> Color(0xFFFF9800)
        8 -> Color(0xFF4CAF50)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Text(
        "RPE $rpe",
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = color,
        modifier = Modifier
            .border(1.dp, color, RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}

@Composable
private fun SetInputRow(
    weight: String,
    reps: String,
    setType: SetType,
    rpe: Int?,
    onWeightChange: (String) -> Unit,
    onRepsChange: (String) -> Unit,
    onSetTypeChange: (SetType) -> Unit,
    onRpeTap: () -> Unit,
    onAdd: () -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SetType.entries.forEach { type ->
                FilterChip(
                    selected = setType == type,
                    onClick = { onSetTypeChange(type) },
                    label = { Text(type.displayLabel) },
                    modifier = Modifier.weight(1f)
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = weight,
                onValueChange = onWeightChange,
                label = { Text("kg") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.weight(1f),
                singleLine = true
            )

            Text("×", fontSize = 20.sp)

            OutlinedTextField(
                value = reps,
                onValueChange = onRepsChange,
                label = { Text("rep") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
                singleLine = true
            )

            if (setType != SetType.WARMUP) {
                OutlinedButton(
                    onClick = onRpeTap,
                    modifier = Modifier.width(80.dp)
                ) {
                    Text(if (rpe != null) "RPE $rpe" else "RPE")
                }
            }

            FilledIconButton(
                onClick = onAdd,
                enabled = weight.isNotEmpty() && reps.isNotEmpty()
            ) {
                Icon(Icons.Default.Add, "追加")
            }
        }
    }
}

@Composable
private fun AddExerciseButton(onClick: () -> Unit) {
    OutlinedCard(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Add, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.width(8.dp))
            Text("種目を追加", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RpeSelectionSheet(
    selectedRpe: Int?,
    onRpeSelected: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                "RPE（主観的運動強度）",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                "このセットの追い込み度を選択してください",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            listOf(10, 9, 8, 7).forEach { rpe ->
                val isSelected = selectedRpe == rpe
                val description = RpeDescriptions.getDescription(rpe)
                val shortLabel = RpeDescriptions.getShortLabel(rpe)

                Card(
                    onClick = { onRpeSelected(rpe) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected)
                            MaterialTheme.colorScheme.primaryContainer
                        else MaterialTheme.colorScheme.surface
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "$rpe",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = when (rpe) {
                                10 -> Color(0xFFF44336)
                                9 -> Color(0xFFFF9800)
                                8 -> Color(0xFF4CAF50)
                                else -> MaterialTheme.colorScheme.onSurface
                            }
                        )

                        Spacer(modifier = Modifier.width(16.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                shortLabel,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        if (isSelected) {
                            Icon(
                                Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

/**
 * 種目選択ダイアログ（カテゴリ別）
 */
@Composable
private fun ExercisePickerDialog(
    onExerciseSelected: (String, ExerciseCategory) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedCategory by remember { mutableStateOf(ExerciseCategory.CHEST) }
    var customName by remember { mutableStateOf("") }
    var showCustomInput by remember { mutableStateOf(false) }

    val categoryDisplayNames = remember {
        mapOf(
            ExerciseCategory.CHEST to "胸",
            ExerciseCategory.BACK to "背中",
            ExerciseCategory.SHOULDERS to "肩",
            ExerciseCategory.ARMS to "腕",
            ExerciseCategory.CORE to "体幹",
            ExerciseCategory.LEGS to "脚",
            ExerciseCategory.RUNNING to "ランニング",
            ExerciseCategory.WALKING to "ウォーキング",
            ExerciseCategory.CYCLING to "サイクリング",
            ExerciseCategory.SWIMMING to "水泳",
            ExerciseCategory.HIIT to "HIIT",
            ExerciseCategory.YOGA to "ヨガ",
            ExerciseCategory.STRETCHING to "ストレッチ",
            ExerciseCategory.SPORTS to "スポーツ",
            ExerciseCategory.OTHER to "その他"
        )
    }

    val exercises = remember(selectedCategory) {
        com.yourcoach.plus.shared.data.database.ExerciseDatabase.getExercisesByCategory(selectedCategory.name)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("種目を選択", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.heightIn(max = 500.dp)) {
                // カテゴリ選択
                LazyColumn(
                    modifier = Modifier.height(44.dp)
                ) {
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            ExerciseCategory.entries.forEach { cat ->
                                FilterChip(
                                    selected = selectedCategory == cat,
                                    onClick = { selectedCategory = cat },
                                    label = { Text(categoryDisplayNames[cat] ?: cat.name, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // 種目リスト
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    exercises.forEach { exercise ->
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        onExerciseSelected(exercise.name, selectedCategory)
                                    }
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.FitnessCenter,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    exercise.name,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                            }
                        }
                    }
                }

                // カスタム種目入力
                if (showCustomInput) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = customName,
                        onValueChange = { customName = it },
                        label = { Text("種目名") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        trailingIcon = {
                            if (customName.isNotBlank()) {
                                IconButton(onClick = {
                                    onExerciseSelected(customName, selectedCategory)
                                }) {
                                    Icon(Icons.Default.Check, "決定")
                                }
                            }
                        }
                    )
                } else {
                    TextButton(onClick = { showCustomInput = true }) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("カスタム種目を入力")
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("キャンセル") }
        }
    )
}
