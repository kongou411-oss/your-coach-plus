package com.yourcoach.plus.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourcoach.plus.shared.domain.model.Condition
import com.yourcoach.plus.shared.domain.model.ConditionLabels
import com.yourcoach.plus.android.ui.theme.Primary

/**
 * コンディション記録セクション
 */
@Composable
fun ConditionSection(
    condition: Condition?,
    onConditionChange: (Condition) -> Unit,
    userId: String,
    date: String,
    modifier: Modifier = Modifier
) {
    val currentCondition = condition ?: Condition(userId = userId, date = date)

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // ヘッダー
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = null,
                    tint = Color(0xFFE91E63),
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "コンディション",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.weight(1f))

                // スコア表示
                val score = currentCondition.calculateScore()
                if (score > 0) {
                    Surface(
                        color = Primary.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = "$score",
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = Primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 睡眠時間
            ConditionItem(
                label = "睡眠時間",
                options = ConditionLabels.sleepHoursLabels,
                selectedValue = currentCondition.sleepHours,
                onValueChange = { value ->
                    onConditionChange(currentCondition.copy(sleepHours = value))
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 睡眠の質
            ConditionItem(
                label = "睡眠の質",
                options = ConditionLabels.sleepQualityLabels,
                selectedValue = currentCondition.sleepQuality,
                onValueChange = { value ->
                    onConditionChange(currentCondition.copy(sleepQuality = value))
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 腸内環境
            ConditionItem(
                label = "腸内環境",
                options = ConditionLabels.digestionLabels,
                selectedValue = currentCondition.digestion,
                onValueChange = { value ->
                    onConditionChange(currentCondition.copy(digestion = value))
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 集中力
            ConditionItem(
                label = "集中力",
                options = ConditionLabels.focusLabels,
                selectedValue = currentCondition.focus,
                onValueChange = { value ->
                    onConditionChange(currentCondition.copy(focus = value))
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // ストレス
            ConditionItem(
                label = "ストレス",
                options = ConditionLabels.stressLabels,
                selectedValue = currentCondition.stress,
                onValueChange = { value ->
                    onConditionChange(currentCondition.copy(stress = value))
                }
            )
        }
    }
}

/**
 * コンディション項目（5択ボタン）
 */
@Composable
private fun ConditionItem(
    label: String,
    options: List<String>,
    selectedValue: Int?,
    onValueChange: (Int) -> Unit
) {
    Column {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Medium
        )

        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            options.forEachIndexed { index, option ->
                val value = index + 1
                val isSelected = selectedValue == value

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            if (isSelected) Primary
                            else MaterialTheme.colorScheme.surfaceVariant
                        )
                        .clickable { onValueChange(value) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = option,
                        style = MaterialTheme.typography.labelSmall,
                        fontSize = 10.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) Color.White
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        maxLines = 1
                    )
                }
            }
        }
    }
}
