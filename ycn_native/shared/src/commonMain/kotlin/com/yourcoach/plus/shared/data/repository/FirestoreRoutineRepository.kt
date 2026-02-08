package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.datetime.Clock

/**
 * Firestore実装のルーティンリポジトリ (KMP共通)
 */
class FirestoreRoutineRepository : RoutineRepository {

    private val firestore by lazy { Firebase.firestore }

    // ========== パターン管理 ==========

    override suspend fun getPatterns(userId: String): Result<List<RoutinePattern>> = runCatching {
        val snapshot = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .orderBy("createdAt", Direction.DESCENDING)
            .get()

        snapshot.documents.mapNotNull { doc ->
            try {
                mapDocToPattern(doc)
            } catch (e: Throwable) {
                null
            }
        }
    }

    override fun observePatterns(userId: String): Flow<List<RoutinePattern>> = flow {
        firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .orderBy("createdAt", Direction.DESCENDING)
            .snapshots.collect { snapshot ->
                val patterns = snapshot.documents.mapNotNull { doc ->
                    try {
                        mapDocToPattern(doc)
                    } catch (e: Throwable) {
                        null
                    }
                }
                emit(patterns)
            }
    }

    override suspend fun getActivePattern(userId: String): Result<RoutinePattern?> = runCatching {
        val snapshot = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .where { "isActive" equalTo true }
            .limit(1)
            .get()

        snapshot.documents.firstOrNull()?.let { doc ->
            try {
                mapDocToPattern(doc)
            } catch (e: Throwable) {
                null
            }
        }
    }

    override fun observeActivePattern(userId: String): Flow<RoutinePattern?> = flow {
        firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .where { "isActive" equalTo true }
            .limit(1)
            .snapshots.collect { snapshot ->
                val pattern = snapshot.documents.firstOrNull()?.let { doc ->
                    try {
                        mapDocToPattern(doc)
                    } catch (e: Throwable) {
                        null
                    }
                }
                emit(pattern)
            }
    }

    override suspend fun savePattern(userId: String, pattern: RoutinePattern): Result<String> = runCatching {
        val patternId = pattern.id.ifEmpty { generateUUID() }
        val now = Clock.System.now().toEpochMilliseconds()

        val data = patternToMap(pattern.copy(
            id = patternId,
            userId = userId,
            createdAt = if (pattern.createdAt == 0L) now else pattern.createdAt,
            updatedAt = now
        ))

        firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .document(patternId)
            .set(data)

        patternId
    }

    override suspend fun deletePattern(userId: String, patternId: String): Result<Unit> = runCatching {
        firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .document(patternId)
            .delete()
    }

    override suspend fun setActivePattern(userId: String, patternId: String): Result<Unit> = runCatching {
        // 既存のアクティブパターンを非アクティブに
        val activePatterns = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .where { "isActive" equalTo true }
            .get()

        // バッチ書き込み
        firestore.batch().apply {
            activePatterns.documents.forEach { doc ->
                update(doc.reference, "isActive" to false)
            }
            update(
                firestore.collection("users")
                    .document(userId)
                    .collection("routinePatterns")
                    .document(patternId),
                "isActive" to true,
                "updatedAt" to Clock.System.now().toEpochMilliseconds()
            )
        }.commit()
    }

    // ========== 今日のルーティン ==========

    override suspend fun getRoutineForDate(userId: String, date: String): Result<RoutineDay?> = runCatching {
        val pattern = getActivePattern(userId).getOrNull() ?: return@runCatching null
        val dayIndex = calculateDayIndex(pattern, date)
        pattern.days.getOrNull(dayIndex)
    }

    override fun observeTodayRoutine(userId: String): Flow<RoutineDay?> = flow {
        observeActivePattern(userId).collect { pattern ->
            if (pattern == null) {
                emit(null)
            } else {
                val today = DateUtil.todayString()
                val dayIndex = calculateDayIndex(pattern, today)
                emit(pattern.days.getOrNull(dayIndex))
            }
        }
    }

    override suspend fun isRestDay(userId: String, date: String): Result<Boolean> = runCatching {
        val routineDay = getRoutineForDate(userId, date).getOrNull()
        routineDay?.isRestDay ?: false
    }

    // ========== ルーティン実行 (未実装 - 共通モジュールでは使用しない) ==========

