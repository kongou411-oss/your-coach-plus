import React from 'react';
import { isNativeApp } from '../capacitor-push';
import useBABHeight from '../hooks/useBABHeight.js';
// ===== History V10 Component (Direct iframe to v10.html) =====
const HistoryV10View = ({ onClose, userId, userProfile }) => {
    const iframeRef = React.useRef(null);
    // キャッシュを完全に回避するため、マウント時のタイムスタンプを使用
    const [cacheKey] = React.useState(() => Date.now());
    // ネイティブアプリ判定
    const native = isNativeApp();
    // BAB高さ（動的取得）
    const babHeight = useBABHeight(64);

    React.useEffect(() => {
        // iframeが読み込まれたら、親ウィンドウからユーザー情報とデータを渡す
        const handleLoad = async () => {
            // 初回チェック
            if (!iframeRef.current || !iframeRef.current.contentWindow) {
                return;
            }

            // 親でデータを取得してiframeに送信
            let allRecords = {};
            if (typeof DataService !== 'undefined' && DataService.getAllDailyRecords) {
                try {
                    console.log('[HistoryV10] 親でデータ取得開始');
                    allRecords = await DataService.getAllDailyRecords(userId);
                    console.log('[HistoryV10] 親でデータ取得完了:', Object.keys(allRecords).length, '件');
                } catch (e) {
                    console.error('[HistoryV10] データ取得エラー:', e);
                }
            }

            // 非同期処理後に再チェック（コンポーネントがアンマウントされている可能性）
            if (!iframeRef.current || !iframeRef.current.contentWindow) {
                console.log('[HistoryV10] iframe already unmounted, skipping postMessage');
                return;
            }

            // iframeにユーザー情報とデータを設定
            iframeRef.current.contentWindow.postMessage({
                type: 'SET_USER_INFO',
                userId: userId,
                userProfile: userProfile,
                allRecords: allRecords,  // 履歴データも一緒に送信
                babHeight: babHeight  // BAB高さも送信
            }, '*');
        };

        // iframe内からの閉じるメッセージを受け取る
        const handleMessage = (event) => {
            if (event.data && event.data.type === 'CLOSE_HISTORY') {
                onClose();
            }
        };

        const iframe = iframeRef.current;
        if (iframe) {
            iframe.addEventListener('load', handleLoad);
            window.addEventListener('message', handleMessage);
            return () => {
                iframe.removeEventListener('load', handleLoad);
                window.removeEventListener('message', handleMessage);
            };
        }
    }, [userId, userProfile, onClose, babHeight]);

    // BAB高さが変わったらiframeに通知
    React.useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'SET_BAB_HEIGHT',
                babHeight: babHeight
            }, '*');
        }
    }, [babHeight]);

    return (
        <div
            className="fixed inset-0 bg-gray-50 z-50 fullscreen-view"
        >
            {/* Full v10.html in iframe (no header - use iframe's own header) */}
            <iframe
                key={cacheKey}
                ref={iframeRef}
                src={`/history_v10_standalone.html?v=20251113v10&t=${cacheKey}${native ? '&native=true' : ''}`}
                className="w-full h-full border-0"
                title="履歴グラフ V10（完全版）"
                sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
            />
        </div>
    );
};


// グローバルに公開
window.HistoryV10View = HistoryV10View;
