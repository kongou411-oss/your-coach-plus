package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.RecognizedFood
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.*

/**
 * Firestore 食事リポジトリ実装 (GitLive KMP版)
 */
class FirestoreMealRepository : MealRepository {

    // iOS対応: lazy初期化でFirebaseアクセスを遅延
    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreMealRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun mealsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("meals")

    private fun templatesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("mealTemplates")

    /**
     * 食事を記録
     */
    override suspend fun addMeal(meal: Meal): Result<String> {
        return try {
            val docRef = mealsCollection(meal.userId).document
            val mealWithId = meal.copy(id = docRef.id)
            docRef.set(mealToMap(mealWithId))
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("食事の記録に失敗しました", e))
        }
    }

    /**
     * 食事を更新
     */
    override suspend fun updateMeal(meal: Meal): Result<Unit> {
        return try {
            mealsCollection(meal.userId).document(meal.id).set(mealToMap(meal))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("食事の更新に失敗しました", e))
        }
    }

    /**
     * 食事を削除
     */
    override suspend fun deleteMeal(userId: String, mealId: String): Result<Unit> {
        return try {
            mealsCollection(userId).document(mealId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("食事の削除に失敗しました", e))
        }
    }

    /**
     * 特定の食事を取得
     */
    override suspend fun getMeal(userId: String, mealId: String): Result<Meal?> {
        return try {
            val doc = mealsCollection(userId).document(mealId).get()
            if (doc.exists) {
                Result.success(doc.toMeal())
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("食事の取得に失敗しました", e))
        }
    }

    /**
     * 特定日の食事を取得
     */
    override suspend fun getMealsForDate(userId: String, date: String): Result<List<Meal>> {
        return try {
            val (startOfDay, endOfDay) = getDateRange(date)
            val snapshot = mealsCollection(userId)
                .where { "timestamp" greaterThanOrEqualTo startOfDay }
                .where { "timestamp" lessThan endOfDay }
                .orderBy("timestamp", Direction.ASCENDING)
                .get()

            val meals = snapshot.documents.mapNotNull { doc ->
                doc.toMeal()
            }.sortedBy { it.createdAt }
            Result.success(meals)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("食事の取得に失敗しました", e))
        }
    }

    /**
     * 日付範囲の食事を取得
     */
    override suspend fun getMealsInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<Meal>> {
        return try {
            val startTimestamp = getDateRange(startDate).first
            val endTimestamp = getDateRange(endDate).second
            val snapshot = mealsCollection(userId)
                .where { "timestamp" greaterThanOrEqualTo startTimestamp }
                .where { "timestamp" lessThan endTimestamp }
                .orderBy("timestamp", Direction.ASCENDING)
                .get()

            val meals = snapshot.documents.mapNotNull { doc ->
                doc.toMeal()
            }.sortedBy { it.createdAt }
            Result.success(meals)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("食事の取得に失敗しました", e))
        }
    }

    /**
     * 特定日の食事をリアルタイム監視
     */
    override fun observeMealsForDate(userId: String, date: String): Flow<List<Meal>> {
        val (startOfDay, endOfDay) = getDateRange(date)
        return mealsCollection(userId)
            .where { "timestamp" greaterThanOrEqualTo startOfDay }
            .where { "timestamp" lessThan endOfDay }
            .orderBy("timestamp", Direction.ASCENDING)
            .snapshots
            .map { snapshot ->
                snapshot.documents.mapNotNull { doc ->
                    doc.toMeal()
                }.sortedBy { it.createdAt }
            }
    }

    /**
     * 食事テンプレートを保存
     */
    override suspend fun saveMealTemplate(template: MealTemplate): Result<String> {
        return try {
            val docRef = templatesCollection(template.userId).document
            val templateWithId = template.copy(id = docRef.id)
            docRef.set(templateToMap(templateWithId))
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("テンプレートの保存に失敗しました", e))
        }
    }

    /**
     * 食事テンプレートを取得
     */
    override suspend fun getMealTemplates(userId: String): Result<List<MealTemplate>> {
        return try {
            val snapshot = templatesCollection(userId)
                .orderBy("createdAt", Direction.DESCENDING)
                .get()

            val templates = snapshot.documents.mapNotNull { doc ->
                doc.toTemplate()
            }
            Result.success(templates)
        } catch (e: Exception) {
            Result.success(emptyList())
        }
    }

    /**
     * 食事テンプレートを削除
     */
    override suspend fun deleteMealTemplate(userId: String, templateId: String): Result<Unit> {
        return try {
            templatesCollection(userId).document(templateId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("テンプレートの削除に失敗しました", e))
        }
    }

    /**
     * テンプレート使用回数を更新
     */
    override suspend fun incrementTemplateUsage(userId: String, templateId: String): Result<Unit> {
        return try {
            val docRef = templatesCollection(userId).document(templateId)
            val doc = docRef.get()
            val currentCount = doc.get<Long?>("usageCount")?.toInt() ?: 0
            docRef.update(
                mapOf(
                    "usageCount" to currentCount + 1,
                    "lastUsedAt" to DateUtil.currentTimestamp()
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("テンプレートの更新に失敗しました", e))
        }
    }

    /**
     * AI食品認識結果を取得
     */
    override suspend fun recognizeFoodFromImage(imageBytes: ByteArray): Result<List<RecognizedFood>> {
        return Result.failure(AppError.NotImplemented("AI食品認識は未実装です"))
    }

    // ===== ヘルパー関数 =====

    private fun mealToMap(meal: Meal): Map<String, Any?> = mapOf(
        "userId" to meal.userId,
        "name" to meal.name,
        "type" to meal.type.name,
        "time" to meal.time,
        "items" to meal.items.map { itemToMap(it) },
        "totalCalories" to meal.totalCalories,
        "totalProtein" to meal.totalProtein,
        "totalCarbs" to meal.totalCarbs,
        "totalFat" to meal.totalFat,
        "totalFiber" to meal.totalFiber,
        "totalGL" to meal.totalGL,
        "imageUrl" to meal.imageUrl,
        "note" to meal.note,
        "isPredicted" to meal.isPredicted,
        "isTemplate" to meal.isTemplate,
        "isRoutine" to meal.isRoutine,
        "isPostWorkout" to meal.isPostWorkout,
        "timestamp" to meal.timestamp,
        "createdAt" to meal.createdAt
    )

    private fun itemToMap(item: MealItem): Map<String, Any?> = mapOf(
        "name" to item.name,
        "amount" to item.amount,
        "unit" to item.unit,
        "calories" to item.calories,
        "protein" to item.protein,
        "carbs" to item.carbs,
        "fat" to item.fat,
        "fiber" to item.fiber,
        "solubleFiber" to item.solubleFiber,
        "insolubleFiber" to item.insolubleFiber,
        "sugar" to item.sugar,
        "saturatedFat" to item.saturatedFat,
        "mediumChainFat" to item.mediumChainFat,
        "monounsaturatedFat" to item.monounsaturatedFat,
        "polyunsaturatedFat" to item.polyunsaturatedFat,
        "diaas" to item.diaas,
        "gi" to item.gi,
        "vitamins" to item.vitamins,
        "minerals" to item.minerals,
        "isAiRecognized" to item.isAiRecognized,
        "category" to item.category
    )

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toMeal(): Meal? {
        if (!exists) return null

        // @Serializable MealItemを直接使用（Map<String, Any?>はKotlin/Nativeで動作しないため）
        val items = try {
            get<List<MealItem>>("items")
        } catch (e: Throwable) {
            println("FirestoreMealRepository: Could not parse items: ${e.message}")
            emptyList()
        }
        return Meal(
            id = id,
            userId = get<String?>("userId") ?: "",
            name = get<String?>("name"),
            type = get<String?>("type")?.let {
                try { MealType.valueOf(it) } catch (e: Exception) { MealType.BREAKFAST }
            } ?: MealType.BREAKFAST,
            time = get<String?>("time"),
            items = items,
            totalCalories = get<Long?>("totalCalories")?.toInt() ?: 0,
            totalProtein = get<Double?>("totalProtein")?.toFloat() ?: 0f,
            totalCarbs = get<Double?>("totalCarbs")?.toFloat() ?: 0f,
            totalFat = get<Double?>("totalFat")?.toFloat() ?: 0f,
            totalFiber = get<Double?>("totalFiber")?.toFloat() ?: 0f,
            totalGL = get<Double?>("totalGL")?.toFloat() ?: 0f,
            imageUrl = get<String?>("imageUrl"),
            note = get<String?>("note"),
            isPredicted = get<Boolean?>("isPredicted") ?: false,
            isTemplate = get<Boolean?>("isTemplate") ?: false,
            isRoutine = get<Boolean?>("isRoutine") ?: false,
            isPostWorkout = get<Boolean?>("isPostWorkout") ?: false,
            timestamp = get<Long?>("timestamp") ?: 0L,
            createdAt = get<Long?>("createdAt") ?: 0L
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToItem(data: Map<String, Any?>): MealItem = MealItem(
        name = data["name"] as? String ?: "",
        amount = (data["amount"] as? Number)?.toFloat() ?: 0f,
        unit = data["unit"] as? String ?: "g",
        calories = (data["calories"] as? Number)?.toInt() ?: 0,
        protein = (data["protein"] as? Number)?.toFloat() ?: 0f,
        carbs = (data["carbs"] as? Number)?.toFloat() ?: 0f,
        fat = (data["fat"] as? Number)?.toFloat() ?: 0f,
        fiber = (data["fiber"] as? Number)?.toFloat() ?: 0f,
        solubleFiber = (data["solubleFiber"] as? Number)?.toFloat() ?: 0f,
        insolubleFiber = (data["insolubleFiber"] as? Number)?.toFloat() ?: 0f,
        sugar = (data["sugar"] as? Number)?.toFloat() ?: 0f,
        saturatedFat = (data["saturatedFat"] as? Number)?.toFloat() ?: 0f,
        mediumChainFat = (data["mediumChainFat"] as? Number)?.toFloat() ?: 0f,
        monounsaturatedFat = (data["monounsaturatedFat"] as? Number)?.toFloat() ?: 0f,
        polyunsaturatedFat = (data["polyunsaturatedFat"] as? Number)?.toFloat() ?: 0f,
        diaas = (data["diaas"] as? Number)?.toFloat() ?: 0f,
        gi = (data["gi"] as? Number)?.toInt() ?: 0,
        vitamins = (data["vitamins"] as? Map<String, Number>)?.mapValues { it.value.toFloat() } ?: emptyMap(),
        minerals = (data["minerals"] as? Map<String, Number>)?.mapValues { it.value.toFloat() } ?: emptyMap(),
        isAiRecognized = data["isAiRecognized"] as? Boolean ?: false,
        category = data["category"] as? String
    )

    private fun templateToMap(template: MealTemplate): Map<String, Any?> = mapOf(
        "userId" to template.userId,
        "name" to template.name,
        "items" to template.items.map { itemToMap(it) },
        "totalCalories" to template.totalCalories,
        "totalProtein" to template.totalProtein,
        "totalCarbs" to template.totalCarbs,
        "totalFat" to template.totalFat,
        "usageCount" to template.usageCount,
        "lastUsedAt" to template.lastUsedAt,
        "createdAt" to template.createdAt
    )

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toTemplate(): MealTemplate? {
        if (!exists) return null

        // @Serializable MealItemを直接使用（Map<String, Any?>はKotlin/Nativeで動作しないため）
        val items = try {
            get<List<MealItem>>("items")
        } catch (e: Throwable) {
            println("FirestoreMealRepository: Could not parse template items: ${e.message}")
            emptyList()
        }
        return MealTemplate(
            id = id,
            userId = get<String?>("userId") ?: "",
            name = get<String?>("name") ?: "",
            items = items,
            totalCalories = get<Long?>("totalCalories")?.toInt() ?: 0,
            totalProtein = get<Double?>("totalProtein")?.toFloat() ?: 0f,
            totalCarbs = get<Double?>("totalCarbs")?.toFloat() ?: 0f,
            totalFat = get<Double?>("totalFat")?.toFloat() ?: 0f,
            usageCount = get<Long?>("usageCount")?.toInt() ?: 0,
            lastUsedAt = get<Long?>("lastUsedAt"),
            createdAt = get<Long?>("createdAt") ?: 0L
        )
    }

    private fun getDateRange(date: String): Pair<Long, Long> {
        val localDate = LocalDate.parse(date)
        val jstTimeZone = TimeZone.of("Asia/Tokyo")
        val startOfDay = localDate.atStartOfDayIn(jstTimeZone).toEpochMilliseconds()
        val endOfDay = localDate.plus(1, DateTimeUnit.DAY).atStartOfDayIn(jstTimeZone).toEpochMilliseconds()
        return startOfDay to endOfDay
    }
}
