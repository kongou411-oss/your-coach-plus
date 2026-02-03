package com.yourcoach.plus.android.ui.screens.dashboard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.Alignment
import com.yourcoach.plus.android.ui.components.CelebrationModal
import com.yourcoach.plus.android.ui.components.CelebrationType
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.android.ui.theme.AccentOrange
import com.yourcoach.plus.android.ui.theme.Primary
import com.yourcoach.plus.android.ui.theme.ScoreCalories
import com.yourcoach.plus.android.ui.theme.ScoreCarbs
import com.yourcoach.plus.android.ui.theme.ScoreCondition
import com.yourcoach.plus.android.ui.theme.ScoreDIAAS
import com.yourcoach.plus.android.ui.theme.ScoreExercise
import com.yourcoach.plus.android.ui.theme.ScoreFat
import com.yourcoach.plus.android.ui.theme.ScoreFattyAcid
import com.yourcoach.plus.android.ui.theme.ScoreFiber
import com.yourcoach.plus.android.ui.theme.ScoreGL
import com.yourcoach.plus.android.ui.theme.ScoreMineral
import com.yourcoach.plus.android.ui.theme.ScoreOver
import com.yourcoach.plus.android.ui.theme.ScoreProtein
import com.yourcoach.plus.android.ui.theme.ScoreSleep
import com.yourcoach.plus.android.ui.theme.ScoreVitamin
import com.yourcoach.plus.android.ui.theme.ScoreWater
import com.yourcoach.plus.android.ui.theme.Secondary
import com.yourcoach.plus.android.ui.theme.StreakFlame
import com.yourcoach.plus.android.ui.components.CalorieOverrideDialog
import com.yourcoach.plus.android.ui.components.ConditionSection
import com.yourcoach.plus.android.ui.components.DetailedNutritionSection
import com.yourcoach.plus.android.ui.components.DirectiveSection
import com.yourcoach.plus.android.ui.components.DirectiveEditDialog
import com.yourcoach.plus.android.ui.components.FattyAcidBalance
import com.yourcoach.plus.android.ui.components.FiberData
import com.yourcoach.plus.android.ui.components.GlData
import com.yourcoach.plus.android.ui.components.HudHeader
import com.yourcoach.plus.android.ui.components.UnifiedTimeline
import com.yourcoach.plus.android.ui.components.BottomBarState
import com.yourcoach.plus.android.ui.components.MicroDetailSheet
import com.yourcoach.plus.shared.domain.model.PfcRatio
import com.yourcoach.plus.shared.domain.model.FoodChoice
import com.yourcoach.plus.shared.util.DateUtil
import org.koin.androidx.compose.koinViewModel

