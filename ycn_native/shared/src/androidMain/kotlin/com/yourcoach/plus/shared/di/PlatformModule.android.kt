package com.yourcoach.plus.shared.di

import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Android固有のDIモジュール
 */
actual fun platformModule(): Module = module {
    // Android固有の依存関係
    // single<HttpClientEngine> { OkHttp.create() }
}
