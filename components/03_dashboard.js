// ===== Dashboard Component =====
const DashboardView = ({ dailyRecord, targetPFC, unlockedFeatures, setUnlockedFeatures, onDeleteItem, profile, setInfoModal, yesterdayRecord, setDailyRecord, user, currentDate, onDateChange, triggers = {}, shortcuts = [], onShortcutClick, onFeatureUnlocked }) => {
    // 指示書管理
    const [todayDirective, setTodayDirective] = useState(null);
    const [showDirectiveEdit, setShowDirectiveEdit] = useState(false);

    // 機能開放モーダル（1つのモーダルで3ページ）
    const [showFeatureUnlockModal, setShowFeatureUnlockModal] = useState(false);
    const [currentModalPage, setCurrentModalPage] = useState(1); // 1, 2, 3

    // Premium誘導モーダル
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // 採点基準説明モーダル
    const [showScoringGuideModal, setShowScoringGuideModal] = useState(false);

    // 食事・運動セクション説明モーダル
    const [showMealInfoModal, setShowMealInfoModal] = useState(false);
    const [showWorkoutInfoModal, setShowWorkoutInfoModal] = useState(false);

    // 体脂肪率推定モーダル
    const [visualGuideModal, setVisualGuideModal] = useState({
        show: false,
        gender: profile?.gender || '男性',
        selectedLevel: 5
    });

    // 体組成の状態管理
    const [bodyComposition, setBodyComposition] = useState({
        weight: profile?.weight || 0,
        bodyFatPercentage: profile?.bodyFatPercentage || 0
    });

    // 今日の日付を取得
    const getTodayDate = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    // profileが更新されたらbodyCompositionを同期
    useEffect(() => {
        setBodyComposition({
            weight: profile?.weight || 0,
            bodyFatPercentage: profile?.bodyFatPercentage || 0
        });
    }, [profile]);

    // 体組成を更新する共通ハンドラー
    const updateBodyComposition = async (newWeight, newBodyFat) => {
        const updated = {
            weight: newWeight,
            bodyFatPercentage: newBodyFat
        };
        setBodyComposition(updated);

        // userProfileを更新
        const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
        const updatedProfile = { ...savedProfile, weight: newWeight, bodyFatPercentage: newBodyFat };
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
        window.dispatchEvent(new Event('profileUpdated'));

        // dailyRecordにも保存（履歴ページでLBM表示用）
        try {
            const todayDate = getTodayDate();
            const currentRecord = await DataService.getDailyRecord(user.uid, todayDate) || {};
            const updatedRecord = {
                ...currentRecord,
                bodyComposition: updated
            };
            await DataService.saveDailyRecord(user.uid, todayDate, updatedRecord);
            setDailyRecord(updatedRecord);
        } catch (error) {
            console.error('[Dashboard] Failed to save body composition to dailyRecord:', error);
        }
    };

    // 機能開放モーダルのフラグをチェック（分析ページから戻った時に表示）
    useEffect(() => {
        // ダッシュボードが表示されるたびにチェック
        const shouldShow = localStorage.getItem('showFeatureUnlockModals');
        if (shouldShow === 'true') {
            setTimeout(() => {
                setCurrentModalPage(1); // ページ1から開始
                setShowFeatureUnlockModal(true);
                localStorage.removeItem('showFeatureUnlockModals');
            }, 300); // 少し遅延させてスムーズに表示
        }
    }); // 依存配列を空にせず、毎回実行

    // 新機能開放モーダル完了後、Premium誘導モーダルを表示
    useEffect(() => {
        const checkUpgradeModalFlag = () => {
            const featureUnlockCompleted = localStorage.getItem('featureUnlockModalsCompleted');
            const upgradeModalPending = localStorage.getItem('showUpgradeModalPending');

            if (featureUnlockCompleted === 'true' && upgradeModalPending === 'true') {
                setShowUpgradeModal(true);
                localStorage.removeItem('featureUnlockModalsCompleted');
                localStorage.removeItem('showUpgradeModalPending');
            }
        };

        // 初回チェック
        checkUpgradeModalFlag();

        // 定期的にチェック（500ms間隔）
        const intervalId = setInterval(checkUpgradeModalFlag, 500);

        return () => clearInterval(intervalId);
    }, []);

    // 経験値・レベル情報の状態管理
    const [expData, setExpData] = useState({
        level: 1,
        experience: 0,
        totalCredits: 0,
        freeCredits: 0,
        paidCredits: 0,
        expProgress: 0
    });

    // レベルアップモーダル
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [levelUpData, setLevelUpData] = useState(null);

    // 指示書を読み込む
    useEffect(() => {
        loadDirective();
        // directiveUpdatedイベントをリッスン
        window.addEventListener('directiveUpdated', loadDirective);
        return () => window.removeEventListener('directiveUpdated', loadDirective);
    }, [currentDate]);

    // 経験値・レベル情報を読み込む
    useEffect(() => {
        loadExperienceData();
        // レベルアップイベントをリッスン
        const handleLevelUp = (event) => {
            setLevelUpData(event.detail);
            setShowLevelUpModal(true);
            loadExperienceData();
        };
        // クレジット更新イベントをリッスン（写真解析などでクレジット消費時）
        const handleCreditUpdate = () => {
            loadExperienceData();
        };
        window.addEventListener('levelUp', handleLevelUp);
        window.addEventListener('creditUpdated', handleCreditUpdate);
        return () => {
            window.removeEventListener('levelUp', handleLevelUp);
            window.removeEventListener('creditUpdated', handleCreditUpdate);
        };
    }, [user]);

    const loadExperienceData = async () => {
        if (!user) {
            return;
        }
        try {
            const data = await ExperienceService.getUserExperience(user.uid);
            const expToNext = ExperienceService.getExpToNextLevel(data.level, data.experience);
            const progress = Math.round((expToNext.current / expToNext.required) * 100);

            setExpData({
                level: data.level,
                experience: data.experience,
                totalCredits: data.totalCredits,
                freeCredits: data.freeCredits,
                paidCredits: data.paidCredits,
                expProgress: progress,
                expCurrent: expToNext.current,
                expRequired: expToNext.required
            });
        } catch (error) {
            console.error('[Dashboard] Failed to load experience data:', error);
        }
    };

    const loadDirective = () => {
        const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
        if (savedDirectives) {
            const directives = JSON.parse(savedDirectives);
            const today = currentDate || getTodayDate();
            const directive = directives.find(d => d.date === today);
            setTodayDirective(directive || null);
        }
    };

    // 指示書を完了にする
    const handleCompleteDirective = async () => {
        if (!todayDirective) return;
        const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
        const directives = savedDirectives ? JSON.parse(savedDirectives) : [];
        const updated = directives.map(d =>
            d.date === todayDirective.date ? { ...d, completed: true } : d
        );
        localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(updated));
        setTodayDirective({ ...todayDirective, completed: true });

        // 経験値付与（1日1回のみ10XP）
        if (user) {
            try {
                const expResult = await ExperienceService.processDirectiveCompletion(user.uid, currentDate);
                if (expResult.success) {

                    // 経験値更新イベントを発火（レベルバナーをリアルタイム更新）
                    window.dispatchEvent(new CustomEvent('experienceUpdated', {
                        detail: {
                            experience: expResult.experience,
                            level: expResult.level
                        }
                    }));

                    // レベルアップ時の通知
                    if (expResult.leveledUp) {
                        window.dispatchEvent(new CustomEvent('levelUp', {
                            detail: {
                                level: expResult.level,
                                creditsEarned: expResult.creditsEarned,
                                milestoneReached: expResult.milestoneReached
                            }
                        }));
                    }
                } else if (expResult.alreadyProcessed) {
                }
            } catch (error) {
                console.error('[Dashboard] Failed to process directive completion:', error);
            }
        }
    };

    // 残り時間を計算
    const getTimeRemaining = (deadline) => {
        if (!deadline) return 'まもなく';
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;
        if (diff < 0) return '期限切れ';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            return `あと${days}日`;
        }
        return `あと${hours}時間`;
    };

    // カテゴリーアイコンを取得
    const getCategoryIcon = (type) => {
        switch (type) {
            case 'meal': return 'Utensils';
            case 'exercise': return 'Dumbbell';
            case 'condition': return 'HeartPulse';
            default: return 'Target';
        }
    };

    // カテゴリーラベルを取得
    const getCategoryLabel = (type) => {
        switch (type) {
            case 'meal': return '食事';
            case 'exercise': return '運動';
            case 'condition': return 'コンディション';
            default: return '指示';
        }
    };

    // カテゴリー色を取得
    const getCategoryColor = (type) => {
        switch (type) {
            case 'meal': return { bg: 'from-green-50 to-teal-50', border: 'border-green-600', text: 'text-green-700', icon: 'text-green-600' };
            case 'exercise': return { bg: 'from-orange-50 to-red-50', border: 'border-orange-600', text: 'text-orange-700', icon: 'text-orange-600' };
            case 'condition': return { bg: 'from-indigo-50 to-purple-50', border: 'border-indigo-600', text: 'text-indigo-700', icon: 'text-indigo-600' };
            default: return { bg: 'from-gray-50 to-gray-100', border: 'border-gray-600', text: 'text-gray-700', icon: 'text-gray-600' };
        }
    };

    // 予測入力を実行する関数
    const loadPredictedData = async () => {
        if (!yesterdayRecord) {
            alert('前日の記録がありません');
            return;
        }
        // 前日の記録を複製（IDと時刻は新しく生成）
        const copiedRecord = {
            meals: [
                ...(dailyRecord.meals?.filter(m => !m.isPredicted) || []),
                ...(yesterdayRecord.meals?.map(meal => ({
                    ...meal,
                    id: Date.now() + Math.random(),
                    isPredicted: true // 予測データであることを示すフラグ
                })) || [])
            ],
            workouts: [
                ...(dailyRecord.workouts?.filter(w => !w.isPredicted) || []),
                ...(yesterdayRecord.workouts?.map(workout => ({
                    ...workout,
                    id: Date.now() + Math.random(),
                    isPredicted: true
                })) || [])
            ],
            conditions: dailyRecord.conditions
        };
        setDailyRecord(copiedRecord);

        // DBに保存して永続化
        const userId = user?.uid || DEV_USER_ID;
        await DataService.saveDailyRecord(userId, currentDate, copiedRecord);
    };

    // 予測データの自動展開はhandleDateChangeで行うため、このuseEffectは削除
    // useEffect(() => {
    //     if (yesterdayRecord) {
    //         // 当日の記録がまだ空の場合のみ、前日データを展開
    //         const isEmpty = !dailyRecord.meals?.length && !dailyRecord.workouts?.length && !dailyRecord.supplements?.length;
    //         if (isEmpty) {
    //             loadPredictedData();
    //         }
    //     }
    // }, [yesterdayRecord, dailyRecord]);
    // 現在の摂取量計算
    const currentIntake = {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        vitamins: {
            A: 0, D: 0, E: 0, K: 0, B1: 0, B2: 0, B3: 0, B5: 0, B6: 0, B7: 0, B9: 0, B12: 0, C: 0
        },
        minerals: {
            calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, sodium: 0, zinc: 0, copper: 0, manganese: 0, selenium: 0, iodine: 0, chromium: 0
        }
    };

    // その他の栄養素を初期化
    currentIntake.otherNutrients = {};

    dailyRecord.meals?.forEach(meal => {
        currentIntake.calories += meal.calories || 0;
        meal.items?.forEach(item => {
            currentIntake.protein += item.protein || 0;
            currentIntake.fat += item.fat || 0;
            currentIntake.carbs += item.carbs || 0;

            // ビタミン・ミネラル（オブジェクト形式）
            if (item.vitamins) {
                Object.keys(item.vitamins).forEach(v => {
                    currentIntake.vitamins[v] = (currentIntake.vitamins[v] || 0) + (item.vitamins[v] || 0);
                });
            }
            if (item.minerals) {
                Object.keys(item.minerals).forEach(m => {
                    currentIntake.minerals[m] = (currentIntake.minerals[m] || 0) + (item.minerals[m] || 0);
                });
            }

            // ビタミン・ミネラル（個別キー形式 - データベースから直接）
            const vitaminKeys = ['vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'niacin', 'pantothenicAcid', 'biotin', 'folicAcid'];
            vitaminKeys.forEach(key => {
                if (item[key] !== undefined && item[key] !== 0) {
                    currentIntake.vitamins[key] = (currentIntake.vitamins[key] || 0) + (item[key] || 0);
                }
            });

            const mineralKeys = ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum'];
            mineralKeys.forEach(key => {
                if (item[key] !== undefined && item[key] !== 0) {
                    currentIntake.minerals[key] = (currentIntake.minerals[key] || 0) + (item[key] || 0);
                }
            });

            if (item.otherNutrients) {
                Object.keys(item.otherNutrients).forEach(o => {
                    currentIntake.otherNutrients[o] = (currentIntake.otherNutrients[o] || 0) + (item.otherNutrients[o] || 0);
                });
            }
        });
    });

    // サプリメントは食事に統合されたため、この処理は不要

    // カロリー収支計算
    const caloriesPercent = (currentIntake.calories / targetPFC.calories) * 100;
    const proteinPercent = (currentIntake.protein / targetPFC.protein) * 100;

    // 今日かどうかのチェック（タイトル表示用）
    const isToday = () => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return currentDate === todayStr;
    };

    return (
        <div className="space-y-4">

            {/* 今日の指示書 */}
            {todayDirective && (
                <div id="directive-section" className="bg-green-50 rounded-xl border-2 border-green-200 p-4 slide-up mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Icon name="Target" size={18} className="text-green-600" />
                            <h3 className="font-bold text-gray-800">今日の指示書</h3>
                        </div>
                        <button
                            onClick={() => setShowDirectiveEdit(true)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <Icon name="Edit3" size={14} />
                        </button>
                    </div>

                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name={getCategoryIcon(todayDirective.type)} size={16} className="text-green-600" />
                            <span className="text-xs font-bold text-green-700">
                                【{getCategoryLabel(todayDirective.type)}】
                            </span>
                        </div>
                        <p className={`text-sm font-medium text-gray-800 leading-relaxed ${todayDirective.completed ? 'line-through opacity-60' : ''}`}>
                            {todayDirective.message}
                        </p>
                        {!todayDirective.completed && (
                            <button
                                onClick={handleCompleteDirective}
                                className="mt-3 w-full bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition font-semibold flex items-center justify-center gap-2 text-sm"
                            >
                                <Icon name="Check" size={16} />
                                完了
                            </button>
                        )}
                        {todayDirective.completed && (
                            <div className="mt-3 flex items-center justify-center gap-2 text-green-600 font-medium text-sm">
                                <Icon name="CheckCircle" size={16} />
                                完了済み
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PFCサマリー */}
            <div className="bg-white rounded-xl shadow-sm p-6 slide-up">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-bold">{isToday() ? '今日' : ''}の摂取状況</h3>
                    <button
                        onClick={() => setInfoModal({
                            show: true,
                            title: '📊 栄養の基本原則',
                            content: `筋肉を作るのも身体を変えるのもすべて三大栄養素を基にした食事。

タンパク質は筋肉・髪・皮膚の素材(4kcal/g)
脂質は関節保護・ホルモン分泌(9kcal/g)
炭水化物は筋肉や脳のガソリン(4kcal/g)

【重要原則】
増量 = オーバーカロリー
減量 = アンダーカロリー

365日継続して良い身体をキープする。

【食事調整の基本】
• タンパク質を増やす
• 脂質を必要最小限に抑える
• 炭水化物の質と量を探る

設定期間: 1-12週間
筋肉の新陳代謝周期: 50日`
                        })}
                        className="text-indigo-600 hover:text-indigo-800"
                    >
                        <Icon name="Info" size={18} />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">摂取カロリー</span>
                                <button
                                    onClick={() => setInfoModal({
                                        show: true,
                                        title: '💡 摂取カロリーの詳細',
                                        content: `【摂取カロリー】
食事とサプリメントから摂取したカロリーの合計
${currentIntake.calories} kcal

【目標カロリー】
${targetPFC.calories} kcal

【達成率】
${Math.round(caloriesPercent)}%`
                                    })}
                                    className="text-indigo-600 hover:text-indigo-800"
                                >
                                    <Icon name="Info" size={16} />
                                </button>
                            </div>
                            <div className="text-sm text-right">
                                <div className="font-bold text-cyan-600">
                                    {Math.round(currentIntake.calories)} / {targetPFC.calories} kcal
                                </div>
                            </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-cyan-600 transition-all duration-500"
                                style={{ width: `${Math.min(caloriesPercent, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">タンパク質 (P)</span>
                            <span className="text-sm">
                                <span className="font-bold text-red-600">{currentIntake.protein.toFixed(1)}</span>
                                <span className="text-gray-600"> / {targetPFC.protein} g</span>
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500 transition-all duration-500"
                                style={{ width: `${Math.min(proteinPercent, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">脂質 (F)</span>
                            <span className="text-sm">
                                <span className="font-bold text-yellow-600">{currentIntake.fat.toFixed(1)}</span>
                                <span className="text-gray-600"> / {targetPFC.fat} g</span>
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-yellow-500 transition-all duration-500"
                                style={{ width: `${Math.min((currentIntake.fat / targetPFC.fat) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">炭水化物 (C)</span>
                            <span className="text-sm">
                                <span className="font-bold text-green-600">{currentIntake.carbs.toFixed(1)}</span>
                                <span className="text-gray-600"> / {targetPFC.carbs} g</span>
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${Math.min((currentIntake.carbs / targetPFC.carbs) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* ビタミン・ミネラル詳細（守破離システムに統合 - 18日以上で開放） */}
                {unlockedFeatures.includes(FEATURES.MICRONUTRIENTS.id) && (
                    <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
                            <Icon name="ChevronDown" size={16} />
                            ビタミン・ミネラル+
                        </summary>
                        <div className="mt-4 space-y-4">
                        {/* ビタミン */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <Icon name="Droplets" size={16} className="text-orange-500" />
                                ビタミン
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {(() => {
                                    // 完全個別化基準値を取得
                                    const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                    const vitaminUnits = {
                                        A: 'μg', D: 'μg', E: 'mg', K: 'μg',
                                        B1: 'mg', B2: 'mg', B3: 'mg', B5: 'mg',
                                        B6: 'mg', B7: 'μg', B9: 'μg', B12: 'μg', C: 'mg'
                                    };
                                    return Object.entries(targets.vitamins).map(([key, target]) => {
                                        const current = currentIntake.vitamins[key] || 0;
                                        const percent = (current / target) * 100;
                                    return (
                                        <div key={key} className="bg-gray-50 p-2 rounded">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">ビタミン{key}</span>
                                                <span className="text-gray-600">
                                                    {current.toFixed(1)} / {target}{vitaminUnits[key]}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })})()}
                            </div>
                        </div>

                        {/* ミネラル */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <Icon name="Gem" size={16} className="text-purple-500" />
                                ミネラル
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                {(() => {
                                    // 完全個別化基準値を取得
                                    const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                    const mineralNames = {
                                        calcium: 'カルシウム', iron: '鉄', magnesium: 'マグネシウム',
                                        phosphorus: 'リン', potassium: 'カリウム', sodium: 'ナトリウム',
                                        zinc: '亜鉛', copper: '銅', manganese: 'マンガン',
                                        selenium: 'セレン', iodine: 'ヨウ素', chromium: 'クロム'
                                    };
                                    const mineralUnits = {
                                        calcium: 'mg', iron: 'mg', magnesium: 'mg',
                                        phosphorus: 'mg', potassium: 'mg', sodium: 'mg',
                                        zinc: 'mg', copper: 'mg', manganese: 'mg',
                                        selenium: 'μg', iodine: 'μg', chromium: 'μg'
                                    };
                                    return Object.entries(targets.minerals).map(([key, target]) => {
                                        const current = currentIntake.minerals[key] || 0;
                                        const percent = (current / target) * 100;
                                    return (
                                        <div key={key} className="bg-gray-50 p-2 rounded">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">{mineralNames[key]}</span>
                                                <span className="text-gray-600">
                                                    {current.toFixed(1)} / {target}{mineralUnits[key]}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })})()}
                            </div>
                        </div>

                        {/* その他の栄養素 */}
                        {Object.keys(currentIntake.otherNutrients || {}).length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <Icon name="Sparkles" size={16} className="text-cyan-500" />
                                    その他の栄養素
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {(() => {
                                        // 完全個別化基準値を取得
                                        const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                        const nutrientNames = {
                                            caffeine: 'カフェイン', catechin: 'カテキン', tannin: 'タンニン',
                                            polyphenol: 'ポリフェノール', chlorogenicAcid: 'クロロゲン酸',
                                            creatine: 'クレアチン', lArginine: 'L-アルギニン', lCarnitine: 'L-カルニチン',
                                            EPA: 'EPA', DHA: 'DHA', coQ10: 'コエンザイムQ10',
                                            lutein: 'ルテイン', astaxanthin: 'アスタキサンチン'
                                        };
                                        return Object.entries(currentIntake.otherNutrients).map(([key, value]) => {
                                            const target = targets.otherNutrients[key] || 100;
                                            const isGrams = key === 'creatine';
                                            const unit = isGrams ? 'g' : 'mg';
                                            const displayValue = isGrams ? (value / 1000).toFixed(2) : value.toFixed(1);
                                            const displayTarget = isGrams ? (target / 1000).toFixed(1) : target;
                                            const percent = (value / target) * 100;
                                        return (
                                            <div key={key} className="bg-gray-50 p-2 rounded">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="font-medium">{nutrientNames[key] || key}</span>
                                                    <span className="text-gray-600">
                                                        {displayValue} / {displayTarget}{unit}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all"
                                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })})()}
                                </div>
                            </div>
                        )}
                    </div>
                </details>
                )}
            </div>

            {/* 記録一覧 */}
            <div id="record-section" className="bg-white rounded-xl shadow-sm p-6 slide-up">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-bold">記録</h3>
                    <button
                        onClick={() => setInfoModal({
                            show: true,
                            title: '📝 記録について',
                            content: `【通常の記録】\nFABメニューの＋ボタンから、食事・運動・サプリメントを記録できます。記録した内容は即座にダッシュボードに反映されます。\n\n【予測入力機能】\n前日の記録を自動的に複製する機能です。「予測入力」ボタンを押すと、前日の記録が展開されます。毎日同じような記録をする場合に便利です。\n\n青いバッジ「昨日から」が表示されている項目が予測入力された記録です。\n\n【クリアボタン】\n「予測入力をクリア」ボタンを押すと、予測入力で展開された記録のみが削除されます。手動で追加した記録はそのまま残ります。`
                        })}
                        className="text-indigo-600 hover:text-indigo-800"
                    >
                        <Icon name="Info" size={18} />
                    </button>
                    <div className="ml-auto flex gap-2">
                        {yesterdayRecord && (
                            <button
                                onClick={loadPredictedData}
                                className="text-xs px-3 py-1 bg-purple-50 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-100 transition flex items-center gap-1"
                            >
                                <Icon name="Sparkles" size={14} />
                                予測入力
                            </button>
                        )}
                        {yesterdayRecord && (dailyRecord.meals?.some(m => m.isPredicted) || dailyRecord.workouts?.some(w => w.isPredicted)) && (
                            <button
                                onClick={async () => {
                                    // 予測入力された記録のみを削除
                                    const clearedRecord = {
                                        ...dailyRecord,
                                        meals: dailyRecord.meals?.filter(m => !m.isPredicted) || [],
                                        workouts: dailyRecord.workouts?.filter(w => !w.isPredicted) || []
                                    };
                                    setDailyRecord(clearedRecord);
                                    const userId = user?.uid || DEV_USER_ID;
                                    await DataService.saveDailyRecord(userId, currentDate, clearedRecord);
                                }}
                                className="text-xs px-3 py-1 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                            >
                                予測入力をクリア
                            </button>
                        )}
                    </div>
                </div>

                {/* 体組成セクション */}
                <div id="body-composition-section" className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Icon name="Activity" size={18} className="text-teal-600" />
                            体組成
                        </h4>
                        <span className="text-sm font-bold text-teal-600">
                            LBM: {(bodyComposition.weight * (1 - bodyComposition.bodyFatPercentage / 100)).toFixed(1)}kg
                        </span>
                    </div>

                    {/* 体重 */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Weight" size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-gray-700">体重</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const newWeight = Math.max(0, bodyComposition.weight - 1);
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const newWeight = Math.max(0, parseFloat((bodyComposition.weight - 0.1).toFixed(1)));
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -0.1
                            </button>
                            <div className="px-4 py-1.5 bg-white border-2 border-gray-300 rounded-lg min-w-[90px] text-center">
                                <span className="text-lg font-bold text-gray-900">{bodyComposition.weight.toFixed(1)}</span>
                                <span className="text-xs text-gray-600 ml-1">kg</span>
                            </div>
                            <button
                                onClick={() => {
                                    const newWeight = parseFloat((bodyComposition.weight + 0.1).toFixed(1));
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const newWeight = bodyComposition.weight + 1;
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +1
                            </button>
                        </div>
                    </div>

                    {/* 体脂肪率 */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Percent" size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-gray-700">体脂肪率</span>
                            <button
                                onClick={() => setVisualGuideModal({ ...visualGuideModal, show: true })}
                                className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-full p-0.5 transition"
                                title="体脂肪率を推定"
                            >
                                <Icon name="Eye" size={14} />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const newBodyFat = Math.max(0, bodyComposition.bodyFatPercentage - 1);
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const newBodyFat = Math.max(0, parseFloat((bodyComposition.bodyFatPercentage - 0.1).toFixed(1)));
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -0.1
                            </button>
                            <div className="px-4 py-1.5 bg-white border-2 border-gray-300 rounded-lg min-w-[90px] text-center">
                                <span className="text-lg font-bold text-gray-900">{bodyComposition.bodyFatPercentage.toFixed(1)}</span>
                                <span className="text-xs text-gray-600 ml-1">%</span>
                            </div>
                            <button
                                onClick={() => {
                                    const newBodyFat = parseFloat((bodyComposition.bodyFatPercentage + 0.1).toFixed(1));
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const newBodyFat = bodyComposition.bodyFatPercentage + 1;
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +1
                            </button>
                        </div>
                    </div>
                </div>

                {/* 食事セクション */}
                <div id="meal-section" className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="Utensils" size={18} className="text-green-600" />
                                食事
                            </h4>
                            <button
                                onClick={() => setShowMealInfoModal(true)}
                                className="p-1 hover:bg-gray-100 rounded-full transition"
                                title="使い方"
                            >
                                <Icon name="Info" size={16} className="text-gray-500" />
                            </button>
                        </div>
                        <button
                            onClick={() => window.handleQuickAction && window.handleQuickAction('meal')}
                            className="text-sm px-4 py-2 bg-green-100 border border-green-400 text-green-800 rounded-lg hover:bg-green-200 transition font-medium"
                        >
                            + 追加
                        </button>
                    </div>
                    {dailyRecord.meals?.length > 0 ? (
                        <div className="space-y-3">
                            {dailyRecord.meals.map((meal, index) => (
                                <div key={meal.id || index} className={`border rounded-lg p-4 hover:border-emerald-300 transition ${meal.isPredicted ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium">{meal.name}</p>
                                                {meal.isPredicted && (
                                                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Icon name="Sparkles" size={10} />
                                                        昨日から
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">{meal.time}</p>
                                            {meal.items?.map((item, i) => (
                                                <p key={i} className="text-sm text-gray-600">
                                                    {item.name} {item.amount}
                                                </p>
                                            ))}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold mb-2 text-cyan-600">{meal.calories} kcal</p>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => {
                                                        // 食事編集機能を呼び出す
                                                        if (window.handleEditMeal) {
                                                            window.handleEditMeal(meal);
                                                        }
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 text-sm"
                                                >
                                                    <Icon name="Pencil" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteItem('meal', meal.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    <Icon name="Trash2" size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-4">食事の記録がありません</p>
                    )}
                </div>

                {/* 運動セクション */}
                {/* 運動セクション - 食事記録完了後に開放 */}
                {unlockedFeatures.includes('training') && (
                    <div id="workout-section" className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Icon name="Dumbbell" size={18} className="text-orange-600" />
                                        運動
                                    </h4>
                                    <button
                                        onClick={() => setShowWorkoutInfoModal(true)}
                                        className="p-1 hover:bg-gray-100 rounded-full transition"
                                        title="使い方"
                                    >
                                        <Icon name="Info" size={16} className="text-gray-500" />
                                    </button>
                                </div>
                                {dailyRecord.workouts?.length > 0 && (() => {
                                    // 総重量と総時間を計算
                                    let totalWeight = 0;
                                    let totalDuration = 0;

                                    console.log('[ダッシュボード集計] workouts:', dailyRecord.workouts);

                                    dailyRecord.workouts.forEach((workout, workoutIdx) => {
                                        console.log(`[ダッシュボード集計] workout[${workoutIdx}]:`, workout);
                                        console.log(`  - exercises:`, workout.exercises);

                                        workout.exercises?.forEach((exercise, exIdx) => {
                                            console.log(`  - exercise[${exIdx}]:`, exercise);
                                            console.log(`    - exerciseType: ${exercise.exerciseType}`);
                                            console.log(`    - duration: ${exercise.duration}`);
                                            console.log(`    - totalDuration: ${exercise.totalDuration}`);

                                            const isCardioOrStretch = exercise.exerciseType === 'aerobic' || exercise.exerciseType === 'stretch';

                                            if (isCardioOrStretch) {
                                                // 有酸素・ストレッチ: 新旧両方のデータ構造に対応
                                                if (exercise.duration) {
                                                    // 新形式: exercise.duration を直接加算
                                                    console.log(`    ✅ 有酸素・ストレッチ duration加算: ${exercise.duration}分`);
                                                    totalDuration += exercise.duration;
                                                } else if (exercise.sets) {
                                                    // 旧形式: sets の中の duration を加算
                                                    exercise.sets.forEach(set => {
                                                        console.log(`    ✅ 旧形式 set duration加算: ${set.duration}分`);
                                                        totalDuration += (set.duration || 0);
                                                    });
                                                } else {
                                                    console.warn(`    ⚠️ duration も sets も存在しません`);
                                                }
                                            } else {
                                                // 筋トレ: sets の中の duration と weight を加算
                                                exercise.sets?.forEach(set => {
                                                    totalWeight += (set.weight || 0) * (set.reps || 0);
                                                    totalDuration += (set.duration || 0);
                                                });
                                            }
                                        });
                                    });

                                    console.log(`[ダッシュボード集計] 最終結果: totalWeight=${totalWeight}kg, totalDuration=${totalDuration}分`);

                                    return (
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                                                <Icon name="Weight" size={14} />
                                                {totalWeight}kg
                                            </span>
                                            <span className="flex items-center gap-1 text-orange-600 font-medium">
                                                <Icon name="Clock" size={14} />
                                                {totalDuration}分
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                            <button
                                onClick={() => window.handleQuickAction && window.handleQuickAction('workout')}
                                className="text-sm px-4 py-2 bg-orange-100 border border-orange-400 text-orange-800 rounded-lg hover:bg-orange-200 transition font-medium"
                            >
                                + 追加
                            </button>
                        </div>
                        {dailyRecord.workouts?.length > 0 ? (
                            <div className="space-y-3">
                                {dailyRecord.workouts.map((workout, index) => (
                                    <div key={workout.id || index} className={`border rounded-lg p-4 hover:border-orange-300 transition ${workout.isPredicted ? 'border-blue-300 bg-white' : 'border-gray-200 bg-white'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium">{workout.name}</p>
                                                    {workout.isPredicted && (
                                                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="Sparkles" size={10} />
                                                            昨日から
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 mb-2">{workout.time}</p>
                                                {workout.exercises?.map((exercise, i) => {
                                                    const isCardioOrStretch = exercise.exerciseType === 'aerobic' || exercise.exerciseType === 'stretch';

                                                    // 総重量を計算（筋トレのみ）
                                                    let totalVolume = 0;
                                                    if (!isCardioOrStretch && exercise.sets) {
                                                        totalVolume = exercise.sets.reduce((sum, set) => {
                                                            return sum + (set.weight || 0) * (set.reps || 0);
                                                        }, 0);
                                                    }

                                                    return (
                                                        <div key={i} className="text-sm text-gray-600 mb-2">
                                                            <p className="font-medium">{exercise.exercise?.name || exercise.name}</p>
                                                            {isCardioOrStretch ? (
                                                                // 有酸素・ストレッチ: 総時間のみ表示（新旧両データ構造対応）
                                                                <p className="text-xs text-blue-600">
                                                                    {exercise.duration
                                                                        ? `${exercise.duration}分`
                                                                        : exercise.sets
                                                                            ? `${exercise.sets.reduce((sum, set) => sum + (set.duration || 0), 0)}分`
                                                                            : '0分'}
                                                                </p>
                                                            ) : (
                                                                // 筋トレ: セット詳細と総重量を表示
                                                                <>
                                                                    {exercise.sets?.map((set, si) => (
                                                                        <div key={si}>
                                                                            <p className="text-xs">
                                                                                Set {si + 1}: {set.weight}kg × {set.reps}回
                                                                            </p>
                                                                            {set.rm && set.rmWeight && (
                                                                                <p className="text-xs text-orange-600 font-medium">
                                                                                    🏆 RM更新: {set.rm}RM × {set.rmWeight}kg
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {totalVolume > 0 && (
                                                                        <p className="text-xs text-orange-600 font-medium mt-1">
                                                                            総重量: {totalVolume}kg
                                                                        </p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="text-right">
                                                <button
                                                    onClick={() => onDeleteItem('workout', workout.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    <Icon name="Trash2" size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">運動の記録がありません</p>
                        )}
                    </div>
                )}

                {/* 体調セクション - 運動記録完了後に開放 */}
                {unlockedFeatures.includes('condition') && (
                    <div id="condition-section" className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Icon name="HeartPulse" size={18} className="text-red-600" />
                            コンディション
                        </h4>
                    </div>
                    <div className="space-y-2">
                        {/* 睡眠時間 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-700 font-bold">睡眠時間</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.sleepHours && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            left: `calc(${((dailyRecord.conditions.sleepHours - 1) / 5) * 100}% + 0.375rem)`,
                                            width: 'calc(20% - 0.375rem)'
                                        }}
                                    />
                                )}
                                {[
                                    { value: 1, label: '5h以下' },
                                    { value: 2, label: '6h' },
                                    { value: 3, label: '7h' },
                                    { value: 4, label: '8h' },
                                    { value: 5, label: '9h以上' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={async () => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    sleepHours: item.value
                                                }
                                            };
                                            setDailyRecord(updated);
                                            const userId = user?.uid || DEV_USER_ID;
                                            await DataService.saveDailyRecord(userId, currentDate, updated);

                                            // 機能開放チェック
                                            const oldUnlocked = [...unlockedFeatures];
                                            await checkAndCompleteFeatures(userId, updated);
                                            const isPremium = profile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                            const newUnlocked = calculateUnlockedFeatures(userId, updated, isPremium);
                                            setUnlockedFeatures(newUnlocked);

                                            // 新しく開放された機能があればコールバック
                                            if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                onFeatureUnlocked('analysis');
                                            }
                                        }}
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.sleepHours) || 0)
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 睡眠の質 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-700 font-bold">睡眠の質</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.sleepQuality && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            left: `calc(${((dailyRecord.conditions.sleepQuality - 1) / 5) * 100}% + 0.375rem)`,
                                            width: 'calc(20% - 0.375rem)'
                                        }}
                                    />
                                )}
                                {[
                                    { value: 1, label: '最悪' },
                                    { value: 2, label: '悪' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '良' },
                                    { value: 5, label: '最高' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={async () => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    sleepQuality: item.value
                                                }
                                            };
                                            setDailyRecord(updated);
                                            const userId = user?.uid || DEV_USER_ID;
                                            await DataService.saveDailyRecord(userId, currentDate, updated);

                                            // 機能開放チェック
                                            const oldUnlocked = [...unlockedFeatures];
                                            await checkAndCompleteFeatures(userId, updated);
                                            const isPremium = profile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                            const newUnlocked = calculateUnlockedFeatures(userId, updated, isPremium);
                                            setUnlockedFeatures(newUnlocked);

                                            // 新しく開放された機能があればコールバック
                                            if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                onFeatureUnlocked('analysis');
                                            }
                                        }}
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.sleepQuality) || 0)
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 食欲 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-700 font-bold">食欲</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.appetite && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            left: `calc(${((dailyRecord.conditions.appetite - 1) / 5) * 100}% + 0.375rem)`,
                                            width: 'calc(20% - 0.375rem)'
                                        }}
                                    />
                                )}
                                {[
                                    { value: 1, label: 'なし' },
                                    { value: 2, label: '少' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '良好' },
                                    { value: 5, label: '最適' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={async () => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    appetite: item.value
                                                }
                                            };
                                            setDailyRecord(updated);
                                            const userId = user?.uid || DEV_USER_ID;
                                            await DataService.saveDailyRecord(userId, currentDate, updated);

                                            // 機能開放チェック
                                            const oldUnlocked = [...unlockedFeatures];
                                            await checkAndCompleteFeatures(userId, updated);
                                            const isPremium = profile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                            const newUnlocked = calculateUnlockedFeatures(userId, updated, isPremium);
                                            setUnlockedFeatures(newUnlocked);

                                            // 新しく開放された機能があればコールバック
                                            if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                onFeatureUnlocked('analysis');
                                            }
                                        }}
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.appetite) || 0)
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 腸内環境 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-700 font-bold">腸内環境</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.digestion && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            left: `calc(${((dailyRecord.conditions.digestion - 1) / 5) * 100}% + 0.375rem)`,
                                            width: 'calc(20% - 0.375rem)'
                                        }}
                                    />
                                )}
                                {[
                                    { value: 1, label: '不調' },
                                    { value: 2, label: 'やや悪' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '良好' },
                                    { value: 5, label: '最高' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={async () => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    digestion: item.value
                                                }
                                            };
                                            setDailyRecord(updated);
                                            const userId = user?.uid || DEV_USER_ID;
                                            await DataService.saveDailyRecord(userId, currentDate, updated);

                                            // 機能開放チェック
                                            const oldUnlocked = [...unlockedFeatures];
                                            await checkAndCompleteFeatures(userId, updated);
                                            const isPremium = profile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                            const newUnlocked = calculateUnlockedFeatures(userId, updated, isPremium);
                                            setUnlockedFeatures(newUnlocked);

                                            // 新しく開放された機能があればコールバック
                                            if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                onFeatureUnlocked('analysis');
                                            }
                                        }}
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.digestion) || 0)
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 集中力 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-700 font-bold">集中力</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.focus && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            left: `calc(${((dailyRecord.conditions.focus - 1) / 5) * 100}% + 0.375rem)`,
                                            width: 'calc(20% - 0.375rem)'
                                        }}
                                    />
                                )}
                                {[
                                    { value: 1, label: '最低' },
                                    { value: 2, label: '低' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '高' },
                                    { value: 5, label: '最高' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={async () => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    focus: item.value
                                                }
                                            };
                                            setDailyRecord(updated);
                                            const userId = user?.uid || DEV_USER_ID;
                                            await DataService.saveDailyRecord(userId, currentDate, updated);

                                            // 機能開放チェック
                                            const oldUnlocked = [...unlockedFeatures];
                                            await checkAndCompleteFeatures(userId, updated);
                                            const isPremium = profile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                            const newUnlocked = calculateUnlockedFeatures(userId, updated, isPremium);
                                            setUnlockedFeatures(newUnlocked);

                                            // 新しく開放された機能があればコールバック
                                            if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                onFeatureUnlocked('analysis');
                                            }
                                        }}
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.focus) || 0)
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ストレス */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-700 font-bold">ストレス</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.stress && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                        style={{
                                            left: `calc(${((dailyRecord.conditions.stress - 1) / 5) * 100}% + 0.375rem)`,
                                            width: 'calc(20% - 0.375rem)'
                                        }}
                                    />
                                )}
                                {[
                                    { value: 1, label: '極大' },
                                    { value: 2, label: '高' },
                                    { value: 3, label: '普通' },
                                    { value: 4, label: '低' },
                                    { value: 5, label: 'なし' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        onClick={async () => {
                                            const updated = {
                                                ...dailyRecord,
                                                conditions: {
                                                    ...(dailyRecord.conditions || {}),
                                                    stress: item.value
                                                }
                                            };
                                            setDailyRecord(updated);
                                            const userId = user?.uid || DEV_USER_ID;
                                            await DataService.saveDailyRecord(userId, currentDate, updated);

                                            // 機能開放チェック
                                            const oldUnlocked = [...unlockedFeatures];
                                            await checkAndCompleteFeatures(userId, updated);
                                            const isPremium = profile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                            const newUnlocked = calculateUnlockedFeatures(userId, updated, isPremium);
                                            setUnlockedFeatures(newUnlocked);

                                            // 新しく開放された機能があればコールバック
                                            if (onFeatureUnlocked && !oldUnlocked.includes('analysis') && newUnlocked.includes('analysis')) {
                                                onFeatureUnlocked('analysis');
                                            }
                                        }}
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.stress) || 0)
                                                ? 'text-white'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        </div>

                        {/* 閃きセクション - 初回分析完了後に開放 */}
                        {unlockedFeatures.includes('idea') && (
                            <div className="space-y-2 mt-4">
                                <div className="py-2 px-3 bg-gray-50 rounded-lg">
                                    <div className="mb-2">
                                        <span className="text-sm text-gray-700 font-bold flex items-center gap-2">
                                            <Icon name="Lightbulb" size={16} className="text-yellow-500" />
                                            閃き
                                        </span>
                                    </div>
                                    <textarea
                                        value={dailyRecord.notes || ''}
                                        onChange={async (e) => {
                                            const updated = {
                                                ...dailyRecord,
                                                notes: e.target.value
                                            };
                                            setDailyRecord(updated);
                                            const userId = user?.uid || DEV_USER_ID;
                                            await DataService.saveDailyRecord(userId, currentDate, updated);
                                        }}
                                        placeholder="今日の気づき、メモなど..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none text-sm"
                                        rows="3"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 分析ボタン - コンディション完了後に開放 */}
                {unlockedFeatures.includes('analysis') && (
                    <div id="analysis-section">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="PieChart" size={18} className="text-indigo-600" />
                                分析
                                <button
                                    onClick={() => setShowScoringGuideModal(true)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition"
                                    title="採点基準を見る"
                                >
                                    <Icon name="Info" size={16} className="text-gray-500" />
                                </button>
                            </h4>
                            <button
                                onClick={() => window.handleQuickAction && window.handleQuickAction('analysis')}
                                className="text-sm px-4 py-2 bg-indigo-100 border border-indigo-400 text-indigo-800 rounded-lg hover:bg-indigo-200 transition font-medium"
                            >
                                + 分析
                            </button>
                        </div>

                        {/* 当日のスコア表示 */}
                        {(() => {
                            const scores = DataService.calculateScores(profile, dailyRecord, targetPFC);
                            return (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                        <div className="text-xs text-green-700 mb-1">食事</div>
                                        <div className="text-2xl font-bold text-green-600">{scores.food.score}</div>
                                        <div className="text-xs text-gray-500">/100</div>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                                        <div className="text-xs text-orange-700 mb-1">運動</div>
                                        <div className="text-2xl font-bold text-orange-600">{scores.exercise.score}</div>
                                        <div className="text-xs text-gray-500">/100</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                        <div className="text-xs text-blue-700 mb-1">コンディション</div>
                                        <div className="text-2xl font-bold text-blue-600">{scores.condition.score}</div>
                                        <div className="text-xs text-gray-500">/100</div>
                                    </div>
                                </div>
                            );
                        })()}

                        <p className="text-sm text-gray-500">AIによる詳細な栄養分析を確認できます</p>
                    </div>
                )}

            </div>


            {/* 指示書編集モーダル */}
            {showDirectiveEdit && todayDirective && (
                <DirectiveEditModal
                    directive={todayDirective}
                    onClose={() => setShowDirectiveEdit(false)}
                    onSave={(updatedDirective) => {
                        const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
                        const directives = savedDirectives ? JSON.parse(savedDirectives) : [];
                        const updated = directives.map(d =>
                            d.date === updatedDirective.date ? updatedDirective : d
                        );
                        localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(updated));
                        setTodayDirective(updatedDirective);
                        setShowDirectiveEdit(false);
                    }}
                    onDelete={() => {
                        const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
                        const directives = savedDirectives ? JSON.parse(savedDirectives) : [];
                        const updated = directives.filter(d => d.date !== todayDirective.date);
                        localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(updated));
                        setTodayDirective(null);
                        setShowDirectiveEdit(false);
                    }}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryLabel={getCategoryLabel}
                    getCategoryColor={getCategoryColor}
                />
            )}

            {/* 採点基準説明モーダル */}
            {showScoringGuideModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-4">
                            {/* ヘッダー */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="Info" size={20} className="text-indigo-600" />
                                    採点基準
                                </h3>
                                <button
                                    onClick={() => setShowScoringGuideModal(false)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition"
                                >
                                    <Icon name="X" size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* 食事スコア */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Utensils" size={18} className="text-green-600" />
                                    <h4 className="font-bold text-green-800">食事スコア（100点満点）</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-1">
                                    <p><strong>PFCバランス</strong>（70%）</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>タンパク質：目標値に対する達成率</li>
                                        <li>脂質：目標値に対する達成率</li>
                                        <li>炭水化物：目標値に対する達成率</li>
                                        <li>3項目の平均が高いほど高得点</li>
                                    </ul>
                                    <p className="mt-2"><strong>カロリー達成度</strong>（30%）</p>
                                    <ul className="list-disc list-inside ml-2">
                                        <li>目標カロリーとのズレが少ないほど高得点</li>
                                    </ul>
                                </div>
                            </div>

                            {/* 運動スコア */}
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Dumbbell" size={18} className="text-orange-600" />
                                    <h4 className="font-bold text-orange-800">運動スコア（100点満点）</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-1">
                                    <p><strong>運動時間</strong>（50%）</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>ボディメイカー：2時間以上で満点</li>
                                        <li>一般：1時間以上で満点</li>
                                    </ul>
                                    <p className="mt-2"><strong>種目数</strong>（50%）</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>ボディメイカー：5種目以上で満点</li>
                                        <li>一般：3種目以上で満点</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-orange-700">※休養日に設定した日は自動的に100点</p>
                                </div>
                            </div>

                            {/* コンディションスコア */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="HeartPulse" size={18} className="text-blue-600" />
                                    <h4 className="font-bold text-blue-800">コンディションスコア（100点満点）</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-1">
                                    <p><strong>6項目の平均で評価</strong></p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>睡眠時間（1-5段階）</li>
                                        <li>睡眠の質（1-5段階）</li>
                                        <li>食欲（1-5段階）</li>
                                        <li>腸内環境（1-5段階）</li>
                                        <li>集中力（1-5段階）</li>
                                        <li>ストレス（1-5段階、低いほど良い）</li>
                                    </ul>
                                    <p className="mt-2 text-xs text-blue-700">※すべての項目が最高値（5）の場合、100点になります</p>
                                </div>
                            </div>

                            {/* 閉じるボタン */}
                            <button
                                onClick={() => setShowScoringGuideModal(false)}
                                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ショートカット */}
            {shortcuts && shortcuts.length > 0 && onShortcutClick && (
                <ChevronShortcut shortcuts={shortcuts} onShortcutClick={onShortcutClick} />
            )}

            {/* 機能開放モーダル（1つのモーダルで3ページ構成） */}
            {showFeatureUnlockModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
                        <div className="p-6 space-y-4">
                            {/* アイコン */}
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Icon name="Sparkles" size={32} className="text-purple-600" />
                                </div>
                            </div>

                            {/* ページ1: 指示書・履歴 */}
                            {currentModalPage === 1 && (
                                <>
                                    <h3 className="text-xl font-bold text-center text-gray-800">
                                        🎉 新機能が開放されました！
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-3">
                                        <p className="text-center">分析完了おめでとうございます！</p>
                                        <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <Icon name="FileText" size={18} className="text-purple-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">指示書</div>
                                                    <div className="text-xs text-gray-600">明日の行動指針をAIが提案</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Lightbulb" size={18} className="text-yellow-500 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">閃き</div>
                                                    <div className="text-xs text-gray-600">今日の気づきやメモを記録</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="History" size={18} className="text-purple-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">履歴</div>
                                                    <div className="text-xs text-gray-600">グラフで進捗を確認</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ページ2: PG BASE・COMY */}
                            {currentModalPage === 2 && (
                                <>
                                    <h3 className="text-xl font-bold text-center text-gray-800">
                                        🎉 さらに機能が開放！
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-3">
                                        <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <Icon name="BookOpen" size={18} className="text-purple-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">PG BASE</div>
                                                    <div className="text-xs text-gray-600">ボディメイクの基礎知識</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Users" size={18} className="text-purple-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">COMY</div>
                                                    <div className="text-xs text-gray-600">仲間と刺激し合う</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ページ3: テンプレート・ルーティン・ショートカット */}
                            {currentModalPage === 3 && (
                                <>
                                    <h3 className="text-xl font-bold text-center text-gray-800">
                                        🎉 全機能開放完了！
                                    </h3>
                                    <div className="text-sm text-gray-600 space-y-3">
                                        <p className="text-center">すべての機能が使えるようになりました！</p>
                                        <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <Icon name="BookTemplate" size={18} className="text-purple-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">テンプレート</div>
                                                    <div className="text-xs text-gray-600">食事・運動を保存</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Calendar" size={18} className="text-purple-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">ルーティン</div>
                                                    <div className="text-xs text-gray-600">曜日別トレーニング計画</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Zap" size={18} className="text-purple-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">ショートカット</div>
                                                    <div className="text-xs text-gray-600">素早い記録入力</div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-center text-xs text-gray-500">
                                            7日間はすべての機能が無料で使えます
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* ページインジケーター */}
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3].map(page => (
                                    <div
                                        key={page}
                                        className={`w-2 h-2 rounded-full ${
                                            page === currentModalPage ? 'bg-purple-600' : 'bg-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* ナビゲーションボタン */}
                            <div className="flex gap-3">
                                {currentModalPage > 1 && (
                                    <button
                                        onClick={() => setCurrentModalPage(currentModalPage - 1)}
                                        className="w-1/3 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                                    >
                                        戻る
                                    </button>
                                )}
                                {currentModalPage < 3 ? (
                                    <button
                                        onClick={() => setCurrentModalPage(currentModalPage + 1)}
                                        className={`${currentModalPage === 1 ? 'w-full' : 'w-2/3'} bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors`}
                                    >
                                        次へ
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowFeatureUnlockModal(false);
                                            // 新機能開放モーダル完了フラグを設定（初回分析完了モーダル表示トリガー）
                                            localStorage.setItem('featureUnlockModalsCompleted', 'true');

                                            // 分析セクションまで自動スクロール
                                            setTimeout(() => {
                                                const analysisSection = document.getElementById('analysis-section');
                                                if (analysisSection) {
                                                    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }
                                            }, 300);
                                        }}
                                        className="w-2/3 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                                    >
                                        確認しました
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 初回分析完了＋Premium誘導モーダル */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                        {/* ヘッダー（紫グラデーション） */}
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center relative">
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                            <div className="mb-3">
                                <Icon name="Crown" size={48} className="mx-auto mb-2" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">🎉 初回分析完了！</h2>
                            <p className="text-sm opacity-90">AIがあなた専用の分析レポートを作成しました</p>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-4">
                            {/* Premium会員の特典 */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="Sparkles" size={18} className="text-purple-600" />
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
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    alert('サブスクリプション画面は準備中です');
                                }}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                <Icon name="Crown" size={20} />
                                Premium会員に登録する
                            </button>

                            {/* 後で */}
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="w-full text-gray-600 text-sm hover:text-gray-800 transition"
                            >
                                後で確認する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* レベルアップモーダル */}
            {showLevelUpModal && levelUpData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-bounce-in">
                        {/* ヘッダー */}
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                            <div className="relative z-10">
                                <Icon name="Trophy" size={48} className="text-yellow-300 mx-auto mb-3" />
                                <h2 className="text-2xl font-bold text-white mb-1">レベルアップ！</h2>
                                <p className="text-purple-100 text-sm">おめでとうございます</p>
                            </div>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-6">
                            {/* 新しいレベル */}
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-2">あなたの新しいレベル</p>
                                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-full px-6 py-3">
                                    <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                                        {levelUpData.level}
                                    </div>
                                    <span className="text-2xl font-bold text-purple-600">Level {levelUpData.level}</span>
                                </div>
                            </div>

                            {/* 獲得クレジット */}
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">獲得クレジット</span>
                                    <Icon name="Award" size={20} className="text-yellow-600" />
                                </div>
                                <div className="text-3xl font-bold text-yellow-600 text-center">
                                    +{levelUpData.creditsEarned}
                                </div>
                                <p className="text-xs text-center text-gray-600 mt-2">
                                    Gemini API {levelUpData.creditsEarned}回分
                                </p>
                            </div>

                            {/* マイルストーン達成 */}
                            {levelUpData.milestoneReached && levelUpData.milestoneReached.length > 0 && (
                                <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon name="Star" size={18} className="text-pink-600" />
                                        <span className="text-sm font-bold text-gray-700">マイルストーン達成！</span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Level {levelUpData.milestoneReached.join(', ')} 到達ボーナス獲得
                                    </p>
                                </div>
                            )}

                            {/* 閉じるボタン */}
                            <button
                                onClick={() => {
                                    setShowLevelUpModal(false);
                                    setLevelUpData(null);
                                }}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                            >
                                確認しました
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 体脂肪率推定モーダル */}
            {visualGuideModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white p-4 flex justify-between items-center z-10">
                            <h3 className="font-bold text-lg">外見から体脂肪率を推定</h3>
                            <button onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 font-medium">
                                    ⚠️ この推定値は外見に基づく主観的評価であり、実際の体脂肪率と±3-5%の誤差があります。正確な測定には体組成計の使用を強く推奨します。
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">性別を選択</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setVisualGuideModal({ ...visualGuideModal, gender: '男性' })}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 ${visualGuideModal.gender === '男性' ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-300'}`}
                                    >
                                        男性
                                    </button>
                                    <button
                                        onClick={() => setVisualGuideModal({ ...visualGuideModal, gender: '女性' })}
                                        className={`flex-1 px-4 py-2 rounded-lg border-2 ${visualGuideModal.gender === '女性' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-300'}`}
                                    >
                                        女性
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-3">
                                    あなたの体型に最も近いレベルを選択してください (1-10)
                                </label>
                                <div className="space-y-2">
                                    {LBMUtils.getVisualGuideInfo(visualGuideModal.gender).map((guide) => {
                                        const isSelected = visualGuideModal.selectedLevel === guide.level;
                                        return (
                                            <button
                                                key={guide.level}
                                                onClick={() => setVisualGuideModal({ ...visualGuideModal, selectedLevel: guide.level })}
                                                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                                                    isSelected
                                                        ? 'border-orange-600 bg-orange-50'
                                                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                                        isSelected ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                        {guide.level}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-gray-900">{guide.title}</span>
                                                            <span className="text-sm text-gray-600">({guide.range})</span>
                                                        </div>
                                                        <ul className="text-sm text-gray-700 space-y-1">
                                                            {guide.features.map((feature, idx) => (
                                                                <li key={idx}>• {feature}</li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-gray-500 mt-2">健康: {guide.health}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg border border-orange-200">
                                <p className="text-sm font-medium text-gray-700 mb-2">推定結果</p>
                                <p className="text-3xl font-bold text-orange-600">
                                    {LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel).bodyFatPercentage}%
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                    {LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel).description}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={() => {
                                        const estimate = LBMUtils.estimateBodyFatByAppearance(visualGuideModal.gender, visualGuideModal.selectedLevel);
                                        updateBodyComposition(bodyComposition.weight, estimate.bodyFatPercentage);
                                        setVisualGuideModal({ ...visualGuideModal, show: false });
                                    }}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-pink-600 text-white rounded-lg hover:from-orange-700 hover:to-pink-700 font-medium"
                                >
                                    この値を使用
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 食事セクション説明モーダル */}
            {showMealInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="Utensils" size={20} />
                                食事記録の使い方
                            </h3>
                            <button
                                onClick={() => setShowMealInfoModal(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 記録方法 */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Plus" size={20} className="text-green-600" />
                                    食事の記録方法
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                        <p className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                            <Icon name="Camera" size={18} />
                                            方法1: 写真から記録（AI解析）
                                        </p>
                                        <p className="text-sm text-purple-800 mb-2">
                                            食事の写真を撮影すると、AIが自動で食材を認識して栄養素を計算します。最も簡単な方法です。精肉のパックを解析すると、g数がそのまま一覧に登録されます。
                                        </p>
                                        <p className="text-xs text-purple-700">
                                            💡 クレジット1個消費 | 複数の食材を一度に認識可能
                                        </p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            <Icon name="Search" size={18} />
                                            方法2: 検索して記録
                                        </p>
                                        <p className="text-sm text-blue-800 mb-2">
                                            食材名で検索してデータベースから選択します。正確な栄養素データで記録できます。
                                        </p>
                                        <p className="text-xs text-blue-700">
                                            💡 クレジット不要 | 1,000種類以上の食材データベース
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                            <Icon name="Edit" size={18} />
                                            方法3: 手動で作成
                                        </p>
                                        <p className="text-sm text-amber-800 mb-2">
                                            カスタム食材を自分で作成します。栄養成分表示や八訂データを参照して入力します。
                                        </p>
                                        <p className="text-xs text-amber-700">
                                            💡 クレジット不要 | 一度作成すると保存され、次回から簡単に使用可能
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                                    <p className="text-sm text-green-800">
                                        <strong>💡 推奨:</strong> Your Coach+は自炊での食事管理を前提として設計されています。食材単位で記録することで、より正確な栄養管理が可能になります。
                                    </p>
                                </div>
                            </div>

                            {/* テンプレート機能 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Clock" size={20} className="text-indigo-600" />
                                    テンプレート機能
                                </h4>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                    <p className="font-semibold text-indigo-900 mb-2">
                                        よく食べる食事を保存して簡単に記録
                                    </p>
                                    <p className="text-sm text-indigo-800 mb-3">
                                        12日以上利用すると開放される機能です。頻繁に食べる食事の組み合わせをテンプレートとして保存できます。
                                    </p>
                                    <div className="bg-white rounded p-3 text-sm text-gray-700 border border-indigo-300">
                                        <p className="font-semibold mb-1">使い方:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-xs">
                                            <li>食事を記録した後、「テンプレートとして保存」をタップ</li>
                                            <li>次回から記録画面の下部にテンプレートが表示される</li>
                                            <li>テンプレートをタップすると、保存した食事がすぐに追加される</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            {/* 編集・削除 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Settings" size={20} className="text-gray-600" />
                                    編集・削除
                                </h4>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <p className="font-semibold text-gray-900 mb-2">食事を編集・削除する</p>
                                    <p className="text-sm text-gray-700 mb-2">
                                        食事カードの右上にある「ペン」アイコンで食事全体を編集、「ゴミ箱」アイコンで削除できます。
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        💡 各食材の個別編集・削除は、編集画面で行えます。
                                    </p>
                                </div>
                            </div>

                            {/* 閉じるボタン */}
                            <div className="pt-4 border-t">
                                <button
                                    onClick={() => setShowMealInfoModal(false)}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 運動セクション説明モーダル */}
            {showWorkoutInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        {/* ヘッダー */}
                        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="Dumbbell" size={20} />
                                運動記録の使い方
                            </h3>
                            <button
                                onClick={() => setShowWorkoutInfoModal(false)}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                            >
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 記録方法 */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Plus" size={20} className="text-orange-600" />
                                    運動の記録方法
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                            <Icon name="Search" size={18} />
                                            方法1: 検索して記録
                                        </p>
                                        <p className="text-sm text-blue-800 mb-2">
                                            種目名で検索してデータベースから選択します。
                                        </p>
                                        <p className="text-xs text-blue-700">
                                            💡 100種類以上の運動種目データベース
                                        </p>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                            <Icon name="Edit" size={18} />
                                            方法2: 手動で作成
                                        </p>
                                        <p className="text-sm text-amber-800 mb-2">
                                            カスタム種目を自分で作成します。オリジナルの運動を記録できます。
                                        </p>
                                        <p className="text-xs text-amber-700">
                                            💡 一度作成すると保存され、次回から簡単に使用可能
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 入力項目 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="Edit3" size={20} className="text-purple-600" />
                                    入力項目
                                </h4>
                                <div className="space-y-2">
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <p className="font-semibold text-purple-900 mb-1">種目・セット</p>
                                        <p className="text-sm text-purple-800">
                                            運動の種目名と実施したセット数を入力します。
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <p className="font-semibold text-purple-900 mb-1">重量・回数</p>
                                        <p className="text-sm text-purple-800 mb-2">
                                            筋トレの場合は、使用重量（kg）と回数を入力します。自重トレーニングの場合は、自分の体重（kg）を記入します。
                                        </p>
                                        <p className="text-xs text-purple-700">
                                            💡 総重量 = 重量 × 回数 × セット数
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <p className="font-semibold text-purple-900 mb-1">時間</p>
                                        <p className="text-sm text-purple-800">
                                            運動の実施時間（分）を入力します。筋トレ、有酸素運動、ストレッチなど、すべての運動で記録できます。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* RM値について */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="TrendingUp" size={20} className="text-green-600" />
                                    RM値とは
                                </h4>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="font-semibold text-green-900 mb-2">
                                        Repetition Maximum（最大挙上重量）
                                    </p>
                                    <p className="text-sm text-green-800 mb-3">
                                        RM値は、その重量で何回できるかを示す指標です。例えば、100kgで10回できる場合、「10RM = 100kg」となります。
                                    </p>
                                    <div className="bg-white rounded p-3 text-sm text-gray-700 border border-green-300">
                                        <p className="font-semibold mb-2">RM値の計算式:</p>
                                        <p className="text-xs mb-2">1RM（最大挙上重量） = 使用重量 × (1 + 回数 ÷ 40)</p>
                                        <p className="text-xs text-green-700">
                                            例: 80kg × 10回 → 1RM = 100kg
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 総重量と総時間 */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                    <Icon name="BarChart3" size={20} className="text-indigo-600" />
                                    総重量と総時間の表示
                                </h4>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                    <p className="font-semibold text-indigo-900 mb-2">
                                        運動セクションの見出し横に表示
                                    </p>
                                    <p className="text-sm text-indigo-800 mb-3">
                                        その日の筋トレ総重量（kg）と全運動の総時間（分）が自動で集計されて表示されます。
                                    </p>
                                    <div className="bg-white rounded p-3 text-sm text-gray-700 border border-indigo-300 space-y-1">
                                        <p className="text-xs"><strong>総重量:</strong> すべての筋トレ種目の「重量×回数×セット数」の合計</p>
                                        <p className="text-xs"><strong>総時間:</strong> すべての運動の時間の合計</p>
                                    </div>
                                </div>
                            </div>

                            {/* 閉じるボタン */}
                            <div className="pt-4 border-t">
                                <button
                                    onClick={() => setShowWorkoutInfoModal(false)}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3 rounded-lg hover:from-orange-700 hover:to-red-700 transition"
                                >
                                    閉じる
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== Level Banner Component =====
const LevelBanner = ({ user, setInfoModal }) => {
    const [expData, setExpData] = useState(null);

    useEffect(() => {
        loadExperienceData();

        // レベルアップイベントと経験値更新イベントをリッスン
        const handleLevelUp = (event) => {
            loadExperienceData();
        };
        const handleExperienceUpdate = (event) => {
            loadExperienceData();
        };
        const handleCreditUpdate = () => {
            loadExperienceData();
        };

        window.addEventListener('levelUp', handleLevelUp);
        window.addEventListener('experienceUpdated', handleExperienceUpdate);
        window.addEventListener('creditUpdated', handleCreditUpdate);

        return () => {
            window.removeEventListener('levelUp', handleLevelUp);
            window.removeEventListener('experienceUpdated', handleExperienceUpdate);
            window.removeEventListener('creditUpdated', handleCreditUpdate);
        };
    }, [user]);

    const loadExperienceData = async () => {
        if (!user) return;
        try {
            const data = await ExperienceService.getUserExperience(user.uid);
            const expToNext = ExperienceService.getExpToNextLevel(data.level, data.experience);
            const progress = Math.round((expToNext.current / expToNext.required) * 100);

            setExpData({
                level: data.level,
                experience: data.experience,
                totalCredits: data.totalCredits,
                freeCredits: data.freeCredits,
                paidCredits: data.paidCredits,
                expProgress: progress,
                expCurrent: expToNext.current,
                expRequired: expToNext.required
            });
        } catch (error) {
            console.error('[LevelBanner] Failed to load experience data:', error);
        }
    };

    if (!expData) {
        return null; // ローディング中は何も表示しない
    }

    return (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-md">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="bg-white text-purple-600 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                        {expData.level}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-white text-sm">Level {expData.level}</h3>
                            <span className="text-xs text-purple-200">{expData.expCurrent || 0} / {expData.expRequired || 100} XP</span>
                        </div>
                        <div className="relative w-32 bg-white/20 rounded-full h-1.5 overflow-hidden mt-1">
                            <div
                                className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(expData.expProgress || 0, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                            <Icon name="Award" size={12} className="text-white" />
                            <span className="text-xs text-white">クレジット</span>
                        </div>
                        <div className="text-lg font-bold text-white">
                            {expData.totalCredits}
                        </div>
                    </div>
                    <button
                        onClick={() => setInfoModal({
                            show: true,
                            title: '💳 クレジットシステム',
                            content: `クレジットはGemini API（AI機能）を利用する際に消費されるポイントです。

【消費されるタイミング】
• 分析機能（1回につき1クレジット）
• 写真解析機能（1回につき1クレジット）

【獲得方法】
• 初回登録：14クレジット付与
• レベルアップ：3クレジット/回
• リワード：10/20/30...レベル到達で10クレジット

【経験値の獲得】
• 分析実行後、食事・運動・コンディションのスコアが経験値として加算されます
• 1日最大300XP（各項目100点満点）
• レベルアップ必要経験値は累進（Lv2=100XP、Lv3=200XP...）

【クレジットの種類】
• 無料付与：レベルアップ等で獲得
• 有料購入：追加購入分
※消費時は無料→有料の順に使用されます

【実質無料期間】
毎日分析1回+写真解析1回の場合、約28日間完全無料で利用可能です。`
                        })}
                        className="text-white hover:text-purple-100 transition-colors"
                    >
                        <Icon name="Info" size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===== Directive Edit Modal Component =====
const DirectiveEditModal = ({ directive, onClose, onSave, onDelete, getCategoryIcon, getCategoryLabel, getCategoryColor }) => {
    const [editedMessage, setEditedMessage] = useState(directive.message);
    const [editedType, setEditedType] = useState(directive.type);

    const handleSave = () => {
        if (!editedMessage.trim()) {
            alert('指示内容を入力してください');
            return;
        }
        onSave({ ...directive, message: editedMessage.trim(), type: editedType });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
                {/* ヘッダー */}
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Icon name="Edit3" size={20} className="text-purple-600" />
                        指示書を編集
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <Icon name="X" size={24} />
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="p-4 space-y-4">
                    {/* カテゴリー選択 */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">カテゴリー</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['meal', 'exercise', 'condition'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setEditedType(type)}
                                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                                        editedType === type
                                            ? `bg-gradient-to-r ${getCategoryColor(type).bg} border-2 ${getCategoryColor(type).border} ${getCategoryColor(type).text}`
                                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    <Icon name={getCategoryIcon(type)} size={14} />
                                    {getCategoryLabel(type)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 指示内容 */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">指示内容</label>
                        <textarea
                            value={editedMessage}
                            onChange={(e) => setEditedMessage(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                            rows="3"
                            placeholder="例: 鶏むね肉150g追加"
                        />
                    </div>
                </div>

                {/* アクションボタン */}
                <div className="p-4 border-t flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg hover:bg-purple-700 transition font-semibold text-sm"
                    >
                        保存
                    </button>
                    <button
                        onClick={onDelete}
                        className="px-4 bg-red-50 text-red-600 py-2.5 rounded-lg hover:bg-red-100 transition font-semibold text-sm border border-red-300"
                    >
                        削除
                    </button>
                </div>
            </div>
        </div>
    );
};

