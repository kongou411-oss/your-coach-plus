package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutWeeklySummary
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.*

/**
 * Firestore 運動リポジトリ実装 (GitLive KMP版)
 */
class FirestoreWorkoutRepository : WorkoutRepository {

    // iOS対応: lazy初期化でFirebaseアクセスを遅延
    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreWorkoutRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun workoutsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("workouts")

    private fun templatesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("workoutTemplates")

    /**
     * 運動を記録
     */
    override suspend fun addWorkout(workout: Workout): Result<String> {
        return try {
            val docRef = workoutsCollection(workout.userId).document
            val workoutWithId = workout.copy(id = docRef.id)
            docRef.set(workoutToMap(workoutWithId))
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
            workoutsCollection(workout.userId).document(workout.id).set(workoutToMap(workout))
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
            workoutsCollection(userId).document(workoutId).delete()
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
            val doc = workoutsCollection(userId).document(workoutId).get()
            if (doc.exists) {
                Result.success(doc.toWorkout())
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
            val snapshot = workoutsCollection(userId)
                .where { "timestamp" greaterThanOrEqualTo startOfDay }
                .where { "timestamp" lessThan endOfDay }
                .orderBy("timestamp", Direction.ASCENDING)
                .get()

            val workouts = snapshot.documents.mapNotNull { doc ->
                doc.toWorkout()
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
            val snapshot = workoutsCollection(userId)
                .where { "timestamp" greaterThanOrEqualTo startTimestamp }
                .where { "timestamp" lessThan endTimestamp }
                .orderBy("timestamp", Direction.ASCENDING)
                .get()

            val workouts = snapshot.documents.mapNotNull { doc ->
                doc.toWorkout()
            }
            Result.success(workouts)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("運動の取得に失敗しました", e))
        }
    }

    /**
     * 特定日の運動をリアルタイム監視
     */
    override fun observeWorkoutsForDate(userId: String, date: String): Flow<List<Workout>> {
        val (startOfDay, endOfDay) = getDateRange(date)
        return workoutsCollection(userId)
            .where { "timestamp" greaterThanOrEqualTo startOfDay }
            .where { "timestamp" lessThan endOfDay }
            .orderBy("timestamp", Direction.ASCENDING)
            .snapshots
            .map { snapshot ->
                snapshot.documents.mapNotNull { doc ->
                    doc.toWorkout()
                }
            }
    }

    /**
     * 運動テンプレートを保存
     */
    override suspend fun saveWorkoutTemplate(template: WorkoutTemplate): Result<String> {
        return try {
            val docRef = templatesCollection(template.userId).document
            val templateWithId = template.copy(id = docRef.id)
            docRef.set(templateToMap(templateWithId))
            Result.success(docRef.id)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("テンプレートの保存に失敗しました", e))
        }
    }

