package com.yourcoach.plus.android.ui.screens.meal

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.yourcoach.plus.android.ui.theme.*
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.data.database.FoodItem
import com.yourcoach.plus.shared.domain.model.MealItem
import org.koin.androidx.compose.koinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddMealScreen(
    mealType: String,
    templateMode: Boolean = false,
    recognizedFoods: List<RecognizedFood>? = null,
    onRecognizedFoodsHandled: () -> Unit = {},
    viewModel: MealViewModel = koinViewModel(),
    onNavigateBack: () -> Unit,
    onNavigateToAiRecognition: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showAddItemDialog by remember { mutableStateOf(false) }
    var showFoodDatabaseDialog by remember { mutableStateOf(false) }
    var showSaveTemplateDialog by remember { mutableStateOf(false) }
    var showEditItemDialog by remember { mutableStateOf(false) }
    var editingItemIndex by remember { mutableIntStateOf(-1) }

    // AI認識された食品を追加
    LaunchedEffect(recognizedFoods) {
        if (!recognizedFoods.isNullOrEmpty()) {
            viewModel.addRecognizedFoods(recognizedFoods)
            onRecognizedFoodsHandled()
        }
    }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    // テンプレート保存成功時のフィードバック
    LaunchedEffect(uiState.templateSavedSuccessfully) {
        if (uiState.templateSavedSuccessfully) {
            snackbarHostState.showSnackbar("テンプレートを保存しました")
            viewModel.clearTemplateSavedFlag()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text(if (templateMode) "食事テンプレート作成" else "食事を記録") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                    }
                },
                actions = {
                    if (!templateMode) {
                        IconButton(onClick = { viewModel.toggleTemplates() }) {
                            Icon(Icons.Default.Bookmark, "テンプレート")
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    if (templateMode) {
                        // テンプレートモード: テンプレート名入力ダイアログを表示
                        showSaveTemplateDialog = true
                    } else {
                        // 通常モード: 食事を記録として保存
                        viewModel.saveMeal(onNavigateBack)
                    }
                },
                containerColor = Primary
            ) {
                if (uiState.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(Icons.Default.Check, "保存", tint = Color.White)
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 食事番号選択
                if (!templateMode) {
                    item {
                        MealNumberSelector(
                            selectedMealNumber = uiState.selectedMealNumber,
                            mealsPerDay = uiState.mealsPerDay,
                            onMealNumberSelected = { viewModel.setMealNumber(it) }
                        )
                    }
                }

                // 栄養サマリー
                item {
                    NutritionSummaryCard(
                        calories = uiState.totalCalories,
                        protein = uiState.totalProtein,
                        carbs = uiState.totalCarbs,
                        fat = uiState.totalFat
                    )
                }

                // 運動後チェックボックス（GL/GI最適化用）
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { viewModel.setPostWorkout(!uiState.isPostWorkout) }
                            .background(
                                if (uiState.isPostWorkout)
                                    Color(0xFF4CAF50).copy(alpha = 0.1f)
                                else
                                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                RoundedCornerShape(8.dp)
                            )
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = uiState.isPostWorkout,
                            onCheckedChange = { viewModel.setPostWorkout(it) },
                            colors = CheckboxDefaults.colors(
                                checkedColor = Color(0xFF4CAF50),
                                uncheckedColor = MaterialTheme.colorScheme.onSurfaceVariant
                            ),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = "運動後",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = if (uiState.isPostWorkout) Color(0xFF4CAF50) else MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = if (uiState.isPostWorkout)
                                    "GL制限が緩和されます（高GI値食を推奨）"
                                else
                                    "運動後の食事はGI/GL制限を緩和",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

            // テンプレートセクション
            if (uiState.showTemplates) {
                item {
                    TemplateSection(
                        templates = uiState.templates,
                        onApplyTemplate = { template ->
                            viewModel.applyTemplate(template)
                        },
                        onSaveAsTemplate = {
                            if (uiState.items.isNotEmpty()) {
                                showSaveTemplateDialog = true
                            }
                        },
                        hasItems = uiState.items.isNotEmpty()
                    )
                }
            }

            // 食品追加ボタン
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        AddItemButton(
                            icon = Icons.Default.CameraAlt,
                            label = "AI認識",
                            color = Secondary,
                            onClick = onNavigateToAiRecognition,
                            modifier = Modifier.weight(1f)
                        )
                        AddItemButton(
                            icon = Icons.Default.Search,
                            label = "食品検索",
                            color = Tertiary,
                            onClick = { showFoodDatabaseDialog = true },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    AddItemButton(
                        icon = Icons.Default.Edit,
                        label = "手動入力",
                        color = Primary,
                        onClick = { showAddItemDialog = true },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // 食品リスト
            item {
                Text(
                    text = "追加した食品",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            if (uiState.items.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                            .background(
                                MaterialTheme.colorScheme.surfaceVariant,
                                RoundedCornerShape(12.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.Restaurant,
                                null,
                                modifier = Modifier.size(32.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "食品を追加してください",
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else {
                itemsIndexed(uiState.items) { index, item ->
                    MealItemCard(
                        item = item,
                        onEdit = {
                            editingItemIndex = index
                            showEditItemDialog = true
                        },
                        onDelete = { viewModel.removeItem(index) },
                        onQuantityChange = { newAmount ->
                            viewModel.updateItemQuantity(index, newAmount)
                        }
                    )
                }
            }

            // メモ
            item {
                OutlinedTextField(
                    value = uiState.note,
                    onValueChange = viewModel::updateNote,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("メモ（任意）") },
                    placeholder = { Text("今日の気分や体調など") },
                    minLines = 2,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
            }

            // ローディングオーバーレイ
            if (uiState.isSaving) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.3f)),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(48.dp),
                                color = Primary,
                                strokeWidth = 4.dp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "保存中...",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }

    // 手動追加ダイアログ
    if (showAddItemDialog) {
        AddMealItemDialog(
            onDismiss = { showAddItemDialog = false },
            onAdd = { item ->
                viewModel.addItem(item)
                // カスタム食品として自動保存（100gあたりに正規化）
                val ratio = 100f / item.amount
                viewModel.saveCustomFood(
                    name = item.name,
                    calories = (item.calories * ratio).toInt(),
                    protein = item.protein * ratio,
                    carbs = item.carbs * ratio,
                    fat = item.fat * ratio,
                    fiber = item.fiber * ratio
                )
                showAddItemDialog = false
            }
        )
    }

    // 食品データベースダイアログ
    if (showFoodDatabaseDialog) {
        FoodDatabaseDialog(
            viewModel = viewModel,
            onDismiss = { showFoodDatabaseDialog = false },
            onSelect = { foodItem, amount, selectedUnit ->
                // FoodItemからMealItemに変換（量に応じて栄養素を計算）- 完全版
                val gramsEquivalent = foodItem.toGrams(amount, selectedUnit)
                val ratio = gramsEquivalent / 100f
                val protein = foodItem.protein * ratio
                val fat = foodItem.fat * ratio
                val carbs = foodItem.carbs * ratio
                val mealItem = MealItem(
                    name = foodItem.name,
                    amount = amount,
                    unit = selectedUnit,
                    calories = MealItem.calculateCalories(protein, fat, carbs),
                    protein = protein,
                    carbs = carbs,
                    fat = fat,
                    fiber = foodItem.fiber * ratio,
                    solubleFiber = foodItem.solubleFiber * ratio,
                    insolubleFiber = foodItem.insolubleFiber * ratio,
                    sugar = foodItem.sugar * ratio,  // 糖質を追加
                    // 脂肪酸詳細
                    saturatedFat = foodItem.saturatedFat * ratio,
                    monounsaturatedFat = foodItem.monounsaturatedFat * ratio,
                    polyunsaturatedFat = foodItem.polyunsaturatedFat * ratio,
                    // 品質指標
                    diaas = foodItem.diaas,
                    gi = foodItem.gi ?: 0,  // FoodItemのGI値を使用
                    // ビタミン
                    vitamins = mapOf(
                        "vitaminA" to foodItem.vitaminA * ratio,
                        "vitaminB1" to foodItem.vitaminB1 * ratio,
                        "vitaminB2" to foodItem.vitaminB2 * ratio,
                        "vitaminB6" to foodItem.vitaminB6 * ratio,
                        "vitaminB12" to foodItem.vitaminB12 * ratio,
                        "vitaminC" to foodItem.vitaminC * ratio,
                        "vitaminD" to foodItem.vitaminD * ratio,
                        "vitaminE" to foodItem.vitaminE * ratio,
                        "vitaminK" to foodItem.vitaminK * ratio,
                        "niacin" to foodItem.niacin * ratio,
                        "pantothenicAcid" to foodItem.pantothenicAcid * ratio,
                        "biotin" to foodItem.biotin * ratio,
                        "folicAcid" to foodItem.folicAcid * ratio
                    ),
                    // ミネラル（全13種類）
                    minerals = mapOf(
                        "sodium" to foodItem.sodium * ratio,
                        "potassium" to foodItem.potassium * ratio,
                        "calcium" to foodItem.calcium * ratio,
                        "magnesium" to foodItem.magnesium * ratio,
                        "phosphorus" to foodItem.phosphorus * ratio,
                        "iron" to foodItem.iron * ratio,
                        "zinc" to foodItem.zinc * ratio,
                        "copper" to foodItem.copper * ratio,
                        "manganese" to foodItem.manganese * ratio,
                        "iodine" to foodItem.iodine * ratio,
                        "selenium" to foodItem.selenium * ratio,
                        "chromium" to foodItem.chromium * ratio,
                        "molybdenum" to foodItem.molybdenum * ratio
                    )
                )
                viewModel.addItem(mealItem)
                showFoodDatabaseDialog = false
            },
            onSelectCustom = { customFood, amount ->
                // カスタム食品からMealItemに変換
                val ratio = amount / 100f
                val protein = customFood.protein * ratio
                val fat = customFood.fat * ratio
                val carbs = customFood.carbs * ratio
                val mealItem = MealItem(
                    name = customFood.name,
                    amount = amount,
                    unit = "g",
                    calories = MealItem.calculateCalories(protein, fat, carbs),
                    protein = protein,
                    carbs = carbs,
                    fat = fat,
                    fiber = customFood.fiber * ratio,
                    gi = customFood.gi
                )
                viewModel.addItem(mealItem)
                showFoodDatabaseDialog = false
            }
        )
    }

    // テンプレート保存ダイアログ
    if (showSaveTemplateDialog) {
        SaveTemplateDialog(
            onDismiss = { showSaveTemplateDialog = false },
            onSave = { name ->
                viewModel.saveAsTemplate(name)
                showSaveTemplateDialog = false
            }
        )
    }

    // 食品編集ダイアログ
    if (showEditItemDialog && editingItemIndex >= 0 && editingItemIndex < uiState.items.size) {
        val itemToEdit = uiState.items[editingItemIndex]
        EditMealItemDialog(
            item = itemToEdit,
            onDismiss = {
                showEditItemDialog = false
                editingItemIndex = -1
            },
            onSave = { updatedItem ->
                viewModel.updateItem(editingItemIndex, updatedItem)
                showEditItemDialog = false
                editingItemIndex = -1
            }
        )
    }

    // テンプレートモードで保存成功時は戻る
    LaunchedEffect(uiState.templateSavedSuccessfully, templateMode) {
        if (templateMode && uiState.templateSavedSuccessfully) {
            onNavigateBack()
        }
    }
}

@Composable
private fun NutritionSummaryCard(
    calories: Int,
    protein: Float,
    carbs: Float,
    fat: Float
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Primary.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "合計",
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                NutrientValue("${calories}kcal", "カロリー", ScoreCalories)
                NutrientValue("${protein.toInt()}g", "タンパク質", ScoreProtein)
                NutrientValue("${carbs.toInt()}g", "炭水化物", ScoreCarbs)
                NutrientValue("${fat.toInt()}g", "脂質", ScoreFat)
            }
        }
    }
}

@Composable
private fun NutrientValue(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun AddItemButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(80.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.height(4.dp))
            Text(label, color = color, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
private fun MealItemCard(
    item: MealItem,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onQuantityChange: (Float) -> Unit = {}
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${item.calories}kcal",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = ScoreCalories
                    )
                    Text(
                        text = "P${item.protein.toInt()} F${item.fat.toInt()} C${item.carbs.toInt()}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                // 編集ボタン
                IconButton(onClick = onEdit) {
                    Icon(
                        Icons.Default.Edit,
                        "編集",
                        tint = Primary
                    )
                }
                // 削除ボタン
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Default.Close,
                        "削除",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            // 量調整
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val isGram = item.unit == "g"
                val step = if (isGram) 10f else 1f
                val minVal = if (isGram) 10f else 1f
                Text(
                    text = "量:",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                // マイナスボタン
                IconButton(
                    onClick = {
                        val newAmount = (item.amount - step).coerceAtLeast(minVal)
                        onQuantityChange(newAmount)
                    },
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant,
                            CircleShape
                        )
                ) {
                    Icon(
                        Icons.Default.Remove,
                        "減らす",
                        modifier = Modifier.size(16.dp)
                    )
                }
                Text(
                    text = "${item.amount.toInt()}${item.unit}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.width(60.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                // プラスボタン
                IconButton(
                    onClick = {
                        val newAmount = item.amount + step
                        onQuantityChange(newAmount)
                    },
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant,
                            CircleShape
                        )
                ) {
                    Icon(
                        Icons.Default.Add,
                        "増やす",
                        modifier = Modifier.size(16.dp)
                    )
                }
                Spacer(modifier = Modifier.weight(1f))
                // クイック選択
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (isGram) {
                        listOf(50, 100, 150, 200).forEach { amount ->
                            FilterChip(
                                onClick = { onQuantityChange(amount.toFloat()) },
                                label = {
                                    Text(
                                        "${amount}g",
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                },
                                selected = item.amount.toInt() == amount,
                                modifier = Modifier.height(28.dp)
                            )
                        }
                    } else {
                        listOf(1, 2, 3, 4).forEach { amount ->
                            FilterChip(
                                onClick = { onQuantityChange(amount.toFloat()) },
                                label = {
                                    Text(
                                        "$amount${item.unit}",
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                },
                                selected = item.amount.toInt() == amount,
                                modifier = Modifier.height(28.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddMealItemDialog(
    onDismiss: () -> Unit,
    onAdd: (MealItem) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("100") }
    var unit by remember { mutableStateOf("g") }
    var calories by remember { mutableStateOf("") }
    var protein by remember { mutableStateOf("") }
    var carbs by remember { mutableStateOf("") }
    var fat by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("食品を追加") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("食品名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = { Text("量") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = unit,
                        onValueChange = { unit = it },
                        label = { Text("単位") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
                OutlinedTextField(
                    value = calories,
                    onValueChange = { calories = it },
                    label = { Text("カロリー (kcal)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = protein,
                        onValueChange = { protein = it },
                        label = { Text("P (g)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = carbs,
                        onValueChange = { carbs = it },
                        label = { Text("C (g)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = fat,
                        onValueChange = { fat = it },
                        label = { Text("F (g)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (name.isNotBlank()) {
                        val p = protein.toFloatOrNull() ?: 0f
                        val f = fat.toFloatOrNull() ?: 0f
                        val c = carbs.toFloatOrNull() ?: 0f
                        onAdd(
                            MealItem(
                                name = name,
                                amount = amount.toFloatOrNull() ?: 100f,
                                unit = unit,
                                calories = MealItem.calculateCalories(p, f, c),
                                protein = p,
                                carbs = c,
                                fat = f
                            )
                        )
                    }
                },
                enabled = name.isNotBlank()
            ) {
                Text("追加", color = Primary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}

/**
 * 食品データベース検索ダイアログ（内蔵DB + カスタム食品統合）
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FoodDatabaseDialog(
    viewModel: MealViewModel,
    onDismiss: () -> Unit,
    onSelect: (FoodItem, Float, String) -> Unit,
    onSelectCustom: (SearchResultFood, Float) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var selectedFood by remember { mutableStateOf<FoodItem?>(null) }
    var selectedCustomFood by remember { mutableStateOf<SearchResultFood?>(null) }
    var amount by remember { mutableStateOf(100f) }
    val uiState by viewModel.uiState.collectAsState()

    val categories = FoodDatabase.categories

    // 検索時は統合検索、カテゴリ選択時は内蔵DBのみ
    val searchResults = remember(searchQuery) {
        if (searchQuery.isNotBlank()) viewModel.searchFoods(searchQuery) else emptyList()
    }
    val foods = remember(searchQuery, selectedCategory) {
        when {
            searchQuery.isNotBlank() -> emptyList<FoodItem>() // 検索時はsearchResultsを使用
            selectedCategory != null -> FoodDatabase.getFoodsByCategory(selectedCategory!!)
            else -> FoodDatabase.allFoods.take(20)
        }
    }

    if (selectedFood != null) {
        // 選択した食品の量調整ダイアログ（内蔵DB）- 単位対応
        val food = selectedFood!!
        val availableUnits = remember(food) { food.getAvailableUnits() }
        val defaultUnit = remember(food) { if (food.servingSizes.isNotEmpty()) food.getDefaultUnit() else "g" }
        var selectedUnit by remember(food) { mutableStateOf(defaultUnit) }
        // デフォルト単位変更時にamountもリセット
        LaunchedEffect(food) {
            amount = if (defaultUnit == "g") 100f else 1f
        }
        val step = if (selectedUnit == "g") 10f else 1f
        val minAmount = if (selectedUnit == "g") 10f else 1f

        AlertDialog(
            onDismissRequest = { selectedFood = null },
            title = { Text(food.name) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    // 100gあたりの栄養情報
                    Text(
                        text = "100gあたり",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${food.calories.toInt()}", fontWeight = FontWeight.Bold)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${food.protein.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreProtein)
                            Text("P", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${food.carbs.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreCarbs)
                            Text("C", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${food.fat.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreFat)
                            Text("F", style = MaterialTheme.typography.labelSmall)
                        }
                    }

                    HorizontalDivider()

                    // 単位選択（2つ以上の単位がある場合のみ表示）
                    if (availableUnits.size > 1) {
                        Text(
                            text = "単位を選択",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
                        ) {
                            availableUnits.forEach { unit ->
                                FilterChip(
                                    onClick = {
                                        selectedUnit = unit
                                        amount = if (unit == "g") 100f else 1f
                                    },
                                    label = { Text(unit) },
                                    selected = selectedUnit == unit
                                )
                            }
                        }
                    }

                    // 量調整
                    Text(
                        text = "量を選択",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        IconButton(
                            onClick = { amount = (amount - step).coerceAtLeast(minAmount) },
                            modifier = Modifier
                                .size(40.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    CircleShape
                                )
                        ) {
                            Icon(Icons.Default.Remove, "減らす")
                        }
                        Text(
                            text = "${amount.toInt()}${selectedUnit}",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 24.dp)
                        )
                        IconButton(
                            onClick = { amount = amount + step },
                            modifier = Modifier
                                .size(40.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    CircleShape
                                )
                        ) {
                            Icon(Icons.Default.Add, "増やす")
                        }
                    }

                    // クイック選択
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
                    ) {
                        if (selectedUnit == "g") {
                            listOf(50, 100, 150, 200, 300).forEach { qty ->
                                FilterChip(
                                    onClick = { amount = qty.toFloat() },
                                    label = { Text("${qty}g") },
                                    selected = amount.toInt() == qty
                                )
                            }
                        } else {
                            listOf(1, 2, 3, 4, 5).forEach { qty ->
                                FilterChip(
                                    onClick = { amount = qty.toFloat() },
                                    label = { Text("$qty${selectedUnit}") },
                                    selected = amount.toInt() == qty
                                )
                            }
                        }
                    }

                    HorizontalDivider()

                    // 計算された栄養素
                    val gramsEquivalent = food.toGrams(amount, selectedUnit)
                    val ratio = gramsEquivalent / 100f
                    Text(
                        text = "${amount.toInt()}${selectedUnit}あたり",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(food.calories * ratio).toInt()}", fontWeight = FontWeight.Bold)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(food.protein * ratio).toInt()}g", fontWeight = FontWeight.Bold, color = ScoreProtein)
                            Text("P", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(food.carbs * ratio).toInt()}g", fontWeight = FontWeight.Bold, color = ScoreCarbs)
                            Text("C", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(food.fat * ratio).toInt()}g", fontWeight = FontWeight.Bold, color = ScoreFat)
                            Text("F", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onSelect(food, amount, selectedUnit)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("追加")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedFood = null }) {
                    Text("戻る")
                }
            }
        )
    } else if (selectedCustomFood != null) {
        // カスタム食品の量調整ダイアログ
        val customFood = selectedCustomFood!!
        AlertDialog(
            onDismissRequest = { selectedCustomFood = null },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(customFood.name)
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Tertiary.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = "カスタム",
                            style = MaterialTheme.typography.labelSmall,
                            color = Tertiary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    // 100gあたりの栄養情報
                    Text(
                        text = "100gあたり",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${customFood.calories}", fontWeight = FontWeight.Bold)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${customFood.protein.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreProtein)
                            Text("P", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${customFood.carbs.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreCarbs)
                            Text("C", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${customFood.fat.toInt()}g", fontWeight = FontWeight.Bold, color = ScoreFat)
                            Text("F", style = MaterialTheme.typography.labelSmall)
                        }
                    }

                    HorizontalDivider()

                    // 量調整
                    Text(
                        text = "量を選択",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        IconButton(
                            onClick = { amount = (amount - 10).coerceAtLeast(10f) },
                            modifier = Modifier
                                .size(40.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    CircleShape
                                )
                        ) {
                            Icon(Icons.Default.Remove, "減らす")
                        }
                        Text(
                            text = "${amount.toInt()}g",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 24.dp)
                        )
                        IconButton(
                            onClick = { amount = amount + 10 },
                            modifier = Modifier
                                .size(40.dp)
                                .background(
                                    MaterialTheme.colorScheme.surfaceVariant,
                                    CircleShape
                                )
                        ) {
                            Icon(Icons.Default.Add, "増やす")
                        }
                    }

                    // クイック選択
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
                    ) {
                        listOf(50, 100, 150, 200, 300).forEach { qty ->
                            FilterChip(
                                onClick = { amount = qty.toFloat() },
                                label = { Text("${qty}g") },
                                selected = amount.toInt() == qty
                            )
                        }
                    }

                    HorizontalDivider()

                    // 計算された栄養素
                    val ratio = amount / 100f
                    Text(
                        text = "${amount.toInt()}gあたり",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(customFood.calories * ratio).toInt()}", fontWeight = FontWeight.Bold)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(customFood.protein * ratio).toInt()}g", fontWeight = FontWeight.Bold, color = ScoreProtein)
                            Text("P", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(customFood.carbs * ratio).toInt()}g", fontWeight = FontWeight.Bold, color = ScoreCarbs)
                            Text("C", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${(customFood.fat * ratio).toInt()}g", fontWeight = FontWeight.Bold, color = ScoreFat)
                            Text("F", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onSelectCustom(customFood, amount)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("追加")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedCustomFood = null }) {
                    Text("戻る")
                }
            }
        )
    } else {
        // 食品検索ダイアログ
        AlertDialog(
            onDismissRequest = onDismiss,
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f),
            title = { Text("食品を検索") },
            text = {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // 検索バー
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("食品名で検索...") },
                        leadingIcon = { Icon(Icons.Default.Search, null) },
                        trailingIcon = {
                            if (searchQuery.isNotBlank()) {
                                IconButton(onClick = { searchQuery = "" }) {
                                    Icon(Icons.Default.Clear, "クリア")
                                }
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    // カテゴリチップ
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            onClick = { selectedCategory = null },
                            label = { Text("すべて") },
                            selected = selectedCategory == null && searchQuery.isBlank()
                        )
                        categories.forEach { category ->
                            FilterChip(
                                onClick = {
                                    selectedCategory = if (selectedCategory == category) null else category
                                    searchQuery = ""
                                },
                                label = { Text(category) },
                                selected = selectedCategory == category
                            )
                        }
                    }

                    // 食品リスト
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // 検索時は統合検索結果を表示
                        if (searchQuery.isNotBlank()) {
                            items(searchResults) { result ->
                                SearchResultFoodCard(
                                    food = result,
                                    onClick = {
                                        if (result.isCustom) {
                                            selectedCustomFood = result
                                        } else {
                                            // 内蔵DBから取得
                                            FoodDatabase.getFoodByName(result.name)?.let {
                                                selectedFood = it
                                            }
                                        }
                                    }
                                )
                            }
                        } else {
                            // カテゴリ選択時は内蔵DBのみ
                            items(foods) { food ->
                                FoodItemCard(
                                    food = food,
                                    onClick = { selectedFood = food }
                                )
                            }
                        }

                        if ((searchQuery.isNotBlank() && searchResults.isEmpty()) ||
                            (searchQuery.isBlank() && foods.isEmpty())) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(32.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        "該当する食品がありません",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = onDismiss) {
                    Text("閉じる")
                }
            }
        )
    }
}

@Composable
private fun FoodItemCard(
    food: FoodItem,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = food.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = food.category,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${food.calories.toInt()}kcal",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = ScoreCalories
                )
                Text(
                    text = "P${food.protein.toInt()} F${food.fat.toInt()} C${food.carbs.toInt()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * 検索結果食品カード（カスタム食品対応）
 */
@Composable
private fun SearchResultFoodCard(
    food: SearchResultFood,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = food.name,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                    if (food.isCustom) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Tertiary.copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "カスタム",
                                style = MaterialTheme.typography.labelSmall,
                                color = Tertiary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Text(
                    text = if (food.isCustom) "マイ食品" else "内蔵DB",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${food.calories}kcal",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = ScoreCalories
                )
                Text(
                    text = "P${food.protein.toInt()} F${food.fat.toInt()} C${food.carbs.toInt()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * テンプレートセクション
 */
@Composable
private fun TemplateSection(
    templates: List<com.yourcoach.plus.shared.domain.model.MealTemplate>,
    onApplyTemplate: (com.yourcoach.plus.shared.domain.model.MealTemplate) -> Unit,
    onSaveAsTemplate: () -> Unit,
    hasItems: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
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
                Text(
                    text = "テンプレート",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                if (hasItems) {
                    TextButton(onClick = onSaveAsTemplate) {
                        Icon(Icons.Default.Save, null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("保存")
                    }
                }
            }

            if (templates.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Bookmark,
                            null,
                            modifier = Modifier.size(32.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "テンプレートがありません",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "食品を追加して保存すると、\n次回から素早く入力できます",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            } else {
                templates.forEach { template ->
                    Card(
                        onClick = { onApplyTemplate(template) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = template.name,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "${template.items.size}品 • ${template.totalCalories}kcal",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Icon(
                                Icons.Default.ChevronRight,
                                null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * テンプレート保存ダイアログ
 */
@Composable
private fun SaveTemplateDialog(
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var templateName by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("テンプレートとして保存") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "現在の食品リストをテンプレートとして保存します。\n次回から素早く入力できます。",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = templateName,
                    onValueChange = { templateName = it },
                    label = { Text("テンプレート名") },
                    placeholder = { Text("例: 朝食セット、プロテイン込み") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSave(templateName) },
                enabled = templateName.isNotBlank()
            ) {
                Text("保存", color = Primary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}

/**
 * 食事番号選択
 */
@Composable
private fun MealNumberSelector(
    selectedMealNumber: Int,
    mealsPerDay: Int,
    onMealNumberSelected: (Int) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "食事を選択",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 設定回数または現在の選択の大きい方+1まで表示（無制限に追加可能）
                val maxDisplay = maxOf(mealsPerDay, selectedMealNumber) + 1
                (1..maxDisplay).forEach { number ->
                    FilterChip(
                        onClick = { onMealNumberSelected(number) },
                        label = { Text("食事$number") },
                        selected = selectedMealNumber == number,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Primary,
                            selectedLabelColor = Color.White
                        )
                    )
                }
            }
        }
    }
}

/**
 * 食品編集ダイアログ
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditMealItemDialog(
    item: MealItem,
    onDismiss: () -> Unit,
    onSave: (MealItem) -> Unit
) {
    var name by remember { mutableStateOf(item.name) }
    var amount by remember { mutableStateOf(item.amount.toInt().toString()) }
    var unit by remember { mutableStateOf(item.unit) }
    var calories by remember { mutableStateOf(item.calories.toString()) }
    var protein by remember { mutableStateOf(item.protein.toInt().toString()) }
    var carbs by remember { mutableStateOf(item.carbs.toInt().toString()) }
    var fat by remember { mutableStateOf(item.fat.toInt().toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("食品を編集") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("食品名") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = { Text("量") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = unit,
                        onValueChange = { unit = it },
                        label = { Text("単位") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
                OutlinedTextField(
                    value = calories,
                    onValueChange = { calories = it },
                    label = { Text("カロリー (kcal)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = protein,
                        onValueChange = { protein = it },
                        label = { Text("P (g)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = fat,
                        onValueChange = { fat = it },
                        label = { Text("F (g)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = carbs,
                        onValueChange = { carbs = it },
                        label = { Text("C (g)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(
                        item.copy(
                            name = name,
                            amount = amount.toFloatOrNull() ?: item.amount,
                            unit = unit,
                            calories = calories.toIntOrNull() ?: item.calories,
                            protein = protein.toFloatOrNull() ?: item.protein,
                            carbs = carbs.toFloatOrNull() ?: item.carbs,
                            fat = fat.toFloatOrNull() ?: item.fat
                        )
                    )
                },
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("保存")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}
