package com.yourcoach.plus.android.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.yourcoach.plus.shared.domain.model.CalorieOverride
import com.yourcoach.plus.shared.domain.model.PfcRatio

/**
 * ピンポイントカロリー変更ダイアログ
 * 元プロジェクト準拠: チートデー、リフィード等のプリセット + カスタム設定
 */
@Composable
fun CalorieOverrideDialog(
    currentDate: String,
    defaultPfc: PfcRatio,
    onApply: (CalorieOverride) -> Unit,
    onDismiss: () -> Unit
) {
    var customCalorieAdjustment by remember { mutableStateOf("") }
    var customPfc by remember { mutableStateOf(defaultPfc) }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // ヘッダー
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFFF9800))
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.FlashOn,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "ピンポイント変更",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "閉じる",
                                tint = Color.White
                            )
                        }
                    }
                }

                // コンテンツ
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 説明
                    Text(
                        text = "$currentDate のカロリー・PFC目標を変更します。その日限りの設定です。",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )

                    // カロリープリセット
                    Text(
                        text = "カロリー調整プリセット",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray
                    )

                    // プリセットボタン
                    CaloriePresetButton(
                        name = "チートデー",
                        adjustment = 500,
                        isPositive = true,
                        onClick = {
                            onApply(CalorieOverride(
                                templateName = "チートデー",
                                calorieAdjustment = 500,
                                pfcOverride = customPfc,
                                appliedAt = System.currentTimeMillis()
                            ))
                        }
                    )

                    CaloriePresetButton(
                        name = "リフィード",
                        adjustment = 300,
                        isPositive = true,
                        onClick = {
                            onApply(CalorieOverride(
                                templateName = "リフィード",
                                calorieAdjustment = 300,
                                pfcOverride = customPfc,
                                appliedAt = System.currentTimeMillis()
                            ))
                        }
                    )

                    CaloriePresetButton(
                        name = "軽めの日",
                        adjustment = -300,
                        isPositive = false,
                        onClick = {
                            onApply(CalorieOverride(
                                templateName = "軽めの日",
                                calorieAdjustment = -300,
                                pfcOverride = customPfc,
                                appliedAt = System.currentTimeMillis()
                            ))
                        }
                    )

                    CaloriePresetButton(
                        name = "VLCD",
                        adjustment = -500,
                        isPositive = false,
                        onClick = {
                            onApply(CalorieOverride(
                                templateName = "VLCD",
                                calorieAdjustment = -500,
                                pfcOverride = customPfc,
                                appliedAt = System.currentTimeMillis()
                            ))
                        }
                    )

                    HorizontalDivider()

                    // カスタムカロリー入力
                    Text(
                        text = "カスタムカロリー調整",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = customCalorieAdjustment,
                            onValueChange = { customCalorieAdjustment = it },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("例: -200 または +400") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true
                        )
                        Text(
                            text = "kcal",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.Gray
                        )
                    }

                    HorizontalDivider()

                    // PFCバランス
                    Text(
                        text = "PFCバランス",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.Gray
                    )

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFF5F5F5))
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // タンパク質スライダー
                            PfcSlider(
                                label = "タンパク質 (P)",
                                value = customPfc.protein,
                                color = Color(0xFFE53935),
                                onValueChange = { newP ->
                                    val newC = 100 - newP - customPfc.fat
                                    if (newC in 15..60) {
                                        customPfc = PfcRatio(protein = newP, fat = customPfc.fat, carbs = newC)
                                    }
                                }
                            )

                            // 脂質スライダー
                            PfcSlider(
                                label = "脂質 (F)",
                                value = customPfc.fat,
                                color = Color(0xFFFFB300),
                                minValue = 15,
                                maxValue = 40,
                                onValueChange = { newF ->
                                    val newC = 100 - customPfc.protein - newF
                                    if (newC in 15..60) {
                                        customPfc = PfcRatio(protein = customPfc.protein, fat = newF, carbs = newC)
                                    }
                                }
                            )

                            // 炭水化物スライダー
                            PfcSlider(
                                label = "炭水化物 (C)",
                                value = customPfc.carbs,
                                color = Color(0xFF4CAF50),
                                minValue = 15,
                                maxValue = 60,
                                onValueChange = { newC ->
                                    val newF = 100 - customPfc.protein - newC
                                    if (newF in 15..40) {
                                        customPfc = PfcRatio(protein = customPfc.protein, fat = newF, carbs = newC)
                                    }
                                }
                            )

                            HorizontalDivider()

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "合計 ${customPfc.protein + customPfc.fat + customPfc.carbs}%",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.Gray
                                )
                                TextButton(onClick = { customPfc = defaultPfc }) {
                                    Text(
                                        text = "現在のバランスに戻す",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color(0xFF4A9EFF)
                                    )
                                }
                            }
                        }
                    }
                }

                // 適用ボタン
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Button(
                        onClick = {
                            val calorieValue = customCalorieAdjustment.toIntOrNull() ?: 0
                            val name = if (calorieValue != 0) "カスタム" else "PFCバランスのみ"
                            onApply(CalorieOverride(
                                templateName = name,
                                calorieAdjustment = calorieValue,
                                pfcOverride = customPfc,
                                appliedAt = System.currentTimeMillis()
                            ))
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF9800))
                    ) {
                        Text(
                            text = "この設定を適用",
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CaloriePresetButton(
    name: String,
    adjustment: Int,
    isPositive: Boolean,
    onClick: () -> Unit
) {
    val borderColor = if (isPositive) Color(0xFF4CAF50) else Color(0xFFE53935)
    val textColor = if (isPositive) Color(0xFF4CAF50) else Color(0xFFE53935)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(2.dp, Color(0xFFE0E0E0), RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "${if (isPositive) "+" else ""}$adjustment kcal",
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Bold,
            color = textColor
        )
    }
}

@Composable
private fun PfcSlider(
    label: String,
    value: Int,
    color: Color,
    minValue: Int = 15,
    maxValue: Int = 50,
    onValueChange: (Int) -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium,
                color = color
            )
            Text(
                text = "$value%",
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Bold
            )
        }
        Slider(
            value = value.toFloat(),
            onValueChange = { onValueChange(it.toInt()) },
            valueRange = minValue.toFloat()..maxValue.toFloat(),
            steps = maxValue - minValue - 1,
            colors = SliderDefaults.colors(
                thumbColor = color,
                activeTrackColor = color
            )
        )
    }
}
