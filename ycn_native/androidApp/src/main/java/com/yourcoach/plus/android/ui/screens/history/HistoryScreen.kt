package com.yourcoach.plus.android.ui.screens.history

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.android.ui.theme.AccentOrange
import com.yourcoach.plus.android.ui.theme.Primary
import com.yourcoach.plus.android.ui.theme.ScoreCalories
import com.yourcoach.plus.android.ui.theme.ScoreCarbs
import com.yourcoach.plus.android.ui.theme.ScoreExercise
import com.yourcoach.plus.android.ui.theme.ScoreFat
import com.yourcoach.plus.android.ui.theme.ScoreProtein
import com.yourcoach.plus.android.ui.theme.ScoreWater
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.model.WorkoutType
import org.koin.androidx.compose.koinViewModel
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/**
 * 履歴画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel = koinViewModel(),
    onNavigateToMealDetail: (String) -> Unit = {},
    onNavigateToWorkoutDetail: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // ボトムシート用の状態
    var selectedMeal by remember { mutableStateOf<Meal?>(null) }
    var selectedWorkout by remember { mutableStateOf<Workout?>(null) }
    val mealSheetState = rememberModalBottomSheetState()
    val workoutSheetState = rememberModalBottomSheetState()

    // エラー表示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // タブ
            TabRow(
                selectedTabIndex = uiState.selectedTab.ordinal,
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                HistoryTab.entries.forEach { tab ->
                    Tab(
                        selected = uiState.selectedTab == tab,
                        onClick = { viewModel.selectTab(tab) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = when (tab) {
                                        HistoryTab.CALENDAR -> Icons.Default.CalendarMonth
                                        HistoryTab.GRAPH -> Icons.Default.ShowChart
                                    },
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = when (tab) {
                                        HistoryTab.CALENDAR -> "カレンダー"
                                        HistoryTab.GRAPH -> "グラフ"
                                    }
                                )
                            }
                        }
                    )
                }
            }

            // コンテンツ
            PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = viewModel::loadData,
                modifier = Modifier.fillMaxSize()
            ) {
                when (uiState.selectedTab) {
                    HistoryTab.CALENDAR -> CalendarView(
                        currentMonth = uiState.currentMonth,
                        selectedDate = uiState.selectedDate,
                        recordedDates = uiState.recordedDates,
                        meals = uiState.meals,
                        workouts = uiState.workouts,
                        onDateSelected = viewModel::selectDate,
                        onPreviousMonth = viewModel::goToPreviousMonth,
                        onNextMonth = viewModel::goToNextMonth,
                        onMealClick = { mealId ->
                            // 食事をIDで検索してボトムシートを開く
                            selectedMeal = uiState.meals.find { it.id == mealId }
                        },
                        onWorkoutClick = { workoutId ->
                            // 運動をIDで検索してボトムシートを開く
                            selectedWorkout = uiState.workouts.find { it.id == workoutId }
                        }
                    )

                    HistoryTab.GRAPH -> GraphView(
                        selectedType = uiState.graphType,
                        onTypeSelected = viewModel::selectGraphType,
                        fitnessGoal = uiState.fitnessGoal,
                        lbmData = uiState.lbmData,
                        weightData = uiState.weightData,
                        caloriesData = uiState.caloriesData,
                        nutritionData = uiState.nutritionData,
                        exerciseData = uiState.exerciseData,
                        conditionData = uiState.conditionData
                    )
                }
            }
        }
    }

    // 食事詳細ボトムシート
    selectedMeal?.let { meal ->
        ModalBottomSheet(
            onDismissRequest = { selectedMeal = null },
            sheetState = mealSheetState
        ) {
            MealDetailSheet(meal = meal)
        }
    }

    // 運動詳細ボトムシート
    selectedWorkout?.let { workout ->
        ModalBottomSheet(
            onDismissRequest = { selectedWorkout = null },
            sheetState = workoutSheetState
        ) {
            WorkoutDetailSheet(workout = workout)
        }
    }
}

/**
 * 食事詳細ボトムシート
 */
