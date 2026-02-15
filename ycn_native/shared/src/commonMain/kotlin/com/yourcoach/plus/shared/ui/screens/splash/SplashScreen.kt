package com.yourcoach.plus.shared.ui.screens.splash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.domain.repository.AuthRepository
import com.yourcoach.plus.shared.domain.repository.UserRepository
import com.yourcoach.plus.shared.ui.screens.auth.LoginScreen
import com.yourcoach.plus.shared.ui.screens.auth.ProfileSetupScreen
import com.yourcoach.plus.shared.ui.screens.main.MainScreen
import com.yourcoach.plus.shared.ui.theme.Primary
import org.koin.compose.koinInject

/**
 * スプラッシュ画面
 * 認証状態を確認して適切な画面に遷移する
 */
class SplashScreen : Screen {

    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        val authRepository = koinInject<AuthRepository>()
        val userRepository = koinInject<UserRepository>()

        LaunchedEffect(Unit) {
            try {
                val currentUser = authRepository.getCurrentUser()

                if (currentUser == null) {
                    navigator.replace(LoginScreen())
                    return@LaunchedEffect
                }

                val userId = currentUser.uid

                // getUser失敗時も認証済みならMainScreenに遷移（Firestore一時エラー対策）
                val userResult = userRepository.getUser(userId)
                val user = userResult.getOrNull()

                when {
                    user?.profile?.onboardingCompleted == true -> {
                        navigator.replace(MainScreen())
                    }
                    userResult.isFailure -> {
                        // Firestoreアクセス失敗だが認証済み → MainScreenで再試行させる
                        println("SplashScreen: getUser failed but user is authenticated, proceeding to MainScreen")
                        navigator.replace(MainScreen())
                    }
                    else -> {
                        // ユーザードキュメント未完成（オンボーディング未完了）
                        navigator.replace(ProfileSetupScreen(userId))
                    }
                }
            } catch (e: Exception) {
                // getCurrentUser()自体の例外 → 認証状態不明なのでLoginScreenへ
                println("SplashScreen: Error checking auth: ${e.message}")
                navigator.replace(LoginScreen())
            }
        }

        // スプラッシュUI
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(Primary.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.FitnessCenter,
                        contentDescription = null,
                        modifier = Modifier.size(40.dp),
                        tint = Primary
                    )
                }
                Spacer(modifier = Modifier.height(24.dp))
                CircularProgressIndicator(
                    modifier = Modifier.size(32.dp),
                    color = Primary,
                    strokeWidth = 3.dp
                )
            }
        }
    }
}
