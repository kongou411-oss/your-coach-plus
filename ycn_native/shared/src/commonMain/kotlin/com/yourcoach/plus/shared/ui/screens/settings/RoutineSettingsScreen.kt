package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import com.yourcoach.plus.shared.ui.theme.*

class RoutineSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<RoutineSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }
        var showResetDialog by remember { mutableStateOf(false) }
        var showDeleteDialog by remember { mutableStateOf<Int?>(null) }

        LaunchedEffect(uiState.error) {
            uiState.error?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearError()
            }
        }

        LaunchedEffect(uiState.successMessage) {
            uiState.successMessage?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearSuccessMessage()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("ルーティン設定") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
                        IconButton(onClick = { showResetDialog = true }) {
                            Icon(Icons.Default.Refresh, contentDescription = "リセット")
                        }
                    }
                )
            },
            floatingActionButton = {
                if (uiState.days.size < 10) {
                    FloatingActionButton(
                        onClick = { screenModel.addDay() },
                        containerColor = Primary
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Day追加")
                    }
                }
            }
        ) { paddingValues ->
            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // ヘルプカード
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.1f))
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = Primary, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "↑↓で並び替え、最大10日、カスタム分類も追加可能",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Primary
                                )
                            }
                        }
                    }

                    // Day一覧
                    itemsIndexed(uiState.days) { index, day ->
                        RoutineDayCard(
                            day = day,
                            canDelete = uiState.days.size > 2 && day.dayNumber > 2,
                            canMoveUp = index > 0,
                            canMoveDown = index < uiState.days.size - 1,
                            mealTemplates = uiState.mealTemplates,
                            workoutTemplates = uiState.workoutTemplates,
                            onUpdateSplitType = { splitType ->
                                screenModel.updateDay(day.dayNumber) {
                                    copy(splitType = splitType, isRestDay = splitType == "休み")
                                }
                            },
                            onToggleRestDay = { isRest ->
                                screenModel.updateDay(day.dayNumber) {
                                    copy(isRestDay = isRest, splitType = if (isRest) "休み" else splitType)
                                }
                            },
                            onDelete = { showDeleteDialog = day.dayNumber },
                            onMoveUp = { screenModel.moveDay(index, index - 1) },
                            onMoveDown = { screenModel.moveDay(index, index + 1) },
                            onAddMealTemplate = { templateId -> screenModel.addMealTemplateToDay(day.dayNumber, templateId) },
                            onRemoveMealTemplate = { idx -> screenModel.removeMealTemplateFromDay(day.dayNumber, idx) },
                            onAddWorkoutTemplate = { templateId -> screenModel.addWorkoutTemplateToDay(day.dayNumber, templateId) },
                            onRemoveWorkoutTemplate = { idx -> screenModel.removeWorkoutTemplateFromDay(day.dayNumber, idx) }
                        )
                    }

                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }

        // リセット確認ダイアログ
        if (showResetDialog) {
            AlertDialog(
                onDismissRequest = { showResetDialog = false },
                title = { Text("デフォルトに戻す") },
                text = { Text("ルーティンを7日間のデフォルト（胸→背中→休→肩→腕→脚→休）に戻しますか？\n\n現在の設定は失われます。") },
                confirmButton = {
                    TextButton(onClick = { screenModel.resetToDefault(); showResetDialog = false }) {
                        Text("リセット", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showResetDialog = false }) { Text("キャンセル") }
                }
            )
        }

        // 削除確認ダイアログ
        showDeleteDialog?.let { dayNumber ->
            AlertDialog(
                onDismissRequest = { showDeleteDialog = null },
                title = { Text("Day $dayNumber を削除") },
                text = { Text("このDayを削除しますか？\n以降のDayは番号が繰り上がります。") },
                confirmButton = {
                    TextButton(onClick = { screenModel.removeDay(dayNumber); showDeleteDialog = null }) {
                        Text("削除", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteDialog = null }) { Text("キャンセル") }
                }
            )
        }
    }
}

