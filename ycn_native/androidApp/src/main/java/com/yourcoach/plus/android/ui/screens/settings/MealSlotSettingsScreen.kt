package com.yourcoach.plus.android.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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

    fun updateMealSlotMode(slotNumber: Int, mode: SlotMode, templateId: String? = null, templateName: String? = null) {
        val currentConfig = _uiState.value.mealSlotConfig
        val newConfig = currentConfig.updateSlot(slotNumber, mode, templateId, templateName)
        _uiState.update { it.copy(mealSlotConfig = newConfig) }
        saveConfig()
    }

    fun updateWorkoutSlotMode(mode: SlotMode, templateId: String? = null, templateName: String? = null) {
        val currentConfig = _uiState.value.workoutSlotConfig
        val newConfig = currentConfig.updateSlot(mode, templateId, templateName)
        _uiState.update { it.copy(workoutSlotConfig = newConfig) }
        saveConfig()
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
     * 食事スロットの優先択（A/B/C）を更新
     */
    fun updateSlotFoodChoice(slotNumber: Int, foodChoice: FoodChoice) {
        val currentConfig = _uiState.value.mealSlotConfig
        val updatedSlots = currentConfig.slots.map { slot ->
            if (slot.slotNumber == slotNumber) {
                slot.copy(defaultFoodChoice = foodChoice)
            } else {
                slot
            }
        }
        val newConfig = currentConfig.copy(slots = updatedSlots)
        _uiState.update { it.copy(mealSlotConfig = newConfig) }
        saveConfig()
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
    var showMealSlotEditDialog by remember { mutableStateOf<Int?>(null) }
    var showWorkoutSlotEditDialog by remember { mutableStateOf(false) }

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
                                text = "各食事・運動を「固定テンプレート」「AI提案」「ルーティン連動」から選択できます。",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                // モード説明
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ModeChip(
                            label = "固定",
                            description = "テンプレート使用",
                            color = ScoreCarbs,
                            modifier = Modifier.weight(1f)
                        )
                        ModeChip(
                            label = "AI提案",
                            description = "目標に合わせて提案",
                            color = Primary,
                            modifier = Modifier.weight(1f)
                        )
                        ModeChip(
                            label = "ルーティン連動",
                            description = "部位に合わせて変更",
                            color = AccentOrange,
                            modifier = Modifier.weight(1f)
                        )
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

                // 食事スロット設定
                item {
                    Text(
                        text = "食事設定（${uiState.mealsPerDay}食）",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                items(uiState.mealSlotConfig.slots.sortedBy { it.slotNumber }) { slot ->
                    MealSlotCard(
                        slot = slot,
                        onEditClick = { showMealSlotEditDialog = slot.slotNumber },
                        onFoodChoiceChange = { choice ->
                            viewModel.updateSlotFoodChoice(slot.slotNumber, choice)
                        }
                    )
                }

                // 運動スロット設定
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "運動設定",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                item {
                    WorkoutSlotCard(
                        slot = uiState.workoutSlotConfig.slot,
                        onEditClick = { showWorkoutSlotEditDialog = true }
                    )
                }

                // ルーティン連動設定セクション
                val routineLinkedMealSlots = uiState.mealSlotConfig.getRoutineLinkedSlots()
                val workoutIsRoutineLinked = uiState.workoutSlotConfig.slot.routineLinked
                if ((routineLinkedMealSlots.isNotEmpty() || workoutIsRoutineLinked) && uiState.routineDays.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "ルーティン別テンプレート設定",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "トレーニング部位ごとに使用するテンプレートを設定",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    val trainingDays = uiState.routineDays.filter { !it.isRestDay }
                    items(trainingDays) { day ->
                        RoutineDayMappingCard(
                            day = day,
                            routineLinkedMealSlots = routineLinkedMealSlots,
                            workoutIsRoutineLinked = workoutIsRoutineLinked,
                            currentMappings = uiState.routineTemplateConfig.getMappingsForRoutine(day.id),
                            mealTemplates = uiState.mealTemplates,
                            workoutTemplates = uiState.workoutTemplates,
                            onSetMealMapping = { slotNumber, templateId, templateName ->
                                viewModel.setRoutineTemplateMapping(
                                    day.id, day.splitType, slotNumber, templateId, templateName
                                )
                            },
                            onSetWorkoutMapping = { templateId, templateName ->
                                viewModel.setRoutineTemplateMapping(
                                    day.id, day.splitType, RoutineTemplateMapping.WORKOUT_SLOT, templateId, templateName
                                )
                            },
                            onRemoveMapping = { slotNumber ->
                                viewModel.removeRoutineTemplateMapping(day.id, slotNumber)
                            }
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(60.dp)) }
            }
        }
    }

    // 食事スロット編集ダイアログ
    showMealSlotEditDialog?.let { slotNumber ->
        val slot = uiState.mealSlotConfig.getSlot(slotNumber)
        SlotEditDialog(
            title = "食事${slotNumber}の設定",
            currentMode = slot?.mode ?: SlotMode.AI,
            currentTemplateId = slot?.templateId,
            currentTemplateName = slot?.templateName,
            templates = uiState.mealTemplates.map { it.id to it.name },
            templateDetails = uiState.mealTemplates.associate { it.id to "P${it.totalProtein.toInt()}g F${it.totalFat.toInt()}g C${it.totalCarbs.toInt()}g" },
            onDismiss = { showMealSlotEditDialog = null },
            onConfirm = { mode, templateId, templateName ->
                viewModel.updateMealSlotMode(slotNumber, mode, templateId, templateName)
                showMealSlotEditDialog = null
            }
        )
    }

    // 運動スロット編集ダイアログ
    if (showWorkoutSlotEditDialog) {
        val slot = uiState.workoutSlotConfig.slot
        SlotEditDialog(
            title = "運動の設定",
            currentMode = slot.mode,
            currentTemplateId = slot.templateId,
            currentTemplateName = slot.templateName,
            templates = uiState.workoutTemplates.map { it.id to it.name },
            templateDetails = uiState.workoutTemplates.associate { it.id to "${it.estimatedDuration}分 ${it.estimatedCalories}kcal" },
            onDismiss = { showWorkoutSlotEditDialog = false },
            onConfirm = { mode, templateId, templateName ->
                viewModel.updateWorkoutSlotMode(mode, templateId, templateName)
                showWorkoutSlotEditDialog = false
            }
        )
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

@Composable
private fun ModeChip(
    label: String,
    description: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = description,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun MealSlotCard(
    slot: MealSlot,
    onEditClick: () -> Unit,
    onFoodChoiceChange: (FoodChoice) -> Unit = {}
) {
    var showFoodChoiceMenu by remember { mutableStateOf(false) }
    val mode = slot.mode
    val modeColor = when (mode) {
        SlotMode.FIXED -> ScoreCarbs
        SlotMode.AI -> Primary
        SlotMode.ROUTINE_LINKED -> AccentOrange
    }
    val foodChoiceColor = when (slot.defaultFoodChoice) {
        FoodChoice.KITCHEN -> ScoreProtein
        FoodChoice.STORE -> ScoreGL
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Restaurant,
                contentDescription = null,
                tint = ScoreCarbs,
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = slot.getDisplayName(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // モードラベル
                    Surface(
                        color = modeColor.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = mode.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = modeColor,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    // 優先択（A/B/C）ラベル - タップで変更可能
                    Box {
                        Surface(
                            color = foodChoiceColor.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.clickable { showFoodChoiceMenu = true }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = when (slot.defaultFoodChoice) {
                                        FoodChoice.KITCHEN -> "自炊"
                                        FoodChoice.STORE -> "中食"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    color = foodChoiceColor,
                                    fontWeight = FontWeight.Bold
                                )
                                Icon(
                                    Icons.Default.ArrowDropDown,
                                    contentDescription = null,
                                    tint = foodChoiceColor,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                        DropdownMenu(
                            expanded = showFoodChoiceMenu,
                            onDismissRequest = { showFoodChoiceMenu = false }
                        ) {
                            FoodChoice.entries.forEach { choice ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            text = choice.displayName,
                                            color = when (choice) {
                                                FoodChoice.KITCHEN -> ScoreProtein
                                                FoodChoice.STORE -> ScoreGL
                                            }
                                        )
                                    },
                                    onClick = {
                                        onFoodChoiceChange(choice)
                                        showFoodChoiceMenu = false
                                    }
                                )
                            }
                        }
                    }
                    val templateNameDisplay = slot.templateName
                    if (mode == SlotMode.FIXED && templateNameDisplay != null) {
                        Text(
                            text = templateNameDisplay,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            IconButton(onClick = onEditClick) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = "編集",
                    tint = Primary
                )
            }
        }
    }
}

@Composable
private fun WorkoutSlotCard(
    slot: WorkoutSlot,
    onEditClick: () -> Unit
) {
    val mode = slot.mode
    val modeColor = when (mode) {
        SlotMode.FIXED -> ScoreCarbs
        SlotMode.AI -> Primary
        SlotMode.ROUTINE_LINKED -> AccentOrange
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = AccentOrange.copy(alpha = 0.05f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.FitnessCenter,
                contentDescription = null,
                tint = AccentOrange,
                modifier = Modifier.size(24.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "運動",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = modeColor.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = mode.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = modeColor,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                    val templateNameDisplay = slot.templateName
                    if (mode == SlotMode.FIXED && templateNameDisplay != null) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = templateNameDisplay,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            IconButton(onClick = onEditClick) {
                Icon(
                    Icons.Default.Edit,
                    contentDescription = "編集",
                    tint = Primary
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SlotEditDialog(
    title: String,
    currentMode: SlotMode,
    currentTemplateId: String?,
    currentTemplateName: String?,
    templates: List<Pair<String, String>>,  // id to name
    templateDetails: Map<String, String>,    // id to details string
    onDismiss: () -> Unit,
    onConfirm: (SlotMode, String?, String?) -> Unit
) {
    var selectedMode by remember { mutableStateOf(currentMode) }
    var selectedTemplateId by remember { mutableStateOf(currentTemplateId) }
    var selectedTemplateName by remember { mutableStateOf(currentTemplateName) }
    var showTemplateDropdown by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(
                    text = "モード",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )

                SlotMode.entries.forEach { mode ->
                    val modeColor = when (mode) {
                        SlotMode.FIXED -> ScoreCarbs
                        SlotMode.AI -> Primary
                        SlotMode.ROUTINE_LINKED -> AccentOrange
                    }

                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { selectedMode = mode }
                            .then(
                                if (selectedMode == mode)
                                    Modifier.border(2.dp, modeColor, RoundedCornerShape(8.dp))
                                else Modifier
                            ),
                        color = if (selectedMode == mode)
                            modeColor.copy(alpha = 0.1f)
                        else
                            MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedMode == mode,
                                onClick = { selectedMode = mode },
                                colors = RadioButtonDefaults.colors(selectedColor = modeColor)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = mode.displayName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = when (mode) {
                                        SlotMode.FIXED -> "毎回同じテンプレートを使用"
                                        SlotMode.AI -> "目標に合わせてAIが提案"
                                        SlotMode.ROUTINE_LINKED -> "トレーニング部位に応じて変更"
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                if (selectedMode == SlotMode.FIXED) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "使用するテンプレート",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )

                    if (templates.isEmpty()) {
                        Text(
                            text = "テンプレートがありません。先にテンプレートを作成してください。",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    } else {
                        ExposedDropdownMenuBox(
                            expanded = showTemplateDropdown,
                            onExpandedChange = { showTemplateDropdown = it }
                        ) {
                            OutlinedTextField(
                                value = selectedTemplateName ?: "テンプレートを選択",
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showTemplateDropdown) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor()
                            )

                            ExposedDropdownMenu(
                                expanded = showTemplateDropdown,
                                onDismissRequest = { showTemplateDropdown = false }
                            ) {
                                templates.forEach { (id, name) ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Text(name)
                                                templateDetails[id]?.let { details ->
                                                    Text(
                                                        text = details,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                                    )
                                                }
                                            }
                                        },
                                        onClick = {
                                            selectedTemplateId = id
                                            selectedTemplateName = name
                                            showTemplateDropdown = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val templateId = if (selectedMode == SlotMode.FIXED) selectedTemplateId else null
                    val templateName = if (selectedMode == SlotMode.FIXED) selectedTemplateName else null
                    onConfirm(selectedMode, templateId, templateName)
                },
                enabled = selectedMode != SlotMode.FIXED || selectedTemplateId != null
            ) {
                Text("保存")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoutineDayMappingCard(
    day: RoutineDay,
    routineLinkedMealSlots: List<MealSlot>,
    workoutIsRoutineLinked: Boolean,
    currentMappings: List<RoutineTemplateMapping>,
    mealTemplates: List<MealTemplate>,
    workoutTemplates: List<WorkoutTemplate>,
    onSetMealMapping: (Int, String, String) -> Unit,
    onSetWorkoutMapping: (String, String) -> Unit,
    onRemoveMapping: (Int) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = AccentOrange.copy(alpha = 0.05f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.FitnessCenter,
                    contentDescription = null,
                    tint = AccentOrange,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "${day.splitType}の日",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 食事マッピング
            routineLinkedMealSlots.forEach { slot ->
                val mapping = currentMappings.find { it.slotNumber == slot.slotNumber }
                var showDropdown by remember { mutableStateOf(false) }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = slot.getDisplayName(),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.width(60.dp)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    if (mealTemplates.isEmpty()) {
                        Text(
                            text = "テンプレートなし",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        ExposedDropdownMenuBox(
                            expanded = showDropdown,
                            onExpandedChange = { showDropdown = it },
                            modifier = Modifier.weight(1f)
                        ) {
                            OutlinedTextField(
                                value = mapping?.templateName ?: "未設定",
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showDropdown) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                textStyle = MaterialTheme.typography.bodySmall
                            )

                            ExposedDropdownMenu(
                                expanded = showDropdown,
                                onDismissRequest = { showDropdown = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("未設定（AI提案）") },
                                    onClick = {
                                        onRemoveMapping(slot.slotNumber)
                                        showDropdown = false
                                    }
                                )
                                HorizontalDivider()
                                mealTemplates.forEach { template ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Text(template.name)
                                                Text(
                                                    text = "P${template.totalProtein.toInt()}g F${template.totalFat.toInt()}g C${template.totalCarbs.toInt()}g",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        },
                                        onClick = {
                                            onSetMealMapping(slot.slotNumber, template.id, template.name)
                                            showDropdown = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 運動マッピング
            if (workoutIsRoutineLinked) {
                val workoutMapping = currentMappings.find { it.slotNumber == RoutineTemplateMapping.WORKOUT_SLOT }
                var showWorkoutDropdown by remember { mutableStateOf(false) }

                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "運動",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        color = AccentOrange,
                        modifier = Modifier.width(60.dp)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    if (workoutTemplates.isEmpty()) {
                        Text(
                            text = "テンプレートなし",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        ExposedDropdownMenuBox(
                            expanded = showWorkoutDropdown,
                            onExpandedChange = { showWorkoutDropdown = it },
                            modifier = Modifier.weight(1f)
                        ) {
                            OutlinedTextField(
                                value = workoutMapping?.templateName ?: "未設定",
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showWorkoutDropdown) },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .menuAnchor(),
                                textStyle = MaterialTheme.typography.bodySmall
                            )

                            ExposedDropdownMenu(
                                expanded = showWorkoutDropdown,
                                onDismissRequest = { showWorkoutDropdown = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("未設定（AI提案）") },
                                    onClick = {
                                        onRemoveMapping(RoutineTemplateMapping.WORKOUT_SLOT)
                                        showWorkoutDropdown = false
                                    }
                                )
                                HorizontalDivider()
                                workoutTemplates.forEach { template ->
                                    DropdownMenuItem(
                                        text = {
                                            Column {
                                                Text(template.name)
                                                Text(
                                                    text = "${template.estimatedDuration}分 ${template.estimatedCalories}kcal",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        },
                                        onClick = {
                                            onSetWorkoutMapping(template.id, template.name)
                                            showWorkoutDropdown = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
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
                text = "起床・就寝・トレーニング時刻を設定すると、食事の推奨タイミングとA/B択が自動生成されます。",
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
                    Text(
                        text = "トレ前食事",
                        style = MaterialTheme.typography.bodyMedium
                    )
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
                    Text(
                        text = "トレーニングスタイル",
                        style = MaterialTheme.typography.bodyMedium
                    )
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
