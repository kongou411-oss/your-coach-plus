package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.Exercise
import com.yourcoach.plus.shared.domain.model.ExerciseCategory
import com.yourcoach.plus.shared.domain.model.ExerciseRecord
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.model.WorkoutIntensity
import com.yourcoach.plus.shared.domain.model.WorkoutTemplate
import com.yourcoach.plus.shared.domain.model.WorkoutType
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutWeeklySummary
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.ZoneId

/**
 * Firestore 運動リポジトリ実装
 */
class FirestoreWorkoutRepository : WorkoutRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()

    private fun workoutsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("workouts")

    private fun templatesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("workoutTemplates")

    /**
     * 運動を記録
     */
    override suspend fun addWorkout(workout: Workout): Result<String> {
        return try {
            val docRef = workoutsCollection(workout.userId).document()
            val workoutWithId = workout.copy(id = docRef.id)
            docRef.set(workoutToMap(workoutWithId)).await()
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("運動の記録に失敗しました", e))
        }
    }

    /**
     * 運動を更新
     */
    override suspend fun updateWorkout(workout: Workout): Result<Unit> {
        return try {
            workoutsCollection(workout.userId).document(workout.id).set(workoutToMap(workout)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("運動の更新に失敗しました", e))
        }
    }

    /**
     * 運動を削除
     */
    override suspend fun deleteWorkout(userId: String, workoutId: String): Result<Unit> {
        return try {
            workoutsCollection(userId).document(workoutId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("運動の削除に失敗しました", e))
        }
    }

    /**
     * 特定の運動を取得
     */
    override suspend fun getWorkout(userId: String, workoutId: String): Result<Workout?> {
        return try {
            val doc = workoutsCollection(userId).document(workoutId).get().await()
            if (doc.exists()) {
                Result.success(mapToWorkout(doc.data!!, doc.id))
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("運動の取得に失敗しました", e))
        }
    }

    /**
     * 特定日の運動を取得
     */
    override suspend fun getWorkoutsForDate(userId: String, date: String): Result<List<Workout>> {
        return try {
            val (startOfDay, endOfDay) = getDateRange(date)
            val docs = workoutsCollection(userId)
                .whereGreaterThanOrEqualTo("timestamp", startOfDay)
                .whereLessThan("timestamp", endOfDay)
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()

            val workouts = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToWorkout(it, doc.id) }
            }
            Result.success(workouts)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("運動の取得に失敗しました", e))
        }
    }

    /**
     * 日付範囲の運動を取得
     */
    override suspend fun getWorkoutsInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<Workout>> {
        return try {
            val startTimestamp = getDateRange(startDate).first
            val endTimestamp = getDateRange(endDate).second
            val docs = workoutsCollection(userId)
                .whereGreaterThanOrEqualTo("timestamp", startTimestamp)
                .whereLessThan("timestamp", endTimestamp)
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()

            val workouts = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToWorkout(it, doc.id) }
            }
            Result.success(workouts)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("運動の取得に失敗しました", e))
        }
    }

    /**
     * 特定日の運動をリアルタイム監視
     */
    override fun observeWorkoutsForDate(userId: String, date: String): Flow<List<Workout>> = callbackFlow {
        val (startOfDay, endOfDay) = getDateRange(date)
        val listener = workoutsCollection(userId)
            .whereGreaterThanOrEqualTo("timestamp", startOfDay)
            .whereLessThan("timestamp", endOfDay)
            .orderBy("timestamp", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val workouts = snapshot?.documents?.mapNotNull { doc ->
                    doc.data?.let { mapToWorkout(it, doc.id) }
                } ?: emptyList()
                trySend(workouts)
            }
        awaitClose { listener.remove() }
    }

    /**
     * 運動テンプレートを保存
     */
    override suspend fun saveWorkoutTemplate(template: WorkoutTemplate): Result<String> {
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
     * 運動テンプレートを取得
     */
    override suspend fun getWorkoutTemplates(userId: String): Result<List<WorkoutTemplate>> {
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
            android.util.Log.w("FirestoreWorkoutRepository", "getWorkoutTemplates failed: ${e.message}")
            Result.success(emptyList())
        }
    }

    /**
     * 運動テンプレートを削除
     */
    override suspend fun deleteWorkoutTemplate(userId: String, templateId: String): Result<Unit> {
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
     * 週間運動サマリーを取得
     */
    override suspend fun getWeeklySummary(userId: String, weekStartDate: String): Result<WorkoutWeeklySummary> {
        return try {
            val startDate = LocalDate.parse(weekStartDate)
            val endDate = startDate.plusDays(7)
            val workoutsResult = getWorkoutsInRange(userId, weekStartDate, endDate.toString())

            workoutsResult.map { workouts ->
                val totalWorkouts = workouts.size
                val totalDuration = workouts.sumOf { it.totalDuration }
                val totalCaloriesBurned = workouts.sumOf { it.totalCaloriesBurned }
                val workoutsByType = workouts.groupingBy { it.type.name }.eachCount()
                val averageIntensity = if (workouts.isNotEmpty()) {
                    workouts.map { it.intensity.ordinal }.average().toFloat()
                } else {
                    0f
                }

                WorkoutWeeklySummary(
                    totalWorkouts = totalWorkouts,
                    totalDuration = totalDuration,
                    totalCaloriesBurned = totalCaloriesBurned,
                    workoutsByType = workoutsByType,
                    averageIntensity = averageIntensity
                )
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("週間サマリーの取得に失敗しました", e))
        }
    }

    // ===== ヘルパー関数 =====

    private fun workoutToMap(workout: Workout): Map<String, Any?> = mapOf(
        "userId" to workout.userId,
        "name" to workout.name,
        "type" to workout.type.name,
        "exercises" to workout.exercises.map { exerciseToMap(it) },
        "totalDuration" to workout.totalDuration,
        "totalCaloriesBurned" to workout.totalCaloriesBurned,
        "intensity" to workout.intensity.name,
        "note" to workout.note,
        "isRoutine" to workout.isRoutine,
        "routineName" to workout.routineName,
        "isTemplate" to workout.isTemplate,
        "timestamp" to workout.timestamp,
        "createdAt" to workout.createdAt
    )

    private fun exerciseToMap(exercise: Exercise): Map<String, Any?> = mapOf(
        "name" to exercise.name,
        "category" to exercise.category.name,
        "sets" to exercise.sets,
        "reps" to exercise.reps,
        "weight" to exercise.weight,
        "duration" to exercise.duration,
        "distance" to exercise.distance,
        "caloriesBurned" to exercise.caloriesBurned,
        "warmupSets" to exercise.warmupSets,
        "mainSets" to exercise.mainSets,
        "totalVolume" to exercise.totalVolume
    )

    @Suppress("UNCHECKED_CAST")
    private fun mapToWorkout(data: Map<String, Any>, id: String): Workout {
        val exercisesList = (data["exercises"] as? List<Map<String, Any>>) ?: emptyList()
        return Workout(
            id = id,
            userId = data["userId"] as? String ?: "",
            name = data["name"] as? String,
            type = WorkoutType.valueOf(data["type"] as? String ?: "STRENGTH"),
            exercises = exercisesList.map { mapToExercise(it) },
            totalDuration = (data["totalDuration"] as? Number)?.toInt() ?: 0,
            totalCaloriesBurned = (data["totalCaloriesBurned"] as? Number)?.toInt() ?: 0,
            intensity = WorkoutIntensity.valueOf(data["intensity"] as? String ?: "MODERATE"),
            note = data["note"] as? String,
            isRoutine = data["isRoutine"] as? Boolean ?: false,
            routineName = data["routineName"] as? String,
            isTemplate = data["isTemplate"] as? Boolean ?: false,
            timestamp = (data["timestamp"] as? Number)?.toLong() ?: 0L,
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0L
        )
    }

    private fun mapToExercise(data: Map<String, Any>): Exercise = Exercise(
        name = data["name"] as? String ?: "",
        category = ExerciseCategory.valueOf(data["category"] as? String ?: "OTHER"),
        sets = (data["sets"] as? Number)?.toInt(),
        reps = (data["reps"] as? Number)?.toInt(),
        weight = (data["weight"] as? Number)?.toFloat(),
        duration = (data["duration"] as? Number)?.toInt(),
        distance = (data["distance"] as? Number)?.toFloat(),
        caloriesBurned = (data["caloriesBurned"] as? Number)?.toInt() ?: 0,
        warmupSets = (data["warmupSets"] as? Number)?.toInt() ?: 0,
        mainSets = (data["mainSets"] as? Number)?.toInt() ?: 0,
        totalVolume = (data["totalVolume"] as? Number)?.toInt() ?: 0
    )

    private fun templateToMap(template: WorkoutTemplate): Map<String, Any?> = mapOf(
        "userId" to template.userId,
        "name" to template.name,
        "type" to template.type.name,
        "exercises" to template.exercises.map { exerciseToMap(it) },
        "estimatedDuration" to template.estimatedDuration,
        "estimatedCalories" to template.estimatedCalories,
        "usageCount" to template.usageCount,
        "lastUsedAt" to template.lastUsedAt,
        "createdAt" to template.createdAt
    )

    @Suppress("UNCHECKED_CAST")
    private fun mapToTemplate(data: Map<String, Any>, id: String): WorkoutTemplate {
        val exercisesList = (data["exercises"] as? List<Map<String, Any>>) ?: emptyList()
        return WorkoutTemplate(
            id = id,
            userId = data["userId"] as? String ?: "",
            name = data["name"] as? String ?: "",
            type = WorkoutType.valueOf(data["type"] as? String ?: "STRENGTH"),
            exercises = exercisesList.map { mapToExercise(it) },
            estimatedDuration = (data["estimatedDuration"] as? Number)?.toInt() ?: 0,
            estimatedCalories = (data["estimatedCalories"] as? Number)?.toInt() ?: 0,
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

    // ===== クエスト生成用（前回記録検索） =====

    /**
     * 特定種目の最新記録を取得
     */
    override suspend fun getLastExerciseRecord(
        userId: String,
        exerciseName: String
    ): Result<ExerciseRecord?> {
        return try {
            // 直近90日分のワークアウトを検索（パフォーマンス考慮）
            val ninetyDaysAgo = System.currentTimeMillis() - (90L * 24 * 60 * 60 * 1000)
            val docs = workoutsCollection(userId)
                .whereGreaterThan("timestamp", ninetyDaysAgo)
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .limit(100) // 最大100件
                .get()
                .await()

            val now = System.currentTimeMillis()
            val oneDayMs = 24 * 60 * 60 * 1000L

            // 各ワークアウトから該当種目を探す
            for (doc in docs.documents) {
                val data = doc.data ?: continue
                val workout = mapToWorkout(data, doc.id)

                // 種目名で検索（部分一致も考慮）
                val exercise = workout.exercises.find {
                    it.name.equals(exerciseName, ignoreCase = true) ||
                    it.name.contains(exerciseName, ignoreCase = true)
                }

                if (exercise != null) {
                    val weight = exercise.weight
                    if (weight != null && weight > 0f) {
                        val daysSince = ((now - workout.timestamp) / oneDayMs).toInt()
                        val e1rm = ExerciseRecord.calculateE1RM(weight, exercise.reps)

                        return Result.success(
                            ExerciseRecord(
                                exerciseName = exercise.name,
                                category = exercise.category,
                                weight = weight,
                                reps = exercise.reps,
                                sets = exercise.sets,
                                mainSets = exercise.mainSets,
                                totalVolume = exercise.totalVolume,
                                estimatedOneRepMax = e1rm,
                                recordDate = workout.timestamp,
                                daysSinceRecord = daysSince
                            )
                        )
                    }
                }
            }

            // 記録が見つからない場合
            Result.success(null)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("種目記録の取得に失敗しました", e))
        }
    }

    /**
     * 複数種目の最新記録を一括取得
     */
    override suspend fun getLastExerciseRecords(
        userId: String,
        exerciseNames: List<String>
    ): Result<Map<String, ExerciseRecord>> {
        return try {
            val results = mutableMapOf<String, ExerciseRecord>()
            val remaining = exerciseNames.toMutableSet()

            // 直近90日分のワークアウトを検索
            val ninetyDaysAgo = System.currentTimeMillis() - (90L * 24 * 60 * 60 * 1000)
            val docs = workoutsCollection(userId)
                .whereGreaterThan("timestamp", ninetyDaysAgo)
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .limit(200) // 複数種目なので多めに取得
                .get()
                .await()

            val now = System.currentTimeMillis()
            val oneDayMs = 24 * 60 * 60 * 1000L

            for (doc in docs.documents) {
                if (remaining.isEmpty()) break

                val data = doc.data ?: continue
                val workout = mapToWorkout(data, doc.id)

                for (exercise in workout.exercises) {
                    // まだ見つかっていない種目をチェック
                    val matchedName = remaining.find { targetName ->
                        exercise.name.equals(targetName, ignoreCase = true) ||
                        exercise.name.contains(targetName, ignoreCase = true)
                    }

                    if (matchedName != null) {
                        val weight = exercise.weight
                        if (weight != null && weight > 0f) {
                            val daysSince = ((now - workout.timestamp) / oneDayMs).toInt()
                            val e1rm = ExerciseRecord.calculateE1RM(weight, exercise.reps)

                            results[matchedName] = ExerciseRecord(
                                exerciseName = exercise.name,
                                category = exercise.category,
                                weight = weight,
                                reps = exercise.reps,
                                sets = exercise.sets,
                                mainSets = exercise.mainSets,
                                totalVolume = exercise.totalVolume,
                                estimatedOneRepMax = e1rm,
                                recordDate = workout.timestamp,
                                daysSinceRecord = daysSince
                            )
                            remaining.remove(matchedName)
                        }
                    }
                }
            }

            Result.success(results)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("種目記録の一括取得に失敗しました", e))
        }
    }

    /**
     * 特定種目の記録履歴を取得（グラフ用）
     */
    override suspend fun getExerciseHistory(
        userId: String,
        exerciseName: String,
        limit: Int
    ): Result<List<ExerciseRecord>> {
        return try {
            val records = mutableListOf<ExerciseRecord>()

            // 直近180日分を検索
            val halfYearAgo = System.currentTimeMillis() - (180L * 24 * 60 * 60 * 1000)
            val docs = workoutsCollection(userId)
                .whereGreaterThan("timestamp", halfYearAgo)
                .orderBy("timestamp", Query.Direction.DESCENDING)
                .get()
                .await()

            val now = System.currentTimeMillis()
            val oneDayMs = 24 * 60 * 60 * 1000L

            for (doc in docs.documents) {
                if (records.size >= limit) break

                val data = doc.data ?: continue
                val workout = mapToWorkout(data, doc.id)

                val exercise = workout.exercises.find {
                    it.name.equals(exerciseName, ignoreCase = true) ||
                    it.name.contains(exerciseName, ignoreCase = true)
                }

                if (exercise != null) {
                    val weight = exercise.weight
                    if (weight != null && weight > 0f) {
                        val daysSince = ((now - workout.timestamp) / oneDayMs).toInt()
                        val e1rm = ExerciseRecord.calculateE1RM(weight, exercise.reps)

                        records.add(
                            ExerciseRecord(
                                exerciseName = exercise.name,
                                category = exercise.category,
                                weight = weight,
                                reps = exercise.reps,
                                sets = exercise.sets,
                                mainSets = exercise.mainSets,
                                totalVolume = exercise.totalVolume,
                                estimatedOneRepMax = e1rm,
                                recordDate = workout.timestamp,
                                daysSinceRecord = daysSince
                            )
                        )
                    }
                }
            }

            Result.success(records)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("種目履歴の取得に失敗しました", e))
        }
    }
}
