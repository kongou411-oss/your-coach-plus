package com.yourcoach.plus.shared.util

import dev.gitlive.firebase.firestore.DocumentSnapshot

/**
 * Firestore DocumentSnapshot からプロフィールマップを取得する。
 *
 * GitLive SDK の get<Map<String, Any?>>() は kotlinx.serialization で
 * Any 型のシリアライザーが存在しないため SerializationException になる。
 * そのため個別フィールドを基本型として読み取りMapを構築する。
 * Android/iOS 共通実装。
 */
@Suppress("UNCHECKED_CAST")
fun DocumentSnapshot.getProfileMap(): Map<String, Any?>? {
    val map = mutableMapOf<String, Any?>()
    var hasAnyValue = false

    // 文字列フィールド
    for (key in STRING_FIELDS) {
        val value = try { get<String?>("profile.$key") } catch (_: Throwable) { null }
        if (value != null) { map[key] = value; hasAnyValue = true }
    }

    // 数値フィールド (Firestore は Double/Long で保存)
    for (key in NUMBER_FIELDS) {
        val value = try { get<Double?>("profile.$key") } catch (_: Throwable) {
            try { get<Long?>("profile.$key") } catch (_: Throwable) { null }
        }
        if (value != null) { map[key] = value; hasAnyValue = true }
    }

    // Boolean フィールド
    for (key in BOOLEAN_FIELDS) {
        val value = try { get<Boolean?>("profile.$key") } catch (_: Throwable) { null }
        if (value != null) { map[key] = value; hasAnyValue = true }
    }

    // リストフィールド
    for (key in LIST_FIELDS) {
        val value = try { get<List<String>?>("profile.$key") } catch (_: Throwable) { null }
        if (value != null) { map[key] = value; hasAnyValue = true }
    }

    return if (hasAnyValue) map else null
}

private val STRING_FIELDS = listOf(
    "nickname", "gender", "style", "activityLevel", "goal",
    "trainingStyle", "favoriteFoods", "ngFoods",
    "wakeUpTime", "sleepTime", "trainingTime"
)

private val NUMBER_FIELDS = listOf(
    "age", "birthYear", "height", "weight", "bodyFatPercentage",
    "targetWeight", "idealWeight", "idealBodyFatPercentage",
    "targetCalories", "targetProtein", "targetFat", "targetCarbs",
    "proteinRatioPercent", "fatRatioPercent", "carbRatioPercent",
    "calorieAdjustment", "budgetTier", "mealsPerDay",
    "trainingAfterMeal", "trainingDuration", "experience",
    "preWorkoutProtein", "preWorkoutFat", "preWorkoutCarbs",
    "postWorkoutProtein", "postWorkoutFat", "postWorkoutCarbs"
)

private val BOOLEAN_FIELDS = listOf("onboardingCompleted", "questAutoGenEnabled")

private val LIST_FIELDS = listOf(
    "dietaryPreferences", "allergies",
    "preferredProteinSources", "preferredCarbSources",
    "preferredFatSources", "avoidFoods"
)
