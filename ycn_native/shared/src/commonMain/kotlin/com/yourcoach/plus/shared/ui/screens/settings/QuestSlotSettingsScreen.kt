package com.yourcoach.plus.shared.ui.screens.settings

import kotlin.math.roundToInt
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.koin.koinScreenModel
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.model.RoutineTemplateMapping
import com.yourcoach.plus.shared.ui.theme.*

/**
 * スロットの色タイプ
 */
private enum class SlotColorType {
    NORMAL,
    PRE_TRAINING,
    POST_TRAINING
}

class QuestSlotSettingsScreen : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val screenModel = koinScreenModel<QuestSlotSettingsScreenModel>()
        val uiState by screenModel.uiState.collectAsState()
        val navigator = LocalNavigator.currentOrThrow
        val snackbarHostState = remember { SnackbarHostState() }
        var showCopyDialog by remember { mutableStateOf(false) }

        LaunchedEffect(uiState.saveSuccess) {
            if (uiState.saveSuccess) {
                snackbarHostState.showSnackbar("設定を保存しました")
                navigator.pop()
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
                    title = { Text("クエストスロット設定") },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
                        }
                    },
                    actions = {
                        TextButton(
                            onClick = { screenModel.save() },
                            enabled = !uiState.isSaving
                        ) {
                            if (uiState.isSaving) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            } else {
                                Text("保存", color = Primary)
                            }
                        }
                    }
                )
            }
        ) { paddingValues ->
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize().padding(paddingValues),
                    contentAlignment = Alignment.Center
                ) {
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
                    // 自動生成トグル
                    item {
                        AutoGenToggleCard(
                            enabled = uiState.questAutoGenEnabled,
                            onToggle = { screenModel.toggleAutoGen(it) }
                        )
                    }

                    // ルーティン日チップス
                    if (uiState.routineDays.isNotEmpty()) {
                        item {
                            RoutineDayChips(
                                days = uiState.routineDays,
                                selectedIndex = uiState.selectedRoutineIndex,
                                onSelect = { screenModel.selectRoutineDay(it) }
                            )
                        }

                        // 選択中のルーティン日情報
                        item {
                            val selectedDay = uiState.routineDays.getOrNull(uiState.selectedRoutineIndex)
                            if (selectedDay != null) {
                                Text(
                                    text = "Day ${selectedDay.dayNumber} - ${selectedDay.splitType.ifBlank { selectedDay.name }}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                            }
                        }

                        // スロット一覧（タイムライン付き）
                        item {
                            val selectedDay = uiState.routineDays.getOrNull(uiState.selectedRoutineIndex)
                            if (selectedDay != null) {
                                SlotConfigSection(
                                    routineId = selectedDay.splitType,
                                    isRestDay = selectedDay.isRestDay,
                                    mealsPerDay = uiState.mealsPerDay,
                                    config = uiState.routineTemplateConfig,
                                    calculatedSlotTimes = uiState.calculatedSlotTimes,
                                    customTimeSlots = uiState.customTimeSlots,
                                    trainingAfterMeal = uiState.trainingAfterMeal,
                                    trainingTime = uiState.trainingTime,
                                    wakeUpTime = uiState.wakeUpTime,
                                    onOpenPicker = { screenModel.openTemplatePicker(it) },
                                    onRemove = { screenModel.removeTemplate(it) },
                                    onTimeClick = { screenModel.openTimePickerForSlot(it) },
                                    onClearCustomTime = { screenModel.clearCustomTime(it) }
                                )
                            }
                        }

                        // 他の日にコピーボタン
                        if (uiState.routineDays.size > 1) {
                            item {
                                OutlinedButton(
                                    onClick = { showCopyDialog = true },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(Icons.Default.ContentCopy, null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("この設定を他の日にコピー")
                                }
                            }
                        }
                    } else {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        "ルーティンが設定されていません",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        "設定 > 機能 > ルーティン設定 からトレーニング分割を設定してください",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    item { Spacer(modifier = Modifier.height(60.dp)) }
                }
            }
        }

        // テンプレートピッカー BottomSheet
        if (uiState.showTemplatePicker) {
            TemplatePickerSheet(
                targetSlot = uiState.pickerTargetSlot,
                templates = uiState.availableTemplates,
                isLoading = uiState.isLoadingTemplates,
                onSelect = { screenModel.assignTemplate(uiState.pickerTargetSlot, it) },
                onDismiss = { screenModel.closeTemplatePicker() }
            )
        }

        // スロット複製ダイアログ
        if (showCopyDialog) {
            CopySlotDialog(
                days = uiState.routineDays,
                currentIndex = uiState.selectedRoutineIndex,
                onCopy = { targetIndex ->
                    screenModel.copyToRoutineDay(targetIndex)
                    showCopyDialog = false
                },
                onDismiss = { showCopyDialog = false }
            )
        }

        // 時刻ピッカーダイアログ
        uiState.showTimePickerForSlot?.let { slotNumber ->
            val currentTime = uiState.calculatedSlotTimes[slotNumber] ?: "12:00"
            SlotTimePickerDialog(
                slotNumber = slotNumber,
                currentTime = currentTime,
                isCustom = slotNumber in uiState.customTimeSlots,
                onConfirm = { time -> screenModel.updateSlotAbsoluteTime(slotNumber, time) },
                onClearCustom = { screenModel.clearCustomTime(slotNumber) },
                onDismiss = { screenModel.closeTimePicker() }
            )
        }
    }
}

