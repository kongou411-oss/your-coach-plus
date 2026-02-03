package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.BadgeCategory
import com.yourcoach.plus.shared.domain.model.CalorieOverride
import com.yourcoach.plus.shared.domain.model.DailyScore
import com.yourcoach.plus.shared.domain.model.PfcRatio
import com.yourcoach.plus.shared.domain.model.Meal
import com.yourcoach.plus.shared.domain.model.StreakInfo
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.model.Workout
import com.yourcoach.plus.shared.domain.repository.ScoreRepository
import com.yourcoach.plus.shared.domain.repository.WeeklySummary
import com.yourcoach.plus.shared.domain.usecase.ConditionData
import com.yourcoach.plus.shared.domain.usecase.NutritionTarget
import com.yourcoach.plus.shared.domain.usecase.ScoreCalculator
import com.yourcoach.plus.shared.domain.usecase.StreakCalculator
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Firestore スコアリポジトリ実装
 */
class FirestoreScoreRepository : ScoreRepository {

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    private fun scoresCollection(userId: String) =
        firestore.collection("users").document(userId).collection("dailyScores")

    private fun userDoc(userId: String) =
        firestore.collection("users").document(userId)

    private fun badgesCollection(userId: String) =
        firestore.collection("users").document(userId).collection("badges")

    /**
     * 本日のスコアを取得
     */
    override suspend fun getTodayScore(userId: String): Result<DailyScore?> {
        val today = LocalDate.now().format(dateFormatter)
        return getScoreForDate(userId, today)
    }

