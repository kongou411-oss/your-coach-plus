package com.yourcoach.plus.shared.ui.screens.workout

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.model.rememberScreenModel
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.ExerciseCategory
import com.yourcoach.plus.shared.domain.model.WorkoutIntensity
import com.yourcoach.plus.shared.domain.model.WorkoutType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.ui.components.LoadingOverlay
import com.yourcoach.plus.shared.util.DateUtil
import org.koin.compose.koinInject

/**
 * 運動追加画面
 */
data class AddWorkoutScreen(
    val selectedDate: String = DateUtil.todayString()
) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val authRepository: AuthRepository = koinInject()
        val workoutRepository: WorkoutRepository = koinInject()

        val screenModel = rememberScreenModel {
            AddWorkoutScreenModel(authRepository, workoutRepository, selectedDate)
        }
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow

        // 保存成功時に戻る
        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                navigator.pop()
            }
        }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("運動を記録", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.Default.Close, contentDescription = "閉じる")
                        }
                    },
                    actions = {
                        TextButton(
                            onClick = { screenModel.saveWorkout() },
                            enabled = !uiState.isSaving
                        ) {
                            Text("保存")
                        }
                    }
                )
            }
        ) { paddingValues ->
            Box(modifier = Modifier.fillMaxSize()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 日付表示
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CalendarToday,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = DateUtil.formatDateForDisplay(uiState.selectedDate),
                                    style = MaterialTheme.typography.titleMedium
                                )
                            }
                        }
                    }

                    // 運動タイプ選択
                    item {
                        Text(
                            text = "運動タイプ",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            WorkoutType.entries.take(3).forEach { type ->
                                FilterChip(
                                    selected = uiState.workoutType == type,
                                    onClick = { screenModel.updateWorkoutType(type) },
                                    label = { Text(getWorkoutTypeLabel(type)) }
                                )
                            }
                        }
                    }

                    // 運動名
                    item {
                        OutlinedTextField(
                            value = uiState.workoutName,
                            onValueChange = { screenModel.updateWorkoutName(it) },
                            label = { Text("運動名（任意）") },
                            placeholder = { Text("例: 胸トレーニング") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    // 強度選択
                    item {
                        Text(
                            text = "強度",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            WorkoutIntensity.entries.forEach { intensity ->
                                FilterChip(
                                    selected = uiState.intensity == intensity,
                                    onClick = { screenModel.updateIntensity(intensity) },
                                    label = { Text(getIntensityLabel(intensity)) }
                                )
                            }
                        }
                    }

                    // 合計時間
                    item {
                        OutlinedTextField(
                            value = uiState.totalDuration,
                            onValueChange = { screenModel.updateTotalDuration(it) },
                            label = { Text("合計時間（分）") },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                            trailingIcon = { Text("分") }
                        )
                    }

                    // エクササイズリスト
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "エクササイズ",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Medium
                            )
                            TextButton(onClick = { screenModel.addExercise() }) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("追加")
                            }
                        }
                    }

                    itemsIndexed(uiState.exercises) { index, exercise ->
                        ExerciseInputCard(
                            exercise = exercise,
                            onUpdate = { screenModel.updateExercise(index, it) },
                            onRemove = { screenModel.removeExercise(index) },
                            canRemove = uiState.exercises.size > 1
                        )
                    }

                    // メモ
                    item {
                        OutlinedTextField(
                            value = uiState.note,
                            onValueChange = { screenModel.updateNote(it) },
                            label = { Text("メモ（任意）") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            maxLines = 4
                        )
                    }

                    // 保存ボタン
                    item {
                        Button(
                            onClick = { screenModel.saveWorkout() },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !uiState.isSaving
                        ) {
                            if (uiState.isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Icon(Icons.Default.Save, contentDescription = null)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("保存")
                        }
                    }
                }

                // ローディング
                LoadingOverlay(isLoading = uiState.isSaving, message = "保存中...")
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExerciseInputCard(
    exercise: ExerciseInput,
    onUpdate: (ExerciseInput) -> Unit,
    onRemove: () -> Unit,
    canRemove: Boolean
) {
    var categoryExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 種目名
                OutlinedTextField(
                    value = exercise.name,
                    onValueChange = { onUpdate(exercise.copy(name = it)) },
                    label = { Text("種目名") },
                    placeholder = { Text("例: ベンチプレス") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )

                if (canRemove) {
                    IconButton(onClick = onRemove) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "削除",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            // カテゴリ選択
            ExposedDropdownMenuBox(
                expanded = categoryExpanded,
                onExpandedChange = { categoryExpanded = it }
            ) {
                OutlinedTextField(
                    value = getCategoryLabel(exercise.category),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("部位") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                )
                ExposedDropdownMenu(
                    expanded = categoryExpanded,
                    onDismissRequest = { categoryExpanded = false }
                ) {
                    ExerciseCategory.entries.take(6).forEach { category ->
                        DropdownMenuItem(
                            text = { Text(getCategoryLabel(category)) },
                            onClick = {
                                onUpdate(exercise.copy(category = category))
                                categoryExpanded = false
                            }
                        )
                    }
                }
            }

            // セット数、レップ数、重量
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = exercise.sets,
                    onValueChange = { onUpdate(exercise.copy(sets = it)) },
                    label = { Text("セット") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
                OutlinedTextField(
                    value = exercise.reps,
                    onValueChange = { onUpdate(exercise.copy(reps = it)) },
                    label = { Text("レップ") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
                OutlinedTextField(
                    value = exercise.weight,
                    onValueChange = { onUpdate(exercise.copy(weight = it)) },
                    label = { Text("重量(kg)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
            }
        }
    }
}

private fun getWorkoutTypeLabel(type: WorkoutType): String = when (type) {
    WorkoutType.STRENGTH -> "筋トレ"
    WorkoutType.CARDIO -> "有酸素"
    WorkoutType.FLEXIBILITY -> "ストレッチ"
    WorkoutType.SPORTS -> "スポーツ"
    WorkoutType.DAILY_ACTIVITY -> "日常活動"
}

private fun getIntensityLabel(intensity: WorkoutIntensity): String = when (intensity) {
    WorkoutIntensity.LOW -> "低"
    WorkoutIntensity.MODERATE -> "中"
    WorkoutIntensity.HIGH -> "高"
    WorkoutIntensity.VERY_HIGH -> "最高"
}

private fun getCategoryLabel(category: ExerciseCategory): String = when (category) {
    ExerciseCategory.CHEST -> "胸"
    ExerciseCategory.BACK -> "背中"
    ExerciseCategory.SHOULDERS -> "肩"
    ExerciseCategory.ARMS -> "腕"
    ExerciseCategory.CORE -> "体幹"
    ExerciseCategory.LEGS -> "脚"
    ExerciseCategory.RUNNING -> "ランニング"
    ExerciseCategory.WALKING -> "ウォーキング"
    ExerciseCategory.CYCLING -> "サイクリング"
    ExerciseCategory.SWIMMING -> "水泳"
    ExerciseCategory.HIIT -> "HIIT"
    ExerciseCategory.YOGA -> "ヨガ"
    ExerciseCategory.STRETCHING -> "ストレッチ"
    ExerciseCategory.SPORTS -> "スポーツ"
    ExerciseCategory.OTHER -> "その他"
}