    override suspend fun executeRoutine(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int> = Result.success(0)

    override suspend fun executeRoutineMeals(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int> = Result.success(0)

    override suspend fun executeRoutineWorkouts(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int> = Result.success(0)

    // ========== プリセット ==========

    override suspend fun getPresetPatterns(): Result<List<RoutinePattern>> = runCatching {
        emptyList() // プリセットはプラットフォーム固有の実装で提供
    }

    override suspend fun copyPresetToUser(
        userId: String,
        presetId: String,
        customName: String?
    ): Result<String> = Result.failure(NotImplementedError("プリセット機能は未実装です"))

    // ========== ヘルパー関数 ==========

    private fun generateUUID(): String {
        // KMP対応のUUID生成
        return (0..31).map {
            "0123456789abcdef"[(0..15).random()]
        }.joinToString("").let { hex ->
            "${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}"
        }
    }

    private fun calculateDayIndex(pattern: RoutinePattern, date: String): Int {
        val patternStartDate = pattern.createdAt
        val targetDate = DateUtil.dateStringToTimestamp(date)
        val daysDiff = ((targetDate - patternStartDate) / (24 * 60 * 60 * 1000)).toInt()
        val daysInPattern = pattern.days.size.coerceAtLeast(1)
        return ((daysDiff % daysInPattern) + daysInPattern) % daysInPattern
    }

    private fun patternToMap(pattern: RoutinePattern): Map<String, Any?> = mapOf(
        "userId" to pattern.userId,
        "name" to pattern.name,
        "description" to pattern.description,
        "days" to pattern.days.map { dayToMap(it) },
        "isActive" to pattern.isActive,
        "isPreset" to pattern.isPreset,
        "presetCategory" to pattern.presetCategory,
        "createdAt" to pattern.createdAt,
        "updatedAt" to pattern.updatedAt
    )

    private fun dayToMap(day: RoutineDay): Map<String, Any?> = mapOf(
        "id" to day.id,
        "dayNumber" to day.dayNumber,
        "name" to day.name,
        "splitType" to day.splitType,
        "isRestDay" to day.isRestDay,
        "meals" to day.meals.map { mealTemplateToMap(it) },
        "workouts" to day.workouts.map { workoutTemplateToMap(it) }
    )

    private fun mealTemplateToMap(meal: RoutineMealTemplate): Map<String, Any?> = mapOf(
        "id" to meal.id,
        "templateId" to meal.templateId,
        "templateName" to meal.templateName,
        "mealType" to meal.mealType,
        "items" to meal.items.map { mealItemToMap(it) },
        "totalCalories" to meal.totalCalories,
        "totalProtein" to meal.totalProtein,
        "totalCarbs" to meal.totalCarbs,
        "totalFat" to meal.totalFat
    )

    private fun mealItemToMap(item: RoutineMealItem): Map<String, Any?> = mapOf(
        "id" to item.id,
        "name" to item.name,
        "amount" to item.amount,
        "unit" to item.unit,
        "calories" to item.calories,
        "protein" to item.protein,
        "carbs" to item.carbs,
        "fat" to item.fat,
        "fiber" to item.fiber,
        "sugar" to item.sugar,
        "sodium" to item.sodium,
        "saturatedFat" to item.saturatedFat,
        "cholesterol" to item.cholesterol
    )

    private fun workoutTemplateToMap(workout: RoutineWorkoutTemplate): Map<String, Any?> = mapOf(
        "id" to workout.id,
        "templateId" to workout.templateId,
        "templateName" to workout.templateName,
        "exercises" to workout.exercises.map { exerciseToMap(it) },
        "estimatedDuration" to workout.estimatedDuration,
        "estimatedCaloriesBurned" to workout.estimatedCaloriesBurned
    )

    private fun exerciseToMap(exercise: RoutineExercise): Map<String, Any?> = mapOf(
        "id" to exercise.id,
        "name" to exercise.name,
        "category" to exercise.category,
        "sets" to exercise.sets,
        "reps" to exercise.reps,
        "weight" to exercise.weight,
        "duration" to exercise.duration,
        "restSeconds" to exercise.restSeconds,
        "notes" to exercise.notes
    )

    /**
     * DocumentSnapshotからRoutinePatternを生成（iOS対応）
     * doc.data()を使わずに個別フィールドをget<>()で取得
     */
    private fun mapDocToPattern(doc: dev.gitlive.firebase.firestore.DocumentSnapshot): RoutinePattern {
        val id = doc.id
        val userId = doc.get<String?>("userId") ?: ""
        val name = doc.get<String?>("name") ?: ""
        val description = doc.get<String?>("description") ?: ""
        val isActive = doc.get<Boolean?>("isActive") ?: false
        val isPreset = doc.get<Boolean?>("isPreset") ?: false
        val presetCategory = doc.get<String?>("presetCategory")
        val createdAt = doc.get<Long?>("createdAt") ?: 0L
        val updatedAt = doc.get<Long?>("updatedAt") ?: 0L

        // @Serializable domain classes を直接使用（Map<String, Any?>はKotlin/Nativeで動作しないため）
        val days = try {
            doc.get<List<RoutineDay>>("days")
        } catch (e: Throwable) {
            emptyList()
        }

        return RoutinePattern(
            id = id,
            userId = userId,
            name = name,
            description = description,
            days = days,
            isActive = isActive,
            isPreset = isPreset,
            presetCategory = presetCategory,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToPattern(id: String, data: Map<String, Any?>): RoutinePattern {
        val daysData = data["days"] as? List<Map<String, Any?>> ?: emptyList()
        return RoutinePattern(
            id = id,
            userId = data["userId"] as? String ?: "",
            name = data["name"] as? String ?: "",
            description = data["description"] as? String ?: "",
            days = daysData.map { mapToDay(it) },
            isActive = data["isActive"] as? Boolean ?: false,
            isPreset = data["isPreset"] as? Boolean ?: false,
            presetCategory = data["presetCategory"] as? String,
            createdAt = (data["createdAt"] as? Number)?.toLong() ?: 0,
            updatedAt = (data["updatedAt"] as? Number)?.toLong() ?: 0
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToDay(data: Map<String, Any?>): RoutineDay {
        val mealsData = data["meals"] as? List<Map<String, Any?>> ?: emptyList()
        val workoutsData = data["workouts"] as? List<Map<String, Any?>> ?: emptyList()
        return RoutineDay(
            id = data["id"] as? String ?: "",
            dayNumber = (data["dayNumber"] as? Number)?.toInt() ?: 0,
            name = data["name"] as? String ?: "",
            splitType = data["splitType"] as? String ?: "",
            isRestDay = data["isRestDay"] as? Boolean ?: false,
            meals = mealsData.map { mapToMealTemplate(it) },
            workouts = workoutsData.map { mapToWorkoutTemplate(it) }
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToMealTemplate(data: Map<String, Any?>): RoutineMealTemplate {
        val itemsData = data["items"] as? List<Map<String, Any?>> ?: emptyList()
        return RoutineMealTemplate(
            id = data["id"] as? String ?: "",
            templateId = data["templateId"] as? String ?: "",
            templateName = data["templateName"] as? String ?: "",
            mealType = data["mealType"] as? String ?: "",
            items = itemsData.map { mapToMealItem(it) },
            totalCalories = (data["totalCalories"] as? Number)?.toInt() ?: 0,
            totalProtein = (data["totalProtein"] as? Number)?.toFloat() ?: 0f,
            totalCarbs = (data["totalCarbs"] as? Number)?.toFloat() ?: 0f,
            totalFat = (data["totalFat"] as? Number)?.toFloat() ?: 0f
        )
    }

    private fun mapToMealItem(data: Map<String, Any?>): RoutineMealItem = RoutineMealItem(
        id = data["id"] as? String ?: "",
        name = data["name"] as? String ?: "",
        amount = (data["amount"] as? Number)?.toFloat() ?: 0f,
        unit = data["unit"] as? String ?: "g",
        calories = (data["calories"] as? Number)?.toInt() ?: 0,
        protein = (data["protein"] as? Number)?.toFloat() ?: 0f,
        carbs = (data["carbs"] as? Number)?.toFloat() ?: 0f,
        fat = (data["fat"] as? Number)?.toFloat() ?: 0f,
        fiber = (data["fiber"] as? Number)?.toFloat() ?: 0f,
        sugar = (data["sugar"] as? Number)?.toFloat() ?: 0f,
        sodium = (data["sodium"] as? Number)?.toFloat() ?: 0f,
        saturatedFat = (data["saturatedFat"] as? Number)?.toFloat() ?: 0f,
        cholesterol = (data["cholesterol"] as? Number)?.toFloat() ?: 0f
    )

    @Suppress("UNCHECKED_CAST")
    private fun mapToWorkoutTemplate(data: Map<String, Any?>): RoutineWorkoutTemplate {
        val exercisesData = data["exercises"] as? List<Map<String, Any?>> ?: emptyList()
        return RoutineWorkoutTemplate(
            id = data["id"] as? String ?: "",
            templateId = data["templateId"] as? String ?: "",
            templateName = data["templateName"] as? String ?: "",
            exercises = exercisesData.map { mapToExercise(it) },
            estimatedDuration = (data["estimatedDuration"] as? Number)?.toInt() ?: 0,
            estimatedCaloriesBurned = (data["estimatedCaloriesBurned"] as? Number)?.toInt() ?: 0
        )
    }

    private fun mapToExercise(data: Map<String, Any?>): RoutineExercise = RoutineExercise(
        id = data["id"] as? String ?: "",
        name = data["name"] as? String ?: "",
        category = data["category"] as? String ?: "",
        sets = (data["sets"] as? Number)?.toInt() ?: 0,
        reps = (data["reps"] as? Number)?.toInt() ?: 0,
        weight = (data["weight"] as? Number)?.toFloat() ?: 0f,
        duration = (data["duration"] as? Number)?.toInt() ?: 0,
        restSeconds = (data["restSeconds"] as? Number)?.toInt() ?: 60,
        notes = data["notes"] as? String ?: ""
    )
}
