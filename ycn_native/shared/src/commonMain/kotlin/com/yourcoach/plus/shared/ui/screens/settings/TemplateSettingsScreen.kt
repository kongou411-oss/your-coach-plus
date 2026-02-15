package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import com.yourcoach.plus.shared.ui.screens.main.LocalMainNavigator
import com.yourcoach.plus.shared.ui.screens.meal.AddMealScreen
import com.yourcoach.plus.shared.ui.screens.workout.AddWorkoutScreen
import com.yourcoach.plus.shared.ui.theme.*

class TemplateSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<TemplateSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val mainNavigator = LocalMainNavigator.current
        val snackbarHostState = remember { SnackbarHostState() }

        LaunchedEffect(uiState.actionMessage) {
            uiState.actionMessage?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearActionMessage()
            }
        }

        LaunchedEffect(uiState.error) {
            uiState.error?.let {
                snackbarHostState.showSnackbar(it)
                screenModel.clearError()
            }
        }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                TopAppBar(
                    title = { Text("テンプレート管理") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    }
                )
            }
        ) { paddingValues ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                TabRow(selectedTabIndex = uiState.selectedTabIndex) {
                    Tab(
                        selected = uiState.selectedTabIndex == 0,
                        onClick = { screenModel.selectTab(0) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Restaurant, null, modifier = Modifier.size(18.dp),
                                    tint = if (uiState.selectedTabIndex == 0) ScoreCarbs else MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("食事 (${uiState.mealTemplates.size})")
                            }
                        }
                    )
                    Tab(
                        selected = uiState.selectedTabIndex == 1,
                        onClick = { screenModel.selectTab(1) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.FitnessCenter, null, modifier = Modifier.size(18.dp),
                                    tint = if (uiState.selectedTabIndex == 1) AccentOrange else MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("運動 (${uiState.workoutTemplates.size})")
                            }
                        }
                    )
                }

                if (uiState.isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else {
                    when (uiState.selectedTabIndex) {
                        0 -> MealTemplateList(
                            templates = uiState.mealTemplates,
                            onDelete = { screenModel.deleteMealTemplate(it) },
                            onAdd = { mainNavigator?.push(AddMealScreen()) }
                        )
                        1 -> WorkoutTemplateList(
                            templates = uiState.workoutTemplates,
                            onDelete = { screenModel.deleteWorkoutTemplate(it) },
                            onAdd = { mainNavigator?.push(AddWorkoutScreen()) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MealTemplateList(
    templates: List<MealTemplate>,
    onDelete: (String) -> Unit,
    onAdd: () -> Unit
) {
    var deletingId by remember { mutableStateOf<String?>(null) }

    deletingId?.let { id ->
        val name = templates.find { it.id == id }?.name ?: ""
        AlertDialog(
            onDismissRequest = { deletingId = null },
            title = { Text("削除確認") },
            text = { Text("「$name」を削除しますか？") },
            confirmButton = {
                TextButton(onClick = { onDelete(id); deletingId = null }) {
                    Text("削除", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingId = null }) { Text("キャンセル") }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 作成ボタン
        item {
            Button(
                onClick = onAdd,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = ScoreCarbs)
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("食事テンプレートを作成")
            }
        }

        if (templates.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Restaurant, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("食事テンプレートがありません", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("上の＋ボタンから作成するのがおすすめです", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("食事記録画面の「テンプレート保存」からも作成できます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        } else {
            items(templates, key = { it.id }) { template ->
                MealTemplateCard(template = template, onDelete = { deletingId = template.id })
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
private fun MealTemplateCard(template: MealTemplate, onDelete: () -> Unit) {
    var isExpanded by remember { mutableStateOf(false) }

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(template.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${template.items.size}品目", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, "削除", tint = MaterialTheme.colorScheme.error)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 栄養素サマリー
            Row(
                modifier = Modifier.fillMaxWidth()
                    .background(color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), shape = RoundedCornerShape(8.dp))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                NutrientChip("Cal", "${template.totalCalories}", ScoreCalories)
                NutrientChip("P", "${template.totalProtein.toInt()}g", ScoreProtein)
                NutrientChip("F", "${template.totalFat.toInt()}g", ScoreFat)
                NutrientChip("C", "${template.totalCarbs.toInt()}g", ScoreCarbs)
            }

            // 展開ボタン
            if (template.items.isNotEmpty()) {
                TextButton(onClick = { isExpanded = !isExpanded }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text(if (isExpanded) "内容を閉じる" else "内容を表示", style = MaterialTheme.typography.labelMedium)
                    Icon(if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, modifier = Modifier.size(18.dp))
                }

                if (isExpanded) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(
                        modifier = Modifier.fillMaxWidth()
                            .background(color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(8.dp))
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        template.items.forEachIndexed { index, item ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(item.name, style = MaterialTheme.typography.bodyMedium)
                                    Text("${item.amount.toInt()}g", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("P${item.protein.toInt()}", style = MaterialTheme.typography.labelSmall, color = ScoreProtein)
                                    Text("F${item.fat.toInt()}", style = MaterialTheme.typography.labelSmall, color = ScoreFat)
                                    Text("C${item.carbs.toInt()}", style = MaterialTheme.typography.labelSmall, color = ScoreCarbs)
                                }
                            }
                            if (index < template.items.size - 1) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun WorkoutTemplateList(
    templates: List<WorkoutTemplate>,
    onDelete: (String) -> Unit,
    onAdd: () -> Unit
) {
    var deletingId by remember { mutableStateOf<String?>(null) }

    deletingId?.let { id ->
        val name = templates.find { it.id == id }?.name ?: ""
        AlertDialog(
            onDismissRequest = { deletingId = null },
            title = { Text("削除確認") },
            text = { Text("「$name」を削除しますか？") },
            confirmButton = {
                TextButton(onClick = { onDelete(id); deletingId = null }) {
                    Text("削除", color = Color.Red)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingId = null }) { Text("キャンセル") }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 作成ボタン
        item {
            Button(
                onClick = onAdd,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = AccentOrange)
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("運動テンプレートを作成")
            }
        }

        if (templates.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.FitnessCenter, null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("運動テンプレートがありません", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("上の＋ボタンから作成するのがおすすめです", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("運動記録画面の「テンプレート保存」からも作成できます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        } else {
            items(templates, key = { it.id }) { template ->
                WorkoutTemplateCard(template = template, onDelete = { deletingId = template.id })
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
private fun WorkoutTemplateCard(template: WorkoutTemplate, onDelete: () -> Unit) {
    var isExpanded by remember { mutableStateOf(false) }

    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(template.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${template.exercises.size}種目", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, "削除", tint = MaterialTheme.colorScheme.error)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // サマリー
            Row(
                modifier = Modifier.fillMaxWidth()
                    .background(color = AccentOrange.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${template.estimatedDuration}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = AccentOrange)
                    Text("分", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${template.estimatedCalories}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = AccentOrange)
                    Text("kcal", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // 展開ボタン
            if (template.exercises.isNotEmpty()) {
                TextButton(onClick = { isExpanded = !isExpanded }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text(if (isExpanded) "内容を閉じる" else "内容を表示", style = MaterialTheme.typography.labelMedium)
                    Icon(if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, modifier = Modifier.size(18.dp))
                }

                if (isExpanded) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(
                        modifier = Modifier.fillMaxWidth()
                            .background(color = MaterialTheme.colorScheme.surface, shape = RoundedCornerShape(8.dp))
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        template.exercises.forEachIndexed { index, exercise ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(exercise.name, style = MaterialTheme.typography.bodyMedium)
                                    val detail = when {
                                        exercise.sets != null && exercise.sets > 0 -> "${exercise.sets}セット"
                                        exercise.duration != null && exercise.duration > 0 -> "${exercise.duration}分"
                                        else -> ""
                                    }
                                    if (detail.isNotEmpty()) {
                                        Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                Text("${exercise.caloriesBurned}kcal", style = MaterialTheme.typography.labelMedium, color = AccentOrange)
                            }
                            if (index < template.exercises.size - 1) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NutrientChip(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = color)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
