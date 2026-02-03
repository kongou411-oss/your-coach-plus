package com.yourcoach.plus.shared.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.components.*
import com.yourcoach.plus.shared.ui.screens.meal.AddMealScreen
import com.yourcoach.plus.shared.ui.screens.workout.AddWorkoutScreen
import com.yourcoach.plus.shared.ui.theme.*

/**
 * ダッシュボード画面 (Compose Multiplatform版)
 * Android版と同等の完全機能を持つKMP実装
 */
class DashboardScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<DashboardScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }

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

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
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
                                onMicroIndicatorClick = { /* TODO: Micro詳細シート */ }
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // タブ: クエスト / レコード
                        var selectedTabIndex by remember { mutableStateOf(0) }
                        val tabs = listOf("クエスト", "レコード")

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
                                // クエストタブ: タイムライン（メイン機能）
                                if (uiState.unifiedTimeline.isNotEmpty()) {
                                    UnifiedTimeline(
                                        items = uiState.unifiedTimeline,
                                        currentTimeMinutes = uiState.currentTimeMinutes,
                                        onItemClick = { item ->
                                            screenModel.onTimelineItemClick(item)
                                        },
                                        onRecordClick = { item ->
                                            when (item.type) {
                                                TimelineItemType.MEAL -> {
                                                    navigator.push(AddMealScreen(uiState.date))
                                                }
                                                TimelineItemType.WORKOUT -> {
                                                    navigator.push(AddWorkoutScreen(uiState.date))
                                                }
                                                TimelineItemType.CONDITION -> {
                                                    // コンディションはレコードタブで記録
                                                    selectedTabIndex = 1
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
                                                text = "食事や運動を記録してタイムラインを作成しましょう",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                                            )
                                            Spacer(modifier = Modifier.height(16.dp))
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                OutlinedButton(
                                                    onClick = { navigator.push(AddMealScreen(uiState.date)) }
                                                ) {
                                                    Icon(Icons.Default.Restaurant, contentDescription = null, modifier = Modifier.size(18.dp))
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                    Text("食事記録")
                                                }
                                                Button(
                                                    onClick = { navigator.push(AddWorkoutScreen(uiState.date)) }
                                                ) {
                                                    Icon(Icons.Default.FitnessCenter, contentDescription = null, modifier = Modifier.size(18.dp))
                                                    Spacer(modifier = Modifier.width(4.dp))
                                                    Text("運動記録")
                                                }
                                            }
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
                                        onAddMealClick = { navigator.push(AddMealScreen(uiState.date)) },
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
                                        onAddWorkoutClick = { navigator.push(AddWorkoutScreen(uiState.date)) },
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
    }
}
