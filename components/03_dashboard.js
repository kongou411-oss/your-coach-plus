// ===== Dashboard Component =====
const DashboardView = ({ dailyRecord, targetPFC, unlockedFeatures, setUnlockedFeatures, onDeleteItem, profile, setInfoModal, yesterdayRecord, setDailyRecord, user, currentDate, onDateChange, triggers = {}, shortcuts = [], onShortcutClick, onFeatureUnlocked }) => {
    // 指示書管理
    const [todayDirective, setTodayDirective] = useState(null);
    const [showDirectiveEdit, setShowDirectiveEdit] = useState(false);

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

    // 指示書を読み込む
    useEffect(() => {
        loadDirective();
        // directiveUpdatedイベントをリッスン
        window.addEventListener('directiveUpdated', loadDirective);
        return () => window.removeEventListener('directiveUpdated', loadDirective);
    }, [currentDate]);

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

            // ビタミン・ミネラル
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
                <div id="directive-section" className="bg-green-50 rounded-xl border-2 border-green-200 p-4 slide-up">
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
                                    const updated = { ...bodyComposition, weight: newWeight };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, weight: newWeight }));
                                    window.dispatchEvent(new Event('profileUpdated'));
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const newWeight = Math.max(0, bodyComposition.weight - 0.1);
                                    const updated = { ...bodyComposition, weight: parseFloat(newWeight.toFixed(1)) };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, weight: parseFloat(newWeight.toFixed(1)) }));
                                    window.dispatchEvent(new Event('profileUpdated'));
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
                                    const newWeight = bodyComposition.weight + 0.1;
                                    const updated = { ...bodyComposition, weight: parseFloat(newWeight.toFixed(1)) };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, weight: parseFloat(newWeight.toFixed(1)) }));
                                    window.dispatchEvent(new Event('profileUpdated'));
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const newWeight = bodyComposition.weight + 1;
                                    const updated = { ...bodyComposition, weight: newWeight };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, weight: newWeight }));
                                    window.dispatchEvent(new Event('profileUpdated'));
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
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const newBodyFat = Math.max(0, bodyComposition.bodyFatPercentage - 1);
                                    const updated = { ...bodyComposition, bodyFatPercentage: newBodyFat };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, bodyFatPercentage: newBodyFat }));
                                    window.dispatchEvent(new Event('profileUpdated'));
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const newBodyFat = Math.max(0, bodyComposition.bodyFatPercentage - 0.1);
                                    const updated = { ...bodyComposition, bodyFatPercentage: parseFloat(newBodyFat.toFixed(1)) };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, bodyFatPercentage: parseFloat(newBodyFat.toFixed(1)) }));
                                    window.dispatchEvent(new Event('profileUpdated'));
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
                                    const newBodyFat = bodyComposition.bodyFatPercentage + 0.1;
                                    const updated = { ...bodyComposition, bodyFatPercentage: parseFloat(newBodyFat.toFixed(1)) };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, bodyFatPercentage: parseFloat(newBodyFat.toFixed(1)) }));
                                    window.dispatchEvent(new Event('profileUpdated'));
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const newBodyFat = bodyComposition.bodyFatPercentage + 1;
                                    const updated = { ...bodyComposition, bodyFatPercentage: newBodyFat };
                                    setBodyComposition(updated);
                                    const savedProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                                    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify({ ...savedProfile, bodyFatPercentage: newBodyFat }));
                                    window.dispatchEvent(new Event('profileUpdated'));
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
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Icon name="Utensils" size={18} className="text-green-600" />
                            食事
                        </h4>
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
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="Dumbbell" size={18} className="text-orange-600" />
                                    運動
                                </h4>
                                {dailyRecord.workouts?.length > 0 && (() => {
                                    // 総重量と総時間を計算
                                    let totalWeight = 0;
                                    let totalDuration = 0;

                                    dailyRecord.workouts.forEach(workout => {
                                        workout.exercises?.forEach(exercise => {
                                            exercise.sets?.forEach(set => {
                                                totalWeight += (set.weight || 0) * (set.reps || 0);
                                                totalDuration += (set.duration || 0);
                                            });
                                        });
                                    });

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
                                                {workout.exercises?.map((exercise, i) => (
                                                    <div key={i} className="text-sm text-gray-600">
                                                        <p className="font-medium">{exercise.name}</p>
                                                        {exercise.sets?.map((set, si) => (
                                                            <p key={si} className="text-xs">
                                                                Set {si + 1}: {set.weight}kg × {set.reps}回
                                                            </p>
                                                        ))}
                                                    </div>
                                                ))}
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

                        {/* 閃きセクション */}
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
                    </div>
                )}

                {/* 分析ボタン - コンディション完了後に開放 */}
                {unlockedFeatures.includes('analysis') && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="PieChart" size={18} className="text-indigo-600" />
                                分析
                            </h4>
                            <button
                                onClick={() => window.handleQuickAction && window.handleQuickAction('analysis')}
                                className="text-sm px-4 py-2 bg-indigo-100 border border-indigo-400 text-indigo-800 rounded-lg hover:bg-indigo-200 transition font-medium"
                            >
                                + 分析
                            </button>
                        </div>
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

            {/* ショートカット */}
            {shortcuts && shortcuts.length > 0 && onShortcutClick && (
                <ChevronShortcut shortcuts={shortcuts} onShortcutClick={onShortcutClick} />
            )}
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

