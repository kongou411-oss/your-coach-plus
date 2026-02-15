package com.yourcoach.plus.shared.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import cafe.adriel.voyager.core.screen.Screen
import cafe.adriel.voyager.navigator.LocalNavigator
import cafe.adriel.voyager.navigator.currentOrThrow
import com.yourcoach.plus.shared.ui.screens.pgbase.PlatformWebView

enum class LegalPageType(val title: String, val url: String) {
    TERMS("利用規約", "https://your-coach-plus.web.app/terms.html"),
    PRIVACY("プライバシーポリシー", "https://your-coach-plus.web.app/privacy.html")
}

data class LegalWebViewScreen(val pageType: LegalPageType) : Screen {

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        var isLoading by remember { mutableStateOf(true) }

        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(pageType.title) },
                    navigationIcon = {
                        IconButton(onClick = { navigator.pop() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "戻る")
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
                PlatformWebView(
                    url = pageType.url,
                    modifier = Modifier.fillMaxSize(),
                    onLoaded = { isLoading = false }
                )
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .size(40.dp)
                            .align(Alignment.Center)
                    )
                }
            }
        }
    }
}
