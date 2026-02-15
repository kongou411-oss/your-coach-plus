package com.yourcoach.plus.shared.ui.screens.main

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
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
import com.yourcoach.plus.shared.ui.components.BottomBarState
import com.yourcoach.plus.shared.ui.components.BottomNavItem
import com.yourcoach.plus.shared.ui.components.ExpandableBottomBar
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
 * ExpandableBottomBar: ダッシュボード時にレベル・クレジット・アクションボタンを表示
 */
class MainScreen : Screen {

    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow

        TabNavigator(HomeTab) { tabNavigator ->
            // ボトムバーの共有状態（DashboardScreenから更新）
            var bottomBarState by remember { mutableStateOf(BottomBarState()) }

            // Provide navigator and bottomBarState updater to tabs via CompositionLocal
            CompositionLocalProvider(
                LocalMainNavigator provides navigator,
                LocalBottomBarStateUpdater provides { state -> bottomBarState = state },
                LocalLogoutHandler provides { navigator.replaceAll(LoginScreen()) }
            ) {
                val isDashboard = tabNavigator.current == HomeTab

                // ナビゲーションアイテム
                val navItems = remember {
                    listOf(
                        BottomNavItem("home", "ホーム", Icons.Filled.Home, Icons.Outlined.Home),
                        BottomNavItem("history", "履歴", Icons.Filled.History, Icons.Outlined.History),
                        BottomNavItem("pgbase", "PGBASE", Icons.Filled.Storage, Icons.Outlined.Storage),
                        BottomNavItem("comy", "COMY", Icons.Filled.Forum, Icons.Outlined.Forum),
                        BottomNavItem("settings", "設定", Icons.Filled.Settings, Icons.Outlined.Settings)
                    )
                }

                val currentRoute = when (tabNavigator.current) {
                    HomeTab -> "home"
                    HistoryTab -> "history"
                    PgBaseTab -> "pgbase"
                    ComyTab -> "comy"
                    SettingsTab -> "settings"
                    else -> "home"
                }

                Column(modifier = Modifier.fillMaxSize()) {
                    // タブコンテンツ（残りスペースを占有）
                    Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                        CurrentTab()
                    }
                    // ExpandableBottomBar（常に画面下部に表示）
                    ExpandableBottomBar(
                        navItems = navItems,
                        currentRoute = currentRoute,
                        onNavItemClick = { route ->
                            val tab = when (route) {
                                "home" -> HomeTab
                                "history" -> HistoryTab
                                "pgbase" -> PgBaseTab
                                "comy" -> ComyTab
                                "settings" -> SettingsTab
                                else -> HomeTab
                            }
                            tabNavigator.current = tab
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
                        isGeneratingQuest = if (isDashboard) bottomBarState.isGeneratingQuest else false,
                        hasCustomQuest = if (isDashboard) bottomBarState.hasCustomQuest else false
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
 * CompositionLocal to provide BottomBarState updater
 * DashboardScreenからボトムバーの状態を更新するために使用
 */
val LocalBottomBarStateUpdater = staticCompositionLocalOf<(BottomBarState) -> Unit> { {} }

/**
 * CompositionLocal to provide logout/account-deleted handler
 * TabNavigator外でナビゲーションを実行するためのコールバック
 */
val LocalLogoutHandler = staticCompositionLocalOf<() -> Unit> { {} }

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
        // SettingsScreenは内部でLocalNavigator経由のナビゲーションを行う
        // mainNavigatorをCompositionLocal経由で提供済み
        SettingsScreen().Content()
    }
}
