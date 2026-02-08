package com.yourcoach.plus.shared.ui.screens.comy

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.shared.camera.CameraHelper
import com.yourcoach.plus.shared.camera.CameraResult
import com.yourcoach.plus.shared.domain.model.ComyCategory
import com.yourcoach.plus.shared.ui.theme.AccentOrange
import kotlinx.coroutines.launch

/**
 * 投稿作成BottomSheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePostSheet(
    sheetState: SheetState,
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onCreatePost: (title: String, content: String, category: ComyCategory, imageBase64: String?, imageMimeType: String?) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<ComyCategory?>(null) }
    var selectedImage by remember { mutableStateOf<CameraResult?>(null) }
    var isPickingImage by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val isValid = title.isNotBlank() && content.isNotBlank() && selectedCategory != null

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "閉じる"
                    )
                }

                Text(
                    text = "新しい投稿",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                // 投稿ボタン
                Button(
                    onClick = {
                        if (isValid && selectedCategory != null) {
                            onCreatePost(
                                title,
                                content,
                                selectedCategory!!,
                                selectedImage?.base64ImageData,
                                selectedImage?.mimeType
                            )
                        }
                    },
                    enabled = isValid && !isLoading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AccentOrange
                    ),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Send,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("投稿")
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // カテゴリ選択
            Text(
                text = "カテゴリ",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ComyCategory.entries.forEach { category ->
                    FilterChip(
                        selected = selectedCategory == category,
                        onClick = { selectedCategory = category },
                        label = { Text("${category.emoji} ${category.displayName}") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AccentOrange.copy(alpha = 0.2f),
                            selectedLabelColor = AccentOrange
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // タイトル入力
            Text(
                text = "タイトル",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("タイトルを入力...") },
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(20.dp))

            // 本文入力
            Text(
                text = "本文",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                placeholder = { Text("内容を入力...") },
                shape = RoundedCornerShape(12.dp),
                maxLines = 6
            )

            Spacer(modifier = Modifier.height(20.dp))

            // 画像添付
            Text(
                text = "写真（任意）",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(8.dp))

            if (selectedImage != null) {
                // 選択された画像のプレビュー
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(
                            width = 1.dp,
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    // 画像選択済みの表示
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Image,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp)
                        )
                    }

                    // 削除ボタン
                    IconButton(
                        onClick = { selectedImage = null },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                            .size(32.dp)
                            .background(
                                Color.Black.copy(alpha = 0.5f),
                                RoundedCornerShape(16.dp)
                            )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "画像を削除",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            } else {
                // 画像選択ボタン
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .border(
                            width = 2.dp,
                            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .clickable {
                            scope.launch {
                                isPickingImage = true
                                val result = CameraHelper.pickImage()
                                result.onSuccess { cameraResult ->
                                    selectedImage = cameraResult
                                }
                                isPickingImage = false
                            }
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (isPickingImage) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    } else {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.AddPhotoAlternate,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "タップして写真を選択",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 投稿ガイドライン
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp)
            ) {
                Text(
                    text = "コミュニティガイドライン: 他のユーザーを尊重し、建設的な投稿を心がけましょう。不適切な内容は削除される場合があります。",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