@Composable
private fun RoutineDayCard(
    day: RoutineDay,
    canDelete: Boolean,
    canMoveUp: Boolean,
    canMoveDown: Boolean,
    mealTemplates: List<MealTemplate>,
    workoutTemplates: List<WorkoutTemplate>,
    onUpdateSplitType: (String) -> Unit,
    onToggleRestDay: (Boolean) -> Unit,
    onDelete: () -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onAddMealTemplate: (String) -> Unit,
    onRemoveMealTemplate: (Int) -> Unit,
    onAddWorkoutTemplate: (String) -> Unit,
    onRemoveWorkoutTemplate: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (day.isRestDay) ScoreSleep.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surface
        )
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            // ヘッダー
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 並び替えボタン
                    Column {
                        IconButton(onClick = onMoveUp, enabled = canMoveUp, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.KeyboardArrowUp, "上へ",
                                tint = if (canMoveUp) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                        }
                        IconButton(onClick = onMoveDown, enabled = canMoveDown, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.KeyboardArrowDown, "下へ",
                                tint = if (canMoveDown) Primary else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Day ${day.dayNumber}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold,
                        color = if (day.isRestDay) ScoreSleep else Primary)
                    Spacer(modifier = Modifier.width(12.dp))
                    // 休養日チェックボックス
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable { onToggleRestDay(!day.isRestDay) }.padding(4.dp)
                    ) {
                        Checkbox(checked = day.isRestDay, onCheckedChange = { onToggleRestDay(it) },
                            colors = CheckboxDefaults.colors(checkedColor = ScoreSleep))
                        Text("休養日", style = MaterialTheme.typography.bodySmall,
                            color = if (day.isRestDay) ScoreSleep else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (canDelete) {
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, "削除", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }

            // 分類選択（休養日でない場合）
            if (!day.isRestDay) {
                Spacer(modifier = Modifier.height(12.dp))
                SplitTypeSelector(selectedType = day.splitType, onSelect = onUpdateSplitType)
            }

            // テンプレート紐づけセクション
            Spacer(modifier = Modifier.height(12.dp))
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded },
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Link, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("テンプレート紐づけ", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                        if (day.meals.isNotEmpty() || day.workouts.isNotEmpty()) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("(${day.meals.size + day.workouts.size})", style = MaterialTheme.typography.bodySmall, color = Primary)
                        }
                    }
                    Icon(if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (expanded) {
                Spacer(modifier = Modifier.height(12.dp))
                TemplateBindingSection(
                    day = day,
                    mealTemplates = mealTemplates,
                    workoutTemplates = workoutTemplates,
                    onAddMealTemplate = onAddMealTemplate,
                    onRemoveMealTemplate = onRemoveMealTemplate,
                    onAddWorkoutTemplate = onAddWorkoutTemplate,
                    onRemoveWorkoutTemplate = onRemoveWorkoutTemplate
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SplitTypeSelector(selectedType: String, onSelect: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    var showCustomInput by remember { mutableStateOf(false) }
    var customType by remember { mutableStateOf("") }

    val splitTypes = listOf("胸", "背中", "肩", "腕", "脚", "腹筋・体幹", "上半身", "下半身", "全身", "プッシュ", "プル", "胸・三頭", "背中・二頭", "肩・腕")

    Column {
        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
            OutlinedTextField(
                value = selectedType.ifEmpty { "分類を選択" },
                onValueChange = {},
                readOnly = true,
                label = { Text("分類") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor(),
                colors = OutlinedTextFieldDefaults.colors()
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.background(MaterialTheme.colorScheme.surfaceContainer)
            ) {
                splitTypes.forEach { type ->
                    DropdownMenuItem(
                        text = { Text(type, color = MaterialTheme.colorScheme.onSurface) },
                        onClick = { onSelect(type); expanded = false }
                    )
                }
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Add, null, modifier = Modifier.size(18.dp), tint = Primary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("カスタム追加...", color = Primary)
                        }
                    },
                    onClick = { expanded = false; showCustomInput = true }
                )
            }
        }

        if (showCustomInput) {
            AlertDialog(
                onDismissRequest = { showCustomInput = false },
                title = { Text("カスタム分類") },
                text = {
                    OutlinedTextField(
                        value = customType, onValueChange = { customType = it },
                        label = { Text("分類名") }, placeholder = { Text("例: 胸・肩") },
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                },
                confirmButton = {
                    TextButton(
                        onClick = { if (customType.isNotBlank()) { onSelect(customType.trim()); customType = ""; showCustomInput = false } },
                        enabled = customType.isNotBlank()
                    ) { Text("追加") }
                },
                dismissButton = {
                    TextButton(onClick = { customType = ""; showCustomInput = false }) { Text("キャンセル") }
                }
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TemplateBindingSection(
    day: RoutineDay,
    mealTemplates: List<MealTemplate>,
    workoutTemplates: List<WorkoutTemplate>,
    onAddMealTemplate: (String) -> Unit,
    onRemoveMealTemplate: (Int) -> Unit,
    onAddWorkoutTemplate: (String) -> Unit,
    onRemoveWorkoutTemplate: (Int) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth()
            .background(color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f), shape = RoundedCornerShape(8.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 食事テンプレート
        Column {
            Text("食事テンプレート", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = ScoreCarbs)
            Spacer(modifier = Modifier.height(8.dp))
            if (mealTemplates.isEmpty()) {
                Text("テンプレートがありません", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                day.meals.forEachIndexed { index, meal ->
                    Row(
                        modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp)).padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("[${index + 1}] ${meal.templateName}", style = MaterialTheme.typography.bodySmall)
                        IconButton(onClick = { onRemoveMealTemplate(index) }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, "削除", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.error)
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }
                var showMealDropdown by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = showMealDropdown, onExpandedChange = { showMealDropdown = it }) {
                    OutlinedButton(
                        onClick = { showMealDropdown = true },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = ScoreCarbs)
                    ) {
                        Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("追加", style = MaterialTheme.typography.bodySmall)
                    }
                    ExposedDropdownMenu(expanded = showMealDropdown, onDismissRequest = { showMealDropdown = false },
                        modifier = Modifier.background(MaterialTheme.colorScheme.surfaceContainer)) {
                        mealTemplates.forEach { template ->
                            DropdownMenuItem(
                                text = { Text(template.name, color = MaterialTheme.colorScheme.onSurface) },
                                onClick = { onAddMealTemplate(template.id); showMealDropdown = false }
                            )
                        }
                    }
                }
            }
        }

        HorizontalDivider()

        // 運動テンプレート
        Column {
            Text("運動テンプレート", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = AccentOrange)
            Spacer(modifier = Modifier.height(8.dp))
            if (workoutTemplates.isEmpty()) {
                Text("テンプレートがありません", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                day.workouts.forEachIndexed { index, workout ->
                    Row(
                        modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface, RoundedCornerShape(4.dp)).padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("[${index + 1}] ${workout.templateName}", style = MaterialTheme.typography.bodySmall)
                        IconButton(onClick = { onRemoveWorkoutTemplate(index) }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, "削除", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.error)
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }
                var showWorkoutDropdown by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(expanded = showWorkoutDropdown, onExpandedChange = { showWorkoutDropdown = it }) {
                    OutlinedButton(
                        onClick = { showWorkoutDropdown = true },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentOrange)
                    ) {
                        Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("追加", style = MaterialTheme.typography.bodySmall)
                    }
                    ExposedDropdownMenu(expanded = showWorkoutDropdown, onDismissRequest = { showWorkoutDropdown = false },
                        modifier = Modifier.background(MaterialTheme.colorScheme.surfaceContainer)) {
                        workoutTemplates.forEach { template ->
                            DropdownMenuItem(
                                text = { Text(template.name, color = MaterialTheme.colorScheme.onSurface) },
                                onClick = { onAddWorkoutTemplate(template.id); showWorkoutDropdown = false }
                            )
                        }
                    }
                }
            }
        }

        Text("同じテンプレートを複数回追加できます", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
