package com.yourcoach.plus.shared.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * 利用規約・プライバシーポリシー同意ダイアログ
 * Google/Apple Sign-Inで新規ユーザーと判明した場合に表示
 */
@Composable
fun TermsConsentDialog(
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    onTermsClick: () -> Unit = {},
    onPrivacyClick: () -> Unit = {}
) {
    AlertDialog(
        onDismissRequest = { /* バックキー無効 — 明示的に選択させる */ },
        containerColor = Color(0xFF1A1A2E),
        titleContentColor = Color.White,
        textContentColor = Color(0xFFCCCCCC),
        title = {
            Text(
                text = "利用規約への同意",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Your Coach+ をご利用いただくには、以下への同意が必要です。",
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )

                Row {
                    Text(
                        text = "・",
                        fontSize = 14.sp
                    )
                    Text(
                        text = "利用規約",
                        fontSize = 14.sp,
                        color = Color(0xFF4A9EFF),
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { onTermsClick() }
                    )
                }

                Row {
                    Text(
                        text = "・",
                        fontSize = 14.sp
                    )
                    Text(
                        text = "プライバシーポリシー",
                        fontSize = 14.sp,
                        color = Color(0xFF4A9EFF),
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { onPrivacyClick() }
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "※ 同意しない場合、アカウントは作成されません。",
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    color = Color(0xFF999999)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = onAccept,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4A9EFF)
                )
            ) {
                Text("同意してアカウント作成", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDecline) {
                Text("キャンセル", color = Color(0xFF999999))
            }
        }
    )
}
