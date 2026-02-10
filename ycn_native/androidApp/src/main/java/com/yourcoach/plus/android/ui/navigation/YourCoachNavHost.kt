package com.yourcoach.plus.android.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.yourcoach.plus.android.ui.components.BottomBarState
import com.yourcoach.plus.android.ui.components.BottomNavItem
import com.yourcoach.plus.android.ui.components.ExpandableBottomBar
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.yourcoach.plus.android.ui.screens.analysis.AnalysisScreen
import com.yourcoach.plus.android.ui.screens.auth.ForgotPasswordScreen
import com.yourcoach.plus.android.ui.screens.auth.LoginScreen
import com.yourcoach.plus.android.ui.screens.auth.SignUpScreen
import com.yourcoach.plus.android.ui.screens.comy.ComyScreen
import com.yourcoach.plus.android.ui.screens.dashboard.DashboardScreen
import com.yourcoach.plus.android.ui.screens.history.HistoryScreen
import com.yourcoach.plus.android.ui.screens.meal.AddMealScreen
import com.yourcoach.plus.android.ui.screens.meal.AiFoodRecognitionScreen
import com.yourcoach.plus.android.ui.screens.pgbase.PgBaseScreen
import com.yourcoach.plus.android.ui.screens.settings.SettingsScreen
import com.yourcoach.plus.android.ui.screens.settings.ProfileSettingsScreen
import com.yourcoach.plus.android.ui.screens.settings.RoutineSettingsScreen
import com.yourcoach.plus.android.ui.screens.settings.TemplateSettingsScreen
import com.yourcoach.plus.android.ui.screens.settings.MealSlotSettingsScreen
import com.yourcoach.plus.android.ui.screens.settings.LegalWebViewScreen
import com.yourcoach.plus.android.ui.screens.settings.LegalDocumentType
import com.yourcoach.plus.android.ui.screens.settings.FeedbackScreen
import com.yourcoach.plus.android.ui.screens.settings.HelpScreen
import com.yourcoach.plus.android.ui.screens.subscription.SubscriptionScreen
import com.yourcoach.plus.android.ui.screens.notification.NotificationSettingsScreen
import com.yourcoach.plus.android.ui.screens.badges.BadgesScreen
import com.yourcoach.plus.android.ui.screens.workout.AddWorkoutScreen
import com.yourcoach.plus.android.ui.screens.workout.WorkoutRecorderScreen
import com.yourcoach.plus.android.ui.screens.workout.WorkoutRecorderViewModel
import com.google.firebase.auth.FirebaseAuth
import org.koin.androidx.compose.koinViewModel
import com.yourcoach.plus.android.ui.screens.auth.OnboardingScreen
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import org.koin.compose.koinInject

/**
 * ボトムナビゲーションアイテムの設定
 */
data class BottomNavItemConfig(
    val screen: Screen,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItemConfig(
        screen = Screen.Dashboard,
        label = "ホーム",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    ),
    BottomNavItemConfig(
        screen = Screen.History,
        label = "履歴",
        selectedIcon = Icons.Filled.History,
        unselectedIcon = Icons.Outlined.History
    ),
    BottomNavItemConfig(
        screen = Screen.PgBase,
        label = "PGBASE",
        selectedIcon = Icons.Filled.MenuBook,
        unselectedIcon = Icons.Outlined.MenuBook
    ),
    BottomNavItemConfig(
        screen = Screen.Comy,
        label = "COMY",
        selectedIcon = Icons.Filled.Forum,
        unselectedIcon = Icons.Outlined.Forum
    ),
    BottomNavItemConfig(
        screen = Screen.Settings,
        label = "設定",
        selectedIcon = Icons.Filled.Settings,
        unselectedIcon = Icons.Outlined.Settings
    )
)

/**
 * メインナビゲーションホスト
 */