@Composable
private fun MealDetailSheet(meal: Meal) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        // ヘッダー
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = when (meal.type) {
                        MealType.BREAKFAST -> "🌅"
                        MealType.LUNCH -> "☀️"
                        MealType.DINNER -> "🌙"
                        MealType.SNACK -> "🍪"
                        MealType.SUPPLEMENT -> "💊"
                    },
                    style = MaterialTheme.typography.headlineSmall
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = meal.name?.takeIf { it.isNotBlank() } ?: when (meal.type) {
                            MealType.BREAKFAST -> "朝食"
                            MealType.LUNCH -> "昼食"
                            MealType.DINNER -> "夕食"
                            MealType.SNACK -> "間食"
                            MealType.SUPPLEMENT -> "サプリ"
                        },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    meal.time?.let { time ->
                        Text(
                            text = time,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            Text(
                text = "${meal.totalCalories} kcal",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = ScoreCalories
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))

        // 食品リスト
        if (meal.items.isNotEmpty()) {
            meal.items.forEach { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "•",
                            style = MaterialTheme.typography.bodyLarge,
                            color = Primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = item.name,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "${item.amount.toInt()}${item.unit}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = "${item.calories} kcal",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            Text(
                text = "食品データなし",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))

        // PFC合計
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            NutrientSummaryItem("P", meal.totalProtein, "g", ScoreProtein)
            NutrientSummaryItem("F", meal.totalFat, "g", ScoreFat)
            NutrientSummaryItem("C", meal.totalCarbs, "g", ScoreCarbs)
        }
    }
}

/**
 * 運動詳細ボトムシート
 */
