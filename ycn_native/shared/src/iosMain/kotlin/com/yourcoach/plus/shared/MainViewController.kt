package com.yourcoach.plus.shared

import androidx.compose.ui.window.ComposeUIViewController
import com.yourcoach.plus.shared.di.platformModule
import com.yourcoach.plus.shared.di.sharedModule
import com.yourcoach.plus.shared.ui.YourCoachApp
import org.koin.core.context.startKoin
import kotlin.experimental.ExperimentalNativeApi

/**
 * iOS用のKoin初期化
 * SwiftのAppDelegate.didFinishLaunchingWithOptionsから呼び出す
 */
@OptIn(ExperimentalNativeApi::class)
fun initKoin() {
    // グローバル例外ハンドラー（デバッグ用: クラッシュ前に例外詳細をログ出力）
    setUnhandledExceptionHook { throwable ->
        println("=== UNHANDLED EXCEPTION ===")
        println("Type: ${throwable::class.simpleName}")
        println("Message: ${throwable.message}")
        println("Cause: ${throwable.cause?.message}")
        println("Stack: ${throwable.stackTraceToString()}")
        println("=== END UNHANDLED EXCEPTION ===")
    }

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
