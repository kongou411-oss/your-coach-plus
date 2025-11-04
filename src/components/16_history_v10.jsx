import React from 'react';
// ===== History V10 Component (Direct iframe to v10.html) =====
const HistoryV10View = ({ onClose, userId, userProfile }) => {
    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
            {/* Full v10.html in iframe */}
            <iframe
                src="history_v10_standalone.html?v=20251026v1"
                className="w-full h-full border-0"
                title="履歴グラフ V10（完全版）"
                sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
                style={{ width: '100%', height: '100vh' }}
            />
        </div>
    );
};
