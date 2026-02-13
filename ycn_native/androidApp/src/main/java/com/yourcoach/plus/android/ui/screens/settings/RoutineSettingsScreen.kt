package com.yourcoach.plus.android.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.android.data.repository.FirestoreMealRepository
import com.yourcoach.plus.android.data.repository.FirestoreWorkoutRepository
import com.yourcoach.plus.android.ui.theme.AccentOrange
import com.yourcoach.plus.android.ui.theme.Primary
import com.yourcoach.plus.android.ui.theme.ScoreCarbs
import com.yourcoach.plus.android.ui.theme.ScoreSleep
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.RoutinePattern
import com.yourcoach.plus.shared.domain.model.SplitTypes
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel

/**
 * ルーティン設定画面のUI状態
 */
data class RoutineSettingsUiState(
    val isLoading: Boolean = true,
    val days: List<RoutineDay> = emptyList(),
    val mealTemplates: List<MealTemplate> = emptyList(),
    val workoutTemplates: List<WorkoutTemplate> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null
)

/**
 * デフォルトの7日間ルーティン
 */
val DEFAULT_ROUTINE_DAYS = listOf(
    RoutineDay(id = "1", dayNumber = 1, name = "Day 1", splitType = "胸", isRestDay = false),
    RoutineDay(id = "2", dayNumber = 2, name = "Day 2", splitType = "背中", isRestDay = false),
    RoutineDay(id = "3", dayNumber = 3, name = "Day 3", splitType = "休み", isRestDay = true),
    RoutineDay(id = "4", dayNumber = 4, name = "Day 4", splitType = "肩", isRestDay = false),
    RoutineDay(id = "5", dayNumber = 5, name = "Day 5", splitType = "腕", isRestDay = false),
    RoutineDay(id = "6", dayNumber = 6, name = "Day 6", splitType = "脚", isRestDay = false),
    RoutineDay(id = "7", dayNumber = 7, name = "Day 7", splitType = "休み", isRestDay = true)
)

/**
 * ルーティン設定画面のViewModel
 */
