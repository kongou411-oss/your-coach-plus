// ===== Community Components =====
const PGBaseView = ({ onClose, userId, userProfile }) => {
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('modules'); // 'modules' | 'ai'
    const [aiChatHistory, setAiChatHistory] = useState([]);
    const [aiInputMessage, setAiInputMessage] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const aiChatContainerRef = useRef(null);

    // Textbookモジュール一覧
    const textbookModules = [
        {
            id: 'protein_textbook',
            title: 'タンパク質の教科書',
            category: '栄養学',
            path: './module/Nutrition/macro/protein_textbook_new.html',
            description: 'タンパク質の役割、アミノ酸スコア、摂取タイミング、プロテインの選び方',
            icon: 'Apple'
        },
        {
            id: 'fat_textbook',
            title: '脂質の教科書',
            category: '栄養学',
            path: './module/Nutrition/macro/fat_textbook_new.html',
            description: '脂質の種類、オメガ3/6/9、トランス脂肪酸、ケトジェニックダイエット',
            icon: 'Apple'
        },
        {
            id: 'carb_textbook',
            title: '炭水化物の教科書',
            category: '栄養学',
            path: './module/Nutrition/macro/carb_textbook_new.html',
            description: '炭水化物の種類、GI値、タイミング、糖質制限の科学',
            icon: 'Apple'
        },
        {
            id: 'vitamin_mineral_textbook',
            title: 'ビタミン・ミネラルの教科書',
            category: '栄養学',
            path: './module/Nutrition/micro/vitamin_mineral_textbook_new.html',
            description: '微量栄養素の役割、欠乏症、過剰症、サプリメント摂取の考え方',
            icon: 'Apple'
        },
        {
            id: 'basic_supplements_textbook',
            title: '基礎サプリメントの教科書',
            category: '栄養学',
            path: './module/basic_supplements_textbook_new.html',
            description: 'クレアチン、アミノ酸、ベータアラニン、HMBなど基礎サプリメントの科学',
            icon: 'Apple'
        },
        {
            id: 'mental_textbook',
            title: 'メンタルの教科書',
            category: 'メンタル',
            path: './module/mental_textbook_new.html',
            description: 'モチベーション、習慣形成、ストレス管理などメンタル面の科学的アプローチ',
            icon: 'Brain'
        }
    ];

    // チャット履歴の読み込み
    useEffect(() => {
        loadAIChatHistory();
    }, []);

    const loadAIChatHistory = async () => {
        const history = await DataService.getPGBaseChatHistory();
        setAiChatHistory(history);
    };

    // チャットコンテナの自動スクロール
    useEffect(() => {
        if (aiChatContainerRef.current) {
            aiChatContainerRef.current.scrollTop = aiChatContainerRef.current.scrollHeight;
        }
    }, [aiChatHistory]);

    // iframe内の教科書からのメッセージ受信
    useEffect(() => {
        const handleMessage = (event) => {
            // 本番環境ではevent.originをチェックすることが望ましい
            if (event.data === 'return-to-pgbase-store') {
                setSelectedModule(null);
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []); // このeffectはマウント時に一度だけ実行

    // コンテキスト生成（過去データ + 傾向）
    const generatePGBaseContext = async () => {
        // 過去30日のデータ取得
        const historicalData = [];
        for (let i = 1; i <= 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const record = await DataService.getDailyRecord(userId, dateStr);
            if (record) historicalData.push({ date: dateStr, record });
        }

        if (historicalData.length === 0) {
            return `
【ユーザープロフィール】
- LBM: ${userProfile.leanBodyMass || 'N/A'}kg
- 目標: ${userProfile.goal || '未設定'}
- 体重: ${userProfile.weight || 'N/A'}kg

【過去データ】
記録データがまだ十分ではありません。
`;
        }

        // 簡易傾向分析
        const avgProtein = historicalData.reduce((sum, d) => {
            return sum + (d.record.meals || []).reduce((s, m) => {
                return s + (m.items || []).reduce((i, item) => i + (item.protein || 0), 0);
            }, 0);
        }, 0) / historicalData.length;

        const workoutDays = historicalData.filter(d => (d.record.workouts || []).length > 0).length;
        const workoutFrequency = ((workoutDays / historicalData.length) * 7).toFixed(1);

        return `
【ユーザープロフィール】
- LBM: ${userProfile.leanBodyMass || 'N/A'}kg
- 目標: ${userProfile.goal || '未設定'}
- 体重: ${userProfile.weight || 'N/A'}kg
- 体脂肪率: ${userProfile.bodyFatPercentage || 'N/A'}%

【過去30日の傾向】
- 記録継続日数: ${historicalData.length}日
- 平均タンパク質摂取: ${avgProtein.toFixed(1)}g/日（LBM比: ${(avgProtein / (userProfile.leanBodyMass || 1)).toFixed(2)}g/kg）
- トレーニング頻度: 週${workoutFrequency}回
`;
    };

    // AIメッセージ送信
    const sendAIMessage = async () => {
        if (!aiInputMessage.trim() || aiLoading) return;

        const userMessage = aiInputMessage.trim();
        setAiInputMessage('');

        // ユーザーメッセージを追加
        const newHistory = [...aiChatHistory, {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        }];
        setAiChatHistory(newHistory);
        setAiLoading(true);

        // コンテキスト生成
        const context = await generatePGBaseContext();

        const systemPrompt = `
あなたは、ユーザーに寄り添う優秀なパーソナルトレーナーです。
ユーザーの過去データと傾向を分析し、その人が**今最も学ぶべきこと**を、モチベーションが高まるように提案してください。

${context}

【利用可能なモジュール】
1. 「メンタルの教科書」: モチベーション、習慣形成、ストレス管理
2. 「タンパク質の教科書」: タンパク質の役割、アミノ酸スコア、摂取タイミング
3. 「炭水化物の教科書」: 炭水化物の種類、GI値、糖質制限
4. 「脂質の教科書」: 脂質の種類、オメガ3/6/9、ケトジェニック
5. 「ビタミン・ミネラルの教科書」: 微量栄養素の役割、欠乏症
6. 「アミノ酸の教科書」: BCAA、EAA、グルタミン
7. 「クレアチンの教科書」: クレアチンの効果、摂取方法
8. 「応用サプリメントの教科書」: ベータアラニン、HMB、カルニチン

## 思考の原則
1. **ボトルネックの特定**: 提供されたデータから、ユーザーの目標達成を最も妨げている要因（ボトルネック）を一つ見つけ出します。
2. **解決策の提示**: そのボトルネックを解消するために最も効果的なモジュールを1〜2個、自信を持って推奨します。
3. **未来の提示**: モジュールで学ぶことによって、ユーザーの課題がどう解決され、理想の姿に近づけるかを具体的に示します。

【回答形式】※簡潔かつ、温かみのある言葉で
### ✅ 素晴らしい点と、さらに良くなる点
[ユーザーの努力を具体的に褒め（例：記録継続）、データに基づいた改善点を1つ指摘]

### 💡 今、学ぶべきこと
[推奨モジュール名を「」で提示。「なぜなら〜」の形で、理由をデータと目標に結びつけて説明]

### 💪 期待できる未来
[この学びを通じて、ユーザーがどう変化できるかを具体的に描写]

### 🚀 次のステップ
[「まずは『〇〇の教科書』を読んでみませんか？」のように、具体的な次のアクションを問いかける形で締めくくる]

**重要原則**:
- LBM至上主義: すべての評価はLBMを基準に
- ユーザー主権: 押し付けではなく提案として
- 必ずモジュール名を「」で囲んで明記
`;

        const fullMessage = systemPrompt + '\n\n【ユーザーの質問】\n' + userMessage;

        try {
            // PG BASE：学習推奨機能、gemini-2.5-proを使用
            const response = await GeminiAPI.sendMessage(fullMessage, aiChatHistory, userProfile, 'gemini-2.5-pro');

            if (response.success) {
                const updatedHistory = [...newHistory, {
                    role: 'assistant',
                    content: response.text,
                    timestamp: new Date().toISOString()
                }];
                setAiChatHistory(updatedHistory);
                await DataService.savePGBaseChatHistory(updatedHistory);
            } else {
                const errorHistory = [...newHistory, {
                    role: 'assistant',
                    content: 'エラーが発生しました: ' + response.error,
                    timestamp: new Date().toISOString()
                }];
                setAiChatHistory(errorHistory);
            }
        } catch (error) {
            console.error('AI送信エラー:', error);
            const errorHistory = [...newHistory, {
                role: 'assistant',
                content: 'メッセージの送信中にエラーが発生しました。',
                timestamp: new Date().toISOString()
            }];
            setAiChatHistory(errorHistory);
        }

        setAiLoading(false);
    };

    // 選択されたモジュールがある場合はiframe表示
    if (selectedModule) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                {/* ヘッダー */}
                <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-4 py-4 flex items-center justify-between shadow-lg">
                    <button onClick={() => setSelectedModule(null)} className="p-2 hover:bg-white/20 rounded-lg transition">
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <div className="flex-1 text-center">
                        <h2 className="text-lg font-bold">{selectedModule.title}</h2>
                    </div>
                    <button onClick={() => setSelectedModule(null)} className="p-2 hover:bg-white/20 rounded-lg transition">
                        <Icon name="X" size={24} />
                    </button>
                </div>

                {/* iframeでtextbookを表示 */}
                <iframe
                    src={selectedModule.path}
                    className="flex-1 w-full border-0"
                    title={selectedModule.title}
                />
            </div>
        );
    }

    // フィルター済みモジュール
    const filteredModules = selectedCategory === 'all'
        ? textbookModules
        : textbookModules.filter(m => m.category === selectedCategory);

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-4 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <Icon name="BookOpen" size={24} />
                    <div>
                        <h2 className="text-xl font-bold">PG BASE</h2>
                        <p className="text-xs opacity-90">知識プラットフォーム</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
                    <Icon name="X" size={24} />
                </button>
            </div>

            {/* タブ切り替え（モジュール/AIモード/コミュニティ） */}
            <div className="bg-white border-b border-gray-200 px-4 pt-3">
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setViewMode('modules')}
                        className={`px-5 py-2 rounded-t-lg font-medium text-sm transition ${
                            viewMode === 'modules'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Icon name="BookOpen" size={16} className="inline mr-1" />
                        モジュール
                    </button>
                    <button
                        onClick={() => setViewMode('ai')}
                        className={`px-5 py-2 rounded-t-lg font-medium text-sm transition ${
                            viewMode === 'ai'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Icon name="Sparkles" size={16} className="inline mr-1" />
                        AIモード
                    </button>
                </div>
            </div>

            {/* カテゴリフィルター（モジュール表示時のみ） */}
            {viewMode === 'modules' && (
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { value: 'all', label: 'すべて', icon: 'LayoutGrid', color: 'cyan' },
                            { value: 'メンタル', label: 'メンタル', icon: 'Brain', color: 'pink' },
                            { value: '栄養学', label: '栄養学', icon: 'Apple', color: 'green' },
                            { value: '運動科学', label: '運動科学', icon: 'Zap', color: 'orange' }
                        ].map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition ${
                                    selectedCategory === cat.value
                                        ? cat.color === 'purple' ? 'bg-cyan-600 text-white' :
                                          cat.color === 'pink' ? 'bg-pink-600 text-white' :
                                          cat.color === 'green' ? 'bg-green-600 text-white' :
                                          'bg-orange-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <Icon name={cat.icon} size={16} />
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* モジュール一覧 */}
            {viewMode === 'modules' && (
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {filteredModules.length === 0 ? (
                    <div className="text-center py-12">
                        <Icon name="Search" size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">該当するモジュールが見つかりませんでした</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredModules.map(module => (
                            <button
                                key={module.id}
                                onClick={() => setSelectedModule(module)}
                                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition text-left border-2 border-transparent hover:border-cyan-300"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        module.category === '心理学' ? 'bg-gradient-to-br from-pink-500 to-rose-500' :
                                        module.category === '運動科学' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                                        'bg-gradient-to-br from-green-500 to-emerald-500'
                                    }`}>
                                        <Icon name={module.icon} size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 mb-1">{module.title}</h3>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                            module.category === 'メンタル' ? 'bg-pink-600 text-white' :
                                            module.category === '運動科学' ? 'bg-orange-600 text-white' :
                                            'bg-green-600 text-white'
                                        }`}>
                                            {module.category}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">{module.description}</p>
                                <div className="mt-3 flex items-center text-cyan-600 text-sm font-medium">
                                    <span>教科書を開く</span>
                                    <Icon name="ChevronRight" size={16} className="ml-1" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                </div>
            )}

            {/* AIモード */}
            {viewMode === 'ai' && (
                <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                    {/* チャット履歴 */}
                    <div ref={aiChatContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4" style={{paddingBottom: '2rem'}}>
                        {aiChatHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="MessageCircle" size={48} className="mx-auto mb-4 text-cyan-300" />
                                <p className="text-gray-600 font-medium mb-2">PG BASE AIモード</p>
                                <p className="text-sm text-gray-500 px-8">
                                    あなたの記録データと傾向をもとに、最適な知識モジュールを提案します。<br/>
                                    気になることや悩みを気軽に質問してください。
                                </p>
                            </div>
                        ) : (
                            aiChatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${
                                        msg.role === 'user'
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-white border border-gray-200 text-gray-800'
                                    }`}>
                                        <div className="text-sm leading-relaxed"><MarkdownRenderer text={msg.content} /></div>
                                        <p className="text-xs mt-2 opacity-70">
                                            {new Date(msg.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        {aiLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                                        <span className="text-sm text-gray-600">分析中...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* 下部スペーサー（入力欄の高さ分） */}
                        <div className="h-4"></div>
                    </div>

                    {/* 入力欄 */}
                    <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={aiInputMessage}
                                onChange={(e) => setAiInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
                                placeholder="質問や悩みを入力..."
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                disabled={aiLoading}
                            />
                            <button
                                onClick={sendAIMessage}
                                disabled={!aiInputMessage.trim() || aiLoading}
                                className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                            >
                                <Icon name="Send" size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// ===== コミュニティ投稿ビュー =====
const CommunityPostView = ({ onClose, onSubmitPost, userProfile, usageDays, historyData }) => {
    const [postContent, setPostContent] = useState('');
    const [postCategory, setPostCategory] = useState('body');
    const [beforePhoto, setBeforePhoto] = useState(null);
    const [afterPhoto, setAfterPhoto] = useState(null);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);
    const [dataSelectionType, setDataSelectionType] = useState('average'); // 'single', 'average'
    const [citedModules, setCitedModules] = useState([]); // 複数選択可能に変更
    const [expandedModuleCategories, setExpandedModuleCategories] = useState({}); // カテゴリ折り畳み状態
    const [debugMode, setDebugMode] = useState(false);
    const beforeInputRef = useRef(null);
    const afterInputRef = useRef(null);
    const IS_PRODUCTION = false;

    // 最後の投稿日時を取得
    const lastBodyPostDate = localStorage.getItem('lastBodyPostDate');
    const lastPostTime = lastBodyPostDate ? new Date(lastBodyPostDate) : null;

    // 過去30日の記録日数をカウント（最後の投稿以降のみカウント）
    const getRecordDaysInLast30 = () => {
        if (!historyData) return 0;
        const last30Days = Object.keys(historyData)
            .filter(date => {
                const recordDate = new Date(date);
                const daysDiff = Math.floor((new Date() - recordDate) / (1000 * 60 * 60 * 24));

                // 過去30日以内
                if (daysDiff < 0 || daysDiff >= 30) return false;

                // 最後の投稿以降の記録のみカウント
                if (lastPostTime && recordDate <= lastPostTime) return false;

                return true;
            })
            .filter(date => {
                const data = historyData[date];
                return (data.meals && data.meals.length > 0) ||
                       (data.workouts && data.workouts.length > 0) ||
                       data.conditions;
            });
        return last30Days.length;
    };

    const recordDays = getRecordDaysInLast30();

    // 初回投稿：30日継続＋22日記録
    // 2回目以降：前回投稿から30日経過 OR 前回投稿以降に22日記録
    const daysSinceLastPost = lastPostTime ? Math.floor((new Date() - lastPostTime) / (1000 * 60 * 60 * 24)) : 999;
    const canPostBody = !lastPostTime
        ? (usageDays >= 30 && recordDays >= 22)  // 初回
        : (daysSinceLastPost >= 30 || recordDays >= 22);  // 2回目以降

    // 過去3ヶ月のLBM変化を計算
    const calculateLBMChange = () => {
        if (!historyData) return null;
        const dates = Object.keys(historyData).sort();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const recentDates = dates.filter(date => new Date(date) >= threeMonthsAgo);
        if (recentDates.length < 2) return null;

        const oldestData = historyData[recentDates[0]];
        const latestData = historyData[recentDates[recentDates.length - 1]];

        if (oldestData?.lbm && latestData?.lbm) {
            return (latestData.lbm - oldestData.lbm).toFixed(1);
        }
        return null;
    };

    const lbmChange = calculateLBMChange();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [beforePhotoFile, setBeforePhotoFile] = useState(null);
    const [afterPhotoFile, setAfterPhotoFile] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async () => {
        setErrorMessage('');

        if (!postContent.trim()) {
            setErrorMessage('投稿内容を入力してください');
            return;
        }

        if (!debugMode && postCategory === 'body') {
            if (!beforePhoto || !afterPhoto) {
                setErrorMessage('ビフォー・アフター写真を両方アップロードしてください');
                return;
            }
            // データ選択の検証
            if (dataSelectionType === 'single' && !selectedHistoryDate) {
                setErrorMessage('引用する記録データを選択してください');
                return;
            }
            if (dataSelectionType === 'average' && !stats) {
                setErrorMessage('記録データが不足しています');
                return;
            }
            if (!canPostBody) {
                setErrorMessage('ボディメイク投稿には30日以上の継続と、過去30日中22日以上の記録が必要です');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // 画像アップロード（本番環境ではFirebase Storageへ）
            let beforePhotoUrl = beforePhoto;
            let afterPhotoUrl = afterPhoto;

            if (!DEV_MODE && postCategory === 'body') {
                if (beforePhotoFile) {
                    beforePhotoUrl = await DataService.uploadCommunityPhoto(userProfile.uid, beforePhotoFile, 'before');
                }
                if (afterPhotoFile) {
                    afterPhotoUrl = await DataService.uploadCommunityPhoto(userProfile.uid, afterPhotoFile, 'after');
                }
            }

            // 添付データの準備
            let attachedData = null;
            if (postCategory === 'body') {
                if (dataSelectionType === 'single' && selectedHistoryDate && historyData[selectedHistoryDate]) {
                    const data = historyData[selectedHistoryDate];
                    attachedData = {
                        dataType: 'single',
                        date: selectedHistoryDate,
                        usageDays: usageDays,
                        recordDays: recordDays,
                        totalCalories: data.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0,
                        protein: data.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0,
                        fat: data.meals?.reduce((sum, m) => sum + (m.fat || 0), 0) || 0,
                        carbs: data.meals?.reduce((sum, m) => sum + (m.carbs || 0), 0) || 0,
                        workoutTime: data.workouts?.reduce((sum, w) => {
                            // Sum all set durations from all exercises
                            const totalSetTime = w.exercises?.reduce((setSum, ex) => {
                                return setSum + (ex.sets?.reduce((s, set) => s + (set.duration || 0), 0) || 0);
                            }, 0) || 0;
                            return sum + totalSetTime;
                        }, 0) || 0,
                        lbmChange: lbmChange,
                        weight: data.weight,
                        lbm: data.lbm
                    };
                } else if (dataSelectionType === 'average' && stats) {
                    attachedData = {
                        dataType: 'average',
                        daysCount: stats.dailyAverage.daysCount,
                        usageDays: usageDays,
                        recordDays: recordDays,
                        totalCalories: stats.dailyAverage.calories,
                        protein: stats.dailyAverage.protein,
                        fat: stats.dailyAverage.fat,
                        carbs: stats.dailyAverage.carbs,
                        workoutTime: stats.dailyAverage.workoutTime,
                        lbmChange: lbmChange
                    };
                } else if (dataSelectionType === 'weekly' && stats) {
                    attachedData = {
                        dataType: 'weekly',
                        daysCount: stats.weeklyAverage.daysCount,
                        usageDays: usageDays,
                        recordDays: recordDays,
                        totalCalories: stats.weeklyAverage.calories,
                        protein: stats.weeklyAverage.protein,
                        fat: stats.weeklyAverage.fat,
                        carbs: stats.weeklyAverage.carbs,
                        workoutTime: stats.weeklyAverage.workoutTime,
                        lbmChange: lbmChange
                    };
                }
            }

            const newPost = {
                id: Date.now(),
                author: userProfile.name || userProfile.nickname || 'ユーザー',
                userId: userProfile.uid,
                category: postCategory,
                content: postContent,
                beforePhoto: beforePhotoUrl,
                afterPhoto: afterPhotoUrl,
                citedModules: citedModules,
                timestamp: new Date().toISOString(),
                approvalStatus: postCategory === 'body' ? 'pending' : 'approved',
                attachedData: attachedData,
                likes: 0,
                comments: []
            };

            // Firestoreに投稿を作成
            const result = await DataService.createCommunityPost(newPost);

            if (result.success) {
                // 投稿完了後に投稿日時を記録
                if (postCategory === 'body') {
                    localStorage.setItem('lastBodyPostDate', new Date().toISOString());
                }

                onSubmitPost(newPost);
                onClose();
            } else {
                setErrorMessage('投稿に失敗しました: ' + result.error);
            }
        } catch (error) {
            console.error('Error submitting post:', error);
            setErrorMessage('投稿中にエラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotoSelect = (type) => (e) => {
        const file = e.target.files[0];
        if (file) {
            // ファイルオブジェクトを保存（本番環境でアップロード用）
            if (type === 'before') {
                setBeforePhotoFile(file);
            } else {
                setAfterPhotoFile(file);
            }

            // プレビュー用にBase64に変換
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'before') {
                    setBeforePhoto(reader.result);
                } else {
                    setAfterPhoto(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const availableHistoryDates = historyData ? Object.keys(historyData)
        .filter(date => {
            const data = historyData[date];
            return (data.meals && data.meals.length > 0) || (data.workouts && data.workouts.length > 0);
        })
        .sort()
        .reverse()
        .slice(0, 30) : [];

    // 日次平均の計算（休養日除外 - トレーニング時間）
    const calculateStats = () => {
        if (!historyData) return null;

        const allDates = Object.keys(historyData)
            .filter(date => {
                const data = historyData[date];
                return (data.meals && data.meals.length > 0) || (data.workouts && data.workouts.length > 0);
            })
            .sort()
            .reverse();

        if (allDates.length === 0) return null;

        // 全日数の平均（日次平均）
        let totalCalories = 0, totalProtein = 0, totalFat = 0, totalCarbs = 0, totalWorkout = 0;
        let daysCount = 0;
        let workoutDaysCount = 0; // トレーニング日数

        allDates.forEach(date => {
            const data = historyData[date];
            daysCount++;
            totalCalories += data.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
            totalProtein += data.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
            totalFat += data.meals?.reduce((sum, m) => sum + (m.fat || 0), 0) || 0;
            totalCarbs += data.meals?.reduce((sum, m) => sum + (m.carbs || 0), 0) || 0;

            const workoutTime = data.workouts?.reduce((sum, w) => {
                // Sum all set durations from all exercises
                const totalSetTime = w.exercises?.reduce((setSum, ex) => {
                    return setSum + (ex.sets?.reduce((s, set) => s + (set.duration || 0), 0) || 0);
                }, 0) || 0;
                return sum + totalSetTime;
            }, 0) || 0;
            if (workoutTime > 0) {
                totalWorkout += workoutTime;
                workoutDaysCount++;
            }
        });

        const dailyAverage = {
            calories: Math.round(totalCalories / daysCount),
            protein: Math.round(totalProtein / daysCount),
            fat: Math.round(totalFat / daysCount),
            carbs: Math.round(totalCarbs / daysCount),
            workoutTime: workoutDaysCount > 0 ? Math.round(totalWorkout / workoutDaysCount) : 0,
            daysCount: daysCount,
            workoutDaysCount: workoutDaysCount
        };

        return { dailyAverage };
    };

    const stats = calculateStats();

    const pgbaseModules = [
        { id: 'mental_textbook', title: 'メンタルの教科書', category: 'メンタル' },
        { id: 'pg_formula_textbook', title: 'PG式の教科書', category: '運動科学' },
        { id: 'carb_textbook', title: '炭水化物の教科書', category: '栄養学' },
        { id: 'protein_textbook', title: 'タンパク質の教科書', category: '栄養学' },
        { id: 'fat_textbook', title: '脂質の教科書', category: '栄養学' },
        { id: 'vitamin_mineral_textbook', title: 'ビタミン・ミネラルの教科書', category: '栄養学' }
    ];

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <header className="p-4 flex items-center border-b bg-white flex-shrink-0">
                <button onClick={onClose}>
                    <Icon name="ArrowLeft" size={24} />
                </button>
                <h1 className="text-xl font-bold mx-auto">コミュニティに投稿</h1>
                {!IS_PRODUCTION && (
                    <button
                        onClick={() => setDebugMode(!debugMode)}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded"
                    >
                        {debugMode ? 'DEBUG' : 'DEBUG OFF'}
                    </button>
                )}
                {IS_PRODUCTION && <div className="w-6"></div>}
            </header>
            <div className="p-6 flex-grow overflow-y-auto">
                {debugMode && (
                    <div className="mb-4 p-3 bg-red-50 border-2 border-red-500 rounded-lg">
                        <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                            <Icon name="AlertTriangle" size={16} />
                            デバッグモード有効
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                            • 投稿条件チェックをスキップします<br/>
                            • 写真・データ連携なしで投稿できます<br/>
                            • 本番環境では必ずOFFにしてください
                        </p>
                    </div>
                )}

                {/* カテゴリー選択 */}
                <div className="mb-6">
                    <label className="font-medium text-sm text-gray-700 mb-3 block">投稿カテゴリー</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPostCategory('body')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                postCategory === 'body'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 bg-white hover:border-indigo-300'
                            }`}
                        >
                            <div className="text-2xl mb-2">💪</div>
                            <div className="font-bold text-sm text-gray-800">ボディメイク</div>
                            <div className="text-xs text-gray-600 mt-1">写真＋データ連携</div>
                        </button>
                        <button
                            onClick={() => setPostCategory('mental')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                postCategory === 'mental'
                                    ? 'border-teal-600 bg-teal-50'
                                    : 'border-gray-200 bg-white hover:border-teal-300'
                            }`}
                        >
                            <div className="text-2xl mb-2">🧠</div>
                            <div className="font-bold text-sm text-gray-800">メンタル</div>
                            <div className="text-xs text-gray-600 mt-1">気づき・マインド</div>
                        </button>
                    </div>
                </div>

                {/* 投稿条件表示 */}
                {postCategory === 'body' && (
                    <div className={`border rounded-lg p-4 mb-4 ${
                        canPostBody ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                    }`}>
                        <p className={`text-sm font-semibold mb-2 flex items-center gap-1 ${
                            canPostBody ? 'text-green-800' : 'text-yellow-800'
                        }`}>
                            <Icon name={canPostBody ? "CheckCircle" : "Lock"} size={16} />
                            <span>ボディメイク投稿条件</span>
                        </p>
                        <div className="text-xs space-y-1">
                            {!lastPostTime ? (
                                <>
                                    <div className={usageDays >= 30 ? 'text-green-700' : 'text-yellow-700'}>
                                        ✓ 継続日数: {usageDays}日 / 必要: 30日以上
                                    </div>
                                    <div className={recordDays >= 22 ? 'text-green-700' : 'text-yellow-700'}>
                                        ✓ 過去30日の記録: {recordDays}日 / 必要: 22日以上
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-blue-700 font-semibold mb-1">
                                        前回投稿: {new Date(lastPostTime).toLocaleDateString('ja-JP')} ({daysSinceLastPost}日前)
                                    </div>
                                    <div className={daysSinceLastPost >= 30 ? 'text-green-700' : 'text-yellow-700'}>
                                        ✓ 前回投稿から30日経過: {daysSinceLastPost >= 30 ? 'OK' : `あと${30 - daysSinceLastPost}日`}
                                    </div>
                                    <div className="text-gray-600 text-center my-1">または</div>
                                    <div className={recordDays >= 22 ? 'text-green-700' : 'text-yellow-700'}>
                                        ✓ 前回投稿以降の記録: {recordDays}日 / 必要: 22日以上
                                    </div>
                                </>
                            )}
                            <div className="text-gray-700 mt-2 font-semibold">
                                ✓ アプリ内カメラでビフォー・アフター写真撮影（必須）
                            </div>
                            <div className="text-gray-700 font-semibold">
                                ✓ Your Coach+ データ連携（必須）
                            </div>
                            <div className="text-indigo-700 mt-2 font-semibold">
                                ℹ️ 投稿は運営の承認後に公開されます
                            </div>
                        </div>
                    </div>
                )}

                {postCategory === 'mental' && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-semibold text-teal-800 mb-2 flex items-center gap-1">
                            <Icon name="CheckCircle" size={16} />
                            <span>メンタル投稿は常に可能です</span>
                        </p>
                        <p className="text-xs text-teal-700">
                            あなたの気づき・考え方・マインドセットを自由に共有してください
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {/* ビフォー・アフター写真 */}
                    {postCategory === 'body' && (
                        <div>
                            <label className="font-medium text-sm text-gray-700 mb-2 block">
                                ビフォー・アフター写真（首から下）<span className="text-red-500">*</span>
                            </label>
                            <div className={`border rounded-lg p-3 mb-3 ${
                                debugMode ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                            }`}>
                                <p className={`text-xs flex items-center gap-1 ${
                                    debugMode ? 'text-red-800' : 'text-blue-800'
                                }`}>
                                    <Icon name="Camera" size={14} />
                                    <span className="font-semibold">
                                        {debugMode ? '🔧 デバッグモード: デバイスから写真選択可能' : 'アプリ内カメラで撮影してください'}
                                    </span>
                                </p>
                                {!debugMode && (
                                    <p className="text-xs text-blue-700 mt-1">
                                        • 首から下のみ撮影（顔は写さない）<br/>
                                        • 同じ角度・光量で撮影すると比較しやすくなります
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {/* ビフォー写真 */}
                                <div>
                                    <p className="text-xs text-gray-600 mb-2 text-center">ビフォー</p>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 text-center">
                                        {beforePhoto ? (
                                            <div className="relative">
                                                <img src={beforePhoto} alt="Before" className="max-h-32 mx-auto rounded-lg" />
                                                <button
                                                    onClick={() => setBeforePhoto(null)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <Icon name="X" size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => beforeInputRef.current?.click()}
                                            >
                                                <input
                                                    ref={beforeInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    capture={debugMode ? undefined : "environment"}
                                                    onChange={handlePhotoSelect('before')}
                                                    className="hidden"
                                                    disabled={!debugMode && !canPostBody}
                                                />
                                                <div className="py-6">
                                                    <Icon name="Camera" size={32} className="mx-auto text-gray-400 mb-1" />
                                                    <p className="text-xs text-gray-600">
                                                        {debugMode ? 'ファイル選択' : 'カメラ起動'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* アフター写真 */}
                                <div>
                                    <p className="text-xs text-gray-600 mb-2 text-center">アフター</p>
                                    <div className="border-2 border-dashed border-indigo-300 rounded-lg p-2 text-center">
                                        {afterPhoto ? (
                                            <div className="relative">
                                                <img src={afterPhoto} alt="After" className="max-h-32 mx-auto rounded-lg" />
                                                <button
                                                    onClick={() => setAfterPhoto(null)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <Icon name="X" size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="cursor-pointer"
                                                onClick={() => afterInputRef.current?.click()}
                                            >
                                                <input
                                                    ref={afterInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    capture={debugMode ? undefined : "environment"}
                                                    onChange={handlePhotoSelect('after')}
                                                    className="hidden"
                                                    disabled={!debugMode && !canPostBody}
                                                />
                                                <div className="py-6">
                                                    <Icon name="Camera" size={32} className="mx-auto text-indigo-400 mb-1" />
                                                    <p className="text-xs text-gray-600">
                                                        {debugMode ? 'ファイル選択' : 'カメラ起動'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 投稿内容 */}
                    <div>
                        <label className="font-medium text-sm text-gray-700 mb-2 block">投稿内容</label>
                        <textarea
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            className="w-full p-3 border rounded-lg h-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={postCategory === 'body'
                                ? "トレーニング・食事の工夫、結果の経過など..."
                                : "モチベーション維持のコツ、マインドセットの変化など..."}
                        />
                    </div>

                    {/* データ連携 */}
                    {postCategory === 'body' && (
                        <>
                            <div>
                                <label className="font-medium text-sm text-gray-700 mb-2 block">
                                    引用する記録データを選択<span className="text-red-500">*</span>
                                </label>

                                {/* データタイプ選択 */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setDataSelectionType('single')}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                                            dataSelectionType === 'single'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        特定日
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDataSelectionType('average')}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                                            dataSelectionType === 'average'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        日次平均
                                    </button>
                                </div>

                                {/* 特定日選択 */}
                                {dataSelectionType === 'single' && (
                                    <select
                                        value={selectedHistoryDate || ''}
                                        onChange={(e) => setSelectedHistoryDate(e.target.value)}
                                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        disabled={!canPostBody && !debugMode}
                                    >
                                        <option value="">日付を選択してください</option>
                                        {availableHistoryDates.map(date => (
                                            <option key={date} value={date}>
                                                {new Date(date).toLocaleDateString('ja-JP', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* データプレビュー */}
                            {(canPostBody || debugMode) && (() => {
                                let dataToShow = null;
                                let titleText = '';

                                if (dataSelectionType === 'single' && selectedHistoryDate && historyData[selectedHistoryDate]) {
                                    const data = historyData[selectedHistoryDate];
                                    dataToShow = {
                                        calories: data.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0,
                                        protein: data.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0,
                                        fat: data.meals?.reduce((sum, m) => sum + (m.fat || 0), 0) || 0,
                                        carbs: data.meals?.reduce((sum, m) => sum + (m.carbs || 0), 0) || 0,
                                        workoutTime: data.workouts?.reduce((sum, w) => {
                            // Sum all set durations from all exercises
                            const totalSetTime = w.exercises?.reduce((setSum, ex) => {
                                return setSum + (ex.sets?.reduce((s, set) => s + (set.duration || 0), 0) || 0);
                            }, 0) || 0;
                            return sum + totalSetTime;
                        }, 0) || 0,
                                        weight: data.weight,
                                        lbm: data.lbm
                                    };
                                    titleText = `連携データ（${new Date(selectedHistoryDate).toLocaleDateString('ja-JP')}）:`;
                                } else if (dataSelectionType === 'average' && stats) {
                                    dataToShow = stats.dailyAverage;
                                    titleText = `日次平均（全${stats.dailyAverage.daysCount}日間、トレーニング${stats.dailyAverage.workoutDaysCount}日）:`;
                                }

                                if (!dataToShow) return null;

                                return (
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                        <p className="text-xs font-semibold text-indigo-700 mb-2">{titleText}</p>
                                        <div className="space-y-1 text-xs text-gray-700">
                                            <div>• カロリー: {dataToShow.calories}kcal</div>
                                            <div>• タンパク質: {dataToShow.protein}g</div>
                                            <div>• 脂質: {dataToShow.fat}g</div>
                                            <div>• 炭水化物: {dataToShow.carbs}g</div>
                                            <div>• トレーニング時間: {dataToShow.workoutTime}分 {dataSelectionType === 'average' ? '(休養日除外)' : ''}</div>
                                            {dataToShow.weight && <div>• 体重: {dataToShow.weight}kg</div>}
                                            {dataToShow.lbm && <div>• 除脂肪体重: {dataToShow.lbm}kg</div>}
                                            {lbmChange && (
                                                <div className="font-semibold text-indigo-700 mt-2">
                                                    • 過去3ヶ月のLBM変化: {lbmChange > 0 ? '+' : ''}{lbmChange}kg
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}

                    {/* PGBASEモジュール引用（カテゴリ別折り畳み式・複数選択可能） */}
                    <div>
                        <label className="font-medium text-sm text-gray-700 mb-2 block">
                            PG BASE モジュール引用（任意・複数選択可）
                        </label>
                        <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                            {(() => {
                                // カテゴリごとにモジュールをグループ化
                                const categoryGroups = pgbaseModules.reduce((acc, module) => {
                                    if (!acc[module.category]) acc[module.category] = [];
                                    acc[module.category].push(module);
                                    return acc;
                                }, {});

                                const toggleCategory = (category) => {
                                    setExpandedModuleCategories(prev => ({
                                        ...prev,
                                        [category]: !prev[category]
                                    }));
                                };

                                return Object.keys(categoryGroups).map(category => (
                                    <div key={category} className="border rounded-lg overflow-hidden">
                                        {/* カテゴリヘッダー */}
                                        <button
                                            type="button"
                                            onClick={() => toggleCategory(category)}
                                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 transition"
                                        >
                                            <span className="font-semibold text-sm text-gray-700">
                                                {category} ({categoryGroups[category].length})
                                            </span>
                                            <Icon name={expandedModuleCategories[category] ? "ChevronUp" : "ChevronDown"} size={16} />
                                        </button>
                                        {/* モジュールリスト */}
                                        {expandedModuleCategories[category] && (
                                            <div className="p-2 space-y-1 bg-white">
                                                {categoryGroups[category].map(module => (
                                                    <label key={module.id} className="flex items-center gap-2 cursor-pointer hover:bg-teal-50 p-2 rounded transition">
                                                        <input
                                                            type="checkbox"
                                                            checked={citedModules.some(m => m.id === module.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setCitedModules([...citedModules, module]);
                                                                } else {
                                                                    setCitedModules(citedModules.filter(m => m.id !== module.id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                                                        />
                                                        <span className="text-sm flex-1">{module.title}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                        {citedModules.length > 0 && (
                            <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                                <p className="text-xs text-teal-800 font-semibold mb-1">
                                    📚 選択中のモジュール ({citedModules.length}件):
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {citedModules.map(module => (
                                        <span key={module.id} className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded">
                                            {module.title}
                                            <button
                                                type="button"
                                                onClick={() => setCitedModules(citedModules.filter(m => m.id !== module.id))}
                                                className="hover:text-teal-900"
                                            >
                                                <Icon name="X" size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* フッター */}
            <div className="p-4 bg-white border-t space-y-3">
                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800 flex items-center gap-2">
                            <Icon name="AlertCircle" size={16} />
                            {errorMessage}
                        </p>
                    </div>
                )}
                {postCategory === 'body' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-800 flex items-center gap-1">
                            <Icon name="Clock" size={14} />
                            <span className="font-semibold">承認制の投稿</span>
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            ボディメイク投稿は運営が内容を確認し、承認後にCOMYで公開されます。不適切な内容が含まれる場合は非公開となる可能性があります。
                        </p>
                    </div>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!debugMode && postCategory === 'body' ? !canPostBody : false)}
                    className={`w-full font-bold py-3 rounded-lg transition ${
                        isSubmitting
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : debugMode || (postCategory === 'body' && canPostBody) || postCategory === 'mental'
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    {isSubmitting
                        ? '投稿中...'
                        : debugMode ? '🔧 デバッグ投稿' : postCategory === 'body' ? '承認申請を送信' : '投稿する'}
                </button>
            </div>
        </div>
    );
};

// ===== 管理者パネル（COMY投稿承認） =====
const AdminPanel = ({ onClose }) => {
    const [pendingPosts, setPendingPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);

    useEffect(() => {
        loadPendingPosts();
    }, []);

    const loadPendingPosts = async () => {
        setLoading(true);
        const posts = await DataService.getPendingPosts();
        setPendingPosts(posts);
        setLoading(false);
    };

    const [confirmAction, setConfirmAction] = useState(null); // { type: 'approve|reject', postId, reason }
    const [showRejectDialog, setShowRejectDialog] = useState(null); // postId
    const [rejectReason, setRejectReason] = useState('');
    const [actionMessage, setActionMessage] = useState('');

    const handleApprove = async (postId) => {
        setConfirmAction({ type: 'approve', postId });
    };

    const handleReject = (postId) => {
        setShowRejectDialog(postId);
        setRejectReason('');
    };

    const executeApprove = async () => {
        const postId = confirmAction.postId;
        setConfirmAction(null);

        const success = await DataService.approvePost(postId);
        if (success) {
            setActionMessage('投稿を承認しました');
            setTimeout(() => setActionMessage(''), 3000);
            loadPendingPosts();
        } else {
            setActionMessage('承認に失敗しました');
        }
    };

    const executeReject = async () => {
        if (!rejectReason.trim()) {
            setActionMessage('却下理由を入力してください');
            return;
        }

        const postId = showRejectDialog;
        setShowRejectDialog(null);

        const success = await DataService.rejectPost(postId, rejectReason);
        if (success) {
            setActionMessage('投稿を却下しました');
            setTimeout(() => setActionMessage(''), 3000);
            loadPendingPosts();
        } else {
            setActionMessage('却下に失敗しました');
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <Icon name="Shield" size={24} />
                    <div>
                        <h2 className="text-xl font-bold">管理者パネル</h2>
                        <p className="text-xs opacity-90">COMY投稿承認</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
                    <Icon name="X" size={24} />
                </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">読み込み中...</p>
                    </div>
                ) : pendingPosts.length === 0 ? (
                    <div className="text-center py-12">
                        <Icon name="CheckCircle" size={64} className="mx-auto mb-4 text-green-500" />
                        <p className="text-gray-600 font-medium">承認待ちの投稿はありません</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-blue-800 flex items-center gap-2">
                                <Icon name="Info" size={16} />
                                <span className="font-semibold">承認待ち: {pendingPosts.length}件</span>
                            </p>
                        </div>

                        {pendingPosts.map(post => (
                            <div key={post.id} className="bg-white rounded-lg shadow-md p-6">
                                {/* 投稿情報 */}
                                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                                            {post.author?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{post.author}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(post.timestamp).toLocaleString('ja-JP')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                        post.category === 'body'
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'bg-teal-100 text-teal-700'
                                    }`}>
                                        {post.category === 'body' ? '💪 ボディメイク' : '🧠 メンタル'}
                                    </span>
                                </div>

                                {/* ビフォー・アフター写真 */}
                                {post.category === 'body' && post.beforePhoto && post.afterPhoto && (
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-600 text-center mb-2 font-semibold">Before</p>
                                            <img src={post.beforePhoto} alt="Before" className="w-full rounded-lg border-2 border-gray-200" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 text-center mb-2 font-semibold">After</p>
                                            <img src={post.afterPhoto} alt="After" className="w-full rounded-lg border-2 border-indigo-300" />
                                        </div>
                                    </div>
                                )}

                                {/* 投稿内容 */}
                                <div className="mb-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">投稿内容:</p>
                                    <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                        {post.content}
                                    </p>
                                </div>

                                {/* データ連携情報 */}
                                {post.attachedData && (
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
                                        <p className="text-xs font-semibold text-indigo-700 mb-3 flex items-center gap-1">
                                            <Icon name="Database" size={14} />
                                            データ連携情報
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 text-xs text-gray-700">
                                            <div>• 継続: {post.attachedData.usageDays}日</div>
                                            <div>• 記録: {post.attachedData.recordDays}日</div>
                                            <div>• カロリー: {post.attachedData.totalCalories}kcal</div>
                                            <div>• タンパク質: {post.attachedData.protein}g</div>
                                            <div>• 体重: {post.attachedData.weight}kg</div>
                                            <div>• LBM: {post.attachedData.lbm}kg</div>
                                            {post.attachedData.lbmChange && (
                                                <div className="col-span-3 font-semibold text-indigo-700">
                                                    • LBM変化: {post.attachedData.lbmChange > 0 ? '+' : ''}{post.attachedData.lbmChange}kg
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* アクションボタン */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleApprove(post.id)}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
                                    >
                                        <Icon name="CheckCircle" size={20} />
                                        承認
                                    </button>
                                    <button
                                        onClick={() => handleReject(post.id)}
                                        className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
                                    >
                                        <Icon name="XCircle" size={20} />
                                        却下
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 承認確認ダイアログ */}
            {confirmAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">投稿を承認しますか？</h3>
                        <p className="text-sm text-gray-600 mb-6">承認すると、この投稿がCOMYフィードに公開されます。</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={executeApprove}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                            >
                                承認する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 却下理由入力ダイアログ */}
            {showRejectDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">投稿を却下</h3>
                        <p className="text-sm text-gray-600 mb-4">却下理由を入力してください（投稿者には通知されません）</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="例: 不適切な内容が含まれているため"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4 min-h-[100px]"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectDialog(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={executeReject}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                            >
                                却下する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* アクションメッセージ */}
            {actionMessage && (
                <div className="fixed top-4 right-4 z-[70] bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg">
                    {actionMessage}
                </div>
            )}
        </div>
    );
};

// ===== COMYビュー =====
const COMYView = ({ onClose, userId, userProfile, usageDays, historyData }) => {
    const [activeView, setActiveView] = useState('feed'); // 'feed', 'post', 'mypage', 'community'
    const [posts, setPosts] = useState([]);
    const [fabOpen, setFabOpen] = useState(false);
    const [commentingPostId, setCommentingPostId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [shareModalPostId, setShareModalPostId] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [showThemeSpaceSelector, setShowThemeSpaceSelector] = useState(false);
    const [showMentorApplication, setShowMentorApplication] = useState(false);

    useEffect(() => {
        loadPosts();
        // URLパラメータから投稿IDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        if (postId) {
            setSelectedPostId(postId);
            setCommentingPostId(postId);
        }
    }, []);

    // 選択された投稿までスクロール
    useEffect(() => {
        if (selectedPostId && posts.length > 0) {
            setTimeout(() => {
                const postElement = document.getElementById(`post-${selectedPostId}`);
                if (postElement) {
                    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }, [selectedPostId, posts]);

    const loadPosts = async () => {
        const allPosts = await DataService.getCommunityPosts();
        setPosts(allPosts);
    };

    const handleSubmitPost = async (newPost) => {
        const updatedPosts = [newPost, ...posts];
        await DataService.saveCommunityPosts(updatedPosts);
        setPosts(updatedPosts);

        // 投稿完了後に投稿日時を記録（次回投稿条件判定用）
        if (newPost.category === 'body') {
            localStorage.setItem('lastBodyPostDate', new Date().toISOString());
        }

        setActiveView('feed');
    };

    const toggleLike = async (postId) => {
        const updatedPosts = posts.map(post => {
            if (post.id === postId) {
                // いいねしたユーザーのリストを管理
                const likedUsers = post.likedUsers || [];
                const hasLiked = likedUsers.includes(userId);

                if (hasLiked) {
                    // すでにいいね済み → 取り消し
                    return {
                        ...post,
                        likes: Math.max(0, (post.likes || 0) - 1),
                        likedUsers: likedUsers.filter(id => id !== userId)
                    };
                } else {
                    // まだいいねしていない → いいね追加
                    return {
                        ...post,
                        likes: (post.likes || 0) + 1,
                        likedUsers: [...likedUsers, userId]
                    };
                }
            }
            return post;
        });
        setPosts(updatedPosts);
        await DataService.saveCommunityPosts(updatedPosts);
    };

    const handleAddComment = async (postId) => {
        if (!commentText.trim()) return;

        const updatedPosts = posts.map(post => {
            if (post.id === postId) {
                const newComment = {
                    id: Date.now().toString(),
                    userId: userId,
                    author: userProfile?.nickname || 'ユーザー',
                    content: commentText,
                    timestamp: new Date().toISOString()
                };
                return {
                    ...post,
                    comments: [...(post.comments || []), newComment]
                };
            }
            return post;
        });

        setPosts(updatedPosts);
        await DataService.saveCommunityPosts(updatedPosts);
        setCommentText('');
        // コメント送信後、コメント欄は開いたまま保持
    };

    const handleToggleComments = async (postId) => {
        if (commentingPostId === postId) {
            // 閉じる場合
            setCommentingPostId(null);
        } else {
            // 開く場合：最新データを取得してコメント欄を開く
            const latestPosts = await DataService.getCommunityPosts();
            setPosts(latestPosts);
            setCommentingPostId(postId);
        }
    };

    const handleShare = async (post) => {
        // 投稿固有のURLを生成
        const baseUrl = window.location.origin + window.location.pathname;
        const postUrl = `${baseUrl}?post=${post.id}`;

        const shareData = {
            title: 'COMY - ' + post.author + 'の投稿',
            text: post.content,
            url: postUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // フォールバック: クリップボードにコピー
                await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
                alert('投稿リンクをクリップボードにコピーしました！');
            }
            setShareModalPostId(null);
        } catch (error) {
            console.error('共有エラー:', error);
        }
    };

    // 承認済み投稿のみ表示
    const approvedPosts = posts.filter(post => post.approvalStatus === 'approved');

    // 投稿画面表示中
    if (activeView === 'post') {
        return (
            <CommunityPostView
                onClose={() => setActiveView('feed')}
                onSubmitPost={handleSubmitPost}
                userProfile={userProfile}
                usageDays={usageDays}
                historyData={historyData}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-fuchsia-600 to-teal-600 text-white px-4 py-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <Icon name="Users" size={24} />
                    <div>
                        <h2 className="text-xl font-bold">{userProfile?.nickname || 'COMY'}</h2>
                        <p className="text-xs opacity-90">コミュニティ</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
                    <Icon name="X" size={24} />
                </button>
            </div>

            {/* タブナビゲーション */}
            <div className="bg-white border-b border-gray-200">
                <div className="flex px-4 gap-2">
                    <button
                        onClick={() => setActiveView('feed')}
                        className={`px-5 py-3 font-medium text-sm transition border-b-2 ${
                            activeView === 'feed'
                                ? 'border-fuchsia-600 text-fuchsia-600'
                                : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <Icon name="MessageSquare" size={16} className="inline mr-1" />
                        フィード
                    </button>
                    <button
                        onClick={() => setActiveView('community')}
                        className={`px-5 py-3 font-medium text-sm transition border-b-2 ${
                            activeView === 'community'
                                ? 'border-fuchsia-600 text-fuchsia-600'
                                : 'border-transparent text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <Icon name="Compass" size={16} className="inline mr-1" />
                        コミュニティ
                    </button>
                </div>
            </div>

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                {activeView === 'feed' && (
                    <div className="max-w-2xl mx-auto p-4 space-y-4">
                        {approvedPosts.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="MessageSquare" size={64} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500 mb-2 font-medium">まだ投稿がありません</p>
                                <p className="text-sm text-gray-400">最初の投稿をしてみましょう!</p>
                            </div>
                        ) : (
                            approvedPosts.map(post => (
                                <div
                                    key={post.id}
                                    id={`post-${post.id}`}
                                    className={`bg-white rounded-lg shadow-sm p-4 transition-all ${
                                        selectedPostId === post.id ? 'ring-2 ring-blue-500' : ''
                                    }`}
                                >
                                    {/* カテゴリバッジ */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                            post.category === 'body'
                                                ? 'bg-fuchsia-100 text-fuchsia-700'
                                                : 'bg-teal-100 text-teal-700'
                                        }`}>
                                            {post.category === 'body' ? '💪 ボディメイク' : '🧠 メンタル'}
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            {new Date(post.timestamp).toLocaleString('ja-JP')}
                                        </p>
                                    </div>

                                    {/* ビフォー・アフター写真 */}
                                    {post.category === 'body' && post.beforePhoto && post.afterPhoto && (
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div>
                                                <p className="text-xs text-gray-600 text-center mb-1">Before</p>
                                                <img src={post.beforePhoto} alt="Before" className="w-full rounded-lg" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 text-center mb-1">After</p>
                                                <img src={post.afterPhoto} alt="After" className="w-full rounded-lg" />
                                            </div>
                                        </div>
                                    )}

                                    {/* 投稿者 */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {post.author?.[0] || 'U'}
                                        </div>
                                        <p className="font-medium text-gray-800 text-sm">{post.author}</p>
                                    </div>

                                    {/* 投稿内容 */}
                                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>

                                    {/* データ連携情報 */}
                                    {post.attachedData && (
                                        <div className="p-3 bg-fuchsia-50 border border-fuchsia-200 rounded-lg mb-3">
                                            <p className="text-xs font-semibold text-fuchsia-700 mb-2">📊 データ連携</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                                                <div>• 継続: {post.attachedData.usageDays}日</div>
                                                <div>• 記録: {post.attachedData.recordDays}日</div>
                                                <div>• カロリー: {post.attachedData.totalCalories}kcal</div>
                                                <div>• タンパク質: {post.attachedData.protein}g</div>
                                                {post.attachedData.lbmChange && (
                                                    <div className="col-span-2 font-semibold text-fuchsia-700">
                                                        • LBM変化: {post.attachedData.lbmChange > 0 ? '+' : ''}{post.attachedData.lbmChange}kg
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* PG BASE引用 */}
                                    {post.citedModule && (
                                        <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg mb-3">
                                            <p className="text-xs text-teal-800">
                                                📚 引用: <span className="font-semibold">{post.citedModule.title}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* アクション */}
                                    <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                        <button
                                            onClick={() => toggleLike(post.id)}
                                            className={`flex items-center gap-1 transition ${
                                                (post.likedUsers || []).includes(userId)
                                                    ? 'text-fuchsia-600'
                                                    : 'text-gray-600 hover:text-fuchsia-600'
                                            }`}
                                        >
                                            <Icon name="Heart" size={18} fill={(post.likedUsers || []).includes(userId) ? 'currentColor' : 'none'} />
                                            <span className="text-sm">{post.likes || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => handleToggleComments(post.id)}
                                            className="flex items-center gap-1 text-gray-600 hover:text-teal-600 transition"
                                        >
                                            <Icon name="MessageCircle" size={18} />
                                            <span className="text-sm">{post.comments?.length || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => handleShare(post)}
                                            className="flex items-center gap-1 text-gray-600 hover:text-emerald-600 transition"
                                        >
                                            <Icon name="Share2" size={18} />
                                        </button>
                                    </div>

                                    {/* コメントセクション */}
                                    {commentingPostId === post.id && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            {/* コメント一覧 */}
                                            {post.comments && post.comments.length > 0 && (
                                                <div className="mb-3 space-y-2 max-h-60 overflow-y-auto">
                                                    {post.comments.map(comment => (
                                                        <div key={comment.id} className="bg-gray-50 rounded-lg p-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                                    {comment.author?.[0] || 'U'}
                                                                </div>
                                                                <span className="text-xs font-semibold text-gray-800">{comment.author}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(comment.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 ml-8">{comment.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* コメント入力 */}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={commentingPostId === post.id ? commentText : ''}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                                    placeholder="コメントを入力..."
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={() => handleAddComment(post.id)}
                                                    disabled={!commentText.trim()}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                                                >
                                                    送信
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeView === 'community' && (
                    <div className="max-w-2xl mx-auto p-4 space-y-4">
                        {/* テーマスペース選択 */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Icon name="Compass" size={20} className="text-fuchsia-600" />
                                テーマスペース
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                あなたの目標に合ったスペースに参加しましょう
                            </p>
                            <button
                                onClick={() => setShowThemeSpaceSelector(true)}
                                className="w-full bg-gradient-to-r from-fuchsia-600 to-teal-600 text-white font-bold py-3 rounded-lg hover:from-fuchsia-700 hover:to-teal-700 transition"
                            >
                                スペースを選択
                            </button>
                        </div>

                        {/* メンターシステム */}
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Icon name="Award" size={20} className="text-emerald-600" />
                                メンター制度
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                経験豊富なユーザーから学び、サポートを受けましょう
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setShowMentorApplication(true)}
                                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition"
                                >
                                    メンターに応募
                                </button>
                                <p className="text-xs text-gray-500 text-center">
                                    ※ 30日以上の利用、10回以上の貢献が必要です
                                </p>
                            </div>
                        </div>

                        {/* ベストアンサー機能の説明 */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 shadow-sm border border-amber-200">
                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <Icon name="Star" size={20} className="text-amber-600" />
                                ベストアンサー制度
                            </h3>
                            <p className="text-sm text-gray-700 mb-3">
                                質問に対して最も役立つ回答をベストアンサーとして選べます
                            </p>
                            <div className="bg-white rounded-lg p-3 text-sm text-gray-600">
                                <ul className="space-y-1">
                                    <li>✓ ベストアンサーに選ばれると50ポイント獲得</li>
                                    <li>✓ ポイントでメンター資格が取得可能</li>
                                    <li>✓ 質問者は7日以内に選択可能</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'mypage' && (
                    <div className="max-w-2xl mx-auto p-4">
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                                    {userProfile.name?.[0] || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">{userProfile.name || 'ユーザー'}</h3>
                                    <p className="text-gray-600 text-sm">
                                        {userProfile.goal || '目標設定なし'} | {userProfile.style || '一般'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-800">
                                        {posts.filter(p => p.userId === userId).length}
                                    </p>
                                    <p className="text-xs text-gray-600">投稿</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-800">0</p>
                                    <p className="text-xs text-gray-600">フォロー</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-800">0</p>
                                    <p className="text-xs text-gray-600">フォロワー</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-700">あなたの投稿</h4>
                            {posts.filter(p => p.userId === userId).length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-lg">
                                    <p className="text-gray-500">まだ投稿がありません</p>
                                </div>
                            ) : (
                                posts.filter(p => p.userId === userId).map(post => (
                                    <div key={post.id} className="bg-white rounded-lg shadow-sm p-4">
                                        <p className="text-gray-700 mb-2">{post.content}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(post.timestamp).toLocaleString('ja-JP')}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* FABボタン */}
            <div className="fixed bottom-6 right-6 z-50">
                {fabOpen && (
                    <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2">
                        {activeView !== 'feed' && (
                            <div className="flex items-center gap-3 justify-end">
                                <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-lg shadow-lg whitespace-nowrap">
                                    フィード
                                </span>
                                <div
                                    onClick={() => {
                                        setActiveView('feed');
                                        setFabOpen(false);
                                    }}
                                    className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:shadow-xl transition"
                                >
                                    <Icon name="Home" size={20} />
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3 justify-end">
                            <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-lg shadow-lg whitespace-nowrap">
                                投稿
                            </span>
                            <div
                                onClick={() => {
                                    setActiveView('post');
                                    setFabOpen(false);
                                }}
                                className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:shadow-xl transition"
                            >
                                <Icon name="PenSquare" size={20} />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                            <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-lg shadow-lg whitespace-nowrap">
                                マイページ
                            </span>
                            <div
                                onClick={() => {
                                    setActiveView('mypage');
                                    setFabOpen(false);
                                }}
                                className="w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:shadow-xl transition"
                            >
                                <Icon name="User" size={20} />
                            </div>
                        </div>
                    </div>
                )}
                <div
                    onClick={() => setFabOpen(!fabOpen)}
                    className="w-14 h-14 bg-gradient-to-br from-fuchsia-600 to-teal-600 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:shadow-xl transition transform hover:scale-110"
                >
                    <Icon name={fabOpen ? "X" : "Plus"} size={24} />
                </div>
            </div>

            {/* テーマスペース選択モーダル */}
            {showThemeSpaceSelector && (
                <ThemeSpaceSelector
                    userId={userId}
                    onClose={() => setShowThemeSpaceSelector(false)}
                />
            )}

            {/* メンター応募モーダル */}
            {showMentorApplication && (
                <MentorApplicationForm
                    userId={userId}
                    userProfile={userProfile}
                    userStats={{
                        usageDays: usageDays || 0,
                        helpfulAnswers: 0,
                        averageScore: 0
                    }}
                    onClose={() => setShowMentorApplication(false)}
                />
            )}
        </div>
    );
};
