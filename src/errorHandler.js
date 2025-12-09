// ===== グローバルエラーハンドラ =====
// すべてのエラーを捕捉し、開発者に自動送信
// iOS Safari、Android Chrome、PC Chromeのすべてで動作
// Firebase Crashlytics連携

// Crashlyticsにエラーを送信（ネイティブアプリ向け）
const sendToCrashlytics = async (errorInfo) => {
    try {
        // Firebase Analytics/Crashlyticsが利用可能な場合
        if (typeof firebase !== 'undefined' && firebase.analytics) {
            const analytics = firebase.analytics();
            // カスタムイベントとしてエラーを記録
            analytics.logEvent('app_exception', {
                description: errorInfo.message?.substring(0, 100) || 'Unknown error',
                fatal: false,
                source: errorInfo.source?.substring(0, 100) || 'Unknown',
                line: errorInfo.lineno || 0,
                timestamp: errorInfo.timestamp
            });
            console.log('[ErrorHandler] Error logged to Firebase Analytics');
        }
    } catch (e) {
        console.warn('[ErrorHandler] Failed to log to Crashlytics:', e);
    }
};

// エラー情報を開発者に送信
const sendErrorReport = async (errorInfo) => {
    try {
        // Firebase Functions の sendFeedback を使用
        if (typeof firebase === 'undefined' || !firebase.app) {
            console.error('[ErrorHandler] Firebase not initialized, cannot send error report');
            return;
        }

        const functions = firebase.app().functions('asia-northeast1');
        const sendFeedback = functions.httpsCallable('sendFeedback');

        const userId = firebase.auth()?.currentUser?.uid || 'anonymous';
        const userEmail = firebase.auth()?.currentUser?.email || '未登録';

        await sendFeedback({
            feedback: `【自動エラーレポート】\n\n${errorInfo.message}\n\n発生場所: ${errorInfo.source}\n行番号: ${errorInfo.lineno}:${errorInfo.colno}\n\nスタックトレース:\n${errorInfo.stack}\n\nユーザー環境:\n- OS: ${errorInfo.userAgent}\n- 画面サイズ: ${errorInfo.screenSize}\n- 発生時刻: ${errorInfo.timestamp}`,
            userId: userId,
            userEmail: userEmail,
            timestamp: errorInfo.timestamp
        });

        console.log('[ErrorHandler] Error report sent successfully');
    } catch (error) {
        console.error('[ErrorHandler] Failed to send error report:', error);
    }
};

// エラー情報を収集
const collectErrorInfo = (message, source, lineno, colno, error) => {
    return {
        message: message || 'Unknown error',
        source: source || 'Unknown source',
        lineno: lineno || 0,
        colno: colno || 0,
        stack: error?.stack || 'No stack trace',
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
    };
};

// エラー画面を表示
const showErrorScreen = (errorInfo) => {
    // 既にエラー画面が表示されている場合は何もしない
    if (document.getElementById('global-error-screen')) {
        return;
    }

    const errorScreen = document.createElement('div');
    errorScreen.id = 'global-error-screen';
    errorScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow-y: auto;
        z-index: 999999;
    `;

    errorScreen.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
                <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">エラーが発生しました</h1>
                <p style="font-size: 14px; opacity: 0.9;">申し訳ございません。アプリの読み込みに失敗しました。</p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 20px; margin-bottom: 20px; backdrop-filter: blur(10px);">
                <h2 style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">解決方法をお試しください：</h2>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                        <strong>1.</strong> ページを再読み込み（Ctrl/Cmd + R）
                    </li>
                    <li style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                        <strong>2.</strong> ブラウザのキャッシュをクリア（Ctrl/Cmd + Shift + R）
                    </li>
                    <li style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                        <strong>3.</strong> プライベートブラウズモードを無効化
                    </li>
                    <li style="padding: 10px 0;">
                        <strong>4.</strong> 別のブラウザで試す
                    </li>
                </ul>
            </div>

            <div style="text-align: center; margin-bottom: 20px;">
                <button onclick="location.reload()" style="
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                ">
                    ページを再読み込み
                </button>
            </div>

            <details style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 15px; margin-top: 20px;">
                <summary style="cursor: pointer; font-weight: bold; margin-bottom: 10px;">エラー詳細（開発者向け）</summary>
                <pre style="
                    background: rgba(0, 0, 0, 0.3);
                    padding: 15px;
                    border-radius: 6px;
                    overflow-x: auto;
                    font-size: 12px;
                    line-height: 1.5;
                    margin-top: 10px;
                ">${errorInfo.message}

発生場所: ${errorInfo.source}:${errorInfo.lineno}:${errorInfo.colno}

スタックトレース:
${errorInfo.stack}

ユーザー環境:
${errorInfo.userAgent}
画面サイズ: ${errorInfo.screenSize}
発生時刻: ${errorInfo.timestamp}</pre>
            </details>

            <p style="text-align: center; font-size: 12px; opacity: 0.7; margin-top: 20px;">
                エラー情報は自動的に開発者に送信されました。<br>
                ご不便をおかけして申し訳ございません。
            </p>
        </div>
    `;

    document.body.appendChild(errorScreen);
};

// グローバルエラーハンドラの設定
window.addEventListener('error', (event) => {
    console.error('[Global Error]', event);

    const errorInfo = collectErrorInfo(
        event.message,
        event.filename,
        event.lineno,
        event.colno,
        event.error
    );

    // エラー画面を表示
    showErrorScreen(errorInfo);

    // Crashlyticsにエラーを送信
    sendToCrashlytics(errorInfo);

    // エラー情報を開発者に送信
    sendErrorReport(errorInfo);

    // エラーの伝播を防ぐ
    event.preventDefault();
    return true;
});

// Unhandled Promise Rejection のハンドラ
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]', event);

    const errorInfo = collectErrorInfo(
        `Promise Rejection: ${event.reason?.message || event.reason}`,
        event.reason?.fileName || 'Unknown',
        event.reason?.lineNumber || 0,
        event.reason?.columnNumber || 0,
        event.reason
    );

    // エラー画面を表示
    showErrorScreen(errorInfo);

    // Crashlyticsにエラーを送信
    sendToCrashlytics(errorInfo);

    // エラー情報を開発者に送信
    sendErrorReport(errorInfo);

    // エラーの伝播を防ぐ
    event.preventDefault();
});

console.log('[ErrorHandler] Global error handlers initialized');
