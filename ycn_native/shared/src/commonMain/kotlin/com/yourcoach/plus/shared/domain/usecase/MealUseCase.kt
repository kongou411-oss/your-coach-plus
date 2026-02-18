package com.yourcoach.plus.shared.domain.usecase

import kotlin.math.roundToInt
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.repository.MealRepository

/**
 * 食事記録ユースケース
 * 食事のCRUD操作を提供
 */
class MealUseCase(
    private val mealRepository: MealRepository
) {
    /**
     * 食事を追加
     */
    suspend fun addMeal(meal: Meal): Result<String> {
        return mealRepository.addMeal(meal)
    }

    /**
     * 食事を更新
     */
    suspend fun updateMeal(meal: Meal): Result<Unit> {
        return mealRepository.updateMeal(meal)
    }

    /**
     * 食事を削除
     */
    suspend fun deleteMeal(userId: String, mealId: String): Result<Unit> {
        return mealRepository.deleteMeal(userId, mealId)
    }

    /**
     * 特定日の食事を取得
     */
    suspend fun getMealsForDate(userId: String, date: String): Result<List<Meal>> {
        return mealRepository.getMealsForDate(userId, date)
    }

    /**
     * 栄養素合計を計算
     */
    fun calculateTotals(meals: List<Meal>): NutritionTotals {
        return NutritionTotals(
            calories = meals.sumOf { it.totalCalories },
            protein = meals.sumOf { it.totalProtein.roundToInt() }.toFloat(),
            carbs = meals.sumOf { it.totalCarbs.roundToInt() }.toFloat(),
            fat = meals.sumOf { it.totalFat.roundToInt() }.toFloat()
        )
    }
}

/**
 * 栄養素合計
 */
data class NutritionTotals(
    val calories: Int,
    val protein: Float,
    val carbs: Float,
    val fat: Float
)
