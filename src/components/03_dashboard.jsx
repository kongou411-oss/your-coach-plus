import React from 'react';
import toast from 'react-hot-toast';

// ===== Score Doughnut Chart Component =====
const ScoreDoughnutChart = ({ profile, dailyRecord, targetPFC, user, currentDate, setDailyRecord }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    const scores = DataService.calculateScores(profile, dailyRecord, targetPFC);

    // スコアをdailyRecordに保存
    React.useEffect(() => {
        const saveScores = async () => {
            if (!user || !currentDate || !dailyRecord) return;

            // 既に保存されているスコアと同じなら保存しない
            if (dailyRecord.scores?.food === scores.food.score &&
                dailyRecord.scores?.exercise === scores.exercise.score &&
                dailyRecord.scores?.condition === scores.condition.score) {
                return;
            }

            const updatedRecord = {
                ...dailyRecord,
                scores: {
                    food: scores.food.score,
                    exercise: scores.exercise.score,
                    condition: scores.condition.score
                }
            };

            await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
            setDailyRecord(updatedRecord);
        };

        saveScores();
    }, [scores.food.score, scores.exercise.score, scores.condition.score, user, currentDate]);

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
                        <div className="text-2xl sm:text-3xl font-bold text-gray-800">{averageScore}</div>
                        <div className="text-xs text-gray-600">平均</div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
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
            <p className="text-sm text-gray-600 mt-4 text-center">AIによる詳細な栄養分析を確認できます</p>
        </div>
    );
};