@Composable
private fun AutoGenToggleCard(
    enabled: Boolean,
    onToggle: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (enabled) Primary.copy(alpha = 0.1f) else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "自動クエスト生成",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "起動時にクエスト未生成なら自動生成（1クレジット消費）",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Switch(
                checked = enabled,
                onCheckedChange = onToggle,
                colors = SwitchDefaults.colors(checkedTrackColor = Primary)
            )
        }
    }
}

@Composable
private fun RoutineDayChips(
    days: List<com.yourcoach.plus.shared.domain.model.RoutineDay>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit
) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        days.forEachIndexed { index, day ->
            FilterChip(
                selected = selectedIndex == index,
                onClick = { onSelect(index) },
                label = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Day${day.dayNumber}", style = MaterialTheme.typography.labelSmall)
                        Text(
                            day.splitType.ifBlank { if (day.isRestDay) "休み" else "?" },
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            )
        }
    }
}

@Composable
private fun SlotConfigSection(
    routineId: String,
    isRestDay: Boolean,
    mealsPerDay: Int,
    config: com.yourcoach.plus.shared.domain.model.RoutineTemplateConfig,
    calculatedSlotTimes: Map<Int, String>,
    customTimeSlots: Set<Int>,
    trainingAfterMeal: Int?,
    trainingTime: String?,
    wakeUpTime: String,
    onOpenPicker: (Int) -> Unit,
    onRemove: (Int) -> Unit,
    onTimeClick: (Int) -> Unit,
    onClearCustomTime: (Int) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            // 起床時刻ヘッダー
            TimelineHeaderRow(label = "起床", time = wakeUpTime, icon = "wake")

            Spacer(modifier = Modifier.height(4.dp))

            // 運動スロット（休みの日は表示しない）
            if (!isRestDay) {
                val workoutMapping = config.getWorkoutMappingForRoutine(routineId)
                SlotRow(
                    icon = Icons.Default.FitnessCenter,
                    label = "運動",
                    templateName = workoutMapping?.templateName,
                    timeText = trainingTime,
                    isCustomTime = false,
                    slotColorType = SlotColorType.NORMAL,
                    onAssign = { onOpenPicker(RoutineTemplateMapping.WORKOUT_SLOT) },
                    onRemove = { onRemove(RoutineTemplateMapping.WORKOUT_SLOT) },
                    onTimeClick = null // 運動スロットは時刻変更不可（プロフィールで設定）
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp))
            }

            // 食事スロット（トレーニング区切り付き）
            val hasTraining = !isRestDay && trainingAfterMeal != null
            for (slotNum in 1..mealsPerDay) {
                // トレ前スロットの後にトレーニング区切りを表示
                if (hasTraining && slotNum == trainingAfterMeal!! + 1) {
                    TrainingIndicatorRow(trainingTime = trainingTime)
                }

                val mealMapping = config.getMappingsForRoutine(routineId)
                    .find { it.slotNumber == slotNum }

                val colorType = when {
                    hasTraining && slotNum == trainingAfterMeal -> SlotColorType.PRE_TRAINING
                    hasTraining && slotNum == trainingAfterMeal!! + 1 -> SlotColorType.POST_TRAINING
                    else -> SlotColorType.NORMAL
                }

                SlotRow(
                    icon = Icons.Default.Restaurant,
                    label = "食事$slotNum",
                    templateName = mealMapping?.templateName,
                    timeText = calculatedSlotTimes[slotNum],
                    isCustomTime = slotNum in customTimeSlots,
                    slotColorType = colorType,
                    onAssign = { onOpenPicker(slotNum) },
                    onRemove = { onRemove(slotNum) },
                    onTimeClick = { onTimeClick(slotNum) }
                )
                if (slotNum < mealsPerDay) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp))
                }
            }
        }
    }
}

