import React from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
// ===== Community Components =====
const PGBaseView = ({ onClose, userId, userProfile }) => {
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('modules'); // 'modules' | 'ai' | 'history'
    const [aiChatHistory, setAiChatHistory] = useState([]);
    const [aiInputMessage, setAiInputMessage] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const aiChatContainerRef = useRef(null);
    const [babHeight, setBabHeight] = useState(64); // BAB高さ（デフォルト: 格納時）
    const aiInputContainerRef = useRef(null);

    // 確認モーダル（グローバル確認関数を使用）
    const showConfirm = (title, message, callback) => {
        return window.showGlobalConfirm(title, message, callback);
    };

    // 履歴タブ用のstate
    const [savedChats, setSavedChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatsLoaded, setChatsLoaded] = useState(false);
    const [chatsLoading, setChatsLoading] = useState(false);

    // チャット保存用のstate
    const [showSaveChatModal, setShowSaveChatModal] = useState(false);
    const [chatTitle, setChatTitle] = useState('');

    // チャット編集・削除用のstate
    const [isEditingChatTitle, setIsEditingChatTitle] = useState(false);
    const [editingChatId, setEditingChatId] = useState(null);
    const [editedChatTitle, setEditedChatTitle] = useState('');

    // 有料教科書購入用のstate
    const [purchasedModules, setPurchasedModules] = useState([]);
    const [paidCredits, setPaidCredits] = useState(0);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [purchaseTargetModule, setPurchaseTargetModule] = useState(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Textbookモジュール一覧
    const textbookModules = [
        {
            id: 'yourcoach_guide',
            title: 'YourCoach+の教科書',
            category: '公式ガイド',
            path: '/module/yourcoach_guide_textbook.html',
            description: '記録→分析→学習→共有の4ステップで、あなただけの最適解を見つける',
            icon: 'BookOpen',
            isFree: true,
            price: 0
        },
        {
            id: 'mental_textbook',
            title: 'メンタルの教科書',
            category: '心理学',
            path: '/module/mental_textbook_new.html',
            description: 'モチベーション、習慣形成、ストレス管理などメンタル面の科学的アプローチ',
            icon: 'Brain',
            isFree: false,
            price: 50
        },
        {
            id: 'protein_textbook',
            title: 'タンパク質の教科書',
            category: '栄養学',
            path: '/module/Nutrition/macro/protein_textbook_new.html',
            description: 'タンパク質の役割、アミノ酸スコア、摂取タイミング、プロテインの選び方',
            icon: 'Apple',
            isFree: true,
            price: 0
        },
        {
            id: 'carb_textbook',
            title: '炭水化物の教科書',
            category: '栄養学',
            path: '/module/Nutrition/macro/carb_textbook_new.html',
            description: '炭水化物の種類、GI値、タイミング、糖質制限の科学',
            icon: 'Apple',
            isFree: true,
            price: 0
        },
        {
            id: 'fat_textbook',
            title: '脂質の教科書',
            category: '栄養学',
            path: '/module/Nutrition/macro/fat_textbook_new.html',
            description: '脂質の種類、オメガ3/6/9、トランス脂肪酸、ケトジェニックダイエット',
            icon: 'Apple',
            isFree: true,
            price: 0
        },
        {
            id: 'basic_supplements_textbook',
            title: '基礎サプリメントの教科書',
            category: '栄養学',
            path: '/module/basic_supplements_textbook_new.html',
            description: 'クレアチン、アミノ酸、ベータアラニン、HMBなど基礎サプリメントの科学',
            icon: 'Apple',
            isFree: false,
            price: 50
        },
        {
            id: 'vitamin_mineral_textbook',
            title: 'ビタミン・ミネラルの教科書',
            category: '栄養学',
            path: '/module/Nutrition/micro/vitamin_mineral_textbook_new.html',
            description: '微量栄養素の役割、欠乏症、過剰症、サプリメント摂取の考え方',
            icon: 'Apple',
            isFree: false,
            price: 50
        },
        {
            id: 'sleep_textbook',
            title: '睡眠の教科書',
            category: 'リカバリー',
            path: '/module/sleep_textbook.html',
            description: 'パフォーマンスを最大化する睡眠の科学と実践テクニック',
            icon: 'Moon',
            isFree: false,
            price: 50
        }
    ];

    // チャット履歴の読み込み
    useEffect(() => {
        loadAIChatHistory();
    }, []);

    // 購入済みモジュールと有料クレジットの読み込み
    useEffect(() => {
        const loadPurchaseData = async () => {
            try {
                const purchased = await TextbookPurchaseService.getPurchasedModules(userId);
                setPurchasedModules(purchased);
                const credits = await TextbookPurchaseService.getPaidCredits(userId);
                setPaidCredits(credits);
            } catch (error) {
                console.error('購入データの読み込みエラー:', error);
            }
        };
        loadPurchaseData();
    }, [userId]);

    const loadAIChatHistory = async () => {
        const history = await DataService.getPGBaseChatHistory();
        setAiChatHistory(history);
    };

    // チャット保存処理
    const handleSaveChat = async () => {
        if (!chatTitle.trim()) {
            toast('チャットタイトルを入力してください');
            return;
        }
        if (!aiChatHistory || aiChatHistory.length === 0) {
            toast('保存するチャットがありません');
            return;
        }

        try {
            const chat = {
                title: chatTitle.trim(),
                conversationHistory: aiChatHistory,
                createdAt: new Date()
            };

            await DataService.savePGBaseChat(userId, chat);

            toast.success('チャットを保存しました');
            setShowSaveChatModal(false);
            setChatTitle('');

            // チャット一覧を再読み込み
            setChatsLoading(true);
            await loadSavedChats();
            setChatsLoaded(true);
            setChatsLoading(false);

            // 履歴タブに自動切り替え
            setViewMode('history');
        } catch (error) {
            console.error('チャット保存エラー:', error);
            toast.error('チャットの保存に失敗しました');
        }
    };

    // チャット削除ハンドラー
    const handleDeleteChat = async (chatId) => {
        try {
            await showConfirm('チャット削除の確認', 'このチャットを削除しますか？', async () => {
                try {
                    await DataService.deletePGBaseChat(userId, chatId);
                    toast.success('チャットを削除しました');
                    setChatsLoading(true);
                    await loadSavedChats();
                    setChatsLoaded(true);
                    setChatsLoading(false);
                    if (selectedChat?.id === chatId) {
                        setSelectedChat(null);
                    }
                } catch (error) {
                    console.error('チャット削除エラー:', error);
                    toast.error('チャットの削除に失敗しました');
                }
            });
        } catch (error) {
            console.error('[handleDeleteChat] showConfirmでエラー:', error);
        }
    };

    const handleUpdateChatTitle = async () => {
        if (!editedChatTitle.trim()) {
            toast('タイトルを入力してください');
            return;
        }

        try {
            await DataService.updatePGBaseChat(userId, editingChatId, {
                title: editedChatTitle.trim()
            });

            setIsEditingChatTitle(false);
            setEditingChatId(null);
            setEditedChatTitle('');
            setChatsLoading(true);
            await loadSavedChats();
            setChatsLoaded(true);
            setChatsLoading(false);
            toast.success('タイトルを更新しました');
        } catch (error) {
            console.error('チャットタイトル更新エラー:', error);
            toast.error('タイトルの更新に失敗しました');
        }
    };

    // 履歴タブの遅延読み込み
    useEffect(() => {
        if (viewMode === 'history' && !chatsLoaded) {
            setChatsLoading(true);
            loadSavedChats().finally(() => {
                setChatsLoading(false);
                setChatsLoaded(true);
            });
        }
    }, [viewMode]);

    const loadSavedChats = async () => {
        try {
            const chats = await DataService.getPGBaseChats(userId);
            setSavedChats(chats);
        } catch (error) {
            console.error('チャット履歴の読み込みエラー:', error);
            toast.error('チャット履歴の読み込みに失敗しました');
        }
    };

    // チャットコンテナの自動スクロール
    useEffect(() => {
        if (aiChatContainerRef.current) {
            aiChatContainerRef.current.scrollTop = aiChatContainerRef.current.scrollHeight;
        }
    }, [aiChatHistory]);

    // BAB高さ監視（常に監視）
    useEffect(() => {
        const updateBabHeight = () => {
            // BABを取得（z-indexが10000の固定要素）
            const babElement = document.querySelector('.fixed.bottom-0.z-\\[10000\\]');
            if (babElement) {
                const height = babElement.offsetHeight;
                setBabHeight(height);
                console.log('[PGBASE] BAB高さ更新:', height);
            }
        };

        // 初回計測
        updateBabHeight();

        // ResizeObserverでBABの高さ変化を監視
        const babElement = document.querySelector('.fixed.bottom-0.z-\\[10000\\]');
        if (babElement) {
            const resizeObserver = new ResizeObserver(updateBabHeight);
            resizeObserver.observe(babElement);

            return () => {
                resizeObserver.disconnect();
            };
        }

        // BAB要素が見つからない場合のフォールバック
        const intervalId = setInterval(updateBabHeight, 500);
        return () => clearInterval(intervalId);
    }, []);

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

        // 休養日を除外してトレーニング日をカウント
        // ルーティン未設定の場合も休養日扱い
        const workoutDays = historicalData.filter(d => {
            const hasWorkouts = (d.record.workouts || []).length > 0;
            const hasRoutine = d.record.routine && Object.keys(d.record.routine).length > 0;
            const isRestDay = d.record.routine?.is_rest_day === true;

            // ルーティン未設定 or 休養日フラグ = 休養日扱い
            const isActualRestDay = !hasRoutine || isRestDay;
            const includeDay = hasWorkouts && !isActualRestDay;

            // デバッグログ
            if (hasWorkouts) {
                console.log(`[PGBASE] ${d.date}: workouts=${hasWorkouts}, hasRoutine=${hasRoutine}, isRestDay=${isRestDay}, isActualRestDay=${isActualRestDay}, include=${includeDay}, routine=`, d.record.routine);
            }

            return includeDay;
        }).length;
        const workoutFrequency = historicalData.length > 0 ? ((workoutDays / historicalData.length) * 7).toFixed(1) : '0.0';

        console.log(`[PGBASE] トレーニング頻度計算: workoutDays=${workoutDays}, totalDays=${historicalData.length}, frequency=週${workoutFrequency}回`);

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
2. 「タンパク質の教科書」: タンパク質の役割、アミノ酸スコア、DIAAS、摂取タイミング
3. 「炭水化物の教科書」: 炭水化物の種類、GI値、タイミング、糖質制限の科学
4. 「脂質の教科書」: 脂質の種類、オメガ3/6/9、トランス脂肪酸、ケトジェニック
5. 「ビタミン・ミネラルの教科書」: 微量栄養素の役割、欠乏症、過剰症、サプリメント
6. 「基礎サプリメントの教科書」: クレアチン、アミノ酸、ベータアラニン、HMB

## データ解釈の重要ルール
- **トレーニング頻度**: 休養日（is_rest_day=true）は除外して計算されています。提供された頻度は実際にトレーニングした日のみです。
- **LBM比**: すべての栄養素評価はLBM（除脂肪体重）を基準にします。
- **記録継続**: ユーザーの努力の証として、記録継続日数を必ず評価します。

## 思考の原則
1. **ボトルネックの特定**: 提供されたデータから、ユーザーの目標達成を最も妨げている要因（ボトルネック）を一つ見つけ出します。
2. **解決策の提示**: そのボトルネックを解消するために最も効果的なモジュールを1〜2個、自信を持って推奨します。
3. **未来の提示**: モジュールで学ぶことによって、ユーザーの課題がどう解決され、理想の姿に近づけるかを具体的に示します。

【回答形式】※簡潔かつ、温かみのある言葉で
### ✅ 素晴らしい点と、さらに良くなる点
[ユーザーの努力を具体的に褒め（例：「${context.split('記録継続日数:')[1]?.split('日')[0] || 'N'}日間の記録継続、素晴らしいです！」）、データに基づいた改善点を1つ指摘]

### 💡 今、学ぶべきこと
[推奨モジュール名を「」で提示。「なぜなら〜」の形で、理由をデータと目標に結びつけて説明]

### 💪 期待できる未来
[この学びを通じて、ユーザーがどう変化できるかを具体的に描写。数値目標や期間を含めるとより良い]

### 🚀 次のステップ
[「まずは『〇〇の教科書』を読んでみませんか？」のように、具体的な次のアクションを問いかける形で締めくくる]

**重要原則**:
- LBM至上主義: すべての評価はLBMを基準に
- ユーザー主権: 押し付けではなく提案として
- 必ずモジュール名を「」で囲んで明記
- データは正確に解釈する（休養日除外済み、LBM比計算済み）
`;

        const fullMessage = systemPrompt + '\n\n【ユーザーの質問】\n' + userMessage;

        try {
            // PG BASE：学習推奨機能、gemini-2.5-proを使用
            const response = await GeminiAPI.sendMessage(fullMessage, aiChatHistory, userProfile, 'gemini-2.5-pro');

            if (response.success) {
                const updatedHistory = [...newHistory, {
                    role: 'model',
                    content: response.text,
                    timestamp: new Date().toISOString()
                }];
                setAiChatHistory(updatedHistory);
                await DataService.savePGBaseChatHistory(updatedHistory);
            } else {
                const errorHistory = [...newHistory, {
                    role: 'model',
                    content: 'エラーが発生しました: ' + response.error,
                    timestamp: new Date().toISOString()
                }];
                setAiChatHistory(errorHistory);
            }
        } catch (error) {
            console.error('AI送信エラー:', error);
            const errorHistory = [...newHistory, {
                role: 'model',
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

            {/* タブ切り替え（モジュール/AIモード/履歴） */}
            <div className="bg-white border-b border-gray-200 px-4 pt-3">
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setViewMode('modules')}
                        className={`px-5 py-2 rounded-t-lg font-medium text-sm transition ${
                            viewMode === 'modules'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <Icon name="Sparkles" size={16} className="inline mr-1" />
                        AIモード
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-5 py-2 rounded-t-lg font-medium text-sm transition ${
                            viewMode === 'history'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        <Icon name="Clock" size={16} className="inline mr-1" />
                        履歴
                    </button>
                </div>
            </div>

            {/* カテゴリフィルター（モジュール表示時のみ） */}
            {viewMode === 'modules' && (
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { value: 'all', label: 'すべて', icon: 'LayoutGrid', color: 'cyan' },
                            { value: '公式ガイド', label: '公式ガイド', icon: 'BookOpen', color: 'sky' },
                            { value: '心理学', label: '心理学', icon: 'Brain', color: 'pink' },
                            { value: '栄養学', label: '栄養学', icon: 'Apple', color: 'green' },
                            { value: '運動科学', label: '運動科学', icon: 'Zap', color: 'orange' },
                            { value: 'リカバリー', label: 'リカバリー', icon: 'Moon', color: 'indigo' }
                        ].map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition ${
                                    selectedCategory === cat.value
                                        ? cat.color === 'sky' ? 'bg-[#4A9EFF] text-white' :
                                          cat.color === 'pink' ? 'bg-sky-600 text-white' :
                                          cat.color === 'green' ? 'bg-green-600 text-white' :
                                          cat.color === 'orange' ? 'bg-orange-600 text-white' :
                                          cat.color === 'indigo' ? 'bg-indigo-600 text-white' :
                                          'bg-cyan-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                        <p className="text-gray-600">該当するモジュールが見つかりませんでした</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredModules.map(module => {
                            const isPurchased = module.isFree || purchasedModules.includes(module.id);
                            const handleModuleClick = () => {
                                if (module.isFree || isPurchased) {
                                    setSelectedModule(module);
                                } else {
                                    setPurchaseTargetModule(module);
                                    setShowPurchaseModal(true);
                                }
                            };
                            return (
                            <button
                                key={module.id}
                                onClick={handleModuleClick}
                                className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition text-left border-2 ${
                                    !module.isFree && !isPurchased ? 'border-amber-200 hover:border-amber-400' : 'border-transparent hover:border-cyan-300'
                                }`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        module.category === '公式ガイド' ? 'bg-[#4A9EFF]' :
                                        module.category === '心理学' ? 'bg-gradient-to-br from-pink-500 to-rose-500' :
                                        module.category === '運動科学' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                                        module.category === 'リカバリー' ? 'bg-gradient-to-br from-indigo-500 to-purple-500' :
                                        'bg-gradient-to-br from-green-500 to-emerald-500'
                                    }`}>
                                        <Icon name={module.icon} size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800">{module.title}</h3>
                                            {!module.isFree && (
                                                isPurchased ? (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">購入済</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium flex items-center gap-1">
                                                        <Icon name="Star" size={10} />
                                                        {module.price}Cr
                                                    </span>
                                                )
                                            )}
                                        </div>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                            module.category === '公式ガイド' ? 'bg-sky-100 text-[#4A9EFF]' :
                                            module.category === '心理学' ? 'bg-sky-100 text-sky-700' :
                                            module.category === '運動科学' ? 'bg-orange-100 text-orange-700' :
                                            module.category === 'リカバリー' ? 'bg-indigo-100 text-indigo-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {module.category}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">{module.description}</p>
                                <div className={`mt-3 flex items-center text-sm font-medium ${
                                    !module.isFree && !isPurchased ? 'text-amber-600' : 'text-cyan-600'
                                }`}>
                                    <span>{!module.isFree && !isPurchased ? '購入して読む' : '教科書を開く'}</span>
                                    <Icon name={!module.isFree && !isPurchased ? 'Lock' : 'ChevronRight'} size={16} className="ml-1" />
                                </div>
                            </button>
                        )})}
                    </div>
                )}
                </div>
            )}

            {/* AIモード */}
            {viewMode === 'ai' && (
                <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                    {/* チャット履歴 */}
                    <div
                        ref={aiChatContainerRef}
                        className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4"
                        style={{paddingBottom: `${babHeight + 80}px`}}
                    >
                        {aiChatHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="MessageCircle" size={48} className="mx-auto mb-4 text-cyan-300" />
                                <p className="text-gray-600 font-medium mb-2">PG BASE AIモード</p>
                                <p className="text-sm text-gray-600 px-8">
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
                    </div>

                    {/* 入力欄（BABの上に固定配置） */}
                    <div
                        ref={aiInputContainerRef}
                        className="fixed left-0 right-0 border-t border-gray-200 bg-white p-4 shadow-lg z-[9990]"
                        style={{bottom: `${babHeight}px`}}
                    >
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
                                className="bg-cyan-600 text-white p-2 rounded-lg hover:bg-cyan-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                <Icon name="Send" size={20} />
                            </button>
                            {/* 保存ボタン */}
                            <button
                                onClick={() => {
                                    if (aiChatHistory.length === 0) {
                                        toast('保存するチャットがありません');
                                        return;
                                    }
                                    setChatTitle('PGBASEチャット');
                                    setShowSaveChatModal(true);
                                }}
                                className="bg-cyan-600 text-white p-2 rounded-lg hover:bg-cyan-700 shadow-md transition flex-shrink-0"
                                title="チャットを保存"
                            >
                                <Icon name="Save" size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 履歴タブ */}
            {viewMode === 'history' && (
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {chatsLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
                            <p className="text-gray-600 text-center">
                                チャット履歴を読み込んでいます...
                            </p>
                        </div>
                    ) : savedChats.length === 0 ? (
                        <div className="text-center py-12">
                            <Icon name="Clock" size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-600 font-medium mb-2">保存されたチャットはありません</p>
                            <p className="text-sm text-gray-600">
                                AIモードでチャットを保存すると<br />ここに表示されます
                            </p>
                        </div>
                    ) : selectedChat ? (
                        /* チャット詳細表示 */
                        <>
                            {/* 戻るボタン */}
                            <button
                                onClick={() => setSelectedChat(null)}
                                className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-3"
                            >
                                <Icon name="ChevronLeft" size={20} />
                                <span className="text-sm font-medium">チャット一覧に戻る</span>
                            </button>

                            {/* チャットタイトル */}
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="MessageCircle" size={20} className="text-cyan-600" />
                                    <h2 className="text-lg font-bold text-gray-800">{selectedChat.title}</h2>
                                </div>
                                <p className="text-xs text-gray-600">
                                    {(() => {
                                        const date = selectedChat.createdAt?.toDate ?
                                            selectedChat.createdAt.toDate() :
                                            new Date(selectedChat.createdAt);
                                        return date.toLocaleString('ja-JP', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                    })()}
                                </p>
                            </div>

                            {/* チャット内容 */}
                            <div className="space-y-4">
                                {(selectedChat.conversationHistory || []).map((msg, idx) => (
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
                                ))}
                            </div>
                        </>
                    ) : (
                        /* チャット一覧表示 */
                        <div className="space-y-3">
                            {savedChats.map((chat) => (
                                <div
                                    key={chat.id}
                                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            {isEditingChatTitle && editingChatId === chat.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editedChatTitle}
                                                        onChange={(e) => setEditedChatTitle(e.target.value)}
                                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                        placeholder="チャットタイトル"
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="MessageCircle" size={16} className="text-cyan-600" />
                                                        <h3 className="font-medium text-gray-800">{chat.title}</h3>
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {(() => {
                                                            const date = chat.createdAt?.toDate ?
                                                                chat.createdAt.toDate() :
                                                                new Date(chat.createdAt);
                                                            return date.toLocaleString('ja-JP', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            });
                                                        })()}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isEditingChatTitle && editingChatId === chat.id ? (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateChatTitle();
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-green-600 hover:bg-green-50 transition border-2 border-green-500"
                                                    >
                                                        <Icon name="Check" size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsEditingChatTitle(false);
                                                            setEditingChatId(null);
                                                            setEditedChatTitle('');
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-100 transition border-2 border-gray-400"
                                                    >
                                                        <Icon name="X" size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            // チャット詳細を読み込み
                                                            try {
                                                                const fullChat = await DataService.getPGBaseChat(userId, chat.id);
                                                                setSelectedChat(fullChat);
                                                            } catch (error) {
                                                                console.error('チャット詳細の読み込みエラー:', error);
                                                                toast.error('チャットの読み込みに失敗しました');
                                                            }
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-green-600 hover:bg-green-50 transition border-2 border-green-500"
                                                        title="チャット詳細を表示"
                                                    >
                                                        <Icon name="Eye" size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // 編集モードに入る（selectedChatは設定しない）
                                                            setIsEditingChatTitle(true);
                                                            setEditingChatId(chat.id);
                                                            setEditedChatTitle(chat.title);
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-cyan-600 hover:bg-cyan-50 transition border-2 border-cyan-500"
                                                        title="タイトルを編集"
                                                    >
                                                        <Icon name="Edit" size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteChat(chat.id);
                                                        }}
                                                        className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                        title="チャットを削除"
                                                    >
                                                        <Icon name="Trash2" size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* チャット保存モーダル */}
            {showSaveChatModal ? ReactDOM.createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999999,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)'
                    }}
                    onClick={() => {
                        setShowSaveChatModal(false);
                        setChatTitle('');
                    }}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-md p-6 shadow-2xl"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <h2 className="text-xl font-bold mb-4 text-gray-800">チャットを保存</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                                チャットタイトル
                            </label>
                            <input
                                type="text"
                                value={chatTitle}
                                onChange={(e) => setChatTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="例: 2025-01-15 タンパク質相談"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSaveChatModal(false);
                                    setChatTitle('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveChat();
                                }}
                                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            ) : null}

            {/* 教科書購入確認モーダル */}
            {showPurchaseModal && purchaseTargetModule ? ReactDOM.createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999999,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)'
                    }}
                    onClick={() => {
                        if (!isPurchasing) {
                            setShowPurchaseModal(false);
                            setPurchaseTargetModule(null);
                        }
                    }}
                >
                    <div
                        className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-md p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                <Icon name={purchaseTargetModule.icon} size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{purchaseTargetModule.title}</h2>
                                <p className="text-sm text-gray-500">{purchaseTargetModule.category}</p>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-4">{purchaseTargetModule.description}</p>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-700 font-medium">購入価格</span>
                                <span className="text-amber-700 font-bold text-lg">{purchaseTargetModule.price} 有料クレジット</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">有料クレジット残高</span>
                                <span className={`font-bold text-lg ${paidCredits >= purchaseTargetModule.price ? 'text-green-600' : 'text-red-600'}`}>
                                    {paidCredits} Cr
                                </span>
                            </div>
                            {paidCredits < purchaseTargetModule.price && (
                                <p className="text-red-600 text-sm mt-2">
                                    ※ 有料クレジットが不足しています。設定画面からクレジットを購入してください。
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                                ※ 無料クレジットでは有料教科書を購入できません
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowPurchaseModal(false);
                                    setPurchaseTargetModule(null);
                                }}
                                disabled={isPurchasing}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={async () => {
                                    if (paidCredits < purchaseTargetModule.price) {
                                        toast.error('有料クレジットが不足しています');
                                        return;
                                    }
                                    setIsPurchasing(true);
                                    try {
                                        const result = await TextbookPurchaseService.purchaseModule(
                                            userId,
                                            purchaseTargetModule.id,
                                            purchaseTargetModule.price
                                        );
                                        if (result.success) {
                                            toast.success('購入完了！教科書を開きます');
                                            setPurchasedModules(result.purchasedModules);
                                            setPaidCredits(result.remainingPaidCredits);
                                            setShowPurchaseModal(false);
                                            setSelectedModule(purchaseTargetModule);
                                            setPurchaseTargetModule(null);
                                        } else {
                                            toast.error(result.error || '購入に失敗しました');
                                        }
                                    } catch (error) {
                                        console.error('購入エラー:', error);
                                        toast.error('購入に失敗しました');
                                    } finally {
                                        setIsPurchasing(false);
                                    }
                                }}
                                disabled={isPurchasing || paidCredits < purchaseTargetModule.price}
                                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isPurchasing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        処理中...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="Star" size={16} />
                                        購入する
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            ) : null}
        </div>
    );
};


