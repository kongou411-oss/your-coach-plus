package com.yourcoach.plus.shared.ui.screens.meal

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.model.rememberScreenModel
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.ui.components.LoadingOverlay
import com.yourcoach.plus.shared.ui.theme.Primary
import com.yourcoach.plus.shared.util.DateUtil
import org.koin.compose.koinInject

/**
 * 食事追加画面
 */
data class AddMealScreen(
    val selectedDate: String = DateUtil.todayString()
) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val authRepository: AuthRepository = koinInject()
        val mealRepository: MealRepository = koinInject()

        val screenModel = rememberScreenModel {
            AddMealScreenModel(authRepository, mealRepository, selectedDate)
        }
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow

        // 保存成功時に戻る
        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                navigator.pop()
            }
        }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("食事を記録", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.Default.Close, contentDescription = "閉じる")
                        }
                    },
                    actions = {
                        TextButton(
                            onClick = { screenModel.saveMeal() },
                            enabled = !uiState.isSaving
                        ) {
                            Text("保存")
                        }
                    }
                )
            }
        ) { paddingValues ->
            Box(modifier = Modifier.fillMaxSize()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 日付表示
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CalendarToday,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = DateUtil.formatDateForDisplay(uiState.selectedDate),
                                    style = MaterialTheme.typography.titleMedium
                                )
                            }
                        }
                    }

                    // 食事タイプ選択
                    item {
                        Text(
                            text = "食事タイプ",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            MealType.entries.forEach { type ->
                                FilterChip(
                                    selected = uiState.mealType == type,
                                    onClick = { screenModel.updateMealType(type) },
                                    label = { Text(getMealTypeLabel(type)) }
                                )
                            }
                        }
                    }

                    // 食事名
                    item {
                        OutlinedTextField(
                            value = uiState.mealName,
                            onValueChange = { screenModel.updateMealName(it) },
                            label = { Text("食事名（任意）") },
                            placeholder = { Text("例: 朝のオムレツセット") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    // 食品リスト
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "食品",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Medium
                            )
                            TextButton(onClick = { screenModel.addItem() }) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("追加")
                            }
                        }
                    }

                    itemsIndexed(uiState.items) { index, item ->
                        MealItemCard(
                            item = item,
                            onUpdate = { screenModel.updateItem(index, it) },
                            onRemove = { screenModel.removeItem(index) },
                            canRemove = uiState.items.size > 1
                        )
                    }

                    // メモ
                    item {
                        OutlinedTextField(
                            value = uiState.note,
                            onValueChange = { screenModel.updateNote(it) },
                            label = { Text("メモ（任意）") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            maxLines = 4
                        )
                    }

                    // 保存ボタン
                    item {
                        Button(
                            onClick = { screenModel.saveMeal() },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !uiState.isSaving
                        ) {
                            if (uiState.isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            } else {
                                Icon(Icons.Default.Save, contentDescription = null)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("保存")
                        }
                    }
                }

                // ローディング
                LoadingOverlay(isLoading = uiState.isSaving, message = "保存中...")
            }
        }

        // エラーダイアログ
        uiState.error?.let { error ->
            AlertDialog(
                onDismissRequest = { screenModel.clearError() },
                title = { Text("エラー") },
                text = { Text(error) },
                confirmButton = {
                    TextButton(onClick = { screenModel.clearError() }) {
                        Text("OK")
                    }
                }
            )
        }
    }
}

@Composable
private fun MealItemCard(
    item: MealItemInput,
    onUpdate: (MealItemInput) -> Unit,
    onRemove: () -> Unit,
    canRemove: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 食品名
                OutlinedTextField(
                    value = item.name,
                    onValueChange = { onUpdate(item.copy(name = it)) },
                    label = { Text("食品名") },
                    placeholder = { Text("例: 鶏むね肉") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )

                if (canRemove) {
                    IconButton(onClick = onRemove) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "削除",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            // 量と単位
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = item.amount,
                    onValueChange = { onUpdate(item.copy(amount = it)) },
                    label = { Text("量") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
                OutlinedTextField(
                    value = item.unit,
                    onValueChange = { onUpdate(item.copy(unit = it)) },
                    label = { Text("単位") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }

            // 栄養素
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = item.calories,
                    onValueChange = { onUpdate(item.copy(calories = it)) },
                    label = { Text("kcal") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
                OutlinedTextField(
                    value = item.protein,
                    onValueChange = { onUpdate(item.copy(protein = it)) },
                    label = { Text("P(g)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
                OutlinedTextField(
                    value = item.fat,
                    onValueChange = { onUpdate(item.copy(fat = it)) },
                    label = { Text("F(g)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
                OutlinedTextField(
                    value = item.carbs,
                    onValueChange = { onUpdate(item.copy(carbs = it)) },
                    label = { Text("C(g)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
            }
        }
    }
}

private fun getMealTypeLabel(type: MealType): String = when (type) {
    MealType.BREAKFAST -> "朝食"
    MealType.LUNCH -> "昼食"
    MealType.DINNER -> "夕食"
    MealType.SNACK -> "間食"
    MealType.SUPPLEMENT -> "サプリ"
}
