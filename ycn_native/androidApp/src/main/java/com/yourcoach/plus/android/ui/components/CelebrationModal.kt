package com.yourcoach.plus.android.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * お祝いの種類
 */
sealed class CelebrationType {
    data class LevelUp(val newLevel: Int, val creditsEarned: Int) : CelebrationType()
    data class BadgeEarned(val badgeId: String, val badgeName: String) : CelebrationType()
}

/**
 * お祝いモーダル（パーティクルアニメーション付き）
 */
@Composable
fun CelebrationModal(
    celebrationType: CelebrationType,
    onDismiss: () -> Unit
) {
    var showContent by remember { mutableStateOf(false) }

    // 自動で閉じる（3秒後）
    LaunchedEffect(Unit) {
        delay(100)
        showContent = true
        delay(3000)
        onDismiss()
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.7f)),
            contentAlignment = Alignment.Center
        ) {
            // パーティクル
            ParticleEffect()

            // コンテンツ
            if (showContent) {
                CelebrationContent(
                    celebrationType = celebrationType,
                    onDismiss = onDismiss
                )
            }
        }
    }
}

@Composable
private fun CelebrationContent(
    celebrationType: CelebrationType,
    onDismiss: () -> Unit
) {
    // スケールアニメーション
    val scale = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        scale.animateTo(
            targetValue = 1f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessLow
            )
        )
    }

    Card(
        modifier = Modifier
            .scale(scale.value)
            .padding(32.dp)
            .widthIn(max = 300.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when (celebrationType) {
                is CelebrationType.LevelUp -> {
                    LevelUpContent(celebrationType)
                }
                is CelebrationType.BadgeEarned -> {
                    BadgeEarnedContent(celebrationType)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(onClick = onDismiss) {
                Text("OK")
            }
        }
    }
}

@Composable
private fun LevelUpContent(levelUp: CelebrationType.LevelUp) {
    // アイコンパルスアニメーション
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(500),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    // レベルアップアイコン
    Box(
        modifier = Modifier
            .size(80.dp)
            .scale(pulseScale)
            .background(
                color = Color(0xFFFFD700),
                shape = CircleShape
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "⬆",
            fontSize = 40.sp
        )
    }

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = "LEVEL UP!",
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold,
        color = Color(0xFFFFD700)
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = "Lv.${levelUp.newLevel}",
        fontSize = 48.sp,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurface
    )

    if (levelUp.creditsEarned > 0) {
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "+${levelUp.creditsEarned} クレジット獲得!",
            fontSize = 16.sp,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
private fun BadgeEarnedContent(badge: CelebrationType.BadgeEarned) {
    // シャインアニメーション
    val infiniteTransition = rememberInfiniteTransition(label = "shine")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    // バッジアイコン
    Box(
        modifier = Modifier.size(100.dp),
        contentAlignment = Alignment.Center
    ) {
        // 光る背景
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height / 2)
            for (i in 0..7) {
                val angle = Math.toRadians((rotation + i * 45).toDouble())
                val endX = center.x + cos(angle).toFloat() * size.width / 2
                val endY = center.y + sin(angle).toFloat() * size.height / 2
                drawLine(
                    color = Color(0xFFFFD700).copy(alpha = 0.5f),
                    start = center,
                    end = Offset(endX, endY),
                    strokeWidth = 3f
                )
            }
        }

        // バッジ本体
        Box(
            modifier = Modifier
                .size(70.dp)
                .background(
                    color = getBadgeColor(badge.badgeId),
                    shape = CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = getBadgeEmoji(badge.badgeId),
                fontSize = 36.sp
            )
        }
    }

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = "バッジ獲得!",
        fontSize = 24.sp,
        fontWeight = FontWeight.Bold,
        color = Color(0xFFFFD700)
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = badge.badgeName,
        fontSize = 20.sp,
        fontWeight = FontWeight.Medium,
        color = MaterialTheme.colorScheme.onSurface,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(4.dp))

    Text(
        text = "+10 XP",
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.primary
    )

    Spacer(modifier = Modifier.height(12.dp))

    Text(
        text = "他のバッジは設定から確認できます",
        fontSize = 12.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

/**
 * パーティクルエフェクト
 */
@Composable
private fun ParticleEffect() {
    val particles = remember {
        List(50) { Particle() }
    }

    val time by rememberInfiniteTransition(label = "particles").animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "time"
    )

    Canvas(modifier = Modifier.fillMaxSize()) {
        particles.forEach { particle ->
            drawParticle(particle, time)
        }
    }
}

private data class Particle(
    val startX: Float = Random.nextFloat(),
    val startY: Float = Random.nextFloat() + 0.5f,
    val velocityX: Float = (Random.nextFloat() - 0.5f) * 0.3f,
    val velocityY: Float = -Random.nextFloat() * 0.5f - 0.2f,
    val size: Float = Random.nextFloat() * 10f + 5f,
    val color: Color = listOf(
        Color(0xFFFFD700),  // Gold
        Color(0xFFFF6B6B),  // Red
        Color(0xFF4ECDC4),  // Teal
        Color(0xFFFFE66D),  // Yellow
        Color(0xFF95E1D3),  // Mint
        Color(0xFFF38181),  // Pink
    ).random(),
    val rotation: Float = Random.nextFloat() * 360f
)

private fun DrawScope.drawParticle(particle: Particle, time: Float) {
    val x = (particle.startX + particle.velocityX * time) * size.width
    val y = (particle.startY + particle.velocityY * time) * size.height
    val alpha = (1f - time).coerceIn(0f, 1f)

    if (y > 0 && y < size.height && x > 0 && x < size.width) {
        drawCircle(
            color = particle.color.copy(alpha = alpha),
            radius = particle.size,
            center = Offset(x, y)
        )
    }
}

/**
 * バッジIDからカラーを取得
 */
private fun getBadgeColor(badgeId: String): Color {
    return when {
        badgeId.startsWith("streak") -> Color(0xFFFF6B35)      // Orange
        badgeId.startsWith("nutrition") -> Color(0xFF4CAF50)   // Green
        badgeId.startsWith("exercise") -> Color(0xFF2196F3)    // Blue
        badgeId.startsWith("milestone") -> Color(0xFF9C27B0)   // Purple
        badgeId.startsWith("special") -> Color(0xFFFFD700)     // Gold
        else -> Color(0xFF607D8B)                               // Gray
    }
}

/**
 * バッジIDから絵文字を取得
 */
private fun getBadgeEmoji(badgeId: String): String {
    return when (badgeId) {
        "streak_3" -> "🔥"
        "streak_7" -> "🔥"
        "streak_14" -> "💪"
        "streak_30" -> "🏆"
        "streak_100" -> "👑"
        "nutrition_perfect_day" -> "⭐"
        "nutrition_protein_master" -> "🥩"
        "nutrition_balanced" -> "⚖️"
        "exercise_first" -> "🎯"
        "exercise_60min" -> "⏱️"
        "exercise_variety" -> "🎨"
        "milestone_first_meal" -> "🍽️"
        "milestone_10_meals" -> "📝"
        "milestone_100_meals" -> "📚"
        "milestone_first_analysis" -> "🤖"
        "special_early_bird" -> "🌅"
        "special_weekend_warrior" -> "⚔️"
        "special_score_100" -> "💯"
        else -> "🏅"
    }
}