// ===== Dashboard Component =====
const DashboardView = ({ dailyRecord, targetPFC, unlockedFeatures, setUnlockedFeatures, onDeleteItem, profile, setUserProfile, setInfoModal, yesterdayRecord, setDailyRecord, user, currentDate, onDateChange, triggers, shortcuts, onShortcutClick, onFeatureUnlocked, currentRoutine, onLoadRoutineData, onOpenNewMealModal, onOpenNewWorkoutModal, activeTab: externalActiveTab, onActiveTabChange }) => {
    // 指示書管理
    const [todayDirective, setTodayDirective] = useState(null);
    const [showDirectiveEdit, setShowDirectiveEdit] = useState(false);

    // 運動カードの展開状態
    const [expandedWorkouts, setExpandedWorkouts] = useState({});
    const [expandedMeals, setExpandedMeals] = useState({});

    // 食事と運動をデフォルトで展開
    useEffect(() => {
        if (dailyRecord?.meals) {
            const newExpandedMeals = {};
            dailyRecord.meals.forEach((meal, index) => {
                const key = meal.id || index;
                newExpandedMeals[key] = true;
            });
            setExpandedMeals(newExpandedMeals);
        }
        if (dailyRecord?.workouts) {
            const newExpandedWorkouts = {};
            dailyRecord.workouts.forEach((workout, index) => {
                const key = workout.id || index;
                newExpandedWorkouts[key] = true;
            });
            setExpandedWorkouts(newExpandedWorkouts);
        }
    }, [dailyRecord?.meals, dailyRecord?.workouts]);

    // 機能開放モーダル（1つのモーダルで3ページ）
    const [showFeatureUnlockModal, setShowFeatureUnlockModal] = useState(false);
    const [currentModalPage, setCurrentModalPage] = useState(1); // 1, 2, 3

    // Premium誘導モーダル
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // 採点基準説明モーダル
    const [showScoringGuideModal, setShowScoringGuideModal] = useState(false);

    // 詳細栄養素の使い方モーダル
    const [showDetailedNutrientsGuide, setShowDetailedNutrientsGuide] = useState(false);

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

    // タブ管理（外部から制御可能）
    const [internalActiveTab, setInternalActiveTab] = useState('nutrition'); // 'nutrition', 'directive'
    const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
    const setActiveTab = onActiveTabChange || setInternalActiveTab;

    // 今日の日付を取得
    const getTodayDate = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    // 今日のdailyRecordから体組成を読み込む（なければ前日→プロフィールの順で取得）
    useEffect(() => {
        let isMounted = true;

        const loadTodayBodyComposition = async () => {
            try {
                const todayDate = getTodayDate();
                let weight = 0;
                let bodyFat = 0;

                // 1. 今日のdailyRecordをチェック
                const todayRecord = await DataService.getDailyRecord(user.uid, todayDate);
                if (todayRecord?.bodyComposition?.weight && todayRecord?.bodyComposition?.bodyFatPercentage) {
                    weight = parseFloat(todayRecord.bodyComposition.weight) || 0;
                    bodyFat = parseFloat(todayRecord.bodyComposition.bodyFatPercentage) || 0;
                    console.log('[Dashboard] 今日の体組成データを取得:', { weight, bodyFat });
                } else {
                    // 2. 前日のdailyRecordをチェック
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
                    const yesterdayRecord = await DataService.getDailyRecord(user.uid, yesterdayDate);

                    if (yesterdayRecord?.bodyComposition?.weight && yesterdayRecord?.bodyComposition?.bodyFatPercentage) {
                        weight = parseFloat(yesterdayRecord.bodyComposition.weight) || 0;
                        bodyFat = parseFloat(yesterdayRecord.bodyComposition.bodyFatPercentage) || 0;
                        console.log('[Dashboard] 前日の体組成データを取得:', { weight, bodyFat });
                    } else if (profile?.weight && profile?.bodyFatPercentage) {
                        // 3. プロフィールデータをチェック
                        weight = parseFloat(profile.weight) || 0;
                        bodyFat = parseFloat(profile.bodyFatPercentage) || 0;
                        console.log('[Dashboard] プロフィールの体組成データを取得:', { weight, bodyFat });
                    }
                }

                if (isMounted && (weight > 0 || bodyFat > 0)) {
                    const bodyComp = {
                        weight: weight,
                        bodyFatPercentage: bodyFat
                    };
                    setBodyComposition(bodyComp);
                    // 入力フィールドの初期値も設定
                    setWeightInput(weight > 0 ? weight.toString() : '');
                    setBodyFatInput(bodyFat > 0 ? bodyFat.toString() : '');

                    // 前日またはプロフィールからフォールバックした場合、今日のdailyRecordにも保存
                    if (!todayRecord?.bodyComposition?.weight || !todayRecord?.bodyComposition?.bodyFatPercentage) {
                        const updatedRecord = {
                            ...todayRecord,
                            bodyComposition: bodyComp
                        };
                        await DataService.saveDailyRecord(user.uid, todayDate, updatedRecord);
                        console.log('[Dashboard] 体組成を今日のレコードに保存:', bodyComp);
                    }
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
    }, [user?.uid, profile]);

    // micronutrientsを自動計算・保存
    useEffect(() => {
        const saveMicronutrients = async () => {
            if (!user?.uid || !currentDate || !dailyRecord || !profile) return;

            // meals が存在しない、または空の場合はスキップ
            if (!dailyRecord.meals || dailyRecord.meals.length === 0) return;

            try {
                // currentIntakeを計算（上記のcurrentIntakeと同じロジック）
                const intake = {
                    vitamins: {},
                    minerals: {}
                };

                dailyRecord.meals?.forEach(meal => {
                    meal.items?.forEach(item => {
                        const isCountUnit = ['本', '個', '杯', '枚', '錠'].some(u => (item.unit || '').includes(u));
                        const ratio = isCountUnit ? item.amount : item.amount / 100;

                        // ビタミン・ミネラルを集計
                        if (item.vitamins) {
                            Object.keys(item.vitamins).forEach(v => {
                                intake.vitamins[v] = (intake.vitamins[v] || 0) + ((item.vitamins[v] || 0) * ratio);
                            });
                        }
                        if (item.minerals) {
                            Object.keys(item.minerals).forEach(m => {
                                intake.minerals[m] = (intake.minerals[m] || 0) + ((item.minerals[m] || 0) * ratio);
                            });
                        }

                        // 個別キー形式のビタミン
                        const vitaminKeys = ['vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'niacin', 'pantothenicAcid', 'biotin', 'folicAcid'];
                        vitaminKeys.forEach(key => {
                            if (item[key] !== undefined && item[key] !== 0) {
                                intake.vitamins[key] = (intake.vitamins[key] || 0) + ((item[key] || 0) * ratio);
                            }
                        });

                        // 個別キー形式のミネラル
                        const mineralKeys = ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum'];
                        mineralKeys.forEach(key => {
                            if (item[key] !== undefined && item[key] !== 0) {
                                intake.minerals[key] = (intake.minerals[key] || 0) + ((item[key] || 0) * ratio);
                            }
                        });
                    });
                });

                // 目標値を取得
                const targets = LBMUtils.calculatePersonalizedMicronutrients(profile);

                // micronutrientsオブジェクトを作成
                const micronutrients = {};

                // ビタミンの集計値と目標値を保存
                Object.keys(intake.vitamins).forEach(v => {
                    const key = v.startsWith('vitamin') ? v : `vitamin${v}`;
                    micronutrients[key] = intake.vitamins[v];
                    micronutrients[`${key}Target`] = targets[key] || 0;
                });

                // ミネラルの集計値と目標値を保存
                Object.keys(intake.minerals).forEach(m => {
                    micronutrients[m] = intake.minerals[m];
                    micronutrients[`${m}Target`] = targets[m] || 0;
                });

                // 既存のmicronutrientsと変更がない場合は保存しない
                const existingMicro = JSON.stringify(dailyRecord.micronutrients || {});
                const newMicro = JSON.stringify(micronutrients);
                if (existingMicro === newMicro) return;

                // Firestoreから最新データを取得してmicronutrientsのみ更新
                const latestRecord = await DataService.getDailyRecord(user.uid, currentDate);
                const updatedRecord = {
                    ...latestRecord,
                    micronutrients: micronutrients
                };

                await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
                console.log('[Dashboard] micronutrientsを保存:', Object.keys(micronutrients).length, 'keys');
            } catch (error) {
                console.error('[Dashboard] micronutrients保存エラー:', error);
            }
        };

        saveMicronutrients();
    }, [dailyRecord?.meals, user?.uid, currentDate, profile]);

    // recordUpdatedイベントを監視して自動リロード
    useEffect(() => {
        console.log('[Dashboard] recordUpdatedイベントリスナーを登録:', { userId: user?.uid, currentDate });

        const handleRecordUpdate = async (event) => {
            console.log('[Dashboard] recordUpdatedイベント受信:', event.detail);
            if (user?.uid && currentDate) {
                try {
                    console.log('[Dashboard] データを再読み込み中...');
                    const record = await DataService.getDailyRecord(user.uid, currentDate);
                    console.log('[Dashboard] 再読み込み完了:', record);
                    setDailyRecord(record);
                } catch (error) {
                    console.error('[Dashboard] データ再読み込みエラー:', error);
                }
            } else {
                console.log('[Dashboard] イベント受信したがuser/dateが未設定:', { user: !!user, currentDate });
            }
        };

        window.addEventListener('recordUpdated', handleRecordUpdate);
        console.log('[Dashboard] イベントリスナー登録完了');

        return () => {
            console.log('[Dashboard] イベントリスナーを削除');
            window.removeEventListener('recordUpdated', handleRecordUpdate);
        };
    }, [user?.uid, currentDate]);

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

        // dailyRecordにも保存
        try {
            const updatedRecord = {
                ...dailyRecord,
                directiveCompleted: true
            };
            await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
            setDailyRecord(updatedRecord);
            console.log('[Dashboard] 指示書完了をdailyRecordに保存');
        } catch (error) {
            console.error('[Dashboard] 指示書完了の保存エラー:', error);
        }

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
            case 'meal': return { bg: 'bg-green-50', border: 'border-green-600', text: 'text-green-700', icon: 'text-green-600' };
            case 'exercise': return { bg: 'bg-orange-50', border: 'border-orange-600', text: 'text-orange-700', icon: 'text-orange-600' };
            case 'condition': return { bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-700', icon: 'text-red-600' };
            default: return { bg: 'bg-gray-50', border: 'border-gray-600', text: 'text-gray-600', icon: 'text-gray-600' };
        }
    };

    // 予測入力を実行する関数
    const loadPredictedData = async () => {
        if (!yesterdayRecord) {
            toast('前日の記録がありません');
            return;
        }

        // 現在時刻を取得（HH:MM形式）
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 前日の記録を複製（IDと時刻は新しく生成）
        const copiedRecord = {
            meals: [
                ...(dailyRecord.meals?.filter(m => !m.isPredicted) || []),
                ...(yesterdayRecord.meals?.map(meal => ({
                    ...meal,
                    id: Date.now() + Math.random(),
                    time: currentTime, // 現在時刻に変更
                    isPredicted: true // 予測データであることを示すフラグ
                })) || [])
            ],
            workouts: [
                ...(dailyRecord.workouts?.filter(w => !w.isPredicted) || []),
                ...(yesterdayRecord.workouts?.map(workout => ({
                    ...workout,
                    id: Date.now() + Math.random(),
                    time: currentTime, // 現在時刻に変更
                    isPredicted: true
                })) || [])
            ],
            bodyComposition: yesterdayRecord.bodyComposition ? {
                ...yesterdayRecord.bodyComposition,
                isPredicted: true,
                time: currentTime
            } : dailyRecord.bodyComposition,
            conditions: yesterdayRecord.conditions ? {
                ...yesterdayRecord.conditions,
                isPredicted: true,
                time: currentTime
            } : dailyRecord.conditions
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
        sugar: 0,
        fiber: 0,
        solubleFiber: 0,
        insolubleFiber: 0,
        saturatedFat: 0,
        mediumChainFat: 0,
        monounsaturatedFat: 0,
        polyunsaturatedFat: 0,
        vitamins: {
            vitaminA: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0, vitaminB1: 0, vitaminB2: 0, niacin: 0, pantothenicAcid: 0, vitaminB6: 0, biotin: 0, folicAcid: 0, vitaminB12: 0, vitaminC: 0
        },
        minerals: {
            calcium: 0, iron: 0, magnesium: 0, phosphorus: 0, potassium: 0, sodium: 0, zinc: 0, copper: 0, manganese: 0, selenium: 0, iodine: 0, chromium: 0, molybdenum: 0
        }
    };

    // その他の栄養素を初期化
    currentIntake.otherNutrients = {};

    // DIAAS計算用（タンパク質量で重み付け平均を計算）
    let totalProteinWeightedDiaas = 0;
    let totalProteinAmount = 0;

    // GL値・GI値計算用
    let totalGL = 0;
    let totalCarbsFromHighGI = 0;  // GI値60以上の炭水化物
    let totalCarbsFromLowGI = 0;   // GI値60未満の炭水化物

    // 各食事ごとのGL値を保存
    const mealGLValues = [];

    dailyRecord.meals?.forEach(meal => {
        let mealGL = 0;
        let mealCarbs = 0;
        let mealProtein = 0;
        let mealFat = 0;
        let mealFiber = 0;
        currentIntake.calories += meal.calories || 0;
        meal.items?.forEach(item => {
            // 個数単位（本、個、杯、枚、錠）と重量単位（g、ml）でratio計算を分岐
            const isCountUnit = ['本', '個', '杯', '枚', '錠'].some(u => (item.unit || '').includes(u));
            const ratio = isCountUnit ? item.amount : item.amount / 100;

            const proteinAmount = (item.protein || 0) * ratio;
            currentIntake.protein += proteinAmount;

            // DIAASの重み付け平均を計算
            if (item.diaas && proteinAmount > 0) {
                totalProteinWeightedDiaas += item.diaas * proteinAmount;
                totalProteinAmount += proteinAmount;
            }

            // GL値とGI値内訳を計算
            const carbsAmount = (item.carbs || 0) * ratio;
            if (item.gi && carbsAmount > 0) {
                // GL値 = (GI値 × 炭水化物量) / 100
                const itemGL = (item.gi * carbsAmount) / 100;
                totalGL += itemGL;
                mealGL += itemGL; // 1食ごとのGL値に加算

                // GI値60以上と60未満で分類
                if (item.gi >= 60) {
                    totalCarbsFromHighGI += carbsAmount;
                } else {
                    totalCarbsFromLowGI += carbsAmount;
                }
            } else if (carbsAmount > 0) {
                // GI値がない場合は低GI扱い（炭水化物は存在）
                totalCarbsFromLowGI += carbsAmount;
            }

            currentIntake.fat += (item.fat || 0) * ratio;
            currentIntake.carbs += (item.carbs || 0) * ratio;

            // 1食ごとのPFC・食物繊維を集計
            mealCarbs += carbsAmount;
            mealProtein += proteinAmount;
            mealFat += (item.fat || 0) * ratio;
            mealFiber += (item.fiber || 0) * ratio;

            // 糖質・食物繊維・脂肪酸（SCALED to actual amount - ビタミン・ミネラルと同じ）
            currentIntake.sugar += (item.sugar || 0) * ratio;
            currentIntake.fiber += (item.fiber || 0) * ratio;
            currentIntake.solubleFiber += (item.solubleFiber || 0) * ratio;
            currentIntake.insolubleFiber += (item.insolubleFiber || 0) * ratio;
            currentIntake.saturatedFat += (item.saturatedFat || 0) * ratio;
            currentIntake.mediumChainFat += (item.mediumChainFat || 0) * ratio;
            currentIntake.monounsaturatedFat += (item.monounsaturatedFat || 0) * ratio;
            currentIntake.polyunsaturatedFat += (item.polyunsaturatedFat || 0) * ratio;


            // ビタミン・ミネラル（オブジェクト形式 - 既に実量換算済み）
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
                    currentIntake.vitamins[key] = (currentIntake.vitamins[key] || 0) + ((item[key] || 0) * ratio);
                }
            });

            const mineralKeys = ['sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus', 'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium', 'chromium', 'molybdenum'];
            mineralKeys.forEach(key => {
                if (item[key] !== undefined && item[key] !== 0) {
                    currentIntake.minerals[key] = (currentIntake.minerals[key] || 0) + ((item[key] || 0) * ratio);
                }
            });

            if (item.otherNutrients) {
                // 配列形式の場合
                if (Array.isArray(item.otherNutrients)) {
                    item.otherNutrients.forEach(nutrient => {
                        if (nutrient.name && nutrient.amount !== undefined) {
                            if (!currentIntake.otherNutrients[nutrient.name]) {
                                currentIntake.otherNutrients[nutrient.name] = {
                                    amount: 0,
                                    unit: nutrient.unit || 'mg'
                                };
                            }
                            currentIntake.otherNutrients[nutrient.name].amount += Number(nutrient.amount) || 0;
                        }
                    });
                } else {
                    // オブジェクト形式の場合（既存データとの互換性）
                    Object.keys(item.otherNutrients).forEach(o => {
                        currentIntake.otherNutrients[o] = (currentIntake.otherNutrients[o] || 0) + (item.otherNutrients[o] || 0);
                    });
                }
            }
        });

        // 1食ごとのGL値評価（PFC・食物繊維による段階的補正）
        let mealGLReductionPercent = 0;

        // タンパク質補正（段階的：0g→0%, 10g→5%, 20g以上→10%）
        const mealProteinReduction = Math.floor(Math.min(10, (mealProtein / 20) * 10) * 10) / 10;
        if (mealProteinReduction > 0) {
            mealGLReductionPercent += mealProteinReduction;
        }

        // 脂質補正（段階的：0g→0%, 5g→5%, 10g以上→10%）
        const mealFatReduction = Math.floor(Math.min(10, (mealFat / 10) * 10) * 10) / 10;
        if (mealFatReduction > 0) {
            mealGLReductionPercent += mealFatReduction;
        }

        // 食物繊維補正（段階的：0g→0%, 2.5g→7.5%, 5g以上→15%）
        const mealFiberReduction = Math.floor(Math.min(15, (mealFiber / 5) * 15) * 10) / 10;
        if (mealFiberReduction > 0) {
            mealGLReductionPercent += mealFiberReduction;
        }

        // 補正後のGL値
        const adjustedMealGL = Math.max(0, mealGL * (1 - mealGLReductionPercent / 100));

        // 1食ごとのGL評価（低GL: ≤10, 中GL: 11-19, 高GL: ≥20）
        let mealGLRating = '低GL';
        let mealGLBadgeColor = 'bg-green-600';
        if (adjustedMealGL >= 20) {
            mealGLRating = '高GL';
            mealGLBadgeColor = meal.isPostWorkout ? 'bg-orange-600' : 'bg-red-600';
        } else if (adjustedMealGL >= 11) {
            mealGLRating = '中GL';
            mealGLBadgeColor = 'bg-yellow-600';
        }

        // 運動後の場合は「推奨」表示
        if (meal.isPostWorkout && adjustedMealGL >= 20) {
            mealGLRating = '高GL（推奨）';
        }

        // 1食ごとのGL値を保存
        mealGLValues.push({
            mealId: meal.id || meal.timestamp,
            rawGL: mealGL,
            adjustedGL: adjustedMealGL,
            rating: mealGLRating,
            badgeColor: mealGLBadgeColor,
            reductionPercent: mealGLReductionPercent,
            isPostWorkout: meal.isPostWorkout || false
        });
    });

    // 平均DIAASを計算
    const averageDiaas = totalProteinAmount > 0 ? totalProteinWeightedDiaas / totalProteinAmount : 0;
    currentIntake.averageDiaas = averageDiaas;

    // GL値とGI値内訳を保存
    currentIntake.totalGL = totalGL;
    currentIntake.highGICarbs = totalCarbsFromHighGI;
    currentIntake.lowGICarbs = totalCarbsFromLowGI;
    const totalCarbs = totalCarbsFromHighGI + totalCarbsFromLowGI;
    currentIntake.highGIPercent = totalCarbs > 0 ? (totalCarbsFromHighGI / totalCarbs) * 100 : 0;
    currentIntake.lowGIPercent = totalCarbs > 0 ? (totalCarbsFromLowGI / totalCarbs) * 100 : 0;


    // 1日合計の補正後GL値を計算（各食事の補正後GL値を合計）
    const adjustedDailyGL = mealGLValues.reduce((sum, meal) => sum + meal.adjustedGL, 0);
    currentIntake.adjustedDailyGL = adjustedDailyGL;

    // 血糖管理スコアの計算（PFC・食物繊維による段階的補正）
    let glReductionPercent = 0;
    const glModifiers = [];

    // タンパク質補正（段階的：0g→0%, 10g→5%, 20g以上→10%）
    const proteinReduction = Math.floor(Math.min(10, (currentIntake.protein / 20) * 10) * 10) / 10;
    if (proteinReduction > 0) {
        glReductionPercent += proteinReduction;
        glModifiers.push({ label: 'タンパク質', value: -proteinReduction });
    }

    // 脂質補正（段階的：0g→0%, 5g→5%, 10g以上→10%）
    const fatReduction = Math.floor(Math.min(10, (currentIntake.fat / 10) * 10) * 10) / 10;
    if (fatReduction > 0) {
        glReductionPercent += fatReduction;
        glModifiers.push({ label: '脂質', value: -fatReduction });
    }

    // 食物繊維補正（段階的：0g→0%, 2.5g→7.5%, 5g以上→15%）
    const fiberReduction = Math.floor(Math.min(15, (currentIntake.fiber / 5) * 15) * 10) / 10;
    if (fiberReduction > 0) {
        glReductionPercent += fiberReduction;
        glModifiers.push({ label: '食物繊維', value: -fiberReduction });
    }

    // 実質GL値を計算
    const adjustedGL = totalGL * (1 - glReductionPercent / 100);
    currentIntake.adjustedGL = adjustedGL;
    currentIntake.glReductionPercent = glReductionPercent;
    currentIntake.glModifiers = glModifiers;


    // 1日合計GL値の評価（優秀: <80, 良好: 80-100, 普通: 101-120, 要改善: 121+）
    let bloodSugarScore = 5; // 最高評価から開始
    let bloodSugarRating = '★★★★★';
    let bloodSugarLabel = '優秀';

    if (adjustedGL >= 121) {
        bloodSugarScore = 2;
        bloodSugarRating = '★★☆☆☆';
        bloodSugarLabel = '要改善';
    } else if (adjustedGL >= 101) {
        bloodSugarScore = 3;
        bloodSugarRating = '★★★☆☆';
        bloodSugarLabel = '普通';
    } else if (adjustedGL >= 80) {
        bloodSugarScore = 4;
        bloodSugarRating = '★★★★☆';
        bloodSugarLabel = '良好';
    } else {
        bloodSugarScore = 5;
        bloodSugarRating = '★★★★★';
        bloodSugarLabel = '優秀';
    }

    currentIntake.bloodSugarScore = bloodSugarScore;
    currentIntake.bloodSugarRating = bloodSugarRating;
    currentIntake.bloodSugarLabel = bloodSugarLabel;

    // 脂肪酸バランススコア（理想: 飽和3:中鎖0.5:一価4:多価3）
    const totalFat = currentIntake.saturatedFat + currentIntake.mediumChainFat + currentIntake.monounsaturatedFat + currentIntake.polyunsaturatedFat;
    let fattyAcidScore = 5;
    let fattyAcidRating = '★★★★★';
    let fattyAcidLabel = '優秀';

    if (totalFat > 0) {
        const saturatedPercent = (currentIntake.saturatedFat / totalFat) * 100;
        const mediumChainPercent = (currentIntake.mediumChainFat / totalFat) * 100;
        const monounsaturatedPercent = (currentIntake.monounsaturatedFat / totalFat) * 100;
        const polyunsaturatedPercent = (currentIntake.polyunsaturatedFat / totalFat) * 100;

        // 理想: 飽和30%, 中鎖5%, 一価40%, 多価25%
        // 飽和脂肪酸が40%以上または20%未満は要改善
        // 一価不飽和が50%以上または30%未満は要改善
        if (saturatedPercent >= 40 || saturatedPercent < 20 || monounsaturatedPercent >= 50 || monounsaturatedPercent < 30) {
            fattyAcidScore = 2;
            fattyAcidRating = '★★☆☆☆';
            fattyAcidLabel = '要改善';
        } else if (saturatedPercent >= 35 || saturatedPercent < 25 || monounsaturatedPercent >= 45 || monounsaturatedPercent < 35) {
            fattyAcidScore = 4;
            fattyAcidRating = '★★★★☆';
            fattyAcidLabel = '良好';
        } else {
            fattyAcidScore = 5;
            fattyAcidRating = '★★★★★';
            fattyAcidLabel = '優秀';
        }
    }

    currentIntake.fattyAcidScore = fattyAcidScore;
    currentIntake.fattyAcidRating = fattyAcidRating;
    currentIntake.fattyAcidLabel = fattyAcidLabel;

    // 糖質・食物繊維バランススコア
    const totalCarbAndFiber = currentIntake.carbs + currentIntake.fiber;
    let carbFiberScore = 5;
    let carbFiberRating = '★★★★★';
    let carbFiberLabel = '優秀';

    if (totalCarbAndFiber > 0) {
        const carbsPercent = (currentIntake.carbs / totalCarbAndFiber) * 100;
        const fiberPercent = (currentIntake.fiber / totalCarbAndFiber) * 100;

        // 理想: 糖質と食物繊維の比率が近いほど良好
        // 食物繊維が5%未満は要改善、5-10%は良好、10%以上は優秀
        if (fiberPercent < 5) {
            carbFiberScore = 2;
            carbFiberRating = '★★☆☆☆';
            carbFiberLabel = '要改善';
        } else if (fiberPercent < 10) {
            carbFiberScore = 4;
            carbFiberRating = '★★★★☆';
            carbFiberLabel = '良好';
        } else {
            carbFiberScore = 5;
            carbFiberRating = '★★★★★';
            carbFiberLabel = '優秀';
        }
    }

    currentIntake.carbFiberScore = carbFiberScore;
    currentIntake.carbFiberRating = carbFiberRating;
    currentIntake.carbFiberLabel = carbFiberLabel;

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
                        className={`flex-1 py-3 px-2 text-sm font-bold ${activeTab === 'nutrition' ? 'border-b-2' : 'text-gray-600 hover:text-gray-600 hover:bg-gray-50'}`}
                        style={activeTab === 'nutrition' ? {color: '#4A9EFF', borderColor: '#4A9EFF', backgroundColor: '#EFF6FF'} : {}}
                    >
                        <div className="flex items-center justify-center gap-1">
                            <Icon name="BarChart3" size={16} />
                            <span>今日の摂取状況</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('directive')}
                        className={`flex-1 py-3 px-2 text-sm font-bold ${activeTab === 'directive' ? 'border-b-2' : 'text-gray-600 hover:text-gray-600 hover:bg-gray-50'}`}
                        style={activeTab === 'directive' ? {color: '#4A9EFF', borderColor: '#4A9EFF', backgroundColor: '#EFF6FF'} : {}}
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
                        <div className="text-sm text-gray-600 mb-2">カロリー</div>
                        <div className="flex items-end gap-2 mb-2 justify-end">
                            <span className="text-2xl sm:text-3xl font-bold text-blue-600">{Math.round(currentIntake.calories)}</span>
                            <span className="text-lg text-gray-600">/</span>
                            <span className="text-lg text-gray-600">{targetPFC.calories} kcal</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-md">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(caloriesPercent, 100)}%`, background: 'linear-gradient(to right, #4A9EFF, #3b82f6)' }}
                            ></div>
                        </div>
                    </div>

                    {/* PFC */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <div className="text-sm text-gray-600 mb-2">タンパク質</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-2xl sm:text-3xl font-bold text-red-500">{Math.round(currentIntake.protein)}</span>
                                <span className="text-lg text-gray-600">/</span>
                                <span className="text-lg text-gray-600">{targetPFC.protein}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-md">
                                <div className="h-full bg-red-500" style={{ width: `${Math.min(proteinPercent, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 mb-2">脂質</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-2xl sm:text-3xl font-bold text-yellow-500">{Math.round(currentIntake.fat)}</span>
                                <span className="text-lg text-gray-600">/</span>
                                <span className="text-lg text-gray-600">{targetPFC.fat}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-md">
                                <div className="h-full bg-yellow-500" style={{ width: `${Math.min((currentIntake.fat / targetPFC.fat) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 mb-2">炭水化物</div>
                            <div className="flex items-end gap-1 mb-2 justify-end">
                                <span className="text-2xl sm:text-3xl font-bold text-green-500">{Math.round(currentIntake.carbs)}</span>
                                <span className="text-lg text-gray-600">/</span>
                                <span className="text-lg text-gray-600">{targetPFC.carbs}g</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-md">
                                <div className="h-full bg-green-500" style={{ width: `${Math.min((currentIntake.carbs / targetPFC.carbs) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 詳細栄養素 */}
                <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium flex items-center gap-2" style={{color: '#4A9EFF'}}>
                        <Icon name="ChevronDown" size={16} />
                        詳細栄養素＋
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowDetailedNutrientsGuide(true);
                            }}
                            className="ml-auto flex items-center"
                            style={{ color: '#4A9EFF' }}
                        >
                            <Icon name="HelpCircle" size={18} />
                        </button>
                    </summary>
                    <div className="mt-4 space-y-6">

                        {/* 三大栄養素の質 */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 text-gray-800">
                                三大栄養素の質
                            </h4>

                            {/* タンパク質の質（DIAAS） */}
                            <div className="mb-4">
                                    <h5 className="text-xs font-semibold mb-2 text-gray-700">
                                        タンパク質の質
                                    </h5>
                                    <div className="bg-gray-50 p-3 rounded">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">平均DIAAS</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-gray-900">
                                                    {currentIntake.averageDiaas.toFixed(2)}
                                                </span>
                                                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                    currentIntake.averageDiaas >= 1.0
                                                        ? 'bg-green-100 text-green-700'
                                                        : currentIntake.averageDiaas >= 0.75
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {currentIntake.averageDiaas >= 1.0
                                                        ? '優秀'
                                                        : currentIntake.averageDiaas >= 0.75
                                                        ? '良好'
                                                        : '要改善'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">
                                            1.0以上で優秀なタンパク質源
                                        </div>
                                    </div>
                                </div>

                            {/* 炭水化物の質（GL値） */}
                            <div className="mb-4">
                                    <h5 className="text-xs font-semibold mb-2 text-gray-700">
                                        炭水化物の質
                                    </h5>
                                    <div className="bg-gray-50 p-3 rounded space-y-3">
                                        {/* 1日合計GL値 */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">1日合計GL値</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-gray-900">
                                                        {Math.round(currentIntake.adjustedDailyGL)} / 100
                                                    </span>
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                        currentIntake.adjustedDailyGL >= 121
                                                            ? 'bg-red-100 text-red-700'
                                                            : currentIntake.adjustedDailyGL >= 101
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : currentIntake.adjustedDailyGL >= 80
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {currentIntake.adjustedDailyGL >= 121
                                                            ? '要改善'
                                                            : currentIntake.adjustedDailyGL >= 101
                                                            ? '普通'
                                                            : currentIntake.adjustedDailyGL >= 80
                                                            ? '良好'
                                                            : '優秀'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                目標: 100以下
                                            </div>

                                            {/* カロリー不足時のGL余裕アドバイス */}
                                            {currentIntake.calories < targetPFC.calories * 0.8 && currentIntake.adjustedDailyGL < 100 && (
                                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                                    <div className="flex items-start gap-1">
                                                        <Icon name="Info" size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                                        <div className="text-blue-800">
                                                            <div className="font-semibold mb-1">カロリーが不足しています</div>
                                                            <div className="text-blue-700">
                                                                目標まで <span className="font-bold">{Math.round(targetPFC.calories - currentIntake.calories)}kcal</span> 不足しています。
                                                                GL値にはまだ余裕があるので、中GL以下の食事を追加しましょう。
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 血糖管理スコア */}
                                        <div className="border-t pt-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-gray-700">血糖管理</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-bold text-gray-900">
                                                        {currentIntake.bloodSugarRating}
                                                    </span>
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                        currentIntake.bloodSugarScore >= 5
                                                            ? 'bg-green-100 text-green-700'
                                                            : currentIntake.bloodSugarScore >= 4
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : currentIntake.bloodSugarScore >= 3
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {currentIntake.bloodSugarLabel}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 補正要因 */}
                                            {currentIntake.glModifiers.length > 0 && (
                                                <div className="space-y-1 mb-2">
                                                    {currentIntake.glModifiers.map((modifier, idx) => (
                                                        <div key={idx} className="flex justify-between text-xs text-gray-600">
                                                            <span>✓ {modifier.label}</span>
                                                            <span className="text-green-600 font-medium">{modifier.value}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* 実質GL値 */}
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-600">実質GL値</span>
                                                <span className="font-bold text-green-700">
                                                    {Math.round(currentIntake.adjustedGL)}
                                                    <span className="text-gray-500 ml-1">
                                                        ({currentIntake.adjustedGL >= 20 ? '高' : currentIntake.adjustedGL >= 11 ? '中' : '低'}GL相当)
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* GI値内訳 */}
                                        <div className="border-t pt-3">
                                            <div className="text-xs font-medium text-gray-700 mb-2">GI値内訳</div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-600">GI 60以上</span>
                                                    <span className="font-medium text-red-600">
                                                        {Math.round(currentIntake.highGIPercent)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all"
                                                        style={{ width: `${currentIntake.highGIPercent}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs mt-2">
                                                    <span className="text-gray-600">GI 60未満</span>
                                                    <span className="font-medium text-green-600">
                                                        {Math.round(currentIntake.lowGIPercent)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all"
                                                        style={{ width: `${currentIntake.lowGIPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            {/* 脂肪酸 */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-semibold text-gray-700">
                                        脂肪酸バランス
                                    </h5>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-gray-900">
                                            {currentIntake.fattyAcidRating}
                                        </span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                            currentIntake.fattyAcidScore >= 5
                                                ? 'bg-green-100 text-green-700'
                                                : currentIntake.fattyAcidScore >= 4
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {currentIntake.fattyAcidLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* 全体のバランスプログレスバー */}
                                <div className="bg-gray-50 p-3 rounded mb-3">
                                    <div className="text-xs font-medium text-gray-700 mb-2">バランス</div>
                                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                                        {(() => {
                                            const totalFat = currentIntake.saturatedFat + currentIntake.mediumChainFat + currentIntake.monounsaturatedFat + currentIntake.polyunsaturatedFat;
                                            if (totalFat === 0) return null;

                                            const saturatedPercent = (currentIntake.saturatedFat / totalFat) * 100;
                                            const mediumChainPercent = (currentIntake.mediumChainFat / totalFat) * 100;
                                            const monounsaturatedPercent = (currentIntake.monounsaturatedFat / totalFat) * 100;
                                            const polyunsaturatedPercent = (currentIntake.polyunsaturatedFat / totalFat) * 100;

                                            return (
                                                <>
                                                    {saturatedPercent > 0 && (
                                                        <div
                                                            className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${saturatedPercent}%` }}
                                                        >
                                                            {saturatedPercent >= 10 && `${Math.round(saturatedPercent)}%`}
                                                        </div>
                                                    )}
                                                    {mediumChainPercent > 0 && (
                                                        <div
                                                            className="bg-cyan-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${mediumChainPercent}%` }}
                                                        >
                                                            {mediumChainPercent >= 10 && `${Math.round(mediumChainPercent)}%`}
                                                        </div>
                                                    )}
                                                    {monounsaturatedPercent > 0 && (
                                                        <div
                                                            className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${monounsaturatedPercent}%` }}
                                                        >
                                                            {monounsaturatedPercent >= 10 && `${Math.round(monounsaturatedPercent)}%`}
                                                        </div>
                                                    )}
                                                    {polyunsaturatedPercent > 0 && (
                                                        <div
                                                            className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                                                            style={{ width: `${polyunsaturatedPercent}%` }}
                                                        >
                                                            {polyunsaturatedPercent >= 10 && `${Math.round(polyunsaturatedPercent)}%`}
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                                            <span>飽和</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                                            <span>中鎖</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                                            <span>一価</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                            <span>多価</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                        目標: 飽和30% / 中鎖5% / 一価40% / 多価25%
                                    </div>
                                </div>

                                {/* 詳細数値 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        // 理想の脂肪酸比率: 飽和30% / 中鎖5% / 一価40% / 多価25%
                                        const totalFat = targetPFC.fat; // 推奨脂質量
                                        const idealRatios = {
                                            saturated: 0.30,
                                            mediumChain: 0.05,
                                            monounsaturated: 0.40,
                                            polyunsaturated: 0.25
                                        };

                                        const colorClasses = {
                                            'red': 'bg-gradient-to-r from-red-400 to-red-500',
                                            'cyan': 'bg-gradient-to-r from-cyan-400 to-cyan-500',
                                            'yellow': 'bg-gradient-to-r from-yellow-400 to-yellow-500',
                                            'blue': 'bg-gradient-to-r from-blue-400 to-blue-500'
                                        };

                                        return [
                                            {
                                                name: '飽和脂肪酸',
                                                color: 'red',
                                                current: currentIntake.saturatedFat,
                                                target: Math.round(totalFat * idealRatios.saturated * 10) / 10
                                            },
                                            {
                                                name: '中鎖脂肪酸（MCT）',
                                                color: 'cyan',
                                                current: currentIntake.mediumChainFat,
                                                target: Math.round(totalFat * idealRatios.mediumChain * 10) / 10
                                            },
                                            {
                                                name: '一価不飽和脂肪酸',
                                                color: 'yellow',
                                                current: currentIntake.monounsaturatedFat,
                                                target: Math.round(totalFat * idealRatios.monounsaturated * 10) / 10
                                            },
                                            {
                                                name: '多価不飽和脂肪酸',
                                                color: 'blue',
                                                current: currentIntake.polyunsaturatedFat,
                                                target: Math.round(totalFat * idealRatios.polyunsaturated * 10) / 10
                                            }
                                        ].map((item, idx) => {
                                            const percent = item.target ? (item.current / item.target) * 100 : 0;

                                            return (
                                                <div key={idx} className="bg-gray-50 p-2 rounded">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-medium">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-gray-600">
                                                            {Math.round(item.current * 10) / 10} / {item.target}g
                                                        </span>
                                                    </div>
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${colorClasses[item.color]} transition-all`}
                                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* 糖質・食物繊維 */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-semibold text-gray-700">
                                        糖質・食物繊維バランス
                                    </h5>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-gray-900">
                                            {currentIntake.carbFiberRating}
                                        </span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                            currentIntake.carbFiberScore >= 5
                                                ? 'bg-green-100 text-green-700'
                                                : currentIntake.carbFiberScore >= 4
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {currentIntake.carbFiberLabel}
                                        </span>
                                    </div>
                                </div>

                                {/* 糖質/食物繊維バランスプログレスバー */}
                                {(currentIntake.carbs > 0 || currentIntake.fiber > 0) && (
                                    <div className="bg-gray-50 p-3 rounded mb-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">バランス</div>
                                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                                            {(() => {
                                                const totalCarbAndFiber = currentIntake.carbs + currentIntake.fiber;
                                                if (totalCarbAndFiber === 0) return null;

                                                const carbsPercent = (currentIntake.carbs / totalCarbAndFiber) * 100;
                                                const fiberPercent = (currentIntake.fiber / totalCarbAndFiber) * 100;

                                                return (
                                                    <>
                                                        {carbsPercent > 0 && (
                                                            <div
                                                                className="bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium"
                                                                style={{ width: `${carbsPercent}%` }}
                                                            >
                                                                {carbsPercent >= 10 && `${Math.round(carbsPercent)}%`}
                                                            </div>
                                                        )}
                                                        {fiberPercent > 0 && (
                                                            <div
                                                                className="bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-white text-xs font-medium"
                                                                style={{ width: `${fiberPercent}%` }}
                                                            >
                                                                {fiberPercent >= 10 && `${Math.round(fiberPercent)}%`}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded"></div>
                                                <span>炭水化物</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded"></div>
                                                <span>食物繊維</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                            目標: 炭水化物{Math.round(currentIntake.carbs)}g / 食物繊維{Math.round(currentIntake.fiber)}g
                                        </div>
                                    </div>
                                )}

                                {/* 詳細数値 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(() => {
                                        const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                        const fiberTargets = targets.carbohydrateQuality || { fiber: 20, solubleFiber: 7, insolubleFiber: 13 };

                                        // 糖質の推奨量 = 炭水化物の推奨量 - 食物繊維の推奨量
                                        const sugarTarget = targetPFC.carbs - fiberTargets.fiber;

                                        return [
                                            {
                                                name: '糖質',
                                                icon: 'Cookie',
                                                color: 'amber',
                                                current: currentIntake.sugar,
                                                target: sugarTarget,
                                                unit: 'g'
                                            },
                                            {
                                                name: '食物繊維',
                                                icon: 'Wheat',
                                                color: 'green',
                                                current: currentIntake.fiber,
                                                target: fiberTargets.fiber,
                                                unit: 'g'
                                            },
                                            {
                                                name: '水溶性食物繊維',
                                                icon: 'Droplet',
                                                color: 'blue',
                                                current: currentIntake.solubleFiber,
                                                target: fiberTargets.solubleFiber,
                                                unit: 'g'
                                            },
                                            {
                                                name: '不溶性食物繊維',
                                                icon: 'Layers',
                                                color: 'teal',
                                                current: currentIntake.insolubleFiber,
                                                target: fiberTargets.insolubleFiber,
                                                unit: 'g'
                                            }
                                        ].map((item, idx) => {
                                            const percent = item.target ? (item.current / item.target) * 100 : 0;

                                            // 色のマッピング（Tailwindの動的クラス名問題を回避）
                                            const colorClasses = {
                                                'amber': 'bg-gradient-to-r from-amber-400 to-orange-500',
                                                'green': 'bg-gradient-to-r from-green-400 to-green-500',
                                                'blue': 'bg-gradient-to-r from-blue-400 to-blue-500',
                                                'teal': 'bg-gradient-to-r from-teal-400 to-emerald-500'
                                            };

                                            return (
                                                <div key={idx} className="bg-gray-50 p-2 rounded">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="font-medium">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-gray-600">
                                                            {Math.round(item.current * 10) / 10}{item.target ? ` / ${item.target}` : ''}{item.unit}
                                                        </span>
                                                    </div>
                                                    {item.target && (
                                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${colorClasses[item.color]} transition-all`}
                                                                style={{ width: `${Math.min(percent, 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                    {item.note && (
                                                        <div className="text-xs text-gray-500 mt-1">{item.note}</div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* ビタミン */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 text-gray-800">
                                ビタミン
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(() => {
                                    // 完全個別化基準値を取得
                                    const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                    const vitaminKeys = ['vitaminA', 'vitaminD', 'vitaminE', 'vitaminK', 'vitaminB1', 'vitaminB2', 'niacin', 'pantothenicAcid', 'vitaminB6', 'biotin', 'folicAcid', 'vitaminB12', 'vitaminC'];
                                    const vitaminLabels = {
                                        vitaminA: 'A', vitaminD: 'D', vitaminE: 'E', vitaminK: 'K',
                                        vitaminB1: 'B1', vitaminB2: 'B2', niacin: 'B3', pantothenicAcid: 'B5',
                                        vitaminB6: 'B6', biotin: 'B7', folicAcid: 'B9', vitaminB12: 'B12', vitaminC: 'C'
                                    };
                                    const vitaminUnits = {
                                        vitaminA: 'μg', vitaminD: 'μg', vitaminE: 'mg', vitaminK: 'μg',
                                        vitaminB1: 'mg', vitaminB2: 'mg', niacin: 'mg', pantothenicAcid: 'mg',
                                        vitaminB6: 'mg', biotin: 'μg', folicAcid: 'μg', vitaminB12: 'μg', vitaminC: 'mg'
                                    };
                                    return vitaminKeys.map((key) => {
                                        const target = targets[key] || 0;
                                        // カスタム栄養素がオブジェクト形式の場合の処理
                                        const rawValue = currentIntake.vitamins[key];
                                        let current = 0;
                                        if (typeof rawValue === 'object' && rawValue !== null && rawValue.amount !== undefined) {
                                            current = Number(rawValue.amount) || 0;
                                        } else {
                                            current = Number(rawValue) || 0;
                                        }
                                        const percent = target > 0 ? (current / target) * 100 : 0;

                                    return (
                                        <div key={key} className="bg-gray-50 p-2 rounded">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">ビタミン{vitaminLabels[key]}</span>
                                                <span className="text-gray-600">
                                                    {typeof current === 'number' ? current.toFixed(1) : 0} / {target}{vitaminUnits[key]}
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
                                    });
                                })()}
                            </div>
                        </div>

                        {/* ミネラル */}
                        <div>
                            <h4 className="text-sm font-bold mb-3 text-gray-800">
                                ミネラル
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(() => {
                                    // 完全個別化基準値を取得
                                    const targets = LBMUtils.calculatePersonalizedMicronutrients(profile || {});
                                    const mineralKeys = ['calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc', 'copper', 'manganese', 'selenium', 'iodine', 'chromium', 'molybdenum'];
                                    const mineralNames = {
                                        calcium: 'カルシウム', iron: '鉄', magnesium: 'マグネシウム',
                                        phosphorus: 'リン', potassium: 'カリウム', sodium: 'ナトリウム',
                                        zinc: '亜鉛', copper: '銅', manganese: 'マンガン',
                                        selenium: 'セレン', iodine: 'ヨウ素', chromium: 'クロム', molybdenum: 'モリブデン'
                                    };
                                    const mineralUnits = {
                                        calcium: 'mg', iron: 'mg', magnesium: 'mg',
                                        phosphorus: 'mg', potassium: 'mg', sodium: 'mg',
                                        zinc: 'mg', copper: 'mg', manganese: 'mg',
                                        selenium: 'μg', iodine: 'μg', chromium: 'μg', molybdenum: 'μg'
                                    };
                                    return mineralKeys.map((key) => {
                                        const target = targets[key] || 0;
                                        // カスタム栄養素がオブジェクト形式の場合の処理
                                        const rawValue = currentIntake.minerals[key];
                                        let current = 0;
                                        if (typeof rawValue === 'object' && rawValue !== null && rawValue.amount !== undefined) {
                                            current = Number(rawValue.amount) || 0;
                                        } else {
                                            current = Number(rawValue) || 0;
                                        }
                                        const percent = (current / target) * 100;

                                        // 基準上限値を超えているかチェック（ボディメイカーの場合）
                                        const baseLimit = targets.upperLimits?.base?.[key];
                                        const exceedsBaseLimit = baseLimit !== null && baseLimit !== undefined && current > baseLimit;
                                    return (
                                        <div key={key} className="bg-gray-50 p-2 rounded">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium">{mineralNames[key]}</span>
                                                <span className={exceedsBaseLimit ? "text-red-600 font-bold" : "text-gray-600"}>
                                                    {typeof current === 'number' ? current.toFixed(1) : 0} / {target}{mineralUnits[key]}
                                                    {exceedsBaseLimit && <span className="ml-1" title="基準上限値を超えています">⚠️</span>}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all"
                                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* その他の栄養素 */}
                        {Object.keys(currentIntake.otherNutrients || {}).length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold mb-3 text-gray-800">
                                    その他の栄養素
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                            // カスタム栄養素の場合（オブジェクト形式）
                                            if (typeof value === 'object' && value.amount !== undefined) {
                                                const numValue = Number(value.amount) || 0;
                                                const displayValue = numValue.toFixed(numValue < 1 ? 3 : 1);
                                                return (
                                                    <div key={key} className="bg-gray-50 p-2 rounded">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="font-medium">{key}</span>
                                                            <span className="text-gray-600">
                                                                {displayValue}{value.unit || 'mg'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // 既存の栄養素の場合（数値形式）
                                            // valueが数値でない場合はスキップ
                                            if (typeof value !== 'number' && typeof value !== 'string') {
                                                return null;
                                            }
                                            const target = targets.otherNutrients[key] || 100;
                                            const isGrams = key === 'creatine';
                                            const unit = isGrams ? 'g' : 'mg';
                                            const numValue = Number(value) || 0;
                                            const displayValue = isGrams ? (numValue / 1000).toFixed(2) : numValue.toFixed(1);
                                            const displayTarget = isGrams ? (target / 1000).toFixed(1) : target;
                                            const percent = (numValue / target) * 100;
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
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </details>

                    </div>
                )}

                {/* タブコンテンツ（指示書） */}
                {activeTab === 'directive' && (
                    <div id="directive-section">
                        {todayDirective ? (
                            <>
                                <div className="flex items-center gap-3 mb-3">
                                    <Icon name="Target" size={20} className="text-green-600" />
                                    <span className="text-xs text-gray-600">今日の目標</span>
                                </div>
                                <div className="bg-white rounded-2xl border-2 border-green-600 p-4 mb-4 shadow-sm">
                                    <div className="text-base font-bold text-gray-800 mb-2 whitespace-pre-line">
                                        {todayDirective.message}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => setShowDirectiveEdit(true)}
                                        className="flex-1 bg-[#4A9EFF] text-white font-semibold py-3 px-6 rounded-lg hover:bg-[#3b8fef] transition flex items-center justify-center gap-2"
                                    >
                                        <Icon name="Edit" size={18} />
                                        編集
                                    </button>
                                    {!todayDirective.completed ? (
                                        <button
                                            onClick={handleCompleteDirective}
                                            className="flex-1 bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Icon name="CheckCircle" size={18} />
                                            完了
                                        </button>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center gap-2 text-green-600 font-semibold py-3">
                                            <Icon name="CheckCircle" size={18} />
                                            完了済み
                                        </div>
                                    )}
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
                        style={{color: '#4A9EFF'}}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#3b8fef'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#4A9EFF'}
                    >
                        <Icon name="HelpCircle" size={18} />
                    </button>
                    <div className="ml-auto flex gap-2">
                        {/* 予測入力ボタン（トグル） */}
                        {yesterdayRecord && (
                            <button
                                onClick={async () => {
                                    const hasPredicted = dailyRecord.meals?.some(m => m.isPredicted) ||
                                                         dailyRecord.workouts?.some(w => w.isPredicted) ||
                                                         dailyRecord.bodyComposition?.isPredicted ||
                                                         dailyRecord.conditions?.isPredicted;
                                    if (hasPredicted) {
                                        // クリア
                                        const clearedRecord = {
                                            ...dailyRecord,
                                            meals: dailyRecord.meals?.filter(m => !m.isPredicted) || [],
                                            workouts: dailyRecord.workouts?.filter(w => !w.isPredicted) || [],
                                            bodyComposition: dailyRecord.bodyComposition?.isPredicted ? {} : dailyRecord.bodyComposition,
                                            conditions: dailyRecord.conditions?.isPredicted ? {} : dailyRecord.conditions
                                        };
                                        setDailyRecord(clearedRecord);
                                        const userId = user?.uid || DEV_USER_ID;
                                        await DataService.saveDailyRecord(userId, currentDate, clearedRecord);
                                    } else {
                                        // 入力
                                        loadPredictedData();
                                    }
                                }}
                                className={`text-sm px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 ${
                                    dailyRecord.meals?.some(m => m.isPredicted) ||
                                    dailyRecord.workouts?.some(w => w.isPredicted) ||
                                    dailyRecord.bodyComposition?.isPredicted ||
                                    dailyRecord.conditions?.isPredicted
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                                }`}
                            >
                                {!(dailyRecord.meals?.some(m => m.isPredicted) ||
                                   dailyRecord.workouts?.some(w => w.isPredicted) ||
                                   dailyRecord.bodyComposition?.isPredicted ||
                                   dailyRecord.conditions?.isPredicted) && (
                                    <Icon name="Sparkles" size={16} />
                                )}
                                {(dailyRecord.meals?.some(m => m.isPredicted) ||
                                  dailyRecord.workouts?.some(w => w.isPredicted) ||
                                  dailyRecord.bodyComposition?.isPredicted ||
                                  dailyRecord.conditions?.isPredicted) ? 'クリア' : '予測'}
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
                                className={`text-sm px-4 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 ${
                                    dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-[#4A9EFF] text-white hover:bg-[#3b8fef]'
                                }`}
                            >
                                {!(dailyRecord.meals?.some(m => m.isRoutine) || dailyRecord.workouts?.some(w => w.isRoutine)) && (
                                    <Icon name="Repeat" size={16} />
                                )}
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
                            <h4 className="font-bold text-gray-800">体組成</h4>
                        </div>
                        <span className="text-lg font-bold text-teal-600">
                            LBM {((Number(bodyComposition.weight) || 0) * (1 - (Number(bodyComposition.bodyFatPercentage) || 0) / 100)).toFixed(1)}kg
                        </span>
                    </div>
                    <div className="p-6">

                    {/* 体重 */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Weight" size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-gray-600">体重</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={() => {
                                    const currentWeight = parseFloat(bodyComposition.weight) || 0;
                                    const newWeight = Math.max(0, currentWeight - 1);
                                    updateBodyComposition(newWeight, bodyComposition.bodyFatPercentage);
                                    setWeightInput(newWeight > 0 ? newWeight.toString() : '');
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
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
                                    className="w-full px-4 py-2 text-lg font-bold text-gray-800 text-center bg-white border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none hover:border-gray-400 transition"
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                            >
                                +1
                            </button>
                        </div>
                    </div>

                    {/* 体脂肪率 */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Percent" size={16} className="text-teal-600" />
                            <span className="text-sm font-bold text-gray-600">体脂肪率</span>
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
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
                                    className="w-full px-4 py-2 text-lg font-bold text-gray-800 text-center bg-white border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none hover:border-gray-400 transition"
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
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
                            <h4 className="font-bold text-gray-800">食事</h4>
                            <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-bold">
                                {dailyRecord.meals?.length || 0}
                            </span>
                        </div>
                        <button
                            onClick={() => window.handleQuickAction && window.handleQuickAction('meal')}
                            className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg hover:shadow-xl transition"
                        >
                            ＋ 追加
                        </button>
                    </div>
                    <div className="p-4">
                    {dailyRecord.meals?.length > 0 ? (
                        <div className="space-y-3">
                            {dailyRecord.meals.map((meal, index) => (
                                <div key={meal.id || index} className={`bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 shadow-md border border-gray-200 ${
                                    meal.isPredicted ? 'border-2 border-sky-300 bg-sky-50 shadow-sky-200/50' :
                                    meal.isRoutine ? 'border-2 border-amber-300 bg-amber-50 shadow-amber-200/50' :
                                    meal.isTemplate ? 'border-2 border-purple-300 bg-purple-50 shadow-purple-200/50' :
                                    ''
                                }`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs text-gray-600">{meal.time}</span>
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
                                                {meal.isTemplate && (
                                                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Icon name="BookTemplate" size={10} />
                                                        テンプレート
                                                    </span>
                                                )}
                                                {meal.isPostWorkout && (
                                                    <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Icon name="Zap" size={10} />
                                                        運動後
                                                    </span>
                                                )}
                                                {(() => {
                                                    const mealGLData = mealGLValues.find(m => m.mealId === (meal.id || meal.timestamp));
                                                    if (mealGLData) {
                                                        // GL値の表示テキストを決定
                                                        let displayText = `GL ${Math.round(mealGLData.adjustedGL)}`;
                                                        if (mealGLData.rating === '高GL（推奨）') {
                                                            displayText += ' (推奨)';
                                                        } else if (mealGLData.rating === '高GL' && !meal.isPostWorkout) {
                                                            displayText += ' (分割推奨)';
                                                        } else if (mealGLData.rating === '中GL') {
                                                            displayText += ' (良好)';
                                                        } else if (mealGLData.rating === '低GL') {
                                                            displayText += ' (優秀)';
                                                        }

                                                        return (
                                                            <span className={`text-xs ${mealGLData.badgeColor} text-white px-2 py-0.5 rounded-full flex items-center gap-1`}>
                                                                {displayText}
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <div
                                                onClick={() => setExpandedMeals(prev => ({...prev, [meal.id || index]: !prev[meal.id || index]}))}
                                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -ml-1"
                                            >
                                                <Icon name={expandedMeals[meal.id || index] ? "ChevronDown" : "ChevronRight"} size={16} className="text-gray-400" />
                                                <div className="text-base font-bold text-gray-800">
                                                    {meal.name}
                                                </div>
                                            </div>
                                            {expandedMeals[meal.id || index] && meal.items?.map((item, i) => (
                                                <div key={i} className="text-xs text-gray-600 ml-6 mt-1">
                                                    {item.name} {item.amount}{item.unit || 'g'}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="text-right ml-4">
                                            <div className="text-xl font-bold text-blue-600">{Math.floor(meal.totalCalories || meal.calories || 0)}</div>
                                            <div className="text-xs text-gray-600">kcal</div>
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
                                                    toast.success('テンプレートを保存しました');
                                                }
                                            }}
                                            className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-purple-600 hover:bg-purple-50 transition border-2 border-purple-500"
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
                                            className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                        >
                                            <Icon name="Edit" size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteItem('meal', meal.id)}
                                            className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
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
                                <h4 className="font-bold text-gray-800">運動</h4>
                                <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                                    {dailyRecord.workouts?.length || 0}
                                </span>
                            </div>
                            <button
                                onClick={() => window.handleQuickAction && window.handleQuickAction('workout')}
                                className="text-sm px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-lg hover:shadow-xl transition"
                            >
                                ＋ 追加
                            </button>
                        </div>
                        <div className="p-4">
                        {dailyRecord.workouts?.length > 0 ? (
                            <div className="space-y-3">
                                {dailyRecord.workouts.map((workout, index) => (
                                    <div key={workout.id || index} className={`bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 shadow-md border border-gray-200 ${
                                        workout.isPredicted ? 'border-2 border-sky-300 bg-sky-50 shadow-sky-200/50' :
                                        workout.isRoutine ? 'border-2 border-amber-300 bg-amber-50 shadow-amber-200/50' :
                                        workout.isTemplate ? 'border-2 border-purple-300 bg-purple-50 shadow-purple-200/50' :
                                        ''
                                    }`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs text-gray-600">{workout.time}</span>
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
                                                    {workout.isTemplate && (
                                                        <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Icon name="BookTemplate" size={10} />
                                                            テンプレート
                                                        </span>
                                                    )}
                                                </div>
                                                {/* 運動名と右上のサマリー */}
                                                <div className="flex items-start justify-between mb-2">
                                                    <div
                                                        onClick={() => setExpandedWorkouts(prev => ({...prev, [workout.id || index]: !prev[workout.id || index]}))}
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded p-1 -ml-1"
                                                    >
                                                        <Icon name={expandedWorkouts[workout.id || index] ? "ChevronDown" : "ChevronRight"} size={16} className="text-gray-400" />
                                                        <div className="text-base font-bold text-gray-800">
                                                            {workout.name}
                                                        </div>
                                                    </div>
                                                    {/* 右上: 総セット数・総重量・総時間 */}
                                                    {(() => {
                                                        let totalSets = 0;
                                                        let totalVolume = 0;
                                                        let totalTime = 0;
                                                        workout.exercises?.forEach(exercise => {
                                                            const isCardioOrStretch = exercise.exerciseType === 'aerobic' || exercise.exerciseType === 'stretch';
                                                            if (exercise.sets) {
                                                                totalSets += exercise.sets.length;
                                                            }
                                                            if (!isCardioOrStretch && exercise.sets) {
                                                                totalVolume += exercise.sets.reduce((sum, set) => {
                                                                    return sum + (set.weight || 0) * (set.reps || 0);
                                                                }, 0);
                                                            }
                                                            if (exercise.duration) {
                                                                totalTime += exercise.duration;
                                                            } else if (exercise.sets) {
                                                                exercise.sets.forEach(set => {
                                                                    totalTime += set.duration || 0;
                                                                });
                                                            }
                                                        });
                                                        return (
                                                            <div className="text-right leading-normal">
                                                                {totalSets > 0 && (
                                                                    <div className="leading-normal">
                                                                        <span className="text-base text-orange-600 font-bold">{totalSets}</span>
                                                                        <span className="text-xs text-gray-500">セット</span>
                                                                    </div>
                                                                )}
                                                                {totalVolume > 0 && (
                                                                    <div className="leading-normal">
                                                                        <span className="text-base text-orange-600 font-bold">{totalVolume}</span>
                                                                        <span className="text-xs text-gray-500">kg</span>
                                                                    </div>
                                                                )}
                                                                {totalTime > 0 && (
                                                                    <div className="leading-normal">
                                                                        <span className="text-base text-orange-600 font-bold">{totalTime}</span>
                                                                        <span className="text-xs text-gray-500">分</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* 展開時の詳細 */}
                                                {expandedWorkouts[workout.id || index] && workout.exercises?.map((exercise, i) => {
                                                    const isCardioOrStretch = exercise.exerciseType === 'aerobic' || exercise.exerciseType === 'stretch';

                                                    // 種目名を取得（優先順位：name > exercise.name > workout.name）
                                                    const exerciseName = exercise.name || exercise.exercise?.name || workout.name || '運動';

                                                    return (
                                                        <div key={i} className="text-sm text-gray-600 mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                                                            <p className="font-bold text-base">{exerciseName}</p>
                                                            {isCardioOrStretch ? (
                                                                // 有酸素・ストレッチ: 時間のみ表示
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    {exercise.duration
                                                                        ? `${exercise.duration}分`
                                                                        : exercise.sets
                                                                            ? `${exercise.sets.reduce((sum, set) => sum + (set.duration || 0), 0)}分`
                                                                            : '0分'}
                                                                </p>
                                                            ) : (
                                                                // 筋トレ: セット詳細を表示
                                                                <div className="mt-1 space-y-1">
                                                                    {exercise.sets?.map((set, si) => {
                                                                        const volume = (set.weight || 0) * (set.reps || 0);
                                                                        return (
                                                                            <div key={si}>
                                                                                <p className="text-xs text-gray-600">
                                                                                    Set {si + 1}: {set.weight}kg × {set.reps}回 = {volume}kg
                                                                                </p>
                                                                                {set.rm && set.rmWeight && (
                                                                                    <p className="text-xs text-orange-600 font-medium">
                                                                                        🏆 RM更新: {set.rm}RM × {set.rmWeight}kg
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
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
                                                        // undefined値を除去するユーティリティ関数
                                                        const removeUndefined = (obj) => {
                                                            if (Array.isArray(obj)) {
                                                                return obj.map(removeUndefined).filter(item => item !== undefined);
                                                            }
                                                            if (obj !== null && typeof obj === 'object') {
                                                                return Object.entries(obj).reduce((acc, [key, value]) => {
                                                                    if (value !== undefined) {
                                                                        acc[key] = removeUndefined(value);
                                                                    }
                                                                    return acc;
                                                                }, {});
                                                            }
                                                            return obj;
                                                        };

                                                        const template = removeUndefined({
                                                            id: Date.now(),
                                                            name: templateName,
                                                            exercises: workout.exercises
                                                        });
                                                        await DataService.saveWorkoutTemplate(user.uid, template);
                                                        toast.success('テンプレートを保存しました');
                                                    }
                                                }}
                                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-purple-600 hover:bg-purple-50 transition border-2 border-purple-500"
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
                                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-[#4A9EFF] hover:bg-blue-50 transition border-2 border-[#4A9EFF]"
                                            >
                                                <Icon name="Edit" size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteItem('workout', workout.id)}
                                                className="min-w-[44px] min-h-[44px] rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
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
                            <h4 className="font-bold text-gray-800">コンディション</h4>
                        </div>
                    </div>
                    <div className="p-6 space-y-2">
                        {/* 睡眠時間 */}
                        <div className="py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="mb-2">
                                <span className="text-sm text-gray-600 font-bold">睡眠時間</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.sleepHours && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-[#4A9EFF] rounded-full shadow-md transition-all duration-300 ease-out"
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
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-all duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.sleepHours) || 0)
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
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
                                <span className="text-sm text-gray-600 font-bold">睡眠の質</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.sleepQuality && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-[#4A9EFF] rounded-full shadow-md transition-all duration-300 ease-out"
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
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-all duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.sleepQuality) || 0)
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
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
                                <span className="text-sm text-gray-600 font-bold">食欲</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.appetite && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-[#4A9EFF] rounded-full shadow-md transition-all duration-300 ease-out"
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
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-all duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.appetite) || 0)
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
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
                                <span className="text-sm text-gray-600 font-bold">腸内環境</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.digestion && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-[#4A9EFF] rounded-full shadow-md transition-all duration-300 ease-out"
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
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-all duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.digestion) || 0)
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
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
                                <span className="text-sm text-gray-600 font-bold">集中力</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.focus && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-[#4A9EFF] rounded-full shadow-md transition-all duration-300 ease-out"
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
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-all duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.focus) || 0)
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
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
                                <span className="text-sm text-gray-600 font-bold">ストレス</span>
                            </div>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5 relative">
                                {/* スライド背景 */}
                                {dailyRecord.conditions?.stress && (
                                    <div
                                        className="absolute top-1.5 bottom-1.5 bg-[#4A9EFF] rounded-full shadow-md transition-all duration-300 ease-out"
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
                                        className={`relative z-10 flex-1 rounded-full py-2 text-center text-xs font-medium transition-all duration-300 focus:outline-none ${
                                            item.value === ((dailyRecord.conditions?.stress) || 0)
                                                ? 'text-white shadow-sm'
                                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:shadow-sm'
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
                                <h4 className="font-bold text-gray-800">閃き</h4>
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

                                    // 履歴グラフiframeにデータ再読み込みメッセージを送信
                                    const historyIframe = document.querySelector('iframe[title*="履歴グラフ"]');
                                    if (historyIframe && historyIframe.contentWindow) {
                                        historyIframe.contentWindow.postMessage({
                                            type: 'RELOAD_DATA'
                                        }, '*');
                                    }
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
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between border-b-2 border-gray-200">
                            <div className="flex items-center gap-3">
                                <Icon name="PieChart" size={32} className="text-indigo-600" />
                                <h4 className="font-bold text-gray-800">分析</h4>
                                <button
                                    onClick={() => setShowScoringGuideModal(true)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition"
                                    title="採点基準を見る"
                                    style={{color: '#4A9EFF'}}
                                >
                                    <Icon name="Info" size={16} />
                                </button>
                            </div>
                            <button
                                onClick={() => window.handleQuickAction && window.handleQuickAction('analysis')}
                                className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition"
                            >
                                ＋ 分析
                            </button>
                        </div>
                        <div className="p-6">
                            {/* 当日のスコア表示（ドーナツグラフ） */}
                            <ScoreDoughnutChart
                                profile={profile}
                                dailyRecord={dailyRecord}
                                targetPFC={targetPFC}
                                user={user}
                                currentDate={currentDate}
                                setDailyRecord={setDailyRecord}
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
                    <div className="bg-white rounded-xl w-full max-w-[95vw] sm:max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-4">
                            {/* ヘッダー */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="Info" size={20} style={{color: '#4A9EFF'}} />
                                    採点基準
                                </h3>
                                <button
                                    onClick={() => setShowScoringGuideModal(false)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition"
                                >
                                    <Icon name="X" size={20} className="text-gray-600" />
                                </button>
                            </div>

                            {/* 食事スコア */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Utensils" size={18} className="text-green-600" />
                                    <h4 className="font-bold text-green-800">食事スコア（100点満点）</h4>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
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
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>種目数</strong>（50%）</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>ボディメイカー：5種目以上で満点</li>
                                        <li>一般：3種目以上で満点</li>
                                    </ul>
                                    <p className="mt-2"><strong>総セット数</strong>（50%）</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>ボディメイカー：20セット以上で満点</li>
                                        <li>一般：12セット以上で満点</li>
                                        <li>有酸素：15分 = 1セット換算</li>
                                        <li>ストレッチ：10分 = 1セット換算</li>
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
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>6項目の平均で評価</strong></p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li>睡眠時間（1-5段階、5=9h以上）</li>
                                        <li>睡眠の質（1-5段階、5=最高）</li>
                                        <li>食欲（1-5段階、5=最適）</li>
                                        <li>腸内環境（1-5段階、5=最高）</li>
                                        <li>集中力（1-5段階、5=最高）</li>
                                        <li>ストレス（1-5段階、5=なし、1=極大）</li>
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

            {/* 詳細栄養素の使い方モーダル */}
            {showDetailedNutrientsGuide && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-[95vw] sm:max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-4">
                            {/* ヘッダー */}
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Icon name="HelpCircle" size={20} style={{color: '#4A9EFF'}} />
                                    詳細栄養素の使い方
                                </h3>
                                <button
                                    onClick={() => setShowDetailedNutrientsGuide(false)}
                                    className="p-1 hover:bg-gray-100 rounded-full transition"
                                >
                                    <Icon name="X" size={20} className="text-gray-600" />
                                </button>
                            </div>

                            {/* タンパク質の質（DIAAS） */}
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Beef" size={18} className="text-red-600" />
                                    <h4 className="font-bold text-red-800">タンパク質の質（DIAAS）</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="font-medium">DIAASとは？</p>
                                    <p>消化・吸収・利用効率を評価する最新の指標です。</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>1.0以上</strong>：優秀なタンパク質源（動物性、大豆など）</li>
                                        <li><strong>0.75-1.0</strong>：良好（豆類など）</li>
                                        <li><strong>0.75未満</strong>：要改善（穀類単体など）</li>
                                    </ul>
                                    <div className="mt-3 bg-blue-50 border border-blue-300 rounded p-3">
                                        <p className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                            <Icon name="Clock" size={16} />
                                            最適な摂取タイミング
                                        </p>
                                        <div className="text-xs text-gray-700 space-y-2">
                                            <p><strong>⚡ 運動直後（30分以内）：</strong> 筋肉が最もアミノ酸を必要とするゴールデンタイム。高DIASS食品（ホエイプロテイン、卵、乳製品）を優先。</p>
                                            <p><strong>🌅 朝食：</strong> 睡眠中の筋分解状態から合成状態へ切り替えるため、必ず高DIASS食品を摂取。</p>
                                            <p><strong>🍽️ 毎食：</strong> 体は一度に大量のタンパク質を処理できません。毎食コンスタントに良質なタンパク質（DIASS 1.0以上）を補給。</p>
                                            <p className="mt-2 text-blue-700 font-medium">💡 組み合わせのコツ： 白米＋納豆、パン＋卵など、低DIAASと高DIAASを組み合わせてアミノ酸バランスを改善。</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-red-400">
                                        <strong>目指すべき目標：</strong> 毎食1.0以上を目指しましょう。動物性タンパク質と植物性タンパク質を組み合わせると効率的です。
                                    </p>
                                </div>
                            </div>

                            {/* 炭水化物の質（GL値） */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Wheat" size={18} className="text-green-600" />
                                    <h4 className="font-bold text-green-800">炭水化物の質（GL値・血糖管理）</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="font-medium">GL値（Glycemic Load）とは？</p>
                                    <p>血糖値の上昇度を示す指標で、「1食ごと」と「1日合計」の2つの評価があります。</p>

                                    <div className="mt-3 bg-white border border-gray-300 rounded p-3">
                                        <p className="font-semibold text-gray-800 mb-2">📊 1食ごとのGL評価（血糖スパイク管理）</p>
                                        <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                            <li><strong>低GL（≤10）</strong>：血糖値が緩やかに上昇 → 優秀</li>
                                            <li><strong>中GL（11-19）</strong>：適度な上昇 → 良好</li>
                                            <li><strong>高GL（≥20）</strong>：急激に上昇 → 分割推奨</li>
                                        </ul>
                                        <p className="text-xs text-orange-600 mt-2 font-medium">
                                            ⚡ 運動後の食事は高GLが推奨されます（筋グリコーゲン補充）
                                        </p>
                                    </div>

                                    <div className="mt-3 bg-white border border-gray-300 rounded p-3">
                                        <p className="font-semibold text-gray-800 mb-2">📈 1日合計GL評価（総負荷管理）</p>
                                        <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                            <li><strong>優秀（&lt;80）</strong>：理想的な血糖管理</li>
                                            <li><strong>良好（80-100）</strong>：目標範囲内</li>
                                            <li><strong>普通（101-120）</strong>：許容範囲</li>
                                            <li><strong>要改善（121+）</strong>：改善が必要</li>
                                        </ul>
                                        <p className="text-xs text-blue-600 mt-2 font-medium">
                                            🎯 目標: 100以下
                                        </p>
                                    </div>

                                    <p className="font-medium mt-3">補正の仕組み</p>
                                    <p className="text-xs">PFC・食物繊維を一緒に摂取すると、血糖値の上昇が緩やかになります。各食事ごとに補正が適用されます。</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                        <li><strong>タンパク質</strong>：0g→0% / 10g→5% / 20g以上→最大10%</li>
                                        <li><strong>脂質</strong>：0g→0% / 5g→5% / 10g以上→最大10%</li>
                                        <li><strong>食物繊維</strong>：0g→0% / 2.5g→7.5% / 5g以上→最大15%</li>
                                    </ul>
                                    <p className="text-xs text-gray-600 mt-1">※補正は段階的に適用されます（例：タンパク質15gの場合は-7.5%補正）</p>
                                    <p className="text-xs text-gray-600 mt-1">※表示されるGL値はすべて補正後の値です</p>
                                    <p className="font-medium mt-3">GI値内訳とは？</p>
                                    <p>GI値60以上と60未満の炭水化物の摂取割合を示します。</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                                        <li><strong>GI 60未満</strong>：血糖値が緩やかに上昇</li>
                                        <li><strong>GI 60以上</strong>：血糖値が急激に上昇</li>
                                    </ul>
                                    <p className="text-xs text-gray-600 mt-1">※60を境界に「低GI食品」と「高GI食品」を分類</p>

                                    <div className="mt-3 bg-orange-50 border border-orange-300 rounded p-3">
                                        <p className="font-semibold text-orange-800 mb-2 flex items-center gap-1">
                                            <Icon name="AlertCircle" size={16} />
                                            重要：調理法でGI値は大きく変動します
                                        </p>
                                        <div className="text-xs text-gray-700 space-y-2">
                                            <p><strong>加熱で上昇：</strong> デンプンが「糊化（α化）」し、消化吸収が速くなります。</p>
                                            <ul className="list-disc list-inside ml-2 space-y-1">
                                                <li>白米（炊きたて）：GI 88 → 高GI</li>
                                                <li>ジャガイモ（焼き）：GI 93 → 高GI</li>
                                                <li>パスタ（よく茹でる）：GI 60台 → 中GI</li>
                                            </ul>
                                            <p className="mt-2"><strong>冷却で低下：</strong> 「レジスタントスターチ（難消化性でんぷん）」が増加し、消化が緩やかになります。</p>
                                            <ul className="list-disc list-inside ml-2 space-y-1">
                                                <li>白米（冷やご飯・おにぎり）：GI 70台 → 中GI</li>
                                                <li>ジャガイモ（ポテトサラダ）：GI 50-60台 → 低~中GI</li>
                                                <li>パスタ（アルデンテ）：GI 40-50台 → 低GI</li>
                                            </ul>
                                            <p className="mt-2"><strong>再加熱後も維持：</strong> 一度冷ましてレンジで温め直しても、レジスタントスターチは残り、GI値は炊きたてより低いままです。</p>
                                            <p className="mt-2 text-orange-700 font-medium">※アプリのGI値は基本的な調理法（白米=炊飯後、パスタ=茹で、など）を前提としています。</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 bg-blue-50 border border-blue-300 rounded p-3">
                                        <p className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                            <Icon name="Clock" size={16} />
                                            最適な摂取タイミング
                                        </p>
                                        <div className="text-xs text-gray-700 space-y-2">
                                            <p><strong>⚡ 運動直後（30分以内）：</strong> 高GI食品＋高DIASS食品で素早くエネルギー補給と筋肉回復。（例：白米＋卵、果物＋プロテイン）</p>
                                            <p><strong>🏃 運動前（1-2時間前）：</strong> 低GI食品でエネルギーを持続的に供給。高GI食品は避ける（低血糖リスク）。</p>
                                            <p><strong>🍽️ 日常の食事：</strong> 低GI食品＋高DIASS食品で血糖値を安定させ、眠気・倦怠感・体脂肪蓄積を防止。（例：玄米＋鶏肉、全粒粉パン＋卵）</p>
                                            <p><strong>💤 就寝前：</strong> 低GI食品を選び、血糖値スパイクを避ける。睡眠の質向上につながります。</p>
                                            <p className="mt-2 text-blue-700 font-medium">💡 ベストな組み合わせ： 運動後は高GI＋高DIASS、日常は低GI＋高DIASSが基本です。</p>
                                        </div>
                                    </div>

                                    <p className="mt-3 bg-white p-2 rounded border-l-4 border-green-400 text-xs">
                                        <strong>目指すべき目標：</strong> 1日合計GL値100以下（理想80以下）、1食あたりGL値20以下、低GI食品60%以上を目指しましょう。白米より玄米、うどんより蕎麦、温かいご飯より冷やご飯がおすすめです。
                                    </p>
                                </div>
                            </div>

                            {/* 脂肪酸 */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Droplets" size={18} className="text-yellow-600" />
                                    <h4 className="font-bold text-yellow-800">脂肪酸バランス</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="font-medium">脂肪酸の種類と役割</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>飽和脂肪酸</strong>：バター、肉の脂など。摂りすぎに注意</li>
                                        <li><strong>中鎖脂肪酸（MCT）</strong>：ココナッツオイル、MCTオイルなど。素早くエネルギーになる</li>
                                        <li><strong>一価不飽和脂肪酸</strong>：オリーブオイル、アボカドなど。心臓に優しい</li>
                                        <li><strong>多価不飽和脂肪酸</strong>：魚油、ナッツなど。DHA・EPAを含む</li>
                                    </ul>
                                    <p className="font-medium mt-3">理想的なバランスと評価基準</p>
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>優秀</strong>：飽和25-35%、中鎖0-10%、一価35-45%、多価20-30%</li>
                                        <li><strong>良好</strong>：飽和20-40%、一価30-50%の範囲</li>
                                        <li><strong>要改善</strong>：飽和40%以上または一価30%未満</li>
                                    </ul>
                                    <div className="mt-3 bg-cyan-50 border border-cyan-300 rounded p-2">
                                        <p className="text-xs text-cyan-900 font-medium mb-1">💡 中鎖脂肪酸（MCT）の特徴</p>
                                        <p className="text-xs text-gray-700">長鎖脂肪酸より消化吸収が速く、すぐにエネルギーとして利用されます。運動前の摂取やケトジェニックダイエットに効果的です。</p>
                                    </div>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-yellow-400">
                                        <strong>目指すべき目標：</strong> 理想バランスは飽和3:中鎖0.5:一価4:多価2.5です。魚・ナッツ・オリーブオイル・MCTオイルを組み合わせ、バランスの良い脂質摂取を心がけましょう。
                                    </p>
                                </div>
                            </div>

                            {/* 糖質・食物繊維 */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Cookie" size={18} className="text-amber-600" />
                                    <h4 className="font-bold text-amber-800">糖質・食物繊維</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <ul className="list-disc list-inside ml-2 space-y-1">
                                        <li><strong>糖質</strong>：エネルギー源。炭水化物から食物繊維を除いたもの</li>
                                        <li><strong>食物繊維</strong>：腸内環境改善、血糖値上昇抑制</li>
                                        <li><strong>水溶性食物繊維</strong>：血糖値・コレステロール低下（海藻、果物など）</li>
                                        <li><strong>不溶性食物繊維</strong>：便通改善（野菜、穀類など）</li>
                                    </ul>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-amber-400">
                                        <strong>目指すべき目標：</strong> 食物繊維20g/日以上（水溶性7g、不溶性13g）を目指しましょう。野菜・きのこ・海藻・果物を毎食摂取。
                                    </p>
                                </div>
                            </div>

                            {/* ビタミン・ミネラル */}
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Sparkles" size={18} className="text-purple-600" />
                                    <h4 className="font-bold text-purple-800">ビタミン・ミネラル</h4>
                                </div>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p>体の調子を整える微量栄養素です。目標値に対する達成率をプログレスバーで表示しています。</p>
                                    <p className="mt-2 bg-white p-2 rounded border-l-4 border-purple-400">
                                        <strong>目指すべき目標：</strong> 全項目80%以上を目指しましょう。色とりどりの野菜・果物・魚・ナッツをバランスよく摂取。
                                    </p>
                                </div>
                            </div>

                            {/* 閉じるボタン */}
                            <button
                                onClick={() => setShowDetailedNutrientsGuide(false)}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
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
                    <div className="bg-white rounded-xl w-full max-w-[95vw] sm:max-w-md shadow-xl">
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
                                        <p className="text-center text-xs text-gray-600">
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
                                        className="w-1/3 bg-gray-200 text-gray-600 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
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
                    <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md shadow-2xl overflow-hidden animate-slide-up">
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
                            <h2 className="text-2xl font-bold mb-2 text-gray-800 relative z-10">🎉 初回分析完了！</h2>
                            <p className="text-sm opacity-90 text-gray-600 relative z-10">AIがあなた専用の分析レポートを作成しました</p>
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
                                            <span className="text-sm text-gray-600">{feature.text}</span>
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
                                    toast('サブスクリプション画面は準備中です');
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
                    <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md overflow-hidden shadow-2xl animate-bounce-in">
                        {/* ヘッダー */}
                        <div className="bg-[#FFF59A] p-6 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                            <div className="relative z-10">
                                <Icon name="Trophy" size={48} className="text-yellow-600 mx-auto mb-3" />
                                <h2 className="text-2xl font-bold text-gray-800 mb-1">レベルアップ！</h2>
                                <p className="text-gray-600 text-sm">おめでとうございます</p>
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
                                    <span className="text-sm font-semibold text-gray-600">獲得クレジット</span>
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
                                        <span className="text-sm font-bold text-gray-600">マイルストーン達成！</span>
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
                    <div className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                                                        isSelected ? 'bg-[#4A9EFF] text-white shadow-md' : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                        {guide.level}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-gray-800">{guide.title}</span>
                                                            <span className="text-sm text-gray-600">({guide.range})</span>
                                                        </div>
                                                        <ul className="text-sm text-gray-600 space-y-1">
                                                            {guide.features.map((feature, idx) => (
                                                                <li key={idx}>• {feature}</li>
                                                            ))}
                                                        </ul>
                                                        <p className="text-xs text-gray-600 mt-2">健康: {guide.health}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-orange-50 to-pink-50 p-4 rounded-lg border border-orange-200">
                                <p className="text-sm font-medium text-gray-600 mb-2">推定結果</p>
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
            toast('指示内容を入力してください');
            return;
        }
        onSave({ ...directive, message: editedMessage.trim(), type: editedType });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-md shadow-2xl">
                {/* ヘッダー */}
                <div className="p-4 border-b-2 border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">
                        指示書を編集
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <Icon name="X" size={24} />
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="p-6 space-y-4">
                    {/* カテゴリー選択 */}
                    <div>
                        <label className="text-sm font-bold text-gray-600 block mb-2">カテゴリー</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {['meal', 'exercise', 'condition'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setEditedType(type)}
                                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition border-2 ${
                                        editedType === type
                                            ? `${getCategoryColor(type).bg} ${getCategoryColor(type).border} ${getCategoryColor(type).text}`
                                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
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
                        <label className="text-sm font-bold text-gray-600 block mb-2">指示内容</label>
                        <textarea
                            value={editedMessage}
                            onChange={(e) => setEditedMessage(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm"
                            rows="3"
                            placeholder="例: 鶏むね肉150g追加"
                        />
                    </div>
                </div>

                {/* アクションボタン */}
                <div className="p-4 border-t-2 border-gray-200 flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-[#4A9EFF] text-white font-semibold py-3 px-6 rounded-lg hover:bg-[#3b8fef] transition flex items-center justify-center gap-2"
                    >
                        <Icon name="Save" size={18} />
                        保存
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white border-2 border-gray-300 text-gray-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition"
                    >
                        キャンセル
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

