package com.yourcoach.plus.android.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.yourcoach.plus.shared.domain.model.*
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.util.AppError
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Firestore ユーザーリポジトリ実装
 */
class FirestoreUserRepository : UserRepository {

    companion object {
        const val INITIAL_CREDITS = 14 // 新規ユーザーの初期クレジット
    }

    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
    private val usersCollection = firestore.collection("users")

    /**
     * 新規ユーザーを作成（初期クレジット14付与）
     */
    override suspend fun createUser(userId: String, email: String, displayName: String?): Result<User> {
        return try {
            val now = FieldValue.serverTimestamp()
            val userData = mapOf(
                "email" to email,
                "displayName" to displayName,
                "photoUrl" to null,
                "isPremium" to false,
                "freeCredits" to INITIAL_CREDITS,  // 無料クレジット（初期配布）
                "paidCredits" to 0,                 // 有料クレジット
                "termsAgreedAt" to now,
                "createdAt" to now,
                "lastLoginAt" to now
            )
            usersCollection.document(userId).set(userData).await()

            val user = User(
                uid = userId,
                email = email,
                displayName = displayName,
                photoUrl = null,
                isPremium = false,
                freeCredits = INITIAL_CREDITS,
                paidCredits = 0,
                createdAt = System.currentTimeMillis(),
                lastLoginAt = System.currentTimeMillis()
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
            val snapshot = usersCollection.document(userId).get().await()
            if (!snapshot.exists()) {
                return Result.success(null)
            }

            val user = snapshot.toUser()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("ユーザー情報の取得に失敗しました", e))
        }
    }