@Composable
private fun TimelineHeaderRow(label: String, time: String, icon: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = if (icon == "wake") "\u2600" else "\uD83C\uDF19", // sun / moon
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "$label $time",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
private fun TrainingIndicatorRow(trainingTime: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        HorizontalDivider(modifier = Modifier.weight(1f), color = AccentOrange.copy(alpha = 0.5f))
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "\uD83C\uDFCB\uFE0F トレーニング${trainingTime?.let { " $it" } ?: ""}",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = AccentOrange
        )
        Spacer(modifier = Modifier.width(8.dp))
        HorizontalDivider(modifier = Modifier.weight(1f), color = AccentOrange.copy(alpha = 0.5f))
    }
}

@Composable
private fun SlotRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    templateName: String?,
    timeText: String?,
    isCustomTime: Boolean,
    slotColorType: SlotColorType,
    onAssign: () -> Unit,
    onRemove: () -> Unit,
    onTimeClick: (() -> Unit)?
) {
    val slotColor = when (slotColorType) {
        SlotColorType.PRE_TRAINING -> AccentOrange
        SlotColorType.POST_TRAINING -> AccentGreen
        SlotColorType.NORMAL -> Primary
    }

    val bgColor = when (slotColorType) {
        SlotColorType.PRE_TRAINING -> AccentOrange.copy(alpha = 0.06f)
        SlotColorType.POST_TRAINING -> AccentGreen.copy(alpha = 0.06f)
        SlotColorType.NORMAL -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0f)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(bgColor)
            .padding(vertical = 6.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // 時刻バッジ
        if (timeText != null) {
            Surface(
                modifier = Modifier
                    .let { m -> if (onTimeClick != null) m.clickable { onTimeClick() } else m },
                shape = RoundedCornerShape(6.dp),
                color = if (isCustomTime) slotColor.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
            ) {
                Text(
                    text = timeText,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = if (isCustomTime) FontWeight.Bold else FontWeight.Normal,
                    color = if (isCustomTime) slotColor else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
            Spacer(modifier = Modifier.width(6.dp))
        }

        Icon(
            icon,
            contentDescription = null,
            tint = slotColor,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))

        // ラベル（トレ前/後の場合は注釈付き）
        Column(modifier = Modifier.width(56.dp)) {
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium
            )
            if (slotColorType == SlotColorType.PRE_TRAINING) {
                Text(
                    "トレ前",
                    style = MaterialTheme.typography.labelSmall,
                    color = AccentOrange
                )
            } else if (slotColorType == SlotColorType.POST_TRAINING) {
                Text(
                    "トレ後",
                    style = MaterialTheme.typography.labelSmall,
                    color = AccentGreen
                )
            }
        }

        Icon(
            Icons.AutoMirrored.Filled.ArrowForward,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.width(6.dp))

        if (templateName != null) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = slotColor.copy(alpha = 0.15f),
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    templateName,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = slotColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
            IconButton(
                onClick = onRemove,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "削除",
                    modifier = Modifier.size(18.dp),
                    tint = MaterialTheme.colorScheme.error
                )
            }
        } else {
            Text(
                "自動生成",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .weight(1f)
                    .clickable { onAssign() }
            )
        }
    }
}

/**
 * 時刻選択ダイアログ
 */
