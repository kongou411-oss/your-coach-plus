// ===== History V10 Component (Direct iframe to v10.html) =====
// v1.6.0 - AI分析機能統合（iframe→React通信）
// 更新日: 2025-10-21
const HistoryV10View = ({ onClose, userId, userProfile }) => {
    const [showAIModal, setShowAIModal] = React.useState(false);
    const [aiAnalysisData, setAiAnalysisData] = React.useState(null);
    const [aiAnalysisResult, setAiAnalysisResult] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    // iframe からのメッセージを受信
    React.useEffect(() => {
        const handleMessage = (event) => {
            if (event.data.type === 'REQUEST_AI_ANALYSIS') {
                console.log('AI分析リクエスト受信:', event.data);

                // プレミアムユーザーチェック（将来実装）
                // if (!userProfile?.isPremium) {
                //     alert('AI分析機能はプレミアムユーザー限定です。');
                //     return;
                // }

                setAiAnalysisData(event.data);
                setShowAIModal(true);
                runAIAnalysis(event.data);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [userId, userProfile]);

    // AI分析実行
    const runAIAnalysis = async (data) => {
        setLoading(true);
        setAiAnalysisResult(null);
        try {
            // プロンプト生成
            const prompt = generateAnalysisPrompt(data, userProfile);

            // Gemini APIで分析
            const result = await GeminiAPI.sendMessage(prompt, [], userProfile, 'gemini-2.5-pro');

            if (result.success) {
                setAiAnalysisResult(result.text);
            } else {
                setAiAnalysisResult(`分析に失敗しました: ${result.error}`);
            }
        } catch (error) {
            console.error('AI analysis error:', error);
            setAiAnalysisResult(`分析に失敗しました: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
            {/* グラフiframe（最上部から表示） */}
            <iframe
                src="history_v10_standalone.html"
                className="w-full h-full border-0"
                title="履歴グラフ V10（完全版）"
                sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
                style={{ width: '100%', height: '100%' }}
            />

            {/* AI分析モーダル */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="Sparkles" size={20} className="text-indigo-600" />
                                AI分析：{aiAnalysisData?.metricInfo?.name || '分析中'}
                            </h3>
                            <button
                                onClick={() => setShowAIModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {loading && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span>AI分析中...</span>
                                </div>
                            )}
                            {!loading && aiAnalysisResult && (
                                <div className="prose prose-sm max-w-none">
                                    {aiAnalysisData && (
                                        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                            <div className="text-sm font-semibold text-indigo-900 mb-1">
                                                {aiAnalysisData.metricInfo.name}の分析結果
                                            </div>
                                            <div className="text-xs text-indigo-700">
                                                期間: 過去{aiAnalysisData.period}日間 |
                                                変化: {aiAnalysisData.stats.trend > 0 ? '+' : ''}{aiAnalysisData.stats.trend}{aiAnalysisData.metricInfo.unit}
                                                ({aiAnalysisData.stats.trendPercent}%)
                                            </div>
                                        </div>
                                    )}
                                    <div className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">
                                        {aiAnalysisResult}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== プロンプト生成関数 =====
const generateAnalysisPrompt = (data, userProfile) => {
    const { metricInfo, period, stats, subCategory, category } = data;

    return `あなたはプロフェッショナルなフィットネスコーチです。以下のデータを分析してください。

【指標】${metricInfo.name}
【期間】過去${period}日間
【データ】${data.data.map(v => v.toFixed(1)).join(', ')}
【統計】
- 平均: ${stats.avg}${metricInfo.unit}
- 最高: ${stats.max}${metricInfo.unit}
- 最低: ${stats.min}${metricInfo.unit}
- 変化量: ${stats.trend > 0 ? '+' : ''}${stats.trend}${metricInfo.unit} (${stats.trendPercent}%)

以下の形式で簡潔に回答してください（各セクション200文字以内）：

## トレンド分析
[増加/減少/横ばいを判定し、その理由を1-2文で]

## 今後の推移予測
[今後の推移予測と根拠を1-2文で]

## 改善提案
[具体的なアクション1つ]

## 注意点
[気をつけるべきポイントを1-2文で]`;
};