@Composable
private fun WorkoutDetailSheet(workout: Workout) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        // ヘッダー
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = when (workout.type) {
                        WorkoutType.STRENGTH -> "💪"
                        WorkoutType.CARDIO -> "🏃"
                        WorkoutType.FLEXIBILITY -> "🧘"
                        WorkoutType.SPORTS -> "⚽"
                        WorkoutType.DAILY_ACTIVITY -> "🚶"
                    },
                    style = MaterialTheme.typography.headlineSmall
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = workout.name ?: when (workout.type) {
                            WorkoutType.STRENGTH -> "筋トレ"
                            WorkoutType.CARDIO -> "有酸素運動"
                            WorkoutType.FLEXIBILITY -> "ストレッチ"
                            WorkoutType.SPORTS -> "スポーツ"
                            WorkoutType.DAILY_ACTIVITY -> "日常活動"
                        },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${workout.totalDuration}分",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${workout.totalCaloriesBurned} kcal",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = ScoreExercise
                )
                Text(
                    text = "消費",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))

        // 種目リスト
        if (workout.exercises.isNotEmpty()) {
            workout.exercises.forEach { exercise ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "•",
                            style = MaterialTheme.typography.bodyLarge,
                            color = AccentOrange
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = exercise.name,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                    // 種目の詳細（セット×レップ or 時間）
                    val detail = buildString {
                        exercise.sets?.let { append("${it}セット") }
                        exercise.reps?.let {
                            if (isNotEmpty()) append(" × ")
                            append("${it}回")
                        }
                        exercise.weight?.let {
                            if (isNotEmpty()) append(" ")
                            append("@ ${it.toInt()}kg")
                        }
                        exercise.duration?.let {
                            if (isEmpty()) append("${it}分")
                        }
                    }
                    Text(
                        text = detail,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            Text(
                text = "種目データなし",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 栄養素サマリーアイテム
 */
@Composable
private fun NutrientSummaryItem(
    label: String,
    value: Float,
    unit: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = "${value.toInt()}$unit",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )
    }
}

/**
 * カレンダービュー
 */
@Composable
private fun CalendarView(
    currentMonth: YearMonth,
    selectedDate: LocalDate,
    recordedDates: Set<LocalDate>,
    meals: List<Meal>,
    workouts: List<Workout>,
    onDateSelected: (LocalDate) -> Unit,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onMealClick: (String) -> Unit,
    onWorkoutClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // 月ヘッダー
        item {
            MonthHeader(
                currentMonth = currentMonth,
                onPreviousMonth = onPreviousMonth,
                onNextMonth = onNextMonth
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // カレンダーグリッド
        item {
            CalendarGrid(
                currentMonth = currentMonth,
                selectedDate = selectedDate,
                recordedDates = recordedDates,
                onDateSelected = onDateSelected
            )
            Spacer(modifier = Modifier.height(24.dp))
        }

        // 選択日のヘッダー
        item {
            Text(
                text = selectedDate.format(
                    DateTimeFormatter.ofPattern("M月d日（E）", Locale.JAPANESE)
                ),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // 食事記録
        if (meals.isNotEmpty()) {
            item {
                SectionHeader(
                    icon = Icons.Default.Restaurant,
                    title = "食事",
                    color = Primary
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
            items(meals) { meal ->
                MealCard(meal = meal, onClick = { onMealClick(meal.id) })
                Spacer(modifier = Modifier.height(8.dp))
            }
        }

        // 運動記録
        if (workouts.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionHeader(
                    icon = Icons.AutoMirrored.Filled.DirectionsRun,
                    title = "運動",
                    color = AccentOrange
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
            items(workouts) { workout ->
                WorkoutCard(workout = workout, onClick = { onWorkoutClick(workout.id) })
                Spacer(modifier = Modifier.height(8.dp))
            }
        }

        // 記録がない場合
        if (meals.isEmpty() && workouts.isEmpty()) {
            item {
                EmptyRecordMessage()
            }
        }

        // ボトムナビ用余白
        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

/**
 * 月ヘッダー
 */
@Composable
private fun MonthHeader(
    currentMonth: YearMonth,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit
) {
    val isCurrentMonth = currentMonth == YearMonth.now()

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPreviousMonth) {
            Icon(
                imageVector = Icons.Default.ChevronLeft,
                contentDescription = "前月"
            )
        }

        Text(
            text = currentMonth.format(
                DateTimeFormatter.ofPattern("yyyy年 M月", Locale.JAPANESE)
            ),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        IconButton(
            onClick = onNextMonth,
            enabled = !isCurrentMonth
        ) {
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "翌月",
                tint = if (isCurrentMonth) Color.Gray else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

/**
 * カレンダーグリッド
 */
@Composable
private fun CalendarGrid(
    currentMonth: YearMonth,
    selectedDate: LocalDate,
    recordedDates: Set<LocalDate>,
    onDateSelected: (LocalDate) -> Unit
) {
    val firstDayOfMonth = currentMonth.atDay(1)
    val lastDayOfMonth = currentMonth.atEndOfMonth()
    val firstDayOfWeek = firstDayOfMonth.dayOfWeek
    val daysInMonth = currentMonth.lengthOfMonth()

    // 曜日ヘッダー
    val weekDays = listOf("日", "月", "火", "水", "木", "金", "土")

    Column {
        // 曜日ヘッダー
        Row(modifier = Modifier.fillMaxWidth()) {
            weekDays.forEachIndexed { index, day ->
                Text(
                    text = day,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    color = when (index) {
                        0 -> Color.Red.copy(alpha = 0.8f)
                        6 -> Color.Blue.copy(alpha = 0.8f)
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 日付グリッド
        val startOffset = (firstDayOfWeek.value % 7)
        val totalCells = startOffset + daysInMonth
        val rows = (totalCells + 6) / 7

        repeat(rows) { row ->
            Row(modifier = Modifier.fillMaxWidth()) {
                repeat(7) { col ->
                    val dayIndex = row * 7 + col - startOffset + 1
                    if (dayIndex in 1..daysInMonth) {
                        val date = currentMonth.atDay(dayIndex)
                        val isSelected = date == selectedDate
                        val hasRecord = recordedDates.contains(date)
                        val isToday = date == LocalDate.now()
                        val isFuture = date.isAfter(LocalDate.now())

                        DayCell(
                            day = dayIndex,
                            isSelected = isSelected,
                            hasRecord = hasRecord,
                            isToday = isToday,
                            isFuture = isFuture,
                            onClick = { if (!isFuture) onDateSelected(date) },
                            modifier = Modifier.weight(1f)
                        )
                    } else {
                        Box(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

/**
 * 日付セル
 */
@Composable
private fun DayCell(
    day: Int,
    isSelected: Boolean,
    hasRecord: Boolean,
    isToday: Boolean,
    isFuture: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val backgroundColor = when {
        isSelected -> Primary
        hasRecord -> Primary.copy(alpha = 0.2f)
        else -> Color.Transparent
    }

    val textColor = when {
        isFuture -> Color.Gray.copy(alpha = 0.4f)
        isSelected -> Color.White
        isToday -> Primary
        else -> MaterialTheme.colorScheme.onSurface
    }

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .padding(2.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(backgroundColor)
            .then(
                if (isToday && !isSelected) {
                    Modifier.border(2.dp, Primary, RoundedCornerShape(8.dp))
                } else {
                    Modifier
                }
            )
            .clickable(enabled = !isFuture, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "$day",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected || isToday) FontWeight.Bold else FontWeight.Normal,
                color = textColor
            )
            if (hasRecord && !isSelected) {
                Box(
                    modifier = Modifier
                        .size(4.dp)
                        .background(Primary, CircleShape)
                )
            }
        }
    }
}

/**
 * セクションヘッダー
 */
@Composable
private fun SectionHeader(
    icon: ImageVector,
    title: String,
    color: Color
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Medium,
            color = color
        )
    }
}

/**
 * 食事カード
 */
@Composable
private fun MealCard(
    meal: Meal,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 食事アイコン（サプリのみ別アイコン）
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(Primary.copy(alpha = 0.1f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (meal.type == MealType.SUPPLEMENT)
                                Icons.Default.Medication else Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            // meal.nameがあれば優先表示（食事1、食事2など）
                            text = meal.name?.takeIf { it.isNotBlank() } ?: when (meal.type) {
                                MealType.BREAKFAST -> "朝食"
                                MealType.LUNCH -> "昼食"
                                MealType.DINNER -> "夕食"
                                MealType.SNACK -> "間食"
                                MealType.SUPPLEMENT -> "サプリ"
                            },
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${meal.items.size}品目",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${meal.totalCalories} kcal",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = ScoreCalories
                    )
                    Row {
                        // PFC順（Protein, Fat, Carbs）
                        NutrientBadge("P", meal.totalProtein.toInt(), ScoreProtein)
                        Spacer(modifier = Modifier.width(4.dp))
                        NutrientBadge("F", meal.totalFat.toInt(), ScoreFat)
                        Spacer(modifier = Modifier.width(4.dp))
                        NutrientBadge("C", meal.totalCarbs.toInt(), ScoreCarbs)
                    }
                }
            }

            // メモがある場合は表示
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
        }
    }
}

/**
 * 栄養素バッジ
 */
@Composable
private fun NutrientBadge(
    label: String,
    value: Int,
    color: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
            .padding(horizontal = 4.dp, vertical = 2.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "$value",
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}

/**
 * 運動カード
 */
@Composable
private fun WorkoutCard(
    workout: Workout,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 運動タイプアイコン
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(AccentOrange.copy(alpha = 0.1f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = when (workout.type) {
                                WorkoutType.STRENGTH -> "💪"
                                WorkoutType.CARDIO -> "🏃"
                                WorkoutType.FLEXIBILITY -> "🧘"
                                WorkoutType.SPORTS -> "⚽"
                                WorkoutType.DAILY_ACTIVITY -> "🚶"
                            },
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = when (workout.type) {
                                WorkoutType.STRENGTH -> "筋トレ"
                                WorkoutType.CARDIO -> "有酸素運動"
                                WorkoutType.FLEXIBILITY -> "ストレッチ"
                                WorkoutType.SPORTS -> "スポーツ"
                                WorkoutType.DAILY_ACTIVITY -> "日常活動"
                            },
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "${workout.exercises.size}種目 / ${workout.totalDuration}分",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${workout.totalCaloriesBurned} kcal",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = ScoreExercise
                    )
                    Text(
                        text = "消費",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // メモがある場合は表示
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
        }
    }
}

/**
 * 記録なしメッセージ
 */
@Composable
private fun EmptyRecordMessage() {
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "📝",
                style = MaterialTheme.typography.displaySmall
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "この日の記録はありません",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * トレンドを計算
 */
private fun calculateTrend(data: List<GraphDataPoint>): Trend {
    if (data.size < 2) return Trend.FLAT
    val firstHalf = data.take(data.size / 2).map { it.value }.average()
    val secondHalf = data.takeLast(data.size / 2).map { it.value }.average()
    val diff = secondHalf - firstHalf
    val threshold = firstHalf * 0.02 // 2%以上の変化でトレンド判定
    return when {
        diff > threshold -> Trend.UP
        diff < -threshold -> Trend.DOWN
        else -> Trend.FLAT
    }
}

private enum class Trend { UP, DOWN, FLAT }

/**
 * グラフビュー
 */
@Composable
private fun GraphView(
    selectedType: GraphType,
    onTypeSelected: (GraphType) -> Unit,
    fitnessGoal: FitnessGoal,
    lbmData: List<GraphDataPoint>,
    weightData: List<GraphDataPoint>,
    caloriesData: List<GraphDataPoint>,
    nutritionData: NutritionGraphData,
    exerciseData: List<GraphDataPoint>,
    conditionData: List<GraphDataPoint>
) {
    // 現在選択中のデータのトレンドを計算
    val trend = when (selectedType) {
        GraphType.LBM -> calculateTrend(lbmData)
        GraphType.WEIGHT -> calculateTrend(weightData)
        GraphType.CALORIES -> calculateTrend(caloriesData)
        GraphType.NUTRITION -> {
            // 栄養素はタンパク質のトレンドを代表として使用
            val proteinData = nutritionData.dates.mapIndexed { i, date ->
                GraphDataPoint(date, nutritionData.proteins.getOrElse(i) { 0f })
            }
            calculateTrend(proteinData)
        }
        GraphType.EXERCISE -> calculateTrend(exerciseData)
        GraphType.CONDITION -> calculateTrend(conditionData)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // グラフタイプ選択（横スクロール対応）
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            GraphType.entries.forEach { type ->
                FilterChip(
                    selected = selectedType == type,
                    onClick = { onTypeSelected(type) },
                    label = {
                        Text(
                            text = when (type) {
                                GraphType.LBM -> "LBM"
                                GraphType.WEIGHT -> "体重"
                                GraphType.CALORIES -> "カロリー"
                                GraphType.NUTRITION -> "栄養素"
                                GraphType.EXERCISE -> "運動"
                                GraphType.CONDITION -> "体調"
                            },
                            style = MaterialTheme.typography.labelMedium
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Primary.copy(alpha = 0.2f),
                        selectedLabelColor = Primary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // グラフエリア
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // グラフタイトル + トレンド
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = when (selectedType) {
                            GraphType.LBM -> "LBM推移（過去7日間）"
                            GraphType.WEIGHT -> "体重推移（過去7日間）"
                            GraphType.CALORIES -> "摂取カロリー（過去7日間）"
                            GraphType.NUTRITION -> "栄養素バランス（過去7日間）"
                            GraphType.EXERCISE -> "消費カロリー（過去7日間）"
                            GraphType.CONDITION -> "体調スコア（過去7日間）"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    // トレンド表示（fitnessGoal考慮）
                    TrendBadge(trend = trend, graphType = selectedType, fitnessGoal = fitnessGoal)
                }

                Spacer(modifier = Modifier.height(16.dp))

                // グラフ表示（軸付き）
                when (selectedType) {
                    GraphType.LBM -> ChartWithAxes(
                        data = lbmData,
                        unit = "kg",
                        chartColor = ScoreProtein,
                        isLineChart = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                    GraphType.WEIGHT -> ChartWithAxes(
                        data = weightData,
                        unit = "kg",
                        chartColor = ScoreWater,
                        isLineChart = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                    GraphType.CALORIES -> ChartWithAxes(
                        data = caloriesData,
                        unit = "kcal",
                        chartColor = ScoreCalories,
                        isLineChart = false,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                    GraphType.NUTRITION -> NutritionChartWithAxes(
                        data = nutritionData,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                    GraphType.EXERCISE -> ChartWithAxes(
                        data = exerciseData,
                        unit = "kcal",
                        chartColor = ScoreExercise,
                        isLineChart = false,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                    GraphType.CONDITION -> ChartWithAxes(
                        data = conditionData,
                        unit = "pt",
                        chartColor = Primary,
                        isLineChart = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                }

                // 凡例
                when (selectedType) {
                    GraphType.LBM -> {
                        LegendItem(color = ScoreProtein, label = "LBM - 除脂肪体重 (kg)")
                    }
                    GraphType.WEIGHT -> {
                        LegendItem(color = ScoreWater, label = "体重 (kg)")
                    }
                    GraphType.CALORIES -> {
                        LegendItem(color = ScoreCalories, label = "摂取カロリー (kcal)")
                    }
                    GraphType.NUTRITION -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            LegendItem(color = ScoreProtein, label = "タンパク質")
                            LegendItem(color = ScoreFat, label = "脂質")
                            LegendItem(color = ScoreCarbs, label = "炭水化物")
                        }
                    }
                    GraphType.EXERCISE -> {
                        LegendItem(color = ScoreExercise, label = "消費カロリー (kcal)")
                    }
                    GraphType.CONDITION -> {
                        LegendItem(color = Primary, label = "体調スコア (0-100点)")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp)) // ボトムナビ用余白
    }
}

/**
 * トレンドバッジ
 * - LBM: 上昇=良い（筋肉増加）、下降=悪い（筋肉減少）
 * - 体重: 目標に応じて判定
 *   - LOSE_WEIGHT: 下降=良い、上昇=悪い
 *   - GAIN_MUSCLE: 上昇=良い、下降=悪い
 *   - MAINTAIN: どちらも注意
 * - カロリー/栄養素/運動: 上昇=良い
 */
@Composable
private fun TrendBadge(trend: Trend, graphType: GraphType, fitnessGoal: FitnessGoal) {
    val goodColor = Color(0xFF43A047)
    val badColor = Color(0xFFE53935)
    val neutralColor = Color.Gray

    val (text, color, icon) = when (trend) {
        Trend.UP -> {
            when (graphType) {
                GraphType.LBM -> Triple("上昇↑", goodColor, "📈") // LBM増加は常に良い
                GraphType.WEIGHT -> when (fitnessGoal) {
                    FitnessGoal.LOSE_WEIGHT -> Triple("上昇↑", badColor, "📈")
                    FitnessGoal.GAIN_MUSCLE -> Triple("上昇↑", goodColor, "📈")
                    FitnessGoal.MAINTAIN -> Triple("上昇↑", neutralColor, "📈")
                }
                else -> Triple("上昇↑", goodColor, "📈")
            }
        }
        Trend.DOWN -> {
            when (graphType) {
                GraphType.LBM -> Triple("下降↓", badColor, "📉") // LBM減少は常に悪い
                GraphType.WEIGHT -> when (fitnessGoal) {
                    FitnessGoal.LOSE_WEIGHT -> Triple("下降↓", goodColor, "📉")
                    FitnessGoal.GAIN_MUSCLE -> Triple("下降↓", badColor, "📉")
                    FitnessGoal.MAINTAIN -> Triple("下降↓", neutralColor, "📉")
                }
                else -> Triple("下降↓", badColor, "📉")
            }
        }
        Trend.FLAT -> Triple("横ばい→", neutralColor, "➡️")
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(text = icon, style = MaterialTheme.typography.labelMedium)
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = color,
            fontWeight = FontWeight.Bold
        )
    }
}

/**
 * 凡例アイテム
 */
@Composable
private fun LegendItem(
    color: Color,
    label: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(12.dp)
                .background(color, CircleShape)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * 軸付きグラフ（汎用）
 */
@Composable
private fun ChartWithAxes(
    data: List<GraphDataPoint>,
    unit: String,
    chartColor: Color,
    isLineChart: Boolean,
    modifier: Modifier = Modifier
) {
    if (data.isEmpty()) {
        EmptyChartMessage(modifier)
        return
    }

    val values = data.map { it.value }
    val minValue = values.minOrNull() ?: 0f
    val maxValue = values.maxOrNull() ?: 100f
    val range = (maxValue - minValue).coerceAtLeast(1f)

    // Y軸の範囲を少し広げる
    val yMin = (minValue - range * 0.1f).coerceAtLeast(0f)
    val yMax = maxValue + range * 0.1f
    val yRange = yMax - yMin

    // Y軸の表示フォーマット
    val formatY: (Float) -> String = { value ->
        when (unit) {
            "kg" -> "%.1f".format(value)
            "pt" -> "%.0f".format(value)
            else -> "%.0f".format(value)
        }
    }

    Column(modifier = modifier) {
        Row(modifier = Modifier.weight(1f)) {
            // Y軸ラベル（見やすく改善）
            Column(
                modifier = Modifier
                    .width(50.dp)
                    .fillMaxHeight()
                    .padding(end = 4.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = formatY(yMax),
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = formatY((yMax + yMin) / 2),
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = formatY(yMin),
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // グラフ本体
            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            ) {
                val width = size.width
                val height = size.height

                // グリッド線
                val gridColor = Color.Gray.copy(alpha = 0.2f)
                for (i in 0..2) {
                    val y = height * i / 2f
                    drawLine(gridColor, Offset(0f, y), Offset(width, y), strokeWidth = 1f)
                }

                if (isLineChart) {
                    // 折れ線グラフ（両端に余白を持たせる）
                    val padding = width / (data.size + 1)
                    val stepX = (width - padding * 2) / (data.size - 1).coerceAtLeast(1)
                    val path = Path()
                    data.forEachIndexed { index, point ->
                        val x = padding + index * stepX
                        val y = height - ((point.value - yMin) / yRange * height)
                        if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                    }
                    drawPath(path, chartColor, style = Stroke(width = 4f, cap = StrokeCap.Round, join = StrokeJoin.Round))
                    data.forEachIndexed { index, point ->
                        val x = padding + index * stepX
                        val y = height - ((point.value - yMin) / yRange * height)
                        drawCircle(chartColor, radius = 6f, center = Offset(x, y))
                    }
                } else {
                    // 棒グラフ（均等配置）
                    val totalWidth = width
                    val barWidth = totalWidth / (data.size * 1.8f)
                    val groupWidth = totalWidth / data.size
                    data.forEachIndexed { index, point ->
                        val barHeight = ((point.value - yMin) / yRange * height).coerceAtLeast(2f)
                        val centerX = groupWidth * index + groupWidth / 2
                        val x = centerX - barWidth / 2
                        val y = height - barHeight
                        drawRoundRect(chartColor, Offset(x, y), Size(barWidth, barHeight), CornerRadius(6f))
                    }
                }
            }
        }

        // X軸ラベル（日付）- 各棒/点の真下に配置
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 50.dp, top = 8.dp)
        ) {
            data.forEach { point ->
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${point.date.dayOfMonth}日",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

/**
 * 栄養素グラフ（軸付き）
 */
@Composable
private fun NutritionChartWithAxes(
    data: NutritionGraphData,
    modifier: Modifier = Modifier
) {
    if (data.dates.isEmpty()) {
        EmptyChartMessage(modifier)
        return
    }

    val allValues = data.proteins + data.fats + data.carbs
    val maxValue = allValues.maxOrNull() ?: 100f
    val yMax = maxValue * 1.1f

    Column(modifier = modifier) {
        Row(modifier = Modifier.weight(1f)) {
            // Y軸ラベル（見やすく改善）
            Column(
                modifier = Modifier
                    .width(50.dp)
                    .fillMaxHeight()
                    .padding(end = 4.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = "%.0fg".format(yMax),
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "%.0fg".format(yMax / 2),
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "0g",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // グラフ本体
            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            ) {
                val width = size.width
                val height = size.height
                val groupWidth = width / data.dates.size
                val barWidth = groupWidth / 4.5f
                val gap = barWidth / 3f

                // グリッド線
                val gridColor = Color.Gray.copy(alpha = 0.2f)
                for (i in 0..2) {
                    val y = height * i / 2f
                    drawLine(gridColor, Offset(0f, y), Offset(width, y), strokeWidth = 1f)
                }

                data.dates.forEachIndexed { index, _ ->
                    // グループの中央を計算
                    val groupCenterX = groupWidth * index + groupWidth / 2
                    val totalBarsWidth = barWidth * 3 + gap * 2
                    val groupStartX = groupCenterX - totalBarsWidth / 2

                    // タンパク質 (P)
                    val pHeight = (data.proteins.getOrElse(index) { 0f } / yMax * height).coerceAtLeast(2f)
                    drawRoundRect(ScoreProtein, Offset(groupStartX, height - pHeight), Size(barWidth, pHeight), CornerRadius(3f))

                    // 脂質 (F)
                    val fHeight = (data.fats.getOrElse(index) { 0f } / yMax * height).coerceAtLeast(2f)
                    drawRoundRect(ScoreFat, Offset(groupStartX + barWidth + gap, height - fHeight), Size(barWidth, fHeight), CornerRadius(3f))

                    // 炭水化物 (C)
                    val cHeight = (data.carbs.getOrElse(index) { 0f } / yMax * height).coerceAtLeast(2f)
                    drawRoundRect(ScoreCarbs, Offset(groupStartX + (barWidth + gap) * 2, height - cHeight), Size(barWidth, cHeight), CornerRadius(3f))
                }
            }
        }

        // X軸ラベル（日付）- 各グループの真下に配置
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 50.dp, top = 8.dp)
        ) {
            data.dates.forEach { date ->
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${date.dayOfMonth}日",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

/**
 * 体重の折れ線グラフ（Compose Canvas実装）- 旧版（互換用）
 */
@Composable
private fun WeightLineChart(
    data: List<GraphDataPoint>,
    modifier: Modifier = Modifier
) {
    if (data.isEmpty()) {
        EmptyChartMessage(modifier)
        return
    }

    val lineColor = ScoreWater
    val values = data.map { it.value }
    val minValue = values.minOrNull() ?: 0f
    val maxValue = values.maxOrNull() ?: 100f
    val range = (maxValue - minValue).coerceAtLeast(1f)

    Canvas(modifier = modifier.padding(8.dp)) {
        val width = size.width
        val height = size.height
        val stepX = width / (data.size - 1).coerceAtLeast(1)

        // 折れ線を描画
        val path = Path()
        data.forEachIndexed { index, point ->
            val x = index * stepX
            val y = height - ((point.value - minValue) / range * height)
            if (index == 0) {
                path.moveTo(x, y)
            } else {
                path.lineTo(x, y)
            }
        }
        drawPath(
            path = path,
            color = lineColor,
            style = Stroke(
                width = 4f,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )

        // データポイントを描画
        data.forEachIndexed { index, point ->
            val x = index * stepX
            val y = height - ((point.value - minValue) / range * height)
            drawCircle(
                color = lineColor,
                radius = 8f,
                center = Offset(x, y)
            )
        }
    }
}

/**
 * カロリーの棒グラフ（Compose Canvas実装）
 */
@Composable
private fun CaloriesColumnChart(
    data: List<GraphDataPoint>,
    modifier: Modifier = Modifier
) {
    if (data.isEmpty()) {
        EmptyChartMessage(modifier)
        return
    }

    val barColor = ScoreCalories
    val values = data.map { it.value }
    val maxValue = values.maxOrNull() ?: 100f

    Canvas(modifier = modifier.padding(8.dp)) {
        val width = size.width
        val height = size.height
        val barWidth = width / (data.size * 2f)
        val spacing = barWidth

        data.forEachIndexed { index, point ->
            val barHeight = (point.value / maxValue) * height
            val x = index * (barWidth + spacing) + spacing / 2
            val y = height - barHeight

            drawRoundRect(
                color = barColor,
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(8f, 8f)
            )
        }
    }
}

/**
 * 栄養素のグループ棒グラフ（Compose Canvas実装）
 */
@Composable
private fun NutritionStackedChart(
    data: NutritionGraphData,
    modifier: Modifier = Modifier
) {
    if (data.dates.isEmpty()) {
        EmptyChartMessage(modifier)
        return
    }

    val proteinColor = ScoreProtein
    val carbsColor = ScoreCarbs
    val fatColor = ScoreFat

    val allValues = data.proteins + data.carbs + data.fats
    val maxValue = allValues.maxOrNull() ?: 100f

    Canvas(modifier = modifier.padding(8.dp)) {
        val width = size.width
        val height = size.height
        val groupWidth = width / data.dates.size
        val barWidth = groupWidth / 4f
        val gap = barWidth / 4f

        data.dates.forEachIndexed { index, _ ->
            val groupX = index * groupWidth + gap

            // タンパク質 (P)
            val proteinHeight = (data.proteins[index] / maxValue) * height
            drawRoundRect(
                color = proteinColor,
                topLeft = Offset(groupX, height - proteinHeight),
                size = Size(barWidth, proteinHeight),
                cornerRadius = CornerRadius(4f, 4f)
            )

            // 脂質 (F)
            val fatHeight = (data.fats[index] / maxValue) * height
            drawRoundRect(
                color = fatColor,
                topLeft = Offset(groupX + barWidth + gap, height - fatHeight),
                size = Size(barWidth, fatHeight),
                cornerRadius = CornerRadius(4f, 4f)
            )

            // 炭水化物 (C)
            val carbsHeight = (data.carbs[index] / maxValue) * height
            drawRoundRect(
                color = carbsColor,
                topLeft = Offset(groupX + (barWidth + gap) * 2, height - carbsHeight),
                size = Size(barWidth, carbsHeight),
                cornerRadius = CornerRadius(4f, 4f)
            )
        }
    }
}

/**
 * 運動消費カロリーの棒グラフ（Compose Canvas実装）
 */
@Composable
private fun ExerciseColumnChart(
    data: List<GraphDataPoint>,
    modifier: Modifier = Modifier
) {
    if (data.isEmpty()) {
        EmptyChartMessage(modifier)
        return
    }

    val barColor = ScoreExercise
    val values = data.map { it.value }
    val maxValue = values.maxOrNull() ?: 100f

    Canvas(modifier = modifier.padding(8.dp)) {
        val width = size.width
        val height = size.height
        val barWidth = width / (data.size * 2f)
        val spacing = barWidth

        data.forEachIndexed { index, point ->
            val barHeight = (point.value / maxValue) * height
            val x = index * (barWidth + spacing) + spacing / 2
            val y = height - barHeight

            drawRoundRect(
                color = barColor,
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(8f, 8f)
            )
        }
    }
}

/**
 * グラフデータがない場合のメッセージ
 */
@Composable
private fun EmptyChartMessage(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Default.ShowChart,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "データがありません",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
