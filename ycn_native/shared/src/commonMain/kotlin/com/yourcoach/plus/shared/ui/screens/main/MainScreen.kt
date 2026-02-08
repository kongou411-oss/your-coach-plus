package com.yourcoach.plus.shared.ui.screens.main

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.rememberVectorPainter
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import cafe.adriel.voyager.navigator.tab.CurrentTab
import cafe.adriel.voyager.navigator.tab.Tab
import cafe.adriel.voyager.navigator.tab.TabNavigator
import cafe.adriel.voyager.navigator.tab.TabOptions
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.ui.screens.auth.LoginScreen
import com.yourcoach.plus.shared.ui.screens.badges.BadgesScreen
import com.yourcoach.plus.shared.ui.screens.comy.ComyScreen
import com.yourcoach.plus.shared.ui.screens.dashboard.DashboardScreen
import com.yourcoach.plus.shared.ui.screens.history.HistoryScreen
import com.yourcoach.plus.shared.ui.screens.notification.NotificationSettingsScreen
import com.yourcoach.plus.shared.ui.screens.pgbase.PgBaseScreen
import com.yourcoach.plus.shared.ui.screens.settings.*
import com.yourcoach.plus.shared.ui.screens.subscription.SubscriptionScreen
import com.yourcoach.plus.shared.ui.theme.Primary
import com.yourcoach.plus.shared.util.getSafeAreaInsets
import com.yourcoach.plus.shared.util.rememberOpenUrl
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

/**
 * Main Screen with Bottom Navigation (Compose Multiplatform)
 * 5 tabs: Home, History, PGBASE, COMY, Settings
 */
class MainScreen : Screen {

    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow

        TabNavigator(HomeTab) { tabNavigator ->
            val safeAreaInsets = getSafeAreaInsets()

            // Provide navigator to Settings tab via CompositionLocal
            CompositionLocalProvider(LocalMainNavigator provides navigator) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // タブコンテンツ（残りスペースを占有）
                    Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                        CurrentTab()
                    }
                    // ボトムナビゲーション（常に画面下部に表示）
                    BottomNavigation(
                        tabNavigator = tabNavigator,
                        bottomPadding = safeAreaInsets.bottom
                    )
                }
            }
        }
    }
}

/**
 * CompositionLocal to provide main navigator to tabs
 */
val LocalMainNavigator = staticCompositionLocalOf<cafe.adriel.voyager.navigator.Navigator?> { null }

/**
 * Bottom Navigation Bar
 */
@Composable
private fun BottomNavigation(
    tabNavigator: TabNavigator,
    bottomPadding: androidx.compose.ui.unit.Dp
) {
    NavigationBar(
        modifier = Modifier.height(80.dp + bottomPadding),
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 8.dp
    ) {
        val tabs = listOf(HomeTab, HistoryTab, PgBaseTab, ComyTab, SettingsTab)

        tabs.forEach { tab ->
            NavigationBarItem(
                selected = tabNavigator.current == tab,
                onClick = { tabNavigator.current = tab },
                icon = {
                    tab.options.icon?.let { painter ->
                        Icon(
                            painter = painter,
                            contentDescription = tab.options.title,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                },
                label = {
                    Text(
                        text = tab.options.title,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = if (tabNavigator.current == tab) FontWeight.Bold else FontWeight.Normal
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = Primary,
                    selectedTextColor = Primary,
                    indicatorColor = Primary.copy(alpha = 0.1f),
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
        }
    }
}

/**
 * Home Tab (Dashboard)
 */
object HomeTab : Tab {
    override val options: TabOptions
        @Composable
        get() = TabOptions(
            index = 0u,
            title = "ホーム",
            icon = rememberVectorPainter(Icons.Default.Home)
        )

    @Composable
    override fun Content() {
        DashboardScreen().Content()
    }
}

/**
 * History Tab
 */
object HistoryTab : Tab {
    override val options: TabOptions
        @Composable
        get() = TabOptions(
            index = 1u,
            title = "履歴",
            icon = rememberVectorPainter(Icons.Default.History)
        )

    @Composable
    override fun Content() {
        HistoryScreen().Content()
    }
}

/**
 * PGBASE Tab
 */
object PgBaseTab : Tab {
    override val options: TabOptions
        @Composable
        get() = TabOptions(
            index = 2u,
            title = "PGBASE",
            icon = rememberVectorPainter(Icons.Default.Storage)
        )

    @Composable
    override fun Content() {
        PgBaseScreen().Content()
    }
}

/**
 * COMY Tab
 */
object ComyTab : Tab {
    override val options: TabOptions
        @Composable
        get() = TabOptions(
            index = 3u,
            title = "COMY",
            icon = rememberVectorPainter(Icons.Default.Forum)
        )

    @Composable
    override fun Content() {
        ComyScreen().Content()
    }
}

/**
 * Settings Tab
 */
object SettingsTab : Tab {
    override val options: TabOptions
        @Composable
        get() = TabOptions(
            index = 4u,
            title = "設定",
            icon = rememberVectorPainter(Icons.Default.Settings)
        )

    @Composable
    override fun Content() {
        val mainNavigator = LocalMainNavigator.current
        val authRepository: AuthRepository = koinInject()
        val userRepository: UserRepository = koinInject()
        val openUrl = rememberOpenUrl()
        val scope = rememberCoroutineScope()

        SettingsScreen(
            onNavigateToProfile = { mainNavigator?.push(ProfileEditScreen()) },
            onNavigateToNotifications = { mainNavigator?.push(NotificationSettingsScreen()) },
            onNavigateToBadges = { mainNavigator?.push(BadgesScreen()) },
            onNavigateToPremium = {
                scope.launch {
                    val userId = authRepository.getCurrentUserId() ?: return@launch
                    userRepository.getUser(userId).onSuccess { user ->
                        if (user != null) {
                            mainNavigator?.push(
                                SubscriptionScreen(
                                    userId = user.uid,
                                    registrationDate = user.profile?.registrationDate,
                                    subscriptionStatus = if (user.isPremium) "premium" else "free"
                                )
                            )
                        }
                    }
                }
            },
            onNavigateToRoutine = { mainNavigator?.push(RoutineSettingsScreen()) },
            onNavigateToTemplates = { mainNavigator?.push(TemplateSettingsScreen()) },
            onNavigateToMealSlots = { mainNavigator?.push(MealSlotSettingsScreen()) },
            onNavigateToHelp = { mainNavigator?.push(HelpScreen()) },
            onNavigateToFeedback = { mainNavigator?.push(FeedbackScreen()) },
            onNavigateToAbout = { openUrl("https://your-coach-plus.web.app/home.html") },
            onNavigateToTerms = { openUrl("https://your-coach-plus.web.app/terms.html") },
            onNavigateToPrivacy = { openUrl("https://your-coach-plus.web.app/privacy.html") },
            onLoggedOut = {
                mainNavigator?.replace(LoginScreen())
            }
        ).Content()
    }
}