@Composable
fun YourCoachNavHost() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // ボトムナビゲーションを表示する画面
    val showBottomNav = currentDestination?.route in listOf(
        Screen.Dashboard.route,
        Screen.History.route,
        Screen.PgBase.route,
        Screen.Comy.route,
        Screen.Settings.route
    )

    // ボトムバーの共有状態（DashboardScreenから更新）
    var bottomBarState by remember { mutableStateOf(BottomBarState()) }

    // ナビアイテムをBottomNavItem形式に変換
    val navItems = bottomNavItems.map { config ->
        BottomNavItem(
            route = config.screen.route,
            label = config.label,
            selectedIcon = config.selectedIcon,
            unselectedIcon = config.unselectedIcon
        )
    }

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                val isDashboard = currentDestination?.route == Screen.Dashboard.route

                ExpandableBottomBar(
                    navItems = navItems,
                    currentRoute = currentDestination?.route,
                    onNavItemClick = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    // ダッシュボード時のみレベル・アクション表示
                    level = if (isDashboard) bottomBarState.level else null,
                    expCurrent = if (isDashboard) bottomBarState.expCurrent else null,
                    expRequired = if (isDashboard) bottomBarState.expRequired else null,
                    progressPercent = if (isDashboard) bottomBarState.progressPercent else null,
                    freeCredits = if (isDashboard) bottomBarState.freeCredits else null,
                    paidCredits = if (isDashboard) bottomBarState.paidCredits else null,
                    onAnalysisClick = if (isDashboard) bottomBarState.onAnalysisClick else null,
                    onGenerateQuestClick = if (isDashboard) bottomBarState.onGenerateQuestClick else null,
                    isGeneratingQuest = if (isDashboard) bottomBarState.isGeneratingQuest else false
                )
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            enterTransition = {
                fadeIn(animationSpec = tween(300)) + slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(300)
                )
            },
            exitTransition = {
                fadeOut(animationSpec = tween(300)) + slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(300)
                )
            },
            popEnterTransition = {
                fadeIn(animationSpec = tween(300)) + slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(300)
                )
            },
            popExitTransition = {
                fadeOut(animationSpec = tween(300)) + slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(300)
                )
            }
        ) {
            // Splash: 認証状態チェック → 適切な画面へ遷移
            composable(Screen.Splash.route) {
                val authRepository: AuthRepository = koinInject()
                val userRepository: UserRepository = koinInject()

                LaunchedEffect(Unit) {
                    val currentUser = authRepository.getCurrentUser()
                    if (currentUser == null) {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    } else {
                        val user = userRepository.getUser(currentUser.uid).getOrNull()
                        if (user?.profile?.onboardingCompleted == true) {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Splash.route) { inclusive = true }
                            }
                        } else {
                            navController.navigate(Screen.ProfileSetup.createRoute(currentUser.uid)) {
                                popUpTo(Screen.Splash.route) { inclusive = true }
                            }
                        }
                    }
                }

                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }

            // Auth screens
            composable(Screen.Login.route) {
                LoginScreen(
                    onNavigateToSignUp = { navController.navigate(Screen.SignUp.route) },
                    onNavigateToForgotPassword = { navController.navigate(Screen.ForgotPassword.route) },
                    onLoginSuccess = { userId, needsOnboarding ->
                        if (needsOnboarding && userId.isNotEmpty()) {
                            // オンボーディングが必要な場合はプロフィール設定へ
                            navController.navigate(Screen.ProfileSetup.createRoute(userId)) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        } else {
                            // オンボーディング完了済みはダッシュボードへ
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        }
                    }
                )
            }

            composable(Screen.SignUp.route) {
                SignUpScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onSignUpSuccess = { userId, needsOnboarding ->
                        if (needsOnboarding && userId.isNotEmpty()) {
                            // 新規ユーザーはプロフィール設定へ
                            navController.navigate(Screen.ProfileSetup.createRoute(userId)) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        } else {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        }
                    }
                )
            }

            composable(Screen.ForgotPassword.route) {
                ForgotPasswordScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Onboarding (新オンボーディング)
            composable(Screen.ProfileSetup.route) { backStackEntry ->
                val userId = backStackEntry.arguments?.getString("userId") ?: ""
                OnboardingScreen(
                    userId = userId,
                    onComplete = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }

            // Main screens
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    onNavigateToAddMeal = { mealType ->
                        navController.navigate(Screen.AddMeal.createRoute(mealType))
                    },
                    onNavigateToAddWorkout = {
                        navController.navigate(Screen.AddWorkout.route)
                    },
                    onNavigateToAnalysis = {
                        navController.navigate(Screen.Analysis.route)
                    },
                    onUpdateBottomBarState = { state ->
                        bottomBarState = state
                    }
                )
            }

            composable(Screen.History.route) {
                HistoryScreen(
                    // TODO: MealDetail/WorkoutDetail画面を実装後に有効化
                    onNavigateToMealDetail = { _ ->
                        // 未実装のため何もしない（クラッシュ防止）
                    },
                    onNavigateToWorkoutDetail = { _ ->
                        // 未実装のため何もしない（クラッシュ防止）
                    }
                )
            }

            composable(Screen.PgBase.route) {
                PgBaseScreen()
            }

            composable(Screen.Comy.route) {
                ComyScreen()
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onNavigateToProfile = {
                        navController.navigate(Screen.ProfileSettings.route)
                    },
                    onNavigateToNotifications = {
                        navController.navigate(Screen.NotificationSettings.route)
                    },
                    onNavigateToBadges = {
                        navController.navigate(Screen.Badges.route)
                    },
                    onNavigateToPremium = {
                        navController.navigate(Screen.Premium.route)
                    },
                    onNavigateToRoutine = {
                        navController.navigate(Screen.RoutineSettings.route)
                    },
                    onNavigateToTemplates = {
                        navController.navigate(Screen.TemplateSettings.route)
                    },
                    onNavigateToMealSlots = {
                        navController.navigate(Screen.MealSlotSettings.route)
                    },
                    onNavigateToHelp = {
                        navController.navigate(Screen.Help.route)
                    },
                    onNavigateToFeedback = {
                        navController.navigate(Screen.Feedback.route)
                    },
                    onNavigateToTerms = {
                        navController.navigate(Screen.Terms.route)
                    },
                    onNavigateToPrivacy = {
                        navController.navigate(Screen.Privacy.route)
                    },
                    onLoggedOut = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            // Profile Settings
            composable(Screen.ProfileSettings.route) {
                ProfileSettingsScreen(
                    userId = FirebaseAuth.getInstance().currentUser?.uid ?: "",
                    initialProfile = null,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Meal screens
            composable(
                route = "add_meal/{mealType}?templateMode={templateMode}",
                arguments = listOf(
                    navArgument("mealType") { type = NavType.StringType },
                    navArgument("templateMode") {
                        type = NavType.BoolType
                        defaultValue = false
                    }
                )
            ) { backStackEntry ->
                val mealType = backStackEntry.arguments?.getString("mealType") ?: "breakfast"
                val templateMode = backStackEntry.arguments?.getBoolean("templateMode") ?: false

                // AI認識結果を取得
                val recognizedFoods = backStackEntry.savedStateHandle
                    .get<List<com.yourcoach.plus.android.ui.screens.meal.RecognizedFood>>("recognizedFoods")

                AddMealScreen(
                    mealType = mealType,
                    templateMode = templateMode,
                    recognizedFoods = recognizedFoods,
                    onRecognizedFoodsHandled = {
                        // 処理済みフラグをリセット
                        backStackEntry.savedStateHandle.remove<List<com.yourcoach.plus.android.ui.screens.meal.RecognizedFood>>("recognizedFoods")
                    },
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToAiRecognition = {
                        navController.navigate(Screen.AiFoodRecognition.route)
                    }
                )
            }

            composable(Screen.AiFoodRecognition.route) {
                AiFoodRecognitionScreen(
                    onNavigateBack = {
                        // ダッシュボードまで戻る
                        navController.popBackStack(Screen.Dashboard.route, inclusive = false)
                    },
                    onFoodsConfirmed = { foods ->
                        // 認識した食品を前の画面のsavedStateHandleに保存
                        navController.previousBackStackEntry?.savedStateHandle?.set(
                            "recognizedFoods",
                            foods
                        )
                        navController.popBackStack()
                    }
                )
            }

            // Workout screens
            composable(
                route = "add_workout?templateMode={templateMode}",
                arguments = listOf(
                    navArgument("templateMode") {
                        type = NavType.BoolType
                        defaultValue = false
                    }
                )
            ) { backStackEntry ->
                val templateMode = backStackEntry.arguments?.getBoolean("templateMode") ?: false
                AddWorkoutScreen(
                    templateMode = templateMode,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Workout Recorder (セット単位記録)
            composable(Screen.WorkoutRecorder.route) {
                val viewModel: WorkoutRecorderViewModel = koinViewModel()
                WorkoutRecorderScreen(
                    viewModel = viewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onExerciseSearch = {
                        // TODO: 種目検索画面へ遷移
                        // 暫定: AddWorkoutScreenに遷移
                        navController.navigate(Screen.AddWorkout.route)
                    }
                )
            }

            // Analysis screens
            composable(Screen.Analysis.route) {
                AnalysisScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Subscription/Premium screens
            composable(Screen.Premium.route) {
                SubscriptionScreen(
                    userId = FirebaseAuth.getInstance().currentUser?.uid ?: "",
                    registrationDate = null,
                    subscriptionStatus = null,
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToTerms = { navController.navigate(Screen.Terms.route) },
                    onNavigateToPrivacy = { navController.navigate(Screen.Privacy.route) }
                )
            }

            // Notification settings
            composable(Screen.NotificationSettings.route) {
                NotificationSettingsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Badges/Achievements
            composable(Screen.Badges.route) {
                BadgesScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Routine Settings
            composable(Screen.RoutineSettings.route) {
                com.yourcoach.plus.android.ui.screens.settings.RoutineSettingsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Template Settings
            composable(Screen.TemplateSettings.route) {
                TemplateSettingsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToAddMeal = { navController.navigate(Screen.AddMeal.createRoute("breakfast", templateMode = true)) },
                    onNavigateToAddWorkout = { navController.navigate(Screen.AddWorkout.createRoute(templateMode = true)) }
                )
            }

            // Meal Slot Settings
            composable(Screen.MealSlotSettings.route) {
                MealSlotSettingsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Legal pages
            composable(Screen.Terms.route) {
                LegalWebViewScreen(
                    documentType = LegalDocumentType.TERMS,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Privacy.route) {
                LegalWebViewScreen(
                    documentType = LegalDocumentType.PRIVACY,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Feedback
            composable(Screen.Feedback.route) {
                FeedbackScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Help.route) {
                HelpScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}

/**
 * プレースホルダー画面（開発中）
 */
@Composable
fun PlaceholderScreen(name: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = androidx.compose.ui.Alignment.Center
    ) {
        Text(
            text = "$name\n(実装予定)",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
