package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore

/**
 * Firestore カスタム食品リポジトリ実装 (GitLive KMP版)
 */
class FirestoreCustomFoodRepository : CustomFoodRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreCustomFoodRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun customFoodsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("customFoods")

    override suspend fun saveCustomFood(food: CustomFood): Result<String> {
        return try {
            val docRef = customFoodsCollection(food.userId).document
            val foodWithId = food.copy(id = docRef.id)
            docRef.set(foodToMap(foodWithId))
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の保存に失敗しました", e))
        }
    }

    override suspend fun getCustomFoods(userId: String): Result<List<CustomFood>> {
        return try {
            val snapshot = customFoodsCollection(userId)
                .orderBy("usageCount", Direction.DESCENDING)
                .get()

            val foods = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toCustomFood()
                } catch (e: Exception) {
                    println("FirestoreCustomFoodRepository: Error parsing food ${doc.id}: ${e.message}")
                    null
                }
            }
            Result.success(foods)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の取得に失敗しました", e))
        }
    }

    override suspend fun searchCustomFoods(userId: String, query: String): Result<List<CustomFood>> {
        return try {
            // Firestoreは部分一致検索をサポートしていないため、全件取得してフィルタリング
            val snapshot = customFoodsCollection(userId).get()
            val lowerQuery = query.lowercase()

            val foods = snapshot.documents
                .mapNotNull { doc ->
                    try {
                        doc.toCustomFood()
                    } catch (e: Exception) {
                        null
                    }
                }
                .filter { it.name.lowercase().contains(lowerQuery) }
                .sortedByDescending { it.usageCount }

            Result.success(foods)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の検索に失敗しました", e))
        }
    }

    override suspend fun deleteCustomFood(userId: String, foodId: String): Result<Unit> {
        return try {
            customFoodsCollection(userId).document(foodId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の削除に失敗しました", e))
        }
    }

    override suspend fun updateCustomFood(userId: String, foodId: String, updates: Map<String, Any>): Result<Unit> {
        return try {
            customFoodsCollection(userId).document(foodId).update(updates)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の更新に失敗しました", e))
        }
    }

    override suspend fun incrementUsage(userId: String, foodId: String): Result<Unit> {
        return try {
            customFoodsCollection(userId).document(foodId).update(
                mapOf(
                    "usageCount" to FieldValue.increment(1),
                    "lastUsedAt" to DateUtil.currentTimestamp()
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("使用回数の更新に失敗しました", e))
        }
    }

    override suspend fun getCustomFoodByName(userId: String, name: String): Result<CustomFood?> {
        return try {
            val snapshot = customFoodsCollection(userId)
                .where { "name" equalTo name }
                .get()

            val food = snapshot.documents.firstOrNull()?.toCustomFood()
            Result.success(food)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の検索に失敗しました", e))
        }
    }

    // ========== Mapping Functions ==========

    private fun foodToMap(food: CustomFood): Map<String, Any?> = mapOf(
        "id" to food.id,
        "userId" to food.userId,
        "name" to food.name,
        "calories" to food.calories,
        "protein" to food.protein,
        "carbs" to food.carbs,
        "fat" to food.fat,
        "fiber" to food.fiber,
        "solubleFiber" to food.solubleFiber,
        "insolubleFiber" to food.insolubleFiber,
        "sugar" to food.sugar,
        "gi" to food.gi,
        "diaas" to food.diaas,
        "saturatedFat" to food.saturatedFat,
        "monounsaturatedFat" to food.monounsaturatedFat,
        "polyunsaturatedFat" to food.polyunsaturatedFat,
        "vitaminA" to food.vitaminA,
        "vitaminB1" to food.vitaminB1,
        "vitaminB2" to food.vitaminB2,
        "vitaminB6" to food.vitaminB6,
        "vitaminB12" to food.vitaminB12,
        "vitaminC" to food.vitaminC,
        "vitaminD" to food.vitaminD,
        "vitaminE" to food.vitaminE,
        "vitaminK" to food.vitaminK,
        "niacin" to food.niacin,
        "pantothenicAcid" to food.pantothenicAcid,
        "biotin" to food.biotin,
        "folicAcid" to food.folicAcid,
        "sodium" to food.sodium,
        "potassium" to food.potassium,
        "calcium" to food.calcium,
        "magnesium" to food.magnesium,
        "phosphorus" to food.phosphorus,
        "iron" to food.iron,
        "zinc" to food.zinc,
        "copper" to food.copper,
        "manganese" to food.manganese,
        "iodine" to food.iodine,
        "selenium" to food.selenium,
        "chromium" to food.chromium,
        "molybdenum" to food.molybdenum,
        "isAiAnalyzed" to food.isAiAnalyzed,
        "analyzedAt" to food.analyzedAt,
        "usageCount" to food.usageCount,
        "lastUsedAt" to food.lastUsedAt,
        "createdAt" to food.createdAt
    )

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toCustomFood(): CustomFood {
        return CustomFood(
            id = id,
            userId = get<String>("userId") ?: "",
            name = get<String>("name") ?: "",
            calories = get<Long?>("calories")?.toInt() ?: 0,
            protein = get<Double?>("protein")?.toFloat() ?: 0f,
            carbs = get<Double?>("carbs")?.toFloat() ?: 0f,
            fat = get<Double?>("fat")?.toFloat() ?: 0f,
            fiber = get<Double?>("fiber")?.toFloat() ?: 0f,
            solubleFiber = get<Double?>("solubleFiber")?.toFloat() ?: 0f,
            insolubleFiber = get<Double?>("insolubleFiber")?.toFloat() ?: 0f,
            sugar = get<Double?>("sugar")?.toFloat() ?: 0f,
            gi = get<Long?>("gi")?.toInt() ?: 0,
            diaas = get<Double?>("diaas")?.toFloat() ?: 0f,
            saturatedFat = get<Double?>("saturatedFat")?.toFloat() ?: 0f,
            monounsaturatedFat = get<Double?>("monounsaturatedFat")?.toFloat() ?: 0f,
            polyunsaturatedFat = get<Double?>("polyunsaturatedFat")?.toFloat() ?: 0f,
            vitaminA = get<Double?>("vitaminA")?.toFloat() ?: 0f,
            vitaminB1 = get<Double?>("vitaminB1")?.toFloat() ?: 0f,
            vitaminB2 = get<Double?>("vitaminB2")?.toFloat() ?: 0f,
            vitaminB6 = get<Double?>("vitaminB6")?.toFloat() ?: 0f,
            vitaminB12 = get<Double?>("vitaminB12")?.toFloat() ?: 0f,
            vitaminC = get<Double?>("vitaminC")?.toFloat() ?: 0f,
            vitaminD = get<Double?>("vitaminD")?.toFloat() ?: 0f,
            vitaminE = get<Double?>("vitaminE")?.toFloat() ?: 0f,
            vitaminK = get<Double?>("vitaminK")?.toFloat() ?: 0f,
            niacin = get<Double?>("niacin")?.toFloat() ?: 0f,
            pantothenicAcid = get<Double?>("pantothenicAcid")?.toFloat() ?: 0f,
            biotin = get<Double?>("biotin")?.toFloat() ?: 0f,
            folicAcid = get<Double?>("folicAcid")?.toFloat() ?: 0f,
            sodium = get<Double?>("sodium")?.toFloat() ?: 0f,
            potassium = get<Double?>("potassium")?.toFloat() ?: 0f,
            calcium = get<Double?>("calcium")?.toFloat() ?: 0f,
            magnesium = get<Double?>("magnesium")?.toFloat() ?: 0f,
            phosphorus = get<Double?>("phosphorus")?.toFloat() ?: 0f,
            iron = get<Double?>("iron")?.toFloat() ?: 0f,
            zinc = get<Double?>("zinc")?.toFloat() ?: 0f,
            copper = get<Double?>("copper")?.toFloat() ?: 0f,
            manganese = get<Double?>("manganese")?.toFloat() ?: 0f,
            iodine = get<Double?>("iodine")?.toFloat() ?: 0f,
            selenium = get<Double?>("selenium")?.toFloat() ?: 0f,
            chromium = get<Double?>("chromium")?.toFloat() ?: 0f,
            molybdenum = get<Double?>("molybdenum")?.toFloat() ?: 0f,
            isAiAnalyzed = get<Boolean?>("isAiAnalyzed") ?: false,
            analyzedAt = get<Long?>("analyzedAt"),
            usageCount = get<Long?>("usageCount")?.toInt() ?: 0,
            lastUsedAt = get<Long?>("lastUsedAt"),
            createdAt = get<Long?>("createdAt") ?: DateUtil.currentTimestamp()
        )
    }
}
