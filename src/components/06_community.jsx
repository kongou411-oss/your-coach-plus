import React from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import useBABHeight from '../hooks/useBABHeight.js';
// ===== Community Components =====
const PGBaseView = ({ onClose, userId, userProfile }) => {
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('modules'); // 'modules' | 'ai' | 'history'
    const [aiChatHistory, setAiChatHistory] = useState([]);
    const [aiInputMessage, setAiInputMessage] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const aiChatContainerRef = useRef(null);
    const babHeight = useBABHeight(64); // BAB高さ（カスタムフック）
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

            return includeDay;
        }).length;
        const workoutFrequency = historicalData.length > 0 ? ((workoutDays / historicalData.length) * 7).toFixed(1) : '0.0';

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
            <div className="fixed inset-0 bg-white z-50 flex flex-col fullscreen-view">
                {/* ヘッダー */}
                <div className="bg-cyan-600 text-white px-4 py-4 flex items-center justify-between shadow-lg native-safe-header">
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
        <div className="fixed inset-0 bg-white z-50 flex flex-col fullscreen-view">
            {/* ヘッダー */}
            <div className="bg-cyan-600 text-white px-4 py-4 flex items-center justify-between shadow-lg native-safe-header">
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
                            { value: 'リカバリー', label: 'リカバリー', icon: 'Moon', color: 'purple' }
                        ].map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition ${
                                    selectedCategory === cat.value
                                        ? cat.color === 'sky' ? 'bg-[#4A9EFF] text-white' :
                                          cat.color === 'pink' ? 'bg-pink-600 text-white' :
                                          cat.color === 'green' ? 'bg-green-600 text-white' :
                                          cat.color === 'orange' ? 'bg-orange-600 text-white' :
                                          cat.color === 'purple' ? 'bg-purple-600 text-white' :
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
                                        module.category === '心理学' ? 'bg-pink-600' :
                                        module.category === '運動科学' ? 'bg-orange-600' :
                                        module.category === 'リカバリー' ? 'bg-purple-600' :
                                        'bg-green-600'
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
                                            module.category === '公式ガイド' ? 'bg-blue-100 text-[#4A9EFF]' :
                                            module.category === '心理学' ? 'bg-pink-100 text-pink-700' :
                                            module.category === '運動科学' ? 'bg-orange-100 text-orange-700' :
                                            module.category === 'リカバリー' ? 'bg-purple-100 text-purple-700' :
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
                            <div className="w-12 h-12 rounded-lg bg-purple-600 flex items-center justify-center">
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
    console.error('[CommunityPostView] mounted, historyData:', historyData ? Object.keys(historyData).length + ' days' : 'null/undefined');

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

    // 履歴データから過去30日間の平均を同期的に計算（即座に表示）
    const autoFetchedData = useMemo(() => {
        console.error('[CommunityPost] useMemo historyData:', historyData ? Object.keys(historyData).length + ' days' : 'null');

        if (!historyData || Object.keys(historyData).length === 0) {
            console.error('[CommunityPost] No historyData, returning empty');
            return { body: {}, today: {}, history: null };
        }

        // 日付順にソートして過去30日分を取得
        const allDates = Object.keys(historyData).sort().reverse();
        const last30Days = allDates.slice(0, 30);
        console.error('[CommunityPost] allDates:', allDates.slice(0, 5), '... last30Days:', last30Days.length);

        // 体組成は直近の記録された値を使用
        let latestLbm = null, latestWeight = null, latestBodyFat = null;
        for (const date of allDates) {
            const d = historyData[date];
            if (!latestLbm && d.bodyComposition?.leanBodyMass) {
                latestLbm = d.bodyComposition.leanBodyMass;
            }
            if (!latestWeight && d.bodyComposition?.weight) {
                latestWeight = d.bodyComposition.weight;
            }
            if (!latestBodyFat && d.bodyComposition?.bodyFatPercentage) {
                latestBodyFat = d.bodyComposition.bodyFatPercentage;
            }
            if (latestLbm && latestWeight && latestBodyFat) break;
        }
        console.error('[CommunityPost] latestBody:', { latestLbm, latestWeight, latestBodyFat });

        // データがある日のみを対象（食事・運動・体組成のいずれかがあればOK）
        const datesWithData = last30Days.filter(date => {
            const d = historyData[date];
            return (d.meals && d.meals.length > 0) ||
                   (d.workouts && d.workouts.length > 0) ||
                   (d.bodyComposition && Object.keys(d.bodyComposition).length > 0);
        });
        console.error('[CommunityPost] datesWithData:', datesWithData.length);

        let historyAverage = null;
        if (datesWithData.length > 0) {
            let avgCalories = 0, avgProtein = 0, avgFat = 0, avgCarbs = 0;
            // 運動4項目（運動がある日のみカウント = 休養日除外）
            let avgExerciseCount = 0, avgTotalSets = 0, avgTotalVolume = 0, avgWorkoutTime = 0;
            let workoutDaysCount = 0;
            // コンディション用
            let avgSleepHours = 0, sleepCount = 0;
            let avgSleepQuality = 0, sleepQualityCount = 0;
            let avgDigestion = 0, digestionCount = 0;
            let avgFocus = 0, focusCount = 0;
            let avgStress = 0, stressCount = 0;

            datesWithData.forEach(date => {
                const d = historyData[date];

                // 食事データ集計
                avgCalories += d.meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
                avgProtein += d.meals?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
                avgFat += d.meals?.reduce((sum, m) => sum + (m.fat || 0), 0) || 0;
                avgCarbs += d.meals?.reduce((sum, m) => sum + (m.carbs || 0), 0) || 0;

                // 運動データ集計（4項目：種目数、セット数、ボリューム、時間）
                // 休養日（isRestDay: true）を持つworkoutがある日は除外
                const hasRestDayWorkout = d.workouts?.some(w => w.isRestDay === true);
                if (d.workouts && d.workouts.length > 0 && !hasRestDayWorkout) {
                    workoutDaysCount++;
                    d.workouts.forEach(w => {
                        w.exercises?.forEach(ex => {
                            avgExerciseCount += 1;
                            const sets = ex.sets || [];
                            avgTotalSets += sets.length;
                            // ボリューム（重量×回数）
                            avgTotalVolume += sets.reduce((sum, set) => {
                                const weight = set.weight || 0;
                                const reps = set.reps || 0;
                                return sum + (weight * reps);
                            }, 0);
                            // 時間
                            if (ex.duration) {
                                avgWorkoutTime += ex.duration;
                            } else {
                                avgWorkoutTime += sets.reduce((s, set) => s + (set.duration || 0), 0);
                            }
                        });
                    });
                }

                // コンディションデータ集計
                if (d.conditions) {
                    if (d.conditions.sleepHours) {
                        avgSleepHours += d.conditions.sleepHours + 4; // 1→5h, 2→6h, ...
                        sleepCount++;
                    }
                    if (d.conditions.sleepQuality) {
                        avgSleepQuality += d.conditions.sleepQuality;
                        sleepQualityCount++;
                    }
                    if (d.conditions.digestion) {
                        avgDigestion += d.conditions.digestion;
                        digestionCount++;
                    }
                    if (d.conditions.focus) {
                        avgFocus += d.conditions.focus;
                        focusCount++;
                    }
                    if (d.conditions.stress) {
                        avgStress += d.conditions.stress;
                        stressCount++;
                    }
                }
            });

            const count = datesWithData.length;
            historyAverage = {
                // 食事
                calories: Math.round(avgCalories / count),
                protein: Math.round(avgProtein / count),
                fat: Math.round(avgFat / count),
                carbs: Math.round(avgCarbs / count),
                // 運動4項目（運動がある日数で割る = 休養日除外）
                exerciseCount: workoutDaysCount > 0 ? Math.round(avgExerciseCount / workoutDaysCount) : 0,
                totalSets: workoutDaysCount > 0 ? Math.round(avgTotalSets / workoutDaysCount) : 0,
                totalVolume: workoutDaysCount > 0 ? Math.round(avgTotalVolume / workoutDaysCount) : 0,
                workoutTime: workoutDaysCount > 0 ? Math.round(avgWorkoutTime / workoutDaysCount) : 0,
                // コンディション
                sleepHours: sleepCount > 0 ? (avgSleepHours / sleepCount).toFixed(1) : null,
                sleepQuality: sleepQualityCount > 0 ? (avgSleepQuality / sleepQualityCount).toFixed(1) : null,
                digestion: digestionCount > 0 ? (avgDigestion / digestionCount).toFixed(1) : null,
                focus: focusCount > 0 ? (avgFocus / focusCount).toFixed(1) : null,
                stress: stressCount > 0 ? (avgStress / stressCount).toFixed(1) : null,
                daysCount: count
            };
        }

        return {
            body: {
                weight: latestWeight,
                bodyFat: latestBodyFat,
                lbm: latestLbm
            },
            today: {},
            history: historyAverage
        };
    }, [historyData]);

    // 本日のデータは非同期で取得（表示には影響しない）
    useEffect(() => {
        const loadTodayRecord = async () => {
            if (!userProfile?.uid) return;
            try {
                const todayDate = new Date().toISOString().split('T')[0];
                const record = await DataService.getDailyRecord(userProfile.uid, todayDate);
                setTodayRecord(record);
            } catch (error) {
                console.error('[CommunityPost] Failed to load today record:', error);
            }
        };
        loadTodayRecord();
    }, [userProfile?.uid]);

    // ユーザーのプロジェクトを読み込み
    useEffect(() => {
        const loadUserProjects = async () => {
            try {
                console.log('[CommunityPost] Loading projects for user:', userProfile.uid);
                // orderByを削除してインデックス不要に（クライアント側でソート）
                const snapshot = await db.collection('communityProjects')
                    .where('userId', '==', userProfile.uid)
                    .where('isActive', '==', true)
                    .get();

                // 進捗が1件以上あるプロジェクトのみを取得
                const projectsWithProgress = [];
                for (const doc of snapshot.docs) {
                    const progressSnapshot = await doc.ref.collection('progress').limit(1).get();
                    if (!progressSnapshot.empty) {
                        projectsWithProgress.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    } else {
                        // 進捗が0件のプロジェクトは削除
                        console.log('[CommunityPost] Deleting empty project:', doc.id);
                        await doc.ref.delete();
                    }
                }

                const projects = projectsWithProgress.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                console.log('[CommunityPost] Loaded projects:', projects.length);
                setUserProjects(projects);
            } catch (error) {
                console.error('[CommunityPost] Failed to load projects:', error);
            }
        };

        if (userProfile?.uid) {
            loadUserProjects();
        }
    }, [userProfile?.uid]);

    // 過去30日の記録日数をカウント
    const getRecordDaysInLast30 = () => {
        if (!historyData) return 0;
        const last30Days = Object.keys(historyData)
            .filter(date => {
                const recordDate = new Date(date);
                const daysDiff = Math.floor((new Date() - recordDate) / (1000 * 60 * 60 * 24));
                return daysDiff >= 0 && daysDiff < 30;
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
                authorAvatarUrl: userProfile.avatarUrl || null,
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
                goalCategory: userProfile.purpose || 'その他', // ダイエット、維持、バルクアップ、リコンプ
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
                projectTitle: projectTitle.trim(),
                author: userProfile.nickname || userProfile.name || 'ユーザー',
                authorAvatarUrl: userProfile.avatarUrl || null,
                progressType: 'before',
                progressNumber: 0,
                photo: photoUrl,
                caption: projectGoal.trim() || '開始します！',
                bodyData: autoFetchedData?.body || {},
                dailyData: autoFetchedData?.today || {},
                historyData: autoFetchedData?.history || {},
                usageDays: usageDays || 0,
                recordDays: recordDays || 0,
                // プロフィール設定
                profileSettings: (() => {
                    // LBM計算
                    const lbm = userProfile.leanBodyMass || (userProfile.weight ? userProfile.weight * (1 - (userProfile.bodyFatPercentage || 15) / 100) : 0);
                    const fatMass = (userProfile.weight || 0) - lbm;

                    // 活動係数
                    const activityMultipliers = {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75};
                    const activityMultiplier = userProfile.customActivityMultiplier || activityMultipliers[userProfile.activityLevel] || 1.4;

                    // TDEE計算
                    const bmr = lbm > 0 ? 370 + (21.6 * lbm) + (fatMass * 4.5) : 0;
                    const tdee = Math.round(bmr * activityMultiplier);

                    // カロリー調整
                    const calorieAdj = userProfile.calorieAdjustment || 0;

                    // 目標カロリー
                    const adjustedCalories = tdee + calorieAdj;

                    // PFCバランス（設定値をそのまま使用）
                    const pRatio = userProfile.advancedSettings?.proteinRatio || 30;
                    const fRatio = userProfile.advancedSettings?.fatRatioPercent || 20;
                    const cRatio = userProfile.advancedSettings?.carbRatio || 50;

                    // 目標PFC（g）計算
                    const targetP = Math.round((adjustedCalories * pRatio / 100) / 4);
                    const targetF = Math.round((adjustedCalories * fRatio / 100) / 9);
                    const targetC = Math.round((adjustedCalories * cRatio / 100) / 4);

                    return {
                        purpose: userProfile.purpose || '',
                        style: userProfile.style || '',
                        activityMultiplier: activityMultiplier,
                        calorieAdjustment: calorieAdj,
                        pfcBalance: { protein: pRatio, fat: fRatio, carb: cRatio },
                        targetCalories: adjustedCalories,
                        targetProtein: targetP,
                        targetFat: targetF,
                        targetCarbs: targetC
                    };
                })(),
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
                authorAvatarUrl: userProfile.avatarUrl || null,
                category: 'mental',
                goalCategory: userProfile.purpose || 'その他', // ダイエット、維持、バルクアップ、リコンプ
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
                projectTitle: project.title || '',
                author: userProfile.nickname || userProfile.name || 'ユーザー',
                authorAvatarUrl: userProfile.avatarUrl || null,
                progressType: progressType,
                progressNumber: project.progressCount,
                photo: photoUrl,
                caption: progressCaption.trim() || '',
                bodyData: autoFetchedData?.body || {},
                dailyData: autoFetchedData?.today || {},
                historyData: autoFetchedData?.history || {},
                usageDays: usageDays || 0,
                recordDays: recordDays || 0,
                // プロフィール設定
                profileSettings: (() => {
                    // LBM計算
                    const lbm = userProfile.leanBodyMass || (userProfile.weight ? userProfile.weight * (1 - (userProfile.bodyFatPercentage || 15) / 100) : 0);
                    const fatMass = (userProfile.weight || 0) - lbm;

                    // 活動係数
                    const activityMultipliers = {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75};
                    const activityMultiplier = userProfile.customActivityMultiplier || activityMultipliers[userProfile.activityLevel] || 1.4;

                    // TDEE計算
                    const bmr = lbm > 0 ? 370 + (21.6 * lbm) + (fatMass * 4.5) : 0;
                    const tdee = Math.round(bmr * activityMultiplier);

                    // カロリー調整
                    const calorieAdj = userProfile.calorieAdjustment || 0;

                    // 目標カロリー
                    const adjustedCalories = tdee + calorieAdj;

                    // PFCバランス（設定値をそのまま使用）
                    const pRatio = userProfile.advancedSettings?.proteinRatio || 30;
                    const fRatio = userProfile.advancedSettings?.fatRatioPercent || 20;
                    const cRatio = userProfile.advancedSettings?.carbRatio || 50;

                    // 目標PFC（g）計算
                    const targetP = Math.round((adjustedCalories * pRatio / 100) / 4);
                    const targetF = Math.round((adjustedCalories * fRatio / 100) / 9);
                    const targetC = Math.round((adjustedCalories * cRatio / 100) / 4);

                    return {
                        purpose: userProfile.purpose || '',
                        style: userProfile.style || '',
                        activityMultiplier: activityMultiplier,
                        calorieAdjustment: calorieAdj,
                        pfcBalance: { protein: pRatio, fat: fRatio, carb: cRatio },
                        targetCalories: adjustedCalories,
                        targetProtein: targetP,
                        targetFat: targetF,
                        targetCarbs: targetC
                    };
                })(),
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
            <div className="fixed inset-0 bg-white z-50 flex flex-col fullscreen-view">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0 native-safe-header">
                    <button onClick={onClose}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">投稿を作成</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 pb-24">
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
                                <Icon name="HelpCircle" size={16} />
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
            <div className="fixed inset-0 bg-white z-50 flex flex-col fullscreen-view">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0 native-safe-header">
                    <button onClick={() => setPostMode('select')}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">新規プロジェクト作成</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
                    {/* アプリ継続日数 */}
                    <div className="bg-gradient-to-r from-fuchsia-50 to-purple-50 border border-fuchsia-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon name="Calendar" size={18} className="text-fuchsia-600" />
                                <span className="font-semibold text-gray-800">アプリ継続日数</span>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-fuchsia-600">{usageDays || 0}</span>
                                <span className="text-sm text-gray-600 ml-1">日</span>
                            </div>
                        </div>
                    </div>

                    {/* 過去30日間の平均データ表示 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <Icon name="TrendingUp" size={18} />
                            過去{autoFetchedData?.history?.daysCount || 30}日間の平均
                        </h3>

                        {!autoFetchedData ? (
                            <div className="text-center py-4">
                                <Icon name="Loader" size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">データを読み込み中...</p>
                            </div>
                        ) : !autoFetchedData.history ? (
                            <div className="text-center py-4">
                                <Icon name="HelpCircle" size={16} className="text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">まだ記録がありません</p>
                                <p className="text-xs text-gray-500 mt-1">食事や運動を記録すると、ここに平均が表示されます</p>
                            </div>
                        ) : (
                            <>
                                {/* 食事（1日平均） */}
                                <div className="mb-4 p-3 bg-white/60 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">食事（1日平均）</p>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-blue-600">{autoFetchedData.history.calories}</p>
                                            <p className="text-xs text-gray-600">kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-red-500">{autoFetchedData.history.protein}</p>
                                            <p className="text-xs text-gray-600">P (g)</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-yellow-500">{autoFetchedData.history.fat}</p>
                                            <p className="text-xs text-gray-600">F (g)</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-green-500">{autoFetchedData.history.carbs}</p>
                                            <p className="text-xs text-gray-600">C (g)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 運動（1日平均） */}
                                <div className="mb-4 p-3 bg-white/60 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">運動（1日平均）</p>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.exerciseCount}</p>
                                            <p className="text-xs text-gray-600">総種目</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.totalSets}</p>
                                            <p className="text-xs text-gray-600">総セット</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.totalVolume.toLocaleString()}</p>
                                            <p className="text-xs text-gray-600">総重量(kg)</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.workoutTime}</p>
                                            <p className="text-xs text-gray-600">総時間(分)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* コンディション（1日平均） */}
                                <div className="p-3 bg-white/60 rounded-lg">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">コンディション（1日平均）</p>
                                    <div className="grid grid-cols-5 gap-1 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-red-500">{autoFetchedData.history.sleepHours || '-'}</p>
                                            <p className="text-xs text-gray-600">睡眠時間</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-red-500">{autoFetchedData.history.sleepQuality || '-'}</p>
                                            <p className="text-xs text-gray-600">睡眠の質</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-red-500">{autoFetchedData.history.digestion || '-'}</p>
                                            <p className="text-xs text-gray-600">腸内環境</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-red-500">{autoFetchedData.history.focus || '-'}</p>
                                            <p className="text-xs text-gray-600">集中力</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-red-500">{autoFetchedData.history.stress || '-'}</p>
                                            <p className="text-xs text-gray-600">ストレス</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* プロフィール設定 */}
                    {(() => {
                        // LBM計算
                        const lbm = userProfile.leanBodyMass || (userProfile.weight ? userProfile.weight * (1 - (userProfile.bodyFatPercentage || 15) / 100) : 0);
                        const fatMass = (userProfile.weight || 0) - lbm;

                        // 活動係数の計算
                        const activityMultipliers = {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75};
                        const activityMultiplier = userProfile.customActivityMultiplier || activityMultipliers[userProfile.activityLevel] || 1.4;

                        // TDEE計算
                        const bmr = lbm > 0 ? 370 + (21.6 * lbm) + (fatMass * 4.5) : 0;
                        const tdee = Math.round(bmr * activityMultiplier);

                        // カロリー調整
                        const calorieAdj = userProfile.calorieAdjustment || 0;

                        // 目標カロリー
                        const adjustedCalories = tdee + calorieAdj;

                        // PFCバランス（設定値をそのまま使用）
                        const pRatio = userProfile.advancedSettings?.proteinRatio || 30;
                        const fRatio = userProfile.advancedSettings?.fatRatioPercent || 20;
                        const cRatio = userProfile.advancedSettings?.carbRatio || 50;

                        // 目標PFC（g）計算（設定の比率から計算）
                        const targetP = Math.round((adjustedCalories * pRatio / 100) / 4);
                        const targetF = Math.round((adjustedCalories * fRatio / 100) / 9);
                        const targetC = Math.round((adjustedCalories * cRatio / 100) / 4);

                        return (
                            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                                <h3 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
                                    <Icon name="Settings" size={18} />
                                    プロフィール設定
                                </h3>
                                <div className="space-y-2">
                                    {/* スタイル */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">スタイル</span>
                                        <span className="font-bold text-violet-700">{userProfile.style || '未設定'}</span>
                                    </div>
                                    {/* 活動係数 */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">活動係数</span>
                                        <span className="font-bold text-violet-700">×{activityMultiplier}</span>
                                    </div>
                                    {/* 目的 */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">目的</span>
                                        <span className="font-bold text-violet-700">{userProfile.purpose || '未設定'}</span>
                                    </div>
                                    {/* カロリー調整 */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">カロリー調整</span>
                                        <span className={`font-bold ${calorieAdj > 0 ? 'text-green-600' : calorieAdj < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {calorieAdj > 0 ? '+' : ''}{calorieAdj} kcal
                                        </span>
                                    </div>
                                    {/* PFCバランス */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">PFCバランス</span>
                                        <span className="font-bold">
                                            <span className="text-red-500">{pRatio}%</span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-yellow-500">{fRatio}%</span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-green-500">{cRatio}%</span>
                                        </span>
                                    </div>
                                    {/* 目標カロリー */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">目標カロリー</span>
                                        <span className="font-bold text-blue-600">{adjustedCalories} kcal</span>
                                    </div>
                                    {/* 目標PFC */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">目標PFC</span>
                                        <span className="font-bold">
                                            <span className="text-red-500">P{targetP}g</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span className="text-yellow-500">F{targetF}g</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span className="text-green-500">C{targetC}g</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
            <div className="fixed inset-0 bg-white z-50 flex flex-col fullscreen-view">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0 native-safe-header">
                    <button onClick={() => setPostMode('select')}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">進捗を追加</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
                    {/* 過去の平均データ表示 */}
                    {autoFetchedData?.history && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                <Icon name="TrendingUp" size={18} />
                                過去{autoFetchedData.history.daysCount}日間の平均
                            </h3>

                            {/* 食事（1日平均） */}
                            <div className="mb-4 p-3 bg-white/60 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-2">食事（1日平均）</p>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div>
                                        <p className="text-lg font-bold text-blue-600">{autoFetchedData.history.calories}</p>
                                        <p className="text-xs text-gray-600">kcal</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-red-500">{autoFetchedData.history.protein}</p>
                                        <p className="text-xs text-gray-600">P (g)</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-yellow-500">{autoFetchedData.history.fat}</p>
                                        <p className="text-xs text-gray-600">F (g)</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-green-500">{autoFetchedData.history.carbs}</p>
                                        <p className="text-xs text-gray-600">C (g)</p>
                                    </div>
                                </div>
                            </div>

                            {/* 運動（1日平均） */}
                            <div className="mb-4 p-3 bg-white/60 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-2">運動（1日平均）</p>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div>
                                        <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.exerciseCount}</p>
                                        <p className="text-xs text-gray-600">総種目</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.totalSets}</p>
                                        <p className="text-xs text-gray-600">総セット</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.totalVolume.toLocaleString()}</p>
                                        <p className="text-xs text-gray-600">総重量(kg)</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-orange-600">{autoFetchedData.history.workoutTime}</p>
                                        <p className="text-xs text-gray-600">総時間(分)</p>
                                    </div>
                                </div>
                            </div>

                            {/* コンディション（1日平均） */}
                            <div className="p-3 bg-white/60 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-2">コンディション（1日平均）</p>
                                <div className="grid grid-cols-5 gap-1 text-center">
                                    <div>
                                        <p className="text-lg font-bold text-red-500">{autoFetchedData.history.sleepHours || '-'}</p>
                                        <p className="text-xs text-gray-600">睡眠時間</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-red-500">{autoFetchedData.history.sleepQuality || '-'}</p>
                                        <p className="text-xs text-gray-600">睡眠の質</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-red-500">{autoFetchedData.history.digestion || '-'}</p>
                                        <p className="text-xs text-gray-600">腸内環境</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-red-500">{autoFetchedData.history.focus || '-'}</p>
                                        <p className="text-xs text-gray-600">集中力</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-red-500">{autoFetchedData.history.stress || '-'}</p>
                                        <p className="text-xs text-gray-600">ストレス</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* プロフィール設定 */}
                    {(() => {
                        // LBM計算
                        const lbm = userProfile.leanBodyMass || (userProfile.weight ? userProfile.weight * (1 - (userProfile.bodyFatPercentage || 15) / 100) : 0);
                        const fatMass = (userProfile.weight || 0) - lbm;

                        // 活動係数の計算
                        const activityMultipliers = {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75};
                        const activityMultiplier = userProfile.customActivityMultiplier || activityMultipliers[userProfile.activityLevel] || 1.4;

                        // TDEE計算
                        const bmr = lbm > 0 ? 370 + (21.6 * lbm) + (fatMass * 4.5) : 0;
                        const tdee = Math.round(bmr * activityMultiplier);

                        // カロリー調整
                        const calorieAdj = userProfile.calorieAdjustment || 0;

                        // 目標カロリー
                        const adjustedCalories = tdee + calorieAdj;

                        // PFCバランス（設定値をそのまま使用）
                        const pRatio = userProfile.advancedSettings?.proteinRatio || 30;
                        const fRatio = userProfile.advancedSettings?.fatRatioPercent || 20;
                        const cRatio = userProfile.advancedSettings?.carbRatio || 50;

                        // 目標PFC（g）計算（設定の比率から計算）
                        const targetP = Math.round((adjustedCalories * pRatio / 100) / 4);
                        const targetF = Math.round((adjustedCalories * fRatio / 100) / 9);
                        const targetC = Math.round((adjustedCalories * cRatio / 100) / 4);

                        return (
                            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                                <h3 className="font-bold text-violet-900 mb-3 flex items-center gap-2">
                                    <Icon name="Settings" size={18} />
                                    プロフィール設定
                                </h3>
                                <div className="space-y-2">
                                    {/* スタイル */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">スタイル</span>
                                        <span className="font-bold text-violet-700">{userProfile.style || '未設定'}</span>
                                    </div>
                                    {/* 活動係数 */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">活動係数</span>
                                        <span className="font-bold text-violet-700">×{activityMultiplier}</span>
                                    </div>
                                    {/* 目的 */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">目的</span>
                                        <span className="font-bold text-violet-700">{userProfile.purpose || '未設定'}</span>
                                    </div>
                                    {/* カロリー調整 */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">カロリー調整</span>
                                        <span className={`font-bold ${calorieAdj > 0 ? 'text-green-600' : calorieAdj < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {calorieAdj > 0 ? '+' : ''}{calorieAdj} kcal
                                        </span>
                                    </div>
                                    {/* PFCバランス */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">PFCバランス</span>
                                        <span className="font-bold">
                                            <span className="text-red-500">{pRatio}%</span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-yellow-500">{fRatio}%</span>
                                            <span className="text-gray-400">/</span>
                                            <span className="text-green-500">{cRatio}%</span>
                                        </span>
                                    </div>
                                    {/* 目標カロリー */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">目標カロリー</span>
                                        <span className="font-bold text-blue-600">{adjustedCalories} kcal</span>
                                    </div>
                                    {/* 目標PFC */}
                                    <div className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                                        <span className="text-xs text-gray-600">目標PFC</span>
                                        <span className="font-bold">
                                            <span className="text-red-500">P{targetP}g</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span className="text-yellow-500">F{targetF}g</span>
                                            <span className="text-gray-400 mx-1">/</span>
                                            <span className="text-green-500">C{targetC}g</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
            <div className="fixed inset-0 bg-white z-50 flex flex-col fullscreen-view">
                <header className="p-4 flex items-center border-b bg-white flex-shrink-0 native-safe-header">
                    <button onClick={() => setPostMode('select')}>
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto">メンタル投稿</h1>
                    <div className="w-6"></div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6">
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

    // フォールバック（到達しないはず）
    return null;
};

// ===== COMYビュー =====
const COMYView = ({ onClose, userId, userProfile, usageDays, historyData: propsHistoryData }) => {
    const [activeView, setActiveView] = useState('feed'); // 'admin', 'feed', 'post', 'mypage', 'community'
    const [posts, setPosts] = useState([]);
    const babHeight = useBABHeight(64); // BAB高さ（動的取得）

    // Firestoreから取得した履歴データ（propsのhistoryDataよりも優先）
    const [firestoreHistoryData, setFirestoreHistoryData] = useState({});
    const [historyDataLoading, setHistoryDataLoading] = useState(true);

    // propsまたはFirestoreから取得したデータを使用
    const historyData = Object.keys(firestoreHistoryData).length > 0 ? firestoreHistoryData : (propsHistoryData || {});

    console.log('[COMYView] historyData:', Object.keys(historyData).length + ' days');

    const [fabOpen, setFabOpen] = useState(false);
    const [commentingPostId, setCommentingPostId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [shareModalPostId, setShareModalPostId] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [showThemeSpaceSelector, setShowThemeSpaceSelector] = useState(false);
    const [showMentorApplication, setShowMentorApplication] = useState(false);

    // フィード フィルター/ソート用state
    const [feedFilter, setFeedFilter] = useState('all'); // 'all', 'ダイエット', '維持', 'バルクアップ', 'リコンプ'
    const [feedSort, setFeedSort] = useState('newest'); // 'newest', 'popular'
    const [showFilterSort, setShowFilterSort] = useState(false); // フィルターUI折りたたみ

    // 新機能: コメント・フォロー・プロフィール用state
    const [postComments, setPostComments] = useState({}); // { postId: [comments] }
    const [profileModalUserId, setProfileModalUserId] = useState(null); // プロフィールモーダル表示対象
    const [profileModalInitialTab, setProfileModalInitialTab] = useState('posts'); // プロフィールモーダルの初期タブ
    const [myFollowerCount, setMyFollowerCount] = useState(0);
    const [myFollowingCount, setMyFollowingCount] = useState(0);

    // マイページ投稿フィルター
    const [myPostFilter, setMyPostFilter] = useState('all'); // 'all', 'before', 'progress', 'after'

    // Firestoreから履歴データを取得
    useEffect(() => {
        const loadHistoryData = async () => {
            if (!userId) return;

            try {
                setHistoryDataLoading(true);
                const data = {};

                // 過去90日分のデータを取得
                const today = new Date();
                for (let i = 0; i < 90; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];

                    const record = await DataService.getDailyRecord(userId, dateStr);
                    if (record && (record.meals?.length > 0 || record.workouts?.length > 0 || record.conditions)) {
                        data[dateStr] = record;
                    }
                }

                console.log('[COMYView] Loaded history from Firestore:', Object.keys(data).length + ' days');
                setFirestoreHistoryData(data);
            } catch (error) {
                console.error('[COMYView] Error loading history data:', error);
            } finally {
                setHistoryDataLoading(false);
            }
        };

        loadHistoryData();
    }, [userId]);

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
    const toggleLike = async (postId, projectId) => {
        const result = await DataService.togglePostLike(postId, userId, projectId);
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
    const handleAddComment = async (postId, projectId) => {
        if (!commentText.trim()) return;

        const commentData = {
            userId: userId,
            author: userProfile?.nickname || 'ユーザー',
            authorAvatarUrl: userProfile?.avatarUrl || null,
            content: commentText.trim()
        };

        const result = await DataService.addComment(postId, commentData, projectId);
        if (result.success) {
            // コメント一覧を再取得
            const comments = await DataService.getPostComments(postId, projectId);
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
    const handleToggleComments = async (postId, projectId) => {
        if (commentingPostId === postId) {
            setCommentingPostId(null);
        } else {
            // コメントを取得
            const comments = await DataService.getPostComments(postId, projectId);
            setPostComments(prev => ({ ...prev, [postId]: comments }));
            setCommentingPostId(postId);
        }
    };

    // コメント削除
    const handleDeleteComment = async (postId, commentId, projectId) => {
        const result = await DataService.deleteComment(postId, commentId, projectId);
        if (result.success) {
            // コメント一覧を再取得
            const comments = await DataService.getPostComments(postId, projectId);
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

    // 承認済み投稿をフィルタリング・ソート
    const approvedPosts = posts
        .filter(post => post.approvalStatus === 'approved')
        .filter(post => feedFilter === 'all' || post.goalCategory === feedFilter)
        .sort((a, b) => {
            if (feedSort === 'popular') {
                return (b.likes || 0) - (a.likes || 0);
            }
            // newest（デフォルト）
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

    // 投稿削除ハンドラ
    const [deletingPostId, setDeletingPostId] = useState(null);
    const handleDeletePost = async (post) => {
        if (!post.projectId || !post.id) {
            toast.error('この投稿は削除できません');
            return;
        }

        if (!window.confirm('この投稿を削除しますか？\nこの操作は取り消せません。')) {
            return;
        }

        setDeletingPostId(post.id);
        try {
            const result = await DataService.deleteUserPost(userId, post.projectId, post.id);
            if (result.success) {
                // ローカルのpostsから削除
                setPosts(posts.filter(p => p.id !== post.id));
                if (result.projectDeleted) {
                    toast.success('投稿を削除しました（プロジェクトも削除）');
                } else {
                    toast.success('投稿を削除しました');
                }
            } else {
                toast.error(result.error || '削除に失敗しました');
            }
        } catch (error) {
            console.error('Delete post error:', error);
            toast.error('削除に失敗しました');
        } finally {
            setDeletingPostId(null);
        }
    };

    // 投稿画面表示中
    if (activeView === 'post') {
        return (
            <CommunityPostView
                onClose={() => setActiveView('feed')}
                onSubmitPost={handleSubmitPost}
                userProfile={{ ...userProfile, uid: userId }}
                userId={userId}
                usageDays={usageDays}
                historyData={historyData}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col fullscreen-view">
            {/* ヘッダー */}
            <div className="bg-fuchsia-600 text-white px-4 py-4 flex items-center justify-between shadow-lg native-safe-header">
                <div className="flex items-center gap-3">
                    <Icon name="Users" size={24} />
                    <div>
                        <h2 className="text-xl font-bold">COMY</h2>
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
                </div>
            </div>

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-y-auto bg-gray-50" style={{ paddingBottom: `${babHeight + 80}px` }}>
                {activeView === 'feed' && (
                    <div className="max-w-2xl mx-auto p-4 space-y-4">
                        {/* フィルター・ソートUI（折りたたみ式） */}
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <button
                                onClick={() => setShowFilterSort(!showFilterSort)}
                                className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
                            >
                                <span className="flex items-center gap-2">
                                    <Icon name="Filter" size={14} />
                                    {feedFilter === 'all' ? 'すべて' :
                                     feedFilter === 'ダイエット' ? 'ダイエット' :
                                     feedFilter === '維持' ? 'メンテナンス' : feedFilter}
                                    {feedSort === 'popular' && ' / 人気順'}
                                </span>
                                <Icon name={showFilterSort ? "ChevronUp" : "ChevronDown"} size={14} />
                            </button>
                            {showFilterSort && (
                                <div className="px-3 pb-3 pt-1 border-t space-y-2">
                                    {/* カテゴリフィルター */}
                                    <div className="flex flex-wrap gap-1">
                                        {[
                                            { value: 'all', label: 'すべて' },
                                            { value: 'ダイエット', label: 'ダイエット' },
                                            { value: '維持', label: 'メンテナンス' },
                                            { value: 'バルクアップ', label: 'バルクアップ' },
                                            { value: 'リコンプ', label: 'リコンプ' }
                                        ].map(filter => (
                                            <button
                                                key={filter.value}
                                                onClick={() => setFeedFilter(filter.value)}
                                                className={`px-3 py-1 text-xs rounded-full transition ${
                                                    feedFilter === filter.value
                                                        ? 'bg-fuchsia-600 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* ソート */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setFeedSort('newest')}
                                            className={`px-2 py-1 text-xs rounded transition ${
                                                feedSort === 'newest'
                                                    ? 'bg-gray-800 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            新着
                                        </button>
                                        <button
                                            onClick={() => setFeedSort('popular')}
                                            className={`px-2 py-1 text-xs rounded transition ${
                                                feedSort === 'popular'
                                                    ? 'bg-gray-800 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            人気
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

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
                                    {/* 投稿者 + カテゴリバッジ + 目的タグ + 日時（同じ行） */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {/* 投稿者（クリックでプロフィール表示） */}
                                            <button
                                                onClick={() => setProfileModalUserId(post.userId)}
                                                className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1 -ml-1 transition"
                                            >
                                                {post.authorAvatarUrl ? (
                                                    <img src={post.authorAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                        {post.author?.[0] || 'U'}
                                                    </div>
                                                )}
                                                <p className="font-medium text-gray-800 text-sm">{post.author}</p>
                                            </button>
                                            {/* カテゴリバッジ（ボディメイク/メンタル） */}
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                post.category === 'body'
                                                    ? 'bg-fuchsia-100 text-fuchsia-700'
                                                    : 'bg-teal-100 text-teal-700'
                                            }`}>
                                                {post.category === 'body' ? 'ボディメイク' : 'メンタル'}
                                            </span>
                                            {/* 目的タグ（ダイエット/メンテナンス/バルクアップ/リコンプ） */}
                                            {post.goalCategory && post.goalCategory !== 'その他' && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    post.goalCategory === 'ダイエット' ? 'bg-orange-100 text-orange-700' :
                                                    post.goalCategory === '維持' ? 'bg-blue-100 text-blue-700' :
                                                    post.goalCategory === 'バルクアップ' ? 'bg-green-100 text-green-700' :
                                                    post.goalCategory === 'リコンプ' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {post.goalCategory === 'ダイエット' ? 'ダイエット' :
                                                     post.goalCategory === '維持' ? 'メンテナンス' :
                                                     post.goalCategory === 'バルクアップ' ? 'バルクアップ' :
                                                     post.goalCategory === 'リコンプ' ? 'リコンプ' :
                                                     post.goalCategory}
                                                </span>
                                            )}
                                            {/* 進捗タイプタグ（新規/経過/結果） */}
                                            {post.progressType && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    post.progressType === 'before' ? 'bg-sky-100 text-sky-700' :
                                                    post.progressType === 'progress' ? 'bg-amber-100 text-amber-700' :
                                                    post.progressType === 'after' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {post.progressType === 'before' ? '新規' :
                                                     post.progressType === 'progress' ? '経過' :
                                                     post.progressType === 'after' ? '結果' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {new Date(post.timestamp).toLocaleString('ja-JP')}
                                        </p>
                                    </div>

                                    {/* 写真 */}
                                    {post.photo && (
                                        <div className="mb-3">
                                            <img src={post.photo} alt="Progress" className="w-full rounded-lg" />
                                            {post.progressType === 'before' && (
                                                <p className="text-xs text-gray-500 text-center mt-1">ビフォー</p>
                                            )}
                                        </div>
                                    )}
                                    {/* ビフォー・アフター写真（旧形式対応） */}
                                    {!post.photo && post.beforePhoto && post.afterPhoto && (
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

                                    {/* 投稿内容 */}
                                    <p className="text-gray-600 mb-3 whitespace-pre-wrap">{post.content}</p>

                                    {/* フォローボタン（自分以外の投稿に表示） */}
                                    {post.userId !== userId && (
                                        <div className="mb-3">
                                            <FollowButton
                                                targetUserId={post.userId}
                                                currentUserId={userId}
                                                compact={true}
                                            />
                                        </div>
                                    )}

                                    {/* データ連携情報（新形式: bodyData, historyData, usageDays, recordDays） */}
                                    {(post.bodyData || post.historyData || post.usageDays || post.recordDays || post.projectTitle || post.daysSinceStart !== undefined) && (
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3 text-xs overflow-visible">
                                            {/* プロジェクト情報（タイトル・開始からの日数・進捗回数） */}
                                            {(post.projectTitle || post.daysSinceStart !== undefined || post.progressNumber !== undefined) && (
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1 pb-1 border-b border-gray-200">
                                                    {post.projectTitle && (
                                                        <span className="text-gray-700 font-medium">{post.projectTitle}</span>
                                                    )}
                                                    {post.daysSinceStart !== undefined && post.daysSinceStart > 0 && (
                                                        <span className="text-purple-600 font-medium">{post.daysSinceStart}日目</span>
                                                    )}
                                                    {post.progressNumber !== undefined && post.progressNumber > 0 && (
                                                        <span className="text-pink-600 font-medium">{post.progressNumber + 1}回目</span>
                                                    )}
                                                </div>
                                            )}
                                            {/* 継続日数・記録日数 */}
                                            {(post.usageDays || post.recordDays) && (
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
                                                    {post.usageDays > 0 && (
                                                        <span className="text-fuchsia-600 font-medium">継続 {post.usageDays}日</span>
                                                    )}
                                                    {post.recordDays > 0 && (
                                                        <span className="text-cyan-600 font-medium">記録 {post.recordDays}日</span>
                                                    )}
                                                </div>
                                            )}
                                            {/* 体組成 */}
                                            {post.bodyData && (post.bodyData.weight || post.bodyData.lbm || post.bodyData.bodyFat) && (
                                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                    {post.bodyData.lbm && (
                                                        <span className="text-teal-600 font-medium">LBM {post.bodyData.lbm}kg</span>
                                                    )}
                                                    {post.bodyData.weight && (
                                                        <span className="text-teal-600">体重 <span className="font-medium">{post.bodyData.weight}kg</span></span>
                                                    )}
                                                    {post.bodyData.bodyFat && (
                                                        <span className="text-teal-600">体脂肪 <span className="font-medium">{post.bodyData.bodyFat}%</span></span>
                                                    )}
                                                </div>
                                            )}
                                            {/* 過去平均（食事・運動・コンディション） */}
                                            {post.historyData && (post.historyData.calories || post.historyData.protein || post.historyData.exerciseCount) && (
                                                <div className={`space-y-1 ${(post.bodyData?.weight || post.usageDays) ? 'mt-1 pt-1 border-t border-gray-200' : ''}`}>
                                                    <span className="text-gray-400 text-xs">{post.historyData.daysCount || 30}日平均:</span>
                                                    {/* 食事 */}
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                        <span className="text-gray-500 text-xs">食事:</span>
                                                        {post.historyData.calories > 0 && (
                                                            <span className="text-blue-600 font-medium text-xs">{post.historyData.calories}kcal</span>
                                                        )}
                                                        {post.historyData.protein > 0 && (
                                                            <span className="text-red-500 font-medium text-xs">P{post.historyData.protein}g</span>
                                                        )}
                                                        {post.historyData.fat > 0 && (
                                                            <span className="text-yellow-500 font-medium text-xs">F{post.historyData.fat}g</span>
                                                        )}
                                                        <span className="text-green-500 font-medium text-xs">C{post.historyData.carbs ?? 0}g</span>
                                                    </div>
                                                    {/* 運動 */}
                                                    {(post.historyData.exerciseCount > 0 || post.historyData.totalSets > 0) && (
                                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                            <span className="text-gray-500 text-xs">運動:</span>
                                                            {post.historyData.exerciseCount > 0 && (
                                                                <span className="text-orange-600 font-medium text-xs">{post.historyData.exerciseCount}種目</span>
                                                            )}
                                                            {post.historyData.totalSets > 0 && (
                                                                <span className="text-orange-600 font-medium text-xs">{post.historyData.totalSets}セット</span>
                                                            )}
                                                            {post.historyData.totalVolume > 0 && (
                                                                <span className="text-orange-600 font-medium text-xs">{post.historyData.totalVolume.toLocaleString()}kg</span>
                                                            )}
                                                            {post.historyData.workoutTime > 0 && (
                                                                <span className="text-orange-600 font-medium text-xs">{post.historyData.workoutTime}分</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* コンディション */}
                                                    {(post.historyData.sleepHours || post.historyData.sleepQuality || post.historyData.digestion || post.historyData.focus || post.historyData.stress) && (
                                                        <div>
                                                            <span className="text-gray-500 text-xs">コンディション: </span>
                                                            <span className="text-red-500 font-medium text-xs">
                                                                {post.historyData.sleepHours && `睡眠${post.historyData.sleepHours}h `}
                                                                {post.historyData.sleepQuality && `質${post.historyData.sleepQuality} `}
                                                                {post.historyData.digestion && `腸${post.historyData.digestion} `}
                                                                {post.historyData.focus && `集中${post.historyData.focus} `}
                                                                {post.historyData.stress && `ストレス${post.historyData.stress}`}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {/* プロフィール設定（PFCバランス・目標・活動係数など） */}
                                            {post.profileSettings && (
                                                <div className={`space-y-1 ${(post.historyData || post.bodyData?.weight || post.usageDays) ? 'mt-1 pt-1 border-t border-gray-200' : ''}`}>
                                                    <span className="text-gray-400 text-xs">設定</span>
                                                    {/* 目標カロリー・PFC（g） */}
                                                    {post.profileSettings.targetCalories > 0 && (
                                                        <div className="text-xs">
                                                            <span className="text-blue-600 font-medium">目標 {post.profileSettings.targetCalories}kcal</span>
                                                            {(post.profileSettings.targetProtein || post.profileSettings.targetFat || post.profileSettings.targetCarbs) && (
                                                                <span className="ml-2">
                                                                    <span className="text-red-500 font-medium">P{post.profileSettings.targetProtein || 0}g</span>
                                                                    <span className="text-gray-400"> / </span>
                                                                    <span className="text-yellow-500 font-medium">F{post.profileSettings.targetFat || 0}g</span>
                                                                    <span className="text-gray-400"> / </span>
                                                                    <span className="text-green-500 font-medium">C{post.profileSettings.targetCarbs || 0}g</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* 活動係数・カロリー調整・PFCバランス */}
                                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                                                        {post.profileSettings.activityMultiplier && (
                                                            <span className="text-violet-600 font-medium">活動係数×{post.profileSettings.activityMultiplier}</span>
                                                        )}
                                                        {post.profileSettings.calorieAdjustment !== 0 && post.profileSettings.calorieAdjustment !== undefined && (
                                                            <span className={`font-medium ${post.profileSettings.calorieAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                調整{post.profileSettings.calorieAdjustment > 0 ? '+' : ''}{post.profileSettings.calorieAdjustment}kcal
                                                            </span>
                                                        )}
                                                        {post.profileSettings.pfcBalance && (
                                                            <span className="text-gray-500">
                                                                PFC比 <span className="text-red-500 font-medium">{post.profileSettings.pfcBalance.protein}%</span>
                                                                <span className="text-gray-400">/</span>
                                                                <span className="text-yellow-500 font-medium">{post.profileSettings.pfcBalance.fat}%</span>
                                                                <span className="text-gray-400">/</span>
                                                                <span className="text-green-500 font-medium">{post.profileSettings.pfcBalance.carb}%</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {/* データ連携情報（旧形式: attachedData） */}
                                    {!post.bodyData && !post.historyData && post.attachedData && (
                                        <div className="p-3 bg-fuchsia-50 border border-fuchsia-200 rounded-lg mb-3">
                                            <p className="text-xs font-semibold text-fuchsia-700 mb-2">データ連携</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                                <div>継続: {post.attachedData.usageDays}日</div>
                                                <div>記録: {post.attachedData.recordDays}日</div>
                                                <div>カロリー: {post.attachedData.totalCalories}kcal</div>
                                                <div>タンパク質: {post.attachedData.protein}g</div>
                                                {post.attachedData.lbmChange && (
                                                    <div className="col-span-2 font-semibold text-fuchsia-700">
                                                        LBM変化: {post.attachedData.lbmChange > 0 ? '+' : ''}{post.attachedData.lbmChange}kg
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
                                            onClick={() => toggleLike(post.id, post.projectId)}
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
                                            onClick={() => handleToggleComments(post.id, post.projectId)}
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
                                                                        className="hover:ring-2 hover:ring-blue-300 transition rounded-full"
                                                                    >
                                                                        {comment.authorAvatarUrl ? (
                                                                            <img src={comment.authorAvatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                                                {comment.author?.[0] || 'U'}
                                                                            </div>
                                                                        )}
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
                                                                        onClick={() => handleDeleteComment(post.id, comment.id, post.projectId)}
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
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id, post.projectId)}
                                                    placeholder="コメントを入力..."
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                                                />
                                                <button
                                                    onClick={() => handleAddComment(post.id, post.projectId)}
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

                {activeView === 'mypage' && (
                    <div className="max-w-2xl mx-auto p-4">
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
                            <div className="flex items-center gap-4 mb-6">
                                {userProfile.avatarUrl ? (
                                    <img src={userProfile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                                ) : (
                                    <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                                        {(userProfile.nickname || userProfile.name || 'U')[0]}
                                    </div>
                                )}
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
                                    onClick={() => {
                                        setProfileModalInitialTab('followers');
                                        setProfileModalUserId(userId);
                                    }}
                                    className="text-center hover:bg-gray-100 rounded-lg py-2 transition"
                                >
                                    <p className="text-2xl font-bold text-gray-800">{myFollowerCount}</p>
                                    <p className="text-xs text-gray-600">フォロワー</p>
                                </button>
                                <button
                                    onClick={() => {
                                        setProfileModalInitialTab('following');
                                        setProfileModalUserId(userId);
                                    }}
                                    className="text-center hover:bg-gray-100 rounded-lg py-2 transition"
                                >
                                    <p className="text-2xl font-bold text-gray-800">{myFollowingCount}</p>
                                    <p className="text-xs text-gray-600">フォロー中</p>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-600">あなたの投稿</h4>
                            {/* 投稿種類フィルタータブ */}
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                {[
                                    { key: 'all', label: 'すべて' },
                                    { key: 'before', label: '本体' },
                                    { key: 'progress', label: '進捗' },
                                    { key: 'after', label: '結果' }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setMyPostFilter(tab.key)}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                                            myPostFilter === tab.key
                                                ? 'bg-white text-fuchsia-600 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                    >
                                        {tab.label}
                                        <span className="ml-1 text-gray-400">
                                            ({posts.filter(p => p.userId === userId && (tab.key === 'all' || p.progressType === tab.key)).length})
                                        </span>
                                    </button>
                                ))}
                            </div>
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
                            ) : posts.filter(p => p.userId === userId && (myPostFilter === 'all' || p.progressType === myPostFilter)).length === 0 ? (
                                <div className="text-center py-6 bg-white rounded-lg">
                                    <p className="text-gray-500 text-sm">この種類の投稿はありません</p>
                                </div>
                            ) : (
                                posts.filter(p => p.userId === userId && (myPostFilter === 'all' || p.progressType === myPostFilter)).map(post => (
                                    <div key={post.id} className="bg-white rounded-lg shadow-sm p-4">
                                        {/* ヘッダー（アバター・名前・タグ・タイムスタンプ） */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {(post.authorAvatarUrl || userProfile.avatarUrl) ? (
                                                    <img src={post.authorAvatarUrl || userProfile.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                        {post.author?.[0] || 'U'}
                                                    </div>
                                                )}
                                                <p className="font-medium text-gray-800 text-sm">{post.author}</p>
                                                {/* カテゴリバッジ（ボディメイク/メンタル） */}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    post.category === 'body'
                                                        ? 'bg-fuchsia-100 text-fuchsia-700'
                                                        : 'bg-teal-100 text-teal-700'
                                                }`}>
                                                    {post.category === 'body' ? 'ボディメイク' : 'メンタル'}
                                                </span>
                                                {/* 目的タグ（ダイエット/メンテナンス/バルクアップ/リコンプ） */}
                                                {post.goalCategory && post.goalCategory !== 'その他' && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        post.goalCategory === 'ダイエット' ? 'bg-orange-100 text-orange-700' :
                                                        post.goalCategory === '維持' ? 'bg-blue-100 text-blue-700' :
                                                        post.goalCategory === 'バルクアップ' ? 'bg-green-100 text-green-700' :
                                                        post.goalCategory === 'リコンプ' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {post.goalCategory === 'ダイエット' ? 'ダイエット' :
                                                         post.goalCategory === '維持' ? 'メンテナンス' :
                                                         post.goalCategory === 'バルクアップ' ? 'バルクアップ' :
                                                         post.goalCategory === 'リコンプ' ? 'リコンプ' :
                                                         post.goalCategory}
                                                    </span>
                                                )}
                                                {/* 進捗タイプタグ（新規/経過/結果） */}
                                                {post.progressType && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                        post.progressType === 'before' ? 'bg-sky-100 text-sky-700' :
                                                        post.progressType === 'progress' ? 'bg-amber-100 text-amber-700' :
                                                        post.progressType === 'after' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {post.progressType === 'before' ? '新規' :
                                                         post.progressType === 'progress' ? '経過' :
                                                         post.progressType === 'after' ? '結果' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {new Date(post.timestamp).toLocaleString('ja-JP')}
                                            </p>
                                        </div>

                                        {/* 写真 */}
                                        {post.photo && (
                                            <div className="mb-3">
                                                <img src={post.photo} alt="Progress" className="w-full rounded-lg" />
                                                {post.progressType === 'before' && (
                                                    <p className="text-xs text-gray-500 text-center mt-1">ビフォー</p>
                                                )}
                                            </div>
                                        )}
                                        {!post.photo && post.beforePhoto && post.afterPhoto && (
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

                                        {/* 投稿内容 */}
                                        <p className="text-gray-600 mb-3 whitespace-pre-wrap">{post.content}</p>

                                        {/* データ連携情報（新形式: bodyData, historyData, usageDays, recordDays） */}
                                        {(post.bodyData || post.historyData || post.usageDays || post.recordDays || post.projectTitle || post.daysSinceStart !== undefined) && (
                                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3 text-xs overflow-visible">
                                                {/* プロジェクト情報（タイトル・開始からの日数・進捗回数） */}
                                                {(post.projectTitle || post.daysSinceStart !== undefined || post.progressNumber !== undefined) && (
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1 pb-1 border-b border-gray-200">
                                                        {post.projectTitle && (
                                                            <span className="text-gray-700 font-medium">{post.projectTitle}</span>
                                                        )}
                                                        {post.daysSinceStart !== undefined && post.daysSinceStart > 0 && (
                                                            <span className="text-purple-600 font-medium">{post.daysSinceStart}日目</span>
                                                        )}
                                                        {post.progressNumber !== undefined && post.progressNumber > 0 && (
                                                            <span className="text-pink-600 font-medium">{post.progressNumber + 1}回目</span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* 継続日数・記録日数 */}
                                                {(post.usageDays || post.recordDays) && (
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
                                                        {post.usageDays > 0 && (
                                                            <span className="text-fuchsia-600 font-medium">継続 {post.usageDays}日</span>
                                                        )}
                                                        {post.recordDays > 0 && (
                                                            <span className="text-cyan-600 font-medium">記録 {post.recordDays}日</span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* 体組成 */}
                                                {post.bodyData && (post.bodyData.weight || post.bodyData.lbm || post.bodyData.bodyFat) && (
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                        {post.bodyData.lbm && (
                                                            <span className="text-teal-600 font-medium">LBM {post.bodyData.lbm}kg</span>
                                                        )}
                                                        {post.bodyData.weight && (
                                                            <span className="text-teal-600">体重 <span className="font-medium">{post.bodyData.weight}kg</span></span>
                                                        )}
                                                        {post.bodyData.bodyFat && (
                                                            <span className="text-teal-600">体脂肪 <span className="font-medium">{post.bodyData.bodyFat}%</span></span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* 過去平均（食事・運動・コンディション） */}
                                                {post.historyData && (post.historyData.calories || post.historyData.protein || post.historyData.exerciseCount) && (
                                                    <div className={`space-y-1 ${(post.bodyData?.weight || post.usageDays) ? 'mt-1 pt-1 border-t border-gray-200' : ''}`}>
                                                        <span className="text-gray-400 text-xs">{post.historyData.daysCount || 30}日平均:</span>
                                                        {/* 食事 */}
                                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                            <span className="text-gray-500 text-xs">食事:</span>
                                                            {post.historyData.calories > 0 && (
                                                                <span className="text-blue-600 font-medium text-xs">{post.historyData.calories}kcal</span>
                                                            )}
                                                            {post.historyData.protein > 0 && (
                                                                <span className="text-red-500 font-medium text-xs">P{post.historyData.protein}g</span>
                                                            )}
                                                            {post.historyData.fat > 0 && (
                                                                <span className="text-yellow-500 font-medium text-xs">F{post.historyData.fat}g</span>
                                                            )}
                                                            <span className="text-green-500 font-medium text-xs">C{post.historyData.carbs ?? 0}g</span>
                                                        </div>
                                                        {/* 運動 */}
                                                        {(post.historyData.exerciseCount > 0 || post.historyData.totalSets > 0) && (
                                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                                <span className="text-gray-500 text-xs">運動:</span>
                                                                {post.historyData.exerciseCount > 0 && (
                                                                    <span className="text-orange-600 font-medium text-xs">{post.historyData.exerciseCount}種目</span>
                                                                )}
                                                                {post.historyData.totalSets > 0 && (
                                                                    <span className="text-orange-600 font-medium text-xs">{post.historyData.totalSets}セット</span>
                                                                )}
                                                                {post.historyData.totalVolume > 0 && (
                                                                    <span className="text-orange-600 font-medium text-xs">{post.historyData.totalVolume.toLocaleString()}kg</span>
                                                                )}
                                                                {post.historyData.workoutTime > 0 && (
                                                                    <span className="text-orange-600 font-medium text-xs">{post.historyData.workoutTime}分</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* コンディション */}
                                                        {(post.historyData.sleepHours || post.historyData.sleepQuality || post.historyData.digestion || post.historyData.focus || post.historyData.stress) && (
                                                            <div>
                                                                <span className="text-gray-500 text-xs">コンディション: </span>
                                                                <span className="text-red-500 font-medium text-xs">
                                                                    {post.historyData.sleepHours && `睡眠${post.historyData.sleepHours}h `}
                                                                    {post.historyData.sleepQuality && `質${post.historyData.sleepQuality} `}
                                                                    {post.historyData.digestion && `腸${post.historyData.digestion} `}
                                                                    {post.historyData.focus && `集中${post.historyData.focus} `}
                                                                    {post.historyData.stress && `ストレス${post.historyData.stress}`}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* プロフィール設定（PFCバランス・目標・活動係数など） */}
                                                {post.profileSettings && (
                                                    <div className={`space-y-1 ${(post.historyData || post.bodyData?.weight || post.usageDays) ? 'mt-1 pt-1 border-t border-gray-200' : ''}`}>
                                                        <span className="text-gray-400 text-xs">設定</span>
                                                        {/* 目標カロリー・PFC（g） */}
                                                        {post.profileSettings.targetCalories > 0 && (
                                                            <div className="text-xs">
                                                                <span className="text-blue-600 font-medium">目標 {post.profileSettings.targetCalories}kcal</span>
                                                                {(post.profileSettings.targetProtein || post.profileSettings.targetFat || post.profileSettings.targetCarbs) && (
                                                                    <span className="ml-2">
                                                                        <span className="text-red-500 font-medium">P{post.profileSettings.targetProtein || 0}g</span>
                                                                        <span className="text-gray-400"> / </span>
                                                                        <span className="text-yellow-500 font-medium">F{post.profileSettings.targetFat || 0}g</span>
                                                                        <span className="text-gray-400"> / </span>
                                                                        <span className="text-green-500 font-medium">C{post.profileSettings.targetCarbs || 0}g</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* 活動係数・カロリー調整・PFCバランス */}
                                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                                                            {post.profileSettings.activityMultiplier && (
                                                                <span className="text-violet-600 font-medium">活動係数×{post.profileSettings.activityMultiplier}</span>
                                                            )}
                                                            {post.profileSettings.calorieAdjustment !== 0 && post.profileSettings.calorieAdjustment !== undefined && (
                                                                <span className={`font-medium ${post.profileSettings.calorieAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    調整{post.profileSettings.calorieAdjustment > 0 ? '+' : ''}{post.profileSettings.calorieAdjustment}kcal
                                                                </span>
                                                            )}
                                                            {post.profileSettings.pfcBalance && (
                                                                <span className="text-gray-500">
                                                                    PFC比 <span className="text-red-500 font-medium">{post.profileSettings.pfcBalance.protein}</span>
                                                                    <span className="text-gray-400">/</span>
                                                                    <span className="text-yellow-500 font-medium">{post.profileSettings.pfcBalance.fat}</span>
                                                                    <span className="text-gray-400">/</span>
                                                                    <span className="text-green-500 font-medium">{post.profileSettings.pfcBalance.carb}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* PG BASE引用 */}
                                        {post.citedModule && (
                                            <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg mb-3">
                                                <p className="text-xs text-teal-800">
                                                    引用: <span className="font-semibold">{post.citedModule.title}</span>
                                                </p>
                                            </div>
                                        )}

                                        {/* アクション */}
                                        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => toggleLike(post.id, post.projectId)}
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
                                                onClick={() => handleToggleComments(post.id, post.projectId)}
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
                                            {/* 削除ボタン（自分の投稿のみ） */}
                                            <button
                                                onClick={() => handleDeletePost(post)}
                                                disabled={deletingPostId === post.id}
                                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500 ml-auto disabled:opacity-50"
                                                title="削除"
                                            >
                                                {deletingPostId === post.id ? (
                                                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Icon name="Trash2" size={18} />
                                                )}
                                            </button>
                                        </div>

                                        {/* コメントセクション */}
                                        {commentingPostId === post.id && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                {postComments[post.id] && postComments[post.id].length > 0 && (
                                                    <div className="mb-3 space-y-2 max-h-60 overflow-y-auto">
                                                        {postComments[post.id].map(comment => (
                                                            <div key={comment.id} className="bg-gray-50 rounded-lg p-2 group">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        {comment.authorAvatarUrl ? (
                                                                            <img src={comment.authorAvatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                                                {comment.author?.[0] || 'U'}
                                                                            </div>
                                                                        )}
                                                                        <span className="text-xs font-semibold text-gray-800">{comment.author}</span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {comment.createdAt?.toDate ?
                                                                                comment.createdAt.toDate().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) :
                                                                                ''}
                                                                        </span>
                                                                    </div>
                                                                    {comment.userId === userId && (
                                                                        <button
                                                                            onClick={() => handleDeleteComment(post.id, comment.id, post.projectId)}
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
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={commentingPostId === post.id ? commentText : ''}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id, post.projectId)}
                                                        placeholder="コメントを入力..."
                                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                                                    />
                                                    <button
                                                        onClick={() => handleAddComment(post.id, post.projectId)}
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
                    initialTab={profileModalInitialTab}
                    onClose={() => {
                        setProfileModalUserId(null);
                        setProfileModalInitialTab('posts');
                    }}
                />
            )}
        </div>
    );
};


// グローバルに公開
window.PGBaseView = PGBaseView;
window.CommunityPostView = CommunityPostView;
window.COMYView = COMYView;