    override suspend fun updateWorkoutTemplate(template: WorkoutTemplate): Result<Unit> {
        return try {
            templatesCollection(template.userId).document(template.id).set(templateToMap(template))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("テンプレートの更新に失敗しました", e))
        }
    }

    /**
     * 運動テンプレートを取得
     */
    override suspend fun getWorkoutTemplates(userId: String): Result<List<WorkoutTemplate>> {
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
     * 運動テンプレートを削除
     */
    override suspend fun deleteWorkoutTemplate(userId: String, templateId: String): Result<Unit> {
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
            templatesCollection(userId).document(templateId).update(
                mapOf(
                    "usageCount" to FieldValue.increment(1),
                    "lastUsedAt" to DateUtil.currentTimestamp()
                )
            )
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
            val endDate = startDate.plus(7, DateTimeUnit.DAY)
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

    // ===== クエスト生成用（前回記録検索） =====

    /**
     * 特定種目の最新記録を取得
     */
    override suspend fun getLastExerciseRecord(
        userId: String,
        exerciseName: String
    ): Result<ExerciseRecord?> {
        return try {
            val ninetyDaysAgo = DateUtil.currentTimestamp() - (90L * 24 * 60 * 60 * 1000)
            val snapshot = workoutsCollection(userId)
                .where { "timestamp" greaterThan ninetyDaysAgo }
                .orderBy("timestamp", Direction.DESCENDING)
                .limit(100)
                .get()

            val now = DateUtil.currentTimestamp()
            val oneDayMs = 24 * 60 * 60 * 1000L

            for (doc in snapshot.documents) {
                val workout = doc.toWorkout() ?: continue

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

            val ninetyDaysAgo = DateUtil.currentTimestamp() - (90L * 24 * 60 * 60 * 1000)
            val snapshot = workoutsCollection(userId)
                .where { "timestamp" greaterThan ninetyDaysAgo }
                .orderBy("timestamp", Direction.DESCENDING)
                .limit(200)
                .get()

            val now = DateUtil.currentTimestamp()
            val oneDayMs = 24 * 60 * 60 * 1000L

            for (doc in snapshot.documents) {
                if (remaining.isEmpty()) break

                val workout = doc.toWorkout() ?: continue

                for (exercise in workout.exercises) {
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

            val halfYearAgo = DateUtil.currentTimestamp() - (180L * 24 * 60 * 60 * 1000)
            val snapshot = workoutsCollection(userId)
                .where { "timestamp" greaterThan halfYearAgo }
                .orderBy("timestamp", Direction.DESCENDING)
                .get()

            val now = DateUtil.currentTimestamp()
            val oneDayMs = 24 * 60 * 60 * 1000L

            for (doc in snapshot.documents) {
                if (records.size >= limit) break

                val workout = doc.toWorkout() ?: continue

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
        "totalVolume" to exercise.totalVolume,
        "setDetails" to exercise.setDetails.map { setDetailToMap(it) }
    )

    private fun setDetailToMap(set: ExerciseSet): Map<String, Any?> = mapOf(
        "setNumber" to set.setNumber,
        "type" to set.type.name,
        "weight" to set.weight,
        "reps" to set.reps,
        "rpe" to set.rpe,
        "isCompleted" to set.isCompleted,
        "completedAt" to set.completedAt
    )

    @Suppress("UNCHECKED_CAST")
    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toWorkout(): Workout? {
        if (!exists) return null

        // iOS対応: @Serializableで直接デシリアライズ（MealItemと同じパターン）
        val exercises: List<Exercise> = try {
            get<List<Exercise>>("exercises")
        } catch (e: Throwable) {
            // フォールバック: Map<String, Any?>経由でパース
            try {
                val exerciseMaps = get<List<Map<String, Any?>>?>("exercises") ?: emptyList()
                exerciseMaps.map { mapToExercise(it) }
            } catch (e2: Throwable) {
                println("FirestoreWorkoutRepository: exercises parse failed: ${e.message}")
                emptyList()
            }
        }
        return Workout(
            id = id,
            userId = get<String?>("userId") ?: "",
            name = get<String?>("name"),
            type = get<String?>("type")?.let {
                try { WorkoutType.valueOf(it) } catch (e: Exception) { WorkoutType.STRENGTH }
            } ?: WorkoutType.STRENGTH,
            exercises = exercises,
            totalDuration = get<Long?>("totalDuration")?.toInt() ?: 0,
            totalCaloriesBurned = get<Long?>("totalCaloriesBurned")?.toInt() ?: 0,
            intensity = get<String?>("intensity")?.let {
                try { WorkoutIntensity.valueOf(it) } catch (e: Exception) { WorkoutIntensity.MODERATE }
            } ?: WorkoutIntensity.MODERATE,
            note = get<String?>("note"),
            isRoutine = get<Boolean?>("isRoutine") ?: false,
            routineName = get<String?>("routineName"),
            isTemplate = get<Boolean?>("isTemplate") ?: false,
            timestamp = get<Long?>("timestamp") ?: 0L,
            createdAt = get<Long?>("createdAt") ?: 0L
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToExercise(data: Map<String, Any?>): Exercise = Exercise(
        name = data["name"] as? String ?: "",
        category = (data["category"] as? String)?.let {
            try { ExerciseCategory.valueOf(it) } catch (e: Exception) { ExerciseCategory.OTHER }
        } ?: ExerciseCategory.OTHER,
        sets = (data["sets"] as? Number)?.toInt(),
        reps = (data["reps"] as? Number)?.toInt(),
        weight = (data["weight"] as? Number)?.toFloat(),
        duration = (data["duration"] as? Number)?.toInt(),
        distance = (data["distance"] as? Number)?.toFloat(),
        caloriesBurned = (data["caloriesBurned"] as? Number)?.toInt() ?: 0,
        warmupSets = (data["warmupSets"] as? Number)?.toInt() ?: 0,
        mainSets = (data["mainSets"] as? Number)?.toInt() ?: 0,
        totalVolume = (data["totalVolume"] as? Number)?.toInt() ?: 0,
        setDetails = (data["setDetails"] as? List<Map<String, Any?>>)?.map { mapToSetDetail(it) } ?: emptyList()
    )

    private fun mapToSetDetail(data: Map<String, Any?>): ExerciseSet = ExerciseSet(
        setNumber = (data["setNumber"] as? Number)?.toInt() ?: 0,
        type = try { SetType.valueOf(data["type"] as? String ?: "MAIN") } catch (e: Exception) { SetType.MAIN },
        weight = (data["weight"] as? Number)?.toFloat() ?: 0f,
        reps = (data["reps"] as? Number)?.toInt() ?: 0,
        rpe = (data["rpe"] as? Number)?.toInt(),
        isCompleted = data["isCompleted"] as? Boolean ?: false,
        completedAt = (data["completedAt"] as? Number)?.toLong()
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

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toTemplate(): WorkoutTemplate? {
        if (!exists) return null

        // @Serializable Exerciseを直接使用（Map<String, Any?>はKotlin/Nativeで動作しないため）
        val exercises = try {
            get<List<Exercise>>("exercises")
        } catch (e: Throwable) {
            println("FirestoreWorkoutRepository: Could not parse template exercises: ${e.message}")
            emptyList()
        }
        return WorkoutTemplate(
            id = id,
            userId = get<String?>("userId") ?: "",
            name = get<String?>("name") ?: "",
            type = get<String?>("type")?.let {
                try { WorkoutType.valueOf(it) } catch (e: Exception) { WorkoutType.STRENGTH }
            } ?: WorkoutType.STRENGTH,
            exercises = exercises,
            estimatedDuration = get<Long?>("estimatedDuration")?.toInt() ?: 0,
            estimatedCalories = get<Long?>("estimatedCalories")?.toInt() ?: 0,
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
