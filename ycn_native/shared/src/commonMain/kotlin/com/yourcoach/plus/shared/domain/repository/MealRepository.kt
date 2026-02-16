package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.MealType
import kotlinx.coroutines.flow.Flow

/**
 * 食事リポジトリインターフェース
 */
interface MealRepository {
    /**
     * 食事を記録
     */
    suspend fun addMeal(meal: Meal): Result<String>

    /**
     * 食事を更新
     */
    suspend fun updateMeal(meal: Meal): Result<Unit>

    /**
     * 食事を削除
     */
    suspend fun deleteMeal(userId: String, mealId: String): Result<Unit>

    /**
     * 特定の食事を取得
     */
    suspend fun getMeal(userId: String, mealId: String): Result<Meal?>

    /**
     * 特定日の食事を取得
     */
    suspend fun getMealsForDate(userId: String, date: String): Result<List<Meal>>

    /**
     * 日付範囲の食事を取得
     */
    suspend fun getMealsInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<Meal>>

    /**
     * 特定日の食事をリアルタイム監視
     */
    fun observeMealsForDate(userId: String, date: String): Flow<List<Meal>>

    /**
     * 食事テンプレートを保存
     */
    suspend fun saveMealTemplate(template: MealTemplate): Result<String>

    /**
     * 食事テンプレートを取得
     */
    suspend fun getMealTemplates(userId: String): Result<List<MealTemplate>>

    /**
     * 食事テンプレートを更新
     */
    suspend fun updateMealTemplate(template: MealTemplate): Result<Unit>

    /**
     * 食事テンプレートを削除
     */
    suspend fun deleteMealTemplate(userId: String, templateId: String): Result<Unit>

    /**
     * テンプレート使用回数を更新
     */
    suspend fun incrementTemplateUsage(userId: String, templateId: String): Result<Unit>

    /**
     * AI食品認識結果を取得
     */
    suspend fun recognizeFoodFromImage(imageBytes: ByteArray): Result<List<RecognizedFood>>
}

/**
 * AI食品認識結果
 */
data class RecognizedFood(
    val name: String,
    val confidence: Float,
    val estimatedCalories: Int,
    val estimatedProtein: Float,
    val estimatedCarbs: Float,
    val estimatedFat: Float,
    val suggestedAmount: Float,
    val suggestedUnit: String
)
