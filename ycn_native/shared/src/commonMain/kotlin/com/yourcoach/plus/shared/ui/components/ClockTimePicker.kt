package com.yourcoach.plus.shared.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.shared.ui.theme.*
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
internal fun ClockTimePickerDialog(
    label: String,
    initialHour: Int,
    initialMinute: Int,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedHour by remember { mutableStateOf(initialHour) }
    var selectedMinute by remember { mutableStateOf(initialMinute / 5 * 5) }
    var isSelectingHour by remember { mutableStateOf(true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(label) },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // 時:分 ヘッダー（タップで切替）
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelectingHour) Primary.copy(alpha = 0.15f)
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                            .clickable { isSelectingHour = true }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = selectedHour.toString().padStart(2, '0'),
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelectingHour) Primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        ":",
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (!isSelectingHour) Primary.copy(alpha = 0.15f)
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                            .clickable { isSelectingHour = false }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = selectedMinute.toString().padStart(2, '0'),
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = if (!isSelectingHour) Primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 時計ダイアル
                ClockFace(
                    isSelectingHour = isSelectingHour,
                    selectedHour = selectedHour,
                    selectedMinute = selectedMinute,
                    onHourSelected = { selectedHour = it; isSelectingHour = false },
                    onMinuteSelected = { selectedMinute = it }
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onConfirm("${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}")
            }) { Text("OK") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("キャンセル") }
        }
    )
}

@Composable
private fun ClockFace(
    isSelectingHour: Boolean,
    selectedHour: Int,
    selectedMinute: Int,
    onHourSelected: (Int) -> Unit,
    onMinuteSelected: (Int) -> Unit
) {
    val clockSize = 220.dp
    val primaryColor = Primary
    val onSurfaceColor = MaterialTheme.colorScheme.onSurface
    val surfaceColor = MaterialTheme.colorScheme.surfaceVariant
    val onPrimaryColor = MaterialTheme.colorScheme.onPrimary

    val outerRadius = clockSize / 2 * 0.82f
    val innerRadius = clockSize / 2 * 0.55f
    val itemSize = 36.dp
    val innerItemSize = 30.dp

    Box(
        modifier = Modifier.size(clockSize),
        contentAlignment = Alignment.Center
    ) {
        // 背景円 + 選択ハンド（テキストの後ろに描画）
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height / 2)
            val outerRadiusPx = size.width / 2 * 0.82f
            val innerRadiusPx = size.width / 2 * 0.55f

            // 背景円
            drawCircle(color = surfaceColor, radius = size.width / 2, center = center)

            // 選択位置の計算
            val selPos: Int
            val selIsInner: Boolean
            if (isSelectingHour) {
                selPos = when {
                    selectedHour == 12 -> 0
                    selectedHour == 0 -> 0
                    selectedHour in 1..11 -> selectedHour
                    else -> selectedHour - 12
                }
                selIsInner = selectedHour == 0 || selectedHour in 13..23
            } else {
                selPos = selectedMinute / 5
                selIsInner = false
            }

            val selAngle = (selPos * 30.0 - 90.0) * PI / 180.0
            val selRadius = if (selIsInner) innerRadiusPx else outerRadiusPx
            val selItemR = if (selIsInner) innerItemSize.toPx() / 2 else itemSize.toPx() / 2
            val endX = center.x + selRadius * cos(selAngle).toFloat()
            val endY = center.y + selRadius * sin(selAngle).toFloat()

            // 選択ライン
            drawLine(color = primaryColor, start = center, end = Offset(endX, endY), strokeWidth = 2f)
            // 中心ドット
            drawCircle(color = primaryColor, radius = 6f, center = center)
            // 選択円（数字の背景）
            drawCircle(color = primaryColor, radius = selItemR, center = Offset(endX, endY))
        }

        if (isSelectingHour) {
            // 外周: 12, 1, 2, ..., 11
            for (i in 0..11) {
                val hour = if (i == 0) 12 else i
                val angle = (i * 30.0 - 90.0) * PI / 180.0
                val xOff = outerRadius * cos(angle).toFloat()
                val yOff = outerRadius * sin(angle).toFloat()
                val isSelected = selectedHour == hour

                Box(
                    modifier = Modifier
                        .offset(x = xOff, y = yOff)
                        .size(itemSize)
                        .clip(CircleShape)
                        .clickable { onHourSelected(hour) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "$hour",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) onPrimaryColor else onSurfaceColor
                    )
                }
            }

            // 内周: 0, 13, 14, ..., 23
            for (i in 0..11) {
                val hour = if (i == 0) 0 else i + 12
                val angle = (i * 30.0 - 90.0) * PI / 180.0
                val xOff = innerRadius * cos(angle).toFloat()
                val yOff = innerRadius * sin(angle).toFloat()
                val isSelected = selectedHour == hour

                Box(
                    modifier = Modifier
                        .offset(x = xOff, y = yOff)
                        .size(innerItemSize)
                        .clip(CircleShape)
                        .clickable { onHourSelected(hour) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "$hour",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) onPrimaryColor else onSurfaceColor.copy(alpha = 0.7f)
                    )
                }
            }
        } else {
            // 分選択: 0, 5, 10, ..., 55
            for (i in 0..11) {
                val minute = i * 5
                val angle = (i * 30.0 - 90.0) * PI / 180.0
                val xOff = outerRadius * cos(angle).toFloat()
                val yOff = outerRadius * sin(angle).toFloat()
                val isSelected = selectedMinute == minute

                Box(
                    modifier = Modifier
                        .offset(x = xOff, y = yOff)
                        .size(itemSize)
                        .clip(CircleShape)
                        .clickable { onMinuteSelected(minute) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        minute.toString().padStart(2, '0'),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) onPrimaryColor else onSurfaceColor
                    )
                }
            }
        }
    }
}
