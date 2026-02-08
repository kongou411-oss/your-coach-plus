package com.yourcoach.plus.shared.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.transitions.SlideTransition
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.ui.screens.auth.LoginScreen
import com.yourcoach.plus.shared.ui.screens.auth.ProfileSetupScreen
import com.yourcoach.plus.shared.ui.screens.main.MainScreen
import com.yourcoach.plus.shared.ui.theme.YourCoachTheme
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

/**
 * Your Coach+ アプリエントリーポイント
 * Android/iOS両方で使用
 *
 * 起動時の画面決定ロジック:
 * 1. ログインしていない → LoginScreen
 * 2. ログイン済み + オンボーディング未完了 → ProfileSetupScreen
 * 3. ログイン済み + オンボーディング完了 → DashboardScreen
 */
@Composable
fun YourCoachApp() {
    YourCoachTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            AppContent()
        }
    }
}

@Composable
private fun AppContent() {
    val authRepository: AuthRepository = koinInject()
    val userRepository: UserRepository = koinInject()
    val scope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(true) }
    var initialScreen by remember { mutableStateOf<cafe.adriel.voyager.core.screen.Screen?>(null) }

    // iOS対応: コルーチン例外ハンドラー（NULLクラッシュ防止）
    val exceptionHandler = remember {
        CoroutineExceptionHandler { _, throwable ->
            println("YourCoachApp: Unhandled coroutine exception: ${throwable.message}")
            initialScreen = LoginScreen()
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        scope.launch(exceptionHandler) {
            try {
                val currentUser = authRepository.getCurrentUser()

                initialScreen = if (currentUser == null) {
                    // 未ログイン → LoginScreen
                    LoginScreen()
                } else {
                    // ログイン済み → オンボーディング状態をチェック
                    val user = try {
                        userRepository.getUser(currentUser.uid).getOrNull()
                    } catch (e: Throwable) {
                        println("YourCoachApp: Failed to get user: ${e.message}")
                        null
                    }
                    if (user?.profile?.onboardingCompleted == true) {
                        // オンボーディング完了 → MainScreen (ボトムナビ付き)
                        MainScreen()
                    } else {
                        // オンボーディング未完了 → ProfileSetupScreen
                        ProfileSetupScreen(currentUser.uid)
                    }
                }
            } catch (e: Throwable) {
                // Firebase初期化エラー等 → LoginScreenへ
                println("YourCoachApp: Error during startup: ${e.message}")
                initialScreen = LoginScreen()
            }
            isLoading = false
        }
    }

    if (isLoading) {
        // ローディング表示
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
    } else {
        initialScreen?.let { screen ->
            Navigator(screen) { navigator ->
                SlideTransition(navigator)
            }
        }
    }
}
