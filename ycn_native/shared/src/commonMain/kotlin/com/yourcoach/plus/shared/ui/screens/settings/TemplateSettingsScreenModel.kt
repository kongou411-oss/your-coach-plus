package com.yourcoach.plus.shared.ui.screens.settings

import cafe.adriel.voyager.core.model.ScreenModel
import cafe.adriel.voyager.core.model.screenModelScope
import com.yourcoach.plus.shared.domain.model.Exercise
import com.yourcoach.plus.shared.domain.model.ExerciseCategory
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import com.yourcoach.plus.shared.domain.model.WorkoutType
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.data.database.FoodDatabase
import com.yourcoach.plus.shared.util.invokeCloudFunction
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch

data class TemplateSettingsUiState(
    val isLoading: Boolean = true,
    val mealTemplates: List<MealTemplate> = emptyList(),
    val workoutTemplates: List<WorkoutTemplate> = emptyList(),
    val defaultMealTemplates: List<MealTemplate> = emptyList(),
    val defaultWorkoutTemplates: List<WorkoutTemplate> = emptyList(),
    val selectedTabIndex: Int = 0,
    val showDefaultTemplates: Boolean = false,
    val actionMessage: String? = null,
    val error: String? = null
)

class TemplateSettingsScreenModel(
    private val authRepository: AuthRepository,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository
) : ScreenModel {

    private val _uiState = MutableStateFlow(TemplateSettingsUiState())
    val uiState: StateFlow<TemplateSettingsUiState> = _uiState.asStateFlow()

    private val exceptionHandler = CoroutineExceptionHandler { _, _ ->
        _uiState.update { it.copy(isLoading = false, error = "エラーが発生しました") }
    }

    init {
        loadTemplates()
    }

    fun refreshTemplates() {
        loadTemplates()
    }

    private fun loadTemplates() {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            _uiState.update { it.copy(isLoading = true) }

            val mealResult = mealRepository.getMealTemplates(userId)
            val workoutResult = workoutRepository.getWorkoutTemplates(userId)

            _uiState.update {
                it.copy(
                    isLoading = false,
                    mealTemplates = mealResult.getOrDefault(emptyList()),
                    workoutTemplates = workoutResult.getOrDefault(emptyList())
                )
            }

            // デフォルトテンプレートも取得
            loadDefaultTemplates()
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun loadDefaultTemplates() {
        screenModelScope.launch {
            try {
                val result = invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "getQuestTemplates",
                    data = emptyMap()
                )
                val templatesList = (result["templates"] as? List<*>)?.mapNotNull { it as? Map<String, Any?> } ?: emptyList()

                val defaultMeals = mutableListOf<MealTemplate>()
                val defaultWorkouts = mutableListOf<WorkoutTemplate>()

                for (t in templatesList) {
                    val templateId = t["templateId"] as? String ?: continue
                    val title = t["title"] as? String ?: continue
                    val type = t["type"] as? String ?: "MEAL"
                    val items = t["items"] as? List<Map<String, Any?>> ?: emptyList()

                    if (type == "MEAL") {
                        val macros = t["totalMacros"] as? Map<String, Any?>
                        val mealItems = items.map { item ->
                            MealItem(
                                name = item["foodName"] as? String ?: "",
                                amount = (item["amount"] as? Number)?.toFloat() ?: 0f,
                                unit = item["unit"] as? String ?: "g",
                                calories = (item["calories"] as? Number)?.toInt() ?: 0,
                                protein = (item["protein"] as? Number)?.toFloat() ?: 0f,
                                carbs = (item["carbs"] as? Number)?.toFloat() ?: 0f,
                                fat = (item["fat"] as? Number)?.toFloat() ?: 0f,
                                fiber = (item["fiber"] as? Number)?.toFloat() ?: 0f
                            )
                        }
                        defaultMeals.add(
                            MealTemplate(
                                id = "default_$templateId",
                                userId = "default",
                                name = title,
                                items = mealItems,
                                totalCalories = (macros?.get("calories") as? Number)?.toInt() ?: mealItems.sumOf { it.calories },
                                totalProtein = (macros?.get("protein") as? Number)?.toFloat() ?: mealItems.map { it.protein }.sum(),
                                totalCarbs = (macros?.get("carbs") as? Number)?.toFloat() ?: mealItems.map { it.carbs }.sum(),
                                totalFat = (macros?.get("fat") as? Number)?.toFloat() ?: mealItems.map { it.fat }.sum(),
                                createdAt = 0
                            )
                        )
                    } else if (type == "WORKOUT") {
                        val exercises = items.map { item ->
                            Exercise(
                                name = item["foodName"] as? String ?: "",
                                category = ExerciseCategory.CHEST,
                                sets = (item["sets"] as? Number)?.toInt(),
                                reps = (item["reps"] as? Number)?.toInt(),
                                weight = (item["weight"] as? Number)?.toFloat(),
                                caloriesBurned = 0
                            )
                        }
                        defaultWorkouts.add(
                            WorkoutTemplate(
                                id = "default_$templateId",
                                userId = "default",
                                name = title,
                                type = WorkoutType.STRENGTH,
                                exercises = exercises,
                                estimatedDuration = 0,
                                estimatedCalories = 0,
                                createdAt = 0
                            )
                        )
                    }
                }

                _uiState.update {
                    it.copy(
                        defaultMealTemplates = defaultMeals,
                        defaultWorkoutTemplates = defaultWorkouts
                    )
                }
            } catch (_: Exception) {
            }
        }
    }

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTabIndex = index) }
    }

    fun deleteMealTemplate(templateId: String) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val name = _uiState.value.mealTemplates.find { it.id == templateId }?.name ?: ""
            mealRepository.deleteMealTemplate(userId, templateId)
                .onSuccess {
                    _uiState.update { it.copy(actionMessage = "「$name」を削除しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "削除に失敗しました: ${e.message}") }
                }
        }
    }

    fun deleteWorkoutTemplate(templateId: String) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val name = _uiState.value.workoutTemplates.find { it.id == templateId }?.name ?: ""
            workoutRepository.deleteWorkoutTemplate(userId, templateId)
                .onSuccess {
                    _uiState.update { it.copy(actionMessage = "「$name」を削除しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "削除に失敗しました: ${e.message}") }
                }
        }
    }

    fun toggleDefaultTemplates() {
        _uiState.update { it.copy(showDefaultTemplates = !it.showDefaultTemplates) }
    }

    fun duplicateMealTemplate(template: MealTemplate) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            // FoodDBからミクロ栄養素をエンリッチしてから保存
            val enrichedItems = template.items.map { item -> enrichItemFromFoodDb(item) }
            val copy = template.copy(
                id = "",
                userId = userId,
                items = enrichedItems,
                totalCalories = enrichedItems.sumOf { it.calories },
                totalProtein = enrichedItems.sumOf { it.protein.toDouble() }.toFloat(),
                totalCarbs = enrichedItems.sumOf { it.carbs.toDouble() }.toFloat(),
                totalFat = enrichedItems.sumOf { it.fat.toDouble() }.toFloat(),
                createdAt = com.yourcoach.plus.shared.util.DateUtil.currentTimestamp()
            )
            mealRepository.saveMealTemplate(copy)
                .onSuccess {
                    _uiState.update { it.copy(actionMessage = "「${template.name}」を複製しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "複製に失敗しました: ${e.message}") }
                }
        }
    }

    fun duplicateWorkoutTemplate(template: WorkoutTemplate) {
        screenModelScope.launch(exceptionHandler) {
            val userId = authRepository.getCurrentUserId() ?: return@launch
            val copy = template.copy(
                id = "",
                userId = userId,
                createdAt = com.yourcoach.plus.shared.util.DateUtil.currentTimestamp()
            )
            workoutRepository.saveWorkoutTemplate(copy)
                .onSuccess {
                    _uiState.update { it.copy(actionMessage = "「${template.name}」を複製しました") }
                    loadTemplates()
                }
                .onFailure { e ->
                    _uiState.update { it.copy(error = "複製に失敗しました: ${e.message}") }
                }
        }
    }

    fun clearActionMessage() { _uiState.update { it.copy(actionMessage = null) } }
    fun clearError() { _uiState.update { it.copy(error = null) } }

    private fun enrichItemFromFoodDb(item: MealItem): MealItem {
        val foodData = FoodDatabase.getFoodByName(item.name) ?: return item
        val grams = foodData.toGrams(item.amount, item.unit)
        val ratio = grams / 100f
        return item.copy(
            calories = (foodData.calories * ratio).toInt(),
            protein = foodData.protein * ratio,
            carbs = foodData.carbs * ratio,
            fat = foodData.fat * ratio,
            fiber = foodData.fiber * ratio,
            solubleFiber = foodData.solubleFiber * ratio,
            insolubleFiber = foodData.insolubleFiber * ratio,
            sugar = foodData.sugar * ratio,
            gi = foodData.gi ?: 0,
            diaas = foodData.diaas,
            saturatedFat = foodData.saturatedFat * ratio,
            monounsaturatedFat = foodData.monounsaturatedFat * ratio,
            polyunsaturatedFat = foodData.polyunsaturatedFat * ratio,
            vitamins = mapOf(
                "A" to foodData.vitaminA * ratio,
                "B1" to foodData.vitaminB1 * ratio,
                "B2" to foodData.vitaminB2 * ratio,
                "B6" to foodData.vitaminB6 * ratio,
                "B12" to foodData.vitaminB12 * ratio,
                "C" to foodData.vitaminC * ratio,
                "D" to foodData.vitaminD * ratio,
                "E" to foodData.vitaminE * ratio,
                "K" to foodData.vitaminK * ratio,
                "niacin" to foodData.niacin * ratio,
                "pantothenicAcid" to foodData.pantothenicAcid * ratio,
                "biotin" to foodData.biotin * ratio,
                "folicAcid" to foodData.folicAcid * ratio
            ),
            minerals = mapOf(
                "sodium" to foodData.sodium * ratio,
                "potassium" to foodData.potassium * ratio,
                "calcium" to foodData.calcium * ratio,
                "magnesium" to foodData.magnesium * ratio,
                "phosphorus" to foodData.phosphorus * ratio,
                "iron" to foodData.iron * ratio,
                "zinc" to foodData.zinc * ratio,
                "copper" to foodData.copper * ratio,
                "manganese" to foodData.manganese * ratio,
                "iodine" to foodData.iodine * ratio,
                "selenium" to foodData.selenium * ratio,
                "chromium" to foodData.chromium * ratio,
                "molybdenum" to foodData.molybdenum * ratio
            )
        )
    }
}
