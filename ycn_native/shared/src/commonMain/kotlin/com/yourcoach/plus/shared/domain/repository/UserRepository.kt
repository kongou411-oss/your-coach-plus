package com.yourcoach.plus.shared.domain.repository

import com.yourcoach.plus.shared.domain.model.MealSlotConfig
import com.yourcoach.plus.shared.domain.model.RoutineTemplateConfig
import com.yourcoach.plus.shared.domain.model.User
import com.yourcoach.plus.shared.domain.model.UserProfile
import com.yourcoach.plus.shared.domain.model.WorkoutSlotConfig
import kotlinx.coroutines.flow.Flow

/**
 * ユーザーリポジトリインターフェース
 */
interface UserRepository {
    /**
     * 新規ユーザーを作成（初期クレジット14付与）
     */
    suspend fun createUser(userId: String, email: String, displayName: String? = null): Result<User>

    /**
     * ユーザー情報を取得
     */
    suspend fun getUser(userId: String): Result<User?>

    /**
     * ユーザー情報をリアルタイム監視
     */
    fun observeUser(userId: String): Flow<User?>

    /**
     * ユーザー情報を更新
     */
    suspend fun updateUser(userId: String, user: User): Result<Unit>

    /**
     * プロフィールを取得
     */
    suspend fun getUserProfile(userId: String): Result<UserProfile?>

    /**
     * プロフィールを更新
     */
    suspend fun updateProfile(userId: String, profile: UserProfile): Result<Unit>

    /**
     * プロフィール画像URLを更新
     */
    suspend fun updatePhotoUrl(userId: String, photoUrl: String): Result<Unit>

    /**
     * プレミアムステータスを更新
     */
    suspend fun updatePremiumStatus(userId: String, isPremium: Boolean): Result<Unit>

    /**
     * クレジットを追加
     */
    suspend fun addCredits(userId: String, amount: Int): Result<Int>

    /**
     * クレジットを消費
     */
    suspend fun useCredits(userId: String, amount: Int): Result<Int>

    /**
     * FCMトークンを登録
     */
    suspend fun registerFcmToken(userId: String, token: String): Result<Unit>

    /**
     * FCMトークンを削除
     */
    suspend fun removeFcmToken(userId: String, token: String): Result<Unit>

    /**
     * ユーザーデータを完全削除（GDPR対応）
     */
    suspend fun deleteUserData(userId: String): Result<Unit>

    /**
     * 経験値を追加（レベルアップ時は無料クレジット+1）
     * @return Pair<新しい経験値, レベルアップしたか>
     */
    suspend fun addExperience(userId: String, amount: Int): Result<Pair<Int, Boolean>>

    /**
     * ログインボーナスをチェック・付与（1日1回）
     * @return 付与された場合はtrue
     */
    suspend fun checkAndGrantLoginBonus(userId: String): Result<Boolean>

    /**
     * スロット設定を更新（食事スロット・運動スロット・ルーティンテンプレート）
     */
    suspend fun updateSlotConfig(
        userId: String,
        mealSlotConfig: MealSlotConfig,
        workoutSlotConfig: WorkoutSlotConfig,
        routineTemplateConfig: RoutineTemplateConfig,
        questAutoGenEnabled: Boolean = false
    ): Result<Unit>

    /**
     * タイムライン設定を更新（起床・就寝・トレーニング時刻）
     */
    suspend fun updateTimelineConfig(
        userId: String,
        wakeUpTime: String,
        sleepTime: String,
        trainingTime: String?,
        trainingAfterMeal: Int?,
        trainingDuration: Int = 120,
        trainingStyle: String = "PUMP"
    ): Result<Unit>
}
