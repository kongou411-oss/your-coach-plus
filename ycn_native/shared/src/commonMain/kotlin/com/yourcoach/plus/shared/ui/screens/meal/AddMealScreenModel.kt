package com.yourcoach.plus.shared.ui.screens.meal

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * 食事追加画面の状態
 */
data class AddMealUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val saveSuccess: Boolean = false,
    val selectedDate: String = DateUtil.todayString(),
    // 食事情報
    val mealName: String = "",
    val mealType: MealType = MealType.BREAKFAST,
    val mealTime: String = "",
    val items: List<MealItemInput> = listOf(MealItemInput()),
    val note: String = ""
)

/**
 * 食品入力用データクラス
 */
data class MealItemInput(
    val name: String = "",
    val amount: String = "100",
    val unit: String = "g",
    val calories: String = "0",
    val protein: String = "0",
    val carbs: String = "0",
    val fat: String = "0"
) {
    fun toMealItem(): MealItem? {
        if (name.isBlank()) return null
        return MealItem(
            name = name,
            amount = amount.toFloatOrNull() ?: 0f,
            unit = unit,
            calories = calories.toIntOrNull() ?: 0,
            protein = protein.toFloatOrNull() ?: 0f,
            carbs = carbs.toFloatOrNull() ?: 0f,
            fat = fat.toFloatOrNull() ?: 0f
        )
    }
}

/**
 * 食事追加画面のScreenModel
 */
class AddMealScreenModel(
    private val authRepository: AuthRepository,
    private val mealRepository: MealRepository,
    private val initialDate: String
) : ScreenModel {

    private val _uiState = MutableStateFlow(AddMealUiState(selectedDate = initialDate))
    val uiState: StateFlow<AddMealUiState> = _uiState.asStateFlow()

    /**
     * 食事名を更新
     */
    fun updateMealName(name: String) {
        _uiState.update { it.copy(mealName = name) }
    }

    /**
     * 食事タイプを更新
     */
    fun updateMealType(type: MealType) {
        _uiState.update { it.copy(mealType = type) }
    }

    /**
     * 食事時刻を更新
     */
    fun updateMealTime(time: String) {
        _uiState.update { it.copy(mealTime = time) }
    }

    /**
     * メモを更新
     */
    fun updateNote(note: String) {
        _uiState.update { it.copy(note = note) }
    }

    /**
     * 食品アイテムを更新
     */
    fun updateItem(index: Int, item: MealItemInput) {
        _uiState.update { state ->
            val newItems = state.items.toMutableList()
            if (index < newItems.size) {
                newItems[index] = item
            }
            state.copy(items = newItems)
        }
    }

    /**
     * 食品アイテムを追加
     */
    fun addItem() {
        _uiState.update { state ->
            state.copy(items = state.items + MealItemInput())
        }
    }

    /**
     * 食品アイテムを削除
     */
    fun removeItem(index: Int) {
        _uiState.update { state ->
            if (state.items.size > 1) {
                val newItems = state.items.toMutableList()
                newItems.removeAt(index)
                state.copy(items = newItems)
            } else {
                state
            }
        }
    }

    /**
     * 食事を保存
     */
    fun saveMeal() {
        val state = _uiState.value
        val items = state.items.mapNotNull { it.toMealItem() }

        if (items.isEmpty()) {
            _uiState.update { it.copy(error = "食品を1つ以上追加してください") }
            return
        }

        _uiState.update { it.copy(isSaving = true, error = null) }

        screenModelScope.launch {
            try {
                val userId = authRepository.getCurrentUserId()
                if (userId == null) {
                    _uiState.update { it.copy(isSaving = false, error = "ログインしていません") }
                    return@launch
                }

                val totalCalories = items.sumOf { it.calories }
                val totalProtein = items.sumOf { it.protein.toDouble() }.toFloat()
                val totalCarbs = items.sumOf { it.carbs.toDouble() }.toFloat()
                val totalFat = items.sumOf { it.fat.toDouble() }.toFloat()
                val totalFiber = items.sumOf { it.fiber.toDouble() }.toFloat()

                val meal = Meal(
                    id = "",
                    userId = userId,
                    name = state.mealName.ifBlank { null },
                    type = state.mealType,
                    time = state.mealTime.ifBlank { null },
                    items = items,
                    totalCalories = totalCalories,
                    totalProtein = totalProtein,
                    totalCarbs = totalCarbs,
                    totalFat = totalFat,
                    totalFiber = totalFiber,
                    note = state.note.ifBlank { null },
                    timestamp = DateUtil.dateStringToTimestamp(state.selectedDate),
                    createdAt = DateUtil.currentTimestamp()
                )

                val result = mealRepository.addMeal(meal)
                result.fold(
                    onSuccess = {
                        _uiState.update { it.copy(isSaving = false, saveSuccess = true) }
                    },
                    onFailure = { e ->
                        _uiState.update { it.copy(isSaving = false, error = e.message) }
                    }
                )
            } catch (e: Exception) {
                _uiState.update { it.copy(isSaving = false, error = e.message) }
            }
        }
    }

    /**
     * エラーをクリア
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
