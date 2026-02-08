package com.yourcoach.plus.shared.ui.screens.settings

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
import com.yourcoach.plus.shared.ui.theme.*

class TemplateSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<TemplateSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
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
                        text = { Text("食事テンプレート") },
                        icon = { Icon(Icons.Default.Restaurant, contentDescription = null, modifier = Modifier.size(20.dp)) }
                    )
                    Tab(
                        selected = uiState.selectedTabIndex == 1,
                        onClick = { screenModel.selectTab(1) },
                        text = { Text("運動テンプレート") },
                        icon = { Icon(Icons.Default.FitnessCenter, contentDescription = null, modifier = Modifier.size(20.dp)) }
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
                            onDelete = { screenModel.deleteMealTemplate(it) }
                        )
                        1 -> WorkoutTemplateList(
                            templates = uiState.workoutTemplates,
                            onDelete = { screenModel.deleteWorkoutTemplate(it) }
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
    onDelete: (String) -> Unit
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

    if (templates.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Restaurant, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(8.dp))
                Text("食事テンプレートがありません", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("食事記録時にテンプレートを保存できます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(templates) { template ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(template.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("${template.totalCalories}kcal", style = MaterialTheme.typography.bodySmall, color = ScoreCalories)
                                Text("P${template.totalProtein.toInt()}g", style = MaterialTheme.typography.bodySmall, color = ScoreProtein)
                                Text("F${template.totalFat.toInt()}g", style = MaterialTheme.typography.bodySmall, color = ScoreFat)
                                Text("C${template.totalCarbs.toInt()}g", style = MaterialTheme.typography.bodySmall, color = ScoreCarbs)
                            }
                            if (template.usageCount > 0) {
                                Text("${template.usageCount}回使用", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        IconButton(onClick = { deletingId = template.id }) {
                            Icon(Icons.Default.Delete, "削除", tint = Color.Red)
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(60.dp)) }
        }
    }
}

@Composable
private fun WorkoutTemplateList(
    templates: List<WorkoutTemplate>,
    onDelete: (String) -> Unit
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

    if (templates.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.FitnessCenter, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(8.dp))
                Text("運動テンプレートがありません", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("運動記録時にテンプレートを保存できます", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(templates) { template ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(template.name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("${template.estimatedDuration}分", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("${template.estimatedCalories}kcal消費", style = MaterialTheme.typography.bodySmall, color = AccentOrange)
                                Text("${template.exercises.size}種目", style = MaterialTheme.typography.bodySmall, color = Primary)
                            }
                            if (template.usageCount > 0) {
                                Text("${template.usageCount}回使用", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        IconButton(onClick = { deletingId = template.id }) {
                            Icon(Icons.Default.Delete, "削除", tint = Color.Red)
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(60.dp)) }
        }
    }
}
