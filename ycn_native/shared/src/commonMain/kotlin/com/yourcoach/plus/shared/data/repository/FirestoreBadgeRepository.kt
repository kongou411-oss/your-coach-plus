package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.repository.BadgeDefinitions
import com.yourcoach.plus.shared.domain.repository.BadgeProgress
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.invokeCloudFunction
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firestore バッジリポジトリ実装 (GitLive KMP版)
 * Android版と同一データ構造: badges フィールドに [{badgeId, earnedAt}] を格納
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

    @Suppress("UNCHECKED_CAST")
    override suspend fun getUserBadges(userId: String): Result<List<Badge>> {
        return try {
            val doc = userDocument(userId).get()
            if (doc.exists) {
                val earnedBadges = try {
                    doc.get<List<Map<String, Any?>>?>("badges") ?: emptyList()
                } catch (e: Exception) {
                    emptyList()
                }

                val badges = earnedBadges.mapNotNull { badgeData ->
                    val badgeId = badgeData["badgeId"] as? String ?: return@mapNotNull null
                    val earnedAt = (badgeData["earnedAt"] as? Number)?.toLong() ?: DateUtil.currentTimestamp()

                    BadgeDefinitions.getBadgeById(badgeId)?.copy(
                        earnedAt = earnedAt,
                        isEarned = true
                    )
                }
                Result.success(badges)
            } else {
                Result.success(emptyList())
            }
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの取得に失敗しました", e))
        }
    }

    @Suppress("UNCHECKED_CAST")
    override fun observeUserBadges(userId: String): Flow<List<Badge>> {
        return userDocument(userId)
            .snapshots
            .map { doc ->
                if (doc.exists) {
                    val earnedBadges = try {
                        doc.get<List<Map<String, Any?>>?>("badges") ?: emptyList()
                    } catch (e: Exception) {
                        emptyList()
                    }

                    earnedBadges.mapNotNull { badgeData ->
                        val badgeId = badgeData["badgeId"] as? String ?: return@mapNotNull null
                        val earnedAt = (badgeData["earnedAt"] as? Number)?.toLong() ?: DateUtil.currentTimestamp()

                        BadgeDefinitions.getBadgeById(badgeId)?.copy(
                            earnedAt = earnedAt,
                            isEarned = true
                        )
                    }
                } else {
                    emptyList()
                }
            }
    }

    override suspend fun getAllBadges(): Result<List<Badge>> {
        return Result.success(BadgeDefinitions.ALL_BADGES)
    }

    override suspend fun awardBadge(userId: String, badgeId: String): Result<Badge> {
        return try {
            val badge = BadgeDefinitions.getBadgeById(badgeId)
                ?: return Result.failure(AppError.DatabaseError("バッジが見つかりません: $badgeId"))

            val now = DateUtil.currentTimestamp()
            val badgeData = mapOf(
                "badgeId" to badgeId,
                "earnedAt" to now
            )

            userDocument(userId).update(
                mapOf("badges" to FieldValue.arrayUnion(badgeData))
            )

            // バッジ獲得で10XP付与（Cloud Functions経由）
            try {
                invokeCloudFunction(
                    region = "asia-northeast2",
                    functionName = "addExperience",
                    data = mapOf("expPoints" to 10)
                )
            } catch (e: Exception) {
                // XP付与失敗してもバッジ獲得は成功とする
                println("FirestoreBadgeRepository: Failed to grant XP for badge: $badgeId - ${e.message}")
            }

            Result.success(badge.copy(
                earnedAt = now,
                isEarned = true
            ))
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジの付与に失敗しました", e))
        }
    }

    override suspend fun getBadgeProgress(userId: String): Result<Map<String, BadgeProgress>> {
        return try {
            val doc = userDocument(userId).get()
            if (doc.exists) {
                val currentStreak = doc.get<Long?>("currentStreak")?.toInt() ?: 0
                val totalMeals = doc.get<Long?>("totalMeals")?.toInt() ?: 0
                val totalWorkouts = doc.get<Long?>("totalWorkouts")?.toInt() ?: 0
                val totalAnalyses = doc.get<Long?>("totalAnalyses")?.toInt() ?: 0

                val progress = mutableMapOf<String, BadgeProgress>()

                // ストリーク系
                progress["streak_3"] = BadgeProgress("streak_3", currentStreak, 3)
                progress["streak_7"] = BadgeProgress("streak_7", currentStreak, 7)
                progress["streak_14"] = BadgeProgress("streak_14", currentStreak, 14)
                progress["streak_30"] = BadgeProgress("streak_30", currentStreak, 30)
                progress["streak_100"] = BadgeProgress("streak_100", currentStreak, 100)

                // マイルストーン系
                progress["milestone_10_meals"] = BadgeProgress("milestone_10_meals", totalMeals, 10)
                progress["milestone_100_meals"] = BadgeProgress("milestone_100_meals", totalMeals, 100)

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
            val params = mutableMapOf<String, Any>("action" to action)
            if (data != null) {
                params["data"] = data
            }
            invokeCloudFunction(
                region = "asia-northeast2",
                functionName = "updateBadgeStats",
                data = params
            )
            Result.success(Unit)
        } catch (e: Exception) {
            println("FirestoreBadgeRepository: Failed to update badge stats: $action - ${e.message}")
            Result.failure(AppError.DatabaseError("バッジ統計の更新に失敗しました", e))
        }
    }

    @Suppress("UNCHECKED_CAST")
    override suspend fun checkAndAwardBadges(): Result<List<String>> {
        return try {
            val result = invokeCloudFunction(
                region = "asia-northeast2",
                functionName = "checkAndAwardBadges",
                data = emptyMap()
            )

            val awardedBadges = (result["awardedBadges"] as? List<Map<String, Any>>)?.mapNotNull {
                it["badgeId"] as? String
            } ?: emptyList()

            Result.success(awardedBadges)
        } catch (e: Exception) {
            println("FirestoreBadgeRepository: checkAndAwardBadges error: ${e.message}")
            Result.failure(AppError.DatabaseError("バッジチェックに失敗しました", e))
        }
    }
}
