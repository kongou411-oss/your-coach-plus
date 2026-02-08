package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.repository.BadgeDefinitions
import com.yourcoach.plus.shared.domain.repository.BadgeProgress
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firestore バッジリポジトリ実装 (GitLive KMP版)
 */
class FirestoreBadgeRepository : BadgeRepository {

    private val firestore: FirebaseFirestore by lazy {
        try {
            Firebase.firestore
        } catch (e: Throwable) {
            println("FirestoreBadgeRepository: Firebase.firestore initialization failed: ${e.message}")
            throw e
        }
    }

    private fun userDocument(userId: String) =
        firestore.collection("users").document(userId)

    private fun badgeStatsDocument(userId: String) =
        firestore.collection("users").document(userId).collection("stats").document("badges")

    override suspend fun getUserBadges(userId: String): Result<List<Badge>> {
        return try {
            val doc = userDocument(userId).get()
            if (doc.exists) {
                val earnedBadgeIds = try {
                    doc.get<List<String>?>("earnedBadges") ?: emptyList()
                } catch (e: Exception) {
                    emptyList()
                }

                val badges = BadgeDefinitions.ALL_BADGES.map { badge ->
                    if (earnedBadgeIds.contains(badge.id)) {
                        badge.copy(isEarned = true, earnedAt = DateUtil.currentTimestamp())
                    } else {
                        badge
                    }
                }
                Result.success(badges)
            } else {
                Result.success(BadgeDefinitions.ALL_BADGES)
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの取得に失敗しました", e))
        }
    }

    override fun observeUserBadges(userId: String): Flow<List<Badge>> {
        return userDocument(userId)
            .snapshots
            .map { doc ->
                if (doc.exists) {
                    val earnedBadgeIds = try {
                        doc.get<List<String>?>("earnedBadges") ?: emptyList()
                    } catch (e: Exception) {
                        emptyList()
                    }

                    BadgeDefinitions.ALL_BADGES.map { badge ->
                        if (earnedBadgeIds.contains(badge.id)) {
                            badge.copy(isEarned = true)
                        } else {
                            badge
                        }
                    }
                } else {
                    BadgeDefinitions.ALL_BADGES
                }
            }
    }

    override suspend fun getAllBadges(): Result<List<Badge>> {
        return Result.success(BadgeDefinitions.ALL_BADGES)
    }

    override suspend fun awardBadge(userId: String, badgeId: String): Result<Badge> {
        return try {
            userDocument(userId).update(
                mapOf(
                    "earnedBadges" to FieldValue.arrayUnion(badgeId)
                )
            )
            val badge = BadgeDefinitions.getBadgeById(badgeId)?.copy(
                isEarned = true,
                earnedAt = DateUtil.currentTimestamp()
            )
            badge?.let { Result.success(it) }
                ?: Result.failure(AppError.DatabaseError("バッジが見つかりません"))
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの付与に失敗しました", e))
        }
    }

    override suspend fun getBadgeProgress(userId: String): Result<Map<String, BadgeProgress>> {
        return try {
            val doc = badgeStatsDocument(userId).get()
            if (doc.exists) {
                val progress = mutableMapOf<String, BadgeProgress>()

                // ストリーク系
                val currentStreak = doc.get<Long?>("currentStreak")?.toInt() ?: 0
                progress["streak_3"] = BadgeProgress("streak_3", currentStreak, 3)
                progress["streak_7"] = BadgeProgress("streak_7", currentStreak, 7)
                progress["streak_14"] = BadgeProgress("streak_14", currentStreak, 14)
                progress["streak_30"] = BadgeProgress("streak_30", currentStreak, 30)
                progress["streak_100"] = BadgeProgress("streak_100", currentStreak, 100)

                // 食事記録数
                val mealCount = doc.get<Long?>("totalMeals")?.toInt() ?: 0
                progress["milestone_first_meal"] = BadgeProgress("milestone_first_meal", mealCount, 1)
                progress["milestone_10_meals"] = BadgeProgress("milestone_10_meals", mealCount, 10)
                progress["milestone_100_meals"] = BadgeProgress("milestone_100_meals", mealCount, 100)

                // AI分析回数
                val analysisCount = doc.get<Long?>("totalAnalyses")?.toInt() ?: 0
                progress["milestone_first_analysis"] = BadgeProgress("milestone_first_analysis", analysisCount, 1)

                Result.success(progress)
            } else {
                Result.success(emptyMap())
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジ進捗の取得に失敗しました", e))
        }
    }

    override suspend fun updateBadgeStats(action: String, data: Map<String, Any>?): Result<Unit> {
        return try {
            val updates = when (action) {
                "meal_recorded" -> mapOf("totalMeals" to FieldValue.increment(1))
                "workout_recorded" -> mapOf("totalWorkouts" to FieldValue.increment(1))
                "analysis_completed" -> mapOf("totalAnalyses" to FieldValue.increment(1))
                "streak_updated" -> data?.get("streak")?.let {
                    mapOf("currentStreak" to it)
                } ?: emptyMap()
                else -> emptyMap()
            }

            if (updates.isNotEmpty()) {
                // Firebase AuthからユーザーIDを取得する必要があるため、この実装はCallable版に変更が必要かも
                // ここでは簡易実装
                println("FirestoreBadgeRepository: updateBadgeStats called with action=$action")
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジ統計の更新に失敗しました", e))
        }
    }

    override suspend fun checkAndAwardBadges(): Result<List<String>> {
        // バッジチェックはCloud Functions側で行う想定
        return Result.success(emptyList())
    }
}