// ===== コミュニティ投稿ビュー =====
const CommunityPostView = ({ onClose, onSubmitPost, userProfile, usageDays, historyData }) => {
    const [postMode, setPostMode] = useState('select'); // 'select', 'new_project', 'add_progress'
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

    // プロジェクト関連のstate
    const [projectTitle, setProjectTitle] = useState('');
    const [projectGoal, setProjectGoal] = useState('');
    const [progressPhoto, setProgressPhoto] = useState(null);
    const [progressCaption, setProgressCaption] = useState('');
    const [progressType, setProgressType] = useState('progress'); // 'progress' or 'after'
    const [selectedProject, setSelectedProject] = useState(null);
    const [userProjects, setUserProjects] = useState([]);
    const [bodyWeight, setBodyWeight] = useState('');
    const [bodyFat, setBodyFat] = useState('');
    const photoInputRef = useRef(null);

    // 当日のデイリー記録を取得
    const [todayRecord, setTodayRecord] = useState(null);
    const [autoFetchedData, setAutoFetchedData] = useState(null);

    useEffect(() => {
        const loadTodayRecord = async () => {
            try {
                const todayDate = new Date().toISOString().split('T')[0];
                const record = await DataService.getDailyRecord(userProfile.uid, todayDate);
                setTodayRecord(record);

                // 自動取得データを計算
                if (record) {
                    const bodyComposition = record.bodyComposition || {};
                    const meals = record.meals || [];
                    const workouts = record.workouts || [];
                    const conditions = record.conditions || {};

                    // 食事データ集計
                    const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
                    const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);
                    const totalFat = meals.reduce((sum, m) => sum + (m.fat || 0), 0);
                    const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs || 0), 0);

                    // 運動データ集計
                    const totalWorkoutTime = workouts.reduce((sum, w) => {
                        const workoutTime = w.exercises?.reduce((setSum, ex) => {
                            return setSum + (ex.sets?.reduce((s, set) => s + (set.duration || 0), 0) || 0);
                        }, 0) || 0;
                        return sum + workoutTime;
                    }, 0);

                    // コンディションスコア計算（6項目の平均）
                    const conditionValues = [
                        conditions.sleepQuality,
                        conditions.appetite,
                        conditions.digestion,
                        conditions.focus,
                        conditions.stress
                    ].filter(v => v !== undefined && v !== null);
                    const conditionScore = conditionValues.length > 0
                        ? (conditionValues.reduce((sum, v) => sum + v, 0) / conditionValues.length).toFixed(1)
                        : null;

                    // 履歴データから過去30日間の平均を計算
                    let historyAverage = null;
                    let latestLbm = null;
                    if (historyData) {
                        // 日付順にソートして過去30日分を取得
                        const allDates = Object.keys(historyData).sort().reverse();
                        const last30Days = allDates.slice(0, 30);

                        // LBMは直近の記録された値を使用
                        for (const date of allDates) {
                            const d = historyData[date];
                            if (d.bodyComposition?.leanBodyMass) {
                                latestLbm = d.bodyComposition.leanBodyMass;
                                break;
                            }
                        }

                        // データがある日のみを対象
                        const datesWithData = last30Days.filter(date => {
                            const d = historyData[date];
                            return (d.meals && d.meals.length > 0) || (d.workouts && d.workouts.length > 0);
                        });

                        if (datesWithData.length > 0) {
                            let avgCalories = 0, avgProtein = 0, avgFat = 0, avgCarbs = 0;
                            let avgWorkoutTime = 0, avgTotalSets = 0;
                            let avgSleepHours = 0, sleepCount = 0;

                            datesWithData.forEach(date => {
                                const d = historyData[date];

                                // 食事データ集計
                                avgCalories += d.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
                                avgProtein += d.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
                                avgFat += d.meals?.reduce((sum, m) => sum + (m.fat || 0), 0) || 0;
                                avgCarbs += d.meals?.reduce((sum, m) => sum + (m.carbs || 0), 0) || 0;

                                // 運動データ集計（時間とセット数）
                                d.workouts?.forEach(w => {
                                    w.exercises?.forEach(ex => {
                                        const sets = ex.sets || [];
                                        avgTotalSets += sets.length;
                                        avgWorkoutTime += sets.reduce((s, set) => s + (set.duration || 0), 0);
                                    });
                                });

                                // 睡眠時間（1-5スケール → 実時間変換: 1=5h, 2=6h, 3=7h, 4=8h, 5=9h）
                                if (d.conditions?.sleepHours) {
                                    const sleepValue = d.conditions.sleepHours;
                                    avgSleepHours += sleepValue + 4; // 1→5h, 2→6h, ...
                                    sleepCount++;
                                }
                            });

                            const count = datesWithData.length;
                            historyAverage = {
                                calories: Math.round(avgCalories / count),
                                protein: Math.round(avgProtein / count),
                                fat: Math.round(avgFat / count),
                                carbs: Math.round(avgCarbs / count),
                                workoutTime: Math.round(avgWorkoutTime / count),
                                totalSets: Math.round(avgTotalSets / count),
                                sleepHours: sleepCount > 0 ? (avgSleepHours / sleepCount).toFixed(1) : null,
                                daysCount: count
                            };
                        }
                    }

                    setAutoFetchedData({
                        body: {
                            weight: bodyComposition.weight || null,
                            bodyFat: bodyComposition.bodyFatPercentage || null,
                            lbm: bodyComposition.leanBodyMass || latestLbm || null
                        },
                        today: {
                            calories: totalCalories,
                            protein: totalProtein,
                            fat: totalFat,
                            carbs: totalCarbs,
                            workoutTime: totalWorkoutTime,
                            conditionScore: conditionScore
                        },
                        history: historyAverage,
                        latestLbm: latestLbm
                    });
                }
            } catch (error) {
                console.error('[CommunityPost] Failed to load today record:', error);
            }
        };

        if (userProfile?.uid) {
            loadTodayRecord();
        }
    }, [userProfile?.uid, historyData]);

    // ユーザーのプロジェクトを読み込み
    useEffect(() => {
        const loadUserProjects = async () => {
            try {
                const snapshot = await db.collection('communityProjects')
                    .where('userId', '==', userProfile.uid)
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .get();

                const projects = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUserProjects(projects);
            } catch (error) {
                console.error('[CommunityPost] Failed to load projects:', error);
            }
        };

        if (userProfile?.uid) {
            loadUserProjects();
        }
    }, [userProfile?.uid]);

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
            // 画像アップロード（Firebase Storageへ）
            let beforePhotoUrl = beforePhoto;
            let afterPhotoUrl = afterPhoto;

            if (postCategory === 'body') {
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
        { id: 'yourcoach_guide', title: 'YourCoach+の教科書', category: '公式ガイド' },
        { id: 'mental_textbook', title: 'メンタルの教科書', category: '心理学' },
        { id: 'protein_textbook', title: 'タンパク質の教科書', category: '栄養学' },
        { id: 'carb_textbook', title: '炭水化物の教科書', category: '栄養学' },
        { id: 'fat_textbook', title: '脂質の教科書', category: '栄養学' },
        { id: 'basic_supplements_textbook', title: '基礎サプリメントの教科書', category: '栄養学' },
        { id: 'vitamin_mineral_textbook', title: 'ビタミン・ミネラルの教科書', category: '栄養学' },
        { id: 'sleep_textbook', title: '睡眠の教科書', category: 'リカバリー' }
    ];

    // 写真選択ハンドラー（カメラ撮影限定）
    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (postMode === 'new_project') {
                    setBeforePhoto(reader.result);
                } else if (postMode === 'add_progress') {
                    setProgressPhoto(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // プロジェクト作成ハンドラー
    const handleCreateProject = async () => {
        if (!beforePhoto) {
            toast('ビフォー写真を撮影してください');
            return;
        }

        if (!projectTitle.trim()) {
            toast('プロジェクトタイトルを入力してください');
            return;
        }

        try {
            setIsSubmitting(true);

            // プロジェクトデータ作成
            const projectData = {
                userId: userProfile.uid,
                userName: userProfile.nickname || userProfile.name || 'ユーザー',
                userAvatar: (userProfile.nickname || userProfile.name || 'U')[0],
                title: projectTitle.trim(),
                goal: projectGoal.trim() || '',
                createdAt: new Date().toISOString(),
                startDate: new Date().toISOString(),
                category: 'body_transformation',
                approvalStatus: 'approved',
                isActive: true,
                progressCount: 1,
                lastUpdatedAt: new Date().toISOString(),
                likes: 0,
                likedBy: [],
                comments: []
            };

            // Firestoreにプロジェクト作成
            const projectRef = await db.collection('communityProjects').add(projectData);
            const projectId = projectRef.id;

            // ビフォー写真をアップロード
            const photoUrl = await DataService.uploadCommunityPhoto(userProfile.uid, beforePhoto, 'before');

            // 進捗（ビフォー）を追加（自動取得したデータを使用）
            const progressData = {
                projectId: projectId,
                progressType: 'before',
                progressNumber: 0,
                photo: photoUrl,
                caption: projectGoal.trim() || '開始します！',
                bodyData: autoFetchedData?.body || {},
                dailyData: autoFetchedData?.today || {},
                historyData: autoFetchedData?.history || {},
                timestamp: new Date().toISOString(),
                daysSinceStart: 0,
                approvalStatus: 'pending'
            };

            await db.collection('communityProjects').doc(projectId).collection('progress').add(progressData);

            toast.success('プロジェクトを作成しました！\n管理者の承認をお待ちください。');
            onClose();
        } catch (error) {
            console.error('[CreateProject] Error:', error);
            toast.error('プロジェクトの作成に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // メンタル投稿ハンドラー
    const [mentalTitle, setMentalTitle] = useState('');
    const [mentalContent, setMentalContent] = useState('');

    const handleSubmitMentalPost = async () => {
        if (!mentalTitle.trim()) {
            toast('タイトルを入力してください');
            return;
        }

        if (!mentalContent.trim()) {
            toast('本文を入力してください');
            return;
        }

        try {
            setIsSubmitting(true);

            const postData = {
                userId: userProfile.uid,
                userName: userProfile.nickname || userProfile.name || 'ユーザー',
                userAvatar: (userProfile.nickname || userProfile.name || 'U')[0],
                category: 'mental',
                title: mentalTitle.trim(),
                body: mentalContent.trim(),
                citedModules: citedModules,
                timestamp: new Date().toISOString(),
                approvalStatus: 'approved', // メンタル投稿は自動承認
                likes: 0,
                likedBy: [],
                comments: []
            };

            // Firestoreに投稿作成
            await db.collection('communityPosts').add(postData);

            toast.success('投稿しました！');
            onClose();
        } catch (error) {
            console.error('[MentalPost] Error:', error);
            toast.error('投稿に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 進捗追加ハンドラー
    const handleAddProgress = async () => {
        if (!selectedProject) {
            toast('プロジェクトを選択してください');
            return;
        }

        if (!progressPhoto) {
            toast('写真を撮影してください');
            return;
        }

        try {
            setIsSubmitting(true);

            const project = userProjects.find(p => p.id === selectedProject);
            const startDate = new Date(project.startDate);
            const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));

            // 写真をアップロード
            const photoUrl = await DataService.uploadCommunityPhoto(userProfile.uid, progressPhoto, 'progress');

            // 進捗データを作成（自動取得したデータを使用）
            const progressData = {
                projectId: selectedProject,
                progressType: progressType,
                progressNumber: project.progressCount,
                photo: photoUrl,
                caption: progressCaption.trim() || '',
                bodyData: autoFetchedData?.body || {},
                dailyData: autoFetchedData?.today || {},
                historyData: autoFetchedData?.history || {},
                timestamp: new Date().toISOString(),
                daysSinceStart: daysSinceStart,
                approvalStatus: 'pending'
            };

            await db.collection('communityProjects').doc(selectedProject).collection('progress').add(progressData);

            // プロジェクトの更新
            await db.collection('communityProjects').doc(selectedProject).update({
                progressCount: project.progressCount + 1,
                lastUpdatedAt: new Date().toISOString()
            });

            toast.success('進捗を追加しました！\n管理者の承認をお待ちください。');
            onClose();
        } catch (error) {
            console.error('[AddProgress] Error:', error);
            toast.error('進捗の追加に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    // モード選択画面
    if (postMode === 'select') {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0">
                    <button onClick={onClose}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">投稿を作成</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    <h2 className="text-lg font-bold mb-4">投稿タイプを選択</h2>

                    <div className="space-y-4">
                        {/* 新規プロジェクト */}
                        <button
                            onClick={() => setPostMode('new_project')}
                            className="w-full p-6 bg-gradient-to-br from-fuchsia-50 to-purple-50 border-2 border-fuchsia-300 rounded-xl hover:border-fuchsia-500 transition"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                                    <Icon name="Plus" size={24} />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-lg text-gray-800 mb-1">新しいプロジェクトを開始</h3>
                                    <p className="text-sm text-gray-600">ビフォー写真から変化の記録を始めましょう</p>
                                </div>
                            </div>
                        </button>

                        {/* 進捗追加 */}
                        {userProjects.length > 0 && (
                            <button
                                onClick={() => setPostMode('add_progress')}
                                className="w-full p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300 rounded-xl hover:border-teal-500 transition"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white">
                                        <Icon name="TrendingUp" size={24} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-lg text-gray-800 mb-1">進捗を追加</h3>
                                        <p className="text-sm text-gray-600">既存のプロジェクトに新しい写真を追加</p>
                                        <p className="text-xs text-teal-700 font-semibold mt-1">{userProjects.length}件のプロジェクト</p>
                                    </div>
                                </div>
                            </button>
                        )}

                        {/* 通常の投稿（メンタル） */}
                        <button
                            onClick={() => setPostMode('mental')}
                            className="w-full p-6 bg-gradient-to-br from-orange-50 to-pink-50 border-2 border-orange-300 rounded-xl hover:border-orange-500 transition"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white">
                                    <Icon name="Brain" size={24} />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-lg text-gray-800 mb-1">メンタル投稿</h3>
                                    <p className="text-sm text-gray-600">気づきや学びをシェア</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {userProjects.length === 0 && (
                        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 flex items-center gap-2">
                                <Icon name="Info" size={16} />
                                まずは新しいプロジェクトを作成して、ビフォー写真から始めましょう！
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // プロジェクト作成画面
    if (postMode === 'new_project') {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0">
                    <button onClick={() => setPostMode('select')}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">新規プロジェクト作成</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 過去30日間の平均データ表示 */}
                    {autoFetchedData?.history && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                <Icon name="TrendingUp" size={18} />
                                過去{autoFetchedData.history.daysCount}日間の平均
                            </h3>

                            {/* 体組成 */}
                            {autoFetchedData.body?.lbm && (
                                <div className="mb-4 p-3 bg-white/60 rounded-lg">
                                    <p className="text-xs font-semibold text-blue-700 mb-2">体組成</p>
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-blue-900">{autoFetchedData.body.lbm}</p>
                                            <p className="text-xs text-gray-600">LBM (kg)</p>
                                        </div>
                                        {autoFetchedData.body.weight && (
                                            <div className="text-center">
                                                <p className="text-lg font-semibold text-gray-700">{autoFetchedData.body.weight}</p>
                                                <p className="text-xs text-gray-600">体重 (kg)</p>
                                            </div>
                                        )}
                                        {autoFetchedData.body.bodyFat && (
                                            <div className="text-center">
                                                <p className="text-lg font-semibold text-gray-700">{autoFetchedData.body.bodyFat}</p>
                                                <p className="text-xs text-gray-600">体脂肪率 (%)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 栄養データ */}
                            <div className="mb-4 p-3 bg-white/60 rounded-lg">
                                <p className="text-xs font-semibold text-orange-700 mb-2">栄養（1日平均）</p>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div>
                                        <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.calories}</p>
                                        <p className="text-xs text-gray-600">kcal</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-red-500">{autoFetchedData.history.protein}</p>
                                        <p className="text-xs text-gray-600">P (g)</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-yellow-600">{autoFetchedData.history.fat}</p>
                                        <p className="text-xs text-gray-600">F (g)</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-green-600">{autoFetchedData.history.carbs}</p>
                                        <p className="text-xs text-gray-600">C (g)</p>
                                    </div>
                                </div>
                            </div>

                            {/* 運動・睡眠データ */}
                            <div className="p-3 bg-white/60 rounded-lg">
                                <p className="text-xs font-semibold text-purple-700 mb-2">運動・睡眠（1日平均）</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-lg font-bold text-purple-600">{autoFetchedData.history.workoutTime}</p>
                                        <p className="text-xs text-gray-600">運動時間 (分)</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-indigo-600">{autoFetchedData.history.totalSets}</p>
                                        <p className="text-xs text-gray-600">セット数</p>
                                    </div>
                                    {autoFetchedData.history.sleepHours && (
                                        <div>
                                            <p className="text-lg font-bold text-blue-600">{autoFetchedData.history.sleepHours}</p>
                                            <p className="text-xs text-gray-600">睡眠 (時間)</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* タイトル */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">
                            プロジェクトタイトル <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="例: 3ヶ月で体脂肪率-5%"
                            maxLength={50}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-600 mt-1">{projectTitle.length}/50文字</p>
                    </div>

                    {/* 詳細 */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">
                            詳細（任意）
                        </label>
                        <textarea
                            value={projectGoal}
                            onChange={(e) => setProjectGoal(e.target.value)}
                            placeholder={"【目標】体脂肪率を15%まで落とす\n【現状】体脂肪率20%、体重70kg\n【方針】週5回の筋トレ、タンパク質120g/日"}
                            maxLength={500}
                            rows={5}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-600 mt-1">{projectGoal.length}/500文字</p>
                    </div>

                    {/* ビフォー写真 */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">
                            ビフォー写真 <span className="text-red-500">*</span>
                        </label>
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3">
                            <p className="text-sm text-yellow-800 flex items-center gap-2">
                                <Icon name="Camera" size={16} />
                                カメラ撮影限定：加工なしの写真のみ投稿できます
                            </p>
                        </div>
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoCapture}
                            className="hidden"
                        />
                        {!beforePhoto ? (
                            <button
                                onClick={() => photoInputRef.current?.click()}
                                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-fuchsia-500 hover:bg-fuchsia-50 transition"
                            >
                                <Icon name="Camera" size={48} className="text-gray-400" />
                                <p className="text-gray-600 font-semibold">カメラで撮影</p>
                            </button>
                        ) : (
                            <div className="relative">
                                <img src={beforePhoto} alt="Before" className="w-full rounded-lg border-2 border-fuchsia-300" />
                                <button
                                    onClick={() => setBeforePhoto(null)}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                                >
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 作成ボタン */}
                    <button
                        onClick={handleCreateProject}
                        disabled={isSubmitting || !beforePhoto || !projectTitle.trim()}
                        className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-lg hover:from-fuchsia-700 hover:to-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    >
                        {isSubmitting ? '作成中...' : 'プロジェクトを作成'}
                    </button>
                </div>
            </div>
        );
    }

    // 進捗追加画面
    if (postMode === 'add_progress') {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0">
                    <button onClick={() => setPostMode('select')}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">進捗を追加</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 自動取得データ表示 */}
                    {autoFetchedData && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                <Icon name="Database" size={18} />
                                自動取得データ
                            </h3>

                            {/* 体組成 */}
                            {autoFetchedData.body && (autoFetchedData.body.weight || autoFetchedData.body.bodyFat) && (
                                <div className="mb-3">
                                    <p className="text-sm font-semibold text-blue-800 mb-1">体組成（本日）</p>
                                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                                        {autoFetchedData.body.weight && <div>体重: {autoFetchedData.body.weight}kg</div>}
                                        {autoFetchedData.body.bodyFat && <div>体脂肪率: {autoFetchedData.body.bodyFat}%</div>}
                                        {autoFetchedData.body.lbm && <div>LBM: {autoFetchedData.body.lbm}kg</div>}
                                    </div>
                                </div>
                            )}

                            {/* 本日のデータ */}
                            {autoFetchedData.today && (
                                <div className="mb-3">
                                    <p className="text-sm font-semibold text-blue-800 mb-1">本日の記録</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div>食事: {autoFetchedData.today.calories}kcal</div>
                                        <div>P: {autoFetchedData.today.protein}g</div>
                                        <div>運動: {autoFetchedData.today.workoutTime}分</div>
                                        {autoFetchedData.today.conditionScore && (
                                            <div>コンディション: {autoFetchedData.today.conditionScore}/5</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 履歴平均 */}
                            {autoFetchedData.history && (
                                <div>
                                    <p className="text-sm font-semibold text-blue-800 mb-1">過去の平均（{autoFetchedData.history.daysCount}日間）</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                        <div>食事: {autoFetchedData.history.calories}kcal</div>
                                        <div>P: {autoFetchedData.history.protein}g</div>
                                        <div>運動: {autoFetchedData.history.workoutTime}分</div>
                                        {autoFetchedData.history.conditionScore && (
                                            <div>コンディション: {autoFetchedData.history.conditionScore}/5</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* プロジェクト選択 */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">
                            プロジェクトを選択 <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                            {userProjects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => setSelectedProject(project.id)}
                                    className={`w-full p-4 border-2 rounded-lg text-left transition ${
                                        selectedProject === project.id
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-gray-200 hover:border-teal-300'
                                    }`}
                                >
                                    <h3 className="font-bold text-gray-800">{project.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        開始日: {new Date(project.startDate).toLocaleDateString('ja-JP')}
                                    </p>
                                    <p className="text-xs text-teal-700 mt-1">進捗: {project.progressCount}回</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 進捗タイプ */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">進捗タイプ</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setProgressType('progress')}
                                className={`p-3 border-2 rounded-lg transition ${
                                    progressType === 'progress'
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200 hover:border-teal-300'
                                }`}
                            >
                                <p className="font-semibold text-gray-800">進捗報告</p>
                                <p className="text-xs text-gray-600 mt-1">途中経過</p>
                            </button>
                            <button
                                onClick={() => setProgressType('after')}
                                className={`p-3 border-2 rounded-lg transition ${
                                    progressType === 'after'
                                        ? 'border-sky-500 bg-sky-50'
                                        : 'border-gray-200 hover:border-sky-300'
                                }`}
                            >
                                <p className="font-semibold text-gray-800">アフター</p>
                                <p className="text-xs text-gray-600 mt-1">最終結果</p>
                            </button>
                        </div>
                    </div>

                    {/* 詳細 */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">詳細（任意）</label>
                        <textarea
                            value={progressCaption}
                            onChange={(e) => setProgressCaption(e.target.value)}
                            placeholder={"【変化】体重-2kg、体脂肪率-1%\n【気づき】トレーニング強度を上げてから変化が加速\n【今後】さらに食事管理を徹底する"}
                            maxLength={500}
                            rows={5}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-600 mt-1">{progressCaption.length}/500文字</p>
                    </div>

                    {/* 写真撮影 */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">
                            写真 <span className="text-red-500">*</span>
                        </label>
                        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3">
                            <p className="text-sm text-yellow-800 flex items-center gap-2">
                                <Icon name="Camera" size={16} />
                                カメラ撮影限定：加工なしの写真のみ投稿できます
                            </p>
                        </div>
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoCapture}
                            className="hidden"
                        />
                        {!progressPhoto ? (
                            <button
                                onClick={() => photoInputRef.current?.click()}
                                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-teal-500 hover:bg-teal-50 transition"
                            >
                                <Icon name="Camera" size={48} className="text-gray-400" />
                                <p className="text-gray-600 font-semibold">カメラで撮影</p>
                            </button>
                        ) : (
                            <div className="relative">
                                <img src={progressPhoto} alt="Progress" className="w-full rounded-lg border-2 border-teal-300" />
                                <button
                                    onClick={() => setProgressPhoto(null)}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                                >
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 追加ボタン */}
                    <button
                        onClick={handleAddProgress}
                        disabled={isSubmitting || !selectedProject || !progressPhoto}
                        className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-lg hover:from-teal-700 hover:to-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    >
                        {isSubmitting ? '追加中...' : '進捗を追加'}
                    </button>
                </div>
            </div>
        );
    }

    // メンタル投稿画面
    if (postMode === 'mental') {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0">
                    <button onClick={() => setPostMode('select')}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">メンタル投稿</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* タイトル */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">
                            タイトル <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={mentalTitle}
                            onChange={(e) => setMentalTitle(e.target.value)}
                            placeholder="例: トレーニング継続のコツを見つけた"
                            maxLength={50}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-600 mt-1">{mentalTitle.length}/50文字</p>
                    </div>

                    {/* 本文 */}
                    <div>
                        <label className="block font-semibold text-gray-800 mb-2">
                            本文 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={mentalContent}
                            onChange={(e) => setMentalContent(e.target.value)}
                            placeholder="気づき、学び、マインドセットなどを自由に書いてください"
                            maxLength={1000}
                            rows={10}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-600 mt-1">{mentalContent.length}/1000文字</p>
                    </div>

                    {/* PG BASE引用（オプション） */}
                    <details className="bg-gray-50 border border-gray-200 rounded-lg group">
                        <summary className="p-4 cursor-pointer font-semibold text-gray-800 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
                            <span>PG BASEから引用（任意）</span>
                            <span className="flex items-center gap-2">
                                {citedModules.length > 0 && (
                                    <span className="text-sm text-orange-600 font-normal">{citedModules.length}件選択中</span>
                                )}
                                <Icon name="ChevronDown" size={20} className="text-gray-500 transition-transform group-open:rotate-180" />
                            </span>
                        </summary>
                        <div className="px-4 pb-4">
                            <p className="text-sm text-gray-600 mb-3">学んだ教科書を選択できます</p>
                            <div className="space-y-2">
                                {pgbaseModules.map(module => (
                                    <button
                                        key={module.id}
                                        onClick={() => {
                                            if (citedModules.includes(module.id)) {
                                                setCitedModules(citedModules.filter(id => id !== module.id));
                                            } else {
                                                setCitedModules([...citedModules, module.id]);
                                            }
                                        }}
                                        className={`w-full p-3 border-2 rounded-lg text-left transition ${
                                            citedModules.includes(module.id)
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-200 hover:border-orange-300'
                                        }`}
                                    >
                                        <p className="font-semibold text-gray-800 text-sm">{module.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">{module.category}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </details>

                    {/* 投稿ボタン */}
                    <button
                        onClick={handleSubmitMentalPost}
                        disabled={isSubmitting || !mentalTitle.trim() || !mentalContent.trim()}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-lg hover:from-orange-600 hover:to-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                    >
                        {isSubmitting ? '投稿中...' : '投稿する'}
                    </button>
                </div>
            </div>
        );
    }

    // 以下は既存のメンタル投稿画面（postMode === 'old_post'）- 削除予定
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
                    <label className="font-medium text-sm text-gray-600 mb-3 block">投稿カテゴリー</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPostCategory('body')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                postCategory === 'body'
                                    ? 'border-sky-600 bg-sky-50'
                                    : 'border-gray-200 bg-white hover:border-sky-300'
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
                            <div className="text-gray-600 mt-2 font-semibold">
                                ✓ アプリ内カメラでビフォー・アフター写真撮影（必須）
                            </div>
                            <div className="text-gray-600 font-semibold">
                                ✓ Your Coach+ データ連携（必須）
                            </div>
                            <div className="text-sky-700 mt-2 font-semibold">
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
                            <label className="font-medium text-sm text-gray-600 mb-2 block">
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
                                    <div className="border-2 border-dashed border-sky-300 rounded-lg p-2 text-center">
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
                                                    <Icon name="Camera" size={32} className="mx-auto text-sky-400 mb-1" />
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
                        <label className="font-medium text-sm text-gray-600 mb-2 block">投稿内容</label>
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
                                <label className="font-medium text-sm text-gray-600 mb-2 block">
                                    引用する記録データを選択<span className="text-red-500">*</span>
                                </label>

                                {/* データタイプ選択 */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setDataSelectionType('single')}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                                            dataSelectionType === 'single'
                                                ? 'bg-sky-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        特定日
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDataSelectionType('average')}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                                            dataSelectionType === 'average'
                                                ? 'bg-sky-600 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                                    <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                                        <p className="text-xs font-semibold text-sky-700 mb-2">{titleText}</p>
                                        <div className="space-y-1 text-xs text-gray-600">
                                            <div>• カロリー: {dataToShow.calories}kcal</div>
                                            <div>• タンパク質: {dataToShow.protein}g</div>
                                            <div>• 脂質: {dataToShow.fat}g</div>
                                            <div>• 炭水化物: {dataToShow.carbs}g</div>
                                            <div>• トレーニング時間: {dataToShow.workoutTime}分 {dataSelectionType === 'average' ? '(休養日除外)' : ''}</div>
                                            {dataToShow.weight && <div>• 体重: {dataToShow.weight}kg</div>}
                                            {dataToShow.lbm && <div>• 除脂肪体重: {dataToShow.lbm}kg</div>}
                                            {lbmChange && (
                                                <div className="font-semibold text-sky-700 mt-2">
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
                        <label className="font-medium text-sm text-gray-600 mb-2 block">
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
                                            <span className="font-semibold text-sm text-gray-600">
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
                            ? 'bg-sky-600 text-white hover:bg-sky-700'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
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
                                            <p className="text-xs text-gray-600">
                                                {new Date(post.timestamp).toLocaleString('ja-JP')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                        post.category === 'body'
                                            ? 'bg-sky-100 text-sky-700'
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
                                            <img src={post.afterPhoto} alt="After" className="w-full rounded-lg border-2 border-sky-300" />
                                        </div>
                                    </div>
                                )}

                                {/* 投稿内容 */}
                                <div className="mb-4">
                                    <p className="text-sm font-semibold text-gray-600 mb-2">投稿内容:</p>
                                    <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                        {post.content}
                                    </p>
                                </div>

                                {/* データ連携情報 */}
                                {post.attachedData && (
                                    <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg mb-4">
                                        <p className="text-xs font-semibold text-sky-700 mb-3 flex items-center gap-1">
                                            <Icon name="Database" size={14} />
                                            データ連携情報
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                                            <div>• 継続: {post.attachedData.usageDays}日</div>
                                            <div>• 記録: {post.attachedData.recordDays}日</div>
                                            <div>• カロリー: {post.attachedData.totalCalories}kcal</div>
                                            <div>• タンパク質: {post.attachedData.protein}g</div>
                                            <div>• 体重: {post.attachedData.weight}kg</div>
                                            <div>• LBM: {post.attachedData.lbm}kg</div>
                                            {post.attachedData.lbmChange && (
                                                <div className="col-span-3 font-semibold text-sky-700">
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
                        <h3 className="text-lg font-bold text-gray-800 mb-4">投稿を承認しますか？</h3>
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
                        <h3 className="text-lg font-bold text-gray-800 mb-4">投稿を却下</h3>
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
    const [activeView, setActiveView] = useState('feed'); // 'admin', 'feed', 'post', 'mypage', 'community'
    const [posts, setPosts] = useState([]);

    // 管理者判定（kongou411@gmail.com のみ）
    const isAdmin = userProfile?.email === 'kongou411@gmail.com';

    // AdminPanel用のstate
    const [pendingPosts, setPendingPosts] = useState([]);
    const [adminLoading, setAdminLoading] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [commentingPostId, setCommentingPostId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [shareModalPostId, setShareModalPostId] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [showThemeSpaceSelector, setShowThemeSpaceSelector] = useState(false);
    const [showMentorApplication, setShowMentorApplication] = useState(false);
    const [babHeight, setBabHeight] = useState(64); // BAB高さ（デフォルト: 格納時）

    // 新機能: コメント・フォロー・プロフィール用state
    const [postComments, setPostComments] = useState({}); // { postId: [comments] }
    const [profileModalUserId, setProfileModalUserId] = useState(null); // プロフィールモーダル表示対象
    const [myFollowerCount, setMyFollowerCount] = useState(0);
    const [myFollowingCount, setMyFollowingCount] = useState(0);

    useEffect(() => {
        loadPosts();
        loadMyFollowCounts();
        // URLパラメータから投稿IDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        if (postId) {
            setSelectedPostId(postId);
            setCommentingPostId(postId);
        }
    }, []);

    // 自分のフォロー数を読み込み
    const loadMyFollowCounts = async () => {
        try {
            const profile = await DataService.getUserPublicProfile(userId);
            if (profile) {
                setMyFollowerCount(profile.followerCount || 0);
                setMyFollowingCount(profile.followingCount || 0);
            }
        } catch (error) {
            console.error('Error loading follow counts:', error);
        }
    };

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

    // BAB高さ監視
    useEffect(() => {
        let isMounted = true;

        const updateBabHeight = () => {
            if (!isMounted) return;

            // BABを取得（z-indexが9999の固定要素）
            const babs = document.querySelectorAll('.fixed.bottom-0.z-\\[9999\\]');
            let babElement = null;

            // BABを特定（border-tとbg-whiteを持つ要素）
            for (let el of babs) {
                if (el.classList.contains('border-t') && el.classList.contains('bg-white')) {
                    babElement = el;
                    break;
                }
            }

            if (babElement && isMounted) {
                const height = babElement.offsetHeight;
                setBabHeight(height + 8); // 余白8px追加
            }
        };

        // 初回計測
        updateBabHeight();

        // ResizeObserverでBAB高さ変化を監視
        let observer = null;
        const babs = document.querySelectorAll('.fixed.bottom-0.z-\\[9999\\]');
        for (let el of babs) {
            if (el.classList.contains('border-t') && el.classList.contains('bg-white')) {
                observer = new ResizeObserver(() => {
                    if (isMounted) updateBabHeight();
                });
                observer.observe(el);
                break;
            }
        }

        // 500ms後にも再計測（DOM構築遅延対策）
        const timer = setTimeout(() => {
            if (isMounted) updateBabHeight();
        }, 500);

        return () => {
            isMounted = false;
            if (observer) observer.disconnect();
            clearTimeout(timer);
        };
    }, []);

    const loadPosts = async () => {
        const allPosts = await DataService.getCommunityPosts();
        setPosts(allPosts);
    };

    const loadPendingPosts = async () => {
        setAdminLoading(true);
        const pending = await DataService.getPendingPosts();
        setPendingPosts(pending);
        setAdminLoading(false);
    };

    // 管理者の場合、承認待ち投稿も読み込む
    useEffect(() => {
        if (isAdmin && activeView === 'admin') {
            loadPendingPosts();
        }
    }, [isAdmin, activeView]);

    // 承認・却下機能
    const handleApprove = async (postId) => {
        const success = await DataService.approvePost(postId);
        if (success) {
            toast.success('投稿を承認しました');
            loadPendingPosts();
            loadPosts(); // フィードも更新
        } else {
            toast.error('承認に失敗しました');
        }
    };

    const handleReject = async (postId, reason) => {
        const success = await DataService.rejectPost(postId, reason);
        if (success) {
            toast.success('投稿を却下しました');
            loadPendingPosts();
        } else {
            toast.error('却下に失敗しました');
        }
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

    // いいねトグル（Firestore atomic操作版）
    const toggleLike = async (postId) => {
        const result = await DataService.togglePostLike(postId, userId);
        if (result.success) {
            // ローカル状態を更新
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    const likedUsers = post.likedUsers || [];
                    if (result.liked) {
                        return {
                            ...post,
                            likes: (post.likes || 0) + 1,
                            likedUsers: [...likedUsers, userId]
                        };
                    } else {
                        return {
                            ...post,
                            likes: Math.max(0, (post.likes || 0) - 1),
                            likedUsers: likedUsers.filter(id => id !== userId)
                        };
                    }
                }
                return post;
            }));
        }
    };

    // コメント追加（サブコレクション版）
    const handleAddComment = async (postId) => {
        if (!commentText.trim()) return;

        const commentData = {
            userId: userId,
            author: userProfile?.nickname || 'ユーザー',
            content: commentText.trim()
        };

        const result = await DataService.addComment(postId, commentData);
        if (result.success) {
            // コメント一覧を再取得
            const comments = await DataService.getPostComments(postId);
            setPostComments(prev => ({ ...prev, [postId]: comments }));

            // 投稿のコメント数を更新
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        commentCount: (post.commentCount || 0) + 1
                    };
                }
                return post;
            }));

            setCommentText('');
            toast.success('コメントを投稿しました');
        } else {
            toast.error('コメントの投稿に失敗しました');
        }
    };

    // コメント表示トグル
    const handleToggleComments = async (postId) => {
        if (commentingPostId === postId) {
            setCommentingPostId(null);
        } else {
            // コメントを取得
            const comments = await DataService.getPostComments(postId);
            setPostComments(prev => ({ ...prev, [postId]: comments }));
            setCommentingPostId(postId);
        }
    };

    // コメント削除
    const handleDeleteComment = async (postId, commentId) => {
        const result = await DataService.deleteComment(postId, commentId);
        if (result.success) {
            // コメント一覧を再取得
            const comments = await DataService.getPostComments(postId);
            setPostComments(prev => ({ ...prev, [postId]: comments }));

            // 投稿のコメント数を更新
            setPosts(posts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        commentCount: Math.max(0, (post.commentCount || 0) - 1)
                    };
                }
                return post;
            }));

            toast.success('コメントを削除しました');
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
                toast.success('投稿リンクをクリップボードにコピーしました！');
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
                    {/* 管理者タブ（kongou411@gmail.com限定） */}
                    {isAdmin && (
                        <button
                            onClick={() => setActiveView('admin')}
                            className={`px-5 py-3 font-medium text-sm transition border-b-2 ${
                                activeView === 'admin'
                                    ? 'border-red-600 text-red-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Icon name="Shield" size={16} className="inline mr-1" />
                            管理者
                        </button>
                    )}
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
                {/* 管理者ビュー */}
                {activeView === 'admin' && isAdmin && (
                    <div className="max-w-4xl mx-auto p-4">
                        {adminLoading ? (
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
                            <div className="space-y-4">
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
                                                    <p className="text-xs text-gray-600">
                                                        {new Date(post.timestamp).toLocaleString('ja-JP')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                                post.category === 'body'
                                                    ? 'bg-sky-100 text-sky-700'
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
                                                    <img src={post.afterPhoto} alt="After" className="w-full rounded-lg border-2 border-sky-300" />
                                                </div>
                                            </div>
                                        )}

                                        {/* 投稿内容 */}
                                        <div className="mb-4">
                                            <p className="text-sm font-semibold text-gray-600 mb-2">投稿内容:</p>
                                            <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                                {post.content}
                                            </p>
                                        </div>

                                        {/* データ連携情報 */}
                                        {post.attachedData && (
                                            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg mb-4">
                                                <p className="text-xs font-semibold text-sky-700 mb-3 flex items-center gap-1">
                                                    <Icon name="Database" size={14} />
                                                    データ連携情報
                                                </p>
                                                <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
                                                    <div>• 継続: {post.attachedData.usageDays}日</div>
                                                    <div>• 記録: {post.attachedData.recordDays}日</div>
                                                    <div>• カロリー: {post.attachedData.totalCalories}kcal</div>
                                                    <div>• タンパク質: {post.attachedData.protein}g</div>
                                                    <div>• 体重: {post.attachedData.weight}kg</div>
                                                    <div>• LBM: {post.attachedData.lbm}kg</div>
                                                    {post.attachedData.lbmChange && (
                                                        <div className="col-span-3 font-semibold text-sky-700">
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
                                                onClick={() => {
                                                    const reason = prompt('却下理由を入力してください（投稿者には通知されません）:');
                                                    if (reason && reason.trim()) {
                                                        handleReject(post.id, reason);
                                                    }
                                                }}
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
                )}

                {activeView === 'feed' && (
                    <div className="max-w-2xl mx-auto p-4 space-y-4">
                        {approvedPosts.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="MessageSquare" size={64} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-600 mb-2 font-medium">まだ投稿がありません</p>
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
                                        <p className="text-xs text-gray-600">
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

                                    {/* 投稿者（クリックでプロフィール表示） */}
                                    <div className="flex items-center justify-between mb-3">
                                        <button
                                            onClick={() => setProfileModalUserId(post.userId)}
                                            className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 -ml-1 transition"
                                        >
                                            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {post.author?.[0] || 'U'}
                                            </div>
                                            <p className="font-medium text-gray-800 text-sm">{post.author}</p>
                                        </button>
                                        {/* フォローボタン（自分以外の投稿に表示） */}
                                        {post.userId !== userId && (
                                            <FollowButton
                                                targetUserId={post.userId}
                                                currentUserId={userId}
                                                compact={true}
                                            />
                                        )}
                                    </div>

                                    {/* 投稿内容 */}
                                    <p className="text-gray-600 mb-3 whitespace-pre-wrap">{post.content}</p>

                                    {/* データ連携情報 */}
                                    {post.attachedData && (
                                        <div className="p-3 bg-fuchsia-50 border border-fuchsia-200 rounded-lg mb-3">
                                            <p className="text-xs font-semibold text-fuchsia-700 mb-2">📊 データ連携</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
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
                                            <span className="text-sm">{post.commentCount || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => handleShare(post)}
                                            className="flex items-center gap-1 text-gray-600 hover:text-emerald-600 transition"
                                        >
                                            <Icon name="Share2" size={18} />
                                        </button>
                                    </div>

                                    {/* コメントセクション（サブコレクション版） */}
                                    {commentingPostId === post.id && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            {/* コメント一覧 */}
                                            {postComments[post.id] && postComments[post.id].length > 0 && (
                                                <div className="mb-3 space-y-2 max-h-60 overflow-y-auto">
                                                    {postComments[post.id].map(comment => (
                                                        <div key={comment.id} className="bg-gray-50 rounded-lg p-2 group">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setProfileModalUserId(comment.userId)}
                                                                        className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs hover:ring-2 hover:ring-blue-300 transition"
                                                                    >
                                                                        {comment.author?.[0] || 'U'}
                                                                    </button>
                                                                    <span className="text-xs font-semibold text-gray-800">{comment.author}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {comment.createdAt?.toDate ?
                                                                            comment.createdAt.toDate().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) :
                                                                            ''}
                                                                    </span>
                                                                </div>
                                                                {/* 自分のコメントのみ削除可能 */}
                                                                {comment.userId === userId && (
                                                                    <button
                                                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
                                                                        title="削除"
                                                                    >
                                                                        <Icon name="Trash2" size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 ml-8">{comment.content}</p>
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
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                                                />
                                                <button
                                                    onClick={() => handleAddComment(post.id)}
                                                    disabled={!commentText.trim()}
                                                    className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-teal-600 text-white rounded-lg text-sm hover:from-fuchsia-700 hover:to-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
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
                                <p className="text-xs text-gray-600 text-center">
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
                            <p className="text-sm text-gray-600 mb-3">
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
                                    {(userProfile.nickname || userProfile.name || 'U')[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">{userProfile.nickname || userProfile.name || 'ユーザー'}</h3>
                                    {userProfile.goal && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            <Icon name="Target" size={14} className="inline mr-1" />
                                            {userProfile.goal}
                                        </p>
                                    )}
                                    <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                                        Lv.{userProfile.level || 1}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                                <div className="text-center py-2">
                                    <p className="text-2xl font-bold text-gray-800">
                                        {posts.filter(p => p.userId === userId).length}
                                    </p>
                                    <p className="text-xs text-gray-600">投稿</p>
                                </div>
                                <button
                                    onClick={() => setProfileModalUserId(userId)}
                                    className="text-center hover:bg-gray-100 rounded-lg py-2 transition"
                                >
                                    <p className="text-2xl font-bold text-gray-800">{myFollowingCount}</p>
                                    <p className="text-xs text-gray-600">フォロー中</p>
                                </button>
                                <button
                                    onClick={() => setProfileModalUserId(userId)}
                                    className="text-center hover:bg-gray-100 rounded-lg py-2 transition"
                                >
                                    <p className="text-2xl font-bold text-gray-800">{myFollowerCount}</p>
                                    <p className="text-xs text-gray-600">フォロワー</p>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-600">あなたの投稿</h4>
                            {posts.filter(p => p.userId === userId).length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-lg">
                                    <Icon name="MessageSquare" size={48} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-gray-600">まだ投稿がありません</p>
                                    <button
                                        onClick={() => setActiveView('post')}
                                        className="mt-3 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-fuchsia-700 hover:to-teal-700 transition"
                                    >
                                        最初の投稿をする
                                    </button>
                                </div>
                            ) : (
                                posts.filter(p => p.userId === userId).map(post => (
                                    <div key={post.id} className="bg-white rounded-lg shadow-sm p-4">
                                        <p className="text-gray-600 mb-2 whitespace-pre-wrap">{post.content}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{new Date(post.timestamp).toLocaleString('ja-JP')}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <Icon name="Heart" size={12} />
                                                    {post.likes || 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Icon name="MessageCircle" size={12} />
                                                    {post.commentCount || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* FABボタン */}
            <div className="fixed right-6 z-50" style={{ bottom: `${babHeight + 24}px` }}>
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

            {/* ユーザープロフィールモーダル */}
            {profileModalUserId && (
                <UserProfileModal
                    targetUserId={profileModalUserId}
                    currentUserId={userId}
                    onClose={() => setProfileModalUserId(null)}
                />
            )}
        </div>
    );
};


// グローバルに公開
window.PGBaseView = PGBaseView;
window.CommunityPostView = CommunityPostView;
window.AdminPanel = AdminPanel;
window.COMYView = COMYView;