    /**
     * ユーザー情報をリアルタイム監視
     */
    override fun observeUser(userId: String): Flow<User?> = callbackFlow {
        val listener = usersCollection.document(userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val user = snapshot?.toUser()
                trySend(user)
            }
        awaitClose { listener.remove() }
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
                "lastLoginAt" to FieldValue.serverTimestamp()
            )
            usersCollection.document(userId).set(data, SetOptions.merge()).await()
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
                    "onboardingCompleted" to profile.onboardingCompleted,
                    // AI学習用の設定
                    "favoriteFoods" to profile.favoriteFoods,
                    "ngFoods" to profile.ngFoods,
                    "budgetTier" to profile.budgetTier,
                    // 食事・トレーニング設定
                    "mealsPerDay" to profile.mealsPerDay,
                    "trainingAfterMeal" to profile.trainingAfterMeal,
                    // トレ前後PFC設定
                    "preWorkoutProtein" to profile.preWorkoutProtein,
                    "preWorkoutFat" to profile.preWorkoutFat,
                    "preWorkoutCarbs" to profile.preWorkoutCarbs,
                    "postWorkoutProtein" to profile.postWorkoutProtein,
                    "postWorkoutFat" to profile.postWorkoutFat,
                    "postWorkoutCarbs" to profile.postWorkoutCarbs,
                    // タイムライン設定
                    "wakeUpTime" to profile.wakeUpTime,
                    "sleepTime" to profile.sleepTime,
                    "trainingTime" to profile.trainingTime,
                    "trainingDuration" to profile.trainingDuration
                )
            )
            usersCollection.document(userId).set(profileData, SetOptions.merge()).await()
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
            usersCollection.document(userId)
                .update("photoUrl", photoUrl)
                .await()
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
            usersCollection.document(userId)
                .update("isPremium", isPremium)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("プレミアムステータスの更新に失敗しました", e))
        }
    }

    /**
     * プロフィールのみを取得
     */
    suspend fun getUserProfile(userId: String): Result<UserProfile?> {
        return try {
            val snapshot = usersCollection.document(userId).get().await()
            if (!snapshot.exists()) {
                return Result.success(null)
            }
            val user = snapshot.toUser()
            Result.success(user?.profile)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("プロフィールの取得に失敗しました", e))
        }
    }

    /**
     * 食事・運動スロット設定を更新
     */
    suspend fun updateSlotConfig(
        userId: String,
        mealSlotConfig: MealSlotConfig,
        workoutSlotConfig: WorkoutSlotConfig,
        routineTemplateConfig: RoutineTemplateConfig
    ): Result<Unit> {
        return try {
            // MealSlotConfigをMapに変換（タイムライン関連フィールド含む）
            val slotsData = mealSlotConfig.slots.map { slot ->
                mapOf(
                    "slotNumber" to slot.slotNumber,
                    "mode" to slot.mode.name,
                    "templateId" to slot.templateId,
                    "templateName" to slot.templateName,
                    "routineLinked" to slot.routineLinked,
                    "relativeTime" to slot.relativeTime,
                    "absoluteTime" to slot.absoluteTime,
                    "defaultFoodChoice" to slot.defaultFoodChoice.name
                )
            }

            // WorkoutSlotConfigをMapに変換
            val workoutSlotData = mapOf(
                "mode" to workoutSlotConfig.slot.mode.name,
                "templateId" to workoutSlotConfig.slot.templateId,
                "templateName" to workoutSlotConfig.slot.templateName,
                "routineLinked" to workoutSlotConfig.slot.routineLinked
            )

            // RoutineTemplateConfigをMapに変換
            val mappingsData = routineTemplateConfig.mappings.map { mapping ->
                mapOf(
                    "routineId" to mapping.routineId,
                    "routineName" to mapping.routineName,
                    "slotNumber" to mapping.slotNumber,
                    "templateId" to mapping.templateId,
                    "templateName" to mapping.templateName
                )
            }

            val data = mapOf(
                "profile.mealSlotConfig" to mapOf(
                    "slots" to slotsData,
                    "mealsPerDay" to mealSlotConfig.mealsPerDay
                ),
                "profile.workoutSlotConfig" to mapOf(
                    "slot" to workoutSlotData
                ),
                "profile.routineTemplateConfig" to mapOf(
                    "mappings" to mappingsData
                )
            )

            usersCollection.document(userId).update(data).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("スロット設定の更新に失敗しました", e))
        }
    }

    /**
     * タイムライン設定（起床・就寝・トレーニング時刻）を更新
     */
    suspend fun updateTimelineConfig(
        userId: String,
        wakeUpTime: String,
        sleepTime: String,
        trainingTime: String?,
        trainingAfterMeal: Int?,
        trainingDuration: Int = 120,
        trainingStyle: String = "PUMP"
    ): Result<Unit> {
        return try {
            val data = mutableMapOf<String, Any?>(
                "profile.wakeUpTime" to wakeUpTime,
                "profile.sleepTime" to sleepTime,
                "profile.trainingDuration" to trainingDuration,
                "profile.trainingStyle" to trainingStyle
            )
            if (trainingTime != null) {
                data["profile.trainingTime"] = trainingTime
            }
            if (trainingAfterMeal != null) {
                data["profile.trainingAfterMeal"] = trainingAfterMeal
            }

            usersCollection.document(userId).update(data as Map<String, Any>).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("タイムライン設定の更新に失敗しました", e))
        }
    }

    /**
     * 無料クレジットを追加（テスト用）
     */
    suspend fun addFreeCredits(userId: String, amount: Int): Result<Int> {
        return try {
            usersCollection.document(userId)
                .update("freeCredits", FieldValue.increment(amount.toLong()))
                .await()

            // 更新後の合計クレジット数を取得
            val snapshot = usersCollection.document(userId).get().await()
            val freeCredits = snapshot.getLong("freeCredits")?.toInt() ?: 0
            val paidCredits = snapshot.getLong("paidCredits")?.toInt() ?: 0
            Result.success(freeCredits + paidCredits)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("クレジットの追加に失敗しました", e))
        }
    }

    /**
     * クレジットを追加（有料クレジットpaidCreditsに追加）
     * フィールドが存在しない場合も安全に処理
     */
    override suspend fun addCredits(userId: String, amount: Int): Result<Int> {
        return try {
            // トランザクションで安全に更新
            val result = firestore.runTransaction { transaction ->
                val docRef = usersCollection.document(userId)
                val snapshot = transaction.get(docRef)

                // 現在の値を取得（存在しない場合は0）
                val currentFreeCredits = snapshot.getLong("freeCredits")?.toInt() ?: INITIAL_CREDITS
                val currentPaidCredits = snapshot.getLong("paidCredits")?.toInt() ?: 0

                // 新しい値を計算
                val newPaidCredits = currentPaidCredits + amount

                // 更新（setでmerge - フィールドがなくても作成される）
                transaction.set(
                    docRef,
                    mapOf(
                        "paidCredits" to newPaidCredits,
                        "freeCredits" to currentFreeCredits  // 既存の値を維持
                    ),
                    SetOptions.merge()
                )

                currentFreeCredits + newPaidCredits
            }.await()

            Result.success(result)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("クレジットの追加に失敗しました: ${e.message}", e))
        }
    }

    /**
     * クレジットを消費（freeCreditsを優先消費、不足分をpaidCreditsから消費）
     */
    override suspend fun useCredits(userId: String, amount: Int): Result<Int> {
        return try {
            // トランザクションでクレジット確認と消費を行う
            val result = firestore.runTransaction { transaction ->
                val snapshot = transaction.get(usersCollection.document(userId))

                // freeCredits/paidCredits 取得（旧creditsフィールドからの移行もサポート）
                var freeCredits = snapshot.getLong("freeCredits")?.toInt()
                    ?: snapshot.getLong("credits")?.toInt()
                    ?: INITIAL_CREDITS
                var paidCredits = snapshot.getLong("paidCredits")?.toInt() ?: 0

                val totalCredits = freeCredits + paidCredits
                if (totalCredits < amount) {
                    throw AppError.InsufficientCredits()
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

                // 更新
                transaction.update(
                    usersCollection.document(userId),
                    mapOf(
                        "freeCredits" to freeCredits,
                        "paidCredits" to paidCredits
                    )
                )

                freeCredits + paidCredits
            }.await()

            Result.success(result)
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
            usersCollection.document(userId)
                .update("fcmTokens", FieldValue.arrayUnion(token))
                .await()
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
            usersCollection.document(userId)
                .update("fcmTokens", FieldValue.arrayRemove(token))
                .await()
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
            // サブコレクションを削除
            val subCollections = listOf("meals", "workouts", "dailyScores", "analyses", "badges", "notifications")

            for (subCollection in subCollections) {
                val docs = usersCollection.document(userId)
                    .collection(subCollection)
                    .get()
                    .await()

                for (doc in docs.documents) {
                    doc.reference.delete().await()
                }
            }

            // ユーザードキュメント自体を削除
            usersCollection.document(userId).delete().await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(AppError.NetworkError("ユーザーデータの削除に失敗しました", e))
        }
    }

    /**
     * 経験値を追加（レベルアップ時は無料クレジット+1）
     * Cloud Functionで処理
     * @return Pair<新しい経験値, レベルアップしたか>
     */
    override suspend fun addExperience(userId: String, amount: Int): Result<Pair<Int, Boolean>> {
        return try {
            val functions = com.google.firebase.functions.FirebaseFunctions
                .getInstance("asia-northeast2")

            val data = hashMapOf("expPoints" to amount)

            val result = functions
                .getHttpsCallable("addExperience")
                .call(data)
                .await()

            val response = result.data as? Map<*, *>
            val newExp = (response?.get("experience") as? Number)?.toInt() ?: 0
            val leveledUp = response?.get("leveledUp") as? Boolean ?: false

            Result.success(Pair(newExp, leveledUp))
        } catch (e: Exception) {
            android.util.Log.e("UserRepo", "経験値追加エラー", e)
            Result.failure(AppError.NetworkError("経験値の追加に失敗しました", e))
        }
    }

    /**
     * ログインボーナスをチェック・付与（1日1回10XP、サーバーJST 0時リセット）
     * Cloud Functionで処理するため、端末の日付変更による悪用を防止
     * @return 付与された場合はtrue
     */
    override suspend fun checkAndGrantLoginBonus(userId: String): Result<Boolean> {
        return try {
            val functions = com.google.firebase.functions.FirebaseFunctions
                .getInstance("asia-northeast2")

            val result = functions
                .getHttpsCallable("grantLoginBonus")
                .call()
                .await()

            val data = result.data as? Map<*, *>
            val granted = data?.get("granted") as? Boolean ?: false

            if (granted) {
                val leveledUp = data?.get("leveledUp") as? Boolean ?: false
                if (leveledUp) {
                    android.util.Log.d("UserRepo", "ログインボーナスでレベルアップ!")
                }
            }

            Result.success(granted)
        } catch (e: Exception) {
            android.util.Log.e("UserRepo", "ログインボーナスエラー", e)
            Result.failure(AppError.NetworkError("ログインボーナスの確認に失敗しました", e))
        }
    }

    /**
     * DocumentSnapshotをUserに変換
     */
    private fun com.google.firebase.firestore.DocumentSnapshot.toUser(): User? {
        if (!exists()) return null

        val profileMap = get("profile") as? Map<*, *>
        val profile = profileMap?.let {
            // MealSlotConfigをパース
            val mealSlotConfigMap = it["mealSlotConfig"] as? Map<*, *>
            val mealSlotConfig = mealSlotConfigMap?.let { configMap ->
                val mealsPerDay = (configMap["mealsPerDay"] as? Number)?.toInt() ?: 5
                val slotsData = (configMap["slots"] as? List<*>)?.mapNotNull { slotData ->
                    val slotMap = slotData as? Map<*, *> ?: return@mapNotNull null
                    val slotNumber = (slotMap["slotNumber"] as? Number)?.toInt() ?: return@mapNotNull null
                    val mode = (slotMap["mode"] as? String)?.let { m ->
                        try { SlotMode.valueOf(m) } catch (e: Exception) { SlotMode.AI }
                    } ?: SlotMode.AI
                    val foodChoice = (slotMap["defaultFoodChoice"] as? String)?.let { fc ->
                        // 旧enum値からの移行: REAL_FOOD/SUPPLEMENT→KITCHEN, CONVENIENCE→STORE
                        when (fc) {
                            "REAL_FOOD", "SUPPLEMENT" -> FoodChoice.KITCHEN
                            "CONVENIENCE" -> FoodChoice.STORE
                            else -> try { FoodChoice.valueOf(fc) } catch (e: Exception) { FoodChoice.KITCHEN }
                        }
                    } ?: FoodChoice.KITCHEN
                    MealSlot(
                        slotNumber = slotNumber,
                        mode = mode,
                        templateId = slotMap["templateId"] as? String,
                        templateName = slotMap["templateName"] as? String,
                        routineLinked = slotMap["routineLinked"] as? Boolean ?: false,
                        relativeTime = slotMap["relativeTime"] as? String,
                        absoluteTime = slotMap["absoluteTime"] as? String,
                        defaultFoodChoice = foodChoice
                    )
                } ?: emptyList()

                MealSlotConfig(slots = slotsData, mealsPerDay = mealsPerDay)
            }

            // WorkoutSlotConfigをパース
            val workoutSlotConfigMap = it["workoutSlotConfig"] as? Map<*, *>
            val workoutSlotConfig = workoutSlotConfigMap?.let { configMap ->
                val slotMap = configMap["slot"] as? Map<*, *>
                val slot = slotMap?.let { sm ->
                    val mode = (sm["mode"] as? String)?.let { m ->
                        try { SlotMode.valueOf(m) } catch (e: Exception) { SlotMode.AI }
                    } ?: SlotMode.AI
                    WorkoutSlot(
                        mode = mode,
                        templateId = sm["templateId"] as? String,
                        templateName = sm["templateName"] as? String,
                        routineLinked = sm["routineLinked"] as? Boolean ?: false
                    )
                } ?: WorkoutSlot()
                WorkoutSlotConfig(slot = slot)
            }

            // RoutineTemplateConfigをパース
            val routineTemplateConfigMap = it["routineTemplateConfig"] as? Map<*, *>
            val routineTemplateConfig = routineTemplateConfigMap?.let { configMap ->
                val mappingsData = (configMap["mappings"] as? List<*>)?.mapNotNull { mappingData ->
                    val mappingMap = mappingData as? Map<*, *> ?: return@mapNotNull null
                    val slotNumber = (mappingMap["slotNumber"] as? Number)?.toInt() ?: return@mapNotNull null
                    RoutineTemplateMapping(
                        routineId = mappingMap["routineId"] as? String ?: return@mapNotNull null,
                        routineName = mappingMap["routineName"] as? String ?: "",
                        slotNumber = slotNumber,
                        templateId = mappingMap["templateId"] as? String ?: return@mapNotNull null,
                        templateName = mappingMap["templateName"] as? String ?: ""
                    )
                } ?: emptyList()

                RoutineTemplateConfig(mappings = mappingsData)
            }

            UserProfile(
                nickname = it["nickname"] as? String,
                gender = (it["gender"] as? String)?.let { g ->
                    try { Gender.valueOf(g) } catch (e: Exception) { null }
                },
                birthYear = (it["birthYear"] as? Number)?.toInt(),
                age = (it["age"] as? Number)?.toInt(),
                height = (it["height"] as? Number)?.toFloat(),
                weight = (it["weight"] as? Number)?.toFloat(),
                bodyFatPercentage = (it["bodyFatPercentage"] as? Number)?.toFloat(),
                targetWeight = (it["targetWeight"] as? Number)?.toFloat(),
                activityLevel = (it["activityLevel"] as? String)?.let { a ->
                    try { ActivityLevel.valueOf(a) } catch (e: Exception) { null }
                },
                goal = (it["goal"] as? String)?.let { g ->
                    try { FitnessGoal.valueOf(g) } catch (e: Exception) { null }
                },
                style = it["style"] as? String,
                idealWeight = (it["idealWeight"] as? Number)?.toFloat(),
                idealBodyFatPercentage = (it["idealBodyFatPercentage"] as? Number)?.toFloat(),
                targetCalories = (it["targetCalories"] as? Number)?.toInt(),
                targetProtein = (it["targetProtein"] as? Number)?.toFloat(),
                targetFat = (it["targetFat"] as? Number)?.toFloat(),
                targetCarbs = (it["targetCarbs"] as? Number)?.toFloat(),
                proteinRatioPercent = (it["proteinRatioPercent"] as? Number)?.toInt() ?: 30,
                fatRatioPercent = (it["fatRatioPercent"] as? Number)?.toInt() ?: 25,
                carbRatioPercent = (it["carbRatioPercent"] as? Number)?.toInt() ?: 45,
                calorieAdjustment = (it["calorieAdjustment"] as? Number)?.toInt() ?: 0,
                dietaryPreferences = (it["dietaryPreferences"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
                allergies = (it["allergies"] as? List<*>)?.filterIsInstance<String>() ?: emptyList(),
                onboardingCompleted = it["onboardingCompleted"] as? Boolean ?: false,
                // experienceはルートレベルから渡される（下で設定）
                experience = 0,  // 一時的に0、後で上書き
                // AI学習用の設定
                favoriteFoods = it["favoriteFoods"] as? String,
                ngFoods = it["ngFoods"] as? String,
                budgetTier = (it["budgetTier"] as? Number)?.toInt() ?: 2,
                // タイムライン設定
                mealsPerDay = (it["mealsPerDay"] as? Number)?.toInt() ?: 5,
                wakeUpTime = it["wakeUpTime"] as? String,
                sleepTime = it["sleepTime"] as? String,
                trainingTime = it["trainingTime"] as? String,
                trainingAfterMeal = (it["trainingAfterMeal"] as? Number)?.toInt(),
                trainingDuration = (it["trainingDuration"] as? Number)?.toInt() ?: 120,
                // トレ前後PFC設定
                preWorkoutProtein = (it["preWorkoutProtein"] as? Number)?.toInt() ?: 20,
                preWorkoutFat = (it["preWorkoutFat"] as? Number)?.toInt() ?: 5,
                preWorkoutCarbs = (it["preWorkoutCarbs"] as? Number)?.toInt() ?: 50,
                postWorkoutProtein = (it["postWorkoutProtein"] as? Number)?.toInt() ?: 30,
                postWorkoutFat = (it["postWorkoutFat"] as? Number)?.toInt() ?: 5,
                postWorkoutCarbs = (it["postWorkoutCarbs"] as? Number)?.toInt() ?: 60,
                mealSlotConfig = mealSlotConfig,
                workoutSlotConfig = workoutSlotConfig,
                routineTemplateConfig = routineTemplateConfig
            )
        }

        // freeCredits/paidCredits 対応（既存creditsフィールドからの移行もサポート）
        val freeCredits = getLong("freeCredits")?.toInt()
            ?: getLong("credits")?.toInt()  // 旧フィールドからのフォールバック
            ?: INITIAL_CREDITS
        val paidCredits = getLong("paidCredits")?.toInt() ?: 0

        // experienceはルートレベルから読み込み（Cloud Functionsがルートに保存するため）
        val experience = getLong("experience")?.toInt() ?: 0
        val profileWithExp = profile?.copy(experience = experience)

        return User(
            uid = id,
            email = getString("email") ?: "",
            displayName = getString("displayName"),
            photoUrl = getString("photoUrl"),
            isPremium = getBoolean("isPremium") ?: false,
            freeCredits = freeCredits,
            paidCredits = paidCredits,
            profile = profileWithExp,
            createdAt = getTimestamp("createdAt")?.toDate()?.time ?: 0,
            lastLoginAt = getTimestamp("lastLoginAt")?.toDate()?.time ?: 0,
            lastLoginBonusDate = getString("lastLoginBonusDate"),
            b2b2cOrgId = getString("b2b2cOrgId"),
            b2b2cOrgName = getString("b2b2cOrgName")
        )
    }
}