    /**
     * 特定日のスコアを取得
     */
    override suspend fun getScoreForDate(userId: String, date: String): Result<DailyScore?> {
        return try {
            val doc = scoresCollection(userId).document(date).get().await()
            if (doc.exists()) {
                Result.success(mapToScore(doc.data!!, date))
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの取得に失敗しました", e))
        }
    }

    /**
     * 日付範囲のスコアを取得
     */
    override suspend fun getScoresInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<DailyScore>> {
        return try {
            val docs = scoresCollection(userId)
                .whereGreaterThanOrEqualTo("date", startDate)
                .whereLessThanOrEqualTo("date", endDate)
                .orderBy("date", Query.Direction.ASCENDING)
                .get()
                .await()

            val scores = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToScore(it, doc.id) }
            }
            Result.success(scores)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの取得に失敗しました", e))
        }
    }

    /**
     * 本日のスコアをリアルタイム監視
     */
    override fun observeTodayScore(userId: String): Flow<DailyScore?> = callbackFlow {
        val today = LocalDate.now().format(dateFormatter)
        val listener = scoresCollection(userId).document(today)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val score = snapshot?.data?.let { mapToScore(it, today) }
                trySend(score)
            }
        awaitClose { listener.remove() }
    }

    /**
     * スコアを更新
     */
    override suspend fun updateScore(userId: String, score: DailyScore): Result<Unit> {
        return try {
            scoresCollection(userId).document(score.date).set(scoreToMap(score)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの更新に失敗しました", e))
        }
    }

    /**
     * スコアを再計算
     */
    override suspend fun recalculateScore(userId: String, date: String): Result<DailyScore> {
        return try {
            // 1. ユーザープロフィールを取得
            val userDoc = userDoc(userId).get().await()
            val userData = userDoc.data ?: emptyMap<String, Any>()
            val profile = mapToUserProfile(userData)

            // 2. 栄養目標を取得
            val target = NutritionTarget(
                calories = (userData["targetCalories"] as? Number)?.toDouble() ?: 2000.0,
                protein = (userData["targetProtein"] as? Number)?.toDouble() ?: 60.0,
                fat = (userData["targetFat"] as? Number)?.toDouble() ?: 55.0,
                carbs = (userData["targetCarbs"] as? Number)?.toDouble() ?: 250.0
            )

            // 3. 当日の食事データを取得
            val mealsSnapshot = firestore.collection("users").document(userId)
                .collection("dailyRecords").document(date)
                .collection("meals").get().await()
            val meals = mealsSnapshot.documents.mapNotNull { doc ->
                // TODO: 実際のMealマッピング実装
                null as? Meal
            }.filterNotNull()

            // 4. 当日の運動データを取得
            val workoutsSnapshot = firestore.collection("users").document(userId)
                .collection("dailyRecords").document(date)
                .collection("workouts").get().await()
            val workouts = workoutsSnapshot.documents.mapNotNull { doc ->
                // TODO: 実際のWorkoutマッピング実装
                null as? Workout
            }.filterNotNull()

            // 5. コンディションデータを取得
            val conditionDoc = firestore.collection("users").document(userId)
                .collection("dailyRecords").document(date).get().await()
            val conditionData = conditionDoc.data?.let { data ->
                val conditions = data["conditions"] as? Map<*, *>
                if (conditions != null) {
                    ConditionData(
                        sleepHours = (conditions["sleepHours"] as? Number)?.toInt() ?: 0,
                        sleepQuality = (conditions["sleepQuality"] as? Number)?.toInt() ?: 0,
                        digestion = (conditions["digestion"] as? Number)?.toInt() ?: 0,
                        focus = (conditions["focus"] as? Number)?.toInt() ?: 0,
                        stress = (conditions["stress"] as? Number)?.toInt() ?: 0
                    )
                } else null
            }

            // 6. 休養日判定
            val isRestDay = conditionDoc.data?.let { data ->
                val routine = data["routine"] as? Map<*, *>
                routine?.get("is_rest_day") == true
            } ?: false

            // 7. スコア計算
            val calculatedScores = ScoreCalculator.calculateScores(
                profile = profile,
                meals = meals,
                workouts = workouts,
                conditions = conditionData,
                target = target,
                isRestDay = isRestDay
            )

            // 8. DailyScoreオブジェクトを作成
            val dailyScore = DailyScore(
                userId = userId,
                date = date,
                // 食事スコア
                foodScore = calculatedScores.food.score,
                calorieScore = calculatedScores.food.calorie,
                proteinScore = calculatedScores.food.protein,
                fatScore = calculatedScores.food.fat,
                carbsScore = calculatedScores.food.carbs,
                diaasScore = calculatedScores.food.diaas,
                fattyAcidScore = calculatedScores.food.fattyAcid,
                glScore = calculatedScores.food.gl,
                fiberScore = calculatedScores.food.fiber,
                vitaminScore = calculatedScores.food.vitamin,
                mineralScore = calculatedScores.food.mineral,
                // 運動スコア
                exerciseScore = calculatedScores.exercise.score,
                durationScore = calculatedScores.exercise.duration,
                exerciseCountScore = calculatedScores.exercise.setsScore,
                totalMinutes = calculatedScores.exercise.totalMinutes,
                exerciseCount = calculatedScores.exercise.totalSets,
                // コンディションスコア
                conditionScore = calculatedScores.condition.score,
                sleepScore = calculatedScores.condition.sleep,
                sleepQualityScore = calculatedScores.condition.quality,
                digestionScore = calculatedScores.condition.digestion,
                focusScore = calculatedScores.condition.focus,
                stressScore = calculatedScores.condition.stress,
                // 実際の摂取量
                totalCalories = calculatedScores.food.nutrition.totalCalories.toFloat(),
                totalProtein = calculatedScores.food.nutrition.totalProtein.toFloat(),
                totalFat = calculatedScores.food.nutrition.totalFat.toFloat(),
                totalCarbs = calculatedScores.food.nutrition.totalCarbs.toFloat(),
                totalFiber = calculatedScores.food.nutrition.totalFiber.toFloat(),
                avgDIAAS = calculatedScores.food.nutrition.avgDIAAS.toFloat(),
                totalGL = calculatedScores.food.nutrition.totalGL.toFloat(),
                // 総合スコア
                totalScore = calculatedScores.totalScore,
                updatedAt = System.currentTimeMillis()
            )

            // 9. Firestoreに保存
            scoresCollection(userId).document(date).set(scoreToMap(dailyScore)).await()

            Result.success(dailyScore)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの再計算に失敗しました", e))
        }
    }

    private fun mapToUserProfile(data: Map<String, Any>): UserProfile {
        return UserProfile(
            nickname = data["displayName"] as? String,
            style = data["style"] as? String,
            weight = (data["weight"] as? Number)?.toFloat(),
            height = (data["height"] as? Number)?.toFloat(),
            bodyFatPercentage = (data["bodyFatPercentage"] as? Number)?.toFloat(),
            targetCalories = (data["targetCalories"] as? Number)?.toInt(),
            targetProtein = (data["targetProtein"] as? Number)?.toFloat(),
            targetFat = (data["targetFat"] as? Number)?.toFloat(),
            targetCarbs = (data["targetCarbs"] as? Number)?.toFloat()
        )
    }

    /**
     * ストリーク情報を取得
     */
    override suspend fun getStreakInfo(userId: String): Result<StreakInfo> {
        return try {
            val doc = userDoc(userId).get().await()
            if (doc.exists()) {
                val data = doc.data ?: emptyMap()
                Result.success(mapToStreakInfo(data))
            } else {
                Result.success(StreakInfo(
                    currentStreak = 0,
                    longestStreak = 0,
                    lastActiveDate = null,
                    streakFreezeAvailable = 0,
                    streakFreezeUsedToday = false
                ))
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("ストリーク情報の取得に失敗しました", e))
        }
    }

    /**
     * ストリーク情報をリアルタイム監視
     */
    override fun observeStreakInfo(userId: String): Flow<StreakInfo> = callbackFlow {
        val listener = userDoc(userId).addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            val streakInfo = snapshot?.data?.let { mapToStreakInfo(it) } ?: StreakInfo(
                currentStreak = 0,
                longestStreak = 0,
                lastActiveDate = null,
                streakFreezeAvailable = 0,
                streakFreezeUsedToday = false
            )
            trySend(streakInfo)
        }
        awaitClose { listener.remove() }
    }

    /**
     * ストリークフリーズを使用
     */
    override suspend fun useStreakFreeze(userId: String): Result<Boolean> {
        return try {
            val docRef = userDoc(userId)
            val result = firestore.runTransaction { transaction ->
                val doc = transaction.get(docRef)
                val freezes = doc.getLong("streakFreezes")?.toInt() ?: 0
                if (freezes > 0) {
                    transaction.update(docRef, mapOf(
                        "streakFreezes" to freezes - 1,
                        "lastStreakFreezeUsed" to System.currentTimeMillis()
                    ))
                    true
                } else {
                    false
                }
            }.await()
            Result.success(result)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("ストリークフリーズの使用に失敗しました", e))
        }
    }

    /**
     * バッジ一覧を取得
     */
    override suspend fun getBadges(userId: String): Result<List<Badge>> {
        return try {
            val docs = badgesCollection(userId)
                .orderBy("earnedAt", Query.Direction.DESCENDING)
                .get()
                .await()

            val badges = docs.documents.mapNotNull { doc ->
                doc.data?.let { mapToBadge(it, doc.id) }
            }
            Result.success(badges)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの取得に失敗しました", e))
        }
    }

    /**
     * バッジを付与
     */
    override suspend fun awardBadge(userId: String, badgeId: String): Result<Unit> {
        return try {
            val badge = getBadgeDefinition(badgeId)
            badgesCollection(userId).document(badgeId).set(mapOf(
                "badgeId" to badgeId,
                "name" to badge.name,
                "description" to badge.description,
                "iconUrl" to badge.iconUrl,
                "category" to badge.category.name,
                "earnedAt" to System.currentTimeMillis()
            )).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの付与に失敗しました", e))
        }
    }

    /**
     * XPを追加
     */
    override suspend fun addXp(userId: String, amount: Int, reason: String): Result<Int> {
        return try {
            val docRef = userDoc(userId)
            val newXp = firestore.runTransaction { transaction ->
                val doc = transaction.get(docRef)
                val currentXp = doc.getLong("totalXp")?.toInt() ?: 0
                val newTotal = currentXp + amount
                transaction.update(docRef, mapOf(
                    "totalXp" to newTotal,
                    "lastXpReason" to reason,
                    "lastXpAt" to System.currentTimeMillis()
                ))
                newTotal
            }.await()
            Result.success(newXp)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("XPの追加に失敗しました", e))
        }
    }

    /**
     * 週間サマリーを取得
     */
    override suspend fun getWeeklySummary(userId: String, weekStartDate: String): Result<WeeklySummary> {
        return try {
            val startDate = LocalDate.parse(weekStartDate)
            val endDate = startDate.plusDays(6)
            val scoresResult = getScoresInRange(userId, weekStartDate, endDate.toString())

            scoresResult.map { scores ->
                val averageScore = if (scores.isNotEmpty()) {
                    scores.map { it.totalScore }.average().toFloat()
                } else {
                    0f
                }
                val totalXpEarned = scores.sumOf { it.xpEarned }
                val activeDays = scores.size
                val bestDay = scores.maxByOrNull { it.totalScore }?.date
                val worstDay = scores.minByOrNull { it.totalScore }?.date

                val scoresByAxis = mapOf(
                    "food" to scores.map { it.foodScore }.average().toFloat(),
                    "calorie" to scores.map { it.calorieScore }.average().toFloat(),
                    "protein" to scores.map { it.proteinScore }.average().toFloat(),
                    "fat" to scores.map { it.fatScore }.average().toFloat(),
                    "carbs" to scores.map { it.carbsScore }.average().toFloat(),
                    "diaas" to scores.map { it.diaasScore }.average().toFloat(),
                    "fattyAcid" to scores.map { it.fattyAcidScore }.average().toFloat(),
                    "gl" to scores.map { it.glScore }.average().toFloat(),
                    "fiber" to scores.map { it.fiberScore }.average().toFloat(),
                    "vitamin" to scores.map { it.vitaminScore }.average().toFloat(),
                    "mineral" to scores.map { it.mineralScore }.average().toFloat(),
                    "exercise" to scores.map { it.exerciseScore }.average().toFloat(),
                    "condition" to scores.map { it.conditionScore }.average().toFloat()
                )

                WeeklySummary(
                    averageScore = averageScore,
                    totalXpEarned = totalXpEarned,
                    activeDays = activeDays,
                    bestDay = bestDay,
                    worstDay = worstDay,
                    scoresByAxis = scoresByAxis
                )
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("週間サマリーの取得に失敗しました", e))
        }
    }

    // ===== ヘルパー関数 =====

    private fun scoreToMap(score: DailyScore): Map<String, Any?> = mapOf(
        "userId" to score.userId,
        "date" to score.date,
        "totalScore" to score.totalScore,
        // 食事スコア
        "foodScore" to score.foodScore,
        "calorieScore" to score.calorieScore,
        "proteinScore" to score.proteinScore,
        "fatScore" to score.fatScore,
        "carbsScore" to score.carbsScore,
        "diaasScore" to score.diaasScore,
        "fattyAcidScore" to score.fattyAcidScore,
        "glScore" to score.glScore,
        "fiberScore" to score.fiberScore,
        "vitaminScore" to score.vitaminScore,
        "mineralScore" to score.mineralScore,
        // 運動スコア
        "exerciseScore" to score.exerciseScore,
        "durationScore" to score.durationScore,
        "exerciseCountScore" to score.exerciseCountScore,
        "totalMinutes" to score.totalMinutes,
        "exerciseCount" to score.exerciseCount,
        // コンディションスコア
        "conditionScore" to score.conditionScore,
        "sleepScore" to score.sleepScore,
        "sleepQualityScore" to score.sleepQualityScore,
        "digestionScore" to score.digestionScore,
        "focusScore" to score.focusScore,
        "stressScore" to score.stressScore,
        // 実際の摂取量
        "totalCalories" to score.totalCalories,
        "totalProtein" to score.totalProtein,
        "totalFat" to score.totalFat,
        "totalCarbs" to score.totalCarbs,
        "totalFiber" to score.totalFiber,
        "avgDIAAS" to score.avgDIAAS,
        "totalGL" to score.totalGL,
        // ゲーミフィケーション
        "xpEarned" to score.xpEarned,
        "streak" to score.streak,
        "updatedAt" to System.currentTimeMillis()
    )

    @Suppress("UNCHECKED_CAST")
    private fun mapToScore(data: Map<String, Any>, date: String): DailyScore {
        // CalorieOverrideをパース
        val overrideData = data["calorieOverride"] as? Map<String, Any>
        val calorieOverride = overrideData?.let { mapToCalorieOverride(it) }

        return DailyScore(
            userId = data["userId"] as? String ?: "",
            date = date,
            totalScore = (data["totalScore"] as? Number)?.toInt() ?: 0,
            // 食事スコア
            foodScore = (data["foodScore"] as? Number)?.toInt() ?: 0,
            calorieScore = (data["calorieScore"] as? Number)?.toInt() ?: 0,
            proteinScore = (data["proteinScore"] as? Number)?.toInt() ?: 0,
            fatScore = (data["fatScore"] as? Number)?.toInt() ?: 0,
            carbsScore = (data["carbsScore"] as? Number)?.toInt() ?: 0,
            diaasScore = (data["diaasScore"] as? Number)?.toInt() ?: 0,
            fattyAcidScore = (data["fattyAcidScore"] as? Number)?.toInt() ?: 0,
            glScore = (data["glScore"] as? Number)?.toInt() ?: 0,
            fiberScore = (data["fiberScore"] as? Number)?.toInt() ?: 0,
            vitaminScore = (data["vitaminScore"] as? Number)?.toInt() ?: 0,
            mineralScore = (data["mineralScore"] as? Number)?.toInt() ?: 0,
            // 運動スコア
            exerciseScore = (data["exerciseScore"] as? Number)?.toInt() ?: 0,
            durationScore = (data["durationScore"] as? Number)?.toInt() ?: 0,
            exerciseCountScore = (data["exerciseCountScore"] as? Number)?.toInt() ?: 0,
            totalMinutes = (data["totalMinutes"] as? Number)?.toInt() ?: 0,
            exerciseCount = (data["exerciseCount"] as? Number)?.toInt() ?: 0,
            // コンディションスコア
            conditionScore = (data["conditionScore"] as? Number)?.toInt() ?: 0,
            sleepScore = (data["sleepScore"] as? Number)?.toInt() ?: 0,
            sleepQualityScore = (data["sleepQualityScore"] as? Number)?.toInt() ?: 0,
            digestionScore = (data["digestionScore"] as? Number)?.toInt() ?: 0,
            focusScore = (data["focusScore"] as? Number)?.toInt() ?: 0,
            stressScore = (data["stressScore"] as? Number)?.toInt() ?: 0,
            // 実際の摂取量
            totalCalories = (data["totalCalories"] as? Number)?.toFloat() ?: 0f,
            totalProtein = (data["totalProtein"] as? Number)?.toFloat() ?: 0f,
            totalFat = (data["totalFat"] as? Number)?.toFloat() ?: 0f,
            totalCarbs = (data["totalCarbs"] as? Number)?.toFloat() ?: 0f,
            totalFiber = (data["totalFiber"] as? Number)?.toFloat() ?: 0f,
            avgDIAAS = (data["avgDIAAS"] as? Number)?.toFloat() ?: 0f,
            totalGL = (data["totalGL"] as? Number)?.toFloat() ?: 0f,
            // ピンポイントカロリー調整
            calorieOverride = calorieOverride,
            // ゲーミフィケーション
            xpEarned = (data["xpEarned"] as? Number)?.toInt() ?: 0,
            streak = (data["streak"] as? Number)?.toInt() ?: 0,
            updatedAt = (data["updatedAt"] as? Number)?.toLong() ?: 0
        )
    }

    private fun mapToStreakInfo(data: Map<String, Any>): StreakInfo = StreakInfo(
        currentStreak = (data["currentStreak"] as? Number)?.toInt() ?: 0,
        longestStreak = (data["longestStreak"] as? Number)?.toInt() ?: 0,
        lastActiveDate = data["lastActiveDate"] as? String,
        streakFreezeAvailable = (data["streakFreezeAvailable"] as? Number)?.toInt() ?: 0,
        streakFreezeUsedToday = data["streakFreezeUsedToday"] as? Boolean ?: false
    )

    private fun mapToBadge(data: Map<String, Any>, id: String): Badge = Badge(
        id = id,
        name = data["name"] as? String ?: "",
        description = data["description"] as? String ?: "",
        iconUrl = data["iconUrl"] as? String ?: "",
        category = BadgeCategory.valueOf(data["category"] as? String ?: "ACHIEVEMENT"),
        earnedAt = (data["earnedAt"] as? Number)?.toLong()
    )

    private fun getBadgeDefinition(badgeId: String): Badge {
        // TODO: バッジマスターデータから取得
        return Badge(
            id = badgeId,
            name = "バッジ",
            description = "達成おめでとう！",
            iconUrl = "",
            category = BadgeCategory.ACHIEVEMENT,
            earnedAt = null
        )
    }

    // ===== ピンポイントカロリー調整 =====

    /**
     * ピンポイントカロリー調整を適用
     */
    override suspend fun applyCalorieOverride(
        userId: String,
        date: String,
        override: CalorieOverride
    ): Result<Unit> {
        return try {
            val overrideMap = mutableMapOf<String, Any?>(
                "templateName" to override.templateName,
                "calorieAdjustment" to override.calorieAdjustment,
                "appliedAt" to override.appliedAt
            )
            override.pfcOverride?.let { pfc ->
                overrideMap["pfcOverride"] = mapOf(
                    "protein" to pfc.protein,
                    "fat" to pfc.fat,
                    "carbs" to pfc.carbs
                )
            }

            scoresCollection(userId).document(date).update(
                "calorieOverride", overrideMap
            ).await()
            Result.success(Unit)
        } catch (e: Exception) {
            // ドキュメントが存在しない場合は新規作成
            try {
                val overrideMap = mutableMapOf<String, Any?>(
                    "templateName" to override.templateName,
                    "calorieAdjustment" to override.calorieAdjustment,
                    "appliedAt" to override.appliedAt
                )
                override.pfcOverride?.let { pfc ->
                    overrideMap["pfcOverride"] = mapOf(
                        "protein" to pfc.protein,
                        "fat" to pfc.fat,
                        "carbs" to pfc.carbs
                    )
                }

                scoresCollection(userId).document(date).set(
                    mapOf(
                        "userId" to userId,
                        "date" to date,
                        "calorieOverride" to overrideMap,
                        "updatedAt" to System.currentTimeMillis()
                    )
                ).await()
                Result.success(Unit)
            } catch (e2: Exception) {
                Result.failure(AppError.DatabaseError("カロリー調整の適用に失敗しました", e2))
            }
        }
    }

    /**
     * ピンポイントカロリー調整を解除
     */
    override suspend fun clearCalorieOverride(userId: String, date: String): Result<Unit> {
        return try {
            scoresCollection(userId).document(date).update(
                "calorieOverride", FieldValue.delete()
            ).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カロリー調整の解除に失敗しました", e))
        }
    }

    /**
     * ピンポイントカロリー調整を取得
     */
    override suspend fun getCalorieOverride(userId: String, date: String): Result<CalorieOverride?> {
        return try {
            val doc = scoresCollection(userId).document(date).get().await()
            if (doc.exists()) {
                @Suppress("UNCHECKED_CAST")
                val overrideData = doc.data?.get("calorieOverride") as? Map<String, Any>
                if (overrideData != null) {
                    Result.success(mapToCalorieOverride(overrideData))
                } else {
                    Result.success(null)
                }
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カロリー調整の取得に失敗しました", e))
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapToCalorieOverride(data: Map<String, Any>): CalorieOverride {
        val pfcData = data["pfcOverride"] as? Map<String, Any>
        val pfcRatio = if (pfcData != null) {
            PfcRatio(
                protein = (pfcData["protein"] as? Number)?.toInt() ?: 30,
                fat = (pfcData["fat"] as? Number)?.toInt() ?: 25,
                carbs = (pfcData["carbs"] as? Number)?.toInt() ?: 45
            )
        } else null

        return CalorieOverride(
            templateName = data["templateName"] as? String ?: "",
            calorieAdjustment = (data["calorieAdjustment"] as? Number)?.toInt() ?: 0,
            pfcOverride = pfcRatio,
            appliedAt = (data["appliedAt"] as? Number)?.toLong() ?: 0
        )
    }

    // ===== 休養日ステータス =====

    /**
     * 休養日ステータスを更新
     */
    override suspend fun updateRestDayStatus(
        userId: String,
        date: String,
        isRestDay: Boolean
    ): Result<Unit> {
        return try {
            scoresCollection(userId).document(date).update(
                "isManualRestDay", isRestDay
            ).await()
            Result.success(Unit)
        } catch (e: Exception) {
            // ドキュメントが存在しない場合は新規作成
            try {
                scoresCollection(userId).document(date).set(
                    mapOf(
                        "userId" to userId,
                        "date" to date,
                        "isManualRestDay" to isRestDay,
                        "updatedAt" to System.currentTimeMillis()
                    ),
                    com.google.firebase.firestore.SetOptions.merge()
                ).await()
                Result.success(Unit)
            } catch (e2: Exception) {
                Result.failure(AppError.DatabaseError("休養日設定の更新に失敗しました", e2))
            }
        }
    }

    /**
     * 休養日ステータスを取得
     */
    override suspend fun getRestDayStatus(userId: String, date: String): Result<Boolean> {
        return try {
            val doc = scoresCollection(userId).document(date).get().await()
            if (doc.exists()) {
                val isRestDay = doc.getBoolean("isManualRestDay") ?: false
                Result.success(isRestDay)
            } else {
                Result.success(false)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("休養日設定の取得に失敗しました", e))
        }
    }
}
