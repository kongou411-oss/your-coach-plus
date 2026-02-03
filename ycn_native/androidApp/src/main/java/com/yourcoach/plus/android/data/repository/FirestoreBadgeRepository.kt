package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.ktx.Firebase
import com.yourcoach.plus.shared.domain.model.Badge
import com.yourcoach.plus.shared.domain.model.BadgeCategory
import com.yourcoach.plus.shared.domain.repository.BadgeDefinitions
import com.yourcoach.plus.shared.domain.repository.BadgeProgress
import com.yourcoach.plus.shared.domain.repository.BadgeRepository
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Firestore実装のバッジリポジトリ
 */
class FirestoreBadgeRepository : BadgeRepository {

    private val firestore = Firebase.firestore
    private val functions = FirebaseFunctions.getInstance("asia-northeast2")

    override suspend fun getUserBadges(userId: String): Result<List<Badge>> {
        return try {
            val doc = firestore
                .collection("users")
                .document(userId)
                .get()
                .await()

            @Suppress("UNCHECKED_CAST")
            val earnedBadges = doc.get("badges") as? List<Map<String, Any>> ?: emptyList()

            val badges = earnedBadges.mapNotNull { badgeData ->
                val badgeId = badgeData["badgeId"] as? String ?: return@mapNotNull null
                val earnedAt = badgeData["earnedAt"] as? Long ?: System.currentTimeMillis()

                BadgeDefinitions.getBadgeById(badgeId)?.copy(
                    earnedAt = earnedAt,
                    isEarned = true
                )
            }

            Result.success(badges)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun observeUserBadges(userId: String): Flow<List<Badge>> = callbackFlow {
        val listener = firestore
            .collection("users")
            .document(userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }

                @Suppress("UNCHECKED_CAST")
                val earnedBadges = snapshot?.get("badges") as? List<Map<String, Any>> ?: emptyList()

                val badges = earnedBadges.mapNotNull { badgeData ->
                    val badgeId = badgeData["badgeId"] as? String ?: return@mapNotNull null
                    val earnedAt = badgeData["earnedAt"] as? Long ?: System.currentTimeMillis()

                    BadgeDefinitions.getBadgeById(badgeId)?.copy(
                        earnedAt = earnedAt,
                        isEarned = true
                    )
                }

                trySend(badges)
            }

        awaitClose { listener.remove() }
    }

    override suspend fun getAllBadges(): Result<List<Badge>> {
        return Result.success(BadgeDefinitions.ALL_BADGES)
    }

    override suspend fun awardBadge(userId: String, badgeId: String): Result<Badge> {
        return try {
            val badge = BadgeDefinitions.getBadgeById(badgeId)
                ?: return Result.failure(Exception("Badge not found: $badgeId"))

            val badgeData = mapOf(
                "badgeId" to badgeId,
                "earnedAt" to System.currentTimeMillis()
            )

            firestore
                .collection("users")
                .document(userId)
                .update("badges", FieldValue.arrayUnion(badgeData))
                .await()

            // バッジ獲得で10XP付与
            try {
                val data = hashMapOf("expPoints" to 10)
                functions.getHttpsCallable("addExperience").call(data).await()
            } catch (e: Exception) {
                // XP付与失敗してもバッジ獲得は成功とする
                android.util.Log.e("FirestoreBadgeRepository", "Failed to grant XP for badge: $badgeId", e)
            }

            Result.success(badge.copy(
                earnedAt = System.currentTimeMillis(),
                isEarned = true
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getBadgeProgress(userId: String): Result<Map<String, BadgeProgress>> {
        return try {
            val userDoc = firestore
                .collection("users")
                .document(userId)
                .get()
                .await()

            // ユーザーの統計を取得
            val currentStreak = (userDoc.get("currentStreak") as? Long)?.toInt() ?: 0
            val totalMeals = (userDoc.get("totalMeals") as? Long)?.toInt() ?: 0
            val totalWorkouts = (userDoc.get("totalWorkouts") as? Long)?.toInt() ?: 0
            val totalAnalyses = (userDoc.get("totalAnalyses") as? Long)?.toInt() ?: 0

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
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * 統計を更新（バッジ判定用）
     * Cloud Function updateBadgeStats を呼び出す
     */
    override suspend fun updateBadgeStats(action: String, data: Map<String, Any>?): Result<Unit> {
        return try {
            val params = hashMapOf<String, Any>("action" to action)
            if (data != null) {
                params["data"] = data
            }
            functions.getHttpsCallable("updateBadgeStats").call(params).await()
            Result.success(Unit)
        } catch (e: Exception) {
            android.util.Log.e("FirestoreBadgeRepository", "Failed to update badge stats: $action", e)
            Result.failure(e)
        }
    }

    /**
     * バッジ達成チェック＆自動付与
     * Cloud Function checkAndAwardBadges を呼び出す
     */
    override suspend fun checkAndAwardBadges(): Result<List<String>> {
        return try {
            android.util.Log.d("BadgeRepo", "checkAndAwardBadges: 呼び出し開始")
            val result = functions.getHttpsCallable("checkAndAwardBadges").call().await()

            @Suppress("UNCHECKED_CAST")
            val data = result.data as? Map<String, Any> ?: emptyMap()
            android.util.Log.d("BadgeRepo", "checkAndAwardBadges: レスポンス = $data")

            @Suppress("UNCHECKED_CAST")
            val awardedBadges = (data["awardedBadges"] as? List<Map<String, Any>>)?.mapNotNull {
                it["badgeId"] as? String
            } ?: emptyList()

            android.util.Log.d("BadgeRepo", "checkAndAwardBadges: 獲得バッジ = $awardedBadges")

            Result.success(awardedBadges)
        } catch (e: Exception) {
            android.util.Log.e("BadgeRepo", "checkAndAwardBadges: エラー", e)
            Result.failure(e)
        }
    }
}
