package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.MealRepository
import com.yourcoach.plus.shared.domain.repository.RoutineRepository
import com.yourcoach.plus.shared.domain.repository.WorkoutRepository
import com.yourcoach.plus.shared.util.DateUtil
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import java.util.UUID

/**
 * Firestore実装のルーティンリポジトリ
 */
class FirestoreRoutineRepository(
    private val firestore: FirebaseFirestore,
    private val mealRepository: MealRepository,
    private val workoutRepository: WorkoutRepository
) : RoutineRepository {

    // ========== パターン管理 ==========

    override suspend fun getPatterns(userId: String): Result<List<RoutinePattern>> = runCatching {
        val snapshot = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get()
            .await()

        snapshot.documents.mapNotNull { doc ->
            mapToPattern(doc.id, doc.data ?: return@mapNotNull null)
        }
    }

    override fun observePatterns(userId: String): Flow<List<RoutinePattern>> = callbackFlow {
        val listener = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val patterns = snapshot?.documents?.mapNotNull { doc ->
                    mapToPattern(doc.id, doc.data ?: return@mapNotNull null)
                } ?: emptyList()
                trySend(patterns)
            }
        awaitClose { listener.remove() }
    }

    override suspend fun getActivePattern(userId: String): Result<RoutinePattern?> = runCatching {
        val snapshot = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .whereEqualTo("isActive", true)
            .limit(1)
            .get()
            .await()

        snapshot.documents.firstOrNull()?.let { doc ->
            mapToPattern(doc.id, doc.data ?: return@let null)
        }
    }

    override fun observeActivePattern(userId: String): Flow<RoutinePattern?> = callbackFlow {
        val listener = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .whereEqualTo("isActive", true)
            .limit(1)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val pattern = snapshot?.documents?.firstOrNull()?.let { doc ->
                    mapToPattern(doc.id, doc.data ?: return@let null)
                }
                trySend(pattern)
            }
        awaitClose { listener.remove() }
    }

    override suspend fun savePattern(userId: String, pattern: RoutinePattern): Result<String> = runCatching {
        val patternId = pattern.id.ifEmpty { UUID.randomUUID().toString() }
        val now = System.currentTimeMillis()

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
            .await()

        patternId
    }

    override suspend fun deletePattern(userId: String, patternId: String): Result<Unit> = runCatching {
        firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .document(patternId)
            .delete()
            .await()
    }

    override suspend fun setActivePattern(userId: String, patternId: String): Result<Unit> = runCatching {
        // 既存のアクティブパターンを非アクティブに
        val activePatterns = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .whereEqualTo("isActive", true)
            .get()
            .await()

        val batch = firestore.batch()
        activePatterns.documents.forEach { doc ->
            batch.update(doc.reference, "isActive", false)
        }

        // 新しいパターンをアクティブに
        batch.update(
            firestore.collection("users")
                .document(userId)
                .collection("routinePatterns")
                .document(patternId),
            mapOf(
                "isActive" to true,
                "updatedAt" to System.currentTimeMillis()
            )
        )

        batch.commit().await()
    }

    // ========== 今日のルーティン ==========

    override suspend fun getRoutineForDate(userId: String, date: String): Result<RoutineDay?> = runCatching {
        val pattern = getActivePattern(userId).getOrNull() ?: return@runCatching null

        // 週の何日目かを計算（パターン開始日からの経過日数 % 7）
        val dayIndex = calculateDayIndex(pattern, date)
        pattern.days.getOrNull(dayIndex)
    }

    override fun observeTodayRoutine(userId: String): Flow<RoutineDay?> {
        return observeActivePattern(userId).map { pattern ->
            if (pattern == null) return@map null
            val today = DateUtil.todayString()
            val dayIndex = calculateDayIndex(pattern, today)
            pattern.days.getOrNull(dayIndex)
        }
    }

    override suspend fun isRestDay(userId: String, date: String): Result<Boolean> = runCatching {
        val routineDay = getRoutineForDate(userId, date).getOrNull()
        routineDay?.isRestDay ?: false
    }

    // ========== ルーティン実行 ==========

    override suspend fun executeRoutine(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int> = runCatching {
        var count = 0

        // 食事を記録
        count += executeRoutineMeals(userId, date, routineDay).getOrDefault(0)

        // 運動を記録
        count += executeRoutineWorkouts(userId, date, routineDay).getOrDefault(0)

        count
    }

    override suspend fun executeRoutineMeals(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int> = runCatching {
        var count = 0
        val now = System.currentTimeMillis()
        val timestamp = DateUtil.dateStringToTimestamp(date)

        routineDay.meals.forEach { mealTemplate ->
            val mealType = when (mealTemplate.mealType.lowercase()) {
                "breakfast" -> MealType.BREAKFAST
                "lunch" -> MealType.LUNCH
                "dinner" -> MealType.DINNER
                "snack" -> MealType.SNACK
                "supplement" -> MealType.SUPPLEMENT
                else -> MealType.SNACK
            }

            val meal = Meal(
                id = UUID.randomUUID().toString(),
                userId = userId,
                name = mealTemplate.templateName,
                type = mealType,
                items = mealTemplate.items.map { item ->
                    MealItem(
                        name = item.name,
                        amount = item.amount,
                        unit = item.unit,
                        calories = item.calories,
                        protein = item.protein,
                        carbs = item.carbs,
                        fat = item.fat,
                        fiber = item.fiber,
                        sugar = item.sugar,
                        saturatedFat = item.saturatedFat
                    )
                },
                totalCalories = mealTemplate.totalCalories,
                totalProtein = mealTemplate.totalProtein,
                totalCarbs = mealTemplate.totalCarbs,
                totalFat = mealTemplate.totalFat,
                totalFiber = mealTemplate.items.sumOf { it.fiber.toDouble() }.toFloat(),
                isRoutine = true,
                routineName = routineDay.name,
                timestamp = timestamp,
                createdAt = now
            )

            mealRepository.addMeal(meal)
            count++
        }

        count
    }

    override suspend fun executeRoutineWorkouts(
        userId: String,
        date: String,
        routineDay: RoutineDay
    ): Result<Int> = runCatching {
        var count = 0
        val now = System.currentTimeMillis()
        val timestamp = DateUtil.dateStringToTimestamp(date)

        routineDay.workouts.forEach { workoutTemplate ->
            val workout = Workout(
                id = UUID.randomUUID().toString(),
                userId = userId,
                name = workoutTemplate.templateName,
                type = WorkoutType.STRENGTH,
                exercises = workoutTemplate.exercises.map { exercise ->
                    Exercise(
                        name = exercise.name,
                        category = mapCategoryString(exercise.category),
                        sets = exercise.sets.takeIf { it > 0 },
                        reps = exercise.reps.takeIf { it > 0 },
                        weight = exercise.weight.takeIf { it > 0f },
                        duration = exercise.duration.takeIf { it > 0 },
                        caloriesBurned = 0  // 後で計算
                    )
                },
                totalDuration = workoutTemplate.estimatedDuration,
                totalCaloriesBurned = workoutTemplate.estimatedCaloriesBurned,
                intensity = WorkoutIntensity.MODERATE,
                isRoutine = true,
                routineName = routineDay.name,
                timestamp = timestamp,
                createdAt = now
            )

            workoutRepository.addWorkout(workout)
            count++
        }

        count
    }

    private fun mapCategoryString(category: String): ExerciseCategory {
        return when (category.lowercase()) {
            "chest" -> ExerciseCategory.CHEST
            "back" -> ExerciseCategory.BACK
            "shoulder" -> ExerciseCategory.SHOULDERS
            "arm" -> ExerciseCategory.ARMS
            "leg" -> ExerciseCategory.LEGS
            "core" -> ExerciseCategory.CORE
            else -> ExerciseCategory.OTHER
        }
    }

    // ========== プリセット ==========

    override suspend fun getPresetPatterns(): Result<List<RoutinePattern>> = runCatching {
        // プリセットはアプリ内で定義
        RoutinePresets.ALL
    }

    override suspend fun copyPresetToUser(
        userId: String,
        presetId: String,
        customName: String?
    ): Result<String> = runCatching {
        val preset = RoutinePresets.ALL.find { it.id == presetId }
            ?: throw IllegalArgumentException("Preset not found: $presetId")

        val userPattern = preset.copy(
            id = UUID.randomUUID().toString(),
            userId = userId,
            name = customName ?: preset.name,
            isPreset = false,
            isActive = true,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )

        // 既存のアクティブパターンを非アクティブに
        val activePatterns = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .whereEqualTo("isActive", true)
            .get()
            .await()

        val batch = firestore.batch()
        activePatterns.documents.forEach { doc ->
            batch.update(doc.reference, "isActive", false)
        }

        // 新しいパターンを保存
        val patternRef = firestore.collection("users")
            .document(userId)
            .collection("routinePatterns")
            .document(userPattern.id)
        batch.set(patternRef, patternToMap(userPattern))

        batch.commit().await()

        userPattern.id
    }

    // ========== ヘルパー関数 ==========

    private fun calculateDayIndex(pattern: RoutinePattern, date: String): Int {
        // パターン作成日からの経過日数で計算
        val patternStartDate = pattern.createdAt
        val targetDate = DateUtil.dateStringToTimestamp(date)
        val daysDiff = ((targetDate - patternStartDate) / (24 * 60 * 60 * 1000)).toInt()

        // パターンの実際の日数を使用（ハードコードの7ではなく）
        val daysInPattern = pattern.days.size.coerceAtLeast(1)

        // 負の数も正しく処理（targetDateがpatternStartDateより前の場合）
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
