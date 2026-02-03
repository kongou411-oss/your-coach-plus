package com.yourcoach.plus.shared.di

import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * iOS固有のDIモジュール
 */
actual fun platformModule(): Module = module {
    // iOS固有の依存関係
    // single<HttpClientEngine> { Darwin.create() }
}
