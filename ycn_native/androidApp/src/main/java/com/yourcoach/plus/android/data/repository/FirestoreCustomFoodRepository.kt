package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.CustomFood
import com.yourcoach.plus.shared.domain.repository.CustomFoodRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.tasks.await

/**
 * Firestore カスタム食品リポジトリ実装
 */
class FirestoreCustomFoodRepository : CustomFoodRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    private fun customFoodsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("customFoods")

    override suspend fun saveCustomFood(food: CustomFood): Result<String> {
        return try {
            val docRef = customFoodsCollection(food.userId).document()
            val foodWithId = food.copy(id = docRef.id)
            docRef.set(foodToMap(foodWithId)).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の保存に失敗しました", e))
        }
    }

    override suspend fun getCustomFoods(userId: String): Result<List<CustomFood>> {
        return try {
            val docs = customFoodsCollection(userId)
                .orderBy("usageCount", Query.Direction.DESCENDING)
                .limit(100)
                .get()
                .await()

            val foods = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToCustomFood(it, doc.id) }
            }
            Result.success(foods)
        } catch (e: Exception) {
            // コレクションが存在しない場合は空リストを返す
            Result.success(emptyList())
        }
    }

    override suspend fun searchCustomFoods(userId: String, query: String): Result<List<CustomFood>> {
        return try {
            // Firestoreは部分一致検索が難しいため、全件取得してフィルタリング
            val allFoods = getCustomFoods(userId).getOrDefault(emptyList())
            val filtered = allFoods.filter {
                it.name.contains(query, ignoreCase = true)
            }
            Result.success(filtered)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の検索に失敗しました", e))
        }
    }

    override suspend fun deleteCustomFood(userId: String, foodId: String): Result<Unit> {
        return try {
            customFoodsCollection(userId).document(foodId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム食品の削除に失敗しました", e))
        }
    }

    override suspend fun incrementUsage(userId: String, foodId: String): Result<Unit> {
        return try {
            val docRef = customFoodsCollection(userId).document(foodId)
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
            Result.failure(AppError.DatabaseError("使用回数の更新に失敗しました", e))
        }
    }

    override suspend fun getCustomFoodByName(userId: String, name: String): Result<CustomFood?> {
        return try {
            val docs = customFoodsCollection(userId)
                .whereEqualTo("name", name)
                .limit(1)
                .get()
                .await()

            val food = docs.documents.firstOrNull()?.let { doc ->
                doc.data?.let { mapToCustomFood(it, doc.id) }
            }
            Result.success(food)
        } catch (e: Exception) {
            Result.success(null)
        }
    }

    private fun foodToMap(food: CustomFood): Map<String, Any?> = mapOf(
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
        // ビタミン13種
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
        // ミネラル13種
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
        // AI解析フラグ
        "isAiAnalyzed" to food.isAiAnalyzed,
        "analyzedAt" to food.analyzedAt,
        // 使用回数
        "usageCount" to food.usageCount,
        "lastUsedAt" to food.lastUsedAt,
        "createdAt" to food.createdAt
    )

    private fun mapToCustomFood(data: Map<String, Any>, id: String): CustomFood = CustomFood(
        id = id,
        userId = data["userId"] as? String ?: "",
        name = data["name"] as? String ?: "",
        calories = (data["calories"] as? Number)?.toInt() ?: 0,
        protein = (data["protein"] as? Number)?.toFloat() ?: 0f,
        carbs = (data["carbs"] as? Number)?.toFloat() ?: 0f,
        fat = (data["fat"] as? Number)?.toFloat() ?: 0f,
        fiber = (data["fiber"] as? Number)?.toFloat() ?: 0f,
        solubleFiber = (data["solubleFiber"] as? Number)?.toFloat() ?: 0f,
        insolubleFiber = (data["insolubleFiber"] as? Number)?.toFloat() ?: 0f,
        sugar = (data["sugar"] as? Number)?.toFloat() ?: 0f,
        gi = (data["gi"] as? Number)?.toInt() ?: 0,
        diaas = (data["diaas"] as? Number)?.toFloat() ?: 0f,
        saturatedFat = (data["saturatedFat"] as? Number)?.toFloat() ?: 0f,
        monounsaturatedFat = (data["monounsaturatedFat"] as? Number)?.toFloat() ?: 0f,
        polyunsaturatedFat = (data["polyunsaturatedFat"] as? Number)?.toFloat() ?: 0f,
        // ビタミン13種
        vitaminA = (data["vitaminA"] as? Number)?.toFloat() ?: 0f,
        vitaminB1 = (data["vitaminB1"] as? Number)?.toFloat() ?: 0f,
        vitaminB2 = (data["vitaminB2"] as? Number)?.toFloat() ?: 0f,
        vitaminB6 = (data["vitaminB6"] as? Number)?.toFloat() ?: 0f,
        vitaminB12 = (data["vitaminB12"] as? Number)?.toFloat() ?: 0f,
        vitaminC = (data["vitaminC"] as? Number)?.toFloat() ?: 0f,
        vitaminD = (data["vitaminD"] as? Number)?.toFloat() ?: 0f,
        vitaminE = (data["vitaminE"] as? Number)?.toFloat() ?: 0f,
        vitaminK = (data["vitaminK"] as? Number)?.toFloat() ?: 0f,
        niacin = (data["niacin"] as? Number)?.toFloat() ?: 0f,
        pantothenicAcid = (data["pantothenicAcid"] as? Number)?.toFloat() ?: 0f,
        biotin = (data["biotin"] as? Number)?.toFloat() ?: 0f,
        folicAcid = (data["folicAcid"] as? Number)?.toFloat() ?: 0f,
        // ミネラル13種
        sodium = (data["sodium"] as? Number)?.toFloat() ?: 0f,
        potassium = (data["potassium"] as? Number)?.toFloat() ?: 0f,
        calcium = (data["calcium"] as? Number)?.toFloat() ?: 0f,
        magnesium = (data["magnesium"] as? Number)?.toFloat() ?: 0f,
        phosphorus = (data["phosphorus"] as? Number)?.toFloat() ?: 0f,
        iron = (data["iron"] as? Number)?.toFloat() ?: 0f,
        zinc = (data["zinc"] as? Number)?.toFloat() ?: 0f,
        copper = (data["copper"] as? Number)?.toFloat() ?: 0f,
        manganese = (data["manganese"] as? Number)?.toFloat() ?: 0f,
        iodine = (data["iodine"] as? Number)?.toFloat() ?: 0f,
        selenium = (data["selenium"] as? Number)?.toFloat() ?: 0f,
        chromium = (data["chromium"] as? Number)?.toFloat() ?: 0f,
        molybdenum = (data["molybdenum"] as? Number)?.toFloat() ?: 0f,
        // AI解析フラグ
        isAiAnalyzed = (data["isAiAnalyzed"] as? Boolean) ?: false,
        analyzedAt = (data["analyzedAt"] as? Number)?.toLong(),
        // 使用回数
        usageCount = (data["usageCount"] as? Number)?.toInt() ?: 0,
        lastUsedAt = (data["lastUsedAt"] as? Number)?.toLong(),
        createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L
    )
}
