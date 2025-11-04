import React from 'react';
// ===== History V10 Component (Direct iframe to v10.html) =====
const HistoryV10View = ({ onClose, userId, userProfile }) => {
    const iframeRef = React.useRef(null);

    React.useEffect(() => {
        // iframeが読み込まれたら、親ウィンドウからユーザー情報と閉じる関数を渡す
        const handleLoad = () => {
            if (iframeRef.current && iframeRef.current.contentWindow) {
                // iframeにユーザー情報を設定
                iframeRef.current.contentWindow.postMessage({
                    type: 'SET_USER_INFO',
                    userId: userId,
                    userProfile: userProfile
                }, '*');
            }
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
    }, [userId, userProfile, onClose]);

    return (
        <div className="fixed inset-0 bg-gray-50 z-50">
            {/* Full v10.html in iframe (no header - use iframe's own header) */}
            <iframe
                ref={iframeRef}
                src="/history_v10_standalone.html?v=20251026v1"
                className="w-full h-full border-0"
                title="履歴グラフ V10（完全版）"
                sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
            />
        </div>
    );
};


// グローバルに公開
window.HistoryV10View = HistoryV10View;
