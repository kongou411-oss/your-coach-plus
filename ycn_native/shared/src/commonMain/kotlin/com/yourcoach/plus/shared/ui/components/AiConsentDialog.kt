package com.yourcoach.plus.shared.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * AI データ共有同意ダイアログ
 * App Store Guideline 5.1.1(i) / 5.1.2(i) 対応
 *
 * - 送信データの内容を明示
 * - 送信先（Google Gemini AI）を明示
 * - ユーザーの明示的な同意を取得
 */
@Composable
fun AiConsentDialog(
    onConsent: () -> Unit,
    onDecline: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDecline,
        containerColor = Color(0xFF1A1A2E),
        titleContentColor = Color.White,
        textContentColor = Color(0xFFCCCCCC),
        title = {
            Text(
                text = "AI機能のデータ利用について",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "本アプリのAI機能では、以下のデータを外部AIサービスに送信します。",
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )

                // 送信先
                SectionHeader("送信先")
                BulletText("Google Gemini AI（Google LLC提供）")

                // 送信データ
                SectionHeader("送信されるデータ")
                BulletText("食事の写真（AI食品認識使用時）")
                BulletText("体組成データ（体重・体脂肪率等）")
                BulletText("食事・運動の記録データ")
                BulletText("フィットネス目標・生活リズム情報")

                // 利用目的
                SectionHeader("利用目的")
                BulletText("食品画像の自動認識・栄養素推定")
                BulletText("パーソナライズされた栄養・運動アドバイスの生成")
                BulletText("日々のクエスト（行動指示書）の生成")

                // 注意事項
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "※ 送信データはAIモデルの学習には使用されません。\n※ 詳細はプライバシーポリシーをご確認ください。",
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    color = Color(0xFF999999)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onConsent,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4A9EFF)
                )
            ) {
                Text("同意して続行", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDecline) {
                Text("キャンセル", color = Color(0xFF999999))
            }
        }
    )
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        color = Color(0xFF4A9EFF)
    )
}

@Composable
private fun BulletText(text: String) {
    Text(
        text = "・$text",
        fontSize = 13.sp,
        lineHeight = 18.sp
    )
}