@Composable
private fun SlotTimePickerDialog(
    slotNumber: Int,
    currentTime: String,
    isCustom: Boolean,
    onConfirm: (String) -> Unit,
    onClearCustom: () -> Unit,
    onDismiss: () -> Unit
) {
    val parts = currentTime.split(":")
    var selectedHour by remember { mutableStateOf(parts.getOrNull(0)?.toIntOrNull() ?: 12) }
    var selectedMinute by remember { mutableStateOf(parts.getOrNull(1)?.toIntOrNull() ?: 0) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("食事${slotNumber}の時刻") },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // 時:分 セレクター
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // 時
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        IconButton(onClick = { selectedHour = (selectedHour + 1) % 24 }) {
                            Icon(Icons.Default.KeyboardArrowUp, "増やす")
                        }
                        Text(
                            text = selectedHour.toString().padStart(2, '0'),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { selectedHour = (selectedHour - 1 + 24) % 24 }) {
                            Icon(Icons.Default.KeyboardArrowDown, "減らす")
                        }
                    }

                    Text(
                        ":",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )

                    // 分（15分刻み）
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        IconButton(onClick = { selectedMinute = (selectedMinute + 15) % 60 }) {
                            Icon(Icons.Default.KeyboardArrowUp, "増やす")
                        }
                        Text(
                            text = selectedMinute.toString().padStart(2, '0'),
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.Bold
                        )
                        IconButton(onClick = { selectedMinute = (selectedMinute - 15 + 60) % 60 }) {
                            Icon(Icons.Default.KeyboardArrowDown, "減らす")
                        }
                    }
                }

                // デフォルトに戻すボタン（カスタム時刻の場合のみ）
                if (isCustom) {
                    Spacer(modifier = Modifier.height(12.dp))
                    TextButton(onClick = {
                        onClearCustom()
                        onDismiss()
                    }) {
                        Text("デフォルトに戻す", color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val timeStr = "${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}"
                onConfirm(timeStr)
            }) {
                Text("設定", color = Primary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("キャンセル")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TemplatePickerSheet(
    targetSlot: Int,
    templates: List<TemplateSummary>,
    isLoading: Boolean,
    onSelect: (TemplateSummary) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()
    val isWorkoutSlot = targetSlot == RoutineTemplateMapping.WORKOUT_SLOT
    val targetType = if (isWorkoutSlot) "WORKOUT" else "MEAL"
    val filteredTemplates = templates.filter { it.type == targetType }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                if (isWorkoutSlot) "運動テンプレートを選択" else "食事テンプレートを選択（食事$targetSlot）",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))

            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxWidth().height(100.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (filteredTemplates.isEmpty()) {
                Text(
                    if (isWorkoutSlot) "運動テンプレートがありません" else "食事テンプレートがありません",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.heightIn(max = 400.dp)
                ) {
                    items(filteredTemplates) { template ->
                        TemplatePickerItem(
                            template = template,
                            onClick = { onSelect(template) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun CopySlotDialog(
    days: List<com.yourcoach.plus.shared.domain.model.RoutineDay>,
    currentIndex: Int,
    onCopy: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("スロット設定をコピー") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "コピー先のルーティン日を選択してください",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                days.forEachIndexed { index, day ->
                    if (index != currentIndex) {
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCopy(index) },
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surface
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "Day ${day.dayNumber}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    day.splitType.ifBlank { if (day.isRestDay) "休み" else day.name },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.weight(1f))
                                Icon(
                                    Icons.Default.ContentCopy,
                                    contentDescription = "コピー",
                                    tint = Primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("キャンセル") } }
    )
}

@Composable
private fun TemplatePickerItem(
    template: TemplateSummary,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                if (template.type == "WORKOUT") Icons.Default.FitnessCenter else Icons.Default.Restaurant,
                contentDescription = null,
                tint = Primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    template.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold
                )
                if (template.totalMacros != null) {
                    Text(
                        "P${template.totalMacros.protein.roundToInt()}g F${template.totalMacros.fat.roundToInt()}g C${template.totalMacros.carbs.roundToInt()}g",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(
                    "${template.itemCount}品目",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Default.Add,
                contentDescription = "選択",
                tint = Primary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
