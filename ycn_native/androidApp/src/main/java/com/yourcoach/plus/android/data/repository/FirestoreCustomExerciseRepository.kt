package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.CustomExercise
import com.yourcoach.plus.shared.domain.model.ExerciseCategory
import com.yourcoach.plus.shared.domain.repository.CustomExerciseRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.tasks.await

/**
 * Firestore カスタム運動リポジトリ実装
 */
class FirestoreCustomExerciseRepository : CustomExerciseRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    private fun customExercisesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("customExercises")

    override suspend fun saveCustomExercise(exercise: CustomExercise): Result<String> {
        return try {
            val docRef = customExercisesCollection(exercise.userId).document()
            val exerciseWithId = exercise.copy(id = docRef.id)
            docRef.set(exerciseToMap(exerciseWithId)).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の保存に失敗しました", e))
        }
    }

    override suspend fun getCustomExercises(userId: String): Result<List<CustomExercise>> {
        return try {
            val docs = customExercisesCollection(userId)
                .orderBy("usageCount", Query.Direction.DESCENDING)
                .limit(100)
                .get()
                .await()

            val exercises = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToCustomExercise(it, doc.id) }
            }
            Result.success(exercises)
        } catch (e: Exception) {
            // コレクションが存在しない場合は空リストを返す
            Result.success(emptyList())
        }
    }

    override suspend fun searchCustomExercises(userId: String, query: String): Result<List<CustomExercise>> {
        return try {
            val allExercises = getCustomExercises(userId).getOrDefault(emptyList())
            val filtered = allExercises.filter {
                it.name.contains(query, ignoreCase = true)
            }
            Result.success(filtered)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の検索に失敗しました", e))
        }
    }

    override suspend fun deleteCustomExercise(userId: String, exerciseId: String): Result<Unit> {
        return try {
            customExercisesCollection(userId).document(exerciseId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の削除に失敗しました", e))
        }
    }

    override suspend fun incrementUsage(userId: String, exerciseId: String): Result<Unit> {
        return try {
            val docRef = customExercisesCollection(userId).document(exerciseId)
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

    override suspend fun getCustomExerciseByName(userId: String, name: String): Result<CustomExercise?> {
        return try {
            val docs = customExercisesCollection(userId)
                .whereEqualTo("name", name)
                .limit(1)
                .get()
                .await()

            val exercise = docs.documents.firstOrNull()?.let { doc ->
                doc.data?.let { mapToCustomExercise(it, doc.id) }
            }
            Result.success(exercise)
        } catch (e: Exception) {
            Result.success(null)
        }
    }

    private fun exerciseToMap(exercise: CustomExercise): Map<String, Any?> = mapOf(
        "userId" to exercise.userId,
        "name" to exercise.name,
        "category" to exercise.category.name,
        "defaultDuration" to exercise.defaultDuration,
        "defaultSets" to exercise.defaultSets,
        "defaultReps" to exercise.defaultReps,
        "defaultWeight" to exercise.defaultWeight,
        "caloriesPerMinute" to exercise.caloriesPerMinute,
        "usageCount" to exercise.usageCount,
        "lastUsedAt" to exercise.lastUsedAt,
        "createdAt" to exercise.createdAt
    )

    private fun mapToCustomExercise(data: Map<String, Any>, id: String): CustomExercise = CustomExercise(
        id = id,
        userId = data["userId"] as? String ?: "",
        name = data["name"] as? String ?: "",
        category = try {
            ExerciseCategory.valueOf(data["category"] as? String ?: "OTHER")
        } catch (e: Exception) {
            ExerciseCategory.OTHER
        },
        defaultDuration = (data["defaultDuration"] as? Number)?.toInt(),
        defaultSets = (data["defaultSets"] as? Number)?.toInt(),
        defaultReps = (data["defaultReps"] as? Number)?.toInt(),
        defaultWeight = (data["defaultWeight"] as? Number)?.toFloat(),
        caloriesPerMinute = (data["caloriesPerMinute"] as? Number)?.toFloat() ?: 5f,
        usageCount = (data["usageCount"] as? Number)?.toInt() ?: 0,
        lastUsedAt = (data["lastUsedAt"] as? Number)?.toLong(),
        createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L
    )
}
