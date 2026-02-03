package com.yourcoach.plus.shared

import androidx.compose.ui.window.ComposeUIViewController
import com.yourcoach.plus.shared.di.platformModule
import com.yourcoach.plus.shared.di.sharedModule
import com.yourcoach.plus.shared.ui.YourCoachApp
import org.koin.core.context.startKoin

/**
 * iOS用のKoin初期化
 * SwiftのAppDelegate.didFinishLaunchingWithOptionsから呼び出す
 */
fun initKoin() {
    startKoin {
        modules(sharedModule, platformModule())
    }
}

/**
 * iOS用のメインビューコントローラー
 * SwiftUIからこの関数を呼び出してComposeのUIを表示する
 */
fun MainViewController() = ComposeUIViewController {
    YourCoachApp()
}