/**
 * ダッシュボード画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = koinViewModel(),
    onNavigateToAddMeal: (String) -> Unit,
    onNavigateToAddWorkout: () -> Unit,
    onNavigateToAnalysis: () -> Unit,
    onUpdateBottomBarState: (BottomBarState) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val lifecycleOwner = LocalLifecycleOwner.current

    // 画面が再表示された時にデータをリフレッシュ
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.refresh()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // エラー表示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    // 成功メッセージ表示
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearSuccessMessage()
        }
    }

    // ボトムバー状態を更新
    val expProgress = uiState.user?.profile?.calculateExpProgress()
    LaunchedEffect(
        uiState.user,
        uiState.isGeneratingQuest,
        onNavigateToAnalysis
    ) {
        onUpdateBottomBarState(
            BottomBarState(
                level = expProgress?.level ?: 1,
                expCurrent = expProgress?.expCurrent ?: 0,
                expRequired = expProgress?.expRequired ?: 100,
                progressPercent = expProgress?.progressPercent ?: 0,
                freeCredits = uiState.user?.freeCredits ?: 0,
                paidCredits = uiState.user?.paidCredits ?: 0,
                onAnalysisClick = onNavigateToAnalysis,
                onGenerateQuestClick = viewModel::generateQuest,
                isGeneratingQuest = uiState.isGeneratingQuest
            )
        )
    }

    // お祝いモーダル（レベルアップ・バッジ獲得）
    uiState.currentCelebration?.let { celebration ->
        val celebrationType = when (celebration.type) {
            CelebrationInfoType.LEVEL_UP -> CelebrationType.LevelUp(
                newLevel = celebration.level ?: 1,
                creditsEarned = celebration.credits ?: 0
            )
            CelebrationInfoType.BADGE_EARNED -> CelebrationType.BadgeEarned(
                badgeId = celebration.badgeId ?: "",
                badgeName = celebration.badgeName ?: ""
            )
        }
        CelebrationModal(
            celebrationType = celebrationType,
            onDismiss = viewModel::dismissCelebration
        )
    }

    // 指示書編集ダイアログ
    if (uiState.showDirectiveEditDialog && uiState.directive != null) {
        DirectiveEditDialog(
            directive = uiState.directive!!,
            onDismiss = viewModel::hideDirectiveEditDialog,
            onSave = viewModel::updateDirective,
            onDelete = viewModel::deleteDirective
        )
    }

    // ピンポイントカロリー調整ダイアログ
    if (uiState.showCalorieOverrideDialog) {
        // デフォルトのPFC比率を計算
        val defaultPfc = if (uiState.targetCalories > 0) {
            val pPercent = ((uiState.targetProtein * 4 / uiState.targetCalories) * 100).toInt().coerceIn(15, 50)
            val fPercent = ((uiState.targetFat * 9 / uiState.targetCalories) * 100).toInt().coerceIn(15, 40)
            val cPercent = (100 - pPercent - fPercent).coerceIn(15, 60)
            PfcRatio(protein = pPercent, fat = fPercent, carbs = cPercent)
        } else {
            PfcRatio(protein = 30, fat = 25, carbs = 45)
        }

        CalorieOverrideDialog(
            currentDate = uiState.dateDisplay,
            defaultPfc = defaultPfc,
            onApply = { override ->
                viewModel.applyCalorieOverride(override)
            },
            onDismiss = viewModel::hideCalorieOverrideDialog
        )
    }

    // 食事編集ダイアログ
    if (uiState.showMealEditDialog && uiState.editingMeal != null) {
        MealEditDialog(
            meal = uiState.editingMeal!!,
            onDismiss = viewModel::hideMealEditDialog,
            onSave = { updatedMeal ->
                viewModel.updateMeal(updatedMeal)
            },
            onDelete = {
                viewModel.deleteMeal(uiState.editingMeal!!)
                viewModel.hideMealEditDialog()
            }
        )
    }

    // 運動編集ダイアログ
    if (uiState.showWorkoutEditDialog && uiState.editingWorkout != null) {
        WorkoutEditDialog(
            workout = uiState.editingWorkout!!,
            onDismiss = viewModel::hideWorkoutEditDialog,
            onSave = { updatedWorkout ->
                viewModel.updateWorkout(updatedWorkout)
            },
            onDelete = {
                viewModel.deleteWorkout(uiState.editingWorkout!!)
                viewModel.hideWorkoutEditDialog()
            }
        )
    }

    // Micro+詳細シートの表示状態
    var showMicroSheet by remember { mutableStateOf(false) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
        // bottomBarは統合ボトムバーに移動
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = viewModel::refresh,
                modifier = Modifier.fillMaxSize()
            ) {
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                        // 日付セレクター
                        DateSelector(
                            dateDisplay = uiState.dateDisplay,
                            isToday = DateUtil.isToday(uiState.date),
                            onPreviousDay = viewModel::goToPreviousDay,
                            onNextDay = viewModel::goToNextDay,
                            onToday = viewModel::goToToday
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
                            onMicroIndicatorClick = { showMicroSheet = true }
                        )

                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // タブ: クエスト / レコード（クエストがメイン価値）
                    var selectedTabIndex by remember { mutableStateOf(0) }
                    val tabs = listOf("クエスト", "レコード")

                    TabRow(
                        selectedTabIndex = selectedTabIndex,
                        containerColor = MaterialTheme.colorScheme.surface,
                        contentColor = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 16.dp),
                        indicator = { tabPositions ->
                            TabRowDefaults.SecondaryIndicator(
                                modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    ) {
                        tabs.forEachIndexed { index, title ->
                            Tab(
                                selected = selectedTabIndex == index,
                                onClick = { selectedTabIndex = index },
                                text = {
                                    Text(
                                        text = title,
                                        fontWeight = if (selectedTabIndex == index)
                                            androidx.compose.ui.text.font.FontWeight.Bold
                                        else
                                            androidx.compose.ui.text.font.FontWeight.Normal
                                    )
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // タブコンテンツ

                    when (selectedTabIndex) {
                        0 -> {
                            // クエストタブ: タイムライン（メイン機能）
                            if (uiState.unifiedTimeline.isNotEmpty()) {
                                UnifiedTimeline(
                                    items = uiState.unifiedTimeline,
                                    currentTimeMinutes = uiState.currentTimeMinutes,
                                    onItemClick = { item ->
                                        item.linkedMeal?.let { viewModel.showMealEditDialog(it) }
                                        item.linkedWorkout?.let { viewModel.showWorkoutEditDialog(it) }
                                    },
                                    onRecordClick = { item ->
                                        when (item.type) {
                                            TimelineItemType.MEAL -> {
                                                if (item.actionItems != null && item.actionItems.isNotEmpty()) {
                                                    viewModel.recordMealFromDirectiveItem(item)
                                                } else if (item.slotInfo != null && item.slotInfo.foodExamples.isNotEmpty()) {
                                                    viewModel.recordMealFromTimelineSlot(item)
                                                } else {
                                                    onNavigateToAddMeal("breakfast")
                                                }
                                            }
                                            TimelineItemType.WORKOUT -> {
                                                if (item.id.startsWith("directive_")) {
                                                    // 部位×時間でカロリー自動計算して記録
                                                    viewModel.recordWorkoutFromDirectiveItem(item)
                                                } else {
                                                    onNavigateToAddWorkout()
                                                }
                                            }
                                            TimelineItemType.CONDITION -> {
                                                viewModel.recordConditionFromDirectiveItem(item)
                                            }
                                        }
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .padding(horizontal = 16.dp)
                                )
                            } else {
                                // タイムラインが空の場合
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
                                        Text(
                                            text = "クエストがありません",
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            text = "「明日の準備」でクエストを生成してください",
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
                                    onAddMealClick = { onNavigateToAddMeal("breakfast") },
                                    onEditMeal = { meal -> viewModel.showMealEditDialog(meal) },
                                    onDeleteMeal = viewModel::deleteMeal,
                                    onSaveAsTemplate = viewModel::saveMealAsTemplate
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                // 運動セクション
                                WorkoutListSection(
                                    workouts = uiState.workouts,
                                    todayRoutine = uiState.todayRoutine,
                                    isManualRestDay = uiState.isManualRestDay,
                                    onAddWorkoutClick = onNavigateToAddWorkout,
                                    onEditWorkout = { workout -> viewModel.showWorkoutEditDialog(workout) },
                                    onDeleteWorkout = viewModel::deleteWorkout,
                                    onSaveAsTemplate = viewModel::saveWorkoutAsTemplate,
                                    onExecuteRoutineWorkouts = viewModel::executeRoutineWorkouts,
                                    onToggleRestDay = viewModel::toggleRestDay
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                // コンディションセクション
                                ConditionSection(
                                    condition = uiState.condition,
                                    onConditionChange = { updatedCondition ->
                                        viewModel.updateCondition(
                                            sleepHours = updatedCondition.sleepHours,
                                            sleepQuality = updatedCondition.sleepQuality,
                                            digestion = updatedCondition.digestion,
                                            focus = updatedCondition.focus,
                                            stress = updatedCondition.stress
                                        )
                                    },
                                    userId = uiState.user?.uid ?: "",
                                    date = uiState.date
                                )

                                Spacer(modifier = Modifier.height(100.dp))
                            }
                        }
                    }
                }
            }

            // ローディングオーバーレイ
            val isAnyLoading = uiState.isLoading ||
                uiState.isExecutingRoutine ||
                uiState.isExecutingDirectiveItem

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

        // Micro+詳細シート
        if (showMicroSheet) {
            MicroDetailSheet(
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
                    targetFiber = uiState.targetCarbs * 0.1f,
                    score = uiState.fiberScore,
                    rating = uiState.fiberRating,
                    label = uiState.fiberLabel
                ),
                vitaminScores = uiState.vitaminScores,
                mineralScores = uiState.mineralScores,
                onDismiss = { showMicroSheet = false }
            )
        }
    }
}

/**
 * 日付セレクター
 */
@Composable
private fun DateSelector(
    dateDisplay: String,
    isToday: Boolean,
    onPreviousDay: () -> Unit,
    onNextDay: () -> Unit,
    onToday: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPreviousDay) {
            Icon(
                imageVector = Icons.Default.ChevronLeft,
                contentDescription = "前日"
            )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = dateDisplay,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            if (!isToday) {
                TextButton(onClick = onToday) {
                    Text(
                        text = "今日に戻る",
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary
                    )
                }
            }
        }

        IconButton(onClick = onNextDay) {
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "翌日"
            )
        }
    }
}

/**
 * ルーティン入力ボタンカード
 */
