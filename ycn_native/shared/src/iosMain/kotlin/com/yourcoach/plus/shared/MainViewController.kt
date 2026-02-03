package com.yourcoach.plus.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.ComposeUIViewController

/**
 * iOS用のメインビューコントローラー
 * SwiftUIからこの関数を呼び出してComposeのUIを表示する
 */
fun MainViewController() = ComposeUIViewController {
    YourCoachApp()
}

/**
 * Your Coach+ メインアプリ（iOS）
 * TODO: Android版と共通化する
 */
@Composable
fun YourCoachApp() {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF4A9EFF),
            secondary = Color(0xFF1CB0F6),
            background = Color(0xFF1A1A1A),
            surface = Color(0xFF2C2C2C),
            onPrimary = Color.White,
            onSecondary = Color.White,
            onBackground = Color(0xFFE5E5E5),
            onSurface = Color(0xFFE5E5E5)
        )
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            // 仮のダッシュボード画面
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Your Coach+",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.primary
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "iOS版 (Compose Multiplatform)",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onBackground
                )

                Spacer(modifier = Modifier.height(32.dp))

                Button(
                    onClick = { /* TODO */ },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Text("開始する")
                }
            }
        }
    }
}
