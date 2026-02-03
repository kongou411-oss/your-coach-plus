package com.yourcoach.plus.android.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.android.ui.theme.Primary
import com.yourcoach.plus.android.ui.theme.ScoreCalories
import com.yourcoach.plus.android.ui.theme.ScoreCarbs
import com.yourcoach.plus.android.ui.theme.ScoreCondition
import com.yourcoach.plus.android.ui.theme.ScoreDIAAS
import com.yourcoach.plus.android.ui.theme.ScoreExercise
import com.yourcoach.plus.android.ui.theme.ScoreFat
import com.yourcoach.plus.android.ui.theme.ScoreFattyAcid
import com.yourcoach.plus.android.ui.theme.ScoreFiber
import com.yourcoach.plus.android.ui.theme.ScoreGL
import com.yourcoach.plus.android.ui.theme.ScoreMineral
import com.yourcoach.plus.android.ui.theme.ScoreProtein
import com.yourcoach.plus.android.ui.theme.ScoreSleep
import com.yourcoach.plus.android.ui.theme.ScoreVitamin
import com.yourcoach.plus.shared.domain.model.DailyScore
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * 8軸スコアデータ
 */
data class ScoreAxis(
    val name: String,
    val value: Int,
    val color: Color
)

/**
 * 8軸レーダーチャート
 */
@Composable
fun RadarScoreChart(
    score: DailyScore?,
    modifier: Modifier = Modifier
) {
    var animationProgress by remember { mutableStateOf(0f) }
    val animatedProgress by animateFloatAsState(
        targetValue = animationProgress,
        animationSpec = tween(1000),
        label = "radar_animation"
    )

    LaunchedEffect(score) {
        animationProgress = if (score != null) 1f else 0f
    }

    // 12軸レーダーチャート: 食事10軸 + 運動 + コンディション
    val axes = score?.let {
        listOf(
            ScoreAxis("カロリー", it.calorieScore, ScoreCalories),
            ScoreAxis("タンパク質", it.proteinScore, ScoreProtein),
            ScoreAxis("脂質", it.fatScore, ScoreFat),
            ScoreAxis("炭水化物", it.carbsScore, ScoreCarbs),
            ScoreAxis("DIAAS", it.diaasScore, ScoreDIAAS),
            ScoreAxis("脂肪酸", it.fattyAcidScore, ScoreFattyAcid),
            ScoreAxis("GL", it.glScore, ScoreGL),
            ScoreAxis("食物繊維", it.fiberScore, ScoreFiber),
            ScoreAxis("ビタミン", it.vitaminScore, ScoreVitamin),
            ScoreAxis("ミネラル", it.mineralScore, ScoreMineral),
            ScoreAxis("運動", it.exerciseScore, ScoreExercise),
            ScoreAxis("コンディション", it.conditionScore, ScoreCondition)
        )
    } ?: emptyList()

    Box(
        modifier = modifier.size(200.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.size(180.dp)) {
            val center = Offset(size.width / 2, size.height / 2)
            val radius = size.minDimension / 2 * 0.8f
            val axisCount = 12

            // 背景のグリッド
            for (level in 1..4) {
                val levelRadius = radius * level / 4
                drawRadarPolygon(center, levelRadius, axisCount, Color.Gray.copy(alpha = 0.2f))
            }

            // 軸線
            for (i in 0 until axisCount) {
                val angle = 2 * PI * i / axisCount - PI / 2
                val endX = center.x + radius * cos(angle).toFloat()
                val endY = center.y + radius * sin(angle).toFloat()
                drawLine(
                    color = Color.Gray.copy(alpha = 0.3f),
                    start = center,
                    end = Offset(endX, endY),
                    strokeWidth = 1.dp.toPx()
                )
            }

            // スコアのポリゴン
            if (axes.isNotEmpty()) {
                val path = Path()
                axes.forEachIndexed { i, axis ->
                    val angle = 2 * PI * i / axisCount - PI / 2
                    val valueRadius = radius * (axis.value / 100f) * animatedProgress
                    val x = center.x + valueRadius * cos(angle).toFloat()
                    val y = center.y + valueRadius * sin(angle).toFloat()
                    if (i == 0) {
                        path.moveTo(x, y)
                    } else {
                        path.lineTo(x, y)
                    }
                }
                path.close()

                // 塗りつぶし
                drawPath(
                    path = path,
                    color = Primary.copy(alpha = 0.2f)
                )

                // 線
                drawPath(
                    path = path,
                    color = Primary,
                    style = Stroke(width = 2.dp.toPx())
                )

                // ポイント
                axes.forEachIndexed { i, axis ->
                    val angle = 2 * PI * i / axisCount - PI / 2
                    val valueRadius = radius * (axis.value / 100f) * animatedProgress
                    val x = center.x + valueRadius * cos(angle).toFloat()
                    val y = center.y + valueRadius * sin(angle).toFloat()
                    drawCircle(
                        color = axis.color,
                        radius = 6.dp.toPx(),
                        center = Offset(x, y)
                    )
                    drawCircle(
                        color = Color.White,
                        radius = 3.dp.toPx(),
                        center = Offset(x, y)
                    )
                }
            }
        }

        // 中央のスコア
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "${score?.totalScore ?: 0}",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = Primary
            )
            Text(
                text = "点",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * レーダーポリゴンを描画
 */
private fun DrawScope.drawRadarPolygon(
    center: Offset,
    radius: Float,
    sides: Int,
    color: Color
) {
    val path = Path()
    for (i in 0 until sides) {
        val angle = 2 * PI * i / sides - PI / 2
        val x = center.x + radius * cos(angle).toFloat()
        val y = center.y + radius * sin(angle).toFloat()
        if (i == 0) {
            path.moveTo(x, y)
        } else {
            path.lineTo(x, y)
        }
    }
    path.close()
    drawPath(path, color, style = Stroke(width = 1.dp.toPx()))
}

/**
 * スコアカード（8軸表示付き）
 */
@Composable
fun ScoreCard(
    score: DailyScore?,
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
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "今日のスコア",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            RadarScoreChart(score = score)

            Spacer(modifier = Modifier.height(16.dp))

            // スコアグリッド: 食事10軸 + 運動 + コンディション
            score?.let { s ->
                val scoreItems = listOf(
                    Triple("カロリー", s.calorieScore, ScoreCalories),
                    Triple("タンパク質", s.proteinScore, ScoreProtein),
                    Triple("脂質", s.fatScore, ScoreFat),
                    Triple("炭水化物", s.carbsScore, ScoreCarbs),
                    Triple("DIAAS", s.diaasScore, ScoreDIAAS),
                    Triple("脂肪酸", s.fattyAcidScore, ScoreFattyAcid),
                    Triple("GL", s.glScore, ScoreGL),
                    Triple("食物繊維", s.fiberScore, ScoreFiber),
                    Triple("ビタミン", s.vitaminScore, ScoreVitamin),
                    Triple("ミネラル", s.mineralScore, ScoreMineral),
                    Triple("運動", s.exerciseScore, ScoreExercise),
                    Triple("コンディション", s.conditionScore, ScoreCondition)
                )

                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    scoreItems.chunked(4).forEach { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            row.forEach { (name, value, color) ->
                                ScoreItem(
                                    name = name,
                                    score = value,
                                    color = color,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * 個別スコアアイテム
 */
@Composable
private fun ScoreItem(
    name: String,
    score: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .background(color, CircleShape)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = name,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = "$score",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}
