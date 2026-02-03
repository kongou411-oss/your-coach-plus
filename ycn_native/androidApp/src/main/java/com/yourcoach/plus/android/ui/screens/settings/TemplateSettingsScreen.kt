package com.yourcoach.plus.android.ui.screens.settings

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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.yourcoach.plus.android.data.repository.FirestoreMealRepository
import com.yourcoach.plus.android.data.repository.FirestoreWorkoutRepository
import com.yourcoach.plus.android.ui.theme.*
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel

/**
 * テンプレート設定画面のUI状態
 */
data class TemplateSettingsUiState(
    val isLoading: Boolean = true,
    val mealTemplates: List<MealTemplate> = emptyList(),
    val workoutTemplates: List<WorkoutTemplate> = emptyList(),
    val activeTab: TemplateTab = TemplateTab.MEAL,
    val error: String? = null,
    val successMessage: String? = null
)

enum class TemplateTab {
    MEAL, WORKOUT
}

/**
 * テンプレート設定画面のViewModel
 */
class TemplateSettingsViewModel(
    private val mealRepository: FirestoreMealRepository = FirestoreMealRepository(),
    private val workoutRepository: FirestoreWorkoutRepository = FirestoreWorkoutRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(TemplateSettingsUiState())
    val uiState: StateFlow<TemplateSettingsUiState> = _uiState.asStateFlow()

    private val currentUserId: String?
        get() = FirebaseAuth.getInstance().currentUser?.uid

    init {
        loadTemplates()
    }

    fun loadTemplates() {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // 食事テンプレート取得
            mealRepository.getMealTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(mealTemplates = templates) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "食事テンプレートの取得に失敗しました") }
                }

            // 運動テンプレート取得
            workoutRepository.getWorkoutTemplates(userId)
                .onSuccess { templates ->
                    _uiState.update { it.copy(workoutTemplates = templates) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "運動テンプレートの取得に失敗しました") }
                }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun deleteMealTemplate(templateId: String) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            mealRepository.deleteMealTemplate(userId, templateId)
                .onSuccess {
                    _uiState.update { it.copy(successMessage = "テンプレートを削除しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "削除に失敗しました") }
                }
        }
    }

    fun deleteWorkoutTemplate(templateId: String) {
        val userId = currentUserId ?: return

        viewModelScope.launch {
            workoutRepository.deleteWorkoutTemplate(userId, templateId)
                .onSuccess {
                    _uiState.update { it.copy(successMessage = "テンプレートを削除しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "削除に失敗しました") }
                }
        }
    }

    fun switchTab(tab: TemplateTab) {
        _uiState.update { it.copy(activeTab = tab) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }
}

/**
 * テンプレート設定画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TemplateSettingsScreen(
    viewModel: TemplateSettingsViewModel = koinViewModel(),
    onNavigateBack: () -> Unit = {},
    onNavigateToAddMeal: () -> Unit = {},
    onNavigateToEditMeal: (String) -> Unit = {},
    onNavigateToAddWorkout: () -> Unit = {},
    onNavigateToEditWorkout: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showDeleteDialog by remember { mutableStateOf<Pair<String, String>?>(null) } // (id, type)

    // エラー・成功メッセージ表示
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let { message ->
            snackbarHostState.showSnackbar(message)
            viewModel.clearSuccessMessage()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("テンプレート管理") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // タブ
            TabRow(
                selectedTabIndex = if (uiState.activeTab == TemplateTab.MEAL) 0 else 1
            ) {
                Tab(
                    selected = uiState.activeTab == TemplateTab.MEAL,
                    onClick = { viewModel.switchTab(TemplateTab.MEAL) },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Restaurant,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = if (uiState.activeTab == TemplateTab.MEAL) ScoreCarbs else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("食事 (${uiState.mealTemplates.size})")
                        }
                    }
                )
                Tab(
                    selected = uiState.activeTab == TemplateTab.WORKOUT,
                    onClick = { viewModel.switchTab(TemplateTab.WORKOUT) },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.FitnessCenter,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = if (uiState.activeTab == TemplateTab.WORKOUT) AccentOrange else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("運動 (${uiState.workoutTemplates.size})")
                        }
                    }
                )
            }

            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                when (uiState.activeTab) {
                    TemplateTab.MEAL -> {
                        MealTemplateList(
                            templates = uiState.mealTemplates,
                            onEdit = onNavigateToEditMeal,
                            onDelete = { id -> showDeleteDialog = id to "meal" },
                            onAdd = onNavigateToAddMeal
                        )
                    }
                    TemplateTab.WORKOUT -> {
                        WorkoutTemplateList(
                            templates = uiState.workoutTemplates,
                            onEdit = onNavigateToEditWorkout,
                            onDelete = { id -> showDeleteDialog = id to "workout" },
                            onAdd = onNavigateToAddWorkout
                        )
                    }
                }
            }
        }
    }

    // 削除確認ダイアログ
    showDeleteDialog?.let { (id, type) ->
        AlertDialog(
            onDismissRequest = { showDeleteDialog = null },
            title = { Text("テンプレート削除") },
            text = { Text("このテンプレートを削除しますか？") },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (type == "meal") {
                            viewModel.deleteMealTemplate(id)
                        } else {
                            viewModel.deleteWorkoutTemplate(id)
                        }
                        showDeleteDialog = null
                    }
                ) {
                    Text("削除", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = null }) {
                    Text("キャンセル")
                }
            }
        )
    }
}

@Composable
private fun MealTemplateList(
    templates: List<MealTemplate>,
    onEdit: (String) -> Unit,
    onDelete: (String) -> Unit,
    onAdd: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
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
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Restaurant,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "食事テンプレートがありません",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "食事記録画面から「テンプレート保存」で作成できます",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(templates, key = { it.id }) { template ->
                MealTemplateCard(
                    template = template,
                    onEdit = { onEdit(template.id) },
                    onDelete = { onDelete(template.id) }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
private fun MealTemplateCard(
    template: MealTemplate,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var isExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = template.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${template.items.size}品目",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row {
                    // 編集ボタン
                    IconButton(onClick = onEdit) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "編集",
                            tint = Primary
                        )
                    }
                    // 削除ボタン
                    IconButton(onClick = onDelete) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "削除",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 栄養素サマリー (PFC順 - ダッシュボード色に統一)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                NutrientChip(label = "Cal", value = "${template.totalCalories}", color = ScoreCalories)
                NutrientChip(label = "P", value = "${template.totalProtein.toInt()}g", color = ScoreProtein)
                NutrientChip(label = "F", value = "${template.totalFat.toInt()}g", color = ScoreFat)
                NutrientChip(label = "C", value = "${template.totalCarbs.toInt()}g", color = ScoreCarbs)
            }

            // 展開ボタン
            TextButton(
                onClick = { isExpanded = !isExpanded },
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) {
                Text(
                    text = if (isExpanded) "内容を閉じる" else "内容を表示",
                    style = MaterialTheme.typography.labelMedium
                )
                Icon(
                    if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            }

            // 内容一覧（展開時）
            if (isExpanded && template.items.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.surface,
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    template.items.forEach { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.name,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = "${item.amount.toInt()}g",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            // アイテムのPFC表示
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "P${item.protein.toInt()}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ScoreProtein
                                )
                                Text(
                                    text = "F${item.fat.toInt()}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ScoreFat
                                )
                                Text(
                                    text = "C${item.carbs.toInt()}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = ScoreCarbs
                                )
                            }
                        }
                        if (item != template.items.last()) {
                            HorizontalDivider(
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                            )
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
    onEdit: (String) -> Unit,
    onDelete: (String) -> Unit,
    onAdd: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
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
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.FitnessCenter,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "運動テンプレートがありません",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "運動記録画面から「テンプレート保存」で作成できます",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(templates, key = { it.id }) { template ->
                WorkoutTemplateCard(
                    template = template,
                    onEdit = { onEdit(template.id) },
                    onDelete = { onDelete(template.id) }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(60.dp)) }
    }
}

@Composable
private fun WorkoutTemplateCard(
    template: WorkoutTemplate,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var isExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = template.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${template.exercises.size}種目",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row {
                    // 編集ボタン
                    IconButton(onClick = onEdit) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "編集",
                            tint = Primary
                        )
                    }
                    // 削除ボタン
                    IconButton(onClick = onDelete) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "削除",
                            tint = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // サマリー
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = AccentOrange.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "${template.estimatedDuration}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = AccentOrange
                    )
                    Text(
                        text = "分",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "${template.estimatedCalories}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = AccentOrange
                    )
                    Text(
                        text = "kcal",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // 展開ボタン
            TextButton(
                onClick = { isExpanded = !isExpanded },
                modifier = Modifier.align(Alignment.CenterHorizontally)
            ) {
                Text(
                    text = if (isExpanded) "内容を閉じる" else "内容を表示",
                    style = MaterialTheme.typography.labelMedium
                )
                Icon(
                    if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
            }

            // 内容一覧（展開時）
            if (isExpanded && template.exercises.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.surface,
                            shape = RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    template.exercises.forEach { exercise ->
                        val sets = exercise.sets
                        val duration = exercise.duration
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = exercise.name,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = when {
                                        sets != null && sets > 0 -> "${sets}セット"
                                        duration != null && duration > 0 -> "${duration}分"
                                        else -> ""
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(
                                text = "${exercise.caloriesBurned}kcal",
                                style = MaterialTheme.typography.labelMedium,
                                color = AccentOrange
                            )
                        }
                        if (exercise != template.exercises.last()) {
                            HorizontalDivider(
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NutrientChip(
    label: String,
    value: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleSmall,
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
