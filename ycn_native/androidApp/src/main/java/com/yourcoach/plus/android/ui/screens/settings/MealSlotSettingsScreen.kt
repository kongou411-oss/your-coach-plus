package com.yourcoach.plus.android.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
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
import com.google.firebase.auth.FirebaseAuth
import com.yourcoach.plus.android.data.repository.FirestoreMealRepository
import com.yourcoach.plus.android.data.repository.FirestoreUserRepository
import com.yourcoach.plus.android.data.repository.FirestoreWorkoutRepository
import com.yourcoach.plus.android.ui.theme.*
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel

/**
 * スロット設定画面のUI状態
 */
data class MealSlotSettingsUiState(
    val isLoading: Boolean = true,
    val mealsPerDay: Int = 5,
    val mealSlotConfig: MealSlotConfig = MealSlotConfig(),
    val workoutSlotConfig: WorkoutSlotConfig = WorkoutSlotConfig(),
    val routineTemplateConfig: RoutineTemplateConfig = RoutineTemplateConfig(),
    val mealTemplates: List<MealTemplate> = emptyList(),
    val workoutTemplates: List<WorkoutTemplate> = emptyList(),
    val routineDays: List<RoutineDay> = emptyList(),
    // タイムライン設定
    val wakeUpTime: String = "07:00",
    val sleepTime: String = "23:00",
    val trainingTime: String? = "17:00",  // デフォルト17時
    val trainingAfterMeal: Int? = null,
    val trainingDuration: Int = 120,  // トレーニング所要時間（分）デフォルト2時間
    val trainingStyle: com.yourcoach.plus.shared.domain.model.TrainingStyle = com.yourcoach.plus.shared.domain.model.TrainingStyle.PUMP,
    val error: String? = null,
    val successMessage: String? = null
)

/**
 * スロット設定画面のViewModel
 */
