package com.yourcoach.plus.shared.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.yourcoach.plus.shared.ui.theme.Primary

/**
 * 日付セレクター
 * 前日・翌日の切り替えと今日に戻るボタンを提供
 */
@Composable
fun DateSelector(
    dateDisplay: String,
    isToday: Boolean,
    onPreviousDay: () -> Unit,
    onNextDay: () -> Unit,
    onToday: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPreviousDay) {
            Icon(
                imageVector = Icons.Default.ChevronLeft,
                contentDescription = "前日"
            )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = dateDisplay,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            if (!isToday) {
                TextButton(onClick = onToday) {
                    Text(
                        text = "今日に戻る",
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary
                    )
                }
            }
        }

        IconButton(onClick = onNextDay) {
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "翌日"
            )
        }
    }
}