class RoutineSettingsViewModel(
    private val routineRepository: RoutineRepository,
    private val mealRepository: FirestoreMealRepository = FirestoreMealRepository(),
    private val workoutRepository: FirestoreWorkoutRepository = FirestoreWorkoutRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(RoutineSettingsUiState())
    val uiState: StateFlow<RoutineSettingsUiState> = _uiState.asStateFlow()

    private val currentUserId: String?
        get() = FirebaseAuth.getInstance().currentUser?.uid

    private var currentPatternId: String? = null
    private var patternCreatedAt: Long = 0  // 元のcreatedAtを保持（ループ計算用）

    init {
        loadData()
    }

    fun loadData() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // アクティブなパターンを取得
            routineRepository.getActivePattern(userId)
                .onSuccess { pattern ->
                    if (pattern != null) {
                        currentPatternId = pattern.id
                        patternCreatedAt = pattern.createdAt  // 元のcreatedAtを保持
                        _uiState.update { it.copy(days = pattern.days) }
                    } else {
                        // パターンがない場合はデフォルトを作成
                        createDefaultRoutine()
                    }
                }
                .onFailure {
                    // エラー時もデフォルトを表示
                    _uiState.update { it.copy(days = DEFAULT_ROUTINE_DAYS) }
                }

            // テンプレート取得
            mealRepository.getMealTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(mealTemplates = templates) }
                }

            workoutRepository.getWorkoutTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(workoutTemplates = templates) }
                }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun updateDay(dayNumber: Int, updates: RoutineDay.() -> RoutineDay) {
        val currentDays = _uiState.value.days.toMutableList()
        val index = currentDays.indexOfFirst { it.dayNumber == dayNumber }
        if (index != -1) {
            currentDays[index] = currentDays[index].updates()
            _uiState.update { it.copy(days = currentDays) }
            saveRoutine(currentDays)
        }
    }

    fun addDay() {
        val currentDays = _uiState.value.days
        if (currentDays.size >= 10) {
            _uiState.update { it.copy(error = "最大10日まで設定できます") }
            return
        }

        val nextDayNumber = currentDays.size + 1
        val newDay = RoutineDay(
            id = nextDayNumber.toString(),
            dayNumber = nextDayNumber,
            name = "Day $nextDayNumber",
            splitType = "",
            isRestDay = false
        )

        val updatedDays = currentDays + newDay
        _uiState.update { it.copy(days = updatedDays) }
        saveRoutine(updatedDays)
    }

    fun removeDay(dayNumber: Int) {
        val currentDays = _uiState.value.days

        // 最小2日は維持
        if (currentDays.size <= 2) {
            _uiState.update { it.copy(error = "最小2日は必要です") }
            return
        }

        // 削除後にdayNumberを振り直す
        val updatedDays = currentDays
            .filter { it.dayNumber != dayNumber }
            .mapIndexed { index, day ->
                day.copy(
                    id = (index + 1).toString(),
                    dayNumber = index + 1,
                    name = "Day ${index + 1}"
                )
            }

        _uiState.update { it.copy(days = updatedDays) }
        saveRoutine(updatedDays)
    }

    fun moveDay(fromIndex: Int, toIndex: Int) {
        val currentDays = _uiState.value.days.toMutableList()
        if (fromIndex < 0 || fromIndex >= currentDays.size ||
            toIndex < 0 || toIndex >= currentDays.size) return

        val day = currentDays.removeAt(fromIndex)
        currentDays.add(toIndex, day)

        // dayNumberを振り直す
        val updatedDays = currentDays.mapIndexed { index, d ->
            d.copy(
                id = (index + 1).toString(),
                dayNumber = index + 1,
                name = "Day ${index + 1}"
            )
        }

        _uiState.update { it.copy(days = updatedDays) }
        saveRoutine(updatedDays)
    }

    fun resetToDefault() {
        _uiState.update { it.copy(days = DEFAULT_ROUTINE_DAYS) }
        saveRoutine(DEFAULT_ROUTINE_DAYS)
        _uiState.update { it.copy(successMessage = "デフォルトルーティンに戻しました") }
    }

    private fun createDefaultRoutine() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            val now = System.currentTimeMillis()
            patternCreatedAt = now  // 新規作成時にcreatedAtを保持

            val pattern = RoutinePattern(
                userId = userId,
                name = "7日間分割",
                description = "胸→背中→休→肩→腕→脚→休",
                days = DEFAULT_ROUTINE_DAYS,
                isActive = true,
                createdAt = now,
                updatedAt = now
            )

            routineRepository.savePattern(userId, pattern)
                .onSuccess { patternId ->
                    currentPatternId = patternId
                    _uiState.update { it.copy(days = DEFAULT_ROUTINE_DAYS) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "ルーティンの作成に失敗しました") }
                }
        }
    }

    private fun saveRoutine(days: List<RoutineDay>) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            // createdAtは新規作成時のみ設定、既存パターンは保持
            val now = System.currentTimeMillis()
            val createdAt = if (patternCreatedAt > 0) patternCreatedAt else now

            val pattern = RoutinePattern(
                id = currentPatternId ?: "",
                userId = userId,
                name = "${days.size}日間分割",
                description = days.map { if (it.isRestDay) "休" else it.splitType.take(1).ifEmpty { "?" } }.joinToString("→"),
                days = days,
                isActive = true,
                createdAt = createdAt,
                updatedAt = now
            )

            routineRepository.savePattern(userId, pattern)
                .onSuccess { patternId ->
                    if (currentPatternId == null) {
                        currentPatternId = patternId
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "保存に失敗しました") }
                }
        }
    }

    // テンプレート紐づけ
    fun addMealTemplateToDay(dayNumber: Int, templateId: String) {
        val template = _uiState.value.mealTemplates.find { it.id == templateId } ?: return

        updateDay(dayNumber) {
            val newMeal = com.yourcoach.plus.shared.domain.model.RoutineMealTemplate(
                id = System.currentTimeMillis().toString(),
                templateId = templateId,
                templateName = template.name,
                totalCalories = template.totalCalories,
                totalProtein = template.totalProtein,
                totalCarbs = template.totalCarbs,
                totalFat = template.totalFat
            )
            copy(meals = meals + newMeal)
        }
    }

    fun removeMealTemplateFromDay(dayNumber: Int, index: Int) {
        updateDay(dayNumber) {
            copy(meals = meals.filterIndexed { i, _ -> i != index })
        }
    }

    fun addWorkoutTemplateToDay(dayNumber: Int, templateId: String) {
        val template = _uiState.value.workoutTemplates.find { it.id == templateId } ?: return

        updateDay(dayNumber) {
            val newWorkout = com.yourcoach.plus.shared.domain.model.RoutineWorkoutTemplate(
                id = System.currentTimeMillis().toString(),
                templateId = templateId,
                templateName = template.name,
                estimatedDuration = template.estimatedDuration,
                estimatedCaloriesBurned = template.estimatedCalories
            )
            copy(workouts = workouts + newWorkout)
        }
    }

    fun removeWorkoutTemplateFromDay(dayNumber: Int, index: Int) {
        updateDay(dayNumber) {
            copy(workouts = workouts.filterIndexed { i, _ -> i != index })
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }
}

