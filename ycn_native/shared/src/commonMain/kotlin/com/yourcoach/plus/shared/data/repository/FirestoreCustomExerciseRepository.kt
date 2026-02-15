package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.CustomExercise
import com.yourcoach.plus.shared.domain.model.ExerciseCategory
import com.yourcoach.plus.shared.domain.repository.CustomExerciseRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore

/**
 * Firestore カスタム運動リポジトリ実装 (GitLive KMP版)
 */
class FirestoreCustomExerciseRepository : CustomExerciseRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreCustomExerciseRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun customExercisesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("customExercises")

    override suspend fun saveCustomExercise(exercise: CustomExercise): Result<String> {
        return try {
            val docRef = customExercisesCollection(exercise.userId).document
            val exerciseWithId = exercise.copy(id = docRef.id)
            docRef.set(exerciseToMap(exerciseWithId))
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の保存に失敗しました", e))
        }
    }

    override suspend fun getCustomExercises(userId: String): Result<List<CustomExercise>> {
        return try {
            val snapshot = customExercisesCollection(userId)
                .orderBy("usageCount", Direction.DESCENDING)
                .limit(100)
                .get()

            val exercises = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toCustomExercise()
                } catch (e: Exception) {
                    println("FirestoreCustomExerciseRepository: Error parsing exercise ${doc.id}: ${e.message}")
                    null
                }
            }
            Result.success(exercises)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の取得に失敗しました", e))
        }
    }

    override suspend fun searchCustomExercises(userId: String, query: String): Result<List<CustomExercise>> {
        return try {
            val snapshot = customExercisesCollection(userId).get()
            val lowerQuery = query.lowercase()

            val exercises = snapshot.documents
                .mapNotNull { doc ->
                    try {
                        doc.toCustomExercise()
                    } catch (e: Exception) {
                        null
                    }
                }
                .filter { it.name.lowercase().contains(lowerQuery) }
                .sortedByDescending { it.usageCount }

            Result.success(exercises)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の検索に失敗しました", e))
        }
    }

    override suspend fun deleteCustomExercise(userId: String, exerciseId: String): Result<Unit> {
        return try {
            customExercisesCollection(userId).document(exerciseId).delete()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の削除に失敗しました", e))
        }
    }

    override suspend fun incrementUsage(userId: String, exerciseId: String): Result<Unit> {
        return try {
            customExercisesCollection(userId).document(exerciseId).update(
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

    override suspend fun getCustomExerciseByName(userId: String, name: String): Result<CustomExercise?> {
        return try {
            val snapshot = customExercisesCollection(userId)
                .where { "name" equalTo name }
                .get()

            val exercise = snapshot.documents.firstOrNull()?.toCustomExercise()
            Result.success(exercise)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カスタム運動の検索に失敗しました", e))
        }
    }

    // ========== Mapping Functions ==========

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

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toCustomExercise(): CustomExercise {
        val categoryStr = get<String?>("category") ?: "OTHER"
        val category = try {
            ExerciseCategory.valueOf(categoryStr)
        } catch (e: Exception) {
            ExerciseCategory.OTHER
        }

        return CustomExercise(
            id = id,
            userId = get<String>("userId") ?: "",
            name = get<String>("name") ?: "",
            category = category,
            defaultDuration = get<Long?>("defaultDuration")?.toInt(),
            defaultSets = get<Long?>("defaultSets")?.toInt(),
            defaultReps = get<Long?>("defaultReps")?.toInt(),
            defaultWeight = get<Double?>("defaultWeight")?.toFloat(),
            caloriesPerMinute = get<Double?>("caloriesPerMinute")?.toFloat() ?: 5f,
            usageCount = get<Long?>("usageCount")?.toInt() ?: 0,
            lastUsedAt = get<Long?>("lastUsedAt"),
            createdAt = get<Long?>("createdAt") ?: DateUtil.currentTimestamp()
        )
    }
}
