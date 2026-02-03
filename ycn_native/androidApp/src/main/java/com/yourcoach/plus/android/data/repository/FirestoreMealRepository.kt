package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.MealItem
import com.yourcoach.plus.shared.domain.model.MealTemplate
import com.yourcoach.plus.shared.domain.model.MealType
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.RecognizedFood
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.ZoneId

/**
 * Firestore 食事リポジトリ実装
 */
class FirestoreMealRepository : MealRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    private fun mealsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("meals")

    private fun templatesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("mealTemplates")

    /**
     * 食事を記録
     */
    override suspend fun addMeal(meal: Meal): Result<String> {
        return try {
            val docRef = mealsCollection(meal.userId).document()
            val mealWithId = meal.copy(id = docRef.id)
            docRef.set(mealToMap(mealWithId)).await()
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
            mealsCollection(meal.userId).document(meal.id).set(mealToMap(meal)).await()
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
            mealsCollection(userId).document(mealId).delete().await()
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
            val doc = mealsCollection(userId).document(mealId).get().await()
            if (doc.exists()) {
                Result.success(mapToMeal(doc.data!!, doc.id))
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
            val docs = mealsCollection(userId)
                .whereGreaterThanOrEqualTo("timestamp", startOfDay)
                .whereLessThan("timestamp", endOfDay)
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()

            // 同じtimestampの場合はcreatedAt順にソート（クエストからの記録順を維持）
            val meals = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToMeal(it, doc.id) }
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
            val docs = mealsCollection(userId)
                .whereGreaterThanOrEqualTo("timestamp", startTimestamp)
                .whereLessThan("timestamp", endTimestamp)
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()

            // 同じtimestampの場合はcreatedAt順にソート
            val meals = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToMeal(it, doc.id) }
            }.sortedBy { it.createdAt }
            Result.success(meals)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("食事の取得に失敗しました", e))
        }
    }

    /**
     * 特定日の食事をリアルタイム監視
     */
    override fun observeMealsForDate(userId: String, date: String): Flow<List<Meal>> = callbackFlow {
        val (startOfDay, endOfDay) = getDateRange(date)
        val listener = mealsCollection(userId)
            .whereGreaterThanOrEqualTo("timestamp", startOfDay)
            .whereLessThan("timestamp", endOfDay)
            .orderBy("timestamp", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                // 同じtimestampの場合はcreatedAt順にソート（クエストからの記録順を維持）
                val meals = snapshot?.documents?.mapNotNull { doc ->
                    doc.data?.let { mapToMeal(it, doc.id) }
                }?.sortedBy { it.createdAt } ?: emptyList()
                trySend(meals)
            }
        awaitClose { listener.remove() }
    }

    /**
     * 食事テンプレートを保存
     */
    override suspend fun saveMealTemplate(template: MealTemplate): Result<String> {
        return try {
            val docRef = templatesCollection(template.userId).document()
            val templateWithId = template.copy(id = docRef.id)
            docRef.set(templateToMap(templateWithId)).await()
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
            val docs = templatesCollection(userId)
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .get()
                .await()

            val templates = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToTemplate(it, doc.id) }
            }
            Result.success(templates)
        } catch (e: Exception) {
            // コレクションが存在しない場合やインデックスがない場合は空リストを返す
            android.util.Log.w("FirestoreMealRepository", "getMealTemplates failed: ${e.message}")
            Result.success(emptyList())
        }
    }

    /**
     * 食事テンプレートを削除
     */
    override suspend fun deleteMealTemplate(userId: String, templateId: String): Result<Unit> {
        return try {
            templatesCollection(userId).document(templateId).delete().await()
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
            firestore.runTransaction { transaction ->
                val doc = transaction.get(docRef)
                val currentCount = doc.getLong("usageCount")?.toInt() ?: 0
                transaction.update(docRef, mapOf(
                    "usageCount" to currentCount + 1,
                    "lastUsedAt" to System.currentTimeMillis()
                ))
            }.await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("テンプレートの更新に失敗しました", e))
        }
    }

    /**
     * AI食品認識結果を取得
     */
    override suspend fun recognizeFoodFromImage(imageBytes: ByteArray): Result<List<RecognizedFood>> {
        // TODO: Cloud Functionsを呼び出してAI認識を実行
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
        // 入力元タグ
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
        // 脂肪酸詳細
        "saturatedFat" to item.saturatedFat,
        "mediumChainFat" to item.mediumChainFat,
        "monounsaturatedFat" to item.monounsaturatedFat,
        "polyunsaturatedFat" to item.polyunsaturatedFat,
        // 品質指標
        "diaas" to item.diaas,
        "gi" to item.gi,
        // ビタミン・ミネラル
        "vitamins" to item.vitamins,
        "minerals" to item.minerals,
        "isAiRecognized" to item.isAiRecognized,
        "category" to item.category
    )

    @Suppress("UNCHECKED_CAST")
    private fun mapToMeal(data: Map<String, Any>, id: String): Meal {
        val itemsList = (data["items"] as? List<Map<String, Any>>) ?: emptyList()
        return Meal(
            id = id,
            userId = data["userId"] as? String ?: "",
            name = data["name"] as? String,
            type = MealType.valueOf(data["type"] as? String ?: "BREAKFAST"),
            time = data["time"] as? String,
            items = itemsList.map { mapToItem(it) },
            totalCalories = (data["totalCalories"] as? Number)?.toInt() ?: 0,
            totalProtein = (data["totalProtein"] as? Number)?.toFloat() ?: 0f,
            totalCarbs = (data["totalCarbs"] as? Number)?.toFloat() ?: 0f,
            totalFat = (data["totalFat"] as? Number)?.toFloat() ?: 0f,
            totalFiber = (data["totalFiber"] as? Number)?.toFloat() ?: 0f,
            totalGL = (data["totalGL"] as? Number)?.toFloat() ?: 0f,
            imageUrl = data["imageUrl"] as? String,
            note = data["note"] as? String,
            // 入力元タグ
            isPredicted = data["isPredicted"] as? Boolean ?: false,
            isTemplate = data["isTemplate"] as? Boolean ?: false,
            isRoutine = data["isRoutine"] as? Boolean ?: false,
            isPostWorkout = data["isPostWorkout"] as? Boolean ?: false,
            timestamp = (data["timestamp"] as? Number)?.toLong() ?: 0L,
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToItem(data: Map<String, Any>): MealItem = MealItem(
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
        // 脂肪酸詳細
        saturatedFat = (data["saturatedFat"] as? Number)?.toFloat() ?: 0f,
        mediumChainFat = (data["mediumChainFat"] as? Number)?.toFloat() ?: 0f,
        monounsaturatedFat = (data["monounsaturatedFat"] as? Number)?.toFloat() ?: 0f,
        polyunsaturatedFat = (data["polyunsaturatedFat"] as? Number)?.toFloat() ?: 0f,
        // 品質指標
        diaas = (data["diaas"] as? Number)?.toFloat() ?: 0f,
        gi = (data["gi"] as? Number)?.toInt() ?: 0,
        // ビタミン・ミネラル
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

    @Suppress("UNCHECKED_CAST")
    private fun mapToTemplate(data: Map<String, Any>, id: String): MealTemplate {
        val itemsList = (data["items"] as? List<Map<String, Any>>) ?: emptyList()
        return MealTemplate(
            id = id,
            userId = data["userId"] as? String ?: "",
            name = data["name"] as? String ?: "",
            items = itemsList.map { mapToItem(it) },
            totalCalories = (data["totalCalories"] as? Number)?.toInt() ?: 0,
            totalProtein = (data["totalProtein"] as? Number)?.toFloat() ?: 0f,
            totalCarbs = (data["totalCarbs"] as? Number)?.toFloat() ?: 0f,
            totalFat = (data["totalFat"] as? Number)?.toFloat() ?: 0f,
            usageCount = (data["usageCount"] as? Number)?.toInt() ?: 0,
            lastUsedAt = (data["lastUsedAt"] as? Number)?.toLong(),
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L
        )
    }

    private fun getDateRange(date: String): Pair<Long, Long> {
        val localDate = LocalDate.parse(date)
        val zone = ZoneId.of("Asia/Tokyo")
        val startOfDay = localDate.atStartOfDay(zone).toInstant().toEpochMilli()
        val endOfDay = localDate.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()
        return startOfDay to endOfDay
    }
}