@Composable
private fun RoutineInputCard(
    hasRoutine: Boolean,
    routineName: String?,
    onExecuteRoutine: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onExecuteRoutine,
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = if (hasRoutine) Primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(
                        if (hasRoutine) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Repeat,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = if (hasRoutine) "ルーティン" else "ルーティン",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (hasRoutine) Primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = if (hasRoutine) routineName ?: "タップで実行" else "未設定",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * 今日のルーティンカード
 */
@Composable
private fun TodayRoutineCard(
    routine: com.yourcoach.plus.shared.domain.model.RoutineDay?,
    isManualRestDay: Boolean,
    modifier: Modifier = Modifier
) {
    val isRestDay = routine?.isRestDay == true || isManualRestDay
    val dayNumber = routine?.dayNumber ?: 1
    val splitType = when {
        isManualRestDay -> "休養日"
        routine?.isRestDay == true -> "休養日"
        routine?.splitType?.isNotEmpty() == true -> routine.splitType
        else -> "未設定"
    }

    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = if (isRestDay) ScoreSleep.copy(alpha = 0.1f) else AccentOrange.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(
                        if (isRestDay) ScoreSleep else AccentOrange,
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isRestDay) Icons.Default.Pause else Icons.Default.FitnessCenter,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = splitType,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isRestDay) ScoreSleep else AccentOrange
                )
                Text(
                    text = "Day $dayNumber",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * スコアチャートカード（8軸）
 */
@Composable
private fun ScoreChartCard(
    score: com.yourcoach.plus.shared.domain.model.DailyScore?,
    isLoading: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "今日のスコア",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(100.dp),
                    color = Primary
                )
            } else {
                // 中央のスコア表示
                Box(
                    modifier = Modifier.size(120.dp),
                    contentAlignment = Alignment.Center
                ) {
                    // TODO: Vicoライブラリでレーダーチャートを実装
                    CircularProgressIndicator(
                        progress = { (score?.totalScore ?: 0) / 100f },
                        modifier = Modifier.size(120.dp),
                        strokeWidth = 12.dp,
                        color = Primary,
                        trackColor = Primary.copy(alpha = 0.2f)
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${score?.totalScore ?: 0}",
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                        Text(
                            text = "点",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 12軸スコアグリッド（元プロジェクト準拠: 食事10軸 + 運動 + コンディション）
            score?.let { s ->
                val scoreItems = listOf(
                    Triple("カロリー", s.calorieScore, ScoreCalories),
                    Triple("タンパク質", s.proteinScore, ScoreProtein),
                    Triple("脂質", s.fatScore, ScoreFat),
                    Triple("炭水化物", s.carbsScore, ScoreCarbs),
                    Triple("DIAAS", s.diaasScore, ScoreDIAAS),
                    Triple("脂肪酸", s.fattyAcidScore, ScoreFattyAcid),
                    Triple("GL", s.glScore, ScoreGL),
                    Triple("食物繊維", s.fiberScore, ScoreFiber),
                    Triple("ビタミン", s.vitaminScore, ScoreVitamin),
                    Triple("ミネラル", s.mineralScore, ScoreMineral),
                    Triple("運動", s.exerciseScore, ScoreExercise),
                    Triple("コンディション", s.conditionScore, ScoreCondition)
                )

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    scoreItems.chunked(4).forEach { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            row.forEach { (name, value, color) ->
                                ScoreItem(
                                    name = name,
                                    score = value,
                                    color = color,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * スコアアイテム
 */
@Composable
private fun ScoreItem(
    name: String,
    score: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "$score",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}

/**
 * クイックアクションカード
 */
@Composable
private fun QuickActionCard(
    icon: ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(100.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
                color = color
            )
        }
    }
}

/**
 * 栄養サマリーカード
 */
@Composable
private fun NutritionSummaryCard(
    totalCalories: Int,
    targetCalories: Int,
    targetProtein: Float,
    targetCarbs: Float,
    targetFat: Float,
    protein: Float,
    carbs: Float,
    fat: Float,
    calorieOverride: com.yourcoach.plus.shared.domain.model.CalorieOverride? = null,
    onPinpointClick: () -> Unit = {},
    onClearOverride: () -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
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
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "マクロ",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    // ピンポイント変更が適用中の場合は表示
                    if (calorieOverride != null) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = Color(0xFFFF9800).copy(alpha = 0.1f),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = "${calorieOverride.templateName} ${if (calorieOverride.calorieAdjustment != 0) "(${if (calorieOverride.calorieAdjustment > 0) "+" else ""}${calorieOverride.calorieAdjustment}kcal)" else ""}",
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFFF9800)
                                )
                            }
                        }
                    }
                }

                // ピンポイント変更ボタン
                if (calorieOverride != null) {
                    TextButton(onClick = onClearOverride) {
                        Text(
                            text = "解除",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.Gray
                        )
                    }
                } else {
                    TextButton(onClick = onPinpointClick) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Color(0xFFFF9800)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "ピンポイント変更",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFFFF9800)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // カロリープログレス
            NutrientProgressBar(
                label = "カロリー",
                current = totalCalories.toFloat(),
                target = targetCalories.toFloat(),
                unit = "kcal",
                color = ScoreCalories
            )

            Spacer(modifier = Modifier.height(12.dp))

            // タンパク質プログレス
            NutrientProgressBar(
                label = "タンパク質",
                current = protein,
                target = targetProtein,
                unit = "g",
                color = ScoreProtein
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 脂質プログレス
            NutrientProgressBar(
                label = "脂質",
                current = fat,
                target = targetFat,
                unit = "g",
                color = ScoreFat
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 炭水化物プログレス
            NutrientProgressBar(
                label = "炭水化物",
                current = carbs,
                target = targetCarbs,
                unit = "g",
                color = ScoreCarbs
            )
        }
    }
}

/**
 * 栄養素プログレスバー（警告色対応版）
 * 目標以下=固有色、1g以上超過=警告色
 */
@Composable
private fun NutrientProgressBar(
    label: String,
    current: Float,
    target: Float,
    unit: String,
    color: Color
) {
    val progress = if (target > 0) (current / target) else 0f

    // 小数点以下切り捨てで差分計算
    val currentInt = current.toInt()
    val targetInt = target.toInt()
    val difference = currentInt - targetInt

    // 警告判定: 1g以上超過のみ（目標以下は警告なし）
    val isOverTarget = difference >= 1
    val isWarning = isOverTarget

    // 差分テキスト
    val differenceText = when {
        difference > 0 -> "+$difference"
        difference < 0 -> "$difference"
        else -> "±0"
    }

    // 警告時は赤、通常は元の色
    val displayColor = if (isWarning) Color(0xFFEF4444) else color
    val barColor = if (isWarning) Color(0xFFEF4444) else color

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                // 警告時は過不足を表示
                if (isWarning && target > 0) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Surface(
                        color = displayColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = differenceText,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = displayColor,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                // 現在値
                Text(
                    text = "${current.toInt()}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isWarning) displayColor else color
                )
                Text(
                    text = " / ${target.toInt()} $unit",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(if (isWarning) displayColor.copy(alpha = 0.2f) else color.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress.coerceIn(0f, 1f))
                    .height(8.dp)
                    .background(barColor, RoundedCornerShape(4.dp))
            )
        }
    }
}

/**
 * 食事リストセクション
 */
