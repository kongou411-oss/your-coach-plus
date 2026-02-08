package com.yourcoach.plus.shared.ui.screens.workout

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.model.rememberScreenModel
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.data.database.ExerciseDatabase
import com.yourcoach.plus.shared.data.database.ExerciseItem
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.CustomExerciseRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.ui.theme.*
import com.yourcoach.plus.shared.util.DateUtil
import org.koin.compose.koinInject

/**
 * 運動追加画面 (Android版と完全一致)
 */
data class AddWorkoutScreen(
    val templateMode: Boolean = false,
    val selectedDate: String = DateUtil.todayString()
) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val authRepository: AuthRepository = koinInject()
        val workoutRepository: WorkoutRepository = koinInject()
        val customExerciseRepository: CustomExerciseRepository = koinInject()

        val screenModel = rememberScreenModel {
            AddWorkoutScreenModel(authRepository, workoutRepository, customExerciseRepository, selectedDate)
        }
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

        var showAddExerciseDialog by remember { mutableStateOf(false) }
        var showExerciseDatabaseDialog by remember { mutableStateOf(false) }
        var showSaveTemplateDialog by remember { mutableStateOf(false) }
        var showEditExerciseDialog by remember { mutableStateOf(false) }
        var editingExerciseIndex by remember { mutableStateOf(-1) }

        // 保存成功時に戻る
        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                navigator.pop()
            }
        }

        // エラー表示
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
                    title = { Text(if (templateMode) "運動テンプレート作成" else "運動を記録") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
                        if (!templateMode) {
                            IconButton(onClick = { screenModel.toggleTemplates() }) {
                                Icon(Icons.Default.Bookmark, "テンプレート")
                            }
                        }
                    }
                )
            },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = {
                        if (templateMode) {
                            showSaveTemplateDialog = true
                        } else {
                            screenModel.saveWorkout()
                        }
                    },
                    containerColor = AccentOrange
                ) {
                    if (uiState.isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(Icons.Default.Check, "保存", tint = Color.White)
                    }
                }
            }
        ) { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 運動タイプ選択
                item {
                    Text(
                        text = "運動タイプ",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(WorkoutType.entries) { type ->
                            WorkoutTypeChip(
                                type = type,
                                isSelected = uiState.workoutType == type,
                                onClick = { screenModel.setWorkoutType(type) }
                            )
                        }
                    }
                }

                // 強度選択
                item {
                    Text(
                        text = "強度",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        WorkoutIntensity.entries.forEach { intensity ->
                            IntensityChip(
                                intensity = intensity,
                                isSelected = uiState.intensity == intensity,
                                onClick = { screenModel.setIntensity(intensity) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // サマリー
                item {
                    WorkoutSummaryCard(
                        duration = uiState.totalDuration,
                        calories = uiState.totalCaloriesBurned
                    )
                }

                // テンプレートセクション
                if (uiState.showTemplates) {
                    item {
                        WorkoutTemplateSection(
                            templates = uiState.templates,
                            onApplyTemplate = { screenModel.applyTemplate(it) },
                            onSaveAsTemplate = {
                                if (uiState.exercises.isNotEmpty()) {
                                    showSaveTemplateDialog = true
                                }
                            },
                            hasExercises = uiState.exercises.isNotEmpty()
                        )
                    }
                }

                // 運動追加ボタン
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = { showExerciseDatabaseDialog = true },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = AccentOrange.copy(alpha = 0.1f),
                                contentColor = AccentOrange
                            )
                        ) {
                            Icon(Icons.Default.Search, null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("種目検索")
                        }
                        Button(
                            onClick = { showAddExerciseDialog = true },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Primary.copy(alpha = 0.1f),
                                contentColor = Primary
                            )
                        ) {
                            Icon(Icons.Default.Edit, null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("手動入力")
                        }
                    }
                }

                // 運動リスト
                item {
                    Text(
                        text = "追加した運動",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (uiState.exercises.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    RoundedCornerShape(12.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.AutoMirrored.Filled.DirectionsRun,
                                    null,
                                    modifier = Modifier.size(32.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "運動を追加してください",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                } else {
                    itemsIndexed(uiState.exercises) { index, exercise ->
                        ExerciseCard(
                            exercise = exercise,
                            onEdit = {
                                editingExerciseIndex = index
                                showEditExerciseDialog = true
                            },
                            onDelete = { screenModel.removeExercise(index) }
                        )
                    }
                }

                // メモ
                item {
                    OutlinedTextField(
                        value = uiState.note,
                        onValueChange = screenModel::updateNote,
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("メモ（任意）") },
                        placeholder = { Text("今日の調子や感想など") },
                        minLines = 2,
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }

        // 手動追加ダイアログ
        if (showAddExerciseDialog) {
            AddExerciseDialog(
                workoutType = uiState.workoutType,
                onDismiss = { showAddExerciseDialog = false },
                onAdd = { exercise ->
                    screenModel.addExercise(exercise)
                    screenModel.saveCustomExercise(
                        name = exercise.name,
                        category = exercise.category,
                        defaultSets = exercise.sets,
                        defaultReps = exercise.reps,
                        defaultWeight = exercise.weight,
                        defaultDuration = exercise.duration
                    )
                    showAddExerciseDialog = false
                }
            )
        }

        // 運動データベース検索ダイアログ
        if (showExerciseDatabaseDialog) {
            ExerciseDatabaseDialog(
                workoutType = uiState.workoutType,
                screenModel = screenModel,
                onDismiss = { showExerciseDatabaseDialog = false },
                onSelect = { exercise ->
                    screenModel.addExercise(exercise)
                    showExerciseDatabaseDialog = false
                }
            )
        }

        // テンプレート保存ダイアログ
        if (showSaveTemplateDialog) {
            SaveWorkoutTemplateDialog(
                onDismiss = { showSaveTemplateDialog = false },
                onSave = { name ->
                    screenModel.saveAsTemplate(name)
                    showSaveTemplateDialog = false
                    if (templateMode) {
                        navigator.pop()
                    }
                }
            )
        }

        // 運動編集ダイアログ
        if (showEditExerciseDialog && editingExerciseIndex >= 0 && editingExerciseIndex < uiState.exercises.size) {
            EditExerciseDialog(
                exercise = uiState.exercises[editingExerciseIndex],
                onDismiss = {
                    showEditExerciseDialog = false
                    editingExerciseIndex = -1
                },
                onSave = { updatedExercise ->
                    screenModel.updateExercise(editingExerciseIndex, updatedExercise)
                    showEditExerciseDialog = false
                    editingExerciseIndex = -1
                }
            )
        }
    }
}

// ========== コンポーネント ==========

@Composable
private fun WorkoutTypeChip(type: WorkoutType, isSelected: Boolean, onClick: () -> Unit) {
    val (icon, label, color) = when (type) {
        WorkoutType.STRENGTH -> Triple(Icons.Default.FitnessCenter, "筋トレ", AccentOrange)
        WorkoutType.CARDIO -> Triple(Icons.AutoMirrored.Filled.DirectionsRun, "有酸素", Secondary)
        WorkoutType.FLEXIBILITY -> Triple(Icons.Default.SelfImprovement, "ストレッチ", Tertiary)
        WorkoutType.SPORTS -> Triple(Icons.Default.SportsSoccer, "スポーツ", Primary)
        WorkoutType.DAILY_ACTIVITY -> Triple(Icons.Default.DirectionsWalk, "日常活動", ScoreFiber)
    }

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) color.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
        ),
        border = if (isSelected) null else CardDefaults.outlinedCardBorder()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun IntensityChip(
    intensity: WorkoutIntensity,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val (label, color) = when (intensity) {
        WorkoutIntensity.LOW -> "軽い" to Primary
        WorkoutIntensity.MODERATE -> "普通" to Secondary
        WorkoutIntensity.HIGH -> "強い" to AccentOrange
        WorkoutIntensity.VERY_HIGH -> "激しい" to AccentRed
    }

    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) color.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
        ),
        border = if (isSelected) null else CardDefaults.outlinedCardBorder()
    ) {
        Box(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                color = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun WorkoutSummaryCard(duration: Int, calories: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = AccentOrange.copy(alpha = 0.1f))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Timer, null, tint = AccentOrange)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "${duration}分",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = AccentOrange
                )
                Text("時間", style = MaterialTheme.typography.labelSmall)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.LocalFireDepartment, null, tint = AccentRed)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "${calories}kcal",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = AccentRed
                )
                Text("消費", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun ExerciseCard(exercise: Exercise, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = exercise.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium
                )
                val details = buildString {
                    exercise.sets?.let { append("${it}セット ") }
                    exercise.reps?.let { append("${it}回 ") }
                    exercise.weight?.let { append("${it.toInt()}kg ") }
                    exercise.duration?.let { append("${it}分 ") }
                    exercise.distance?.let { append("${it}km") }
                }
                if (details.isNotBlank()) {
                    Text(
                        text = details.trim(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (exercise.warmupSets > 0 || exercise.mainSets > 0) {
                    Text(
                        text = "アップ${exercise.warmupSets} メイン${exercise.mainSets}",
                        style = MaterialTheme.typography.labelSmall,
                        color = AccentOrange
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${exercise.caloriesBurned}kcal",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = AccentOrange
                )
                if (exercise.totalVolume > 0) {
                    Text(
                        text = "${exercise.totalVolume}kg×reps",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Default.Edit, "編集", tint = Primary)
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Close, "削除", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/**
 * セット情報（アップ/メイン区別）
 */
data class WorkoutSet(
    val setNumber: Int,
    val isWarmup: Boolean,
    val weight: Float,
    val reps: Int,
    val volume: Float = weight * reps
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddExerciseDialog(
    workoutType: WorkoutType,
    onDismiss: () -> Unit,
    onAdd: (Exercise) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var sets by remember { mutableStateOf("") }
    var reps by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var duration by remember { mutableStateOf("") }
    var distance by remember { mutableStateOf("") }
    var calories by remember { mutableStateOf("") }

    val isStrength = workoutType == WorkoutType.STRENGTH
    val isCardio = workoutType == WorkoutType.CARDIO

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("運動を追加") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text("運動名") },
                    placeholder = { Text(if (isStrength) "例: ベンチプレス" else "例: ランニング") },
                    singleLine = true, modifier = Modifier.fillMaxWidth()
                )
                if (isStrength) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = sets, onValueChange = { sets = it }, label = { Text("セット") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                        OutlinedTextField(value = reps, onValueChange = { reps = it }, label = { Text("回数") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                        OutlinedTextField(value = weight, onValueChange = { weight = it }, label = { Text("重量(kg)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = duration, onValueChange = { duration = it }, label = { Text("時間(分)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                    if (isCardio) {
                        OutlinedTextField(value = distance, onValueChange = { distance = it }, label = { Text("距離(km)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                    }
                }
                OutlinedTextField(value = calories, onValueChange = { calories = it }, label = { Text("消費カロリー (kcal)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (name.isNotBlank()) {
                        onAdd(Exercise(
                            name = name,
                            category = ExerciseCategory.OTHER,
                            sets = sets.toIntOrNull(),
                            reps = reps.toIntOrNull(),
                            weight = weight.toFloatOrNull(),
                            duration = duration.toIntOrNull(),
                            distance = distance.toFloatOrNull(),
                            caloriesBurned = calories.toIntOrNull() ?: 0
                        ))
                    }
                },
                enabled = name.isNotBlank()
            ) { Text("追加", color = AccentOrange) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("キャンセル") } }
    )
}

/**
 * 種目検索・セット記録ダイアログ（内蔵DB + カスタム運動統合）
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExerciseDatabaseDialog(
    workoutType: WorkoutType,
    screenModel: AddWorkoutScreenModel,
    onDismiss: () -> Unit,
    onSelect: (Exercise) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var selectedExercise by remember { mutableStateOf<ExerciseItem?>(null) }
    var selectedCustomExercise by remember { mutableStateOf<CustomExercise?>(null) }

    // セット記録用の状態
    var weight by remember { mutableStateOf(50f) }
    var reps by remember { mutableStateOf(10) }
    var duration by remember { mutableStateOf(5) }
    var sets by remember { mutableStateOf<List<WorkoutSet>>(emptyList()) }

    val categories = ExerciseDatabase.categories
    val customExercises = screenModel.getCustomExercises()

    val searchResultsCustom = remember(searchQuery) {
        if (searchQuery.isNotBlank()) screenModel.searchCustomExercises(searchQuery)
        else emptyList()
    }

    val exercises = remember(searchQuery, selectedCategory) {
        when {
            searchQuery.isNotBlank() -> ExerciseDatabase.searchExercises(searchQuery)
            selectedCategory != null -> ExerciseDatabase.getExercisesByCategory(selectedCategory!!)
            else -> ExerciseDatabase.allExercises.take(20)
        }
    }

    if (selectedCustomExercise != null) {
        // カスタム運動のセット記録モード
        val customExercise = selectedCustomExercise!!
        AlertDialog(
            onDismissRequest = { selectedCustomExercise = null; sets = emptyList() },
            modifier = Modifier.fillMaxWidth().fillMaxHeight(0.95f),
            title = { Text("トレーニング") },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text(customExercise.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        Surface(shape = RoundedCornerShape(4.dp), color = Tertiary.copy(alpha = 0.2f)) {
                                            Text("カスタム", style = MaterialTheme.typography.labelSmall, color = Tertiary, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    Text(customExercise.category.name, style = MaterialTheme.typography.bodySmall, color = AccentOrange)
                                }
                                IconButton(onClick = { selectedCustomExercise = null; sets = emptyList() }) {
                                    Icon(Icons.Default.Close, "種目を変更")
                                }
                            }
                        }
                    }
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("総時間 (分)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = duration.toString(),
                            onValueChange = { duration = it.toIntOrNull() ?: duration },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                            singleLine = true, shape = RoundedCornerShape(8.dp)
                        )
                    }
                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                val exerciseToAdd = Exercise(
                                    name = customExercise.name,
                                    category = customExercise.category,
                                    sets = customExercise.defaultSets,
                                    reps = customExercise.defaultReps,
                                    weight = customExercise.defaultWeight,
                                    duration = duration,
                                    distance = null,
                                    caloriesBurned = (duration * customExercise.caloriesPerMinute).toInt()
                                )
                                onSelect(exerciseToAdd)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) { Text("種目追加") }
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            },
            confirmButton = {},
            dismissButton = {}
        )
    } else if (selectedExercise != null) {
        // セット記録モード（内蔵DB）
        val exercise = selectedExercise!!
        val isStrength = workoutType == WorkoutType.STRENGTH ||
            exercise.category in listOf("胸", "背中", "肩", "腕", "脚", "体幹")

        AlertDialog(
            onDismissRequest = { selectedExercise = null; sets = emptyList() },
            modifier = Modifier.fillMaxWidth().fillMaxHeight(0.95f),
            title = { Text("トレーニング") },
            text = {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 選択した種目
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(exercise.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text(exercise.category, style = MaterialTheme.typography.bodySmall, color = AccentOrange)
                                }
                                IconButton(onClick = { selectedExercise = null; sets = emptyList() }) {
                                    Icon(Icons.Default.Close, "種目を変更")
                                }
                            }
                        }
                    }

                    if (isStrength) {
                        // 重量入力
                        item {
                            Text("重量 (kg)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            OutlinedTextField(
                                value = weight.toInt().toString(),
                                onValueChange = { weight = it.toFloatOrNull() ?: weight },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                                singleLine = true, shape = RoundedCornerShape(8.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Slider(
                                value = weight, onValueChange = { weight = it },
                                valueRange = 0f..500f, steps = 199,
                                colors = SliderDefaults.colors(thumbColor = AccentOrange, activeTrackColor = AccentOrange)
                            )
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                listOf("0kg", "100kg", "200kg", "300kg", "400kg", "500kg").forEach { Text(it, style = MaterialTheme.typography.labelSmall) }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf(-10f, -5f, -2.5f).forEach { delta ->
                                    WeightAdjustButton(delta = delta, onClick = { weight = (weight + delta).coerceAtLeast(0f) }, modifier = Modifier.weight(1f))
                                }
                                listOf(2.5f, 5f, 10f).forEach { delta ->
                                    WeightAdjustButton(delta = delta, onClick = { weight = (weight + delta).coerceAtMost(500f) }, modifier = Modifier.weight(1f))
                                }
                            }
                        }

                        // 回数入力
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("回数", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            OutlinedTextField(
                                value = reps.toString(),
                                onValueChange = { reps = it.toIntOrNull() ?: reps },
                                modifier = Modifier.fillMaxWidth(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                                singleLine = true, shape = RoundedCornerShape(8.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Slider(
                                value = reps.toFloat(), onValueChange = { reps = it.toInt() },
                                valueRange = 1f..50f, steps = 48,
                                colors = SliderDefaults.colors(thumbColor = AccentOrange, activeTrackColor = AccentOrange)
                            )
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                listOf("1回", "10回", "20回", "30回", "40回", "50回").forEach { Text(it, style = MaterialTheme.typography.labelSmall) }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf(-5, -3, -1).forEach { delta ->
                                    RepsAdjustButton(delta = delta, onClick = { reps = (reps + delta).coerceAtLeast(1) }, modifier = Modifier.weight(1f))
                                }
                                listOf(1, 3, 5).forEach { delta ->
                                    RepsAdjustButton(delta = delta, onClick = { reps = (reps + delta).coerceAtMost(50) }, modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }

                    // 総時間入力
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("総時間 (分)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = duration.toString(),
                            onValueChange = { duration = it.toIntOrNull() ?: duration },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                            singleLine = true, shape = RoundedCornerShape(8.dp)
                        )
                    }

                    // アップ追加 / メイン追加 ボタン
                    if (isStrength) {
                        item {
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Button(
                                    onClick = {
                                        sets = sets + WorkoutSet(setNumber = sets.size + 1, isWarmup = true, weight = weight, reps = reps)
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = AccentOrange.copy(alpha = 0.15f), contentColor = AccentOrange)
                                ) { Text("アップ追加") }
                                OutlinedButton(
                                    onClick = {
                                        sets = sets + WorkoutSet(setNumber = sets.size + 1, isWarmup = false, weight = weight, reps = reps)
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentOrange),
                                    border = BorderStroke(1.dp, AccentOrange)
                                ) { Text("メイン追加") }
                            }
                        }
                    }

                    // セット一覧
                    if (sets.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("セット一覧", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        itemsIndexed(sets) { index, set ->
                            SetListItem(set = set, onDelete = { sets = sets.filterIndexed { i, _ -> i != index } })
                        }
                    }

                    // 種目追加ボタン
                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = {
                                val mainSets = sets.filter { !it.isWarmup }
                                val totalReps = mainSets.sumOf { it.reps }
                                val avgWeight = if (mainSets.isNotEmpty()) mainSets.map { it.weight }.average().toFloat() else weight
                                val totalVolume = sets.sumOf { it.volume.toDouble() }.toFloat()
                                val totalDuration = if (isStrength && sets.isNotEmpty()) duration * sets.size else duration

                                val exerciseToAdd = Exercise(
                                    name = exercise.name,
                                    category = when (exercise.category) {
                                        "胸" -> ExerciseCategory.CHEST
                                        "背中" -> ExerciseCategory.BACK
                                        "肩" -> ExerciseCategory.SHOULDERS
                                        "腕" -> ExerciseCategory.ARMS
                                        "脚" -> ExerciseCategory.LEGS
                                        "体幹" -> ExerciseCategory.CORE
                                        "有酸素" -> ExerciseCategory.RUNNING
                                        "ストレッチ" -> ExerciseCategory.STRETCHING
                                        else -> ExerciseCategory.OTHER
                                    },
                                    sets = if (isStrength) sets.size else null,
                                    reps = if (isStrength && mainSets.isNotEmpty()) mainSets.map { it.reps }.average().toInt() else null,
                                    weight = if (isStrength) avgWeight else null,
                                    duration = totalDuration,
                                    distance = null,
                                    caloriesBurned = if (isStrength) {
                                        ((totalVolume * 0.05f) + (totalDuration * 3)).toInt().coerceAtLeast(1)
                                    } else {
                                        totalDuration * 7
                                    },
                                    warmupSets = sets.filter { it.isWarmup }.size,
                                    mainSets = mainSets.size,
                                    totalVolume = totalVolume.toInt()
                                )
                                onSelect(exerciseToAdd)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Primary),
                            enabled = sets.isNotEmpty() || !isStrength
                        ) { Text("種目追加") }
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                }
            },
            confirmButton = {},
            dismissButton = {}
        )
    } else {
        // 種目検索ダイアログ
        AlertDialog(
            onDismissRequest = onDismiss,
            modifier = Modifier.fillMaxWidth().fillMaxHeight(0.9f),
            title = { Text("種目を検索") },
            text = {
                Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = searchQuery, onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(), placeholder = { Text("種目名で検索...") },
                        leadingIcon = { Icon(Icons.Default.Search, null) },
                        trailingIcon = { if (searchQuery.isNotBlank()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Default.Clear, "クリア") } },
                        singleLine = true, shape = RoundedCornerShape(12.dp)
                    )
                    Row(modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(onClick = { selectedCategory = null }, label = { Text("すべて") }, selected = selectedCategory == null && searchQuery.isBlank())
                        categories.forEach { category ->
                            FilterChip(
                                onClick = { selectedCategory = if (selectedCategory == category) null else category; searchQuery = "" },
                                label = { Text(category) },
                                selected = selectedCategory == category
                            )
                        }
                    }
                    LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (searchQuery.isNotBlank() && searchResultsCustom.isNotEmpty()) {
                            items(searchResultsCustom) { customExercise ->
                                CustomExerciseItemCard(exercise = customExercise, onClick = { selectedCustomExercise = customExercise })
                            }
                        }
                        items(exercises) { exercise ->
                            ExerciseItemCard(exercise = exercise, onClick = { selectedExercise = exercise })
                        }
                        if (exercises.isEmpty() && searchResultsCustom.isEmpty()) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                    Text("該当する種目がありません", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = onDismiss) { Text("閉じる") } }
        )
    }
}

@Composable
private fun WeightAdjustButton(delta: Float, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val isNegative = delta < 0
    val displayValue = if (delta == delta.toInt().toFloat()) delta.toInt().toString() else delta.toString()
    Button(
        onClick = onClick,
        modifier = modifier.height(40.dp),
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isNegative) AccentRed.copy(alpha = 0.15f) else Primary.copy(alpha = 0.15f),
            contentColor = if (isNegative) AccentRed else Primary
        ),
        contentPadding = PaddingValues(horizontal = 4.dp)
    ) {
        Text(text = if (delta > 0) "+$displayValue" else displayValue, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun RepsAdjustButton(delta: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val isNegative = delta < 0
    Button(
        onClick = onClick,
        modifier = modifier.height(40.dp),
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isNegative) AccentRed.copy(alpha = 0.15f) else Primary.copy(alpha = 0.15f),
            contentColor = if (isNegative) AccentRed else Primary
        ),
        contentPadding = PaddingValues(horizontal = 4.dp)
    ) {
        Text(text = if (delta > 0) "+$delta" else "$delta", style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun SetListItem(set: WorkoutSet, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Set ${set.setNumber}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = if (set.isWarmup) Secondary.copy(alpha = 0.2f) else AccentOrange.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = if (set.isWarmup) "アップ" else "メイン",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (set.isWarmup) Secondary else AccentOrange,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("重量: ${set.weight.toInt()}kg", style = MaterialTheme.typography.bodySmall)
                Text("回数: ${set.reps}回", style = MaterialTheme.typography.bodySmall)
                Text("体積: ${set.volume.toInt()} kg×reps", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.Delete, "削除", tint = AccentRed)
            }
        }
    }
}

@Composable
private fun ExerciseItemCard(exercise: ExerciseItem, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(exercise.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                Text("${exercise.category} • ${exercise.equipment}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (exercise.primaryMuscles.isNotEmpty()) {
                    Text(exercise.primaryMuscles.joinToString(", "), style = MaterialTheme.typography.labelSmall, color = AccentOrange)
                }
            }
            Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun CustomExerciseItemCard(exercise: CustomExercise, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(exercise.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                    Surface(shape = RoundedCornerShape(4.dp), color = Tertiary.copy(alpha = 0.2f)) {
                        Text("カスタム", style = MaterialTheme.typography.labelSmall, color = Tertiary, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                    }
                }
                Text("マイ種目 • ${exercise.category.name}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun WorkoutTemplateSection(
    templates: List<WorkoutTemplate>,
    onApplyTemplate: (WorkoutTemplate) -> Unit,
    onSaveAsTemplate: () -> Unit,
    hasExercises: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("テンプレート", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (hasExercises) {
                    TextButton(onClick = onSaveAsTemplate) {
                        Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("保存")
                    }
                }
            }
            if (templates.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.BookmarkBorder, null, modifier = Modifier.size(32.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("保存済みのテンプレートはありません", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("運動を追加して保存しましょう", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                    }
                }
            } else {
                templates.forEach { template ->
                    Card(onClick = { onApplyTemplate(template) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(template.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                                Text("${template.exercises.size}種目", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Icon(Icons.Default.ChevronRight, "適用", tint = AccentOrange)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SaveWorkoutTemplateDialog(onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var templateName by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("テンプレートとして保存") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("現在の運動内容をテンプレートとして保存します。", style = MaterialTheme.typography.bodyMedium)
                OutlinedTextField(
                    value = templateName, onValueChange = { templateName = it },
                    label = { Text("テンプレート名") }, placeholder = { Text("例: 胸の日") },
                    singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSave(templateName) }, enabled = templateName.isNotBlank(), colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)) { Text("保存") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("キャンセル") } }
    )
}

/**
 * 消費カロリー計算
 */
private fun calculateCalories(sets: Int?, reps: Int?, weight: Float?, duration: Int?): Int {
    if (weight != null && weight > 0 && sets != null && reps != null) {
        val volume = sets * reps * weight
        return (volume * 0.05f).toInt().coerceAtLeast(1)
    }
    if (duration != null && duration > 0) {
        return duration * 7
    }
    return 0
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditExerciseDialog(exercise: Exercise, onDismiss: () -> Unit, onSave: (Exercise) -> Unit) {
    var sets by remember { mutableStateOf(exercise.sets?.toString() ?: "") }
    var reps by remember { mutableStateOf(exercise.reps?.toString() ?: "") }
    var weight by remember { mutableStateOf(exercise.weight?.toInt()?.toString() ?: "") }
    var duration by remember { mutableStateOf(exercise.duration?.toString() ?: "") }
    var distance by remember { mutableStateOf(exercise.distance?.toString() ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("${exercise.name} を編集") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = sets, onValueChange = { sets = it }, label = { Text("セット") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(value = reps, onValueChange = { reps = it }, label = { Text("回数") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(value = weight, onValueChange = { weight = it }, label = { Text("重量(kg)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = duration, onValueChange = { duration = it }, label = { Text("時間(分)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(value = distance, onValueChange = { distance = it }, label = { Text("距離(km)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done), singleLine = true, modifier = Modifier.weight(1f))
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val newSets = sets.toIntOrNull()
                    val newReps = reps.toIntOrNull()
                    val newWeight = weight.toFloatOrNull()
                    val newDuration = duration.toIntOrNull()
                    val newDistance = distance.toFloatOrNull()
                    val newCalories = calculateCalories(newSets, newReps, newWeight, newDuration)
                    onSave(exercise.copy(
                        sets = newSets, reps = newReps, weight = newWeight,
                        duration = newDuration, distance = newDistance,
                        caloriesBurned = if (newCalories > 0) newCalories else exercise.caloriesBurned
                    ))
                },
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
            ) { Text("保存") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("キャンセル") } }
    )
}
