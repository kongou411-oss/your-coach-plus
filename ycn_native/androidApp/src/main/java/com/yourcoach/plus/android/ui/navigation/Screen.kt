package com.yourcoach.plus.android.ui.navigation

/**
 * アプリのナビゲーション画面定義
 */
sealed class Screen(val route: String) {
    // Auth
    data object Splash : Screen("splash")
    data object Login : Screen("login")
    data object SignUp : Screen("signup")
    data object ForgotPassword : Screen("forgot_password")
    data object Onboarding : Screen("onboarding")
    data object ProfileSetup : Screen("profile_setup/{userId}") {
        fun createRoute(userId: String) = "profile_setup/$userId"
    }

    // Main (Bottom Navigation)
    data object Dashboard : Screen("dashboard")
    data object History : Screen("history")
    data object PgBase : Screen("pgbase")
    data object Comy : Screen("comy")
    data object Settings : Screen("settings")

    // Meal
    data object AddMeal : Screen("add_meal/{mealType}?templateMode={templateMode}") {
        fun createRoute(mealType: String, templateMode: Boolean = false) =
            "add_meal/$mealType?templateMode=$templateMode"
    }
    data object MealDetail : Screen("meal_detail/{mealId}") {
        fun createRoute(mealId: String) = "meal_detail/$mealId"
    }
    data object AiFoodRecognition : Screen("ai_food_recognition")

    // Workout
    data object AddWorkout : Screen("add_workout?templateMode={templateMode}") {
        fun createRoute(templateMode: Boolean = false) = "add_workout?templateMode=$templateMode"
    }
    data object WorkoutRecorder : Screen("workout_recorder")
    data object WorkoutDetail : Screen("workout_detail/{workoutId}") {
        fun createRoute(workoutId: String) = "workout_detail/$workoutId"
    }

    // Analysis
    data object Analysis : Screen("analysis")
    data object MicroLearning : Screen("micro_learning")

    // Community
    data object PostDetail : Screen("post_detail/{postId}") {
        fun createRoute(postId: String) = "post_detail/$postId"
    }
    data object CreatePost : Screen("create_post")
    data object UserProfile : Screen("user_profile/{userId}") {
        fun createRoute(userId: String) = "user_profile/$userId"
    }

    // Settings
    data object ProfileSettings : Screen("profile_settings")
    data object NotificationSettings : Screen("notification_settings")
    data object RoutineSettings : Screen("routine_settings")
    data object TemplateSettings : Screen("template_settings")
    data object MealSlotSettings : Screen("meal_slot_settings")
    data object Premium : Screen("premium")
    data object Badges : Screen("badges")
    data object About : Screen("about")
    data object Terms : Screen("terms")
    data object Privacy : Screen("privacy")
    data object Feedback : Screen("feedback")
    data object Help : Screen("help")
}

/**
 * ボトムナビゲーションアイテム
 */
enum class BottomNavItem(
    val screen: Screen,
    val label: String,
    val icon: String // Material Icon名（実装時にIconで置き換え）
) {
    HOME(Screen.Dashboard, "ホーム", "home"),
    HISTORY(Screen.History, "履歴", "history"),
    PGBASE(Screen.PgBase, "PGBASE", "menu_book"),
    COMY(Screen.Comy, "COMY", "forum"),
    SETTINGS(Screen.Settings, "設定", "settings")
}
