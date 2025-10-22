// ===== Dashboard Component =====
const DashboardView = ({ dailyRecord, targetPFC, unlockedFeatures, onDeleteItem, profile, setInfoModal, yesterdayRecord, setDailyRecord, user, currentDate, onDateChange }) => {
    // 予測入力を実行する関数
    const loadPredictedData = () => {
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
            supplements: [
                ...(dailyRecord.supplements?.filter(s => !s.isPredicted) || []),
                ...(yesterdayRecord.supplements?.map(supp => ({
                    ...supp,
                    id: Date.now() + Math.random(),
                    isPredicted: true
                })) || [])
            ],
            conditions: dailyRecord.conditions
        };
        setDailyRecord(copiedRecord);
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

    // サプリメントも摂取量に加算
    dailyRecord.supplements?.forEach(supp => {
        supp.items?.forEach(item => {
            currentIntake.calories += item.calories || 0;
            currentIntake.protein += item.protein || 0;
            currentIntake.fat += item.fat || 0;
            currentIntake.carbs += item.carbs || 0;

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

    // 達成率の計算
    const caloriesPercent = (currentIntake.calories / targetPFC.calories) * 100;
    const proteinPercent = (currentIntake.protein / targetPFC.protein) * 100;
    const fatPercent = (currentIntake.fat / targetPFC.fat) * 100;
    const carbsPercent = (currentIntake.carbs / targetPFC.carbs) * 100;

    // 今日かどうかのチェック（タイトル表示用）
    const isToday = () => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return currentDate === todayStr;
    };

    return (
        <div className="space-y-4">
            {/* PFCサマリー */}
            <div className="bg-white rounded-xl shadow-sm p-6 slide-up">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-bold">デイリー記録</h3>
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
                            <span className="font-medium">摂取カロリー</span>
                            <div className="text-sm text-right">
                                <div className="font-bold" style={{ color: '#8BA3C7' }}>
                                    {Math.round(currentIntake.calories)} / {targetPFC.calories} kcal
                                </div>
                            </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(caloriesPercent, 100)}%`,
                                    backgroundColor: '#8BA3C7'
                                }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">タンパク質 (P)</span>
                            <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
                                {currentIntake.protein.toFixed(1)} / {targetPFC.protein} g
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(proteinPercent, 100)}%`,
                                    backgroundColor: '#EF4444'
                                }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">脂質 (F)</span>
                            <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                                {currentIntake.fat.toFixed(1)} / {targetPFC.fat} g
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(fatPercent, 100)}%`,
                                    backgroundColor: '#F59E0B'
                                }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">炭水化物 (C)</span>
                            <span className="text-sm font-bold" style={{ color: '#10B981' }}>
                                {currentIntake.carbs.toFixed(1)} / {targetPFC.carbs} g
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(carbsPercent, 100)}%`,
                                    backgroundColor: '#10B981'
                                }}
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
            <div className="bg-white rounded-xl shadow-sm p-6 slide-up">
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
                        {yesterdayRecord && (dailyRecord.meals?.some(m => m.isPredicted) || dailyRecord.workouts?.some(w => w.isPredicted) || dailyRecord.supplements?.some(s => s.isPredicted)) && (
                            <button
                                onClick={async () => {
                                    // 予測入力された記録のみを削除
                                    const clearedRecord = {
                                        ...dailyRecord,
                                        meals: dailyRecord.meals?.filter(m => !m.isPredicted) || [],
                                        workouts: dailyRecord.workouts?.filter(w => !w.isPredicted) || [],
                                        supplements: dailyRecord.supplements?.filter(s => !s.isPredicted) || [],
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

                {(dailyRecord.meals?.length === 0 || !dailyRecord.meals) &&
                 (dailyRecord.workouts?.length === 0 || !dailyRecord.workouts) &&
                 (dailyRecord.supplements?.length === 0 || !dailyRecord.supplements) ? (
                    <div className="text-center py-12">
                        <Icon name="UtensilsCrossed" size={48} className="text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-3 font-semibold">まだ記録がありません</p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-sm text-indigo-600">
                                <span className="font-bold">①</span>
                                <Icon name="Settings" size={16} />
                                <span>：右上の設定でプロフィールを入力</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-sm text-indigo-600">
                                <span className="font-bold">②</span>
                                <Icon name="Plus" size={16} />
                                <span>：右下の＋ボタンから記録を開始</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dailyRecord.meals?.map((meal, index) => (
                            <div key={meal.id || index} className={`border rounded-lg p-4 hover:border-emerald-300 transition ${meal.isPredicted ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Utensils" size={16} className="text-emerald-600" />
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
                                        <p className="font-bold text-emerald-600 mb-2">{meal.calories} kcal</p>
                                        <button
                                            onClick={() => onDeleteItem('meal', meal.id)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            <Icon name="Trash2" size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {dailyRecord.workouts?.map((workout, index) => (
                            <div key={workout.id || index} className={`border rounded-lg p-4 hover:border-orange-300 transition ${workout.isPredicted ? 'border-blue-300 bg-white' : 'border-gray-200 bg-white'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Dumbbell" size={16} className="text-orange-600" />
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
                                        <div className="flex items-center gap-1 justify-end mb-2">
                                            <p className="font-bold text-orange-600">-{workout.caloriesBurned} kcal</p>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '独自アルゴリズム『PG式』とは？',
                                                    content: `従来の消費カロリー計算（METs法）の欠点を克服するために独自開発した、本アプリの核心的技術です。

単なる運動強度だけでなく、物理的仕事量（重量、回数、可動距離）や生理的コスト（TUT、インターバル）などを多角的に解析することで、あなたの「純粋な努力」を科学的かつ正当に評価します。

【PG式の特徴】
• 個人のLBM（除脂肪体重）に基づく精密計算
• 重量・回数・可動距離を考慮した物理的仕事量
• TUT（筋緊張時間）やインターバルの生理的コスト
• 単なる時間ベースではない正確な評価`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </div>
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
                        {dailyRecord.supplements?.map((supplement, index) => {
                            // 合計タンパク質を計算
                            const totalProtein = (supplement.items || []).reduce((sum, item) => sum + (item.protein || 0), 0);

                            return (
                                <div key={supplement.id || index} className={`border rounded-lg p-4 hover:border-blue-300 transition ${supplement.isPredicted ? 'border-blue-300 bg-white' : 'border-gray-200 bg-white'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon name="Pill" size={16} className="text-blue-600" />
                                                <p className="font-medium">{supplement.name}</p>
                                                {supplement.isPredicted && (
                                                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Icon name="Sparkles" size={10} />
                                                        昨日から
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">{supplement.time}</p>
                                            {supplement.items?.map((item, i) => {
                                                // 正確な分量表示を最適化
                                                const servings = item.servings || 1;
                                                const servingSize = item.servingSize || 0;
                                                const servingUnit = item.servingUnit || 'g';
                                                const totalAmount = servings * servingSize;
                                                const unit = item.unit || `${servingSize}${servingUnit}`;

                                                // 表示形式の最適化
                                                let displayText = '';
                                                if (servings === 1) {
                                                    // 1回分の場合はシンプルに表示
                                                    displayText = `${item.name} ${unit}`;
                                                } else {
                                                    // 複数回分の場合
                                                    displayText = `${item.name} ${servings}回分 = ${totalAmount}${servingUnit}`;
                                                }

                                                return (
                                                    <p key={i} className="text-sm text-gray-600">
                                                        {displayText}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-blue-600">P: {totalProtein.toFixed(1)}g</p>
                                            <button
                                                onClick={() => onDeleteItem('supplement', supplement.id)}
                                                className="text-red-500 hover:text-red-700 text-sm mt-2"
                                            >
                                                <Icon name="Trash2" size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
