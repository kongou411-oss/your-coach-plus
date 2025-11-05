import React from 'react';

// ===== Score Doughnut Chart Component =====
const ScoreDoughnutChart = ({ profile, dailyRecord, targetPFC }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    const scores = DataService.calculateScores(profile, dailyRecord, targetPFC);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // 既存のチャートを破棄
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        // 新しいチャートを作成
        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['食事', '運動', 'コンディション'],
                datasets: [{
                    data: [scores.food.score, scores.exercise.score, scores.condition.score],
                    backgroundColor: ['#10b981', '#f97316', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${context.parsed}/100`;
                            }
                        }
                    }
                }
            }
        });

        // クリーンアップ
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [scores.food.score, scores.exercise.score, scores.condition.score]);

    const averageScore = Math.round((scores.food.score + scores.exercise.score + scores.condition.score) / 3);

    return (
        <div>
            <div className="relative max-w-[200px] mx-auto mb-4">
                <canvas ref={canvasRef}></canvas>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">{averageScore}</div>
                        <div className="text-xs text-gray-500">平均</div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                    <div className="text-xs text-gray-600 mb-1">食事</div>
                    <div className="text-2xl font-bold text-green-600">{scores.food.score}</div>
                </div>
                <div>
                    <div className="text-xs text-gray-600 mb-1">運動</div>
                    <div className="text-2xl font-bold text-orange-600">{scores.exercise.score}</div>
                </div>
                <div>
                    <div className="text-xs text-gray-600 mb-1">コンディション</div>
                    <div className="text-2xl font-bold text-red-600">{scores.condition.score}</div>
                </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">AIによる詳細な栄養分析を確認できます</p>
        </div>
    );
};

// ===== Dashboard Component =====
const DashboardView = ({ dailyRecord, targetPFC, unlockedFeatures, setUnlockedFeatures, onDeleteItem, profile, setUserProfile, setInfoModal, yesterdayRecord, setDailyRecord, user, currentDate, onDateChange, triggers, shortcuts, onShortcutClick, onFeatureUnlocked, currentRoutine, onLoadRoutineData }) => {
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

    // 体脂肪率推定モーダル
    const [visualGuideModal, setVisualGuideModal] = useState({
        show: false,
        gender: profile?.gender || '男性',
        selectedLevel: 5
    });

    // 体組成の状態管理
    const [bodyComposition, setBodyComposition] = useState({
        weight: 0,
        bodyFatPercentage: 0
    });

    // 体組成入力中の一時的な値（文字列で保持）
    const [weightInput, setWeightInput] = useState('');
    const [bodyFatInput, setBodyFatInput] = useState('');

    // タブ管理
    const [activeTab, setActiveTab] = useState('nutrition'); // 'nutrition', 'directive'

    // 今日の日付を取得
    const getTodayDate = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    // 今日のdailyRecordから体組成を読み込む
    useEffect(() => {
        let isMounted = true;

        const loadTodayBodyComposition = async () => {
            try {
                const todayDate = getTodayDate();
                const record = await DataService.getDailyRecord(user.uid, todayDate);
                if (record?.bodyComposition && isMounted) {
                    // 数値に変換し、不正な値は0にする
                    const weight = parseFloat(record.bodyComposition.weight) || 0;
                    const bodyFat = parseFloat(record.bodyComposition.bodyFatPercentage) || 0;
                    setBodyComposition({
                        weight: weight,
                        bodyFatPercentage: bodyFat
                    });
                    // 入力フィールドの初期値も設定
                    setWeightInput(weight > 0 ? weight.toString() : '');
                    setBodyFatInput(bodyFat > 0 ? bodyFat.toString() : '');
                }
            } catch (error) {
                console.error('[Dashboard] Failed to load body composition:', error);
            }
        };
        if (user?.uid) {
            loadTodayBodyComposition();
        }

        return () => {
            isMounted = false;
        };
    }, [user?.uid]);

    // 体組成を更新する共通ハンドラー
    const updateBodyComposition = async (newWeight, newBodyFat) => {
        const updated = {
            weight: newWeight,
            bodyFatPercentage: newBodyFat
        };
        setBodyComposition(updated);

        // dailyRecordに保存
        try {
            const todayDate = getTodayDate();
            const currentRecord = await DataService.getDailyRecord(user.uid, todayDate) || {};
            const updatedRecord = {
                ...currentRecord,
                bodyComposition: updated
            };
            await DataService.saveDailyRecord(user.uid, todayDate, updatedRecord);
            setDailyRecord(updatedRecord);

            // userProfileも更新（推奨量の再計算のため）
            if (profile && setUserProfile) {
                const newLBM = LBMUtils.calculateLBM(newWeight, newBodyFat);
                const updatedProfile = {
                    ...profile,
                    weight: newWeight,
                    bodyFatPercentage: newBodyFat,
                    leanBodyMass: newLBM
                };
                setUserProfile(updatedProfile);
                // Firestoreにも保存
                await DataService.saveUserProfile(user.uid, updatedProfile);
            }
        } catch (error) {
            console.error('[Dashboard] Failed to save body composition to dailyRecord:', error);
        }
    };

    // 機能開放モーダルのフラグをチェック（初回分析完了後に一度だけ表示）
    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const checkAndShowModal = () => {
            const shouldShow = localStorage.getItem('showFeatureUnlockModals');
            if (shouldShow === 'true') {
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        setCurrentModalPage(1); // ページ1から開始
                        setShowFeatureUnlockModal(true);
                        localStorage.removeItem('showFeatureUnlockModals');
                    }
                }, 300); // 少し遅延させてスムーズに表示
            }
        };

        // 初回マウント時にチェック
        checkAndShowModal();

        // カスタムイベントをリッスン（分析完了時に発火）
        const handleFeatureUnlock = () => {
            checkAndShowModal();
        };
        window.addEventListener('featureUnlockCompleted', handleFeatureUnlock);

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener('featureUnlockCompleted', handleFeatureUnlock);
        };
    }, []); // 空の依存配列：コンポーネントマウント時に一度だけ実行

    // 新機能開放モーダル完了後、Premium誘導モーダルを表示
    useEffect(() => {
        let isMounted = true;

        const checkUpgradeModalFlag = () => {
            const featureUnlockCompleted = localStorage.getItem('featureUnlockModalsCompleted');
            const upgradeModalPending = localStorage.getItem('showUpgradeModalPending');

            if (featureUnlockCompleted === 'true' && upgradeModalPending === 'true' && isMounted) {
                setShowUpgradeModal(true);
                localStorage.removeItem('featureUnlockModalsCompleted');
                localStorage.removeItem('showUpgradeModalPending');
            }
        };

        // 初回チェック
        checkUpgradeModalFlag();

        // 定期的にチェック（500ms間隔）
        const intervalId = setInterval(checkUpgradeModalFlag, 500);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
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

    // 経験値・レベル情報を読み込む関数
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

    // 指示書を読み込む関数
    const loadDirective = React.useCallback(() => {
        const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
        if (savedDirectives) {
            const directives = JSON.parse(savedDirectives);
            const today = currentDate || getTodayDate();
            const directive = directives.find(d => d.date === today);
            setTodayDirective(directive || null);
        }
    }, [currentDate]);

    // 指示書を読み込む
    useEffect(() => {
        loadDirective();
        // directiveUpdatedイベントをリッスン
        window.addEventListener('directiveUpdated', loadDirective);
        return () => window.removeEventListener('directiveUpdated', loadDirective);
    }, [loadDirective]);

    // 経験値・レベル情報を読み込む
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) {
                await loadExperienceData();
            }
        };

        loadData();

        // レベルアップイベントをリッスン
        const handleLevelUp = (event) => {
            if (isMounted) {
                setLevelUpData(event.detail);
                setShowLevelUpModal(true);
                loadExperienceData();
            }
        };
        // クレジット更新イベントをリッスン（写真解析などでクレジット消費時）
        const handleCreditUpdate = () => {
            if (isMounted) {
                loadExperienceData();
            }
        };
        window.addEventListener('levelUp', handleLevelUp);
        window.addEventListener('creditUpdated', handleCreditUpdate);
        return () => {
            isMounted = false;
            window.removeEventListener('levelUp', handleLevelUp);
            window.removeEventListener('creditUpdated', handleCreditUpdate);
        };
    }, [user]);

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
            case 'condition': return { bg: 'from-sky-50 to-blue-50', border: 'border-sky-600', text: 'text-sky-700', icon: 'text-sky-600' };
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

            {/* タブ式サマリー */}
            <div className="bg-white rounded-xl shadow-sm p-6 slide-up border-2 border-gray-200">
                {/* タブナビゲーション */}
                <div className="flex border-b mb-4">
                    <button
                        onClick={() => setActiveTab('nutrition')}
                        className={`flex-1 py-3 px-2 text-sm font-bold ${activeTab === 'nutrition' ? 'text-sky-700 border-b-2 border-sky-700 bg-sky-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center justify-center gap-1">
                            <Icon name="BarChart3" size={16} />
                            <span>今日の摂取状況</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('directive')}
                        className={`flex-1 py-3 px-2 text-sm font-bold ${activeTab === 'directive' ? 'text-sky-700 border-b-2 border-sky-700 bg-sky-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center justify-center gap-1">
                            <Icon name="ClipboardList" size={16} />
                            <span>指示書</span>
                        </div>
                    </button>
                </div>

                {/* タブコンテンツ（栄養） */}
                {activeTab === 'nutrition' && (
                    <div>
                <div className="space-y-4">
                    {/* カロリー */}
                    <div className="mb-6">
                        <div className="text-sm text-gray-500 mb-2">カロリー</div>
                        <div className="flex items-end gap-2 mb-2 justify-end">
                            <span className="text-3xl font-bold text-blue-600">{Math.round(currentIntake.calories)}</span>
                            <span className="text-lg text-gray-500">/</span>
                            <span className="text-lg text-gray-500">{targetPFC.calories} kcal</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(caloriesPercent, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* PFC */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <div className="text-sm text-gray-500 mb-2">タンパク質</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-3xl font-bold text-red-600">{Math.round(currentIntake.protein)}</span>
                                <span className="text-lg text-gray-500">/</span>
                                <span className="text-lg text-gray-500">{targetPFC.protein}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500" style={{ width: `${Math.min(proteinPercent, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-2">脂質</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-3xl font-bold text-yellow-600">{Math.round(currentIntake.fat)}</span>
                                <span className="text-lg text-gray-500">/</span>
                                <span className="text-lg text-gray-500">{targetPFC.fat}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500" style={{ width: `${Math.min((currentIntake.fat / targetPFC.fat) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-2">炭水化物</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-3xl font-bold text-green-600">{Math.round(currentIntake.carbs)}</span>
                                <span className="text-lg text-gray-500">/</span>
                                <span className="text-lg text-gray-500">{targetPFC.carbs}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${Math.min((currentIntake.carbs / targetPFC.carbs) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ビタミン・ミネラル詳細（守破離システムに統合 - 18日以上で開放） */}
                {unlockedFeatures.includes(FEATURES.MICRONUTRIENTS.id) && (
                    <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-2">
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
                                <Icon name="Gem" size={16} className="text-amber-500" />
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
                                                    className="h-full bg-[#FFF59A] transition-all"
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
                )}

                {/* タブコンテンツ（指示書） */}
                {activeTab === 'directive' && (
                    <div>
                        {todayDirective ? (
                            <>
                                <div className="flex items-center gap-3 mb-3">
                                    <Icon name="Target" size={20} className="text-green-600" />
                                    <span className="text-xs text-gray-500">今日の目標</span>
                                </div>
                                <div className="bg-white rounded-lg border-2 border-green-200 p-4 mb-3">
                                    <div className="text-base font-bold text-gray-900 mb-2">
                                        {todayDirective.message}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    {!todayDirective.completed ? (
                                        <button
                                            onClick={handleCompleteDirective}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition text-sm"
                                        >
                                            ✓ 完了
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                                            <Icon name="CheckCircle" size={16} />
                                            完了済み
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowDirectiveEdit(true)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
                                    >
                                        編集
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 py-4">
                                <p className="text-sm">今日の指示書がありません</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 記録一覧 */}
            <div id="record-section" className="bg-white rounded-xl shadow-sm p-6 slide-up -mx-4 px-10">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-bold">記録</h3>
                    <button
                        onClick={() => setInfoModal({
                            show: true,
                            title: '📝 記録について',
                            content: `【通常の記録】\n＋ボタンから、食事・運動・サプリメントを記録できます。記録した内容は即座にダッシュボードに反映されます。\n\n【予測入力】\n前日のデータから今日の食事・運動を自動的に予測して入力します。\n・青背景で表示されます\n・予測データは編集可能です\n・そのまま分析に使用できます\n\n【ルーティン入力】\n設定したルーティンに紐づけたテンプレートを自動入力します。\n・紫背景で表示されます\n・ルーティンデータは編集可能です\n・そのまま分析に使用できます\n\n設定方法：設定 → ルーティン → 各日に食事・運動テンプレートを紐づけ`
                        })}
                        className="text-sky-600 hover:text-sky-800"
                    >
                        <Icon name="Info" size={18} />
                    </button>
                    <div className="ml-auto flex gap-2">
                        {/* 予測入力ボタン（トグル） */}
                        {yesterdayRecord && (
                            <button
                                onClick={async () => {
                                    const hasPredicted = dailyRecord.meals?.some(m => m.isPredicted) || dailyRecord.workouts?.some(w => w.isPredicted);
                                    if (hasPredicted) {
                                        // クリア
                                        const clearedRecord = {
                                            ...dailyRecord,
                                            meals: dailyRecord.meals?.filter(m => !m.isPredicted) || [],
                                            workouts: dailyRecord.workouts?.filter(w => !w.isPredicted) || []
                                        };
                                        setDailyRecord(clearedRecord);
                                        const userId = user?.uid || DEV_USER_ID;
                                        await DataService.saveDailyRecord(userId, currentDate, clearedRecord);
                                    } else {
                                        // 入力
                                        loadPredictedData();
                                    }
                                }}
                                className={`text-xs px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                                    dailyRecord.meals?.some(m => m.isPredicted) || dailyRecord.workouts?.some(w => w.isPredicted)
                                        ? 'bg-gray-400 text-white hover:bg-gray-500'
                                        : 'bg-sky-600 text-white hover:bg-sky-700'
                                }`}
                            >
                                <Icon name={(dailyRecord.meals?.some(m => m.isPredicted) || dailyRecord.workouts?.some(w => w.isPredicted)) ? "Trash2" : "Sparkles"} size={14} />
                                {(dailyRecord.meals?.some(m => m.isPredicted) || dailyRecord.workouts?.some(w => w.isPredicted)) ? 'クリア' : '予測'}
                            </button>
                        )}

                        {/* ルーティン入力ボタン（トグル） */}
                        {currentRoutine && !currentRoutine.isRestDay && (
                            <button
                                onClick={async () => {
                                    const hasRoutine = dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine);
                                    if (hasRoutine) {
                                        // クリア
                                        const clearedRecord = {
                                            ...dailyRecord,
                                            meals: dailyRecord.meals?.filter(m => !m.isRoutine) || [],
                                            workouts: dailyRecord.workouts?.filter(w => !w.isRoutine) || []
                                        };
                                        setDailyRecord(clearedRecord);
                                        const userId = user?.uid || DEV_USER_ID;
                                        await DataService.saveDailyRecord(userId, currentDate, clearedRecord);
                                    } else {
                                        // 入力
                                        if (onLoadRoutineData) {
                                            onLoadRoutineData();
                                        }
                                    }
                                }}
                                className={`text-xs px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                                    dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)
                                        ? 'bg-gray-400 text-white hover:bg-gray-500'
                                        : 'bg-amber-600 text-white hover:bg-amber-700'
                                }`}
                            >
                                <Icon name={(dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)) ? "Trash2" : "Repeat"} size={14} />
                                {(dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)) ? 'クリア' : 'ルーティン'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 体組成セクション */}
                <div id="body-composition-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                    <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 flex items-center justify-between border-b-2 border-gray-200">
                        <div className="flex items-center gap-3">
                            <Icon name="Activity" size={32} className="text-teal-600" />
                            <h4 className="font-bold text-gray-900">体組成</h4>
                        </div>
                        <span className="text-lg font-bold text-teal-600">
                            LBM: {(bodyComposition.weight * (1 - bodyComposition.bodyFatPercentage / 100)).toFixed(1)}kg
                        </span>
                    </div>
                    <div className="p-6">

                    {/* 体重 */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Weight" size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-gray-700">体重</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = Math.max(0, currentWeight - 1);
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight > 0 ? newWeight.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = Math.max(0, parseFloat((currentWeight - 0.1).toFixed(1)));
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight > 0 ? newWeight.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -0.1
                            </button>
                            <div className="relative min-w-[110px]">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="300"
                                    placeholder="0.0"
                                    value={weightInput}
                                    onChange={(e) => {
                                        setWeightInput(e.target.value);
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        // 空欄の場合は元の値を維持
                                        if (value === '' || value === null) {
                                            setWeightInput(bodyComposition.weight > 0 ? bodyComposition.weight.toString() : '');
                                            return;
                                        }
                                        const newWeight = parseFloat(value);
                                        if (!isNaN(newWeight) && newWeight >= 0) {
                                            updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                            setWeightInput(newWeight > 0 ? newWeight.toString() : '');
                                        } else {
                                            setWeightInput(bodyComposition.weight > 0 ? bodyComposition.weight.toString() : '');
                                        }
                                    }}
                                    onFocus={(e) => {
                                        // 全選択して入力しやすくする（空欄にしない）
                                        e.target.select();
                                    }}
                                    className="w-full px-4 py-2 text-lg font-bold text-gray-900 text-center bg-white border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none hover:border-gray-400 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">kg</span>
                            </div>
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = parseFloat((currentWeight + 0.1).toFixed(1));
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight.toString());
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = currentWeight + 1;
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight.toString());
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
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = Math.max(0, currentBodyFat - 1);
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat > 0 ? newBodyFat.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -1
                            </button>
                            <button
                                onClick={() => {
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = Math.max(0, parseFloat((currentBodyFat - 0.1).toFixed(1)));
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat > 0 ? newBodyFat.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                -0.1
                            </button>
                            <div className="relative min-w-[110px]">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    placeholder="0.0"
                                    value={bodyFatInput}
                                    onChange={(e) => {
                                        setBodyFatInput(e.target.value);
                                    }}
                                    onBlur={(e) => {
                                        const value = e.target.value;
                                        // 空欄の場合は元の値を維持
                                        if (value === '' || value === null) {
                                            setBodyFatInput(bodyComposition.bodyFatPercentage > 0 ? bodyComposition.bodyFatPercentage.toString() : '');
                                            return;
                                        }
                                        const newBodyFat = parseFloat(value);
                                        if (!isNaN(newBodyFat) && newBodyFat >= 0) {
                                            updateBodyComposition(bodyComposition.weight, newBodyFat);
                                            setBodyFatInput(newBodyFat > 0 ? newBodyFat.toString() : '');
                                        } else {
                                            setBodyFatInput(bodyComposition.bodyFatPercentage > 0 ? bodyComposition.bodyFatPercentage.toString() : '');
                                        }
                                    }}
                                    onFocus={(e) => {
                                        // 全選択して入力しやすくする（空欄にしない）
                                        e.target.select();
                                    }}
                                    className="w-full px-4 py-2 text-lg font-bold text-gray-900 text-center bg-white border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none hover:border-gray-400 transition"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 pointer-events-none">%</span>
                            </div>
                            <button
                                onClick={() => {
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = parseFloat((currentBodyFat + 0.1).toFixed(1));
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat.toString());
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +0.1
                            </button>
                            <button
                                onClick={() => {
                                    const currentBodyFat = parseFloat(bodyComposition.bodyFatPercentage) || 0;
                                    const newBodyFat = currentBodyFat + 1;
                                    updateBodyComposition(bodyComposition.weight, newBodyFat);
                                    setBodyFatInput(newBodyFat.toString());
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +1
                            </button>
                        </div>
                    </div>
                    </div>
                </div>

                {/* 食事セクション */}
                <div id="meal-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                    <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between border-b-2 border-gray-200">
                        <div className="flex items-center gap-3">
                            <Icon name="Utensils" size={32} className="text-green-600" />
                            <h4 className="font-bold text-gray-900">食事</h4>
                            <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
                                {dailyRecord.meals?.length || 0}
                            </span>
                        </div>
                        <button
                            onClick={() => window.handleQuickAction && window.handleQuickAction('meal')}
                            className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                        >
                            + 追加
                        </button>
                    </div>
                    <div className="p-4">
                    {dailyRecord.meals?.length > 0 ? (
                        <div className="space-y-3">
                            {dailyRecord.meals.map((meal, index) => (
                                <div key={meal.id || index} className={`bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 hover:shadow-md transition-shadow ${
                                    meal.isPredicted ? 'border-2 border-sky-300 bg-sky-50' :
                                    meal.isRoutine ? 'border-2 border-amber-300 bg-amber-50' :
                                    ''
                                }`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-gray-500">{meal.time}</span>
                                                {meal.isPredicted && (
                                                    <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Icon name="Sparkles" size={10} />
                                                        予測
                                                    </span>
                                                )}
                                                {meal.isRoutine && (
                                                    <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Icon name="Repeat" size={10} />
                                                        ルーティン
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-base font-bold text-gray-900 mb-1">
                                                {meal.name}
                                            </div>
                                            {meal.items?.map((item, i) => (
                                                <div key={i} className="text-xs text-gray-500">
                                                    {item.name} {item.amount}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="text-right ml-4">
                                            <div className="text-xl font-bold text-gray-900">{meal.calories}</div>
                                            <div className="text-xs text-gray-500">kcal</div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={async () => {
                                                // テンプレート登録機能
                                                const templateName = prompt('テンプレート名を入力してください', meal.name);
                                                if (templateName && templateName.trim()) {
                                                    const template = {
                                                        id: Date.now(),
                                                        name: templateName,
                                                        items: meal.items
                                                    };
                                                    await DataService.saveMealTemplate(user.uid, template);
                                                    alert('テンプレートを保存しました');
                                                }
                                            }}
                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-green-600 hover:bg-green-50 transition border-2 border-green-500"
                                        >
                                            <Icon name="BookTemplate" size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                // 食事編集機能を呼び出す
                                                if (window.handleEditMeal) {
                                                    window.handleEditMeal(meal);
                                                }
                                            }}
                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                        >
                                            <Icon name="Edit" size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteItem('meal', meal.id)}
                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                        >
                                            <Icon name="Trash2" size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                                <Icon name="Utensils" size={28} className="text-green-400" />
                            </div>
                            <p className="text-sm text-gray-600 font-medium mb-1">
                                まだ食事の記録がありません
                            </p>
                            <p className="text-xs text-gray-400">
                                追加ボタンから記録を始めましょう
                            </p>
                        </div>
                    )}
                    </div>
                </div>

                {/* 運動セクション */}
                {/* 運動セクション - 食事記録完了後に開放 */}
                {unlockedFeatures.includes('training') && (
                    <div id="workout-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                        <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-between border-b-2 border-gray-200">
                            <div className="flex items-center gap-3">
                                <Icon name="Dumbbell" size={32} className="text-orange-600" />
                                <h4 className="font-bold text-gray-900">運動</h4>
                                <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                                    {dailyRecord.workouts?.length || 0}
                                </span>
                            </div>
                            <button
                                onClick={() => window.handleQuickAction && window.handleQuickAction('workout')}
                                className="text-sm px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition"
                            >
                                + 追加
                            </button>
                        </div>
                        <div className="p-4">
                        {dailyRecord.workouts?.length > 0 ? (
                            <div className="space-y-3">
                                {dailyRecord.workouts.map((workout, index) => (
                                    <div key={workout.id || index} className={`bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 hover:shadow-md transition-shadow ${
                                        workout.isPredicted ? 'border-2 border-sky-300 bg-sky-50' :
                                        workout.isRoutine ? 'border-2 border-amber-300 bg-amber-50' :
                                        ''
                                    }`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs text-gray-500">{workout.time}</span>
                                                    {workout.isPredicted && (
                                                        <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="Sparkles" size={10} />
                                                            予測
                                                        </span>
                                                    )}
                                                    {workout.isRoutine && (
                                                        <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="Repeat" size={10} />
                                                            ルーティン
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-base font-bold text-gray-900 mb-2">
                                                    {workout.name}
                                                </div>
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
                                        </div>

                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={async () => {
                                                    // テンプレート登録機能
                                                    const templateName = prompt('テンプレート名を入力してください', workout.name);
                                                    if (templateName && templateName.trim()) {
                                                        const template = {
                                                            id: Date.now(),
                                                            name: templateName,
                                                            exercises: workout.exercises
                                                        };
                                                        await DataService.saveWorkoutTemplate(user.uid, template);
                                                        alert('テンプレートを保存しました');
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-green-600 hover:bg-green-50 transition border-2 border-green-500"
                                            >
                                                <Icon name="BookTemplate" size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // 運動編集機能を呼び出す
                                                    if (window.handleEditWorkout) {
                                                        window.handleEditWorkout(workout);
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                            >
                                                <Icon name="Edit" size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteItem('workout', workout.id)}
                                                className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                            >
                                                <Icon name="Trash2" size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                                    <Icon name="Activity" size={28} className="text-orange-400" />
                                </div>
                                <p className="text-sm text-gray-600 font-medium mb-1">
                                    まだ運動の記録がありません
                                </p>
                                <p className="text-xs text-gray-400">
                                    追加ボタンから記録を始めましょう
                                </p>
                            </div>
                        )}
                        </div>
                    </div>
                )}

                {/* 体調セクション - 運動記録完了後に開放 */}
                {unlockedFeatures.includes('condition') && (
                    <div id="condition-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                    <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-pink-50 flex items-center justify-between border-b-2 border-gray-200">
                        <div className="flex items-center gap-3">
                            <Icon name="HeartPulse" size={32} className="text-red-600" />
                            <h4 className="font-bold text-gray-900">コンディション</h4>
                        </div>
                    </div>
                    <div className="p-6 space-y-2">
                        {/* 睡眠時間 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-700 font-bold">睡眠時間</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.sleepHours && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-red-500 rounded-full transition-all duration-300 ease-out"
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
                                        className="absolute top-1.5 bottom-1.5 bg-red-500 rounded-full transition-all duration-300 ease-out"
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
                                        className="absolute top-1.5 bottom-1.5 bg-red-500 rounded-full transition-all duration-300 ease-out"
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
                                        className="absolute top-1.5 bottom-1.5 bg-red-500 rounded-full transition-all duration-300 ease-out"
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
                                        className="absolute top-1.5 bottom-1.5 bg-red-500 rounded-full transition-all duration-300 ease-out"
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
                                        className="absolute top-1.5 bottom-1.5 bg-red-500 rounded-full transition-all duration-300 ease-out"
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
                    </div>
                )}

                {/* 閃きセクション - 初回分析完了後に開放 */}
                {unlockedFeatures.includes('idea') && (
                    <div id="idea-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                        <div className="px-6 py-4 bg-[#FFF59A]/10 flex items-center justify-between border-b-2 border-gray-200">
                            <div className="flex items-center gap-3">
                                <Icon name="Lightbulb" size={32} className="text-yellow-500" />
                                <h4 className="font-bold text-gray-900">閃き</h4>
                            </div>
                        </div>
                        <div className="p-6">
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

                {/* 分析ボタン - コンディション完了後に開放 */}
                {unlockedFeatures.includes('analysis') && (
                    <div id="analysis-section" className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden border-2 border-gray-200 -mx-6">
                        <div className="px-6 py-4 bg-gradient-to-r from-sky-50 to-blue-50 flex items-center justify-between border-b-2 border-gray-200">
                            <div className="flex items-center gap-3">
                                <Icon name="PieChart" size={32} className="text-sky-600" />
                                <h4 className="font-bold text-gray-900">分析</h4>
                                <button
                                    onClick={() => setShowScoringGuideModal(true)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition"
                                    title="採点基準を見る"
                                >
                                    <Icon name="Info" size={16} className="text-gray-500" />
                                </button>
                            </div>
                            <button
                                onClick={() => window.handleQuickAction && window.handleQuickAction('analysis')}
                                className="text-sm px-4 py-2 bg-sky-600 text-white rounded-lg font-bold hover:bg-sky-700 transition"
                            >
                                + 分析
                            </button>
                        </div>
                        <div className="p-6">
                            {/* 当日のスコア表示（ドーナツグラフ） */}
                            <ScoreDoughnutChart
                                profile={profile}
                                dailyRecord={dailyRecord}
                                targetPFC={targetPFC}
                            />
                        </div>
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
                                    <Icon name="Info" size={20} className="text-sky-600" />
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
                                className="w-full py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium"
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
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <Icon name="Sparkles" size={32} className="text-amber-600" />
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
                                        <div className="bg-yellow-50 rounded-lg p-4 space-y-2 border border-amber-200">
                                            <div className="flex items-start gap-2">
                                                <Icon name="FileText" size={18} className="text-amber-600 mt-0.5" />
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
                                                <Icon name="History" size={18} className="text-amber-600 mt-0.5" />
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
                                        <div className="bg-yellow-50 rounded-lg p-4 space-y-2 border border-amber-200">
                                            <div className="flex items-start gap-2">
                                                <Icon name="BookOpen" size={18} className="text-amber-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">PG BASE</div>
                                                    <div className="text-xs text-gray-600">ボディメイクの基礎知識</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Users" size={18} className="text-amber-600 mt-0.5" />
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
                                        <div className="bg-yellow-50 rounded-lg p-4 space-y-2 border border-amber-200">
                                            <div className="flex items-start gap-2">
                                                <Icon name="BookTemplate" size={18} className="text-amber-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">テンプレート</div>
                                                    <div className="text-xs text-gray-600">食事・運動を保存</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Calendar" size={18} className="text-amber-600 mt-0.5" />
                                                <div>
                                                    <div className="font-bold text-gray-800">ルーティン</div>
                                                    <div className="text-xs text-gray-600">曜日別トレーニング計画</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <Icon name="Zap" size={18} className="text-amber-600 mt-0.5" />
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
                                            page === currentModalPage ? 'bg-amber-600' : 'bg-gray-300'
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
                                        className={`${currentModalPage === 1 ? 'w-full' : 'w-2/3'} bg-[#FFF59A] text-gray-800 py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md relative overflow-hidden`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                        <span className="relative z-10">次へ</span>
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
                                        className="w-2/3 bg-[#FFF59A] text-gray-800 py-3 rounded-lg font-bold hover:opacity-90 transition-colors shadow-md relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                        <span className="relative z-10">確認しました</span>
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
                        {/* ヘッダー（プレミアムグラデーション） */}
                        <div className="bg-[#FFF59A] p-6 text-gray-800 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition z-10"
                            >
                                <Icon name="X" size={20} />
                            </button>
                            <div className="mb-3 relative z-10">
                                <Icon name="Crown" size={48} className="mx-auto mb-2 text-yellow-600" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-gray-900 relative z-10">🎉 初回分析完了！</h2>
                            <p className="text-sm opacity-90 text-gray-700 relative z-10">AIがあなた専用の分析レポートを作成しました</p>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-4">
                            {/* Premium会員の特典 */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="Sparkles" size={18} className="text-amber-600" />
                                    Premium会員になると...
                                </h3>
                                <div className="space-y-2">
                                    {[
                                        { icon: 'BarChart3', text: '毎月100回の分析クレジット', color: 'text-sky-600' },
                                        { icon: 'BookOpen', text: 'PG BASE 教科書で理論を学習', color: 'text-green-600' },
                                        { icon: 'Calendar', text: 'ルーティン機能で計画的に管理', color: 'text-amber-600' },
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
                            <div className="bg-[#FFF59A]/10 border-2 border-amber-300 rounded-lg p-4 text-center">
                                <p className="text-sm text-gray-600 mb-1">月額</p>
                                <p className="text-4xl font-bold text-amber-600 mb-1">¥740</p>
                                <p className="text-xs text-gray-600">1日あたり約24円</p>
                            </div>

                            {/* CTA ボタン */}
                            <button
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    alert('サブスクリプション画面は準備中です');
                                }}
                                className="w-full bg-[#FFF59A] text-gray-800 font-bold py-4 rounded-lg hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                <Icon name="Crown" size={20} className="relative z-10" />
                                <span className="relative z-10">Premium会員に登録する</span>
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
                        <div className="bg-[#FFF59A] p-6 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                            <div className="relative z-10">
                                <Icon name="Trophy" size={48} className="text-yellow-600 mx-auto mb-3" />
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">レベルアップ！</h2>
                                <p className="text-gray-700 text-sm">おめでとうございます</p>
                            </div>
                        </div>

                        {/* コンテンツ */}
                        <div className="p-6 space-y-6">
                            {/* 新しいレベル */}
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-2">あなたの新しいレベル</p>
                                <div className="inline-flex items-center gap-3 bg-[#FFF59A]/10 border-2 border-amber-300 rounded-full px-6 py-3">
                                    <div className="bg-amber-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                                        {levelUpData.level}
                                    </div>
                                    <span className="text-2xl font-bold text-amber-600">Level {levelUpData.level}</span>
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
                                <div className="bg-[#FFF59A]/10 border-2 border-amber-300 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon name="Star" size={18} className="text-amber-600" />
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
                                className="w-full bg-[#FFF59A] text-gray-800 py-3.5 rounded-lg font-bold hover:opacity-90 transition-all shadow-lg relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                <span className="relative z-10">確認しました</span>
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
        </div>
    );
};

// ===== Level Banner Component =====
const LevelBanner = ({ user, setInfoModal }) => {
    const [expData, setExpData] = useState(null);

    // 経験値・レベル情報を読み込む関数
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

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) {
                await loadExperienceData();
            }
        };

        loadData();

        // レベルアップイベントと経験値更新イベントをリッスン
        const handleLevelUp = (event) => {
            if (isMounted) loadExperienceData();
        };
        const handleExperienceUpdate = (event) => {
            if (isMounted) loadExperienceData();
        };
        const handleCreditUpdate = () => {
            if (isMounted) loadExperienceData();
        };

        window.addEventListener('levelUp', handleLevelUp);
        window.addEventListener('experienceUpdated', handleExperienceUpdate);
        window.addEventListener('creditUpdated', handleCreditUpdate);

        return () => {
            isMounted = false;
            window.removeEventListener('levelUp', handleLevelUp);
            window.removeEventListener('experienceUpdated', handleExperienceUpdate);
            window.removeEventListener('creditUpdated', handleCreditUpdate);
        };
    }, [user]);

    if (!expData) {
        return null; // ローディング中は何も表示しない
    }

    return (
        <div className="bg-[#4A9EFF] shadow-sm">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">Lv{expData.level}</span>
                    <div className="relative w-24 bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(expData.expProgress || 0, 100)}%` }}
                        />
                    </div>
                    <span className="text-xs text-white font-medium">{expData.expProgress}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                        <Icon name="Award" size={14} className="text-white" />
                        <span className="text-sm font-bold text-white">{expData.totalCredits}</span>
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
                        className="text-white/80 hover:text-white transition p-1"
                    >
                        <Icon name="Info" size={12} />
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
                        <Icon name="Edit3" size={20} className="text-amber-600" />
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                            rows="3"
                            placeholder="例: 鶏むね肉150g追加"
                        />
                    </div>
                </div>

                {/* アクションボタン */}
                <div className="p-4 border-t flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg hover:bg-amber-700 transition font-semibold text-sm"
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



// グローバルに公開
window.DashboardView = DashboardView;
window.LevelBanner = LevelBanner;
window.DirectiveEditModal = DirectiveEditModal;
