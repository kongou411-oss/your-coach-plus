package com.yourcoach.plus.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.shared.domain.model.DailyScore
import com.yourcoach.plus.android.ui.theme.Primary

/**
 * 日次サマリーカード
 * 総合スコアと各カテゴリのスコアを表示
 */
@Composable
fun DailySummaryCard(
    score: DailyScore?,
    targetCalories: Int,
    targetProtein: Float,
    targetCarbs: Float,
    targetFat: Float,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // ヘッダー: 総合スコア
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 総合スコアサークル
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Primary, Primary.copy(alpha = 0.7f))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "${score?.totalScore ?: 0}",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "総合",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                // カテゴリ別スコア
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    ScoreRow(
                        icon = Icons.Default.Restaurant,
                        label = "食事",
                        score = score?.foodScore ?: 0,
                        color = Color(0xFF4A9EFF)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    ScoreRow(
                        icon = Icons.Default.FitnessCenter,
                        label = "運動",
                        score = score?.exerciseScore ?: 0,
                        color = Color(0xFFFF9500)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    ScoreRow(
                        icon = Icons.Default.Favorite,
                        label = "体調",
                        score = score?.conditionScore ?: 0,
                        color = Color(0xFFE91E63)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // PFC進捗バー
            Text(
                text = "本日の栄養",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(12.dp))

            // カロリー
            NutrientProgressBar(
                label = "カロリー",
                current = score?.totalCalories?.toInt() ?: 0,
                target = targetCalories,
                unit = "kcal",
                color = Color(0xFF4A9EFF)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // PFC
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactNutrientBar(
                    label = "P",
                    current = score?.totalProtein ?: 0f,
                    target = targetProtein,
                    color = Color(0xFFE91E63),
                    modifier = Modifier.weight(1f)
                )
                CompactNutrientBar(
                    label = "F",
                    current = score?.totalFat ?: 0f,
                    target = targetFat,
                    color = Color(0xFFFF9500),
                    modifier = Modifier.weight(1f)
                )
                CompactNutrientBar(
                    label = "C",
                    current = score?.totalCarbs ?: 0f,
                    target = targetCarbs,
                    color = Color(0xFF4CAF50),
                    modifier = Modifier.weight(1f)
                )
            }

            // 運動サマリー
            if ((score?.totalMinutes ?: 0) > 0) {
                Spacer(modifier = Modifier.height(16.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ExerciseStat(
                        icon = Icons.Default.Timer,
                        value = "${score?.totalMinutes ?: 0}",
                        unit = "分",
                        label = "運動時間"
                    )
                    ExerciseStat(
                        icon = Icons.Default.SportsGymnastics,
                        value = "${score?.exerciseCount ?: 0}",
                        unit = "種目",
                        label = "種目数"
                    )
                }
            }
        }
    }
}

@Composable
private fun ScoreRow(
    icon: ImageVector,
    label: String,
    score: Int,
    color: Color
) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.weight(1f))
        Text(
            text = "$score",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}

@Composable
private fun NutrientProgressBar(
    label: String,
    current: Int,
    target: Int,
    unit: String,
    color: Color
) {
    val progress = if (target > 0) (current.toFloat() / target).coerceIn(0f, 1.5f) else 0f

    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "$current / $target $unit",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { progress.coerceAtMost(1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = if (progress > 1.1f) Color(0xFFFF5722) else color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )
    }
}

@Composable
private fun CompactNutrientBar(
    label: String,
    current: Float,
    target: Float,
    color: Color,
    modifier: Modifier = Modifier
) {
    val progress = if (target > 0) (current / target).coerceIn(0f, 1.5f) else 0f

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Spacer(modifier = Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { progress.coerceAtMost(1f) },
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(3.dp)),
            color = if (progress > 1.1f) Color(0xFFFF5722) else color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = "${current.toInt()}g",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun ExerciseStat(
    icon: ImageVector,
    value: String,
    unit: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFFFF9500),
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Row(
            verticalAlignment = Alignment.Bottom
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = unit,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 2.dp)
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
