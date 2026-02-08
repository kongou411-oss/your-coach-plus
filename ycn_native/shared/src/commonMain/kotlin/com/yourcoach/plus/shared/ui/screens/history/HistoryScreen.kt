package com.yourcoach.plus.shared.ui.screens.history

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
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
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import com.yourcoach.plus.shared.domain.model.FitnessGoal
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.model.WorkoutType
import com.yourcoach.plus.shared.ui.theme.*
import kotlinx.datetime.*

/**
 * History Screen (Compose Multiplatform)
 */
class HistoryScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<HistoryScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val snackbarHostState = remember { SnackbarHostState() }

        // Bottom sheet states
        var selectedMeal by remember { mutableStateOf<Meal?>(null) }
        var selectedWorkout by remember { mutableStateOf<Workout?>(null) }
        val mealSheetState = rememberModalBottomSheetState()
        val workoutSheetState = rememberModalBottomSheetState()

        // Error display
        LaunchedEffect(uiState.error) {
            uiState.error?.let { error ->
                snackbarHostState.showSnackbar(error)
                screenModel.clearError()
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
                // Tabs
                TabRow(
                    selectedTabIndex = uiState.selectedTab.ordinal,
                    containerColor = MaterialTheme.colorScheme.surface
                ) {
                    HistoryTab.entries.forEach { tab ->
                        Tab(
                            selected = uiState.selectedTab == tab,
                            onClick = { screenModel.selectTab(tab) },
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

                // Content
                PullToRefreshBox(
                    isRefreshing = uiState.isLoading,
                    onRefresh = screenModel::loadData,
                    modifier = Modifier.fillMaxSize()
                ) {
                    when (uiState.selectedTab) {
                        HistoryTab.CALENDAR -> CalendarView(
                            currentMonth = uiState.currentYearMonth,
                            selectedDate = uiState.selectedDate,
                            recordedDates = uiState.recordedDates,
                            meals = uiState.meals,
                            workouts = uiState.workouts,
                            onDateSelected = screenModel::selectDate,
                            onPreviousMonth = screenModel::goToPreviousMonth,
                            onNextMonth = screenModel::goToNextMonth,
                            onMealClick = { mealId ->
                                selectedMeal = uiState.meals.find { it.id == mealId }
                            },
                            onWorkoutClick = { workoutId ->
                                selectedWorkout = uiState.workouts.find { it.id == workoutId }
                            }
                        )

                        HistoryTab.GRAPH -> GraphView(
                            selectedType = uiState.graphType,
                            onTypeSelected = screenModel::selectGraphType,
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

        // Meal detail bottom sheet
        selectedMeal?.let { meal ->
            ModalBottomSheet(
                onDismissRequest = { selectedMeal = null },
                sheetState = mealSheetState
            ) {
                MealDetailSheet(meal = meal)
            }
        }

        // Workout detail bottom sheet
        selectedWorkout?.let { workout ->
            ModalBottomSheet(
                onDismissRequest = { selectedWorkout = null },
                sheetState = workoutSheetState
            ) {
                WorkoutDetailSheet(workout = workout)
            }
        }
    }
}

/**
 * Meal detail bottom sheet
 */
@Composable
private fun MealDetailSheet(meal: Meal) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = when (meal.type) {
                        MealType.BREAKFAST -> "朝食"
                        MealType.LUNCH -> "昼食"
                        MealType.DINNER -> "夕食"
                        MealType.SNACK -> "間食"
                        MealType.SUPPLEMENT -> "サプリ"
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

        // Food list
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
                            text = "-",
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

        // PFC total
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
 * Workout detail bottom sheet
 */
@Composable
private fun WorkoutDetailSheet(workout: Workout) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = when (workout.type) {
                        WorkoutType.STRENGTH -> "筋トレ"
                        WorkoutType.CARDIO -> "有酸素運動"
                        WorkoutType.FLEXIBILITY -> "ストレッチ"
                        WorkoutType.SPORTS -> "スポーツ"
                        WorkoutType.DAILY_ACTIVITY -> "日常活動"
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

        // Exercise list
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
                            text = "-",
                            style = MaterialTheme.typography.bodyLarge,
                            color = AccentOrange
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = exercise.name,
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                    // Exercise details (sets x reps or duration)
                    val detail = buildString {
                        exercise.sets?.let { append("${it}セット") }
                        exercise.reps?.let {
                            if (isNotEmpty()) append(" x ")
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
 * Nutrient summary item
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
 * Calendar view
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
        // Month header
        item {
            MonthHeader(
                currentMonth = currentMonth,
                onPreviousMonth = onPreviousMonth,
                onNextMonth = onNextMonth
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // Calendar grid
        item {
            CalendarGrid(
                currentMonth = currentMonth,
                selectedDate = selectedDate,
                recordedDates = recordedDates,
                onDateSelected = onDateSelected
            )
            Spacer(modifier = Modifier.height(24.dp))
        }

        // Selected date header
        item {
            Text(
                text = "${selectedDate.monthNumber}/${selectedDate.dayOfMonth} (${selectedDate.dayOfWeek.name.take(3)})",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Meal records
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

        // Workout records
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

        // No records message
        if (meals.isEmpty() && workouts.isEmpty()) {
            item {
                EmptyRecordMessage()
            }
        }

        // Bottom nav padding
        item {
            Spacer(modifier = Modifier.height(80.dp))
        }
    }
}

/**
 * Month header
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
            text = "${currentMonth.year}/${currentMonth.month.toString().padStart(2, '0')}",
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
 * Calendar grid
 */
@Composable
private fun CalendarGrid(
    currentMonth: YearMonth,
    selectedDate: LocalDate,
    recordedDates: Set<LocalDate>,
    onDateSelected: (LocalDate) -> Unit
) {
    val today = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date
    val firstDayOfMonth = currentMonth.atDay(1)
    val daysInMonth = currentMonth.lengthOfMonth()

    // Weekday headers
    val weekDays = listOf("日", "月", "火", "水", "木", "金", "土")

    Column {
        // Weekday header
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

        // Date grid
        val startOffset = (firstDayOfMonth.dayOfWeek.ordinal + 1) % 7
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
                        val isToday = date == today
                        val isFuture = date > today

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
 * Day cell
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
 * Section header
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
 * Meal card
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
                    // Meal icon
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
                            text = "${meal.items.size}品",
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
                        NutrientBadge("P", meal.totalProtein.toInt(), ScoreProtein)
                        Spacer(modifier = Modifier.width(4.dp))
                        NutrientBadge("F", meal.totalFat.toInt(), ScoreFat)
                        Spacer(modifier = Modifier.width(4.dp))
                        NutrientBadge("C", meal.totalCarbs.toInt(), ScoreCarbs)
                    }
                }
            }

            // Show note if available
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
 * Nutrient badge
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
 * Workout card
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
                    // Workout type icon
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(AccentOrange.copy(alpha = 0.1f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.DirectionsRun,
                            contentDescription = null,
                            tint = AccentOrange,
                            modifier = Modifier.size(20.dp)
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

            // Show note if available
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
 * Empty record message
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
            Icon(
                imageVector = Icons.Default.Edit,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
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
 * Calculate trend
 */
private fun calculateTrend(data: List<GraphDataPoint>): Trend {
    if (data.size < 2) return Trend.FLAT
    val firstHalf = data.take(data.size / 2).map { it.value }.average()
    val secondHalf = data.takeLast(data.size / 2).map { it.value }.average()
    val diff = secondHalf - firstHalf
    val threshold = firstHalf * 0.02 // 2% change threshold
    return when {
        diff > threshold -> Trend.UP
        diff < -threshold -> Trend.DOWN
        else -> Trend.FLAT
    }
}

private enum class Trend { UP, DOWN, FLAT }

/**
 * Graph view
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
    // Calculate trend for current selection
    val trend = when (selectedType) {
        GraphType.LBM -> calculateTrend(lbmData)
        GraphType.WEIGHT -> calculateTrend(weightData)
        GraphType.CALORIES -> calculateTrend(caloriesData)
        GraphType.NUTRITION -> {
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
        // Graph type selection (horizontal scroll)
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

        // Graph area
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
                // Graph title + trend
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

                    TrendBadge(trend = trend, graphType = selectedType, fitnessGoal = fitnessGoal)
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Graph display
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

                // Legend
                when (selectedType) {
                    GraphType.LBM -> LegendItem(color = ScoreProtein, label = "LBM - 除脂肪体重 (kg)")
                    GraphType.WEIGHT -> LegendItem(color = ScoreWater, label = "体重 (kg)")
                    GraphType.CALORIES -> LegendItem(color = ScoreCalories, label = "摂取カロリー (kcal)")
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
                    GraphType.EXERCISE -> LegendItem(color = ScoreExercise, label = "消費カロリー (kcal)")
                    GraphType.CONDITION -> LegendItem(color = Primary, label = "体調スコア (0-100)")
                }
            }
        }

        Spacer(modifier = Modifier.height(80.dp)) // Bottom nav padding
    }
}

/**
 * Trend badge
 */
@Composable
private fun TrendBadge(trend: Trend, graphType: GraphType, fitnessGoal: FitnessGoal) {
    val goodColor = Color(0xFF43A047)
    val badColor = Color(0xFFE53935)
    val neutralColor = Color.Gray

    val (text, color) = when (trend) {
        Trend.UP -> {
            when (graphType) {
                GraphType.LBM -> Pair("上昇↑", goodColor)
                GraphType.WEIGHT -> when (fitnessGoal) {
                    FitnessGoal.LOSE_WEIGHT -> Pair("上昇↑", badColor)
                    FitnessGoal.GAIN_MUSCLE -> Pair("上昇↑", goodColor)
                    FitnessGoal.MAINTAIN -> Pair("上昇↑", neutralColor)
                }
                else -> Pair("上昇↑", goodColor)
            }
        }
        Trend.DOWN -> {
            when (graphType) {
                GraphType.LBM -> Pair("下降↓", badColor)
                GraphType.WEIGHT -> when (fitnessGoal) {
                    FitnessGoal.LOSE_WEIGHT -> Pair("下降↓", goodColor)
                    FitnessGoal.GAIN_MUSCLE -> Pair("下降↓", badColor)
                    FitnessGoal.MAINTAIN -> Pair("下降↓", neutralColor)
                }
                else -> Pair("下降↓", badColor)
            }
        }
        Trend.FLAT -> Pair("横ばい→", neutralColor)
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelMedium,
            color = color,
            fontWeight = FontWeight.Bold
        )
    }
}

/**
 * Legend item
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
 * Chart with axes (generic)
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

    // Expand Y axis range slightly
    val yMin = (minValue - range * 0.1f).coerceAtLeast(0f)
    val yMax = maxValue + range * 0.1f
    val yRange = yMax - yMin

    // Y axis format
    val formatY: (Float) -> String = { value ->
        when (unit) {
            "kg" -> ((value * 10).toInt() / 10.0).toString()
            "pt" -> value.toInt().toString()
            else -> value.toInt().toString()
        }
    }

    Column(modifier = modifier) {
        Row(modifier = Modifier.weight(1f)) {
            // Y axis labels
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

            // Graph body
            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            ) {
                val width = size.width
                val height = size.height

                // Grid lines
                val gridColor = Color.Gray.copy(alpha = 0.2f)
                for (i in 0..2) {
                    val y = height * i / 2f
                    drawLine(gridColor, Offset(0f, y), Offset(width, y), strokeWidth = 1f)
                }

                if (isLineChart) {
                    // Line chart (with padding on both ends)
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
                    // Bar chart (evenly distributed)
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

        // X axis labels (dates) - positioned under each bar/point
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
                        text = "${point.date.dayOfMonth}",
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
 * Nutrition chart with axes
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
            // Y axis labels
            Column(
                modifier = Modifier
                    .width(50.dp)
                    .fillMaxHeight()
                    .padding(end = 4.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = "${yMax.toInt()}g",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${(yMax / 2).toInt()}g",
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

            // Graph body
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

                // Grid lines
                val gridColor = Color.Gray.copy(alpha = 0.2f)
                for (i in 0..2) {
                    val y = height * i / 2f
                    drawLine(gridColor, Offset(0f, y), Offset(width, y), strokeWidth = 1f)
                }

                data.dates.forEachIndexed { index, _ ->
                    // Calculate group center
                    val groupCenterX = groupWidth * index + groupWidth / 2
                    val totalBarsWidth = barWidth * 3 + gap * 2
                    val groupStartX = groupCenterX - totalBarsWidth / 2

                    // Protein (P)
                    val pHeight = (data.proteins.getOrElse(index) { 0f } / yMax * height).coerceAtLeast(2f)
                    drawRoundRect(ScoreProtein, Offset(groupStartX, height - pHeight), Size(barWidth, pHeight), CornerRadius(3f))

                    // Fat (F)
                    val fHeight = (data.fats.getOrElse(index) { 0f } / yMax * height).coerceAtLeast(2f)
                    drawRoundRect(ScoreFat, Offset(groupStartX + barWidth + gap, height - fHeight), Size(barWidth, fHeight), CornerRadius(3f))

                    // Carbs (C)
                    val cHeight = (data.carbs.getOrElse(index) { 0f } / yMax * height).coerceAtLeast(2f)
                    drawRoundRect(ScoreCarbs, Offset(groupStartX + (barWidth + gap) * 2, height - cHeight), Size(barWidth, cHeight), CornerRadius(3f))
                }
            }
        }

        // X axis labels (dates)
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
                        text = "${date.dayOfMonth}",
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
 * Empty chart message
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
