package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.BadgeCategory
import com.yourcoach.plus.shared.domain.model.CalorieOverride
import com.yourcoach.plus.shared.domain.model.DailyScore
import com.yourcoach.plus.shared.domain.model.PfcRatio
import com.yourcoach.plus.shared.domain.model.StreakInfo
import com.yourcoach.plus.shared.domain.repository.ScoreRepository
import com.yourcoach.plus.shared.domain.repository.WeeklySummary
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firestore スコアリポジトリ実装 (GitLive KMP版)
 */
class FirestoreScoreRepository : ScoreRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreScoreRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun scoresCollection(userId: String) =
        firestore.collection("users").document(userId).collection("dailyScores")

    private fun userDocument(userId: String) =
        firestore.collection("users").document(userId)

    override suspend fun getTodayScore(userId: String): Result<DailyScore?> {
        return getScoreForDate(userId, DateUtil.todayString())
    }

    override suspend fun getScoreForDate(userId: String, date: String): Result<DailyScore?> {
        return try {
            val doc = scoresCollection(userId).document(date).get()
            if (doc.exists) {
                Result.success(doc.toDailyScore(userId, date))
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの取得に失敗しました", e))
        }
    }

    override suspend fun getScoresInRange(
        userId: String,
        startDate: String,
        endDate: String
    ): Result<List<DailyScore>> {
        return try {
            val snapshot = scoresCollection(userId)
                .where { "date" greaterThanOrEqualTo startDate }
                .where { "date" lessThanOrEqualTo endDate }
                .orderBy("date", Direction.ASCENDING)
                .get()

            val scores = snapshot.documents.mapNotNull { doc ->
                try {
                    doc.toDailyScore(userId, doc.id)
                } catch (e: Exception) {
                    null
                }
            }
            Result.success(scores)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの取得に失敗しました", e))
        }
    }

    override fun observeTodayScore(userId: String): Flow<DailyScore?> {
        val today = DateUtil.todayString()
        return scoresCollection(userId)
            .document(today)
            .snapshots
            .map { doc ->
                if (doc.exists) {
                    try {
                        doc.toDailyScore(userId, today)
                    } catch (e: Exception) {
                        null
                    }
                } else {
                    null
                }
            }
    }

    override suspend fun updateScore(userId: String, score: DailyScore): Result<Unit> {
        return try {
            scoresCollection(userId)
                .document(score.date)
                .set(scoreToMap(score))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの更新に失敗しました", e))
        }
    }

    override suspend fun recalculateScore(userId: String, date: String): Result<DailyScore> {
        // スコア再計算はCloud Functions側で行う想定
        // ここでは現在のスコアを返す
        return try {
            val result = getScoreForDate(userId, date)
            result.getOrNull()?.let { Result.success(it) }
                ?: Result.failure(AppError.DatabaseError("スコアが見つかりません"))
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("スコアの再計算に失敗しました", e))
        }
    }

    override suspend fun getStreakInfo(userId: String): Result<StreakInfo> {
        return try {
            val doc = userDocument(userId).get()
            if (doc.exists) {
                Result.success(doc.toStreakInfo())
            } else {
                Result.success(StreakInfo())
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("ストリーク情報の取得に失敗しました", e))
        }
    }

    override fun observeStreakInfo(userId: String): Flow<StreakInfo> {
        return userDocument(userId)
            .snapshots
            .map { doc ->
                if (doc.exists) {
                    try {
                        doc.toStreakInfo()
                    } catch (e: Exception) {
                        StreakInfo()
                    }
                } else {
                    StreakInfo()
                }
            }
    }

    override suspend fun useStreakFreeze(userId: String): Result<Boolean> {
        return try {
            val doc = userDocument(userId).get()
            val currentFreezes = doc.get<Long?>("streakFreezeAvailable")?.toInt() ?: 0

            if (currentFreezes > 0) {
                userDocument(userId).update(
                    mapOf(
                        "streakFreezeAvailable" to FieldValue.increment(-1),
                        "streakFreezeUsedToday" to true
                    )
                )
                Result.success(true)
            } else {
                Result.success(false)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("ストリークフリーズの使用に失敗しました", e))
        }
    }

    override suspend fun getBadges(userId: String): Result<List<Badge>> {
        return try {
            val doc = userDocument(userId).get()
            if (doc.exists) {
                val badgeIds = try {
                    doc.get<List<String>?>("earnedBadges") ?: emptyList()
                } catch (e: Exception) {
                    emptyList()
                }
                // バッジ定義からIDに一致するものを取得
                val badges = badgeIds.mapNotNull { id ->
                    com.yourcoach.plus.shared.domain.repository.BadgeDefinitions.getBadgeById(id)?.copy(isEarned = true)
                }
                Result.success(badges)
            } else {
                Result.success(emptyList())
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの取得に失敗しました", e))
        }
    }

    override suspend fun awardBadge(userId: String, badgeId: String): Result<Unit> {
        return try {
            userDocument(userId).update(
                mapOf(
                    "earnedBadges" to FieldValue.arrayUnion(badgeId)
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの付与に失敗しました", e))
        }
    }

    override suspend fun addXp(userId: String, amount: Int, reason: String): Result<Int> {
        return try {
            userDocument(userId).update(
                mapOf(
                    "experience" to FieldValue.increment(amount)
                )
            )
            val doc = userDocument(userId).get()
            val newXp = doc.get<Long?>("experience")?.toInt() ?: amount
            Result.success(newXp)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("XPの追加に失敗しました", e))
        }
    }

    override suspend fun getWeeklySummary(userId: String, weekStartDate: String): Result<WeeklySummary> {
        return try {
            val endDate = DateUtil.addDays(weekStartDate, 6)
            val scoresResult = getScoresInRange(userId, weekStartDate, endDate)
            val scores = scoresResult.getOrNull() ?: emptyList()

            if (scores.isEmpty()) {
                return Result.success(
                    WeeklySummary(
                        averageScore = 0f,
                        totalXpEarned = 0,
                        activeDays = 0,
                        bestDay = null,
                        worstDay = null,
                        scoresByAxis = emptyMap()
                    )
                )
            }

            val avgScore = scores.map { it.totalScore }.average().toFloat()
            val totalXp = scores.sumOf { it.xpEarned }
            val bestDay = scores.maxByOrNull { it.totalScore }?.date
            val worstDay = scores.minByOrNull { it.totalScore }?.date

            Result.success(
                WeeklySummary(
                    averageScore = avgScore,
                    totalXpEarned = totalXp,
                    activeDays = scores.size,
                    bestDay = bestDay,
                    worstDay = worstDay,
                    scoresByAxis = mapOf(
                        "food" to scores.map { it.foodScore }.average().toFloat(),
                        "exercise" to scores.map { it.exerciseScore }.average().toFloat(),
                        "condition" to scores.map { it.conditionScore }.average().toFloat()
                    )
                )
            )
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("週間サマリーの取得に失敗しました", e))
        }
    }

    override suspend fun applyCalorieOverride(
        userId: String,
        date: String,
        override: CalorieOverride
    ): Result<Unit> {
        return try {
            scoresCollection(userId).document(date).update(
                mapOf(
                    "calorieOverride" to mapOf(
                        "templateName" to override.templateName,
                        "calorieAdjustment" to override.calorieAdjustment,
                        "pfcOverride" to override.pfcOverride?.let {
                            mapOf("protein" to it.protein, "fat" to it.fat, "carbs" to it.carbs)
                        },
                        "appliedAt" to DateUtil.currentTimestamp()
                    )
                )
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カロリー調整の適用に失敗しました", e))
        }
    }

    override suspend fun clearCalorieOverride(userId: String, date: String): Result<Unit> {
        return try {
            scoresCollection(userId).document(date).update(
                mapOf("calorieOverride" to null)
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カロリー調整の解除に失敗しました", e))
        }
    }

    override suspend fun getCalorieOverride(userId: String, date: String): Result<CalorieOverride?> {
        return try {
            val doc = scoresCollection(userId).document(date).get()
            if (doc.exists) {
                val override = doc.toCalorieOverride()
                Result.success(override)
            } else {
                Result.success(null)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("カロリー調整の取得に失敗しました", e))
        }
    }

    override suspend fun updateRestDayStatus(userId: String, date: String, isRestDay: Boolean): Result<Unit> {
        return try {
            scoresCollection(userId).document(date).update(
                mapOf("isManualRestDay" to isRestDay)
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("休養日ステータスの更新に失敗しました", e))
        }
    }

    override suspend fun getRestDayStatus(userId: String, date: String): Result<Boolean> {
        return try {
            val doc = scoresCollection(userId).document(date).get()
            val isRestDay = doc.get<Boolean?>("isManualRestDay") ?: false
            Result.success(isRestDay)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("休養日ステータスの取得に失敗しました", e))
        }
    }

    // ========== Mapping Functions ==========

    private fun scoreToMap(score: DailyScore): Map<String, Any?> = mapOf(
        "userId" to score.userId,
        "date" to score.date,
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
        "exerciseScore" to score.exerciseScore,
        "durationScore" to score.durationScore,
        "exerciseCountScore" to score.exerciseCountScore,
        "totalMinutes" to score.totalMinutes,
        "exerciseCount" to score.exerciseCount,
        "conditionScore" to score.conditionScore,
        "sleepScore" to score.sleepScore,
        "sleepQualityScore" to score.sleepQualityScore,
        "digestionScore" to score.digestionScore,
        "focusScore" to score.focusScore,
        "stressScore" to score.stressScore,
        "totalCalories" to score.totalCalories,
        "totalProtein" to score.totalProtein,
        "totalFat" to score.totalFat,
        "totalCarbs" to score.totalCarbs,
        "totalFiber" to score.totalFiber,
        "avgDIAAS" to score.avgDIAAS,
        "totalGL" to score.totalGL,
        "totalScore" to score.totalScore,
        "xpEarned" to score.xpEarned,
        "streak" to score.streak,
        "badges" to score.badges,
        "updatedAt" to DateUtil.currentTimestamp()
    )

    @Suppress("UNCHECKED_CAST")
    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toDailyScore(
        userId: String,
        date: String
    ): DailyScore {
        val badges = try {
            get<List<String>?>("badges") ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }

        return DailyScore(
            userId = get<String?>("userId") ?: userId,
            date = get<String?>("date") ?: date,
            foodScore = get<Long?>("foodScore")?.toInt() ?: 0,
            calorieScore = get<Long?>("calorieScore")?.toInt() ?: 0,
            proteinScore = get<Long?>("proteinScore")?.toInt() ?: 0,
            fatScore = get<Long?>("fatScore")?.toInt() ?: 0,
            carbsScore = get<Long?>("carbsScore")?.toInt() ?: 0,
            diaasScore = get<Long?>("diaasScore")?.toInt() ?: 0,
            fattyAcidScore = get<Long?>("fattyAcidScore")?.toInt() ?: 0,
            glScore = get<Long?>("glScore")?.toInt() ?: 0,
            fiberScore = get<Long?>("fiberScore")?.toInt() ?: 0,
            vitaminScore = get<Long?>("vitaminScore")?.toInt() ?: 0,
            mineralScore = get<Long?>("mineralScore")?.toInt() ?: 0,
            exerciseScore = get<Long?>("exerciseScore")?.toInt() ?: 0,
            durationScore = get<Long?>("durationScore")?.toInt() ?: 0,
            exerciseCountScore = get<Long?>("exerciseCountScore")?.toInt() ?: 0,
            totalMinutes = get<Long?>("totalMinutes")?.toInt() ?: 0,
            exerciseCount = get<Long?>("exerciseCount")?.toInt() ?: 0,
            conditionScore = get<Long?>("conditionScore")?.toInt() ?: 0,
            sleepScore = get<Long?>("sleepScore")?.toInt() ?: 0,
            sleepQualityScore = get<Long?>("sleepQualityScore")?.toInt() ?: 0,
            digestionScore = get<Long?>("digestionScore")?.toInt() ?: 0,
            focusScore = get<Long?>("focusScore")?.toInt() ?: 0,
            stressScore = get<Long?>("stressScore")?.toInt() ?: 0,
            totalCalories = get<Double?>("totalCalories")?.toFloat() ?: 0f,
            totalProtein = get<Double?>("totalProtein")?.toFloat() ?: 0f,
            totalFat = get<Double?>("totalFat")?.toFloat() ?: 0f,
            totalCarbs = get<Double?>("totalCarbs")?.toFloat() ?: 0f,
            totalFiber = get<Double?>("totalFiber")?.toFloat() ?: 0f,
            avgDIAAS = get<Double?>("avgDIAAS")?.toFloat() ?: 0f,
            totalGL = get<Double?>("totalGL")?.toFloat() ?: 0f,
            totalScore = get<Long?>("totalScore")?.toInt() ?: 0,
            xpEarned = get<Long?>("xpEarned")?.toInt() ?: 0,
            streak = get<Long?>("streak")?.toInt() ?: 0,
            badges = badges,
            calorieOverride = toCalorieOverride(),
            updatedAt = get<Long?>("updatedAt") ?: 0
        )
    }

    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toStreakInfo(): StreakInfo {
        return StreakInfo(
            currentStreak = get<Long?>("currentStreak")?.toInt() ?: 0,
            longestStreak = get<Long?>("longestStreak")?.toInt() ?: 0,
            lastActiveDate = get<String?>("lastActiveDate"),
            streakFreezeAvailable = get<Long?>("streakFreezeAvailable")?.toInt() ?: 0,
            streakFreezeUsedToday = get<Boolean?>("streakFreezeUsedToday") ?: false
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toCalorieOverride(): CalorieOverride? {
        return try {
            val overrideMap = get<Map<String, Any?>?>("calorieOverride") ?: return null
            val pfcMap = overrideMap["pfcOverride"] as? Map<String, Any?>
            CalorieOverride(
                templateName = overrideMap["templateName"] as? String ?: "",
                calorieAdjustment = (overrideMap["calorieAdjustment"] as? Number)?.toInt() ?: 0,
                pfcOverride = pfcMap?.let {
                    PfcRatio(
                        protein = (it["protein"] as? Number)?.toInt() ?: 30,
                        fat = (it["fat"] as? Number)?.toInt() ?: 25,
                        carbs = (it["carbs"] as? Number)?.toInt() ?: 45
                    )
                },
                appliedAt = (overrideMap["appliedAt"] as? Number)?.toLong() ?: 0
            )
        } catch (e: Exception) {
            null
        }
    }
}
