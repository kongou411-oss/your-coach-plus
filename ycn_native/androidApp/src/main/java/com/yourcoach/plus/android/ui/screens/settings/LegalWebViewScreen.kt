package com.yourcoach.plus.android.ui.screens.settings

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

/**
 * 法的ドキュメントの種類
 */
enum class LegalDocumentType(
    val title: String,
    val url: String
) {
    TERMS("利用規約", "https://your-coach-plus.web.app/terms.html"),
    PRIVACY("プライバシーポリシー", "https://your-coach-plus.web.app/privacy.html")
}

/**
 * 利用規約・プライバシーポリシー表示画面
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LegalWebViewScreen(
    documentType: LegalDocumentType,
    onNavigateBack: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(documentType.title) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "戻る")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        webViewClient = object : WebViewClient() {
                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                isLoading = false
                            }
                        }
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        loadUrl(documentType.url)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            // ローディングインジケータ
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}
