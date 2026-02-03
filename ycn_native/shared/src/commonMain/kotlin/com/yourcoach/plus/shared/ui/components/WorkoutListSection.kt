package com.yourcoach.plus.shared.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsRun
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.shared.domain.model.Exercise
import com.yourcoach.plus.shared.domain.model.ExerciseCategory
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.model.WorkoutType
import com.yourcoach.plus.shared.ui.theme.*

/**
 * 運動リストセクション
 */
@Composable
fun WorkoutListSection(
    workouts: List<Workout>,
    todayRoutine: RoutineDay?,
    isManualRestDay: Boolean,
    onAddWorkoutClick: () -> Unit,
    onEditWorkout: (Workout) -> Unit,
    onDeleteWorkout: (Workout) -> Unit,
    onSaveAsTemplate: (Workout) -> Unit,
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
                                Button(
                                    onClick = onExecuteRoutineWorkouts,
                                    colors = ButtonDefaults.buttonColors(
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
 * 運動カード
 */
@Composable
private fun WorkoutCard(
    workout: Workout,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onSaveAsTemplate: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    val workoutTypeName = when (workout.type) {
        WorkoutType.STRENGTH -> "筋トレ"
        WorkoutType.CARDIO -> "有酸素"
        WorkoutType.FLEXIBILITY -> "柔軟"
        WorkoutType.SPORTS -> "スポーツ"
        WorkoutType.DAILY_ACTIVITY -> "日常活動"
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
                        WorkoutSourceTag(
                            text = workout.routineName ?: "ルーティン",
                            color = Color(0xFFF59E0B),
                            icon = Icons.Default.Repeat
                        )
                    }
                    if (workout.isTemplate) {
                        WorkoutSourceTag(
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
 * 運動入力元タグ
 */
@Composable
private fun WorkoutSourceTag(
    text: String,
    color: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector
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
 * 運動詳細行（展開時）
 */
@Composable
private fun ExerciseDetailRow(
    exercise: Exercise
) {
    val categoryName = when (exercise.category) {
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
