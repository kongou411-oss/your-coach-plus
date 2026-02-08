package com.yourcoach.plus.shared.util

import dev.gitlive.firebase.firestore.DocumentSnapshot

/**
 * iOS implementation - try standard approach first, fallback to individual field parsing.
 * Note: Map<String, Any?> serialization may not work on iOS/Native, so we handle errors gracefully.
 */
@Suppress("UNCHECKED_CAST")
actual fun DocumentSnapshot.getProfileMap(): Map<String, Any?>? {
    return try {
        // Try the standard approach first (same as Android)
        get<Map<String, Any?>?>("profile")
    } catch (e: Throwable) {
        // Fallback: manually construct the profile map by getting individual fields
        // (Map<String, Any?> serialization doesn't work on Kotlin/Native)
        try {
            buildProfileMapFromFields()
        } catch (e2: Throwable) {
            null
        }
    }
}

/**
 * Fallback method to build profile map by getting individual fields.
 * This is less efficient but may work when the generic Map deserialization fails.
 */
@Suppress("UNCHECKED_CAST")
private fun DocumentSnapshot.buildProfileMapFromFields(): Map<String, Any?>? {
    val profileFields = listOf(
        "nickname", "gender", "birthYear", "age", "height", "weight",
        "bodyFatPercentage", "targetWeight", "activityLevel", "goal", "style",
        "idealWeight", "idealBodyFatPercentage", "targetCalories", "targetProtein",
        "targetFat", "targetCarbs", "proteinRatioPercent", "fatRatioPercent",
        "carbRatioPercent", "calorieAdjustment", "dietaryPreferences", "allergies",
        "onboardingCompleted", "experience", "favoriteFoods", "ngFoods", "budgetTier",
        "mealsPerDay", "wakeUpTime", "sleepTime", "trainingTime", "trainingAfterMeal",
        "trainingDuration", "preWorkoutProtein", "preWorkoutFat", "preWorkoutCarbs",
        "postWorkoutProtein", "postWorkoutFat", "postWorkoutCarbs",
        "mealSlotConfig", "workoutSlotConfig", "routineTemplateConfig"
    )

    val result = mutableMapOf<String, Any?>()
    var hasAnyValue = false

    for (field in profileFields) {
        val fullPath = "profile.$field"
        try {
            // Try to get each field - this may work better than getting the entire map
            val value: Any? = when (field) {
                "nickname", "gender", "activityLevel", "goal", "style",
                "favoriteFoods", "ngFoods", "wakeUpTime", "sleepTime", "trainingTime" -> {
                    get<String?>(fullPath)
                }
                "birthYear", "age", "targetCalories", "proteinRatioPercent",
                "fatRatioPercent", "carbRatioPercent", "calorieAdjustment",
                "budgetTier", "mealsPerDay", "trainingAfterMeal", "trainingDuration",
                "preWorkoutProtein", "preWorkoutFat", "preWorkoutCarbs",
                "postWorkoutProtein", "postWorkoutFat", "postWorkoutCarbs", "experience" -> {
                    get<Long?>(fullPath)
                }
                "height", "weight", "bodyFatPercentage", "targetWeight",
                "idealWeight", "idealBodyFatPercentage", "targetProtein",
                "targetFat", "targetCarbs" -> {
                    get<Double?>(fullPath)
                }
                "onboardingCompleted" -> {
                    get<Boolean?>(fullPath)
                }
                "dietaryPreferences", "allergies" -> {
                    get<List<String>?>(fullPath)
                }
                else -> null
            }
            if (value != null) {
                result[field] = value
                hasAnyValue = true
            }
        } catch (e: Throwable) {
            // Field doesn't exist or can't be deserialized - skip
        }
    }

    return if (hasAnyValue) result else null
}
