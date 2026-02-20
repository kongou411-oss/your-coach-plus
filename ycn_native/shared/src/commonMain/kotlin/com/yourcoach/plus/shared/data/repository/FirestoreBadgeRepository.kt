package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.repository.BadgeDefinitions
import com.yourcoach.plus.shared.domain.repository.BadgeProgress
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.invokeCloudFunction
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.Direction
import dev.gitlive.firebase.firestore.DocumentSnapshot
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.datetime.*
import kotlinx.serialization.Serializable

/**
 * Firestore badges フィールドのデシリアライズ用
 * GitLive SDK は get<List<Map<String,Any?>>>() が不可のため @Serializable クラスを使用
 */
@Serializable
internal data class FirestoreBadgeEntry(
    val badgeId: String = "",
    val earnedAt: Double = 0.0
)

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

    override suspend fun getUserBadges(userId: String): Result<List<Badge>> {
        return try {
            val doc = userDocument(userId).get()
            if (doc.exists) {
                Result.success(parseBadgesFromDocument(doc))
            } else {
                Result.success(emptyList())
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
                    parseBadgesFromDocument(doc)
                } else {
                    emptyList()
                }
            }
    }

    /**
     * GitLive SDK の get<List<Map>>() / get<Any?>() は SerializationException になるため、
     * @Serializable クラス (FirestoreBadgeEntry) でデシリアライズする
     */
    private fun parseBadgesFromDocument(doc: DocumentSnapshot): List<Badge> {
        return try {
            val entries = try {
                doc.get<List<FirestoreBadgeEntry>?>("badges") ?: emptyList()
            } catch (e: Exception) {
                println("FirestoreBadgeRepository: badges parse error: ${e.message}")
                emptyList()
            }

            entries.mapNotNull { entry ->
                if (entry.badgeId.isBlank()) return@mapNotNull null
                BadgeDefinitions.getBadgeById(entry.badgeId)?.copy(
                    earnedAt = entry.earnedAt.toLong(),
                    isEarned = true
                )
            }
        } catch (e: Exception) {
            println("FirestoreBadgeRepository: parseBadgesFromDocument error: ${e.message}")
            emptyList()
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
            val progress = mutableMapOf<String, BadgeProgress>()

            // ストリーク計算: 過去120日の食事・運動記録からリアルタイム計算
            val streak = calculateStreakFromRecords(userId)
            progress["streak_3"] = BadgeProgress("streak_3", streak, 3)
            progress["streak_7"] = BadgeProgress("streak_7", streak, 7)
            progress["streak_14"] = BadgeProgress("streak_14", streak, 14)
            progress["streak_30"] = BadgeProgress("streak_30", streak, 30)
            progress["streak_100"] = BadgeProgress("streak_100", streak, 100)

            // 食事数: 実データカウント
            val mealsRef = firestore.collection("users").document(userId).collection("meals")
            val mealsCount = mealsRef.get().documents.size
            progress["milestone_10_meals"] = BadgeProgress("milestone_10_meals", mealsCount.coerceAtMost(10), 10)
            progress["milestone_100_meals"] = BadgeProgress("milestone_100_meals", mealsCount.coerceAtMost(100), 100)

            Result.success(progress)
        } catch (e: Exception) {
            Result.failure(AppError.DatabaseError("バッジ進捗の取得に失敗しました", e))
        }
    }

    /**
     * 食事・運動の記録日から連続記録日数を計算
     */
    private suspend fun calculateStreakFromRecords(userId: String): Int {
        val tz = TimeZone.of("Asia/Tokyo")
        val today = Clock.System.now().toLocalDateTime(tz).date
        val yesterday = today.minus(1, DateTimeUnit.DAY)

        // 過去120日のタイムスタンプ
        val sinceDate = today.minus(120, DateTimeUnit.DAY)
        val sinceTimestamp = sinceDate.atStartOfDayIn(tz).toEpochMilliseconds()

        val activeDays = mutableSetOf<LocalDate>()

        // 食事の記録日を収集
        try {
            val mealsSnap = firestore.collection("users").document(userId).collection("meals")
                .where { "timestamp" greaterThanOrEqualTo sinceTimestamp }
                .get()
            for (doc in mealsSnap.documents) {
                val ts = doc.get<Long?>("timestamp") ?: continue
                val date = Instant.fromEpochMilliseconds(ts).toLocalDateTime(tz).date
                activeDays.add(date)
            }
        } catch (_: Exception) { }

        // 運動の記録日を収集
        try {
            val workoutsSnap = firestore.collection("users").document(userId).collection("workouts")
                .where { "timestamp" greaterThanOrEqualTo sinceTimestamp }
                .get()
            for (doc in workoutsSnap.documents) {
                val ts = doc.get<Long?>("timestamp") ?: continue
                val date = Instant.fromEpochMilliseconds(ts).toLocalDateTime(tz).date
                activeDays.add(date)
            }
        } catch (_: Exception) { }

        // 今日か昨日にアクティブでなければストリーク0
        if (!activeDays.contains(today) && !activeDays.contains(yesterday)) {
            return 0
        }

        // 最新のアクティブ日から遡って連続日数をカウント
        var checkDate = if (activeDays.contains(today)) today else yesterday
        var streak = 0
        while (activeDays.contains(checkDate)) {
            streak++
            checkDate = checkDate.minus(1, DateTimeUnit.DAY)
        }

        return streak
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
