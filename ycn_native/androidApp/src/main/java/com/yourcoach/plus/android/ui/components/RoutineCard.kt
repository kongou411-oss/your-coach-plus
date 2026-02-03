package com.yourcoach.plus.android.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.SplitTypes

/**
 * ダッシュボード用ルーティンカード
 * ワンタップで今日のルーティンを実行できる
 */
@Composable
fun RoutineCard(
    routineDay: RoutineDay?,
    isExecuting: Boolean,
    onExecuteAll: () -> Unit,
    onExecuteMeals: () -> Unit,
    onExecuteWorkouts: () -> Unit,
    onSetupRoutine: () -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = modifier
            .fillMaxWidth()
            .animateContentSize(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        if (routineDay == null) {
            // ルーティン未設定状態
            NoRoutineContent(onSetupRoutine = onSetupRoutine)
        } else if (routineDay.isRestDay) {
            // 休養日
            RestDayContent(routineDay = routineDay)
        } else {
            // トレーニング日
            TrainingDayContent(
                routineDay = routineDay,
                isExecuting = isExecuting,
                expanded = expanded,
                onExpandChange = { expanded = it },
                onExecuteAll = onExecuteAll,
                onExecuteMeals = onExecuteMeals,
                onExecuteWorkouts = onExecuteWorkouts
            )
        }
    }
}

@Composable
private fun NoRoutineContent(
    onSetupRoutine: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.CalendarMonth,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = Color.Gray.copy(alpha = 0.5f)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "ルーティンを設定しましょう",
            style = MaterialTheme.typography.bodyLarge,
            color = Color.Gray
        )
        Text(
            text = "毎日の食事・運動をワンタップで記録できます",
            style = MaterialTheme.typography.bodySmall,
            color = Color.Gray.copy(alpha = 0.7f)
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onSetupRoutine,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4A9EFF))
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text("ルーティンを設定")
        }
    }
}

@Composable
private fun RestDayContent(
    routineDay: RoutineDay
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(Color(0xFF9E9E9E), Color(0xFF757575))
                ),
                shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
            )
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.SelfImprovement,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = Color.White
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = routineDay.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "休養日 - しっかり回復しましょう",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
private fun TrainingDayContent(
    routineDay: RoutineDay,
    isExecuting: Boolean,
    expanded: Boolean,
    onExpandChange: (Boolean) -> Unit,
    onExecuteAll: () -> Unit,
    onExecuteMeals: () -> Unit,
    onExecuteWorkouts: () -> Unit
) {
    val splitColor = getSplitColor(routineDay.splitType)

    Column {
        // ヘッダー
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.horizontalGradient(
                        colors = listOf(splitColor, splitColor.copy(alpha = 0.8f))
                    ),
                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
                )
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = getSplitIcon(routineDay.splitType),
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = routineDay.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "${routineDay.splitType}の日",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }

                // ワンタップ実行ボタン
                Button(
                    onClick = onExecuteAll,
                    enabled = !isExecuting,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = splitColor
                    ),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    if (isExecuting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = splitColor,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isExecuting) "記録中..." else "ワンタップ記録",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }
        }

        // サマリー
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 食事サマリー
            if (routineDay.meals.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Restaurant,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = Color(0xFFFF9800)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "食事 ${routineDay.meals.size}件",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = "${routineDay.meals.sumOf { it.totalCalories }}kcal / P${routineDay.meals.sumOf { it.totalProtein.toDouble() }.toInt()}g",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                        }
                    }
                    TextButton(
                        onClick = onExecuteMeals,
                        enabled = !isExecuting
                    ) {
                        Text("食事のみ", fontSize = 12.sp)
                    }
                }
            }

            // 運動サマリー
            if (routineDay.workouts.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.FitnessCenter,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            tint = Color(0xFF4CAF50)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "運動 ${routineDay.workouts.size}件",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            val totalExercises = routineDay.workouts.sumOf { it.exercises.size }
                            val totalDuration = routineDay.workouts.sumOf { it.estimatedDuration }
                            Text(
                                text = "${totalExercises}種目 / 約${totalDuration}分",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                        }
                    }
                    TextButton(
                        onClick = onExecuteWorkouts,
                        enabled = !isExecuting
                    ) {
                        Text("運動のみ", fontSize = 12.sp)
                    }
                }
            }

            // 詳細展開ボタン
            TextButton(
                onClick = { onExpandChange(!expanded) },
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) {
                Text(
                    text = if (expanded) "詳細を閉じる" else "詳細を見る",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
                Icon(
                    imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = Color.Gray
                )
            }

            // 詳細（展開時）
            if (expanded) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                // 食事詳細
                if (routineDay.meals.isNotEmpty()) {
                    Text(
                        text = "食事メニュー",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    routineDay.meals.forEach { meal ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = meal.templateName,
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                text = "${meal.totalCalories}kcal",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                        }
                    }
                }

                // 運動詳細
                if (routineDay.workouts.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "運動メニュー",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    routineDay.workouts.forEach { workout ->
                        Text(
                            text = workout.templateName,
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium
                        )
                        workout.exercises.forEach { exercise ->
                            Text(
                                text = "  - ${exercise.name}: ${exercise.sets}x${exercise.reps}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.Gray
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun getSplitColor(splitType: String): Color {
    return when (splitType) {
        SplitTypes.CHEST -> Color(0xFFE53935)      // 赤
        SplitTypes.BACK -> Color(0xFF1E88E5)       // 青
        SplitTypes.SHOULDER -> Color(0xFF7B1FA2)  // 紫
        SplitTypes.ARM -> Color(0xFFFF9800)        // オレンジ
        SplitTypes.LEG -> Color(0xFF43A047)        // 緑
        SplitTypes.FULL_BODY -> Color(0xFF5E35B1) // 深紫
        SplitTypes.UPPER -> Color(0xFFD81B60)      // ピンク
        SplitTypes.LOWER -> Color(0xFF00897B)      // ティール
        SplitTypes.PUSH -> Color(0xFFF4511E)       // 深オレンジ
        SplitTypes.PULL -> Color(0xFF3949AB)       // インディゴ
        else -> Color(0xFF757575)                   // グレー
    }
}

private fun getSplitIcon(splitType: String): androidx.compose.ui.graphics.vector.ImageVector {
    return when (splitType) {
        SplitTypes.CHEST -> Icons.Default.FitnessCenter
        SplitTypes.BACK -> Icons.Default.FitnessCenter
        SplitTypes.SHOULDER -> Icons.Default.FitnessCenter
        SplitTypes.ARM -> Icons.Default.FitnessCenter
        SplitTypes.LEG -> Icons.Default.FitnessCenter
        SplitTypes.FULL_BODY -> Icons.Default.FitnessCenter
        SplitTypes.UPPER -> Icons.Default.FitnessCenter
        SplitTypes.LOWER -> Icons.Default.FitnessCenter
        SplitTypes.PUSH -> Icons.Default.FitnessCenter
        SplitTypes.PULL -> Icons.Default.FitnessCenter
        SplitTypes.REST -> Icons.Default.SelfImprovement
        else -> Icons.Default.CalendarMonth
    }
}
