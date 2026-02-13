package com.yourcoach.plus.shared.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.shared.ui.theme.*

/**
 * 栄養素カード
 * PFC (タンパク質・脂質・炭水化物) の摂取状況を表示
 */
@Composable
fun NutritionCard(
    calories: Pair<Int, Int>,      // current to target
    protein: Pair<Float, Float>,   // current to target
    fat: Pair<Float, Float>,
    carbs: Pair<Float, Float>,
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
            // カロリー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "カロリー",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = "${calories.first}",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = ScoreCalories
                    )
                    Text(
                        text = " / ${calories.second} kcal",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // カロリー進捗バー
            val calorieProgress = if (calories.second > 0) {
                (calories.first.toFloat() / calories.second).coerceIn(0f, 1f)
            } else 0f
            LinearProgressIndicator(
                progress = { calorieProgress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
                color = ScoreCalories,
                trackColor = ScoreCalories.copy(alpha = 0.2f)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // PFC
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                NutrientItem(
                    label = "P",
                    name = "タンパク質",
                    current = protein.first,
                    target = protein.second,
                    color = ScoreProtein
                )
                NutrientItem(
                    label = "F",
                    name = "脂質",
                    current = fat.first,
                    target = fat.second,
                    color = ScoreFat
                )
                NutrientItem(
                    label = "C",
                    name = "炭水化物",
                    current = carbs.first,
                    target = carbs.second,
                    color = ScoreCarbs
                )
            }
        }
    }
}

@Composable
private fun NutrientItem(
    label: String,
    name: String,
    current: Float,
    target: Float,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // ラベル
        Surface(
            color = color.copy(alpha = 0.15f),
            shape = RoundedCornerShape(4.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = color,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        // 値
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = "${current.toInt()}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = "g",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // 目標
        Text(
            text = "/ ${target.toInt()}g",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(4.dp))

        // ミニ進捗バー
        val progress = if (target > 0) (current / target).coerceIn(0f, 1f) else 0f
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier
                .width(60.dp)
                .height(4.dp),
            color = color,
            trackColor = color.copy(alpha = 0.2f)
        )
    }
}

/**
 * コンパクト版栄養素表示
 */
@Composable
fun NutritionSummaryRow(
    calories: Pair<Int, Int>,
    protein: Pair<Float, Float>,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        // カロリー
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${calories.first}",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = ScoreCalories
            )
            Text(
                text = "/ ${calories.second} kcal",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // タンパク質
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${protein.first.toInt()}",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = ScoreProtein
            )
            Text(
                text = "/ ${protein.second.toInt()}g P",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * カロリー目標の説明アイコン（iボタン + ダイアログ）
 */