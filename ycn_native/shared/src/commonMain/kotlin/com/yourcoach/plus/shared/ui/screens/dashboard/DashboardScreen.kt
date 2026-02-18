package com.yourcoach.plus.shared.ui.screens.dashboard

import kotlin.math.roundToInt
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import com.yourcoach.plus.shared.data.database.ExerciseDatabase
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.ui.components.*
import com.yourcoach.plus.shared.ui.screens.main.LocalBottomBarStateUpdater
import com.yourcoach.plus.shared.ui.screens.main.LocalMainNavigator
import com.yourcoach.plus.shared.ui.screens.analysis.AnalysisScreen
import com.yourcoach.plus.shared.ui.screens.meal.AddMealScreen
import com.yourcoach.plus.shared.ui.screens.workout.AddWorkoutScreen
import com.yourcoach.plus.shared.ui.theme.*

/**
 * ダッシュボード画面 (Compose Multiplatform版)
 * Android版と同等の完全機能を持つKMP実装
 */
class DashboardScreen : Screen {

    companion object {
        /** 他画面からタブ切替を要求するためのState（0=クエスト, 1=レコード） */
        val pendingTabIndex = mutableStateOf<Int?>(null)
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<DashboardScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalMainNavigator.current
        val snackbarHostState = remember { SnackbarHostState() }
        var showMicroDetailDialog by remember { mutableStateOf(false) }
        val updateBottomBar = LocalBottomBarStateUpdater.current

        // MainScreenのExpandableBottomBarに状態を反映
        val expProgress = uiState.user?.profile?.calculateExpProgress()
        LaunchedEffect(
            expProgress, uiState.isGeneratingQuest, uiState.customQuest
        ) {
            updateBottomBar(BottomBarState(
                level = expProgress?.level ?: 1,
                expCurrent = expProgress?.expCurrent ?: 0,
                expRequired = expProgress?.expRequired ?: 100,
                progressPercent = expProgress?.progressPercent ?: 0,
                freeCredits = uiState.user?.freeCredits ?: 0,
                paidCredits = uiState.user?.paidCredits ?: 0,
                isPremium = uiState.user?.isEffectivePremium ?: false,
                onAnalysisClick = { navigator?.push(AnalysisScreen()) },
                onGenerateQuestClick = { screenModel.generateQuest() },
                isGeneratingQuest = uiState.isGeneratingQuest,
                hasCustomQuest = uiState.customQuest != null
            ))
        }

        // エラー表示
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
            }
        }

        // 成功メッセージ表示
        LaunchedEffect(uiState.successMessage) {
            uiState.successMessage?.let { message ->
                snackbarHostState.showSnackbar(message)
                screenModel.clearSuccessMessage()
            }
        }

        // クエスト生成エラー表示
        LaunchedEffect(uiState.questGenerationError) {
            uiState.questGenerationError?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearQuestGenerationError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    // MainScreenがBottomNavを管理するため、topのみ適用
                    .padding(top = paddingValues.calculateTopPadding())
            ) {
                PullToRefreshBox(
                    isRefreshing = uiState.isLoading,
                    onRefresh = screenModel::refresh,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                            // 日付セレクター
                            DateSelector(
                                dateDisplay = uiState.dateDisplay,
                                isToday = uiState.isToday,
                                onPreviousDay = screenModel::goToPreviousDay,
                                onNextDay = screenModel::goToNextDay,
                                onToday = screenModel::goToToday
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            // Zone 1: HUDヘッダー（固定）
                            HudHeader(
                                routineDay = uiState.todayRoutine,
                                calories = uiState.totalCalories to uiState.targetCalories,
                                protein = uiState.totalProtein to uiState.targetProtein,
                                fat = uiState.totalFat to uiState.targetFat,
                                carbs = uiState.totalCarbs to uiState.targetCarbs,
                                microIndicators = uiState.microIndicators,
                                onMicroIndicatorClick = { showMicroDetailDialog = true }
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // タブ: クエスト / レコード
                        var selectedTabIndex by remember { mutableStateOf(0) }
                        val tabs = listOf("クエスト", "レコード")

                        // 他画面からのタブ切替リクエストを監視
                        val pendingTab by pendingTabIndex
                        LaunchedEffect(pendingTab) {
                            pendingTab?.let {
                                selectedTabIndex = it
                                pendingTabIndex.value = null
                            }
                        }

                        TabRow(
                            selectedTabIndex = selectedTabIndex,
                            containerColor = MaterialTheme.colorScheme.surface,
                            contentColor = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        ) {
                            tabs.forEachIndexed { index, title ->
                                Tab(
                                    selected = selectedTabIndex == index,
                                    onClick = { selectedTabIndex = index },
                                    text = {
                                        Text(
                                            text = title,
                                            fontWeight = if (selectedTabIndex == index)
                                                FontWeight.Bold
                                            else
                                                FontWeight.Normal
                                        )
                                    }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // タブコンテンツ
                        when (selectedTabIndex) {
                            0 -> {
                                // クエストタブ: タイムライン形式（Android版と同等）
                                if (uiState.unifiedTimeline.isNotEmpty()) {
                                    UnifiedTimeline(
                                        items = uiState.unifiedTimeline,
                                        currentTimeMinutes = uiState.currentTimeMinutes,
                                        onItemClick = { item ->
                                            screenModel.onTimelineItemClick(item)
                                        },
                                        onRecordClick = { item ->
                                            if (item.type == TimelineItemType.WORKOUT && !item.isRecorded) {
                                                // 運動クエスト: テンプレートベースの完了シートを表示
                                                screenModel.showWorkoutCompletionSheet(item)
                                            } else {
                                                // 食事・その他: 従来のトグル
                                                val directive = uiState.directive
                                                if (directive != null && item.directiveItemIndex != null) {
                                                    screenModel.toggleDirectiveItem(item.directiveItemIndex)
                                                }
                                            }
                                        },
                                        modifier = Modifier
                                            .weight(1f)
                                            .padding(horizontal = 16.dp)
                                    )
                                } else {
                                    // クエストが空の場合
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.AutoAwesome,
                                                contentDescription = null,
                                                modifier = Modifier.size(48.dp),
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                                            )
                                            Spacer(modifier = Modifier.height(12.dp))
                                            Text(
                                                text = "クエストがありません",
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Text(
                                                text = "下の「明日の指示書」ボタンでクエストを生成しましょう",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                                            )
                                        }
                                    }
                                }
                            }
                            1 -> {
                                // レコードタブ: 従来の手動記録セクション
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .verticalScroll(rememberScrollState())
                                        .padding(horizontal = 16.dp)
                                ) {
                                    // 食事セクション
                                    MealListSection(
                                        meals = uiState.meals,
                                        glLimit = uiState.glLimit,
                                        onAddMealClick = { navigator?.push(AddMealScreen(selectedDate = uiState.date)) },
                                        onEditMeal = { meal -> screenModel.showMealEditDialog(meal) },
                                        onDeleteMeal = screenModel::deleteMeal,
                                        onSaveAsTemplate = screenModel::saveMealAsTemplate
                                    )

                                    Spacer(modifier = Modifier.height(16.dp))

                                    // 運動セクション
                                    WorkoutListSection(
                                        workouts = uiState.workouts,
                                        todayRoutine = uiState.todayRoutine,
                                        isManualRestDay = uiState.isManualRestDay,
                                        onAddWorkoutClick = { navigator?.push(AddWorkoutScreen(selectedDate = uiState.date)) },
                                        onEditWorkout = { workout -> screenModel.showWorkoutEditDialog(workout) },
                                        onDeleteWorkout = screenModel::deleteWorkout,
                                        onSaveAsTemplate = screenModel::saveWorkoutAsTemplate,
                                        onExecuteRoutineWorkouts = screenModel::executeRoutineWorkouts,
                                        onToggleRestDay = screenModel::toggleRestDay
                                    )

                                    // RM記録セクション（運動セクション直下）
                                    if (uiState.latestRmRecords.isNotEmpty() || uiState.workouts.isNotEmpty()) {
                                        Spacer(modifier = Modifier.height(16.dp))
                                        RmRecordSection(
                                            rmRecords = uiState.latestRmRecords,
                                            onEditRm = { screenModel.showRmEditDialog(it) },
                                            onDeleteRm = { screenModel.deleteRmRecord(it) },
                                            onAddRm = { screenModel.showRmAddDialog() }
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    // コンディションセクション
                                    ConditionSection(
                                        condition = uiState.condition,
                                        onConditionChange = { updatedCondition ->
                                            screenModel.updateCondition(updatedCondition)
                                        },
                                        userId = uiState.user?.uid ?: "",
                                        date = uiState.date
                                    )

                                    Spacer(modifier = Modifier.height(24.dp))
                                }
                            }
                        }
                    }
                }

                // ローディングオーバーレイ
                val isAnyLoading = uiState.isLoading ||
                    uiState.isExecutingRoutine ||
                    uiState.isExecutingDirectiveItem ||
                    uiState.isGeneratingQuest

                if (isAnyLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.3f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(48.dp),
                                    color = Primary,
                                    strokeWidth = 4.dp
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = when {
                                        uiState.isGeneratingQuest -> "クエストを生成中..."
                                        uiState.isExecutingRoutine -> "ルーティンを実行中..."
                                        uiState.isExecutingDirectiveItem -> "記録を保存中..."
                                        else -> "読み込み中..."
                                    },
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        }

        // エラーダイアログ
        uiState.error?.let { error ->
            AlertDialog(
                onDismissRequest = { screenModel.clearError() },
                title = { Text("エラー") },
                text = { Text(error) },
                confirmButton = {
                    TextButton(onClick = { screenModel.clearError() }) {
                        Text("OK")
                    }
                }
            )
        }

        // Micro+詳細シート（Android版MicroDetailSheet完全一致）
        if (showMicroDetailDialog) {
            ModalBottomSheet(
                onDismissRequest = { showMicroDetailDialog = false },
                sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.9f)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 32.dp)
                ) {
                    Text(
                        text = "ミクロ+ 詳細",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )

                    DetailedNutritionSection(
                        isPremium = true,
                        averageDiaas = uiState.averageDiaas,
                        fattyAcidBalance = FattyAcidBalance(
                            saturated = uiState.saturatedFat,
                            mediumChain = uiState.mediumChainFat,
                            monounsaturated = uiState.monounsaturatedFat,
                            polyunsaturated = uiState.polyunsaturatedFat,
                            score = uiState.fattyAcidScore,
                            rating = uiState.fattyAcidRating,
                            label = uiState.fattyAcidLabel
                        ),
                        glData = GlData(
                            current = uiState.totalGL,
                            limit = uiState.glLimit,
                            score = uiState.glScore,
                            label = uiState.glLabel,
                            adjustedGL = uiState.adjustedGL,
                            bloodSugarRating = uiState.bloodSugarRating,
                            bloodSugarLabel = uiState.bloodSugarLabel,
                            highGIPercent = uiState.highGIPercent,
                            lowGIPercent = uiState.lowGIPercent,
                            glModifiers = uiState.glModifiers,
                            mealsPerDay = uiState.mealsPerDay,
                            mealGLLimit = uiState.mealGLLimit,
                            mealAbsoluteGLLimit = uiState.mealAbsoluteGLLimit
                        ),
                        fiberData = FiberData(
                            fiberAmount = uiState.totalFiber,
                            solubleFiber = uiState.totalSolubleFiber,
                            insolubleFiber = uiState.totalInsolubleFiber,
                            carbAmount = uiState.totalCarbs,
                            carbFiberRatio = uiState.carbFiberRatio,
                            targetCarbs = uiState.targetCarbs,
                            targetFiber = uiState.fiberTarget,
                            score = uiState.fiberScore,
                            rating = uiState.fiberRating,
                            label = uiState.fiberLabel
                        ),
                        vitaminScores = uiState.vitaminScores,
                        mineralScores = uiState.mineralScores,
                        onUpgradeClick = {},
                        alwaysExpanded = true
                    )
                }
            }
        }

        // お祝いダイアログ
        uiState.currentCelebration?.let { celebration ->
            AlertDialog(
                onDismissRequest = { screenModel.dismissCelebration() },
                title = {
                    Text(
                        text = when (celebration.type) {
                            CelebrationInfoType.LEVEL_UP -> "レベルアップ！"
                            CelebrationInfoType.BADGE_EARNED -> "バッジ獲得！"
                        },
                        fontWeight = FontWeight.Bold
                    )
                },
                text = {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        when (celebration.type) {
                            CelebrationInfoType.LEVEL_UP -> {
                                Text(
                                    text = "Level ${celebration.level}",
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "無料クレジット +${celebration.credits}",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = AccentOrange
                                )
                            }
                            CelebrationInfoType.BADGE_EARNED -> {
                                Text(
                                    text = celebration.badgeName ?: "バッジ",
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = AccentOrange
                                )
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { screenModel.dismissCelebration() }) {
                        Text("OK")
                    }
                }
            )
        }

        // 食事編集ダイアログ
        if (uiState.showMealEditDialog && uiState.editingMeal != null) {
            MealEditDialog(
                meal = uiState.editingMeal!!,
                onDismiss = { screenModel.hideMealEditDialog() },
                onSave = { updatedMeal -> screenModel.updateMeal(updatedMeal) },
                onDelete = {
                    screenModel.deleteMeal(uiState.editingMeal!!)
                    screenModel.hideMealEditDialog()
                }
            )
        }

        // 運動編集ダイアログ
        if (uiState.showWorkoutEditDialog && uiState.editingWorkout != null) {
            WorkoutEditDialog(
                workout = uiState.editingWorkout!!,
                onDismiss = { screenModel.hideWorkoutEditDialog() },
                onSave = { updatedWorkout -> screenModel.updateWorkout(updatedWorkout) },
                onDelete = {
                    screenModel.deleteWorkout(uiState.editingWorkout!!)
                    screenModel.hideWorkoutEditDialog()
                }
            )
        }

        // RM編集ダイアログ
        if (uiState.showRmEditDialog && uiState.editingRmRecord != null) {
            RmEditDialog(
                record = uiState.editingRmRecord!!,
                onDismiss = { screenModel.hideRmEditDialog() },
                onSave = { name, cat, w, r -> screenModel.updateRmRecord(name, cat, w, r) },
                onDelete = { screenModel.deleteRmRecord(uiState.editingRmRecord!!) }
            )
        }

        // RM追加ダイアログ
        if (uiState.showRmAddDialog) {
            RmAddDialog(
                onDismiss = { screenModel.hideRmAddDialog() },
                onSave = { name, cat, w, r -> screenModel.addRmRecord(name, cat, w, r) }
            )
        }

        // 運動クエスト完了シート
        if (uiState.showWorkoutCompletionSheet && uiState.workoutCompletionItem != null) {
            val splitLabel = uiState.todayRoutine?.splitType ?: ""
            val styleLabel = if (uiState.user?.profile?.trainingStyle?.name == "POWER") "パワー" else "パンプ"
            WorkoutCompletionSheet(
                item = uiState.workoutCompletionItem!!,
                exercises = uiState.workoutCompletionExercises,
                workoutDisplayName = "${splitLabel}トレーニング（$styleLabel）",
                onExercisesEdited = { edited -> screenModel.updateWorkoutCompletionExercises(edited) },
                onConfirm = { screenModel.confirmWorkoutCompletion() },
                onDismiss = { screenModel.dismissWorkoutCompletionSheet() }
            )
        }

        // クエスト項目詳細ダイアログ
        uiState.questDetailItem?.let { item ->
            QuestDetailDialog(
                item = item,
                onDismiss = { screenModel.dismissQuestDetail() }
            )
        }

        // 指示書編集ダイアログ
        if (uiState.showDirectiveEditDialog && uiState.directive != null) {
            DirectiveEditDialog(
                currentMessage = uiState.directive!!.message,
                onDismiss = { screenModel.hideDirectiveEditDialog() },
                onSave = { newMessage -> screenModel.updateDirective(newMessage) }
            )
        }

        // カロリーオーバーライドダイアログ
        if (uiState.showCalorieOverrideDialog) {
            CalorieOverrideDialog(
                onDismiss = { screenModel.hideCalorieOverrideDialog() },
                onApply = { override -> screenModel.applyCalorieOverride(override) },
                onClear = if (uiState.calorieOverride != null) {{ screenModel.clearCalorieOverride() }} else null
            )
        }
    }
}

