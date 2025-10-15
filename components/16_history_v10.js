// ===== History V10 Component (Direct iframe to v10.html) =====
const HistoryV10View = ({ onClose, userId, userProfile }) => {
    // キャッシュバスター用のタイムスタンプ
    const cacheBuster = Date.now();

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
            {/* Close button overlay */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={onClose}
                    className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition border border-gray-300"
                    style={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                >
                    <Icon name="ArrowLeft" size={24} className="text-gray-700" />
                </button>
            </div>

            {/* Full v10.html in iframe */}
            <iframe
                src={`history_v10_standalone.html?v=${cacheBuster}`}
                className="w-full h-full border-0"
                title="履歴グラフ V10（完全版）"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                style={{ width: '100%', height: '100vh' }}
            />
        </div>
    );
};
