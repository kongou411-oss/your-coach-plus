package com.yourcoach.plus.shared.ui.navigation

/**
 * 画面ルート定義
 * Voyager Screenは各画面クラスで直接実装
 */

// 認証フロー
object AuthRoutes {
    const val ONBOARDING = "onboarding"
    const val LOGIN = "login"
    const val SIGN_UP = "sign_up"
    const val FORGOT_PASSWORD = "forgot_password"
    const val PROFILE_SETUP = "profile_setup"
}

// メイン画面
object MainRoutes {
    const val DASHBOARD = "dashboard"
    const val ADD_MEAL = "add_meal"
    const val ADD_WORKOUT = "add_workout"
    const val HISTORY = "history"
    const val ANALYSIS = "analysis"
    const val SETTINGS = "settings"
    const val BADGES = "badges"
    const val SUBSCRIPTION = "subscription"
}

// 設定サブ画面
object SettingsRoutes {
    const val PROFILE = "settings/profile"
    const val MEAL_SLOT = "settings/meal_slot"
    const val ROUTINE = "settings/routine"
    const val TEMPLATE = "settings/template"
    const val NOTIFICATION = "settings/notification"
    const val FEEDBACK = "settings/feedback"
}
