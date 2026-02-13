package com.yourcoach.plus.shared.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Hotel
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.ui.screens.dashboard.IndicatorStatus
import com.yourcoach.plus.shared.ui.screens.dashboard.MicroIndicator
import com.yourcoach.plus.shared.ui.screens.dashboard.MicroIndicatorType
import com.yourcoach.plus.shared.ui.theme.*

/**
 * Pro Cockpit UI - Zone 1: HUDヘッダー
 * 固定表示のコンパクトなヘッダー
 * - ルーティン（部位 + Day N）| カロリー
 * - PFCプログレスバー（3本・コンパクト）
 * - Micro+インジケーター（4つのバッジ）
 */
@Composable
fun HudHeader(
    routineDay: RoutineDay?,
    calories: Pair<Int, Int>,  // current to target
    protein: Pair<Float, Float>,  // current to target
    fat: Pair<Float, Float>,
    carbs: Pair<Float, Float>,
    microIndicators: List<MicroIndicator> = emptyList(),
    onMicroIndicatorClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // 最上段: ルーティン | カロリー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // ルーティン情報
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (routineDay != null) Icons.Default.FitnessCenter else Icons.Default.Hotel,
                        contentDescription = null,
                        tint = if (routineDay != null) Primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (routineDay != null) {
                            "${routineDay.splitType} Day ${routineDay.dayNumber}"
                        } else {
                            "休養日"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                // カロリー表示
                var showCalorieInfo by remember { mutableStateOf(false) }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = ScoreCalories.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${calories.first}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = ScoreCalories
                            )
                            Text(
                                text = "/${calories.second}kcal",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                    IconButton(
                        onClick = { showCalorieInfo = true },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "カロリー目標の説明",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                if (showCalorieInfo) {
                    AlertDialog(
                        onDismissRequest = { showCalorieInfo = false },
                        confirmButton = {
                            TextButton(onClick = { showCalorieInfo = false }) {
                                Text("OK")
                            }
                        },
                        title = { Text("カロリー目標について") },
                        text = {
                            Text(
                                "この目標値はプロフィール設定のベースカロリー(TDEE±目標調整)に、" +
                                "当日のトレーニング部位に応じたリカバリー予算を自動加算しています。\n\n" +
                                "■ 3段階クラス (LBM 60kg基準)\n" +
                                "  SSS +400kcal … 脚・全身・下半身\n" +
                                "  S +250kcal … 胸・背中・肩・複合系\n" +
                                "  A +100kcal … 腕・腹筋\n" +
                                "  休養日 … 加算なし\n\n" +
                                "実際の加算量: Class値 × あなたのLBM/60\n\n" +
                                "PFC目標も同じ比率で連動します。",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 中段: PFCプログレスバー
            PfcProgressBars(
                protein = protein,
                fat = fat,
                carbs = carbs
            )

            // 下段: Micro+インジケーター（存在する場合のみ表示）
            if (microIndicators.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                MicroIndicatorRow(
                    indicators = microIndicators,
                    onClick = onMicroIndicatorClick
                )
            }
        }
    }
}

/**
 * PFCプログレスバー（コンパクト3本）
 */
@Composable
private fun PfcProgressBars(
    protein: Pair<Float, Float>,
    fat: Pair<Float, Float>,
    carbs: Pair<Float, Float>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        PfcProgressBar(
            label = "P",
            current = protein.first,
            target = protein.second,
            color = ScoreProtein
        )
        PfcProgressBar(
            label = "F",
            current = fat.first,
            target = fat.second,
            color = ScoreFat
        )
        PfcProgressBar(
            label = "C",
            current = carbs.first,
            target = carbs.second,
            color = ScoreCarbs
        )
    }
}

/**
 * 単一のPFCプログレスバー
 */
@Composable
private fun PfcProgressBar(
    label: String,
    current: Float,
    target: Float,
    color: Color,
    modifier: Modifier = Modifier
) {
    val progress by animateFloatAsState(
        targetValue = if (target > 0) (current / target).coerceIn(0f, 1.5f) else 0f,
        label = "pfcProgress"
    )

    // 小数点以下切り捨てで差分計算、1g以上超過で警告
    val difference = current.toInt() - target.toInt()
    val isOver = difference >= 1
    val displayColor by animateColorAsState(
        targetValue = if (isOver) ScoreOver else color,
        label = "pfcColor"
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // ラベル
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = displayColor,
            modifier = Modifier.width(16.dp)
        )

        Spacer(modifier = Modifier.width(8.dp))

        // プログレスバー
        Box(
            modifier = Modifier
                .weight(1f)
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(displayColor.copy(alpha = 0.2f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress.coerceAtMost(1f))
                    .clip(RoundedCornerShape(4.dp))
                    .background(displayColor)
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        // 数値
        Text(
            text = "${current.toInt()}/${target.toInt()}g",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(70.dp)
        )
    }
}

/**
 * Micro+インジケーター行
 */
@Composable
fun MicroIndicatorRow(
    indicators: List<MicroIndicator>,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        indicators.forEach { indicator ->
            MicroIndicatorBadge(indicator = indicator)
        }
    }
}

/**
 * 単一のMicro+インジケーターバッジ
 */
@Composable
private fun MicroIndicatorBadge(
    indicator: MicroIndicator,
    modifier: Modifier = Modifier
) {
    val (bgColor, textColor) = when (indicator.status) {
        IndicatorStatus.GOOD -> Color(0xFF4CAF50).copy(alpha = 0.15f) to Color(0xFF4CAF50)
        IndicatorStatus.WARNING -> Color(0xFFFFB300).copy(alpha = 0.15f) to Color(0xFFFFB300)
        IndicatorStatus.ALERT -> Color(0xFFE53935).copy(alpha = 0.15f) to Color(0xFFE53935)
    }

    val label = when (indicator.type) {
        MicroIndicatorType.DIAAS -> "DIAAS"
        MicroIndicatorType.FATTY_ACID -> "脂肪酸"
        MicroIndicatorType.FIBER -> "繊維"
        MicroIndicatorType.VITAMIN_MINERAL -> "V/M"
    }

    Surface(
        color = bgColor,
        shape = RoundedCornerShape(4.dp),
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = indicator.label,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * シンプル版 HUD
 * カロリーとタンパク質のみ表示
 */
@Composable
fun SimpleHudHeader(
    calories: Pair<Int, Int>,
    protein: Pair<Float, Float>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            // カロリー
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${calories.first}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = ScoreCalories
                )
                Text(
                    text = "/${calories.second}kcal",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            HorizontalDivider(
                modifier = Modifier
                    .height(24.dp)
                    .width(1.dp)
            )

            // タンパク質
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${protein.first.toInt()}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = ScoreProtein
                )
                Text(
                    text = "/${protein.second.toInt()}g P",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