class MealSlotSettingsViewModel(
    private val userRepository: FirestoreUserRepository = FirestoreUserRepository(),
    private val mealRepository: FirestoreMealRepository = FirestoreMealRepository(),
    private val workoutRepository: FirestoreWorkoutRepository = FirestoreWorkoutRepository(),
    private val routineRepository: RoutineRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MealSlotSettingsUiState())
    val uiState: StateFlow<MealSlotSettingsUiState> = _uiState.asStateFlow()

    private val currentUserId: String?
        get() = FirebaseAuth.getInstance().currentUser?.uid

    init {
        loadData()
    }

    fun loadData() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // ユーザープロファイルから設定取得
            userRepository.getUserProfile(userId)
                .onSuccess { profile ->
                    val mealsPerDay = profile?.mealsPerDay ?: 5
                    val mealConfig = profile?.mealSlotConfig ?: MealSlotConfig.createDefault(mealsPerDay)
                    val workoutConfig = profile?.workoutSlotConfig ?: WorkoutSlotConfig()
                    val routineConfig = profile?.routineTemplateConfig ?: RoutineTemplateConfig()

                    // mealsPerDayに合わせてスロットを調整
                    val adjustedMealConfig = if (mealConfig.slots.isEmpty() || mealConfig.mealsPerDay != mealsPerDay) {
                        MealSlotConfig.createDefault(mealsPerDay)
                    } else {
                        mealConfig
                    }

                    _uiState.update {
                        it.copy(
                            mealsPerDay = mealsPerDay,
                            mealSlotConfig = adjustedMealConfig,
                            workoutSlotConfig = workoutConfig,
                            routineTemplateConfig = routineConfig,
                            // タイムライン設定（デフォルト値を設定）
                            wakeUpTime = profile?.wakeUpTime ?: "07:00",
                            sleepTime = profile?.sleepTime ?: "23:00",
                            trainingTime = profile?.trainingTime ?: "17:00",
                            trainingAfterMeal = profile?.trainingAfterMeal ?: 3,
                            trainingDuration = profile?.trainingDuration ?: 120,
                            trainingStyle = profile?.trainingStyle ?: com.yourcoach.plus.shared.domain.model.TrainingStyle.PUMP
                        )
                    }
                }
                .onFailure {
                    _uiState.update { it.copy(error = "設定の読み込みに失敗しました") }
                }

            // 食事テンプレート取得
            mealRepository.getMealTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(mealTemplates = templates) }
                }

            // 運動テンプレート取得
            workoutRepository.getWorkoutTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(workoutTemplates = templates) }
                }

            // ルーティン取得
            routineRepository.getActivePattern(userId)
                .onSuccess { pattern ->
                    if (pattern != null) {
                        _uiState.update { it.copy(routineDays = pattern.days) }
                    }
                }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun setRoutineTemplateMapping(
        routineId: String,
        routineName: String,
        slotNumber: Int,
        templateId: String,
        templateName: String
    ) {
        val currentRoutineConfig = _uiState.value.routineTemplateConfig
        val newRoutineConfig = currentRoutineConfig.setMapping(
            routineId, routineName, slotNumber, templateId, templateName
        )
        _uiState.update { it.copy(routineTemplateConfig = newRoutineConfig) }
        saveConfig()
    }

    fun removeRoutineTemplateMapping(routineId: String, slotNumber: Int) {
        val currentRoutineConfig = _uiState.value.routineTemplateConfig
        val newRoutineConfig = currentRoutineConfig.removeMapping(routineId, slotNumber)
        _uiState.update { it.copy(routineTemplateConfig = newRoutineConfig) }
        saveConfig()
    }

    fun resetToDefault() {
        val mealsPerDay = _uiState.value.mealsPerDay
        _uiState.update {
            it.copy(
                mealSlotConfig = MealSlotConfig.createDefault(mealsPerDay),
                workoutSlotConfig = WorkoutSlotConfig(),
                routineTemplateConfig = RoutineTemplateConfig()
            )
        }
        saveConfig()
        _uiState.update { it.copy(successMessage = "デフォルト設定に戻しました") }
    }

    // タイムライン設定更新
    fun updateWakeUpTime(time: String) {
        _uiState.update { it.copy(wakeUpTime = time) }
        saveTimelineConfig()
    }

    fun updateSleepTime(time: String) {
        _uiState.update { it.copy(sleepTime = time) }
        saveTimelineConfig()
    }

    fun updateTrainingTime(time: String?) {
        _uiState.update { it.copy(trainingTime = time) }
        saveTimelineConfig()
    }

    fun updateTrainingAfterMeal(mealNumber: Int?) {
        _uiState.update { it.copy(trainingAfterMeal = mealNumber) }
        saveTimelineConfig()
    }

    fun updateTrainingDuration(minutes: Int) {
        _uiState.update { it.copy(trainingDuration = minutes) }
        saveTimelineConfig()
    }

    fun updateTrainingStyle(style: com.yourcoach.plus.shared.domain.model.TrainingStyle) {
        _uiState.update { it.copy(trainingStyle = style) }
        saveTimelineConfig()
    }

    /**
     * タイムライン型ルーティンを生成して適用
     */
    fun generateTimelineRoutine() {
        val state = _uiState.value
        val newConfig = MealSlotConfig.createTimelineRoutine(
            mealsPerDay = state.mealsPerDay,
            trainingAfterMeal = state.trainingAfterMeal
        )
        _uiState.update { it.copy(mealSlotConfig = newConfig) }
        saveConfig()
        _uiState.update { it.copy(successMessage = "タイムラインを生成しました") }
    }

    private fun saveTimelineConfig() {
        val userId = currentUserId ?: return
        val state = _uiState.value

        viewModelScope.launch {
            userRepository.updateTimelineConfig(
                userId,
                wakeUpTime = state.wakeUpTime,
                sleepTime = state.sleepTime,
                trainingTime = state.trainingTime,
                trainingAfterMeal = state.trainingAfterMeal,
                trainingDuration = state.trainingDuration,
                trainingStyle = state.trainingStyle.name
            )
        }
    }

    private fun saveConfig() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            userRepository.updateSlotConfig(
                userId,
                _uiState.value.mealSlotConfig,
                _uiState.value.workoutSlotConfig,
                _uiState.value.routineTemplateConfig
            )
                .onSuccess {
                    _uiState.update { it.copy(successMessage = "保存しました") }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "保存に失敗しました: ${e.message}") }
                }
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
 * スロット設定画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealSlotSettingsScreen(
    viewModel: MealSlotSettingsViewModel = koinViewModel(),
    onNavigateBack: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showResetDialog by remember { mutableStateOf(false) }

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
                title = { Text("クエスト連動設定") },
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
                                Icon(
                                    Icons.Default.Info,
                                    contentDescription = null,
                                    tint = Primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "クエスト連動設定",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "タイムラインの時刻設定とルーティン連動テンプレートを管理できます。",
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
                        onWakeUpTimeChange = { viewModel.updateWakeUpTime(it) },
                        onSleepTimeChange = { viewModel.updateSleepTime(it) },
                        onTrainingTimeChange = { viewModel.updateTrainingTime(it) },
                        onTrainingAfterMealChange = { viewModel.updateTrainingAfterMeal(it) },
                        onTrainingDurationChange = { viewModel.updateTrainingDuration(it) },
                        onTrainingStyleChange = { viewModel.updateTrainingStyle(it) },
                        onGenerateTimeline = { viewModel.generateTimelineRoutine() }
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
}

/**
 * タイムライン設定セクション
 */
@Composable
private fun TimelineSettingsSection(
    wakeUpTime: String,
    sleepTime: String,
    trainingTime: String?,
    trainingAfterMeal: Int?,
    trainingDuration: Int,
    trainingStyle: com.yourcoach.plus.shared.domain.model.TrainingStyle,
    mealsPerDay: Int,
    onWakeUpTimeChange: (String) -> Unit,
    onSleepTimeChange: (String) -> Unit,
    onTrainingTimeChange: (String?) -> Unit,
    onTrainingAfterMealChange: (Int?) -> Unit,
    onTrainingDurationChange: (Int) -> Unit,
    onTrainingStyleChange: (com.yourcoach.plus.shared.domain.model.TrainingStyle) -> Unit,
    onGenerateTimeline: () -> Unit
) {
    var showWakeTimePicker by remember { mutableStateOf(false) }
    var showSleepTimePicker by remember { mutableStateOf(false) }
    var showTrainingTimePicker by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Schedule,
                    contentDescription = null,
                    tint = Primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "タイムライン設定",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(
                text = "起床・就寝・トレーニング時刻を設定すると、食事の推奨タイミングが自動生成されます。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // 起床時刻
            TimePickerRow(
                label = "起床",
                time = wakeUpTime,
                onClick = { showWakeTimePicker = true }
            )

            // 就寝時刻
            TimePickerRow(
                label = "就寝",
                time = sleepTime,
                onClick = { showSleepTimePicker = true }
            )
            Text(
                text = "睡眠は8〜9時間を推奨",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 40.dp, top = 4.dp)
            )

            // トレーニング時刻
            TimePickerRow(
                label = "トレーニング",
                time = trainingTime ?: "未設定",
                onClick = { showTrainingTimePicker = true },
                onClear = if (trainingTime != null) {{ onTrainingTimeChange(null) }} else null
            )

            // トレーニング前の食事番号
            if (trainingTime != null) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    var showTrainingMealHelp by remember { mutableStateOf(false) }
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "トレーニング前食事",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        IconButton(
                            onClick = { showTrainingMealHelp = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "ヘルプ",
                                modifier = Modifier.size(18.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    if (showTrainingMealHelp) {
                        AlertDialog(
                            onDismissRequest = { showTrainingMealHelp = false },
                            confirmButton = {
                                TextButton(onClick = { showTrainingMealHelp = false }) {
                                    Text("OK")
                                }
                            },
                            title = { Text("トレーニング前食事") },
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
                                onClick = {
                                    onTrainingAfterMealChange(if (trainingAfterMeal == mealNum) null else mealNum)
                                },
                                label = { Text("$mealNum") }
                            )
                        }
                    }
                }

                // トレーニング所要時間
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "トレーニング時間",
                        style = MaterialTheme.typography.bodyMedium
                    )
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

                // トレーニングスタイル（パワー/パンプ）
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    var showStyleHelp by remember { mutableStateOf(false) }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "トレーニングスタイル",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        IconButton(
                            onClick = { showStyleHelp = true },
                            modifier = Modifier.size(32.dp)
                        ) {
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
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        com.yourcoach.plus.shared.domain.model.TrainingStyle.entries.forEach { style ->
                            FilterChip(
                                selected = trainingStyle == style,
                                onClick = { onTrainingStyleChange(style) },
                                label = {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(style.displayName)
                                        Text(
                                            text = "${style.repsPerSet}回/セット",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            )
                        }
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

    // TimePicker Dialogs
    if (showWakeTimePicker) {
        TimePickerDialog(
            initialTime = wakeUpTime,
            onDismiss = { showWakeTimePicker = false },
            onConfirm = { time ->
                onWakeUpTimeChange(time)
                showWakeTimePicker = false
            }
        )
    }

    if (showSleepTimePicker) {
        TimePickerDialog(
            initialTime = sleepTime,
            onDismiss = { showSleepTimePicker = false },
            onConfirm = { time ->
                onSleepTimeChange(time)
                showSleepTimePicker = false
            }
        )
    }

    if (showTrainingTimePicker) {
        TimePickerDialog(
            initialTime = trainingTime ?: "18:00",
            onDismiss = { showTrainingTimePicker = false },
            onConfirm = { time ->
                onTrainingTimeChange(time)
                showTrainingTimePicker = false
            }
        )
    }
}

/**
 * 時刻設定行
 */
@Composable
private fun TimePickerRow(
    label: String,
    time: String,
    onClick: () -> Unit,
    onClear: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = time,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = Primary
            )
            if (onClear != null) {
                IconButton(
                    onClick = onClear,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "クリア",
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

/**
 * 時刻選択ダイアログ
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerDialog(
    initialTime: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    val parts = initialTime.split(":")
    val initialHour = parts.getOrNull(0)?.toIntOrNull() ?: 12
    val initialMinute = parts.getOrNull(1)?.toIntOrNull() ?: 0

    val timePickerState = rememberTimePickerState(
        initialHour = initialHour,
        initialMinute = initialMinute,
        is24Hour = true
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("時刻を選択") },
        text = {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                TimePicker(state = timePickerState)
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val time = "%02d:%02d".format(timePickerState.hour, timePickerState.minute)
                    onConfirm(time)
                }
            ) {
                Text("OK")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}