@Composable
fun MealListSection(
    meals: List<com.yourcoach.plus.shared.domain.model.Meal>,
    glLimit: Float,
    onAddMealClick: () -> Unit,
    onEditMeal: (com.yourcoach.plus.shared.domain.model.Meal) -> Unit,
    onDeleteMeal: (com.yourcoach.plus.shared.domain.model.Meal) -> Unit,
    onSaveAsTemplate: (com.yourcoach.plus.shared.domain.model.Meal) -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
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
            // ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "今日の食事",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
                TextButton(onClick = onAddMealClick) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("追加")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (meals.isEmpty()) {
                // 食事記録がない場合
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "まだ食事の記録がありません",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(onClick = onAddMealClick) {
                            Text("食事を記録する")
                        }
                    }
                }
            } else {
                // 食事リスト
                meals.forEachIndexed { index, meal ->
                    MealCard(
                        meal = meal,
                        glLimitPerMeal = glLimit / 3f,
                        onEdit = { onEditMeal(meal) },
                        onDelete = { onDeleteMeal(meal) },
                        onSaveAsTemplate = { onSaveAsTemplate(meal) }
                    )
                    if (index < meals.size - 1) {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

/**
 * 食事カード（元プロジェクト完全移植版）
 */
@Composable
private fun MealCard(
    meal: com.yourcoach.plus.shared.domain.model.Meal,
    glLimitPerMeal: Float,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onSaveAsTemplate: () -> Unit
) {
    var expanded by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(false) }

    // 入力元に応じたボーダー色
    val borderColor = when {
        meal.isPredicted -> Color(0xFF0EA5E9) // スカイブルー
        meal.isRoutine -> Color(0xFFF59E0B)   // アンバー
        meal.isTemplate -> Color(0xFF8B5CF6)  // パープル
        else -> Color.Transparent
    }

    // GL評価
    val glRating = getGlRating(meal.totalGL, glLimitPerMeal, meal.isPostWorkout)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (borderColor != Color.Transparent) {
                    Modifier.border(2.dp, borderColor, RoundedCornerShape(12.dp))
                } else Modifier
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // ①時間表示
            Text(
                text = meal.time ?: java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                    .format(java.util.Date(meal.timestamp)),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(4.dp))

            // ②入力元タグ（予測、ルーティン、テンプレート）
            if (meal.isPredicted || meal.isRoutine || meal.isTemplate) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (meal.isPredicted) {
                        SourceTag(
                            text = "予測",
                            color = Color(0xFF0EA5E9),
                            icon = Icons.Default.Psychology
                        )
                    }
                    if (meal.isRoutine) {
                        SourceTag(
                            text = "ルーティン",
                            color = Color(0xFFF59E0B),
                            icon = Icons.Default.Repeat
                        )
                    }
                    if (meal.isTemplate) {
                        SourceTag(
                            text = "テンプレート",
                            color = Color(0xFF8B5CF6),
                            icon = Icons.Default.ContentCopy
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
            }

            // ③GLタグ + 運動後タグ
            if (meal.isPostWorkout || meal.totalGL > 0) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (meal.isPostWorkout) {
                        SourceTag(
                            text = "運動後",
                            color = Color(0xFFEA580C),
                            icon = Icons.Default.FitnessCenter
                        )
                    }
                    if (meal.totalGL > 0) {
                        GlTag(gl = meal.totalGL, rating = glRating)
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
            }

            // ④食事名とカロリー
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 食事タイプアイコン
                    Icon(
                        imageVector = if (meal.type == com.yourcoach.plus.shared.domain.model.MealType.SUPPLEMENT)
                            Icons.Default.Medication else Icons.Default.Restaurant,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = meal.name ?: when (meal.type) {
                            com.yourcoach.plus.shared.domain.model.MealType.BREAKFAST -> "朝食"
                            com.yourcoach.plus.shared.domain.model.MealType.LUNCH -> "昼食"
                            com.yourcoach.plus.shared.domain.model.MealType.DINNER -> "夕食"
                            com.yourcoach.plus.shared.domain.model.MealType.SNACK -> "間食"
                            com.yourcoach.plus.shared.domain.model.MealType.SUPPLEMENT -> "サプリ"
                        },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${meal.totalCalories}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Primary
                    )
                    Text(
                        text = "kcal",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // ⑤展開時のアイテムリスト
            androidx.compose.animation.AnimatedVisibility(visible = expanded) {
                Column(modifier = Modifier.padding(start = 24.dp, top = 8.dp)) {
                    meal.items.forEach { item ->
                        Text(
                            text = "${item.name} ${item.amount.toInt()}${item.unit}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // 非展開時は3件まで表示
            if (!expanded && meal.items.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                meal.items.take(3).forEach { item ->
                    Text(
                        text = "・${item.name} (${item.amount.toInt()}${item.unit})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
                if (meal.items.size > 3) {
                    Text(
                        text = "  +${meal.items.size - 3}件",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }

            // メモ表示
            meal.note?.takeIf { it.isNotBlank() }?.let { note ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = note,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // PFC表示
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                PfcBadge(label = "P", value = meal.totalProtein.toInt(), color = ScoreProtein)
                Text(" / ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                PfcBadge(label = "F", value = meal.totalFat.toInt(), color = ScoreFat)
                Text(" / ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                PfcBadge(label = "C", value = meal.totalCarbs.toInt(), color = ScoreCarbs)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // アクションボタン
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // テンプレート保存ボタン
                IconButton(onClick = onSaveAsTemplate, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.BookmarkAdd,
                        contentDescription = "テンプレート保存",
                        tint = Color(0xFF8B5CF6),
                        modifier = Modifier.size(18.dp)
                    )
                }
                // 編集ボタン
                IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "編集",
                        tint = Primary,
                        modifier = Modifier.size(18.dp)
                    )
                }
                // 削除ボタン
                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "削除",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

/**
 * 入力元タグ
 */
@Composable
private fun SourceTag(
    text: String,
    color: Color,
    icon: ImageVector
) {
    Row(
        modifier = Modifier
            .background(color, RoundedCornerShape(12.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(10.dp)
        )
        Spacer(modifier = Modifier.width(2.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = Color.White,
            fontSize = 10.sp
        )
    }
}

/**
 * GLタグ
 */
@Composable
private fun GlTag(gl: Float, rating: GlRating) {
    val (bgColor, label) = when (rating) {
        GlRating.LOW -> Color(0xFF22C55E) to "(優秀)"
        GlRating.MEDIUM -> Color(0xFF3B82F6) to "(適正)"
        GlRating.HIGH_RECOMMENDED -> Color(0xFFF59E0B) to "(推奨)"
        GlRating.HIGH -> Color(0xFFEF4444) to "(分割推奨)"
    }

    Row(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(12.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "GL ${gl.toInt()} $label",
            style = MaterialTheme.typography.labelSmall,
            color = Color.White,
            fontSize = 10.sp
        )
    }
}

enum class GlRating {
    LOW,              // 低GL (優秀)
    MEDIUM,           // 中GL (適正)
    HIGH_RECOMMENDED, // 高GL推奨 (運動後)
    HIGH              // 高GL (分割推奨)
}

private fun getGlRating(gl: Float, limit: Float, isPostWorkout: Boolean): GlRating {
    val lowThreshold = limit * 0.5f
    val mediumThreshold = limit * 0.8f

    return when {
        gl <= lowThreshold -> GlRating.LOW
        gl <= mediumThreshold -> GlRating.MEDIUM
        isPostWorkout -> GlRating.HIGH_RECOMMENDED
        else -> GlRating.HIGH
    }
}

/**
 * PFCバッジ
 */
@Composable
private fun PfcBadge(
    label: String,
    value: Int,
    color: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Spacer(modifier = Modifier.width(2.dp))
        Text(
            text = "${value}g",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

/**
 * 食事編集ダイアログ
 */
@Composable
private fun MealEditDialog(
    meal: com.yourcoach.plus.shared.domain.model.Meal,
    onDismiss: () -> Unit,
    onSave: (com.yourcoach.plus.shared.domain.model.Meal) -> Unit,
    onDelete: () -> Unit
) {
    var editedItems by remember { mutableStateOf(meal.items.toMutableList()) }
    var mealName by remember { mutableStateOf(meal.name ?: "") }

    // 合計計算
    val totalCalories = editedItems.sumOf { it.calories }
    val totalProtein = editedItems.sumOf { it.protein.toDouble() }.toFloat()
    val totalCarbs = editedItems.sumOf { it.carbs.toDouble() }.toFloat()
    val totalFat = editedItems.sumOf { it.fat.toDouble() }.toFloat()
    val totalFiber = editedItems.sumOf { it.fiber.toDouble() }.toFloat()

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "食事を編集",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(400.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 食事名
                androidx.compose.material3.OutlinedTextField(
                    value = mealName,
                    onValueChange = { mealName = it },
                    label = { Text("食事名") },
                    placeholder = { Text("例: 朝食") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                // 栄養サマリー
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Primary.copy(alpha = 0.1f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("$totalCalories", fontWeight = FontWeight.Bold, color = ScoreCalories)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${totalProtein.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreProtein)
                            Text("P", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${totalCarbs.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreCarbs)
                            Text("C", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${totalFat.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreFat)
                            Text("F", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }

                // 食品リスト（スクロール可能）
                Text(
                    text = "食品 (${editedItems.size}品)",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    editedItems.forEachIndexed { index, mealItem ->
                        MealItemEditCard(
                            item = mealItem,
                            onQuantityChange = { newAmount ->
                                // 量に比例して栄養素を再計算
                                val ratio = newAmount / mealItem.amount
                                val updatedItem = mealItem.copy(
                                    amount = newAmount,
                                    calories = (mealItem.calories * ratio).toInt(),
                                    protein = mealItem.protein * ratio,
                                    carbs = mealItem.carbs * ratio,
                                    fat = mealItem.fat * ratio,
                                    fiber = mealItem.fiber * ratio,
                                    sugar = mealItem.sugar * ratio,
                                    saturatedFat = mealItem.saturatedFat * ratio,
                                    monounsaturatedFat = mealItem.monounsaturatedFat * ratio,
                                    polyunsaturatedFat = mealItem.polyunsaturatedFat * ratio,
                                    vitamins = mealItem.vitamins.mapValues { it.value * ratio },
                                    minerals = mealItem.minerals.mapValues { it.value * ratio }
                                )
                                editedItems = editedItems.toMutableList().apply {
                                    set(index, updatedItem)
                                }
                            },
                            onDelete = {
                                editedItems = editedItems.toMutableList().apply {
                                    removeAt(index)
                                }
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(
                onClick = {
                    val updatedMeal = meal.copy(
                        name = mealName.ifBlank { null },
                        items = editedItems,
                        totalCalories = totalCalories,
                        totalProtein = totalProtein,
                        totalCarbs = totalCarbs,
                        totalFat = totalFat,
                        totalFiber = totalFiber
                    )
                    onSave(updatedMeal)
                },
                enabled = editedItems.isNotEmpty(),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = Primary
                )
            ) {
                Text("保存")
            }
        },
        dismissButton = {
            Row {
                androidx.compose.material3.TextButton(
                    onClick = onDelete,
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFEF4444)
                    )
                ) {
                    Text("削除")
                }
                Spacer(modifier = Modifier.width(8.dp))
                androidx.compose.material3.TextButton(onClick = onDismiss) {
                    Text("キャンセル")
                }
            }
        }
    )
}

/**
 * 運動編集ダイアログ
 */
@Composable
private fun WorkoutEditDialog(
    workout: com.yourcoach.plus.shared.domain.model.Workout,
    onDismiss: () -> Unit,
    onSave: (com.yourcoach.plus.shared.domain.model.Workout) -> Unit,
    onDelete: () -> Unit
) {
    var workoutName by remember { mutableStateOf(workout.name ?: "") }
    var workoutNote by remember { mutableStateOf(workout.note ?: "") }
    var editedExercises by remember { mutableStateOf(workout.exercises.toMutableList()) }

    // 合計計算
    val totalDuration = editedExercises.sumOf { it.duration ?: 0 }
    val totalCaloriesBurned = editedExercises.sumOf { it.caloriesBurned }
    val totalVolume = editedExercises.sumOf { it.totalVolume }

    val workoutTypeName = when (workout.type) {
        com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH -> "筋トレ"
        com.yourcoach.plus.shared.domain.model.WorkoutType.CARDIO -> "有酸素"
        com.yourcoach.plus.shared.domain.model.WorkoutType.FLEXIBILITY -> "柔軟"
        com.yourcoach.plus.shared.domain.model.WorkoutType.SPORTS -> "スポーツ"
        com.yourcoach.plus.shared.domain.model.WorkoutType.DAILY_ACTIVITY -> "日常活動"
    }

    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "運動を編集",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(450.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 運動名
                androidx.compose.material3.OutlinedTextField(
                    value = workoutName,
                    onValueChange = { workoutName = it },
                    label = { Text("運動名") },
                    placeholder = { Text("例: 胸トレ") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                // サマリー
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = AccentOrange.copy(alpha = 0.1f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
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
                        if (totalVolume > 0) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("$totalVolume", fontWeight = FontWeight.Bold, color = Primary)
                                Text("kg", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }

                // 種目タイプ
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "タイプ:",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Surface(
                        color = AccentOrange.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = workoutTypeName,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = AccentOrange
                        )
                    }
                }

                // 種目リスト
                Text(
                    text = "種目 (${editedExercises.size})",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    editedExercises.forEachIndexed { index, exercise ->
                        ExerciseEditCard(
                            exercise = exercise,
                            onUpdate = { updatedExercise ->
                                editedExercises = editedExercises.toMutableList().apply {
                                    set(index, updatedExercise)
                                }
                            },
                            onDelete = {
                                editedExercises = editedExercises.toMutableList().apply {
                                    removeAt(index)
                                }
                            }
                        )
                    }
                }

                // メモ
                androidx.compose.material3.OutlinedTextField(
                    value = workoutNote,
                    onValueChange = { workoutNote = it },
                    label = { Text("メモ") },
                    placeholder = { Text("メモを追加...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 2
                )
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(
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
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = AccentOrange
                )
            ) {
                Text("保存")
            }
        },
        dismissButton = {
            Row {
                androidx.compose.material3.TextButton(
                    onClick = onDelete,
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(
                        contentColor = Color(0xFFEF4444)
                    )
                ) {
                    Text("削除")
                }
                Spacer(modifier = Modifier.width(8.dp))
                androidx.compose.material3.TextButton(onClick = onDismiss) {
                    Text("キャンセル")
                }
            }
        }
    )
}

/**
 * 種目編集カード（編集可能版）
 */
@Composable
private fun ExerciseEditCard(
    exercise: com.yourcoach.plus.shared.domain.model.Exercise,
    onUpdate: (com.yourcoach.plus.shared.domain.model.Exercise) -> Unit,
    onDelete: () -> Unit
) {
    var warmupSets by remember { mutableStateOf(exercise.warmupSets) }
    var mainSets by remember { mutableStateOf(exercise.mainSets) }
    var weight by remember { mutableStateOf(exercise.weight?.toInt()?.toString() ?: "") }
    var reps by remember { mutableStateOf(exercise.reps?.toString() ?: "") }
    var duration by remember { mutableStateOf(exercise.duration?.toString() ?: "") }

    val categoryName = when (exercise.category) {
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.CHEST -> "胸"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.BACK -> "背中"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.SHOULDERS -> "肩"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.ARMS -> "腕"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.CORE -> "体幹"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.LEGS -> "脚"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.RUNNING -> "ランニング"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.WALKING -> "ウォーキング"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.CYCLING -> "サイクリング"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.SWIMMING -> "水泳"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.HIIT -> "HIIT"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.YOGA -> "ヨガ"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.STRETCHING -> "ストレッチ"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.SPORTS -> "スポーツ"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER -> "その他"
    }

    // 値変更時に親に通知
    fun notifyUpdate() {
        val newWeight = weight.toFloatOrNull()
        val newReps = reps.toIntOrNull()
        val newDuration = duration.toIntOrNull()
        val totalSets = warmupSets + mainSets
        val totalVolume = if (newWeight != null && newReps != null && mainSets > 0) {
            (newWeight * newReps * mainSets).toInt()
        } else exercise.totalVolume
        // カロリー再計算
        val newCalories = if (newWeight != null && totalSets > 0 && newReps != null) {
            ((totalVolume * 0.05f) + ((newDuration ?: 0) * 3)).toInt().coerceAtLeast(1)
        } else if (newDuration != null) {
            newDuration * 7
        } else exercise.caloriesBurned

        onUpdate(exercise.copy(
            warmupSets = warmupSets,
            mainSets = mainSets,
            sets = if (totalSets > 0) totalSets else exercise.sets,
            weight = newWeight,
            reps = newReps,
            duration = newDuration,
            totalVolume = totalVolume,
            caloriesBurned = newCalories
        ))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // ヘッダー行
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = exercise.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = categoryName,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "削除",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // アップ・メイン セット編集
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // アップセット
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("アップ", style = MaterialTheme.typography.labelSmall, color = ScoreSleep)
                    Spacer(modifier = Modifier.width(4.dp))
                    IconButton(
                        onClick = { if (warmupSets > 0) { warmupSets = warmupSets - 1; notifyUpdate() } },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Remove, null, modifier = Modifier.size(14.dp))
                    }
                    Text("$warmupSets", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    IconButton(
                        onClick = { warmupSets = warmupSets + 1; notifyUpdate() },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Add, null, modifier = Modifier.size(14.dp))
                    }
                }

                // メインセット
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("メイン", style = MaterialTheme.typography.labelSmall, color = AccentOrange)
                    Spacer(modifier = Modifier.width(4.dp))
                    IconButton(
                        onClick = { if (mainSets > 0) { mainSets = mainSets - 1; notifyUpdate() } },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Remove, null, modifier = Modifier.size(14.dp))
                    }
                    Text("$mainSets", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
                    IconButton(
                        onClick = { mainSets = mainSets + 1; notifyUpdate() },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Add, null, modifier = Modifier.size(14.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 重量・レップ・時間
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // 重量
                androidx.compose.material3.OutlinedTextField(
                    value = weight,
                    onValueChange = { weight = it; notifyUpdate() },
                    label = { Text("kg", style = MaterialTheme.typography.labelSmall) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    textStyle = MaterialTheme.typography.bodySmall
                )
                // レップ
                androidx.compose.material3.OutlinedTextField(
                    value = reps,
                    onValueChange = { reps = it; notifyUpdate() },
                    label = { Text("回", style = MaterialTheme.typography.labelSmall) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    textStyle = MaterialTheme.typography.bodySmall
                )
                // 時間
                androidx.compose.material3.OutlinedTextField(
                    value = duration,
                    onValueChange = { duration = it; notifyUpdate() },
                    label = { Text("分", style = MaterialTheme.typography.labelSmall) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    textStyle = MaterialTheme.typography.bodySmall
                )
            }

            // カロリー表示
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${exercise.caloriesBurned}kcal" + if (exercise.totalVolume > 0) " • 計${exercise.totalVolume}kg" else "",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = AccentOrange
            )
        }
    }
}

/**
 * 指示書セクション（AI分析統合版）
 */
@Composable
private fun DirectiveSectionWithAnalysis(
    directive: com.yourcoach.plus.shared.domain.model.Directive?,
    onComplete: () -> Unit,
    onEdit: () -> Unit,
    onExecuteItem: (com.yourcoach.plus.shared.domain.model.DirectiveActionItem) -> Unit,
    onExecuteItemWithEdit: (com.yourcoach.plus.shared.domain.model.DirectiveActionItem, String) -> Unit,
    onUndoItem: (com.yourcoach.plus.shared.domain.model.DirectiveActionItem) -> Unit,
    onCompleteAll: () -> Unit,
    executedItems: Set<Int>,
    editedTexts: Map<Int, String>,
    isExecuting: Boolean,
    hasMeals: Boolean,
    hasWorkouts: Boolean,
    hasCondition: Boolean,
    isRestDay: Boolean,
    onGenerateAnalysis: () -> Unit,
    // クエスト生成
    onGenerateQuest: () -> Unit,
    isGeneratingQuest: Boolean,
    questGenerationError: String?,
    onClearQuestError: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
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
            // 指示書セクション
            DirectiveSection(
                directive = directive,
                onComplete = onComplete,
                onEdit = onEdit,
                onExecuteItem = onExecuteItem,
                onExecuteItemWithEdit = onExecuteItemWithEdit,
                onUndoItem = onUndoItem,
                onCompleteAll = onCompleteAll,
                executedItems = executedItems,
                editedTexts = editedTexts,
                isExecuting = isExecuting
            )

            // 明日の準備ボタン（クエスト生成）
            Spacer(modifier = Modifier.height(12.dp))

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
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
                            imageVector = Icons.Default.Add,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "明日の作戦会議",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "買い物前にクエストを生成しましょう",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // エラー表示
                    if (questGenerationError != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = questGenerationError,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    androidx.compose.material3.Button(
                        onClick = {
                            onClearQuestError()
                            onGenerateQuest()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isGeneratingQuest,
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
                        )
                    ) {
                        if (isGeneratingQuest) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("生成中...")
                        } else {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("明日のクエストを生成")
                        }
                    }
                }
            }

            // AI分析セクション
            Spacer(modifier = Modifier.height(16.dp))

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = Secondary.copy(alpha = 0.1f)
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
                            imageVector = Icons.Default.Psychology,
                            contentDescription = null,
                            tint = Secondary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "AI分析",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = Secondary
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // 記録状況チェックリスト（休養日の場合は運動不要）
                    val effectiveHasWorkouts = hasWorkouts || isRestDay
                    val allRecorded = hasMeals && effectiveHasWorkouts && hasCondition

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        RecordCheckItem(label = "食事", isRecorded = hasMeals)
                        RecordCheckItem(
                            label = if (isRestDay) "運動（休養日）" else "運動",
                            isRecorded = effectiveHasWorkouts
                        )
                        RecordCheckItem(label = "コンディション", isRecorded = hasCondition)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (allRecorded) {
                        // 全て記録済み → 分析生成ボタン
                        androidx.compose.material3.Button(
                            onClick = onGenerateAnalysis,
                            modifier = Modifier.fillMaxWidth(),
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                containerColor = Secondary
                            ),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Psychology,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("AIで今日を分析する")
                        }
                    } else {
                        // 未記録がある → 記録を促すメッセージ
                        Text(
                            text = "食事・運動・コンディションを記録すると\nAI分析が利用できます",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

/**
 * 記録チェックアイテム
 */
@Composable
private fun RecordCheckItem(
    label: String,
    isRecorded: Boolean
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .background(
                    if (isRecorded) Color(0xFF22C55E) else Color.Gray.copy(alpha = 0.3f),
                    CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            if (isRecorded) {
                Text(
                    text = "✓",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    fontSize = 10.sp
                )
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = if (isRecorded) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 運動リストセクション
 */
@Composable
fun WorkoutListSection(
    workouts: List<com.yourcoach.plus.shared.domain.model.Workout>,
    todayRoutine: com.yourcoach.plus.shared.domain.model.RoutineDay?,
    isManualRestDay: Boolean,
    onAddWorkoutClick: () -> Unit,
    onEditWorkout: (com.yourcoach.plus.shared.domain.model.Workout) -> Unit,
    onDeleteWorkout: (com.yourcoach.plus.shared.domain.model.Workout) -> Unit,
    onSaveAsTemplate: (com.yourcoach.plus.shared.domain.model.Workout) -> Unit,
    onExecuteRoutineWorkouts: () -> Unit,
    onToggleRestDay: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    // ルーティン設定の休養日 OR 手動設定の休養日
    val isRestDay = todayRoutine?.isRestDay == true || isManualRestDay
    val hasRoutineWorkouts = todayRoutine?.workouts?.isNotEmpty() == true

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
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
            // ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.DirectionsRun,
                        contentDescription = null,
                        tint = AccentOrange,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "今日の運動",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    // ルーティン日表示
                    todayRoutine?.let { routine ->
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            color = if (isRestDay) ScoreSleep.copy(alpha = 0.2f) else AccentOrange.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = if (isRestDay) "休養日" else routine.name,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = if (isRestDay) ScoreSleep else AccentOrange
                            )
                        }
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // 休養日チェックボックス（ルーティン設定がない場合のみ編集可能）
                    if (todayRoutine?.isRestDay != true) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { onToggleRestDay(!isManualRestDay) }
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Checkbox(
                                checked = isManualRestDay,
                                onCheckedChange = { onToggleRestDay(it) },
                                colors = CheckboxDefaults.colors(
                                    checkedColor = ScoreSleep,
                                    uncheckedColor = MaterialTheme.colorScheme.onSurfaceVariant
                                ),
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "休養日",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isManualRestDay) ScoreSleep else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    // 追加ボタン（休養日でない場合のみ表示）
                    if (!isRestDay) {
                        TextButton(onClick = onAddWorkoutClick) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("追加")
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 休養日表示
            if (isRestDay) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = ScoreSleep.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "今日は休養日です",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = ScoreSleep
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "しっかり休んで明日に備えましょう",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else if (workouts.isEmpty()) {
                // 運動記録がない場合
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // ルーティン実行ボタン
                    if (hasRoutineWorkouts) {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = AccentOrange.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "今日のルーティン: ${todayRoutine?.name}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${todayRoutine?.workouts?.size ?: 0}種目",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                androidx.compose.material3.Button(
                                    onClick = onExecuteRoutineWorkouts,
                                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                        containerColor = AccentOrange
                                    ),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.FitnessCenter,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("ルーティンを実行")
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    Text(
                        text = "まだ運動の記録がありません",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = onAddWorkoutClick) {
                        Text("運動を記録する")
                    }
                }
            } else {
                // 運動リスト
                workouts.forEachIndexed { index, workout ->
                    WorkoutCard(
                        workout = workout,
                        onEdit = { onEditWorkout(workout) },
                        onDelete = { onDeleteWorkout(workout) },
                        onSaveAsTemplate = { onSaveAsTemplate(workout) }
                    )
                    if (index < workouts.size - 1) {
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                // 合計消費カロリー
                val totalCaloriesBurned = workouts.sumOf { it.totalCaloriesBurned.toLong() }.toInt()
                val totalDuration = workouts.sumOf { it.totalDuration }
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "合計時間: ${totalDuration}分",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row {
                        Text(
                            text = "合計消費: ",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "${totalCaloriesBurned}kcal",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = AccentOrange
                        )
                    }
                }
            }
        }
    }
}

/**
 * 運動カード（元プロジェクト準拠 + 詳細表示・編集・削除機能）
 */
@Composable
private fun WorkoutCard(
    workout: com.yourcoach.plus.shared.domain.model.Workout,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onSaveAsTemplate: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    val workoutTypeName = when (workout.type) {
        com.yourcoach.plus.shared.domain.model.WorkoutType.STRENGTH -> "筋トレ"
        com.yourcoach.plus.shared.domain.model.WorkoutType.CARDIO -> "有酸素"
        com.yourcoach.plus.shared.domain.model.WorkoutType.FLEXIBILITY -> "柔軟"
        com.yourcoach.plus.shared.domain.model.WorkoutType.SPORTS -> "スポーツ"
        com.yourcoach.plus.shared.domain.model.WorkoutType.DAILY_ACTIVITY -> "日常活動"
    }

    // 入力元に応じたボーダー色
    val borderColor = when {
        workout.isRoutine -> Color(0xFFF59E0B)   // アンバー（ルーティン）
        workout.isTemplate -> Color(0xFF8B5CF6)  // パープル（テンプレート）
        else -> Color.Transparent
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (borderColor != Color.Transparent) {
                    Modifier.border(2.dp, borderColor, RoundedCornerShape(12.dp))
                } else Modifier
            ),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = AccentOrange.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // 入力元タグ
            if (workout.isRoutine || workout.isTemplate) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    if (workout.isRoutine) {
                        SourceTag(
                            text = workout.routineName ?: "ルーティン",
                            color = Color(0xFFF59E0B),
                            icon = Icons.Default.Repeat
                        )
                    }
                    if (workout.isTemplate) {
                        SourceTag(
                            text = "テンプレート",
                            color = Color(0xFF8B5CF6),
                            icon = Icons.Default.ContentCopy
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
            }

            // ヘッダー（展開/折りたたみ）
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 運動アイコン
                    Icon(
                        imageVector = Icons.Default.FitnessCenter,
                        contentDescription = null,
                        tint = AccentOrange,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Icon(
                        imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Column {
                        Text(
                            text = workout.name ?: workoutTypeName,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${workout.totalDuration}分 • $workoutTypeName • ${workout.exercises.size}種目",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${workout.totalCaloriesBurned}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = AccentOrange
                    )
                    Text(
                        text = "kcal消費",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 展開時の詳細表示
            AnimatedVisibility(visible = expanded) {
                Column(modifier = Modifier.padding(start = 24.dp, top = 8.dp)) {
                    workout.exercises.forEach { exercise ->
                        ExerciseDetailRow(exercise = exercise)
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }
            }

            // 非展開時は3件まで表示
            if (!expanded && workout.exercises.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                workout.exercises.take(3).forEach { exercise ->
                    val setsInfo = if (exercise.warmupSets > 0 || exercise.mainSets > 0) {
                        val parts = mutableListOf<String>()
                        if (exercise.warmupSets > 0) parts.add("アップ${exercise.warmupSets}")
                        if (exercise.mainSets > 0) parts.add("メイン${exercise.mainSets}")
                        parts.joinToString("+")
                    } else if (exercise.sets != null) {
                        "${exercise.sets}セット"
                    } else {
                        ""
                    }
                    val weightInfo = exercise.weight?.let { "${it.toInt()}kg" } ?: ""
                    val repsInfo = exercise.reps?.let { "${it}回" } ?: ""
                    val detail = listOf(setsInfo, weightInfo, repsInfo).filter { it.isNotEmpty() }.joinToString(" / ")

                    Text(
                        text = "・${exercise.name}${if (detail.isNotEmpty()) " ($detail)" else ""}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1
                    )
                }
                if (workout.exercises.size > 3) {
                    Text(
                        text = "  +${workout.exercises.size - 3}種目",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }

            // メモ表示
            workout.note?.takeIf { it.isNotBlank() }?.let { note ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = note,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // アクションボタン
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // テンプレート保存ボタン
                IconButton(onClick = onSaveAsTemplate, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.BookmarkAdd,
                        contentDescription = "テンプレート保存",
                        tint = Color(0xFF8B5CF6),
                        modifier = Modifier.size(18.dp)
                    )
                }
                // 編集ボタン
                IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "編集",
                        tint = AccentOrange,
                        modifier = Modifier.size(18.dp)
                    )
                }
                // 削除ボタン
                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "削除",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

/**
 * 運動詳細行（展開時）
 */
@Composable
private fun ExerciseDetailRow(
    exercise: com.yourcoach.plus.shared.domain.model.Exercise
) {
    val categoryName = when (exercise.category) {
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.CHEST -> "胸"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.BACK -> "背中"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.SHOULDERS -> "肩"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.ARMS -> "腕"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.CORE -> "体幹"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.LEGS -> "脚"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.RUNNING -> "ランニング"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.WALKING -> "ウォーキング"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.CYCLING -> "サイクリング"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.SWIMMING -> "水泳"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.HIIT -> "HIIT"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.YOGA -> "ヨガ"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.STRETCHING -> "ストレッチ"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.SPORTS -> "スポーツ"
        com.yourcoach.plus.shared.domain.model.ExerciseCategory.OTHER -> "その他"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = exercise.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = categoryName,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    text = "${exercise.caloriesBurned}kcal",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = AccentOrange
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // セット情報
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // アップセット
                if (exercise.warmupSets > 0) {
                    Surface(
                        color = ScoreSleep.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "アップ ${exercise.warmupSets}セット",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = ScoreSleep
                        )
                    }
                }
                // メインセット
                if (exercise.mainSets > 0) {
                    Surface(
                        color = AccentOrange.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "メイン ${exercise.mainSets}セット",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = AccentOrange
                        )
                    }
                }
                // 通常セット（アップ/メイン区別なし）
                if (exercise.warmupSets == 0 && exercise.mainSets == 0 && exercise.sets != null) {
                    Surface(
                        color = AccentOrange.copy(alpha = 0.2f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "${exercise.sets}セット",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = AccentOrange
                        )
                    }
                }
            }

            // 重量・回数・体積
            if (exercise.weight != null || exercise.reps != null || exercise.totalVolume > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    exercise.weight?.let {
                        Text(
                            text = "重量: ${if (it == it.toInt().toFloat()) it.toInt() else it}kg",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    exercise.reps?.let {
                        Text(
                            text = "回数: ${it}回",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (exercise.totalVolume > 0) {
                        Text(
                            text = "総体積: ${exercise.totalVolume}kg",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                    }
                }
            }

            // 時間・距離（有酸素用）
            if (exercise.duration != null || exercise.distance != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    exercise.duration?.let {
                        Text(
                            text = "時間: ${it}分",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    exercise.distance?.let {
                        Text(
                            text = "距離: ${it}km",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

/**
 * 食品アイテム編集カード
 */
@Composable
private fun MealItemEditCard(
    item: com.yourcoach.plus.shared.domain.model.MealItem,
    onQuantityChange: (Float) -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "${item.calories}kcal • P${item.protein.toInt()} F${item.fat.toInt()} C${item.carbs.toInt()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "削除",
                        tint = Color(0xFFEF4444),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 量調整
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "量:",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                // マイナスボタン
                IconButton(
                    onClick = {
                        val newAmount = (item.amount - 10).coerceAtLeast(10f)
                        onQuantityChange(newAmount)
                    },
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant,
                            CircleShape
                        )
                ) {
                    Icon(
                        imageVector = Icons.Default.Remove,
                        contentDescription = "減らす",
                        modifier = Modifier.size(16.dp)
                    )
                }

                Text(
                    text = "${item.amount.toInt()}${item.unit}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.width(60.dp),
                    textAlign = TextAlign.Center
                )

                // プラスボタン
                IconButton(
                    onClick = {
                        val newAmount = item.amount + 10
                        onQuantityChange(newAmount)
                    },
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant,
                            CircleShape
                        )
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "増やす",
                        modifier = Modifier.size(16.dp)
                    )
                }

            }
        }
    }
}

/**
 * タイムラインカード
 * 食事スケジュールをビジュアルに表示
 */
@Composable
private fun TimelineCard(
    timelineSlots: List<TimelineSlotInfo>,
    nextMealSlot: TimelineSlotInfo?,
    timeUntilNextMeal: Int,
    currentTimeMinutes: Int,
    trainingTimeMinutes: Int?
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
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
            // ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = null,
                    tint = Primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "今日のタイムライン",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.weight(1f))
                IconButton(
                    onClick = { expanded = !expanded },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (expanded) "閉じる" else "展開"
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 次の食事カウントダウン
            if (nextMealSlot != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Primary.copy(alpha = 0.1f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Timer,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "次: ${nextMealSlot.displayName} @ ${nextMealSlot.timeString}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            nextMealSlot.relativeTimeLabel?.let { label ->
                                Text(
                                    text = label,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            // 食品例を表示
                            if (nextMealSlot.foodExamples.isNotEmpty()) {
                                Text(
                                    text = "→ ${nextMealSlot.foodExamples.joinToString(" + ")}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Primary,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            val hours = timeUntilNextMeal / 60
                            val minutes = timeUntilNextMeal % 60
                            Text(
                                text = if (hours > 0) "${hours}時間${minutes}分後" else "${minutes}分後",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Primary
                            )
                            // 自炊/中食
                            Text(
                                text = nextMealSlot.foodChoice.displayName,
                                style = MaterialTheme.typography.labelSmall,
                                color = when (nextMealSlot.foodChoice) {
                                    FoodChoice.KITCHEN -> ScoreProtein
                                    FoodChoice.STORE -> ScoreGL
                                }
                            )
                        }
                    }
                }
            }

            // 展開時: 全タイムライン表示
            AnimatedVisibility(visible = expanded) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp)
                ) {
                    // トレーニング時刻表示
                    trainingTimeMinutes?.let { training ->
                        val trainingTimeStr = "%02d:%02d".format(training / 60, training % 60)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.FitnessCenter,
                                contentDescription = null,
                                tint = AccentOrange,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "$trainingTimeStr",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = AccentOrange
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "トレーニング",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = AccentOrange
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                    }

                    // 各スロット
                    timelineSlots.forEach { slot ->
                        TimelineSlotRow(
                            slot = slot,
                            isNext = slot == nextMealSlot,
                            currentTimeMinutes = currentTimeMinutes
                        )
                    }
                }
            }
        }
    }
}

/**
 * タイムラインスロット行
 */
@Composable
private fun TimelineSlotRow(
    slot: TimelineSlotInfo,
    isNext: Boolean,
    currentTimeMinutes: Int
) {
    val isPast = slot.timeMinutes < currentTimeMinutes && !slot.isCompleted
    val backgroundColor = when {
        slot.isCompleted -> Color(0xFF10B981).copy(alpha = 0.1f)
        isNext -> Primary.copy(alpha = 0.15f)
        else -> Color.Transparent
    }
    val textColor = when {
        slot.isCompleted -> Color(0xFF10B981)
        isPast -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
        isNext -> Primary
        else -> MaterialTheme.colorScheme.onSurface
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(backgroundColor, RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 完了チェック
            if (slot.isCompleted) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = "完了",
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(16.dp)
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .border(1.dp, textColor, CircleShape)
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // 時刻
            Text(
                text = slot.timeString,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = if (isNext) FontWeight.Bold else FontWeight.Normal,
                color = textColor,
                modifier = Modifier.width(48.dp)
            )

            // スロット名
            Text(
                text = slot.displayName,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = if (isNext) FontWeight.Bold else FontWeight.Normal,
                color = textColor,
                modifier = Modifier.weight(1f)
            )

            // トレ前後ラベル
            if (slot.isTrainingRelated) {
                Text(
                    text = if (slot.relativeTimeLabel?.contains("トレ前") == true) "[トレ前]" else "[トレ後]",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = AccentOrange
                )
                Spacer(modifier = Modifier.width(4.dp))
            }

            // 自炊/中食
            Text(
                text = when (slot.foodChoice) {
                    FoodChoice.KITCHEN -> "自炊"
                    FoodChoice.STORE -> "中食"
                },
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = when (slot.foodChoice) {
                    FoodChoice.KITCHEN -> ScoreProtein
                    FoodChoice.STORE -> ScoreGL
                }
            )
        }

        // 食品例（未完了の場合のみ表示）
        if (!slot.isCompleted && slot.foodExamples.isNotEmpty()) {
            Row(
                modifier = Modifier.padding(start = 24.dp, top = 2.dp)
            ) {
                Text(
                    text = "→ ${slot.foodExamples.joinToString(" + ")}",
                    style = MaterialTheme.typography.labelSmall,
                    color = textColor.copy(alpha = 0.7f)
                )
            }
        }
    }
}