/**
 * ルーティン設定画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoutineSettingsScreen(
    viewModel: RoutineSettingsViewModel = koinViewModel(),
    onNavigateBack: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showResetDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf<Int?>(null) }

    // エラー・成功メッセージ表示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearSuccessMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ルーティン設定") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                    }
                },
                actions = {
                    IconButton(onClick = { showResetDialog = true }) {
                        Icon(Icons.Default.Refresh, contentDescription = "リセット")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            if (uiState.days.size < 10) {
                FloatingActionButton(
                    onClick = { viewModel.addDay() },
                    containerColor = Primary
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Day追加")
                }
            }
        }
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
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // ヘルプカード
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Info,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "↑↓で並び替え、最大10日、カスタム分類も追加可能",
                                style = MaterialTheme.typography.bodySmall,
                                color = Primary
                            )
                        }
                    }
                }

                // Day一覧
                itemsIndexed(uiState.days) { index, day ->
                    RoutineDayCard(
                        day = day,
                        canDelete = uiState.days.size > 2 && day.dayNumber > 2,
                        canMoveUp = index > 0,
                        canMoveDown = index < uiState.days.size - 1,
                        mealTemplates = uiState.mealTemplates,
                        workoutTemplates = uiState.workoutTemplates,
                        onUpdateSplitType = { splitType ->
                            viewModel.updateDay(day.dayNumber) {
                                copy(splitType = splitType, isRestDay = splitType == "休み")
                            }
                        },
                        onToggleRestDay = { isRest ->
                            viewModel.updateDay(day.dayNumber) {
                                copy(isRestDay = isRest, splitType = if (isRest) "休み" else splitType)
                            }
                        },
                        onDelete = { showDeleteDialog = day.dayNumber },
                        onMoveUp = { viewModel.moveDay(index, index - 1) },
                        onMoveDown = { viewModel.moveDay(index, index + 1) },
                        onAddMealTemplate = { templateId ->
                            viewModel.addMealTemplateToDay(day.dayNumber, templateId)
                        },
                        onRemoveMealTemplate = { idx ->
                            viewModel.removeMealTemplateFromDay(day.dayNumber, idx)
                        },
                        onAddWorkoutTemplate = { templateId ->
                            viewModel.addWorkoutTemplateToDay(day.dayNumber, templateId)
                        },
                        onRemoveWorkoutTemplate = { idx ->
                            viewModel.removeWorkoutTemplateFromDay(day.dayNumber, idx)
                        }
                    )
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    // リセット確認ダイアログ
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("デフォルトに戻す") },
            text = { Text("ルーティンを7日間のデフォルト（胸→背中→休→肩→腕→脚→休）に戻しますか？\n\n現在の設定は失われます。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.resetToDefault()
                        showResetDialog = false
                    }
                ) {
                    Text("リセット", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("キャンセル")
                }
            }
        )
    }

    // 削除確認ダイアログ
    showDeleteDialog?.let { dayNumber ->
        AlertDialog(
            onDismissRequest = { showDeleteDialog = null },
            title = { Text("Day $dayNumber を削除") },
            text = { Text("このDayを削除しますか？\n以降のDayは番号が繰り上がります。") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.removeDay(dayNumber)
                        showDeleteDialog = null
                    }
                ) {
                    Text("削除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = null }) {
                    Text("キャンセル")
                }
            }
        )
    }
}

@Composable
private fun RoutineDayCard(
    day: RoutineDay,
    canDelete: Boolean,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    mealTemplates: List<MealTemplate>,
    workoutTemplates: List<WorkoutTemplate>,
    onUpdateSplitType: (String) -> Unit,
    onToggleRestDay: (Boolean) -> Unit,
    onDelete: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onAddMealTemplate: (String) -> Unit,
    onRemoveMealTemplate: (Int) -> Unit,
    onAddWorkoutTemplate: (String) -> Unit,
    onRemoveWorkoutTemplate: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (day.isRestDay)
                ScoreSleep.copy(alpha = 0.1f)
            else
                MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 並び替えボタン
                    Column {
                        IconButton(
                            onClick = onMoveUp,
                            enabled = canMoveUp,
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.KeyboardArrowUp,
                                contentDescription = "上へ",
                                tint = if (canMoveUp) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                            )
                        }
                        IconButton(
                            onClick = onMoveDown,
                            enabled = canMoveDown,
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.KeyboardArrowDown,
                                contentDescription = "下へ",
                                tint = if (canMoveDown) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Text(
                        text = "Day ${day.dayNumber}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (day.isRestDay) ScoreSleep else Primary
                    )
                    Spacer(modifier = Modifier.width(12.dp))

                    // 休養日チェックボックス
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onToggleRestDay(!day.isRestDay) }
                            .padding(4.dp)
                    ) {
                        Checkbox(
                            checked = day.isRestDay,
                            onCheckedChange = { onToggleRestDay(it) },
                            colors = CheckboxDefaults.colors(checkedColor = ScoreSleep)
                        )
                        Text(
                            text = "休養日",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (day.isRestDay) ScoreSleep else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Row {
                    if (canDelete) {
                        IconButton(onClick = onDelete) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "削除",
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }

            // 分類選択（休養日でない場合）
            if (!day.isRestDay) {
                Spacer(modifier = Modifier.height(12.dp))
                SplitTypeSelector(
                    selectedType = day.splitType,
                    onSelect = onUpdateSplitType
                )
            }

            // テンプレート紐づけセクション
            Spacer(modifier = Modifier.height(12.dp))

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Link,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "テンプレート紐づけ",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        if (day.meals.isNotEmpty() || day.workouts.isNotEmpty()) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "(${day.meals.size + day.workouts.size})",
                                style = MaterialTheme.typography.bodySmall,
                                color = Primary
                            )
                        }
                    }
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // テンプレート紐づけ詳細
            if (expanded) {
                Spacer(modifier = Modifier.height(12.dp))
                TemplateBindingSection(
                    day = day,
                    mealTemplates = mealTemplates,
                    workoutTemplates = workoutTemplates,
                    onAddMealTemplate = onAddMealTemplate,
                    onRemoveMealTemplate = onRemoveMealTemplate,
                    onAddWorkoutTemplate = onAddWorkoutTemplate,
                    onRemoveWorkoutTemplate = onRemoveWorkoutTemplate
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SplitTypeSelector(
    selectedType: String,
    onSelect: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    var showCustomInput by remember { mutableStateOf(false) }
    var customType by remember { mutableStateOf("") }

    val splitTypes = listOf(
        "胸", "背中", "肩", "腕", "脚", "腹筋・体幹",
        "上半身", "下半身", "全身",
        "プッシュ", "プル",
        "胸・三頭", "背中・二頭", "肩・腕"
    )

    Column {
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = it }
        ) {
            OutlinedTextField(
                value = selectedType.ifEmpty { "分類を選択" },
                onValueChange = {},
                readOnly = true,
                label = { Text("分類") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(),
                colors = OutlinedTextFieldDefaults.colors()
            )

            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.background(MaterialTheme.colorScheme.surfaceContainer)
            ) {
                splitTypes.forEach { type ->
                    DropdownMenuItem(
                        text = { Text(type, color = MaterialTheme.colorScheme.onSurface) },
                        onClick = {
                            onSelect(type)
                            expanded = false
                        }
                    )
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                // カスタム追加オプション
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = Primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("カスタム追加...", color = Primary)
                        }
                    },
                    onClick = {
                        expanded = false
                        showCustomInput = true
                    }
                )
            }
        }

        // カスタム入力ダイアログ
        if (showCustomInput) {
            AlertDialog(
                onDismissRequest = { showCustomInput = false },
                title = { Text("カスタム分類") },
                text = {
                    OutlinedTextField(
                        value = customType,
                        onValueChange = { customType = it },
                        label = { Text("分類名") },
                        placeholder = { Text("例: 胸・肩") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                confirmButton = {
                    TextButton(
                        onClick = {
                            if (customType.isNotBlank()) {
                                onSelect(customType.trim())
                                customType = ""
                                showCustomInput = false
                            }
                        },
                        enabled = customType.isNotBlank()
                    ) {
                        Text("追加")
                    }
                },
                dismissButton = {
                    TextButton(onClick = {
                        customType = ""
                        showCustomInput = false
                    }) {
                        Text("キャンセル")
                    }
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TemplateBindingSection(
    day: RoutineDay,
    mealTemplates: List<MealTemplate>,
    workoutTemplates: List<WorkoutTemplate>,
    onAddMealTemplate: (String) -> Unit,
    onRemoveMealTemplate: (Int) -> Unit,
    onAddWorkoutTemplate: (String) -> Unit,
    onRemoveWorkoutTemplate: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                shape = RoundedCornerShape(8.dp)
            )
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 食事テンプレート
        Column {
            Text(
                text = "食事テンプレート",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = ScoreCarbs
            )
            Spacer(modifier = Modifier.height(8.dp))

            if (mealTemplates.isEmpty()) {
                Text(
                    text = "テンプレートがありません",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                // 紐づけ済みテンプレート
                day.meals.forEachIndexed { index, meal ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp))
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "[${index + 1}] ${meal.templateName}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        IconButton(
                            onClick = { onRemoveMealTemplate(index) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "削除",
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }

                // 追加ボタン
                var showMealDropdown by remember { mutableStateOf(false) }

                ExposedDropdownMenuBox(
                    expanded = showMealDropdown,
                    onExpandedChange = { showMealDropdown = it }
                ) {
                    OutlinedButton(
                        onClick = { showMealDropdown = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = ScoreCarbs)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("追加", style = MaterialTheme.typography.bodySmall)
                    }

                    ExposedDropdownMenu(
                        expanded = showMealDropdown,
                        onDismissRequest = { showMealDropdown = false },
                        modifier = Modifier.background(MaterialTheme.colorScheme.surfaceContainer)
                    ) {
                        mealTemplates.forEach { template ->
                            DropdownMenuItem(
                                text = { Text(template.name, color = MaterialTheme.colorScheme.onSurface) },
                                onClick = {
                                    onAddMealTemplate(template.id)
                                    showMealDropdown = false
                                }
                            )
                        }
                    }
                }
            }
        }

        HorizontalDivider()

        // 運動テンプレート
        Column {
            Text(
                text = "運動テンプレート",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = AccentOrange
            )
            Spacer(modifier = Modifier.height(8.dp))

            if (workoutTemplates.isEmpty()) {
                Text(
                    text = "テンプレートがありません",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                // 紐づけ済みテンプレート
                day.workouts.forEachIndexed { index, workout ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp))
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "[${index + 1}] ${workout.templateName}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        IconButton(
                            onClick = { onRemoveWorkoutTemplate(index) },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "削除",
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }

                // 追加ボタン
                var showWorkoutDropdown by remember { mutableStateOf(false) }

                ExposedDropdownMenuBox(
                    expanded = showWorkoutDropdown,
                    onExpandedChange = { showWorkoutDropdown = it }
                ) {
                    OutlinedButton(
                        onClick = { showWorkoutDropdown = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentOrange)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("追加", style = MaterialTheme.typography.bodySmall)
                    }

                    ExposedDropdownMenu(
                        expanded = showWorkoutDropdown,
                        onDismissRequest = { showWorkoutDropdown = false },
                        modifier = Modifier.background(MaterialTheme.colorScheme.surfaceContainer)
                    ) {
                        workoutTemplates.forEach { template ->
                            DropdownMenuItem(
                                text = { Text(template.name, color = MaterialTheme.colorScheme.onSurface) },
                                onClick = {
                                    onAddWorkoutTemplate(template.id)
                                    showWorkoutDropdown = false
                                }
                            )
                        }
                    }
                }
            }
        }

        // ヒント
        Text(
            text = "同じテンプレートを複数回追加できます",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
