package com.yourcoach.plus.shared.ui.screens.dashboard

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import com.yourcoach.plus.shared.ui.components.*
import com.yourcoach.plus.shared.ui.screens.main.LocalMainNavigator
import com.yourcoach.plus.shared.ui.screens.analysis.AnalysisScreen
import com.yourcoach.plus.shared.ui.screens.meal.AddMealScreen
import com.yourcoach.plus.shared.ui.screens.workout.AddWorkoutScreen
import com.yourcoach.plus.shared.ui.theme.*
import com.yourcoach.plus.shared.util.getSafeAreaTopPadding

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
                    // SafeAreaのトップパディングを取得（iOS: ノッチ/Dynamic Island対応）
                    val safeAreaTop = getSafeAreaTopPadding()

                    Column(
                        modifier = Modifier.fillMaxSize()
                    ) {
                        // SafeArea対応: 上部余白（iOS: ノッチ、Android: ステータスバー）
                        Spacer(modifier = Modifier.height(safeAreaTop))

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
                                            // タイムラインアイテムのインデックスから指示書アイテムを特定して完了トグル
                                            val directive = uiState.directive
                                            if (directive != null && item.directiveItemIndex != null) {
                                                screenModel.toggleDirectiveItem(item.directiveItemIndex)
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

                                    Spacer(modifier = Modifier.height(100.dp))
                                }
                            }
                        }

                        // 展開可能なボトムセクション
                        val expProgress = uiState.user?.profile?.calculateExpProgress()
                        ExpandableBottomSection(
                            level = expProgress?.level,
                            expCurrent = expProgress?.expCurrent,
                            expRequired = expProgress?.expRequired,
                            progressPercent = expProgress?.progressPercent,
                            freeCredits = uiState.user?.freeCredits,
                            paidCredits = uiState.user?.paidCredits,
                            onAnalysisClick = { navigator?.push(AnalysisScreen()) },
                            onGenerateQuestClick = { screenModel.generateQuest() },
                            isGeneratingQuest = uiState.isGeneratingQuest
                        )
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
    }
}

/**
 * 展開可能な統合ボトムバー
 * - 格納時: シェブロンのみ
 * - 展開時: レベル・クレジット・アクションボタン
 */
@Composable
private fun ExpandableBottomSection(
    // レベル情報（null = 非表示）
    level: Int? = null,
    expCurrent: Int? = null,
    expRequired: Int? = null,
    progressPercent: Int? = null,
    freeCredits: Int? = null,
    paidCredits: Int? = null,
    // アクションボタン
    onAnalysisClick: (() -> Unit)? = null,
    onGenerateQuestClick: (() -> Unit)? = null,
    isGeneratingQuest: Boolean = false
) {
    var isExpanded by rememberSaveable { mutableStateOf(true) }  // デフォルト展開

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // 上部の区切り線
        HorizontalDivider(
            color = MaterialTheme.colorScheme.outlineVariant,
            thickness = 0.5.dp
        )

        // シェブロンハンドル
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { isExpanded = !isExpanded }
                .padding(top = 4.dp, bottom = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isExpanded)
                        Icons.Default.KeyboardArrowDown
                    else
                        Icons.Default.KeyboardArrowUp,
                    contentDescription = if (isExpanded) "格納" else "展開",
                    modifier = Modifier.size(28.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // 展開コンテンツ（格納時はシェブロンのみになる）
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy,
                        stiffness = Spring.StiffnessMedium
                    )
                ) + fadeIn(animationSpec = tween(150)),
                exit = shrinkVertically(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioNoBouncy,
                        stiffness = Spring.StiffnessHigh
                    )
                ) + fadeOut(animationSpec = tween(100))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                ) {
                    // レベルバナー
                    if (level != null) {
                        LevelSection(
                            level = level,
                            expCurrent = expCurrent ?: 0,
                            expRequired = expRequired ?: 100,
                            progressPercent = progressPercent ?: 0,
                            freeCredits = freeCredits ?: 0,
                            paidCredits = paidCredits ?: 0
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // アクションボタン
                    if (onAnalysisClick != null || onGenerateQuestClick != null) {
                        ActionButtonsSection(
                            onAnalysisClick = onAnalysisClick,
                            onGenerateQuestClick = onGenerateQuestClick,
                            isGeneratingQuest = isGeneratingQuest
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                }
            }
    }
}

/**
 * レベル・XP・クレジットセクション
 */
@Composable
private fun LevelSection(
    level: Int,
    expCurrent: Int,
    expRequired: Int,
    progressPercent: Int,
    freeCredits: Int,
    paidCredits: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // 左側: レベル・XP
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            // レベルバッジ
            Surface(
                shape = CircleShape,
                color = Primary,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "$level",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            // XP情報
            Column(
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(
                    text = "Level $level",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                LinearProgressIndicator(
                    progress = { progressPercent / 100f },
                    modifier = Modifier
                        .width(100.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = Primary,
                    trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
                )
                Text(
                    text = "$expCurrent / $expRequired XP",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // 右側: クレジット
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.padding(start = 8.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocalFireDepartment,
                    contentDescription = "クレジット",
                    modifier = Modifier.size(16.dp),
                    tint = AccentOrange
                )
                Text(
                    text = "$freeCredits",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = Primary
                )
                Text(
                    text = "+",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "$paidCredits",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = AccentOrange
                )
            }
        }
    }
}

/**
 * アクションボタンセクション
 */
@Composable
private fun ActionButtonsSection(
    onAnalysisClick: (() -> Unit)?,
    onGenerateQuestClick: (() -> Unit)?,
    isGeneratingQuest: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 分析ボタン
        if (onAnalysisClick != null) {
            OutlinedButton(
                onClick = onAnalysisClick,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Analytics,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "分析",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "夜に実行",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // 明日の指示書ボタン
        if (onGenerateQuestClick != null) {
            Button(
                onClick = onGenerateQuestClick,
                enabled = !isGeneratingQuest,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
            ) {
                if (isGeneratingQuest) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "明日の指示書",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Text(
                        text = "クエスト生成",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }
        }
    }
}
