package com.yourcoach.plus.android.ui.screens.routine

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourcoach.plus.shared.domain.model.RoutineDay
import com.yourcoach.plus.shared.domain.model.RoutinePattern
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ルーティン管理ViewModel
 */
class RoutineViewModel(
    private val routineRepository: RoutineRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RoutineUiState())
    val uiState: StateFlow<RoutineUiState> = _uiState.asStateFlow()

    // ユーザーIDは認証から取得（仮実装）
    private var currentUserId: String = ""

    fun setUserId(userId: String) {
        currentUserId = userId
        loadPatterns()
        observeTodayRoutine()
    }

    /**
     * パターン一覧を読み込み
     */
    private fun loadPatterns() {
        if (currentUserId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // ユーザーのパターンを取得
            val userPatternsResult = routineRepository.getPatterns(currentUserId)
            val userPatterns = userPatternsResult.getOrDefault(emptyList())

            // プリセットを取得
            val presetsResult = routineRepository.getPresetPatterns()
            val presets = presetsResult.getOrDefault(emptyList())

            _uiState.update {
                it.copy(
                    isLoading = false,
                    patterns = userPatterns,
                    presets = presets,
                    activePattern = userPatterns.find { p -> p.isActive }
                )
            }
        }
    }

    /**
     * 今日のルーティンをリアルタイム監視
     */
    private fun observeTodayRoutine() {
        if (currentUserId.isEmpty()) return

        viewModelScope.launch {
            routineRepository.observeTodayRoutine(currentUserId).collect { routineDay ->
                _uiState.update {
                    it.copy(todayRoutine = routineDay)
                }
            }
        }
    }

    /**
     * パターンをアクティブに設定
     */
    fun setActivePattern(patternId: String) {
        if (currentUserId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            routineRepository.setActivePattern(currentUserId, patternId)
                .onSuccess {
                    loadPatterns()
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "パターンの設定に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * プリセットをコピーして使用
     */
    fun usePreset(presetId: String, customName: String? = null) {
        if (currentUserId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            routineRepository.copyPresetToUser(currentUserId, presetId, customName)
                .onSuccess {
                    loadPatterns()
                    _uiState.update {
                        it.copy(
                            successMessage = "プリセットを適用しました"
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "プリセットの適用に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * パターンを保存
     */
    fun savePattern(pattern: RoutinePattern) {
        if (currentUserId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            routineRepository.savePattern(currentUserId, pattern)
                .onSuccess {
                    loadPatterns()
                    _uiState.update {
                        it.copy(successMessage = "パターンを保存しました")
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "パターンの保存に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * パターンを削除
     */
    fun deletePattern(patternId: String) {
        if (currentUserId.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            routineRepository.deletePattern(currentUserId, patternId)
                .onSuccess {
                    loadPatterns()
                    _uiState.update {
                        it.copy(successMessage = "パターンを削除しました")
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "パターンの削除に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * 今日のルーティンをワンタップ実行
     */
    fun executeToday() {
        if (currentUserId.isEmpty()) return
        val todayRoutine = _uiState.value.todayRoutine ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecuting = true) }

            val today = DateUtil.todayString()
            routineRepository.executeRoutine(currentUserId, today, todayRoutine)
                .onSuccess { count ->
                    _uiState.update {
                        it.copy(
                            isExecuting = false,
                            successMessage = "${count}件の記録を完了しました"
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isExecuting = false,
                            error = error.message ?: "ルーティンの実行に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * 今日の食事のみ実行
     */
    fun executeTodayMeals() {
        if (currentUserId.isEmpty()) return
        val todayRoutine = _uiState.value.todayRoutine ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecuting = true) }

            val today = DateUtil.todayString()
            routineRepository.executeRoutineMeals(currentUserId, today, todayRoutine)
                .onSuccess { count ->
                    _uiState.update {
                        it.copy(
                            isExecuting = false,
                            successMessage = "${count}件の食事を記録しました"
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isExecuting = false,
                            error = error.message ?: "食事の記録に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * 今日の運動のみ実行
     */
    fun executeTodayWorkouts() {
        if (currentUserId.isEmpty()) return
        val todayRoutine = _uiState.value.todayRoutine ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isExecuting = true) }

            val today = DateUtil.todayString()
            routineRepository.executeRoutineWorkouts(currentUserId, today, todayRoutine)
                .onSuccess { count ->
                    _uiState.update {
                        it.copy(
                            isExecuting = false,
                            successMessage = "${count}件の運動を記録しました"
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isExecuting = false,
                            error = error.message ?: "運動の記録に失敗しました"
                        )
                    }
                }
        }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 成功メッセージをクリア
     */
    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    /**
     * プリセット選択ダイアログを表示
     */
    fun showPresetDialog() {
        _uiState.update { it.copy(showPresetDialog = true) }
    }

    /**
     * プリセット選択ダイアログを非表示
     */
    fun hidePresetDialog() {
        _uiState.update { it.copy(showPresetDialog = false) }
    }

    /**
     * パターン編集ダイアログを表示
     */
    fun showPatternEditor(pattern: RoutinePattern? = null) {
        _uiState.update {
            it.copy(
                showPatternEditor = true,
                editingPattern = pattern
            )
        }
    }

    /**
     * パターン編集ダイアログを非表示
     */
    fun hidePatternEditor() {
        _uiState.update {
            it.copy(
                showPatternEditor = false,
                editingPattern = null
            )
        }
    }
}

/**
 * ルーティンUI状態
 */
data class RoutineUiState(
    val isLoading: Boolean = false,
    val isExecuting: Boolean = false,
    val patterns: List<RoutinePattern> = emptyList(),
    val presets: List<RoutinePattern> = emptyList(),
    val activePattern: RoutinePattern? = null,
    val todayRoutine: RoutineDay? = null,
    val error: String? = null,
    val successMessage: String? = null,
    val showPresetDialog: Boolean = false,
    val showPatternEditor: Boolean = false,
    val editingPattern: RoutinePattern? = null
)