// ========== 食事編集ダイアログ ==========

@Composable
private fun MealEditDialog(
    meal: Meal,
    onDismiss: () -> Unit,
    onSave: (Meal) -> Unit,
    onDelete: () -> Unit
) {
    var editedItems by remember { mutableStateOf(meal.items.toMutableList()) }
    var mealName by remember { mutableStateOf(meal.name ?: "") }

    val totalCalories = editedItems.sumOf { it.calories }
    val totalProtein = editedItems.sumOf { it.protein.roundToInt() }
    val totalCarbs = editedItems.sumOf { it.carbs.roundToInt() }
    val totalFat = editedItems.sumOf { it.fat.roundToInt() }
    val totalProteinF = editedItems.sumOf { it.protein.roundToInt() }.toFloat()
    val totalCarbsF = editedItems.sumOf { it.carbs.roundToInt() }.toFloat()
    val totalFatF = editedItems.sumOf { it.fat.roundToInt() }.toFloat()
    val totalFiber = editedItems.sumOf { it.fiber.toDouble() }.toFloat()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("食事を編集", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth().height(400.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = mealName,
                    onValueChange = { mealName = it },
                    label = { Text("食事名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("$totalCalories", fontWeight = FontWeight.Bold, color = ScoreCalories)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${totalProtein}g", fontWeight = FontWeight.Bold, color = ScoreProtein)
                            Text("P", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${totalCarbs}g", fontWeight = FontWeight.Bold, color = ScoreCarbs)
                            Text("C", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${totalFat}g", fontWeight = FontWeight.Bold, color = ScoreFat)
                            Text("F", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }

                Text("食品 (${editedItems.size}品)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)

                Column(
                    modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    editedItems.forEachIndexed { index, mealItem ->
                        MealItemEditCard(
                            item = mealItem,
                            onQuantityChange = { newAmount ->
                                val ratio = newAmount / mealItem.amount
                                val updatedItem = mealItem.copy(
                                    amount = newAmount,
                                    calories = (mealItem.calories * ratio).toInt(),
                                    protein = mealItem.protein * ratio,
                                    carbs = mealItem.carbs * ratio,
                                    fat = mealItem.fat * ratio,
                                    fiber = mealItem.fiber * ratio
                                )
                                editedItems = editedItems.toMutableList().apply { set(index, updatedItem) }
                            },
                            onDelete = {
                                editedItems = editedItems.toMutableList().apply { removeAt(index) }
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val updatedMeal = meal.copy(
                        name = mealName.ifBlank { null },
                        items = editedItems,
                        totalCalories = totalCalories,
                        totalProtein = totalProteinF,
                        totalCarbs = totalCarbsF,
                        totalFat = totalFatF,
                        totalFiber = totalFiber
                    )
                    onSave(updatedMeal)
                },
                enabled = editedItems.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) { Text("保存") }
        },
        dismissButton = {
            Row {
                TextButton(
                    onClick = onDelete,
                    colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))
                ) { Text("削除") }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(onClick = onDismiss) { Text("キャンセル") }
            }
        }
    )
}

@Composable
private fun MealItemEditCard(
    item: MealItem,
    onQuantityChange: (Float) -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium, maxLines = 1)
                Text("${item.calories}kcal P${item.protein.roundToInt()} C${item.carbs.roundToInt()} F${item.fat.roundToInt()}",
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { if (item.amount > 10) onQuantityChange(item.amount - 10f) }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Remove, null, modifier = Modifier.size(16.dp))
                }
                Text("${item.amount.toInt()}${item.unit}", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                IconButton(onClick = { onQuantityChange(item.amount + 10f) }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                }
                IconButton(onClick = onDelete, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Default.Close, null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

// ========== 運動編集ダイアログ ==========

@Composable
private fun WorkoutEditDialog(
    workout: Workout,
    onDismiss: () -> Unit,
    onSave: (Workout) -> Unit,
    onDelete: () -> Unit
) {
    var workoutName by remember { mutableStateOf(workout.name ?: "") }
    var workoutNote by remember { mutableStateOf(workout.note ?: "") }
    var editedExercises by remember { mutableStateOf(workout.exercises.toMutableList()) }

    val totalDuration = editedExercises.sumOf { it.duration ?: 0 }
    val totalCaloriesBurned = editedExercises.sumOf { it.caloriesBurned }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("運動を編集", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth().height(450.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = workoutName,
                    onValueChange = { workoutName = it },
                    label = { Text("運動名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = AccentOrange.copy(alpha = 0.1f))
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("$totalDuration", fontWeight = FontWeight.Bold, color = AccentOrange)
                            Text("分", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("$totalCaloriesBurned", fontWeight = FontWeight.Bold, color = AccentOrange)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${editedExercises.size}", fontWeight = FontWeight.Bold, color = AccentOrange)
                            Text("種目", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }

                Text("種目 (${editedExercises.size})", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)

                Column(
                    modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    editedExercises.forEachIndexed { index, exercise ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(exercise.name, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                                    val details = buildString {
                                        exercise.sets?.let { append("${it}セット ") }
                                        exercise.reps?.let { append("${it}回 ") }
                                        exercise.weight?.let { append("${it.toInt()}kg ") }
                                        append("${exercise.caloriesBurned}kcal")
                                    }
                                    Text(details, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                IconButton(
                                    onClick = { editedExercises = editedExercises.toMutableList().apply { removeAt(index) } },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(Icons.Default.Close, null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = workoutNote,
                    onValueChange = { workoutNote = it },
                    label = { Text("メモ") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 2
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val updatedWorkout = workout.copy(
                        name = workoutName.ifBlank { null },
                        note = workoutNote.ifBlank { null },
                        exercises = editedExercises,
                        totalDuration = totalDuration,
                        totalCaloriesBurned = totalCaloriesBurned
                    )
                    onSave(updatedWorkout)
                },
                enabled = editedExercises.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
            ) { Text("保存") }
        },
        dismissButton = {
            Row {
                TextButton(
                    onClick = onDelete,
                    colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))
                ) { Text("削除") }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(onClick = onDismiss) { Text("キャンセル") }
            }
        }
    )
}

// ========== RM記録セクション ==========

@Composable
private fun RmRecordSection(
    rmRecords: Map<String, RmRecord>,
    onEditRm: (RmRecord) -> Unit,
    onDeleteRm: (RmRecord) -> Unit,
    onAddRm: () -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.FitnessCenter, null, tint = AccentOrange, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("RM記録", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                if (rmRecords.isNotEmpty()) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("${rmRecords.size}種目", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            IconButton(onClick = onAddRm, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.Add, "RM追加", tint = AccentOrange, modifier = Modifier.size(20.dp))
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (rmRecords.isEmpty()) {
            Text("RM記録がありません。＋ボタンで追加できます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            rmRecords.values.sortedBy { it.exerciseName }.forEach { record ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = AccentOrange.copy(alpha = 0.08f))
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onEditRm(record) }.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(record.exerciseName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                            Text("${record.weight.toInt()}kg × ${record.reps}rep",
                                style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = AccentOrange)
                        }
                        Row {
                            IconButton(onClick = { onEditRm(record) }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Edit, "編集", tint = AccentOrange, modifier = Modifier.size(18.dp))
                            }
                            IconButton(onClick = { onDeleteRm(record) }, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Delete, "削除", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
            }
        }
    }
}

// ========== RM編集ダイアログ ==========

@Composable
private fun RmEditDialog(
    record: RmRecord,
    onDismiss: () -> Unit,
    onSave: (exerciseName: String, category: String, weight: Float, reps: Int) -> Unit,
    onDelete: () -> Unit
) {
    var weight by remember { mutableStateOf(record.weight.toInt().toString()) }
    var reps by remember { mutableStateOf(record.reps.toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("RM記録を編集", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(record.exerciseName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = AccentOrange)
                OutlinedTextField(
                    value = weight, onValueChange = { weight = it }, label = { Text("重量 (kg)") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = reps, onValueChange = { reps = it }, label = { Text("回数") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val w = weight.toFloatOrNull(); val r = reps.toIntOrNull()
                    if (w != null && w > 0f && r != null && r > 0) onSave(record.exerciseName, record.category, w, r)
                },
                enabled = weight.toFloatOrNull()?.let { it > 0f } == true && reps.toIntOrNull()?.let { it > 0 } == true,
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
            ) { Text("更新") }
        },
        dismissButton = {
            Row {
                TextButton(onClick = onDelete, colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))) { Text("削除") }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(onClick = onDismiss) { Text("キャンセル") }
            }
        }
    )
}

// ========== RM追加ダイアログ ==========

@Composable
private fun RmAddDialog(
    onDismiss: () -> Unit,
    onSave: (exerciseName: String, category: String, weight: Float, reps: Int) -> Unit
) {
    var selectedExerciseName by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var reps by remember { mutableStateOf("") }

    val strengthCategories = listOf("胸", "背中", "肩", "腕", "脚", "体幹")
    var selectedTab by remember { mutableStateOf(strengthCategories[0]) }
    val exercisesForCategory = remember(selectedTab) { ExerciseDatabase.getExercisesByCategory(selectedTab) }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth().fillMaxHeight(0.8f),
        title = {
            Text(
                text = if (selectedExerciseName.isBlank()) "RM記録を追加" else selectedExerciseName,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(modifier = Modifier.fillMaxSize()) {
                if (selectedExerciseName.isBlank()) {
                    ScrollableTabRow(
                        selectedTabIndex = strengthCategories.indexOf(selectedTab),
                        containerColor = Color.Transparent,
                        contentColor = AccentOrange,
                        edgePadding = 0.dp
                    ) {
                        strengthCategories.forEach { cat ->
                            Tab(
                                selected = selectedTab == cat,
                                onClick = { selectedTab = cat },
                                text = { Text(cat, fontWeight = if (selectedTab == cat) FontWeight.Bold else FontWeight.Normal) }
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(exercisesForCategory.size) { index ->
                            val exercise = exercisesForCategory[index]
                            Card(
                                onClick = { selectedExerciseName = exercise.name; selectedCategory = exercise.category },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                            ) {
                                Text(exercise.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp))
                            }
                        }
                    }
                } else {
                    Text(selectedCategory, style = MaterialTheme.typography.labelMedium, color = AccentOrange)
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = weight, onValueChange = { weight = it }, label = { Text("重量 (kg)") },
                        singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = reps, onValueChange = { reps = it }, label = { Text("回数") },
                        singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)
                    )
                }
            }
        },
        confirmButton = {
            if (selectedExerciseName.isNotBlank()) {
                Button(
                    onClick = {
                        val w = weight.toFloatOrNull(); val r = reps.toIntOrNull()
                        if (w != null && w > 0f && r != null && r > 0) onSave(selectedExerciseName, selectedCategory, w, r)
                    },
                    enabled = weight.toFloatOrNull()?.let { it > 0f } == true && reps.toIntOrNull()?.let { it > 0 } == true,
                    colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
                ) { Text("記録") }
            }
        },
        dismissButton = {
            Row {
                if (selectedExerciseName.isNotBlank()) {
                    TextButton(onClick = { selectedExerciseName = ""; selectedCategory = ""; weight = ""; reps = "" }) { Text("種目を変更") }
                    Spacer(modifier = Modifier.width(8.dp))
                }
                TextButton(onClick = onDismiss) { Text("キャンセル") }
            }
        }
    )
}

// ========== 運動クエスト完了シート ==========

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WorkoutCompletionSheet(
    item: UnifiedTimelineItem,
    exercises: List<WorkoutCompletionExercise>,
    workoutDisplayName: String? = null,
    onExercisesEdited: (List<WorkoutCompletionExercise>) -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val totalDuration = exercises.sumOf { it.duration }
    val totalCalories = exercises.sumOf { it.calories }

    // 編集可能な重量リスト（各種目のkg入力用）
    val editedWeights = remember(exercises) {
        mutableStateListOf(*exercises.map { it.weight?.toInt()?.toString() ?: "" }.toTypedArray())
    }

    // 編集後のカロリー・時間を再計算（空欄時は元の推定値を維持）
    val editedExercises = exercises.mapIndexed { i, ex ->
        val text = editedWeights.getOrNull(i) ?: ""
        val w = if (text.isNotEmpty()) text.toFloatOrNull() else ex.weight
        ex.copy(weight = w)
    }
    val editedTotalCalories = editedExercises.sumOf { it.calories }

    val focusManager = LocalFocusManager.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 24.dp)
        ) {
            Text(workoutDisplayName ?: item.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant).padding(10.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${totalDuration}分", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                    Text("時間", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${editedTotalCalories}kcal", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, color = AccentOrange)
                    Text("消費", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${exercises.size}種目", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                    Text("種目数", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            editedExercises.forEachIndexed { index, exercise ->
                WorkoutCompletionExerciseCard(
                    exercise = exercise,
                    weightText = editedWeights.getOrElse(index) { "" },
                    onWeightChange = { newVal ->
                        if (index < editedWeights.size) editedWeights[index] = newVal
                    },
                    onDone = { focusManager.clearFocus() }
                )
                if (index < editedExercises.lastIndex) Spacer(modifier = Modifier.height(6.dp))
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = {
                    focusManager.clearFocus()
                    onExercisesEdited(editedExercises)
                    onConfirm()
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Filled.FitnessCenter, null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("記録 (${editedTotalCalories}kcal / ${totalDuration}分)", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun WorkoutCompletionExerciseCard(
    exercise: WorkoutCompletionExercise,
    weightText: String,
    onWeightChange: (String) -> Unit,
    onDone: () -> Unit = {}
) {
    Row(
        modifier = Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(exercise.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("${exercise.sets}s × ${exercise.reps}rep",
                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Spacer(modifier = Modifier.width(8.dp))

        val isFocused = remember { mutableStateOf(false) }
        val borderColor = if (isFocused.value) AccentOrange else MaterialTheme.colorScheme.outline

        BasicTextField(
            value = weightText,
            onValueChange = { newVal ->
                if (newVal.isEmpty() || newVal.matches(Regex("^\\d*\\.?\\d*$"))) {
                    onWeightChange(newVal)
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onDone() }),
            modifier = Modifier.width(100.dp)
                .onFocusChanged { isFocused.value = it.isFocused },
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .border(1.dp, borderColor, RoundedCornerShape(8.dp))
                        .padding(horizontal = 10.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.weight(1f)) { innerTextField() }
                    Text("kg", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        )
    }
}

// ========== クエスト項目詳細ダイアログ ==========

@Composable
private fun QuestDetailDialog(
    item: UnifiedTimelineItem,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (item.type == TimelineItemType.WORKOUT) Icons.Default.FitnessCenter else Icons.Default.Restaurant,
                    contentDescription = null,
                    tint = if (item.isTrainingRelated) AccentOrange else Primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "${item.timeString}  ${item.title}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                // actionItemsがある場合: 食品/運動の詳細リスト
                val actions = item.actionItems
                if (actions != null && actions.isNotEmpty()) {
                    actions.forEach { action ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (action.isExecuted) "\u2705" else "\u25CB",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.width(24.dp)
                            )
                            Text(
                                text = action.itemName ?: action.originalText,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f)
                            )
                            if (action.amount != null) {
                                Text(
                                    text = "${action.amount.toInt()}${action.unit ?: "g"}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                } else if (item.subtitle != null) {
                    val isWorkout = item.type == TimelineItemType.WORKOUT
                    val bulletColor = if (isWorkout) AccentOrange else Primary

                    if (isWorkout) {
                        // 運動: 改行で分割（1行目サマリー + 種目）
                        val subtitleLines = item.subtitle.split("\n").filter { it.isNotBlank() }
                        Text(
                            text = subtitleLines.first(),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                        if (subtitleLines.size > 1) {
                            Spacer(modifier = Modifier.height(4.dp))
                            subtitleLines.drop(1).forEach { line ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Text("\u2022", style = MaterialTheme.typography.bodyMedium, color = bulletColor, modifier = Modifier.width(16.dp))
                                    Text(line.removePrefix("\u30FB").trim(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    } else {
                        // 食事: カンマ区切りで分割して箇条書き
                        val foodItems = item.subtitle.split(", ", "、").filter { it.isNotBlank() }
                        foodItems.forEach { food ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Text("\u2022", style = MaterialTheme.typography.bodyMedium, color = bulletColor, modifier = Modifier.width(16.dp))
                                Text(food.trim(), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                // カスタムクエストのアイテム
                val customItems = item.customQuestItems
                if (customItems != null && customItems.isNotEmpty()) {
                    customItems.forEach { cItem ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "\u25CB",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.width(24.dp)
                            )
                            Text(
                                text = cItem.foodName,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "${cItem.amount.toInt()}${cItem.unit}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("閉じる") }
        }
    )
}

// ========== 指示書編集ダイアログ ==========

@Composable
private fun DirectiveEditDialog(
    currentMessage: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var editedMessage by remember { mutableStateOf(currentMessage) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("指示書を編集", fontWeight = FontWeight.Bold) },
        text = {
            OutlinedTextField(
                value = editedMessage,
                onValueChange = { editedMessage = it },
                label = { Text("指示書内容") },
                modifier = Modifier.fillMaxWidth().height(300.dp),
                shape = RoundedCornerShape(12.dp),
                maxLines = 20
            )
        },
        confirmButton = {
            Button(
                onClick = { onSave(editedMessage) },
                enabled = editedMessage.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) { Text("保存") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("キャンセル") }
        }
    )
}

// ========== カロリーオーバーライドダイアログ ==========

@Composable
private fun CalorieOverrideDialog(
    onDismiss: () -> Unit,
    onApply: (CalorieOverride) -> Unit,
    onClear: (() -> Unit)?
) {
    val presets = listOf(
        "チートデー" to 500,
        "リフィード" to 300,
        "軽量制限" to -300,
        "カーボロード" to 400
    )
    var customAdjustment by remember { mutableStateOf("") }
    var selectedPreset by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("カロリー調整", fontWeight = FontWeight.Bold) },
        text = {
            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("プリセット", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                presets.forEach { (name, adjustment) ->
                    Card(
                        onClick = { selectedPreset = name; customAdjustment = adjustment.toString() },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (selectedPreset == name) Primary.copy(alpha = 0.15f)
                            else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(name, fontWeight = FontWeight.Medium)
                            Text(
                                text = if (adjustment > 0) "+${adjustment}kcal" else "${adjustment}kcal",
                                color = if (adjustment > 0) AccentOrange else Primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = customAdjustment,
                    onValueChange = { customAdjustment = it; selectedPreset = "カスタム" },
                    label = { Text("カスタム調整 (kcal)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val adj = customAdjustment.toIntOrNull() ?: return@Button
                    onApply(CalorieOverride(
                        templateName = selectedPreset ?: "カスタム",
                        calorieAdjustment = adj,
                        appliedAt = kotlinx.datetime.Clock.System.now().toEpochMilliseconds()
                    ))
                },
                enabled = customAdjustment.toIntOrNull() != null,
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) { Text("適用") }
        },
        dismissButton = {
            Row {
                if (onClear != null) {
                    TextButton(onClick = { onClear(); onDismiss() },
                        colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))
                    ) { Text("リセット") }
                    Spacer(modifier = Modifier.width(8.dp))
                }
                TextButton(onClick = onDismiss) { Text("キャンセル") }
            }
        }
    )
}
