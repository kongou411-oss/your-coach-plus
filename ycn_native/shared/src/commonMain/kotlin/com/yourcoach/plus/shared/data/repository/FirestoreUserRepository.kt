package com.yourcoach.plus.shared.data.repository

import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.util.AppError
import com.yourcoach.plus.shared.util.DateUtil
import com.yourcoach.plus.shared.util.invokeCloudFunction
import com.yourcoach.plus.shared.util.getProfileMap
import dev.gitlive.firebase.Firebase
import dev.gitlive.firebase.firestore.FieldValue
import dev.gitlive.firebase.firestore.FirebaseFirestore
import dev.gitlive.firebase.firestore.firestore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Firestore ユーザーリポジトリ実装 (GitLive KMP版)
 */
class FirestoreUserRepository : UserRepository {

    companion object {
        const val INITIAL_CREDITS = 14 // 新規ユーザーの初期クレジット
    }

    private val firestore: FirebaseFirestore by lazy { Firebase.firestore }
    private val usersCollection by lazy { firestore.collection("users") }

    /**
     * 新規ユーザーを作成（初期クレジット14付与）
     */
    override suspend fun createUser(userId: String, email: String, displayName: String?): Result<User> {
        return try {
            val now = DateUtil.currentTimestamp()
            val userData = mapOf(
                "email" to email,
                "displayName" to displayName,
                "photoUrl" to null,
                "isPremium" to false,
                "freeCredits" to INITIAL_CREDITS,
                "paidCredits" to 0,
                "termsAgreedAt" to now,
                "createdAt" to now,
                "lastLoginAt" to now
            )
            usersCollection.document(userId).set(userData)

            val user = User(
                uid = userId,
                email = email,
                displayName = displayName,
                photoUrl = null,
                isPremium = false,
                freeCredits = INITIAL_CREDITS,
                paidCredits = 0,
                createdAt = now,
                lastLoginAt = now
            )
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("ユーザーの作成に失敗しました", e))
        }
    }

    /**
     * ユーザー情報を取得
     */
    override suspend fun getUser(userId: String): Result<User?> {
        return try {
            // サーバーから直接取得（キャッシュの古いデータを避けるため）
            val snapshot = usersCollection.document(userId).get(dev.gitlive.firebase.firestore.Source.SERVER)
            if (!snapshot.exists) {
                return Result.success(null)
            }

            val user = snapshot.toUser(userId)
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("ユーザー情報の取得に失敗しました", e))
        }
    }

    /**
     * ユーザー情報をリアルタイム監視
     */
    override fun observeUser(userId: String): Flow<User?> {
        return usersCollection.document(userId).snapshots.map { snapshot ->
            if (snapshot.exists) {
                snapshot.toUser(userId)
            } else {
                null
            }
        }
    }

    /**
     * ユーザー情報を更新
     */
    override suspend fun updateUser(userId: String, user: User): Result<Unit> {
        return try {
            val data = mapOf(
                "email" to user.email,
                "displayName" to user.displayName,
                "photoUrl" to user.photoUrl,
                "isPremium" to user.isPremium,
                "freeCredits" to user.freeCredits,
                "paidCredits" to user.paidCredits,
                "lastLoginAt" to DateUtil.currentTimestamp()
            )
            usersCollection.document(userId).update(data)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("ユーザー情報の更新に失敗しました", e))
        }
    }

    /**
     * プロフィールを更新
     */
    override suspend fun updateProfile(userId: String, profile: UserProfile): Result<Unit> {
        return try {
            val profileData = mapOf(
                "profile" to mapOf(
                    "nickname" to profile.nickname,
                    "gender" to profile.gender?.name,
                    "birthYear" to profile.birthYear,
                    "age" to profile.age,
                    "height" to profile.height,
                    "weight" to profile.weight,
                    "bodyFatPercentage" to profile.bodyFatPercentage,
                    "targetWeight" to profile.targetWeight,
                    "activityLevel" to profile.activityLevel?.name,
                    "goal" to profile.goal?.name,
                    "style" to profile.style,
                    "idealWeight" to profile.idealWeight,
                    "idealBodyFatPercentage" to profile.idealBodyFatPercentage,
                    "targetCalories" to profile.targetCalories,
                    "targetProtein" to profile.targetProtein,
                    "targetFat" to profile.targetFat,
                    "targetCarbs" to profile.targetCarbs,
                    "proteinRatioPercent" to profile.proteinRatioPercent,
                    "fatRatioPercent" to profile.fatRatioPercent,
                    "carbRatioPercent" to profile.carbRatioPercent,
                    "calorieAdjustment" to profile.calorieAdjustment,
                    "dietaryPreferences" to profile.dietaryPreferences,
                    "allergies" to profile.allergies,
                    "preferredProteinSources" to profile.preferredProteinSources,
                    "preferredCarbSources" to profile.preferredCarbSources,
                    "preferredFatSources" to profile.preferredFatSources,
                    "avoidFoods" to profile.avoidFoods,
                    "trainingStyle" to profile.trainingStyle.name,
                    "onboardingCompleted" to profile.onboardingCompleted,
                    "favoriteFoods" to profile.favoriteFoods,
                    "ngFoods" to profile.ngFoods,
                    "budgetTier" to profile.budgetTier,
                    "mealsPerDay" to profile.mealsPerDay,
                    "trainingAfterMeal" to profile.trainingAfterMeal,
                    "preWorkoutProtein" to profile.preWorkoutProtein,
                    "preWorkoutFat" to profile.preWorkoutFat,
                    "preWorkoutCarbs" to profile.preWorkoutCarbs,
                    "postWorkoutProtein" to profile.postWorkoutProtein,
                    "postWorkoutFat" to profile.postWorkoutFat,
                    "postWorkoutCarbs" to profile.postWorkoutCarbs,
                    "wakeUpTime" to profile.wakeUpTime,
                    "sleepTime" to profile.sleepTime,
                    "trainingTime" to profile.trainingTime,
                    "trainingDuration" to profile.trainingDuration
                )
            )
            usersCollection.document(userId).update(profileData)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("プロフィールの更新に失敗しました", e))
        }
    }

    /**
     * プロフィール画像URLを更新
     */
    override suspend fun updatePhotoUrl(userId: String, photoUrl: String): Result<Unit> {
        return try {
            usersCollection.document(userId).update(mapOf("photoUrl" to photoUrl))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("プロフィール画像の更新に失敗しました", e))
        }
    }

    /**
     * プレミアムステータスを更新
     */
    override suspend fun updatePremiumStatus(userId: String, isPremium: Boolean): Result<Unit> {
        return try {
            usersCollection.document(userId).update(mapOf("isPremium" to isPremium))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("プレミアムステータスの更新に失敗しました", e))
        }
    }

    /**
     * クレジットを追加（有料クレジットpaidCreditsに追加）
     */
    override suspend fun addCredits(userId: String, amount: Int): Result<Int> {
        return try {
            // 現在の値を取得
            val snapshot = usersCollection.document(userId).get()
            val currentFreeCredits = snapshot.get<Long?>("freeCredits")?.toInt() ?: INITIAL_CREDITS
            val currentPaidCredits = snapshot.get<Long?>("paidCredits")?.toInt() ?: 0

            val newPaidCredits = currentPaidCredits + amount

            usersCollection.document(userId).update(
                mapOf(
                    "paidCredits" to newPaidCredits,
                    "freeCredits" to currentFreeCredits
                )
            )

            Result.success(currentFreeCredits + newPaidCredits)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("クレジットの追加に失敗しました: ${e.message}", e))
        }
    }

    /**
     * クレジットを消費（freeCreditsを優先消費、不足分をpaidCreditsから消費）
     */
    override suspend fun useCredits(userId: String, amount: Int): Result<Int> {
        return try {
            val snapshot = usersCollection.document(userId).get()

            var freeCredits = snapshot.get<Long?>("freeCredits")?.toInt()
                ?: snapshot.get<Long?>("credits")?.toInt()
                ?: INITIAL_CREDITS
            var paidCredits = snapshot.get<Long?>("paidCredits")?.toInt() ?: 0

            val totalCredits = freeCredits + paidCredits
            if (totalCredits < amount) {
                return Result.failure(AppError.InsufficientCredits())
            }

            // freeCreditsを優先消費
            var remaining = amount
            if (freeCredits >= remaining) {
                freeCredits -= remaining
                remaining = 0
            } else {
                remaining -= freeCredits
                freeCredits = 0
                paidCredits -= remaining
            }

            usersCollection.document(userId).update(
                mapOf(
                    "freeCredits" to freeCredits,
                    "paidCredits" to paidCredits
                )
            )

            Result.success(freeCredits + paidCredits)
        } catch (e: AppError.InsufficientCredits) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("クレジットの消費に失敗しました", e))
        }
    }

    /**
     * FCMトークンを登録
     */
    override suspend fun registerFcmToken(userId: String, token: String): Result<Unit> {
        return try {
            usersCollection.document(userId).update(
                mapOf("fcmTokens" to FieldValue.arrayUnion(token))
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("FCMトークンの登録に失敗しました", e))
        }
    }

    /**
     * FCMトークンを削除
     */
    override suspend fun removeFcmToken(userId: String, token: String): Result<Unit> {
        return try {
            usersCollection.document(userId).update(
                mapOf("fcmTokens" to FieldValue.arrayRemove(token))
            )
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("FCMトークンの削除に失敗しました", e))
        }
    }

    /**
     * ユーザーデータを完全削除（GDPR対応）
     */
    override suspend fun deleteUserData(userId: String): Result<Unit> {
        return try {
            val subCollections = listOf("meals", "workouts", "dailyScores", "analyses", "badges", "notifications")

            for (subCollection in subCollections) {
                val docs = usersCollection.document(userId)
                    .collection(subCollection)
                    .get()

                for (doc in docs.documents) {
                    doc.reference.delete()
                }
            }

            usersCollection.document(userId).delete()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("ユーザーデータの削除に失敗しました", e))
        }
    }

    /**
     * 経験値を追加（Cloud Functions経由 - Android版と同一）
     */
    override suspend fun addExperience(userId: String, amount: Int): Result<Pair<Int, Boolean>> {
        return try {
            val result = invokeCloudFunction(
                region = "asia-northeast2",
                functionName = "addExperience",
                data = mapOf("expPoints" to amount)
            )

            val newExp = (result["experience"] as? Number)?.toInt() ?: 0
            val leveledUp = result["leveledUp"] as? Boolean ?: false

            Result.success(Pair(newExp, leveledUp))
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("経験値の追加に失敗しました", e))
        }
    }

    /**
     * ログインボーナスをチェック・付与（Cloud Functions経由 - Android版と同一）
     */
    override suspend fun checkAndGrantLoginBonus(userId: String): Result<Boolean> {
        return try {
            val result = invokeCloudFunction(
                region = "asia-northeast2",
                functionName = "grantLoginBonus",
                data = emptyMap()
            )

            val granted = result["granted"] as? Boolean ?: false
            Result.success(granted)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("ログインボーナスの確認に失敗しました", e))
        }
    }

    /**
     * DocumentSnapshotをUserに変換
     */
    private fun dev.gitlive.firebase.firestore.DocumentSnapshot.toUser(userId: String): User {
        // iOS対応: プラットフォーム固有のプロファイルパーサーを使用
        val profile = try {
            getProfileMap()?.let { parseUserProfile(it) }
        } catch (e: Throwable) {
            null
        }

        val freeCredits = get<Long?>("freeCredits")?.toInt()
            ?: get<Long?>("credits")?.toInt()
            ?: INITIAL_CREDITS
        val paidCredits = get<Long?>("paidCredits")?.toInt() ?: 0
        val experience = get<Long?>("experience")?.toInt() ?: 0
        val profileWithExp = profile?.copy(experience = experience)

        return User(
            uid = userId,
            email = get<String?>("email") ?: "",
            displayName = get<String?>("displayName"),
            photoUrl = get<String?>("photoUrl"),
            isPremium = get<Boolean?>("isPremium") ?: false,
            freeCredits = freeCredits,
            paidCredits = paidCredits,
            profile = profileWithExp,
            createdAt = get<Long?>("createdAt") ?: 0,
            lastLoginAt = get<Long?>("lastLoginAt") ?: 0,
            lastLoginBonusDate = get<String?>("lastLoginBonusDate"),
            b2b2cOrgId = get<String?>("b2b2cOrgId"),
            b2b2cOrgName = get<String?>("b2b2cOrgName"),
            organizationName = get<String?>("organizationName"),
            role = get<String?>("role")
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseUserProfile(profileMap: Map<String, Any?>): UserProfile {
        val mealSlotConfigMap = profileMap["mealSlotConfig"] as? Map<String, Any?>
        val mealSlotConfig = mealSlotConfigMap?.let { parseMealSlotConfig(it) }

        val workoutSlotConfigMap = profileMap["workoutSlotConfig"] as? Map<String, Any?>
        val workoutSlotConfig = workoutSlotConfigMap?.let { parseWorkoutSlotConfig(it) }

        val routineTemplateConfigMap = profileMap["routineTemplateConfig"] as? Map<String, Any?>
        val routineTemplateConfig = routineTemplateConfigMap?.let { parseRoutineTemplateConfig(it) }

        return UserProfile(
            nickname = profileMap["nickname"] as? String,
            gender = (profileMap["gender"] as? String)?.let {
                try { Gender.valueOf(it) } catch (e: Exception) { null }
            },
            birthYear = (profileMap["birthYear"] as? Number)?.toInt(),
            age = (profileMap["age"] as? Number)?.toInt(),
            height = (profileMap["height"] as? Number)?.toFloat(),
            weight = (profileMap["weight"] as? Number)?.toFloat(),
            bodyFatPercentage = (profileMap["bodyFatPercentage"] as? Number)?.toFloat(),
            targetWeight = (profileMap["targetWeight"] as? Number)?.toFloat(),
            activityLevel = (profileMap["activityLevel"] as? String)?.let {
                try { ActivityLevel.valueOf(it) } catch (e: Exception) { null }
            },
            goal = (profileMap["goal"] as? String)?.let {
                try { FitnessGoal.valueOf(it) } catch (e: Exception) { null }
            },
            style = profileMap["style"] as? String,
            idealWeight = (profileMap["idealWeight"] as? Number)?.toFloat(),
            idealBodyFatPercentage = (profileMap["idealBodyFatPercentage"] as? Number)?.toFloat(),
            targetCalories = (profileMap["targetCalories"] as? Number)?.toInt(),
            targetProtein = (profileMap["targetProtein"] as? Number)?.toFloat(),
            targetFat = (profileMap["targetFat"] as? Number)?.toFloat(),
            targetCarbs = (profileMap["targetCarbs"] as? Number)?.toFloat(),
            proteinRatioPercent = (profileMap["proteinRatioPercent"] as? Number)?.toInt() ?: 35,
            fatRatioPercent = (profileMap["fatRatioPercent"] as? Number)?.toInt() ?: 15,
            carbRatioPercent = (profileMap["carbRatioPercent"] as? Number)?.toInt() ?: 50,
            calorieAdjustment = (profileMap["calorieAdjustment"] as? Number)?.toInt() ?: 0,
            dietaryPreferences = (profileMap["dietaryPreferences"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
            allergies = (profileMap["allergies"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
            preferredProteinSources = (profileMap["preferredProteinSources"] as? List<*>)?.filterIsInstance<String>() ?: listOf("鶏むね肉", "鮭"),
            preferredCarbSources = (profileMap["preferredCarbSources"] as? List<*>)?.filterIsInstance<String>() ?: listOf("白米", "玄米"),
            preferredFatSources = (profileMap["preferredFatSources"] as? List<*>)?.filterIsInstance<String>() ?: listOf("オリーブオイル", "アボカド"),
            avoidFoods = (profileMap["avoidFoods"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
            trainingStyle = (profileMap["trainingStyle"] as? String)?.let {
                try { TrainingStyle.valueOf(it) } catch (e: Exception) { TrainingStyle.PUMP }
            } ?: TrainingStyle.PUMP,
            onboardingCompleted = profileMap["onboardingCompleted"] as? Boolean ?: false,
            experience = 0,
            favoriteFoods = profileMap["favoriteFoods"] as? String,
            ngFoods = profileMap["ngFoods"] as? String,
            budgetTier = (profileMap["budgetTier"] as? Number)?.toInt() ?: 2,
            mealsPerDay = (profileMap["mealsPerDay"] as? Number)?.toInt() ?: 5,
            wakeUpTime = profileMap["wakeUpTime"] as? String,
            sleepTime = profileMap["sleepTime"] as? String,
            trainingTime = profileMap["trainingTime"] as? String,
            trainingAfterMeal = (profileMap["trainingAfterMeal"] as? Number)?.toInt(),
            trainingDuration = (profileMap["trainingDuration"] as? Number)?.toInt() ?: 120,
            preWorkoutProtein = (profileMap["preWorkoutProtein"] as? Number)?.toInt() ?: 20,
            preWorkoutFat = (profileMap["preWorkoutFat"] as? Number)?.toInt() ?: 5,
            preWorkoutCarbs = (profileMap["preWorkoutCarbs"] as? Number)?.toInt() ?: 50,
            postWorkoutProtein = (profileMap["postWorkoutProtein"] as? Number)?.toInt() ?: 30,
            postWorkoutFat = (profileMap["postWorkoutFat"] as? Number)?.toInt() ?: 5,
            postWorkoutCarbs = (profileMap["postWorkoutCarbs"] as? Number)?.toInt() ?: 60,
            mealSlotConfig = mealSlotConfig,
            workoutSlotConfig = workoutSlotConfig,
            routineTemplateConfig = routineTemplateConfig
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseMealSlotConfig(configMap: Map<String, Any?>): MealSlotConfig {
        val mealsPerDay = (configMap["mealsPerDay"] as? Number)?.toInt() ?: 5
        val slotsData = (configMap["slots"] as? List<*>)?.mapNotNull { slotData ->
            val slotMap = slotData as? Map<String, Any?> ?: return@mapNotNull null
            val slotNumber = (slotMap["slotNumber"] as? Number)?.toInt() ?: return@mapNotNull null
            MealSlot(
                slotNumber = slotNumber,
                relativeTime = slotMap["relativeTime"] as? String,
                absoluteTime = slotMap["absoluteTime"] as? String
            )
        } ?: emptyList()

        return MealSlotConfig(slots = slotsData, mealsPerDay = mealsPerDay)
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseWorkoutSlotConfig(configMap: Map<String, Any?>): WorkoutSlotConfig {
        return WorkoutSlotConfig(slot = WorkoutSlot())
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseRoutineTemplateConfig(configMap: Map<String, Any?>): RoutineTemplateConfig {
        val mappingsData = (configMap["mappings"] as? List<*>)?.mapNotNull { mappingData ->
            val mappingMap = mappingData as? Map<String, Any?> ?: return@mapNotNull null
            val slotNumber = (mappingMap["slotNumber"] as? Number)?.toInt() ?: return@mapNotNull null
            RoutineTemplateMapping(
                routineId = mappingMap["routineId"] as? String ?: return@mapNotNull null,
                routineName = mappingMap["routineName"] as? String ?: "",
                slotNumber = slotNumber,
                templateId = mappingMap["templateId"] as? String ?: return@mapNotNull null,
                templateName = mappingMap["templateName"] as? String ?: ""
            )
        } ?: emptyList()

        return RoutineTemplateConfig(mappings = mappingsData)
    }
}
