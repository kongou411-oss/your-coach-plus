// ===== Guide Modal Component =====
const GuideModal = ({ show, title, message, iconName, iconColor, targetSectionId, onClose }) => {
    if (!show) return null;

    const handleOK = () => {
        onClose();

        // ターゲットセクションへスクロール
        if (targetSectionId) {
            setTimeout(() => {
                const element = document.getElementById(targetSectionId);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'  // ショートカット領域内に表示
                    });
                }
            }, 300);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 slide-up">
                {/* アイコン */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${iconColor} rounded-full flex items-center justify-center`}>
                        <Icon name={iconName} size={24} className={iconColor.replace('bg-', 'text-').replace('-100', '-600')} />
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                </div>

                {/* メッセージ */}
                <p className="text-gray-700 mb-6 whitespace-pre-line">
                    {message}
                </p>

                {/* OKボタン */}
                <button
                    onClick={handleOK}
                    className={`w-full ${iconColor.replace('-100', '-600')} text-white py-3 rounded-lg font-bold hover:opacity-90 transition`}
                >
                    OK
                </button>
            </div>
        </div>
    );
};

// ===== Premium Restriction Modal Component =====
const PremiumRestrictionModal = ({ show, featureName, onClose, onUpgrade }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                {/* ヘッダー（紫グラデーション） */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                    <div className="mb-3">
                        <Icon name="Lock" size={48} className="mx-auto mb-2" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Premium会員限定</h2>
                    <p className="text-sm opacity-90">{featureName}はPremium会員専用の機能です</p>
                </div>

                {/* コンテンツ */}
                <div className="p-6 space-y-4">
                    {/* Premium会員の特典 */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Icon name="Crown" size={18} className="text-purple-600" />
                            Premium会員になると...
                        </h3>
                        <div className="space-y-2">
                            {[
                                { icon: 'BarChart3', text: '毎月100回の分析クレジット', color: 'text-indigo-600' },
                                { icon: 'BookOpen', text: 'PG BASE 教科書で理論を学習', color: 'text-green-600' },
                                { icon: 'Calendar', text: 'ルーティン機能で計画的に管理', color: 'text-purple-600' },
                                { icon: 'BookTemplate', text: '無制限のテンプレート保存', color: 'text-blue-600' },
                                { icon: 'Users', text: 'COMYで仲間と刺激し合う', color: 'text-pink-600' },
                                { icon: 'Zap', text: 'ショートカット機能で効率アップ', color: 'text-yellow-600' }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                                    <Icon name={feature.icon} size={18} className={feature.color} />
                                    <span className="text-sm text-gray-700">{feature.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 価格表示 */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">月額</p>
                        <p className="text-4xl font-bold text-purple-600 mb-1">¥740</p>
                        <p className="text-xs text-gray-600">1日あたり約24円</p>
                    </div>

                    {/* CTA ボタン */}
                    <button
                        onClick={onUpgrade}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg flex items-center justify-center gap-2"
                    >
                        <Icon name="Crown" size={20} />
                        Premium会員に登録する
                    </button>

                    {/* 閉じる */}
                    <button
                        onClick={onClose}
                        className="w-full text-gray-600 text-sm hover:text-gray-800 transition"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===== Main App Component =====
        const App = () => {
            const [user, setUser] = useState(null);
            const [loading, setLoading] = useState(true);
            const [userProfile, setUserProfile] = useState(null);
            const [usageDays, setUsageDays] = useState(0);
            const [unlockedFeatures, setUnlockedFeatures] = useState(['food']); // 食事記録は最初から開放
            const [currentStage, setCurrentStage] = useState('守');
            const [fabOpen, setFabOpen] = useState(false);
            const [showAddView, setShowAddView] = useState(false);
            const [addViewType, setAddViewType] = useState('meal');
            const [openedFromSettings, setOpenedFromSettings] = useState(false);
            const [openedFromTemplateEditModal, setOpenedFromTemplateEditModal] = useState(false); // テンプレート編集モーダルから開いたか
            const [reopenTemplateEditModal, setReopenTemplateEditModal] = useState(false); // AddItemView閉じた後にテンプレート編集モーダルを再度開く
            const [reopenTemplateEditType, setReopenTemplateEditType] = useState(null); // 再度開くテンプレート編集モーダルのタイプ
            const [editingTemplate, setEditingTemplate] = useState(null); // 編集対象のテンプレート
            const [editingMeal, setEditingMeal] = useState(null); // 編集対象の食事
            const [dailyRecord, setDailyRecord] = useState({
                meals: [],
                workouts: [],
                supplements: [],
                conditions: null
            });
            const [currentRoutine, setCurrentRoutine] = useState(null);
            // 写真解析機能は仕様書により削除（食事記録はテキスト入力のみ）
            // const [showPhotoInput, setShowPhotoInput] = useState(false);
            const [capturedPhoto, setCapturedPhoto] = useState(null);
            const [showCameraButton, setShowCameraButton] = useState(true);
            const [infoModal, setInfoModal] = useState({ show: false, title: '', content: '' });
            const [predictedData, setPredictedData] = useState(null);
            const [yesterdayRecord, setYesterdayRecord] = useState(null); // 前日の完全な記録データ

            // ローカルタイムゾーンで今日の日付を取得
            const getTodayDate = () => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const [currentDate, setCurrentDate] = useState(() => {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            });
            const [showAnalysisView, setShowAnalysisView] = useState(false); // 本日の分析
            const [showAIInput, setShowAIInput] = useState(false); // AI自然言語入力
            const [showHistoryView, setShowHistoryView] = useState(false); // 履歴（過去の分析）
            const [showHistoryV10, setShowHistoryV10] = useState(false); // 履歴グラフV10
            const [showPGBaseView, setShowPGBaseView] = useState(false);
            const [showCOMYView, setShowCOMYView] = useState(false);
            const [showSettings, setShowSettings] = useState(false);
            const [showSubscriptionView, setShowSubscriptionView] = useState(false);
            const [showStageInfo, setShowStageInfo] = useState(false);
            const [showContinuitySupport, setShowContinuitySupport] = useState(false); // 継続支援システム
            const [aiSuggestion, setAiSuggestion] = useState(null); // オートパイロットのAI提案
            const [directiveEditing, setDirectiveEditing] = useState(false);
            const [directiveText, setDirectiveText] = useState('');
            const [directiveType, setDirectiveType] = useState('meal'); // 'meal', 'exercise', 'condition'
            const [darkMode, setDarkMode] = useState(() => {
                const saved = localStorage.getItem('darkMode');
                return saved === 'true';
            });
            const [showAdminPanel, setShowAdminPanel] = useState(false);
            const [isAdmin, setIsAdmin] = useState(false);
            const [earnedBadges, setEarnedBadges] = useState([]);
            const [lastUpdate, setLastUpdate] = useState(Date.now());

            // Premium制限モーダル
            const [showPremiumRestriction, setShowPremiumRestriction] = useState(false);
            const [restrictedFeatureName, setRestrictedFeatureName] = useState('');

            // ショートカット設定
            const [shortcuts, setShortcuts] = useState(() => {
                const saved = localStorage.getItem('chevronShortcuts');
                if (saved) return JSON.parse(saved);

                // デフォルト設定（ダッシュボードのアイコンと統一）
                return [
                    { side: 'left', position: 'middle', size: 'small', order: 0, enabled: true, action: 'open_body_composition', label: '体組成', icon: 'Activity' },
                    { side: 'left', position: 'middle', size: 'small', order: 1, enabled: false, action: 'open_meal', label: '食事', icon: 'Utensils' },
                    { side: 'left', position: 'middle', size: 'small', order: 2, enabled: false, action: 'open_workout', label: '運動', icon: 'Dumbbell' },
                    { side: 'left', position: 'middle', size: 'small', order: 3, enabled: false, action: 'open_meal_photo', label: '写真解析', icon: 'Camera' },
                    { side: 'left', position: 'middle', size: 'small', order: 4, enabled: false, action: 'open_history', label: '履歴', icon: 'TrendingUp' },
                    { side: 'left', position: 'middle', size: 'small', order: 5, enabled: false, action: 'open_settings', label: '設定', icon: 'Settings' },
                    { side: 'right', position: 'middle', size: 'small', order: 0, enabled: false, action: 'open_condition', label: 'コンディション', icon: 'HeartPulse' },
                    { side: 'right', position: 'middle', size: 'small', order: 1, enabled: false, action: 'open_idea', label: '閃き', icon: 'Lightbulb' },
                    { side: 'right', position: 'middle', size: 'small', order: 2, enabled: false, action: 'open_analysis', label: '分析', icon: 'PieChart' },
                    { side: 'right', position: 'middle', size: 'small', order: 3, enabled: false, action: 'open_pgbase', label: 'PGBASE', icon: 'BookOpen' },
                    { side: 'right', position: 'middle', size: 'small', order: 4, enabled: false, action: 'open_community', label: 'COMY', icon: 'Users' }
                ];
            });

            // 誘導モーダルの状態管理
            const [showMealGuide, setShowMealGuide] = useState(false);       // オンボーディング後
            const [showTrainingGuide, setShowTrainingGuide] = useState(false); // 食事記録後
            const [showConditionGuide, setShowConditionGuide] = useState(false); // 運動記録後
            const [showAnalysisGuide, setShowAnalysisGuide] = useState(false);   // コンディション完了後
            const [showDirectiveGuide, setShowDirectiveGuide] = useState(false); // 分析閲覧後

            // トリガー状態管理
            const [triggers, setTriggers] = useState(() => {
                const saved = localStorage.getItem(STORAGE_KEYS.ONBOARDING_TRIGGERS);
                return saved ? JSON.parse(saved) : {};
            });
            const [bottomBarMenu, setBottomBarMenu] = useState(null); // 'daily', 'history', 'settings'
            const [bottomBarExpanded, setBottomBarExpanded] = useState(true); // BAB展開状態
            const [showDatePicker, setShowDatePicker] = useState(false); // 日付ピッカーモーダル
            const [calendarViewYear, setCalendarViewYear] = useState(new Date().getFullYear());
            const [calendarViewMonth, setCalendarViewMonth] = useState(new Date().getMonth() + 1);

            // AI入力関連
            const [aiInputText, setAiInputText] = useState('');
            const [aiProcessing, setAiProcessing] = useState(false);
            const [aiParsedData, setAiParsedData] = useState(null);

            // クレジット0警告モーダル
            const [showCreditWarning, setShowCreditWarning] = useState(false);

            // チュートリアル初回起動チェック
            useEffect(() => {
                // チュートリアル機能は削除されました

                // バッジ読み込み
                const badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');
                setEarnedBadges(badges);
            }, [userProfile]);

            // 管理者パネル開くイベントリスナー
            useEffect(() => {
                const handleOpenAdminPanel = () => {
                    setShowAdminPanel(true);
                };
                document.addEventListener('openAdminPanel', handleOpenAdminPanel);
                return () => document.removeEventListener('openAdminPanel', handleOpenAdminPanel);
            }, []);

            // 食事編集用グローバル関数を定義
            useEffect(() => {
                window.handleEditMeal = (meal) => {
                    console.log('🍽️ 食事編集開始:', meal);
                    setEditingMeal(meal);
                    setAddViewType('meal');
                    setShowAddView(true);
                };
                return () => {
                    delete window.handleEditMeal;
                };
            }, []);

            // URLパラメータチェック（投稿リンク対応）
            useEffect(() => {
                const urlParams = new URLSearchParams(window.location.search);
                const postId = urlParams.get('post');
                if (postId && userProfile && !loading) {
                    // 投稿リンクからアクセスした場合、COMYビューを開く
                    setTimeout(() => {
                        setShowCOMYView(true);
                    }, 100);
                }
            }, [userProfile, loading]);

            // クレジット0警告チェック（アプリ起動時のみ）
            useEffect(() => {
                const checkCredits = async () => {
                    if (!user || !userProfile) return;

                    // オンボーディング完了直後はスキップ
                    const justCompleted = sessionStorage.getItem('onboardingJustCompleted');
                    if (justCompleted) {
                        sessionStorage.removeItem('onboardingJustCompleted');
                        return;
                    }

                    // sessionStorageで既に表示済みかチェック
                    const alreadyShown = sessionStorage.getItem('creditWarningShown');
                    if (alreadyShown) return;

                    try {
                        const expData = await ExperienceService.getUserExperience(user.uid);
                        if (expData.totalCredits === 0) {
                            setShowCreditWarning(true);
                            sessionStorage.setItem('creditWarningShown', 'true');
                        }
                    } catch (error) {
                        console.error('[App] Failed to check credits:', error);
                    }
                };

                checkCredits();
            }, [user, userProfile]);

            // 履歴ページからのAI分析リクエストを受信
            useEffect(() => {
                const handleMessage = async (event) => {
                    // セキュリティチェック：同じoriginからのメッセージのみ受け入れる
                    if (event.origin !== window.location.origin) return;

                    if (event.data.type === 'REQUEST_AI_ANALYSIS') {
                        console.log('[App] AI分析リクエスト受信:', event.data);

                        const { category, subCategory, metricInfo, data, period, stats } = event.data;

                        // AI分析メッセージを生成
                        const analysisPrompt = `以下のデータを分析してください：

カテゴリ: ${category} - ${subCategory}
期間: ${period}

統計情報:
- 平均: ${stats.avg}
- 最大: ${stats.max}
- 最小: ${stats.min}
- 変化: ${stats.trend} (${stats.trendPercent}%)

データ: ${JSON.stringify(data)}

この${metricInfo.name}のデータから読み取れる傾向、改善点、アドバイスを簡潔に教えてください。`;

                        try {
                            // Gemini APIを呼び出し
                            const result = await ExperienceService.callGeminiWithCredit(
                                user.uid,
                                analysisPrompt,
                                [],
                                userProfile
                            );

                            if (result.success) {
                                alert(`AI分析結果:\n\n${result.text}`);
                                // クレジット消費後、ダッシュボードの表示を更新
                                window.dispatchEvent(new CustomEvent('creditUpdated'));
                            } else if (result.noCredits) {
                                alert('クレジットが不足しています。レベルアップでクレジットを獲得してください。');
                            } else {
                                alert('AI分析に失敗しました。もう一度お試しください。');
                            }
                        } catch (error) {
                            console.error('[App] AI分析エラー:', error);
                            alert('AI分析中にエラーが発生しました。');
                        }
                    }
                };

                window.addEventListener('message', handleMessage);
                return () => window.removeEventListener('message', handleMessage);
            }, [user, userProfile]);

            // 認証状態監視（開発モードではスキップ）
            useEffect(() => {
                if (DEV_MODE) {
                    // 開発モード: ダミーユーザーでログイン
                    const loadDevData = async () => {
                        setUser({ uid: DEV_USER_ID });
                        const profile = await DataService.getUserProfile(DEV_USER_ID);

                        if (profile) {
                            setUserProfile(profile);

                            // 開発モード: 手動設定された日数を優先
                            const manualDays = localStorage.getItem(STORAGE_KEYS.USAGE_DAYS);
                            let days;
                            if (manualDays !== null) {
                                days = parseInt(manualDays, 10);
                            } else {
                                days = calculateDaysSinceRegistration(DEV_USER_ID);
                            }
                            setUsageDays(days);

                            // 今日の記録を取得（機能開放判定に必要）
                            const today = getTodayDate();
                            const todayRecord = await DataService.getDailyRecord(DEV_USER_ID, today);

                            // 新しい機能開放システムで開放状態を計算
                            const isPremium = profile.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                            const unlocked = calculateUnlockedFeatures(DEV_USER_ID, todayRecord, isPremium);
                            setUnlockedFeatures(unlocked);

                            // 守破離の段階を更新（21日で離、7日で破）
                            if (days >= 21) setCurrentStage('離');
                            else if (days >= 7) setCurrentStage('破');
                            else setCurrentStage('守');
                        }

                        const generateDummyData = async () => {
                            // ダミーデータ生成を無効化
                            return;
                        };

                        await generateDummyData();

                        const today = getTodayDate();
                        const record = await DataService.getDailyRecord(DEV_USER_ID, today);
                        if (record) {
                            setDailyRecord(record);
                        }

                        // 前日データから予測を生成
                        const prevDayRecord = await DataService.getPreviousDayRecord(DEV_USER_ID, today);
                        if (prevDayRecord) {
                            setYesterdayRecord(prevDayRecord); // 完全な記録を保存
                            generatePredictions(prevDayRecord);
                        }

                        setLoading(false);
                    };
                    loadDevData();
                } else {
                    // 本番モード: Firebase認証
                    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
                        if (firebaseUser) {
                            setUser(firebaseUser);
                            const profile = await DataService.getUserProfile(firebaseUser.uid);
                            if (profile) {
                                setUserProfile(profile);
                                const days = calculateDaysSinceRegistration(firebaseUser.uid);
                                setUsageDays(days);

                                // 今日の記録を取得（機能開放判定に必要）
                                const today = getTodayDate();
                                const todayRecord = await DataService.getDailyRecord(firebaseUser.uid, today);

                                // 新しい機能開放システムで開放状態を計算
                                const isPremium = profile.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                const unlocked = calculateUnlockedFeatures(firebaseUser.uid, todayRecord, isPremium);
                                setUnlockedFeatures(unlocked);

                                // 守破離の段階を更新（21日で離、7日で破）
                                if (days >= 21) setCurrentStage('離');
                                else if (days >= 7) setCurrentStage('破');
                                else setCurrentStage('守');
                            }

                            const today = getTodayDate();
                            const record = await DataService.getDailyRecord(firebaseUser.uid, today);
                            if (record) {
                                setDailyRecord(record);
                            }

                            // 前日データから予測を生成
                            const prevDayRecord = await DataService.getPreviousDayRecord(firebaseUser.uid, today);
                            if (prevDayRecord) {
                                setYesterdayRecord(prevDayRecord); // 完全な記録を保存
                                generatePredictions(prevDayRecord);
                            }
                        } else {
                            setUser(null);
                            setUserProfile(null);
                        }
                        setLoading(false);
                    });

                    return () => unsubscribe();
                }
            }, []);

            // currentDateは初期化時に今日の日付が設定されているので、このuseEffectは不要
            // useEffect(() => {
            //     const today = getTodayDate();
            //     if (currentDate !== today) {
            //         setCurrentDate(today);
            //     }
            // }, []);

            // 0時の自動日付切り替え（無限ループを防ぐため一旦無効化）
            // ユーザーが手動で日付を選択できるようになったため、自動切り替えは不要
            // useEffect(() => {
            //     const checkMidnight = async () => {
            //         const now = new Date();
            //         const today = getTodayDate();
            //
            //         // 現在の表示日付が今日でない場合、handleDateChangeを使って切り替える
            //         if (currentDate !== today) {
            //             // 前日のデータを保存（既に保存されているが、念のため再保存）
            //             const userId = user?.uid || DEV_USER_ID;
            //             const currentRecord = await DataService.getDailyRecord(userId, currentDate);
            //             if (currentRecord && (currentRecord.meals?.length > 0 || currentRecord.workouts?.length > 0 || currentRecord.supplements?.length > 0 || currentRecord.conditions)) {
            //                 await DataService.saveDailyRecord(userId, currentDate, currentRecord);
            //             }
            //
            //             // handleDateChangeを使って今日に切り替え
            //             handleDateChange(today);
            //         }
            //     };
            //
            //     // 1分ごとに日付チェック（初回チェックは削除）
            //     const interval = setInterval(checkMidnight, 60000); // 60秒 = 1分
            //
            //     return () => clearInterval(interval);
            // }, []); // 依存配列を空にして無限ループを防止

            // 今日のルーティンを更新
            useEffect(() => {
                if (unlockedFeatures.includes(FEATURES.ROUTINE.id)) {
                    const savedRoutines = localStorage.getItem(STORAGE_KEYS.ROUTINES);
                    const routines = savedRoutines ? JSON.parse(savedRoutines) : [];
                    const routineStartDate = localStorage.getItem(STORAGE_KEYS.ROUTINE_START_DATE);
                    const routineActive = localStorage.getItem(STORAGE_KEYS.ROUTINE_ACTIVE) === 'true';

                    if (routineActive && routineStartDate && routines.length > 0) {
                        const startDate = new Date(routineStartDate);
                        const today = new Date();
                        const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                        const currentIndex = daysDiff % routines.length;
                        setCurrentRoutine(routines[currentIndex]);
                    } else {
                        setCurrentRoutine(null);
                    }
                } else {
                    setCurrentRoutine(null);
                }
            }, [unlockedFeatures]);

            // ショートカットの enabled を機能開放状態に連動
            useEffect(() => {
                console.log('🔄 [Shortcut Update] useEffect実行');
                console.log('  現在のunlockedFeatures:', unlockedFeatures);

                setShortcuts(prevShortcuts => {
                    console.log('  更新前のショートカット数:', prevShortcuts.length);

                    const updatedShortcuts = prevShortcuts.map(shortcut => {
                        // 体組成は常に有効
                        if (shortcut.action === 'open_body_composition') {
                            return { ...shortcut, enabled: true };
                        }
                        // 食事のショートカット
                        if (shortcut.action === 'open_meal') {
                            const enabled = unlockedFeatures.includes('food');
                            console.log(`  - 食事: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        // 運動のショートカット
                        if (shortcut.action === 'open_workout') {
                            const enabled = unlockedFeatures.includes('training');
                            console.log(`  - 運動: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        // コンディションのショートカット
                        if (shortcut.action === 'open_condition') {
                            const enabled = unlockedFeatures.includes('condition');
                            console.log(`  - コンディション: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        // 閃きは初回分析後
                        if (shortcut.action === 'open_idea') {
                            const enabled = unlockedFeatures.includes('analysis');
                            console.log(`  - 閃き: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        // 分析のショートカット
                        if (shortcut.action === 'open_analysis') {
                            const enabled = unlockedFeatures.includes('analysis');
                            console.log(`  - 分析: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        // 履歴のショートカット
                        if (shortcut.action === 'open_history') {
                            const enabled = unlockedFeatures.includes('history');
                            console.log(`  - 履歴: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        // PGBASEのショートカット
                        if (shortcut.action === 'open_pgbase') {
                            const enabled = unlockedFeatures.includes('pg_base');
                            console.log(`  - PGBASE: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        // COMYのショートカット
                        if (shortcut.action === 'open_community') {
                            const enabled = unlockedFeatures.includes('community');
                            console.log(`  - COMY: enabled=${enabled} (before: ${shortcut.enabled})`);
                            return { ...shortcut, enabled };
                        }
                        return shortcut;
                    });

                    console.log('  更新後のショートカット:', updatedShortcuts.map(s => ({
                        action: s.action,
                        label: s.label,
                        enabled: s.enabled
                    })));

                    return updatedShortcuts;
                });
            }, [unlockedFeatures]);

            // 日付変更ハンドラ
            const handleDateChange = async (newDate) => {
                setCurrentDate(newDate);
                // 新しい日付のデータを読み込む
                const userId = user?.uid || DEV_USER_ID;
                const record = await DataService.getDailyRecord(userId, newDate);
                setDailyRecord(record || { meals: [], workouts: [], supplements: [], conditions: null });

                // 前日のデータも読み込む（予測用）
                const prevRecord = await DataService.getPreviousDayRecord(userId, newDate);
                setYesterdayRecord(prevRecord);

                // 予測データを生成
                if (prevRecord) {
                    generatePredictions(prevRecord);
                } else {
                    setPredictedData(null);
                }
            };

            // 予測データ生成関数
            const generatePredictions = (previousRecord) => {
                const predictions = {
                    commonMeals: [],
                    commonWorkouts: [],
                    commonSupplements: []
                };

                // 前日の頻出食材を抽出
                if (previousRecord.meals) {
                    const foodFrequency = {};
                    previousRecord.meals.forEach(meal => {
                        meal.items?.forEach(item => {
                            foodFrequency[item.name] = (foodFrequency[item.name] || 0) + 1;
                        });
                    });

                    // 頻度が高い順にソート
                    predictions.commonMeals = Object.entries(foodFrequency)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([name]) => name);
                }

                // 前日のトレーニング種目を抽出
                if (previousRecord.workouts) {
                    previousRecord.workouts.forEach(workout => {
                        workout.exercises?.forEach(exercise => {
                            if (!predictions.commonWorkouts.includes(exercise.name)) {
                                predictions.commonWorkouts.push(exercise.name);
                            }
                        });
                    });
                }

                // 前日のサプリメントを抽出
                if (previousRecord.supplements) {
                    previousRecord.supplements.forEach(supp => {
                        supp.items?.forEach(item => {
                            if (!predictions.commonSupplements.includes(item.name)) {
                                predictions.commonSupplements.push(item.name);
                            }
                        });
                    });
                }

                setPredictedData(predictions);
            };

            // 前日データの自動展開
            // loadPredictedData function moved to DashboardView component

            // 初回読み込み時のデータ取得（handleDateChangeで日付変更時は処理されるので、ここでは初回のみ）
            useEffect(() => {
                const loadDateRecord = async () => {
                    if (!user) return; // ユーザーがいない場合はスキップ

                    const userId = user?.uid || DEV_USER_ID;
                    const record = await DataService.getDailyRecord(userId, currentDate);
                    setDailyRecord(record || { meals: [], workouts: [], supplements: [], conditions: null });

                    // 前日のデータも読み込む（予測用）
                    const prevRecord = await DataService.getPreviousDayRecord(userId, currentDate);
                    setYesterdayRecord(prevRecord);

                    // 予測データを生成
                    if (prevRecord) {
                        generatePredictions(prevRecord);
                    }
                };

                loadDateRecord();
            }, [user]); // userが確定したら一度だけ実行

            // This useEffect was moved to DashboardView to follow the moved function.

            // クイックアクションハンドラをグローバルに設定
            useEffect(() => {
                window.handleQuickAction = (action) => {
                    switch (action) {
                        case 'meal':
                            setAddViewType('meal');
                            setShowAddView(true);
                            setBottomBarMenu(null);
                            setBottomBarExpanded(false);
                            break;
                        case 'supplement':
                            setAddViewType('supplement');
                            setShowAddView(true);
                            setBottomBarMenu(null);
                            setBottomBarExpanded(false);
                            break;
                        case 'workout':
                            setAddViewType('workout');
                            setShowAddView(true);
                            setBottomBarMenu(null);
                            setBottomBarExpanded(false);
                            break;
                        case 'condition':
                            setAddViewType('condition');
                            setShowAddView(true);
                            setBottomBarMenu(null);
                            setBottomBarExpanded(false);
                            break;
                        case 'analysis':
                            setShowAnalysisView(true);
                            setBottomBarMenu(null);
                            setBottomBarExpanded(false);
                            break;
                        case 'history':
                            setShowHistoryView(true);
                            setBottomBarMenu(null);
                            setBottomBarExpanded(false);
                            break;
                        case 'history_v10':
                            setShowHistoryV10(true);
                            setBottomBarMenu(null);
                            setBottomBarExpanded(false);
                            break;
                    }
                };
                return () => {
                    delete window.handleQuickAction;
                };
            }, []);

            // FABメニュー項目クリック
            const handleFABItemClick = (type) => {
                // 分析
                if (type === 'analysis') {
                    // コンディション記録が完了しているかチェック（6項目全て必須）
                    if (!ConditionUtils.isFullyRecorded(dailyRecord)) {
                        alert('この機能はコンディション記録を完了後に開放されます\n（睡眠時間・睡眠の質・食欲・消化・集中力・ストレスの6項目全て）');
                        return;
                    }
                    setShowAnalysisView(true);
                    setFabOpen(false);
                    return;
                }

                // PG BASE
                if (type === 'pgbase') {
                    if (!unlockedFeatures.includes('pg_base')) {
                        const accessCheck = checkPremiumAccessRequired(
                            DEV_MODE ? DEV_USER_ID : user?.uid,
                            'pg_base',
                            userProfile
                        );
                        if (!accessCheck.allowed) {
                            setRestrictedFeatureName('PG BASE');
                            setShowPremiumRestriction(true);
                            setFabOpen(false);
                            return;
                        }
                    }
                    setShowPGBaseView(true);
                    setFabOpen(false);
                    return;
                }

                // 履歴
                if (type === 'history') {
                    if (!unlockedFeatures.includes('history_graph')) {
                        const accessCheck = checkPremiumAccessRequired(
                            DEV_MODE ? DEV_USER_ID : user?.uid,
                            'history',
                            userProfile
                        );
                        if (!accessCheck.allowed) {
                            setRestrictedFeatureName('履歴');
                            setShowPremiumRestriction(true);
                            setFabOpen(false);
                            return;
                        }
                    }
                    setShowHistoryView(true);
                    setFabOpen(false);
                    return;
                }

                // COMY
                if (type === 'comy') {
                    if (!unlockedFeatures.includes('community')) {
                        const accessCheck = checkPremiumAccessRequired(
                            DEV_MODE ? DEV_USER_ID : user?.uid,
                            'community',
                            userProfile
                        );
                        if (!accessCheck.allowed) {
                            setRestrictedFeatureName('COMY');
                            setShowPremiumRestriction(true);
                            setFabOpen(false);
                            return;
                        }
                    }
                    setShowCOMYView(true);
                    setFabOpen(false);
                    return;
                }

                // 食事・トレーニング・コンディション
                const featureMap = {
                    'meal': 'food',
                    'workout': 'training',
                    'condition': 'condition'
                };

                const featureId = featureMap[type];
                if (!unlockedFeatures.includes(featureId)) {
                    const feature = Object.values(FEATURES).find(f => f.id === featureId);
                    if (feature) {
                        const triggerMessages = {
                            'after_meal': '最初の食事を記録すると開放されます',
                            'after_training': '最初のトレーニングを記録すると開放されます',
                            'after_condition': '最初のコンディションを記録すると開放されます'
                        };
                        alert(triggerMessages[feature.trigger] || `この機能はまだ開放されていません`);
                    }
                    return;
                }

                setAddViewType(type);
                setShowAddView(true);
                setFabOpen(false);
            };

            // 写真撮影
            const handlePhotoCapture = () => {
                setShowPhotoInput(true);
            };

            // ショートカットアクション処理
            const handleShortcutClick = async (action) => {
                switch (action) {
                    case 'open_body_composition':
                        // 体組成セクションへスクロール（ルーティン下に余白を作る）
                        setTimeout(() => {
                            const element = document.getElementById('body-composition-section');
                            if (element) {
                                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                                const offsetPosition = elementPosition - 80; // ルーティン表示の下に余白
                                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                            }
                        }, 100);
                        break;
                    case 'open_condition':
                        // コンディションセクションへスクロール（ルーティン下に余白を作る）
                        setTimeout(() => {
                            const element = document.getElementById('condition-section');
                            if (element) {
                                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                                const offsetPosition = elementPosition - 80; // ルーティン表示の下に余白
                                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                            }
                        }, 100);
                        break;
                    case 'open_idea':
                        // 閃き（指示書）セクションへスクロール（ルーティン下に余白を作る）
                        setTimeout(() => {
                            const element = document.getElementById('directive-section');
                            if (element) {
                                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                                const offsetPosition = elementPosition - 80; // ルーティン表示の下に余白
                                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                            }
                        }, 100);
                        break;
                    case 'open_meal':
                        setAddViewType('meal');
                        setShowAddView(true);
                        setBottomBarExpanded(false);
                        break;
                    case 'open_meal_photo':
                        setAddViewType('meal');
                        setShowAddView(true);
                        setBottomBarExpanded(false);
                        break;
                    case 'open_workout':
                        setAddViewType('workout');
                        setShowAddView(true);
                        setBottomBarExpanded(false);
                        break;
                    case 'open_analysis':
                        setShowAnalysisView(true);
                        setBottomBarExpanded(false);
                        break;
                    case 'open_history':
                        setShowHistoryV10(true);
                        setBottomBarExpanded(false);
                        break;
                    case 'open_pgbase':
                        const pgBaseAccessCheck = checkPremiumAccessRequired(
                            DEV_MODE ? DEV_USER_ID : user?.uid,
                            'pg_base',
                            userProfile
                        );
                        if (pgBaseAccessCheck.allowed) {
                            setShowPGBaseView(true);
                            setBottomBarExpanded(false);
                        } else {
                            setRestrictedFeatureName('PG BASE');
                            setShowPremiumRestriction(true);
                        }
                        break;
                    case 'open_community':
                        const comyAccessCheck = checkPremiumAccessRequired(
                            DEV_MODE ? DEV_USER_ID : user?.uid,
                            'community',
                            userProfile
                        );
                        if (comyAccessCheck.allowed) {
                            setShowCOMYView(true);
                            setBottomBarExpanded(false);
                        } else {
                            setRestrictedFeatureName('COMY');
                            setShowPremiumRestriction(true);
                        }
                        break;
                    case 'open_settings':
                        setShowSettings(true);
                        setBottomBarExpanded(false);
                        break;
                }
            };

            // 情報モーダルコンポーネント
            const InfoModal = () => {
                if (!infoModal.show) return null;

                return (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={() => setInfoModal({ show: false, title: '', content: '' })}>
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden slide-up" onClick={(e) => e.stopPropagation()}>
                            {/* ヘッダー */}
                            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center z-10">
                                <h3 className="font-bold text-lg">{infoModal.title}</h3>
                                <button onClick={() => setInfoModal({ show: false, title: '', content: '' })} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1">
                                    <Icon name="X" size={20} />
                                </button>
                            </div>

                            {/* コンテンツ */}
                            <div className="overflow-y-auto max-h-[calc(85vh-4rem)] p-6">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">{infoModal.content}</div>
                            </div>
                        </div>
                    </div>
                );
            };

            // ログイン画面
            if (loading) {
                return (
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="text-center">
                            <Icon name="Loader" size={48} className="animate-spin text-indigo-600 mx-auto mb-4" />
                            <p className="text-gray-600">読み込み中...</p>
                        </div>
                    </div>
                );
            }

            if (!user) {
                return <LoginScreen />;
            }

            if (!userProfile) {
                return <OnboardingScreen user={user} onComplete={(profile) => {
                    setUserProfile(profile);
                    // オンボーディング完了フラグを設定（クレジット不足モーダルを表示しない）
                    sessionStorage.setItem('onboardingJustCompleted', 'true');
                    // オンボーディング完了後、食事記録誘導モーダルを表示
                    setTimeout(() => {
                        setShowMealGuide(true);
                    }, 500);
                }} />;
            }

            // LBM計算
            const lbm = userProfile.leanBodyMass || LBMUtils.calculateLBM(userProfile.weight, userProfile.bodyFatPercentage || 15);

            const customPFCParam = userProfile.proteinRatio && userProfile.fatRatioPercent && userProfile.carbRatio ? {
                P: userProfile.proteinRatio,
                F: userProfile.fatRatioPercent,
                C: userProfile.carbRatio
            } : null;

            const targetPFC = LBMUtils.calculateTargetPFC(
                userProfile.tdeeBase || 2200,
                userProfile.weightChangePace || 0,
                lbm,
                userProfile.style || '一般',
                userProfile.purpose || 'メンテナンス',
                userProfile.dietStyle || 'バランス',
                userProfile.calorieAdjustment,
                customPFCParam
            );

            // 進捗計算
            const totalFeatures = Object.keys(FEATURES).length;
            const progress = (unlockedFeatures.length / totalFeatures) * 100;

            return (
                <div className="min-h-screen bg-gray-50 pb-24">
                    {/* レベル・経験値バナー */}
                    <LevelBanner user={user} setInfoModal={setInfoModal} />

                    {/* 日付ナビゲーション＋ルーティン統合ヘッダー */}
                    <div className="bg-white shadow-md sticky top-0 z-30">
                        {/* 日付ナビゲーション */}
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <button
                                onClick={() => {
                                    const [year, month, day] = currentDate.split('-').map(Number);
                                    const date = new Date(year, month - 1, day);
                                    date.setDate(date.getDate() - 1);
                                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                    handleDateChange(dateStr);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <Icon name="ChevronLeft" size={20} className="text-gray-600" />
                            </button>

                            <div className="flex items-center gap-2">
                                <div
                                    onClick={() => {
                                        if (!showDatePicker) {
                                            // モーダルを開く時、カレンダーの表示を現在選択中の日付の月にリセット
                                            const [year, month] = currentDate.split('-').map(Number);
                                            setCalendarViewYear(year);
                                            setCalendarViewMonth(month);
                                        }
                                        setShowDatePicker(!showDatePicker);
                                    }}
                                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition flex items-center gap-2"
                                >
                                    <Icon name="Calendar" size={20} className="text-indigo-600" />
                                    <span className="font-bold text-gray-800">
                                        {(() => {
                                            const [year, month, day] = currentDate.split('-').map(Number);
                                            const date = new Date(year, month - 1, day);
                                            return date.toLocaleDateString('ja-JP', {
                                                month: 'long',
                                                day: 'numeric',
                                                weekday: 'short'
                                            });
                                        })()}
                                    </span>
                                </div>
                                {(() => {
                                    const today = new Date();
                                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                    if (currentDate !== todayStr) {
                                        return (
                                            <button
                                                onClick={() => handleDateChange(todayStr)}
                                                className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition font-medium"
                                            >
                                                今日へ
                                            </button>
                                        );
                                    } else {
                                        return (
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">今日</span>
                                        );
                                    }
                                })()}
                            </div>

                            <button
                                onClick={() => {
                                    const [year, month, day] = currentDate.split('-').map(Number);
                                    const date = new Date(year, month - 1, day);
                                    date.setDate(date.getDate() + 1);
                                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                    handleDateChange(dateStr);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition"
                            >
                                <Icon name="ChevronRight" size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* ルーティン情報（固定表示） - 12日で開放 */}
                        {unlockedFeatures.includes(FEATURES.ROUTINE.id) && (() => {
                            const savedRoutines = localStorage.getItem(STORAGE_KEYS.ROUTINES);
                            const routines = savedRoutines ? JSON.parse(savedRoutines) : [];
                            const routineStartDate = localStorage.getItem(STORAGE_KEYS.ROUTINE_START_DATE);
                            const routineActive = localStorage.getItem(STORAGE_KEYS.ROUTINE_ACTIVE) === 'true';

                            if (routineActive && routineStartDate && routines.length > 0) {
                                const startDate = new Date(routineStartDate);
                                const today = new Date();
                                const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                                const currentIndex = daysDiff % routines.length;
                                const currentRoutine = routines[currentIndex];

                                if (currentRoutine) {
                                    return (
                                        <div className="w-full px-4 py-2 flex items-center gap-3 border-t">
                                            <Icon name="Repeat" size={20} className="text-purple-600" />
                                            <span className="text-xs text-gray-500">Day {currentIndex + 1}/{routines.length}</span>
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-900">{currentRoutine.name}</span>
                                                </div>
                                            </div>
                                            {!currentRoutine.isRestDay && currentRoutine.splitType && (
                                                <span className="text-sm font-bold px-3 py-1 bg-purple-100 text-purple-700 rounded-lg">{currentRoutine.splitType}</span>
                                            )}
                                            {currentRoutine.isRestDay && (
                                                <span className="text-sm font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-lg">休息日</span>
                                            )}
                                        </div>
                                    );
                                }
                            }

                            return null;
                        })()}
                    </div>

                    {/* 日付ピッカーモーダル */}
                    {showDatePicker && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4"
                            onClick={() => setShowDatePicker(false)}
                        >
                            <div
                                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* ヘッダー */}
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon name="Calendar" size={24} />
                                        <h3 className="font-bold text-lg">日付を選択</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowDatePicker(false)}
                                        className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                {/* カレンダー本体 */}
                                <div className="p-4">
                                    {(() => {
                                        const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number);

                                        // 月の初日と最終日を取得
                                        const firstDay = new Date(calendarViewYear, calendarViewMonth - 1, 1);
                                        const lastDay = new Date(calendarViewYear, calendarViewMonth, 0);
                                        const daysInMonth = lastDay.getDate();
                                        const startDayOfWeek = firstDay.getDay(); // 0=日曜日

                                        // 今日の日付
                                        const today = new Date();
                                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                                        // 日付セル作成
                                        const days = [];
                                        // 前月の空白
                                        for (let i = 0; i < startDayOfWeek; i++) {
                                            days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                                        }
                                        // 当月の日付
                                        for (let day = 1; day <= daysInMonth; day++) {
                                            const dateStr = `${calendarViewYear}-${String(calendarViewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const isSelected = dateStr === currentDate;
                                            const isToday = dateStr === todayStr;

                                            days.push(
                                                <button
                                                    key={day}
                                                    onClick={() => {
                                                        handleDateChange(dateStr);
                                                        setShowDatePicker(false);
                                                    }}
                                                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition
                                                        ${isSelected
                                                            ? 'bg-indigo-600 text-white shadow-md'
                                                            : isToday
                                                            ? 'bg-indigo-100 text-indigo-700 font-bold'
                                                            : 'hover:bg-gray-100 text-gray-700'
                                                        }
                                                    `}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        }

                                        return (
                                            <div>
                                                {/* 月選択ヘッダー */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <button
                                                        onClick={() => {
                                                            if (calendarViewMonth === 1) {
                                                                setCalendarViewMonth(12);
                                                                setCalendarViewYear(calendarViewYear - 1);
                                                            } else {
                                                                setCalendarViewMonth(calendarViewMonth - 1);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-gray-100 rounded-full transition"
                                                    >
                                                        <Icon name="ChevronLeft" size={20} />
                                                    </button>

                                                    <div className="font-bold text-lg">
                                                        {calendarViewYear}年 {calendarViewMonth}月
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            if (calendarViewMonth === 12) {
                                                                setCalendarViewMonth(1);
                                                                setCalendarViewYear(calendarViewYear + 1);
                                                            } else {
                                                                setCalendarViewMonth(calendarViewMonth + 1);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-gray-100 rounded-full transition"
                                                    >
                                                        <Icon name="ChevronRight" size={20} />
                                                    </button>
                                                </div>

                                                {/* 曜日ヘッダー */}
                                                <div className="grid grid-cols-7 gap-1 mb-2">
                                                    {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
                                                        <div
                                                            key={day}
                                                            className={`text-center text-xs font-semibold py-2 ${
                                                                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-600'
                                                            }`}
                                                        >
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* カレンダーグリッド */}
                                                <div className="grid grid-cols-7 gap-1">
                                                    {days}
                                                </div>

                                                {/* 今日に戻るボタン */}
                                                <button
                                                    onClick={() => {
                                                        handleDateChange(todayStr);
                                                        setShowDatePicker(false);
                                                    }}
                                                    className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                                                >
                                                    今日に戻る
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ルーティンセクション */}
                    <div className="px-4 pt-4 space-y-3">
                        {/* ルーティン表示 */}
                    </div>

                    {/* メインコンテンツ */}
                    <div className="p-4 pb-32">
                        <DashboardView
                            dailyRecord={dailyRecord}
                            targetPFC={targetPFC}
                            unlockedFeatures={unlockedFeatures}
                            setUnlockedFeatures={setUnlockedFeatures}
                            profile={userProfile}
                            setInfoModal={setInfoModal}
                            yesterdayRecord={yesterdayRecord}
                            setDailyRecord={setDailyRecord}
                            user={user}
                            currentDate={currentDate}
                            onDateChange={handleDateChange}
                            triggers={triggers}
                            shortcuts={shortcuts}
                            onShortcutClick={handleShortcutClick}
                            onFeatureUnlocked={(featureId) => {
                                if (featureId === 'analysis') {
                                    setShowAnalysisGuide(true);
                                }
                            }}
                            onDeleteItem={async (type, itemId) => {
                                // 現在のstateから削除（DBから再読み込みしない）
                                const updatedRecord = { ...dailyRecord };

                                if (type === 'meal') {
                                    updatedRecord.meals = dailyRecord.meals?.filter(m => m.id !== itemId);
                                } else if (type === 'workout') {
                                    updatedRecord.workouts = dailyRecord.workouts?.filter(w => w.id !== itemId);
                                }

                                // state更新とDB保存
                                setDailyRecord(updatedRecord);
                                await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
                            }}
                        />
                    </div>

                    {/* 食事編集モーダル（EditMealModal） */}
                    {editingMeal && addViewType === 'meal' && (
                        <EditMealModal
                            meal={editingMeal}
                            onClose={() => {
                                setEditingMeal(null);
                                setShowAddView(false);
                            }}
                            onUpdate={async (updatedMeal, keepModalOpen = true) => {
                                const userId = user?.uid || DEV_USER_ID;
                                const today = getTodayDate(); // today変数を定義
                                try {
                                    // 表示中の日付（currentDate）の記録を取得
                                    const currentRecord = await DataService.getDailyRecord(userId, currentDate);
                                    let updatedRecord = currentRecord || { meals: [], workouts: [], supplements: [], conditions: null };

                                    // 元の食事を見つけて削除し、新しい食事を追加（上書き）
                                    const mealIndex = updatedRecord.meals.findIndex(m =>
                                        m.timestamp === editingMeal.timestamp && m.name === editingMeal.name
                                    );

                                    if (mealIndex !== -1) {
                                        // 元の食事を削除
                                        updatedRecord.meals.splice(mealIndex, 1);
                                    }

                                    // 新しい食事を追加（timestampは維持）
                                    const finalMeal = {
                                        ...updatedMeal,
                                        timestamp: editingMeal.timestamp // 元のタイムスタンプを維持
                                    };
                                    updatedRecord.meals.push(finalMeal);

                                    // 保存
                                    await DataService.saveDailyRecord(userId, currentDate, updatedRecord);

                                    // 状態を更新（即座にダッシュボードに反映）
                                    setDailyRecord(updatedRecord);

                                    // モーダルを維持する場合、editingMealを更新
                                    if (keepModalOpen) {
                                        setEditingMeal(finalMeal);
                                    } else {
                                        // モーダルを閉じる
                                        setEditingMeal(null);
                                        setShowAddView(false);
                                        alert('食事を更新しました！');
                                    }
                                } catch (error) {
                                    console.error('食事更新エラー:', error);
                                    alert('食事の更新に失敗しました。');
                                }
                            }}
                        />
                    )}

                    {/* 追加ビュー */}
                    {showAddView && !editingMeal && (
                        <AddItemView
                            type={addViewType}
                            editingTemplate={editingTemplate}
                            editingMeal={editingMeal}
                            onClose={() => {
                                setShowAddView(false);
                                setEditingTemplate(null); // 編集テンプレートをクリア
                                setEditingMeal(null); // 編集食事をクリア
                                if (openedFromSettings) {
                                    setShowSettings(true);
                                    setOpenedFromSettings(false);
                                    // テンプレート編集モーダルから開いた場合は、そのモーダルに戻るフラグを設定
                                    if (openedFromTemplateEditModal) {
                                        setReopenTemplateEditModal(true);
                                        setReopenTemplateEditType(addViewType);
                                        setOpenedFromTemplateEditModal(false);
                                    }
                                }
                            }}
                            predictedData={predictedData}
                            unlockedFeatures={unlockedFeatures}
                            user={user}
                            userProfile={userProfile}
                            currentRoutine={currentRoutine}
                            usageDays={usageDays}
                            dailyRecord={dailyRecord}
                            onAdd={async (item) => {
                                const userId = user?.uid || DEV_USER_ID;

                                try {
                                    // 表示中の日付（currentDate）に記録を保存
                                    const currentRecord = await DataService.getDailyRecord(userId, currentDate);
                                    let updatedRecord = currentRecord || { meals: [], workouts: [], supplements: [], conditions: null };

                                    if (addViewType === 'meal') {
                                        updatedRecord.meals = [...(updatedRecord.meals || []), item];
                                    } else if (addViewType === 'workout') {
                                        updatedRecord.workouts = [...(updatedRecord.workouts || []), item];
                                    } else if (addViewType === 'supplement') {
                                        updatedRecord.supplements = [...(updatedRecord.supplements || []), item];
                                    } else if (addViewType === 'condition') {
                                        updatedRecord.conditions = item;
                                    }

                                    await DataService.saveDailyRecord(userId, currentDate, updatedRecord);
                                    setDailyRecord(updatedRecord);
                                    setLastUpdate(Date.now());

                                    // 新しい機能開放システム：記録追加後に完了チェックと機能開放状態を再計算
                                    const oldUnlocked = [...unlockedFeatures];

                                    await checkAndCompleteFeatures(userId, updatedRecord);
                                    const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                    const newUnlocked = calculateUnlockedFeatures(userId, updatedRecord, isPremium);
                                    setUnlockedFeatures(newUnlocked);

                                    // 新しく開放された機能があれば誘導モーダルを表示
                                    if (!oldUnlocked.includes('training') && newUnlocked.includes('training')) {
                                        setShowTrainingGuide(true);
                                    } else if (!oldUnlocked.includes('condition') && newUnlocked.includes('condition')) {
                                        setShowConditionGuide(true);
                                    } else if (!oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                        setShowAnalysisGuide(true);
                                    }

                                    setShowAddView(false);
                                    if (openedFromSettings) {
                                        setShowSettings(true);
                                        setOpenedFromSettings(false);
                                    }
                                } catch (error) {
                                    console.error('onAddエラー:', error);
                                }
                            }}
                            userProfile={userProfile}
                        />
                    )}

                    {/* 写真入力オーバーレイ - 仕様書により削除（食事記録はテキスト入力のみ） */}
                    {/* カメラFABボタン - 仕様書により削除 */}

                    {/* 分析ビュー */}
                    {showAnalysisView && (
                        <AnalysisView
                            onClose={async () => {
                                setShowAnalysisView(false);

                                // 新しい機能開放システム：分析を閲覧したら完了マーク
                                const userId = user?.uid || DEV_USER_ID;
                                const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;

                                // 常にunlockedFeaturesを再計算（機能開放状態を最新に保つ）
                                const unlocked = calculateUnlockedFeatures(userId, dailyRecord, isPremium);
                                setUnlockedFeatures(unlocked);
                                console.log('[App] Updated unlocked features after analysis:', unlocked);

                                // 初回分析の場合のみ、追加の処理
                                if (!isFeatureCompleted(userId, 'analysis')) {
                                    await markFeatureCompleted(userId, 'analysis');

                                    // 分析完了後、指示書が既に開放されていない場合のみモーダルを表示
                                    if (!isFeatureCompleted(userId, 'directive')) {
                                        setTimeout(() => {
                                            setShowDirectiveGuide(true);
                                        }, 500);
                                    }
                                }
                            }}
                            userId={user.uid}
                            userProfile={userProfile}
                            dailyRecord={dailyRecord}
                            targetPFC={targetPFC}
                            onUpgradeClick={() => {
                                setShowAnalysisView(false);
                                setShowSubscriptionView(true);
                            }}
                        />
                    )}

                    {/* 履歴ビュー */}
                    {showHistoryView && (
                        <HistoryView
                            onClose={() => setShowHistoryView(false)}
                            userId={user.uid}
                            userProfile={userProfile}
                            lastUpdate={lastUpdate}
                            setInfoModal={setInfoModal}
                        />
                    )}

                    {/* 履歴グラフV10ビュー */}
                    {showHistoryV10 && (
                        <HistoryV10View
                            onClose={() => setShowHistoryV10(false)}
                            userId={user.uid}
                            userProfile={userProfile}
                        />
                    )}

                    {/* AIコーチビュー */}
                    {/* AICoachView は AnalysisView に統合 */}

                    {/* COMYビュー */}
                    {showCOMYView && (
                        <COMYView
                            onClose={() => setShowCOMYView(false)}
                            userId={user.uid}
                            userProfile={userProfile}
                            usageDays={usageDays}
                            historyData={(() => {
                                // LocalStorageから全記録データを取得
                                const saved = localStorage.getItem(STORAGE_KEYS.DAILY_RECORDS);
                                return saved ? JSON.parse(saved) : {};
                            })()}
                        />
                    )}

                    {/* 管理者パネル */}
                    {showAdminPanel && (
                        <AdminPanel
                            onClose={() => setShowAdminPanel(false)}
                        />
                    )}

                    {/* 統合継続支援システム */}
                    {showContinuitySupport && (
                        <ContinuitySupportView
                            onClose={() => setShowContinuitySupport(false)}
                            userProfile={userProfile}
                            dailyRecord={dailyRecord}
                            targetPFC={targetPFC}
                            aiSuggestion={aiSuggestion}
                            onAutopilotRequest={async () => {
                                // Cloud Functionsを呼び出してAI提案を取得
                                // 現時点ではモック実装
                                const mockSuggestion = {
                                    action: 'プロテインを1杯だけ飲みませんか？',
                                    reason: 'タンパク質が不足しています。この簡単なアクションで目標に近づけます。'
                                };
                                setAiSuggestion(mockSuggestion);
                            }}
                            onMinimumTask={() => {
                                // ミニマムタスク実行
                                const today = getTodayDate();
                                // タスク完了を記録
                                alert(`ミニマムタスク「${userProfile.minimumTask || '腕立て1回'}」を完了しました！素晴らしいです！`);
                                setShowContinuitySupport(false);
                            }}
                            onCheckIn={async () => {
                                // セーフティ・チェックイン
                                const userId = user?.uid || DEV_USER_ID;
                                await DataService.saveDailyRecord(userId, currentDate, {
                                    ...dailyRecord,
                                    checkInStatus: true,
                                    checkInTime: new Date().toISOString()
                                });
                                alert('継続の意思を記録しました。休息もトレーニングの一部です。明日も頑張りましょう！');
                                setShowContinuitySupport(false);
                            }}
                        />
                    )}

                    {/* PG BASEビュー */}
                    {showPGBaseView && (
                        <PGBaseView
                            onClose={() => setShowPGBaseView(false)}
                            userId={user.uid}
                            userProfile={userProfile}
                        />
                    )}

                    {/* AI自然言語入力モーダル */}
                    {showAIInput && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
                                <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon name="Sparkles" size={24} />
                                        <h2 className="text-xl font-bold">AI記録アシスタント</h2>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowAIInput(false);
                                            setAiInputText('');
                                            setAiParsedData(null);
                                        }}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
                                    >
                                        <Icon name="X" size={20} />
                                    </button>
                                </div>

                                <div className="p-6">
                                    {!aiParsedData ? (
                                        <>
                                            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                                <div className="flex items-start gap-2 mb-2">
                                                    <Icon name="Info" size={18} className="text-purple-600 mt-0.5" />
                                                    <p className="text-sm text-purple-900 font-semibold">使い方</p>
                                                </div>
                                                <p className="text-sm text-purple-700 ml-6">
                                                    食事、運動、サプリを自然な言葉で入力してください。<br/>
                                                    AIが自動で記録に変換します。
                                                </p>
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    記録内容を入力
                                                </label>
                                                <textarea
                                                    value={aiInputText}
                                                    onChange={(e) => setAiInputText(e.target.value)}
                                                    placeholder="例: 朝食に鶏むね肉200g、白米150g、卵2個食べた。ベンチプレス80kgを10回3セット。プロテイン25g飲んだ。"
                                                    className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                                                    disabled={aiProcessing}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (!aiInputText.trim()) {
                                                            alert('記録内容を入力してください');
                                                            return;
                                                        }

                                                        setAiProcessing(true);
                                                        try {
                                                            // Gemini APIで自然言語を構造化データに変換
                                                            const response = await fetch(
                                                                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
                                                                {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        contents: [{
                                                                            parts: [{
                                                                                text: `あなたは栄養とトレーニングの記録を構造化するアシスタントです。

以下のユーザー入力から、食事・運動の記録を抽出してJSON形式で返してください。

ユーザー入力:
${aiInputText}

出力形式（JSONのみ、説明不要）:
{
  "meals": [
    {
      "name": "食材名",
      "amount": グラム数（数値）
    }
  ],
  "exercises": [
    {
      "name": "種目名",
      "weight": 重量kg（数値、自重なら0）,
      "reps": 回数（数値）,
      "sets": セット数（数値）,
      "rom": 可動距離cm（数値、不明なら30）,
      "tut": TUT秒（数値、不明なら60）
    }
  ],
  "supplements": [
    {
      "name": "サプリ名",
      "amount": グラム数（数値）
    }
  ]
}

注意:
- 食材はnameとamountのみ抽出（PFCは後でデータベースから取得）
- 運動の重量は自重なら0
- 各配列は該当項目がなければ空配列[]
- JSON形式のみ返す`
                                                                            }]
                                                                        }],
                                                                        generationConfig: {
                                                                            temperature: 0.2,
                                                                            topK: 1,
                                                                            topP: 1,
                                                                            maxOutputTokens: 2048,
                                                                        }
                                                                    })
                                                                }
                                                            );

                                                            const data = await response.json();
                                                            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                                                            // JSONを抽出（```json ... ``` または { ... }）
                                                            const jsonMatch = aiText.match(/```json\n([\s\S]*?)\n```/) || aiText.match(/(\{[\s\S]*\})/);
                                                            if (!jsonMatch) {
                                                                throw new Error('AIからの応答を解析できませんでした');
                                                            }

                                                            const parsedData = JSON.parse(jsonMatch[1]);

                                                            // 食事データにPFC値を追加（データベースから取得）
                                                            if (parsedData.meals && parsedData.meals.length > 0) {
                                                                parsedData.meals = parsedData.meals.map(meal => {
                                                                    // foodDatabaseから食材を検索（部分一致）
                                                                    let foodItem = null;

                                                                    // カテゴリごとに検索
                                                                    for (const category in foodDatabase) {
                                                                        for (const foodName in foodDatabase[category]) {
                                                                            if (foodName.includes(meal.name) || meal.name.includes(foodName)) {
                                                                                foodItem = foodDatabase[category][foodName];
                                                                                break;
                                                                            }
                                                                        }
                                                                        if (foodItem) break;
                                                                    }

                                                                    if (foodItem) {
                                                                        // データベースにある場合、100g当たりの値から計算
                                                                        const ratio = meal.amount / 100;
                                                                        return {
                                                                            ...meal,
                                                                            protein: Math.round(foodItem.protein * ratio * 10) / 10,
                                                                            fat: Math.round(foodItem.fat * ratio * 10) / 10,
                                                                            carbs: Math.round(foodItem.carbs * ratio * 10) / 10
                                                                        };
                                                                    } else {
                                                                        // データベースにない場合はデフォルト値
                                                                        return {
                                                                            ...meal,
                                                                            protein: 0,
                                                                            fat: 0,
                                                                            carbs: 0
                                                                        };
                                                                    }
                                                                });
                                                            }

                                                            setAiParsedData(parsedData);

                                                        } catch (error) {
                                                            console.error('AI処理エラー:', error);
                                                            alert('AI処理中にエラーが発生しました: ' + error.message);
                                                        } finally {
                                                            setAiProcessing(false);
                                                        }
                                                    }}
                                                    disabled={aiProcessing || !aiInputText.trim()}
                                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {aiProcessing ? (
                                                        <>
                                                            <Icon name="Loader" size={18} className="animate-spin" />
                                                            <span>AIが解析中...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Icon name="Wand2" size={18} />
                                                            <span>AIで解析</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                                <div className="flex items-start gap-2">
                                                    <Icon name="CheckCircle" size={18} className="text-green-600 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm text-green-900 font-semibold mb-1">解析完了</p>
                                                        <p className="text-sm text-green-700">
                                                            以下の内容を記録します。確認してください。
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 解析結果表示（編集可能） */}
                                            <div className="space-y-4 mb-6">
                                                {/* 食事 */}
                                                {aiParsedData.meals && aiParsedData.meals.length > 0 && (
                                                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Icon name="Utensils" size={18} className="text-orange-600" />
                                                            <h3 className="font-semibold text-orange-900">食事記録</h3>
                                                        </div>
                                                        {aiParsedData.meals.map((meal, idx) => (
                                                            <div key={idx} className="mb-3 p-3 bg-white rounded border border-orange-200">
                                                                <input
                                                                    type="text"
                                                                    value={meal.name}
                                                                    onChange={(e) => {
                                                                        const updated = {...aiParsedData};
                                                                        updated.meals[idx].name = e.target.value;
                                                                        setAiParsedData(updated);
                                                                    }}
                                                                    className="w-full mb-2 px-2 py-1 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                                                                    placeholder="食材名"
                                                                />
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    <div>
                                                                        <label className="text-xs text-orange-700">量(g)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={meal.amount}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.meals[idx].amount = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-orange-700">P(g)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={meal.protein}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.meals[idx].protein = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-orange-700">F(g)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={meal.fat}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.meals[idx].fat = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-orange-700">C(g)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={meal.carbs}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.meals[idx].carbs = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 運動 */}
                                                {aiParsedData.exercises && aiParsedData.exercises.length > 0 && (
                                                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Icon name="Dumbbell" size={18} className="text-red-600" />
                                                            <h3 className="font-semibold text-red-900">運動記録</h3>
                                                        </div>
                                                        {aiParsedData.exercises.map((ex, idx) => (
                                                            <div key={idx} className="mb-3 p-3 bg-white rounded border border-red-200">
                                                                <input
                                                                    type="text"
                                                                    value={ex.name}
                                                                    onChange={(e) => {
                                                                        const updated = {...aiParsedData};
                                                                        updated.exercises[idx].name = e.target.value;
                                                                        setAiParsedData(updated);
                                                                    }}
                                                                    className="w-full mb-2 px-2 py-1 text-sm border border-red-300 rounded focus:ring-2 focus:ring-red-500"
                                                                    placeholder="種目名"
                                                                />
                                                                <div className="grid grid-cols-5 gap-2">
                                                                    <div>
                                                                        <label className="text-xs text-red-700">重量(kg)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={ex.weight}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.exercises[idx].weight = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:ring-2 focus:ring-red-500"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-red-700">回数</label>
                                                                        <input
                                                                            type="number"
                                                                            value={ex.reps}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.exercises[idx].reps = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:ring-2 focus:ring-red-500"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-red-700">セット</label>
                                                                        <input
                                                                            type="number"
                                                                            value={ex.sets}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.exercises[idx].sets = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:ring-2 focus:ring-red-500"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-red-700">ROM(cm)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={ex.rom || 30}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.exercises[idx].rom = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:ring-2 focus:ring-red-500"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-red-700">TUT(秒)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={ex.tut || 60}
                                                                            onChange={(e) => {
                                                                                const updated = {...aiParsedData};
                                                                                updated.exercises[idx].tut = Number(e.target.value);
                                                                                setAiParsedData(updated);
                                                                            }}
                                                                            className="w-full px-2 py-1 text-sm border border-red-300 rounded focus:ring-2 focus:ring-red-500"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* サプリ */}
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setAiParsedData(null);
                                                        setAiInputText('');
                                                    }}
                                                    className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                                                >
                                                    戻る
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        // 全ての記録を一括で追加
                                                        const newMeals = [];
                                                        const newExercises = [];
                                                        const newSupplements = [];

                                                        // 食事記録を準備
                                                        if (aiParsedData.meals && aiParsedData.meals.length > 0) {
                                                            aiParsedData.meals.forEach((meal, idx) => {
                                                                newMeals.push({
                                                                    id: Date.now() + idx * 0.1,
                                                                    name: meal.name,
                                                                    amount: meal.amount,
                                                                    protein: meal.protein || 0,
                                                                    fat: meal.fat || 0,
                                                                    carbs: meal.carbs || 0,
                                                                    timestamp: new Date().toISOString()
                                                                });
                                                            });
                                                        }

                                                        // 運動記録を準備
                                                        if (aiParsedData.exercises && aiParsedData.exercises.length > 0) {
                                                            aiParsedData.exercises.forEach((ex, idx) => {
                                                                // PG-K式カロリー計算（統一式）
                                                                const rom = ex.rom || 30;
                                                                const tut = ex.tut || 60;
                                                                const calories = Math.round((ex.weight * ex.reps * ex.sets * rom * tut) / 3600);

                                                                newExercises.push({
                                                                    id: Date.now() + idx * 0.1,
                                                                    name: ex.name,
                                                                    weight: ex.weight,
                                                                    reps: ex.reps,
                                                                    sets: ex.sets,
                                                                    rom: rom,
                                                                    tut: tut,
                                                                    calories: calories,
                                                                    timestamp: new Date().toISOString()
                                                                });
                                                            });
                                                        }

                                                        // 一括で保存
                                                        const updatedRecord = {
                                                            ...dailyRecord,
                                                            meals: [...(dailyRecord.meals || []), ...newMeals],
                                                            exercises: [...(dailyRecord.exercises || []), ...newExercises]
                                                        };

                                                        await DataService.saveDailyRecord(user?.uid || DEV_USER_ID, currentDate, updatedRecord);

                                                        // モーダルを閉じてリロード
                                                        setShowAIInput(false);
                                                        setAiInputText('');
                                                        setAiParsedData(null);
                                                        setLastUpdate(Date.now());
                                                        alert('記録を追加しました！');
                                                    }}
                                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition flex items-center justify-center gap-2"
                                                >
                                                    <Icon name="Check" size={18} />
                                                    <span>記録する</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 履歴ビュー */}
                    {/* 機能開放状態モーダル */}
                    {showStageInfo && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowStageInfo(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h2 className="text-2xl font-bold">守破離 - 機能開放状態</h2>
                                                <button
                                                    type="button"
                                                    onClick={() => setInfoModal({
                                                        show: true,
                                                        title: '守破離（アンビエント・オンボーディング）とは？',
                                                        content: `初心者の挫折を防ぐための、本アプリ独自のUX設計思想です。

最初は機能が絞られたシンプルなUIから始まり、あなたの習熟度に合わせて新しい機能が静かに解放されていきます。アプリ自体が、あなたの成長と共に進化していく体験を提供します。

【守（0-9日）】基礎を学ぶ段階
基本の記録機能を使いこなします。

【破（10-17日）】応用・分析の段階
AIコーチなどの高度な機能が解放されます。

【離（18日〜）】独自の方法を確立する段階
全機能を開放し、あなただけのメソッドを追求します。`
                                                    })}
                                                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded transition"
                                                >
                                                    <Icon name="Info" size={18} />
                                                </button>
                                            </div>
                                            <p className="text-sm opacity-90">利用{usageDays}日目 • {currentStage}（{usageDays < 10 ? '基礎' : usageDays < 18 ? '応用' : '独自'}）</p>
                                        </div>
                                        <button onClick={() => setShowStageInfo(false)} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition">
                                            <Icon name="X" size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <h3 className="font-bold text-lg">機能開放状態</h3>
                                    <div className="space-y-2">
                                        {Object.values(FEATURES).map(feature => {
                                            const isUnlocked = usageDays >= feature.requiredDays;
                                            const stageColor =
                                                feature.stage === '守' ? 'bg-green-100 text-green-700' :
                                                feature.stage === '破' ? 'bg-blue-100 text-blue-700' :
                                                'bg-purple-100 text-purple-700';
                                            return (
                                                <div key={feature.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-xs px-2 py-1 rounded-full ${stageColor} font-bold`}>
                                                            {feature.stage}
                                                        </span>
                                                        {feature.icon && <Icon key={`icon-${feature.id}`} name={feature.icon} size={18} className="text-gray-600" />}
                                                        <span className="font-medium">{feature.name}</span>
                                                        <span className="text-xs text-gray-500">({feature.requiredDays}日〜)</span>
                                                    </div>
                                                    <div>
                                                        {isUnlocked ? (
                                                            <span className="text-green-600 flex items-center gap-1">
                                                                <Icon key={`check-${feature.id}`} name="CheckCircle" size={18} />
                                                                <span className="text-sm font-medium">開放済み</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 flex items-center gap-1">
                                                                <Icon key={`lock-${feature.id}`} name="Lock" size={18} />
                                                                <span className="text-sm">未開放</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 設定画面 */}
                    {showSettings && (
                        <SettingsView
                            onClose={() => setShowSettings(false)}
                            userProfile={userProfile}
                            onUpdateProfile={async (updatedProfile) => {
                                await DataService.saveUserProfile(user.uid, updatedProfile);
                                setUserProfile(updatedProfile);
                                setLastUpdate(Date.now()); // 強制的に再レンダリング
                            }}
                            userId={user.uid}
                            usageDays={usageDays}
                            unlockedFeatures={unlockedFeatures}
                            onOpenAddView={(type, fromTemplateEdit = false, templateToEdit = null) => {
                                setAddViewType(type);
                                setShowAddView(true);
                                setOpenedFromSettings(true);
                                setOpenedFromTemplateEditModal(fromTemplateEdit);
                                setEditingTemplate(templateToEdit);
                                setShowSettings(false); // 常に設定画面を閉じる
                            }}
                            darkMode={darkMode}
                            onToggleDarkMode={() => setDarkMode(!darkMode)}
                            shortcuts={shortcuts}
                            onUpdateShortcuts={(updated) => {
                                setShortcuts(updated);
                                localStorage.setItem('chevronShortcuts', JSON.stringify(updated));
                            }}
                            reopenTemplateEditModal={reopenTemplateEditModal}
                            reopenTemplateEditType={reopenTemplateEditType}
                            onTemplateEditModalOpened={() => {
                                setReopenTemplateEditModal(false);
                                setReopenTemplateEditType(null);
                            }}
                        />
                    )}

                    {/* チュートリアル機能は削除されました */}

                    {/* 情報モーダル */}
                    <InfoModal />

                    {/* サブメニュー（ボトムバーの上に展開） */}
                    {bottomBarExpanded && bottomBarMenu === 'daily' && (
                        <div className="fixed bottom-16 left-0 right-0 z-[9998] bg-blue-50 border-t shadow-lg px-4 py-3">
                            <div className="grid grid-cols-6 gap-2">
                                <button
                                    onClick={() => {
                                        setShowAIInput(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition shadow-md"
                                >
                                    <Icon name="Sparkles" size={18} className="text-white" />
                                    <span className="text-xs text-white font-bold">AI</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setAddViewType('meal');
                                        setShowAddView(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-green-100 transition"
                                >
                                    <Icon name="Utensils" size={18} className="text-green-600" />
                                    <span className="text-xs text-gray-700">食事</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setAddViewType('workout');
                                        setShowAddView(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-orange-100 transition"
                                >
                                    <Icon name="Dumbbell" size={18} className="text-orange-600" />
                                    <span className="text-xs text-gray-700">運動</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setAddViewType('condition');
                                        setShowAddView(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-red-100 transition"
                                >
                                    <Icon name="Activity" size={18} className="text-red-600" />
                                    <span className="text-xs text-gray-700">体調</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAnalysisView(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-indigo-100 transition"
                                >
                                    <Icon name="PieChart" size={18} className="text-indigo-600" />
                                    <span className="text-xs text-gray-700">分析</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {bottomBarExpanded && bottomBarMenu === 'pgbase' && (
                        <div className="fixed bottom-16 left-0 right-0 z-[9998] bg-purple-50 border-t shadow-lg px-4 py-3">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        if (!unlockedFeatures.includes('history_graph')) {
                                            const accessCheck = checkPremiumAccessRequired(
                                                DEV_MODE ? DEV_USER_ID : user?.uid,
                                                'history',
                                                userProfile
                                            );
                                            if (!accessCheck.allowed) {
                                                setRestrictedFeatureName('履歴');
                                                setShowPremiumRestriction(true);
                                            }
                                            return;
                                        }
                                        setShowHistoryView(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 bg-white rounded-lg transition relative ${
                                        unlockedFeatures.includes('history_graph') ? 'hover:bg-purple-100' : 'opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <Icon name="Calendar" size={18} className="text-purple-600" />
                                    <span className="text-xs text-gray-700">履歴</span>
                                    {!unlockedFeatures.includes('history_graph') && (
                                        <Icon name="Lock" size={10} className="text-gray-400 absolute top-1 right-1" />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        if (!unlockedFeatures.includes('pg_base')) {
                                            const accessCheck = checkPremiumAccessRequired(
                                                DEV_MODE ? DEV_USER_ID : user?.uid,
                                                'pg_base',
                                                userProfile
                                            );
                                            if (!accessCheck.allowed) {
                                                setRestrictedFeatureName('PG BASE');
                                                setShowPremiumRestriction(true);
                                            }
                                            return;
                                        }
                                        setShowPGBaseView(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 bg-white rounded-lg transition relative ${
                                        unlockedFeatures.includes('pg_base') ? 'hover:bg-purple-100' : 'opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <Icon name="BookOpen" size={18} className="text-purple-600" />
                                    <span className="text-xs text-gray-700">教科書</span>
                                    {!unlockedFeatures.includes('pg_base') && (
                                        <Icon name="Lock" size={10} className="text-gray-400 absolute top-1 right-1" />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        if (!unlockedFeatures.includes('community')) {
                                            const accessCheck = checkPremiumAccessRequired(
                                                DEV_MODE ? DEV_USER_ID : user?.uid,
                                                'community',
                                                userProfile
                                            );
                                            if (!accessCheck.allowed) {
                                                setRestrictedFeatureName('COMY');
                                                setShowPremiumRestriction(true);
                                            }
                                            return;
                                        }
                                        setShowCOMYView(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 bg-white rounded-lg transition relative ${
                                        unlockedFeatures.includes('community') ? 'hover:bg-purple-100' : 'opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <Icon name="Users" size={18} className="text-purple-600" />
                                    <span className="text-xs text-gray-700">COMY</span>
                                    {!unlockedFeatures.includes('community') && (
                                        <Icon name="Lock" size={10} className="text-gray-400 absolute top-1 right-1" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {bottomBarExpanded && bottomBarMenu === 'settings' && (
                        <div className="fixed bottom-16 left-0 right-0 z-[9998] bg-orange-50 border-t shadow-lg px-4 py-3">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        setShowSettings(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-orange-100 transition"
                                >
                                    <Icon name="Settings" size={18} className="text-orange-600" />
                                    <span className="text-xs text-gray-700">設定</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowStageInfo(true);
                                        setBottomBarMenu(null);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-orange-100 transition"
                                >
                                    <Icon name="Award" size={18} className="text-orange-600" />
                                    <span className="text-xs text-gray-700">バッジ</span>
                                </button>
                                <button
                                    onClick={() => {
                                        alert('チュートリアル機能は削除されました');
                                        setBottomBarMenu(null);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-orange-100 transition"
                                >
                                    <Icon name="HelpCircle" size={18} className="text-orange-600" />
                                    <span className="text-xs text-gray-700">使い方</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ボトムアプリバー */}
                    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t shadow-lg">
                        {/* 折りたたみトグルボタン - 最上辺に配置 */}
                        <button
                            onClick={() => setBottomBarExpanded(!bottomBarExpanded)}
                            className="w-full py-1 flex items-center justify-center hover:bg-gray-50 transition border-b border-gray-100"
                        >
                            <Icon
                                name={bottomBarExpanded ? "ChevronDown" : "ChevronUp"}
                                size={16}
                                className="text-gray-400"
                            />
                            <span className="text-xs text-gray-400 ml-1">
                                {bottomBarExpanded ? 'メニューを閉じる' : 'メニューを開く'}
                            </span>
                        </button>

                        {/* 展開時のみ表示されるメインボタン（5ボタン） */}
                        {bottomBarExpanded && (
                            <div className="grid grid-cols-5 gap-0 py-2">
                                {/* ①ホーム */}
                                <button
                                    onClick={() => {
                                        // すべてのビューを閉じてダッシュボードに戻る
                                        setShowHistoryV10(false);
                                        setShowPGBaseView(false);
                                        setShowCOMYView(false);
                                        setShowSettings(false);
                                        setShowAnalysisView(false);
                                        setShowAddView(false);
                                        setShowHistoryView(false);
                                        setShowAIInput(false);
                                        setBottomBarExpanded(false);
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 rounded-lg transition hover:bg-gray-50"
                                >
                                    <Icon name="Home" size={20} className="text-gray-600" />
                                    <span className="text-xs font-medium text-gray-600">
                                        ホーム
                                    </span>
                                </button>

                                {/* ②履歴 */}
                                <button
                                    onClick={() => {
                                        if (!unlockedFeatures.includes('history')) {
                                            // 機能未開放の場合は開けない
                                            return;
                                        }
                                        // 他のカテゴリを全て閉じる
                                        setShowPGBaseView(false);
                                        setShowCOMYView(false);
                                        setShowSettings(false);
                                        // 履歴を開く
                                        setShowHistoryV10(true);
                                        setBottomBarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                                        showHistoryV10 ? 'bg-purple-100' : (unlockedFeatures.includes('history') ? 'hover:bg-gray-50' : 'opacity-50')
                                    }`}
                                >
                                    <Icon name="TrendingUp" size={20} className={showHistoryV10 ? 'text-purple-700' : 'text-purple-600'} />
                                    <span className={`text-xs font-medium ${showHistoryV10 ? 'text-purple-700' : 'text-gray-600'}`}>
                                        履歴
                                    </span>
                                </button>

                                {/* ③PGBASE */}
                                <button
                                    onClick={async () => {
                                        if (!unlockedFeatures.includes('pg_base')) {
                                            // 機能未開放の場合は開けない
                                            return;
                                        }
                                        // 他のカテゴリを全て閉じる
                                        setShowHistoryV10(false);
                                        setShowCOMYView(false);
                                        setShowSettings(false);
                                        // PGBASEを開く
                                        setShowPGBaseView(true);
                                        setBottomBarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                                        showPGBaseView ? 'bg-cyan-100' : (unlockedFeatures.includes('pg_base') ? 'hover:bg-gray-50' : 'opacity-50')
                                    }`}
                                >
                                    <Icon name="BookOpen" size={20} className={showPGBaseView ? 'text-cyan-700' : 'text-cyan-600'} />
                                    <span className={`text-xs font-medium ${showPGBaseView ? 'text-cyan-700' : 'text-gray-600'}`}>
                                        PGBASE
                                    </span>
                                </button>

                                {/* ④COMY */}
                                <button
                                    onClick={async () => {
                                        if (!unlockedFeatures.includes('community')) {
                                            // 機能未開放の場合は開けない
                                            return;
                                        }
                                        // 他のカテゴリを全て閉じる
                                        setShowHistoryV10(false);
                                        setShowPGBaseView(false);
                                        setShowSettings(false);
                                        // COMYを開く
                                        setShowCOMYView(true);
                                        setBottomBarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                                        showCOMYView ? 'bg-fuchsia-100' : (unlockedFeatures.includes('community') ? 'hover:bg-gray-50' : 'opacity-50')
                                    }`}
                                >
                                    <Icon name="Users" size={20} className={showCOMYView ? 'text-fuchsia-700' : 'text-fuchsia-600'} />
                                    <span className={`text-xs font-medium ${showCOMYView ? 'text-fuchsia-700' : 'text-gray-600'}`}>
                                        COMY
                                    </span>
                                </button>

                                {/* ⑤設定 */}
                                <button
                                    onClick={() => {
                                        // 他のカテゴリを全て閉じる
                                        setShowHistoryV10(false);
                                        setShowPGBaseView(false);
                                        setShowCOMYView(false);
                                        // 設定を開く
                                        setShowSettings(true);
                                        setBottomBarExpanded(false);
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                                        showSettings ? 'bg-gray-200' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon name="Settings" size={20} className={showSettings ? 'text-gray-800' : 'text-gray-600'} />
                                    <span className={`text-xs font-medium ${showSettings ? 'text-gray-800' : 'text-gray-600'}`}>
                                        設定
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 誘導モーダル群 */}
                    <GuideModal
                        show={showMealGuide}
                        title="まずは食事を記録しましょう！"
                        message="OKボタンをクリックすると食事記録セクションに遷移します。&#10;右上の「追加」ボタンから今日の食事を記録してください。"
                        iconName="Utensils"
                        iconColor="bg-green-100"
                        targetSectionId="meal-section"
                        onClose={() => setShowMealGuide(false)}
                    />
                    <GuideModal
                        show={showTrainingGuide}
                        title="次は運動を記録しましょう！"
                        message="OKボタンをクリックすると運動記録セクションに遷移します。&#10;右上の「追加」ボタンから今日のトレーニングを記録してください。"
                        iconName="Dumbbell"
                        iconColor="bg-orange-100"
                        targetSectionId="workout-section"
                        onClose={() => setShowTrainingGuide(false)}
                    />
                    <GuideModal
                        show={showConditionGuide}
                        title="コンディションを記録しましょう！"
                        message="OKボタンをクリックするとコンディション記録セクションに遷移します。&#10;睡眠時間・睡眠の質・食欲・消化・集中力・ストレスの6項目を記録してください。"
                        iconName="HeartPulse"
                        iconColor="bg-indigo-100"
                        targetSectionId="condition-section"
                        onClose={() => setShowConditionGuide(false)}
                    />
                    <GuideModal
                        show={showAnalysisGuide}
                        title="🎉 分析機能が開放されました！"
                        message="コンディション記録が完了しました。&#10;&#10;AIがあなたの記録を分析して、改善点を提案します。&#10;「＋分析」ボタンをタップして詳細を確認してください。"
                        iconName="PieChart"
                        iconColor="bg-indigo-100"
                        targetSectionId="analysis-section"
                        onClose={() => setShowAnalysisGuide(false)}
                    />
                    <GuideModal
                        show={showDirectiveGuide}
                        title="🎉 新機能が開放されました！"
                        message="【指示書】&#10;AIがあなたの分析結果に基づいて、最適な次のアクションを提案します。&#10;ダッシュボードの「指示書」セクションから確認してください。&#10;&#10;【閃き】&#10;思いついたアイデアや気づきを自由に記録できます。&#10;ダッシュボードの「閃き」セクションから記録してください。"
                        iconName="FileText"
                        iconColor="bg-blue-100"
                        targetSectionId="directive-section"
                        onClose={() => setShowDirectiveGuide(false)}
                    />

                    {/* Premium制限モーダル */}
                    <PremiumRestrictionModal
                        show={showPremiumRestriction}
                        featureName={restrictedFeatureName}
                        onClose={() => setShowPremiumRestriction(false)}
                        onUpgrade={() => {
                            setShowPremiumRestriction(false);
                            setShowSubscriptionView(true);
                        }}
                    />

                    {/* クレジット0警告モーダル */}
                    {showCreditWarning && (
                        <div className="fixed inset-0 bg-black/70 z-[10001] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
                                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-center">
                                    <Icon name="AlertCircle" size={48} className="text-white mx-auto mb-3" />
                                    <h2 className="text-2xl font-bold text-white mb-2">クレジットが不足しています</h2>
                                    <p className="text-white/90 text-sm">AI機能（分析・写真解析）を利用するにはクレジットが必要です</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                                        <p className="text-sm text-gray-700 mb-3">
                                            <strong className="text-yellow-700">クレジットの獲得方法：</strong>
                                        </p>
                                        <ul className="space-y-2 text-sm text-gray-700">
                                            <li className="flex items-start gap-2">
                                                <Icon name="Award" size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                                                <span><strong>レベルアップ</strong>：3クレジット/回</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Icon name="Trophy" size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <span><strong>リワード</strong>：10/20/30...レベル到達で10クレジット</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Icon name="TrendingUp" size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                                <span><strong>経験値獲得</strong>：食事・運動・コンディションを記録して分析実行</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="text-center">
                                        <button
                                            onClick={() => setShowCreditWarning(false)}
                                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold hover:opacity-90 transition"
                                        >
                                            記録を開始する
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* サブスクリプション画面 */}
                    {showSubscriptionView && (
                        <SubscriptionView
                            onClose={() => setShowSubscriptionView(false)}
                            userId={user.uid}
                            userProfile={userProfile}
                        />
                    )}

                    {/* Feedback Manager（グローバル） */}
                    <FeedbackManager />
                </div>
            );
        };
