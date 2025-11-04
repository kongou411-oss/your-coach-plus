// ===== Analysis Components =====
const AnalysisView = ({ onClose, userId, userProfile, dailyRecord, targetPFC, setLastUpdate, onUpgradeClick, onFeatureUnlocked }) => {
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [historicalInsights, setHistoricalInsights] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [suggestedDirective, setSuggestedDirective] = useState(null);
    const [microLearningContent, setMicroLearningContent] = useState(null);
    const [showCollaborativePlanning, setShowCollaborativePlanning] = useState(false);
    const [userQuestion, setUserQuestion] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [qaLoading, setQaLoading] = useState(false);
    const chatEndRef = useRef(null);

    // クレジット関連state
    const [creditInfo, setCreditInfo] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showCreditInfoModal, setShowCreditInfoModal] = useState(false);
    const [isFirstAnalysis, setIsFirstAnalysis] = useState(false);

    // BAB連動state
    const [babHeight, setBabHeight] = useState(64); // 初期値: 格納時の高さ
    const [showHelpModal, setShowHelpModal] = useState(false);

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    useEffect(() => {
        performAnalysis();
    }, []);

    // BABの高さを監視して入力欄の位置を動的に調整
    useEffect(() => {
        const updateBabHeight = () => {
            const babElement = document.querySelector('.fixed.bottom-0.z-\\[9999\\]');
            if (babElement) {
                const height = babElement.offsetHeight;
                setBabHeight(height);
            }
        };

        // 初回計測
        updateBabHeight();

        // ResizeObserverでBABの高さ変化を監視
        const babElement = document.querySelector('.fixed.bottom-0.z-\\[9999\\]');
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

    // 新機能開放モーダル完了後、Premium誘導モーダルを表示
    useEffect(() => {
        const checkUpgradeModalFlag = () => {
            const featureUnlockCompleted = localStorage.getItem('featureUnlockModalsCompleted');
            const upgradeModalPending = localStorage.getItem('showUpgradeModalPending');

            if (featureUnlockCompleted === 'true' && upgradeModalPending === 'true') {
                console.log('[Analysis] Feature unlock completed. Showing upgrade modal...');
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

    const handleClose = () => {
        if (aiLoading) {
            alert('AI分析が完了するまでお待ちください。');
            return;
        }
        onClose();
    };

    // スコア計算関数
    const calculateScores = (profile, record, target) => {
        // スタイル判定（一般 or ボディメイカー系）
        const bodymakerStyles = ['筋肥大', '筋力', '持久力', 'バランス'];
        const isBodymaker = bodymakerStyles.includes(profile.style);

        // 食事データ
        const totalCalories = (record.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
        const totalFat = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
        const totalCarbs = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);

        // 食事スコア計算
        const proteinRate = Math.min(100, target.protein > 0 ? (totalProtein / target.protein) * 100 : 0);
        const fatRate = Math.min(100, target.fat > 0 ? (totalFat / target.fat) * 100 : 0);
        const carbsRate = Math.min(100, target.carbs > 0 ? (totalCarbs / target.carbs) * 100 : 0);
        const pfcBalance = (proteinRate + fatRate + carbsRate) / 3;

        const calorieDeviation = Math.abs(totalCalories - target.calories) / target.calories;
        const calorieScore = Math.max(0, 100 - calorieDeviation * 100);

        const foodScore = Math.round(pfcBalance * 0.7 + calorieScore * 0.3);

        // 運動データ
        const workouts = record.workouts || [];
        const totalDuration = workouts.reduce((sum, w) => {
            return sum + (w.sets || []).reduce((s, set) => s + (set.duration || 0), 0);
        }, 0);
        // 全ての運動記録の中の種目数を合計（2部練習などで分けた場合も正しく計算）
        const exerciseCount = workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0);

        // 休養日判定（ルーティンで明示的に設定されている場合）
        const isRestDay = record.routine?.is_rest_day === true;

        // 運動スコア計算（ボディメイカー/一般で基準が異なる）
        let durationScore = 0;
        let exerciseCountScore = 0;

        // 休養日の場合は運動スコアを100点として扱う（計画的な休養）
        if (isRestDay) {
            durationScore = 100;
            exerciseCountScore = 100;
        } else if (isBodymaker) {
            // ボディメイカー基準
            if (totalDuration === 0) durationScore = 0;
            else if (totalDuration >= 120) durationScore = 100; // 2時間以上
            else if (totalDuration >= 90) durationScore = 75;   // 1.5時間以上
            else if (totalDuration >= 60) durationScore = 50;   // 1時間以上
            else if (totalDuration >= 30) durationScore = 25;   // 30分以上
            else durationScore = 0;

            if (exerciseCount === 0) exerciseCountScore = 0;
            else if (exerciseCount >= 5) exerciseCountScore = 100;
            else if (exerciseCount === 4) exerciseCountScore = 80;
            else if (exerciseCount === 3) exerciseCountScore = 60;
            else if (exerciseCount === 2) exerciseCountScore = 40;
            else if (exerciseCount === 1) exerciseCountScore = 20;
        } else {
            // 一般基準
            if (totalDuration === 0) durationScore = 0;
            else if (totalDuration >= 60) durationScore = 100;  // 1時間以上
            else if (totalDuration >= 45) durationScore = 75;   // 45分以上
            else if (totalDuration >= 30) durationScore = 50;   // 30分以上
            else if (totalDuration >= 15) durationScore = 25;   // 15分以上
            else durationScore = 0;

            if (exerciseCount === 0) exerciseCountScore = 0;
            else if (exerciseCount >= 3) exerciseCountScore = 100;
            else if (exerciseCount === 2) exerciseCountScore = 66;
            else if (exerciseCount === 1) exerciseCountScore = 33;
        }

        const exerciseScore = Math.round((durationScore + exerciseCountScore) / 2);

        // コンディションデータ（全項目1-5の値として扱う）
        const sleepHours = record.conditions?.sleepHours || 0;
        const sleepQuality = record.conditions?.sleepQuality || 0;
        const appetite = record.conditions?.appetite || 0;
        const digestion = record.conditions?.digestion || 0;
        const focus = record.conditions?.focus || 0;
        const stress = record.conditions?.stress || 0;

        // コンディションスコア計算（6項目すべてが5なら100点）
        // 各項目1-5点 → 平均 → 20倍して100点満点に
        const conditionScore = Math.round(
            ((sleepHours + sleepQuality + appetite + digestion + focus + stress) / 6) * 20
        );

        return {
            food: {
                score: foodScore,
                protein: Math.round(proteinRate),
                fat: Math.round(fatRate),
                carbs: Math.round(carbsRate),
                calories: Math.round(calorieScore)
            },
            exercise: {
                score: exerciseScore,
                duration: Math.round(durationScore),
                exerciseCount: Math.round(exerciseCountScore),
                totalMinutes: totalDuration,
                count: exerciseCount
            },
            condition: {
                score: conditionScore,
                sleep: Math.round((sleepHours / 5) * 100),
                quality: Math.round((sleepQuality / 5) * 100),
                appetite: Math.round((appetite / 5) * 100),
                digestion: Math.round((digestion / 5) * 100),
                focus: Math.round((focus / 5) * 100),
                stress: Math.round((stress / 5) * 100)
            }
        };
    };

    const performAnalysis = async () => {
        setLoading(true);

        // クレジットチェック（新システム） - 最優先で実行
        try {
            const expInfo = await ExperienceService.getUserExperience(userId);
            const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_MODE;

            setCreditInfo({
                tier: isPremium ? 'premium' : 'free',
                totalCredits: expInfo.totalCredits,
                freeCredits: expInfo.freeCredits,
                paidCredits: expInfo.paidCredits,
                remainingCredits: expInfo.totalCredits,
                devMode: DEV_MODE,
                allowed: expInfo.totalCredits > 0
            });

            if (expInfo.totalCredits <= 0) {
                setLoading(false);
                alert('分析クレジットが不足しています。レベルアップでクレジットを獲得してください。');
                onClose();
                return; // ここで関数全体を終了
            }
        } catch (error) {
            console.error('[Analysis] Credit error:', error);
            setLoading(false);
            alert('クレジット確認中にエラーが発生しました');
            onClose();
            return; // ここで関数全体を終了
        }

        // 初回分析判定: analysisが完了済みかチェック
        const isAnalysisCompleted = isFeatureCompleted(userId, 'analysis');
        const firstAnalysisFlag = !isAnalysisCompleted; // analysis未完了なら初回
        setIsFirstAnalysis(firstAnalysisFlag);

        // スコア計算（AI呼び出し前に実行）
        const scores = calculateScores(userProfile, dailyRecord, targetPFC);

        const totalCalories = (dailyRecord.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalProtein = (dailyRecord.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
        const totalFat = (dailyRecord.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
        const totalCarbs = (dailyRecord.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);

        const proteinRate = targetPFC.protein > 0 ? Math.round((totalProtein / targetPFC.protein) * 100) : 0;
        const fatRate = targetPFC.fat > 0 ? Math.round((totalFat / targetPFC.fat) * 100) : 0;
        const carbsRate = targetPFC.carbs > 0 ? Math.round((totalCarbs / targetPFC.carbs) * 100) : 0;
        const caloriesRate = targetPFC.calories > 0 ? Math.round((totalCalories / targetPFC.calories) * 100) : 0;
        const overallRate = Math.round((proteinRate + fatRate + carbsRate + caloriesRate) / 4);

        let evaluation = 'poor';
        if (overallRate >= 95 && overallRate <= 105) evaluation = 'excellent';
        else if (overallRate >= 85 && overallRate <= 115) evaluation = 'good';
        else if (overallRate >= 70 && overallRate <= 130) evaluation = 'moderate';

        const historicalData = [];
        for (let i = 1; i <= 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const record = await DataService.getDailyRecord(userId, dateStr);
            if (record) historicalData.push({ date: dateStr, record: record });
        }

        const insights = analyzeHistoricalTrends(historicalData, dailyRecord, userProfile);

        const analysisData = {
            actual: { calories: Math.round(totalCalories), protein: Math.round(totalProtein), fat: Math.round(totalFat), carbs: Math.round(totalCarbs) },
            target: targetPFC,
            achievementRates: { calories: caloriesRate, protein: proteinRate, fat: fatRate, carbs: carbsRate, overall: overallRate },
            evaluation: evaluation
        };

        setAnalysis(analysisData);

        const today = getTodayDate();
        const analyses = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ANALYSES) || '{}');
        analyses[today] = { ...(analyses[today] || {}), ...analysisData };
        localStorage.setItem(STORAGE_KEYS.DAILY_ANALYSES, JSON.stringify(analyses));

        setHistoricalInsights(insights);
        setLoading(false);

        // マイクロラーニングトリガー
        const microLearningTriggered = triggerMicroLearning({
            dailyRecord,
            analysis: analysisData,
            userProfile
        });
        if (microLearningTriggered) {
            setMicroLearningContent(microLearningTriggered);
        }

        // AI分析を実行（初回フラグとスコアを渡す）
        generateAIAnalysis(analysisData, insights, firstAnalysisFlag, scores);
    };

    const generateAIDirective = (currentAnalysis, aiText) => {
        // タンパク質不足（最優先）
        if (currentAnalysis.achievementRates.protein < 90) {
            const diff = Math.ceil(targetPFC.protein - currentAnalysis.actual.protein);
            const grams = Math.ceil(diff / 0.23);
            return { type: 'meal', text: `鶏むね肉${grams}g追加` };
        }
        // 炭水化物過剰
        else if (currentAnalysis.achievementRates.carbs > 120) {
            const diff = Math.ceil(currentAnalysis.actual.carbs - targetPFC.carbs);
            const grams = Math.ceil(diff / 0.37);
            return { type: 'meal', text: `白米${grams}g減らす` };
        }
        // 脂質不足
        else if (currentAnalysis.achievementRates.fat < 80) {
            const diff = Math.ceil(targetPFC.fat - currentAnalysis.actual.fat);
            const grams = Math.ceil(diff * 11.1); // ナッツ1gあたり約0.09gの脂質
            return { type: 'meal', text: `ナッツ${grams}g追加` };
        }
        // トレーニング未実施
        else if (dailyRecord.workouts.length === 0 && userProfile.goal !== 'メンテナンス') {
            return { type: 'exercise', text: `30分の散歩を実施` };
        }
        // カロリー不足
        else if (currentAnalysis.achievementRates.calories < 85) {
            return { type: 'meal', text: `間食でカロリー補充` };
        }
        // 完璧
        return { type: 'condition', text: `今日の習慣を継続` };
    };

    const saveDirective = () => {
        if (!suggestedDirective) return;
        const today = getTodayDate();
        const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
        const directives = savedDirectives ? JSON.parse(savedDirectives) : [];
        const newDirective = {
            date: today,
            message: suggestedDirective.text,
            type: suggestedDirective.type,
            completed: false,
            createdAt: new Date().toISOString()
        };
        const updatedDirectives = directives.filter(d => d.date !== today);
        updatedDirectives.push(newDirective);
        localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(updatedDirectives));
        setLastUpdate(Date.now()); // Appを再レンダリングさせる
        alert('指示書をダッシュボードに反映しました。');
        onClose();
    };

    // AI分析生成
    const generateAIAnalysis = async (currentAnalysis, insights, isFirstAnalysisParam = false, scores = null) => {
        setAiLoading(true);

        // 既存のAI分析をクリア
        setAiAnalysis(null);

        // 当日のデータのみを準備（デイリー分析用）
        const today = getTodayDate();
        const todayRecord = dailyRecord; // 既に取得済みの当日データを使用

        // 当日のPFC計算
        const totalProtein = (todayRecord.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
        const totalFat = (todayRecord.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
        const totalCarbs = (todayRecord.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);
        const totalCalories = (todayRecord.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);

        // 当日データのみを構造化
        const todayData = {
            date: today,
            routine: todayRecord.routine || { type: "休息日", is_rest_day: true },
            diet: {
                protein_g: Math.round(totalProtein),
                fat_g: Math.round(totalFat),
                carbs_g: Math.round(totalCarbs),
                total_calories: Math.round(totalCalories)
            },
            workout: {
                exercise_count: (todayRecord.workouts || []).length,
                exercises: (todayRecord.workouts || []).map(w => w.name).slice(0, 5).join(', ') // 最大5種目
            },
            condition: {
                sleep_hours: todayRecord.conditions?.sleepHours || 0,
                sleep_quality: todayRecord.conditions?.sleepQuality || 0,
                appetite: todayRecord.conditions?.appetite || 0,
                gut_health: todayRecord.conditions?.digestion || 0,
                concentration: todayRecord.conditions?.focus || 0,
                stress_level: todayRecord.conditions?.stress || 0
            },
            memo: todayRecord.notes || null
        };

        // 理想の睡眠時間を実時間に変換
        const idealSleepHoursMap = { 1: 5, 2: 6, 3: 7, 4: 8, 5: 9 };
        const idealSleepHours = idealSleepHoursMap[userProfile.idealSleepHours] || 8;

        // 実際の睡眠時間を実時間に変換（推定）
        const actualSleepHoursMap = { 1: 5, 2: 6, 3: 7, 4: 8, 5: 9 };
        const actualSleepHours = actualSleepHoursMap[todayRecord.conditions?.sleepHours] || 0;

        const promptData = {
            user_profile: {
                height_cm: userProfile.height || 170,
                weight_kg: userProfile.weight || 70,
                body_fat_percentage: userProfile.bodyFatPercentage || 15,
                lean_body_mass_kg: userProfile.leanBodyMass || 60,
                ideal_sleep_hours: idealSleepHours,
                style: userProfile.style || "一般"
            },
            today: todayData
        };

        // 文字数制限チェック（6,000文字以内）
        const promptDataStr = JSON.stringify(promptData, null, 2);
        const charCount = promptDataStr.length;

        if (charCount > 6000) {
            // 運動名を省略
            todayData.workout.exercises = (todayRecord.workouts || []).map(w => w.name).slice(0, 3).join(', ');
            // メモを省略
            todayData.memo = null;
        }

        // 目的別の評価基準を定義
        const purposeGuidelines = {
            '増量': {
                calorieCriteria: totalCalories >= targetPFC.calories ? '達成' : '不足',
                proteinCriteria: totalProtein >= targetPFC.protein * 0.9 ? '達成' : '不足',
                focus: 'オーバーカロリー + 高タンパク + 運動実施'
            },
            '減量': {
                calorieCriteria: totalCalories <= targetPFC.calories ? '達成' : '超過',
                proteinCriteria: totalProtein >= targetPFC.protein * 0.9 ? '達成' : '不足',
                focus: 'アンダーカロリー + タンパク質維持 + 運動実施'
            },
            'メンテナンス': {
                calorieCriteria: Math.abs(totalCalories - targetPFC.calories) <= targetPFC.calories * 0.1 ? '達成' : '乖離',
                proteinCriteria: totalProtein >= targetPFC.protein * 0.9 ? '達成' : '不足',
                focus: 'カロリー均衡 + PFCバランス + 運動・睡眠維持'
            }
        };

        const currentPurpose = userProfile.purpose || 'メンテナンス';
        const guidelines = purposeGuidelines[currentPurpose] || purposeGuidelines['メンテナンス'];

        // スタイル別の評価指針
        const userStyle = userProfile.style || '一般';
        const styleGuidelines = {
            '一般': '健康維持・日常フィットネスを重視',
            '筋肥大': '高重量・高ボリューム・筋肥大種目（ベンチプレス、スクワット、デッドリフト等）を重視',
            '筋力': '最大筋力・パワー向上・低レップ高重量を重視',
            '持久力': '有酸素運動・持久系種目・軽重量高レップを重視',
            'バランス': '全面的な身体能力向上・多様な種目を重視'
        };
        const styleFocus = styleGuidelines[userStyle] || styleGuidelines['一般'];

        // 理想の体型目標
        const idealWeight = userProfile.idealWeight || userProfile.weight;
        const idealLBM = userProfile.idealLBM || LBMUtils.calculateLBM(userProfile.weight, userProfile.bodyFatPercentage);
        const currentLBM = LBMUtils.calculateLBM(userProfile.weight, userProfile.bodyFatPercentage);
        const lbmGap = idealLBM - currentLBM;

        // セクション1: パフォーマンスレポート
        const section1Prompt = `## 役割

トップアスリート指導のエリートパーソナルコーチとして、ユーザーの目的とトレーニングスタイルに最適化された簡潔で実践的なフィードバックを提供します。

## 評価の基本原則

**最重要**: ユーザーの目的（${currentPurpose}）とスタイル（${userStyle}）の達成に必要な「食事・運動・睡眠」の3要素が満たされているかを評価してください。

**目的: ${currentPurpose}**
- 重点: ${guidelines.focus}
- カロリー: ${guidelines.calorieCriteria}
- タンパク質: ${guidelines.proteinCriteria}

**スタイル: ${userStyle}**
- 評価指針: ${styleFocus}

**理想の体型目標**
- 理想の体重: ${idealWeight.toFixed(1)}kg（現在: ${userProfile.weight}kg、差: ${(idealWeight - userProfile.weight).toFixed(1)}kg）
- 理想のLBM: ${idealLBM.toFixed(1)}kg（現在: ${currentLBM.toFixed(1)}kg、差: ${lbmGap.toFixed(1)}kg）

**注意**: LBM（除脂肪体重）は結果指標です。食事・運動・睡眠の反復で自然に変化するものであり、評価基準ではありません。

## 本日のデータ

### 栄養
- タンパク質: ${Math.round(totalProtein)}g / 目標: ${Math.round(targetPFC.protein)}g (${Math.round((totalProtein/targetPFC.protein)*100)}%)
- 脂質: ${Math.round(totalFat)}g / 目標: ${Math.round(targetPFC.fat)}g (${Math.round((totalFat/targetPFC.fat)*100)}%)
- 炭水化物: ${Math.round(totalCarbs)}g / 目標: ${Math.round(targetPFC.carbs)}g (${Math.round((totalCarbs/targetPFC.carbs)*100)}%)
- カロリー: ${Math.round(totalCalories)}kcal / 目標: ${Math.round(targetPFC.calories)}kcal

### 運動
- ルーティン: ${todayRecord.routine?.is_rest_day ? '休養日（計画的な休息）' : (todayRecord.routine?.type || 'なし')}
- 実施種目: ${(todayRecord.workouts || []).length}種目

### コンディション
- 睡眠時間: ${todayRecord.conditions?.sleepHours || 0}/5
- 睡眠の質: ${todayRecord.conditions?.sleepQuality || 0}/5
- 食欲: ${todayRecord.conditions?.appetite || 0}/5
- 腸内環境: ${todayRecord.conditions?.digestion || 0}/5
- 集中力: ${todayRecord.conditions?.focus || 0}/5
- ストレス: ${todayRecord.conditions?.stress || 0}/5

## 計算済みスコア（事前計算済み、そのまま使用）

- 食事スコア: ${scores ? scores.food.score : 0}/100
- 運動スコア: ${scores ? scores.exercise.score : 0}/100
- コンディションスコア: ${scores ? scores.condition.score : 0}/100

## 出力形式（厳守）

本日もお疲れ様でした！

**本日の目標**
- 目的: ${currentPurpose}
- タンパク質: ${Math.round(targetPFC.protein)}g
- 脂質: ${Math.round(targetPFC.fat)}g
- 炭水化物: ${Math.round(targetPFC.carbs)}g
- カロリー: ${Math.round(targetPFC.calories)}kcal
- 睡眠: ${idealSleepHours}時間

---

① 結論

**食事（スコア: ${scores ? scores.food.score : 0}/100）**
[評価コメント1文]

**運動（スコア: ${scores ? scores.exercise.score : 0}/100）**
[評価コメント1文]

**コンディション（スコア: ${scores ? scores.condition.score : 0}/100）**
[評価コメント1文]

---

② 根拠

[上記3項目の評価理由を2-3文で簡潔に説明。データを根拠に示す]

ルール:
- 冒頭は必ず「本日もお疲れ様でした！」から開始
- スコアは計算済みの値をそのまま表示（計算不要）
- 食事・運動・コンディションの3項目を必ず評価
- 数値必須（g、kg、回数、時間）
- 各項目1文で完結
- 「良い」「悪い」等の抽象表現禁止
- 食材名・運動種目名を具体的に記載
- LBMの言及は不要（結果指標のため）
- **重要**: 必ず「本日」「今日」のみ使用し、「昨日」は絶対に使わない（このレポートは本日の分析です）
- **書式統一**: リスト表記は必ず「-」を使用（他の記号は使わない）
- **参考文献禁止**: 参考文献、注釈、アスタリスク（*）による補足説明は一切記載しない
- **太字**: **太字**は継続使用可能（見出しや強調のため）
`;

        // セクション2: 指示書プラン生成
        const section2Prompt = `## タスク

ユーザーの目的（${currentPurpose}）達成のために、本日の達成率から最優先の改善点1つを特定し、明日の指示書を生成してください。

## ユーザーの目的と評価基準

**目的: ${currentPurpose}**
- 重点: ${guidelines.focus}
- 食事・運動・睡眠の3要素を満たすことが最優先です
- LBMは結果指標であり、評価基準ではありません

## 本日の達成率

- タンパク質: ${Math.round((totalProtein/targetPFC.protein)*100)}%
- 脂質: ${Math.round((totalFat/targetPFC.fat)*100)}%
- 炭水化物: ${Math.round((totalCarbs/targetPFC.carbs)*100)}%
- カロリー: ${Math.round(totalCalories)}kcal / 目標: ${Math.round(targetPFC.calories)}kcal
- 睡眠時間: ${todayRecord.conditions?.sleepHours || 0}/5
- 睡眠の質: ${todayRecord.conditions?.sleepQuality || 0}/5
- ルーティン: ${todayRecord.routine?.is_rest_day ? '休養日（計画的な休息）' : (todayRecord.routine?.type || 'なし')}
- 運動: ${(todayRecord.workouts || []).length}種目

${dailyRecord.notes ? `
ユーザーの気づき: 「${dailyRecord.notes}」
` : ''}

## 重要な判定基準

**運動の評価:**
- ルーティンで「休養日」が設定されている場合 → 計画的な休息として評価（問題なし）
- ルーティン未設定かつ運動記録なし → 「運動未実施」として改善対象

## 目的別の優先順位

${currentPurpose === '増量' ? `
**増量の優先順位:**
1. カロリー不足 → 食材+量を指定してオーバーカロリーを達成
2. タンパク質<90% → 食材+量を指定
3. 運動未実施（※休養日を除く） → 種目+重量+回数を指定（筋肥大のため）
4. 睡眠<85%または睡眠の質≤3 → 改善策を指定（回復のため）
` : currentPurpose === '減量' ? `
**減量の優先順位:**
1. カロリー超過 → 食材の見直しでアンダーカロリーを達成
2. タンパク質<90% → 食材+量を指定（筋肉維持のため）
3. 運動未実施（※休養日を除く） → 種目+重量+回数を指定（代謝維持のため）
4. 睡眠<85%または睡眠の質≤3 → 改善策を指定（回復のため）
` : `
**メンテナンスの優先順位:**
1. カロリー乖離>10% → 食材の調整でカロリー均衡を達成
2. タンパク質<90% → 食材+量を指定
3. 運動未実施（※休養日を除く） → 種目+重量+回数を指定
4. 睡眠<85%または睡眠の質≤3 → 改善策を指定
`}

## 出力形式（厳守）

---

③ 明日の指示書

**結論**
【カテゴリー】具体的な内容（食材名/運動種目名 + 数値）

**根拠**
[上記指示書の理由を1-2文で簡潔に説明。${currentPurpose}の目的達成のために必要な理由を記載]

例:
**結論**
【睡眠】22時30分就寝で8時間確保

**根拠**
本日の睡眠時間は6時間で理想8時間に対して75%でした。${currentPurpose}のために筋肉回復を最大化する必要があり、明日は8時間睡眠を確保してください。

ルール:
- 必ず「---」の区切り線の後に「③ 明日の指示書」見出しを表示
- ${currentPurpose}の目的達成に最も重要な改善点を1つ選択
- 結論と根拠の両方を記載
- 【カテゴリー】必須
- 数値必須（g、kg、回数、時間）
- 結論は1行完結
- LBMの言及は不要（結果指標のため）
- **重要**: 「本日」のデータを基に「明日」の指示を出す（「昨日」は絶対に使わない）
- **書式統一**: リスト表記は必ず「-」を使用（他の記号は使わない）
- **参考文献禁止**: 参考文献、注釈、アスタリスク（*）による補足説明は一切記載しない
- **太字**: **太字**は継続使用可能（見出しや強調のため）
- **PGBASE提案（任意）**: もし役立つと思われる場合のみ、控えめに「詳しく知りたい方はPGBASEもご覧ください」程度の提案を1文で追加可能（押しつけ禁止）
- **レポートの最後**: 指示書の後に区切り線「---」を入れ、最後の1行に「ナイストライ！」と表示する（応援メッセージはこの1行のみ）
`;

        try {
            // AI分析開始前にクレジット消費（1回のみ）
            const creditResult = await ExperienceService.consumeCredits(userId, 1);
            if (!creditResult.success) {
                setAiLoading(false);
                alert('クレジットが不足しています。レベルアップまたは追加購入でクレジットを獲得してください。');
                return;
            }

            // クレジット消費後、更新された情報を取得して表示
            const updatedExpInfo = await ExperienceService.getUserExperience(userId);
            const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_MODE;
            setCreditInfo({
                tier: isPremium ? 'premium' : 'free',
                totalCredits: updatedExpInfo.totalCredits,
                freeCredits: updatedExpInfo.freeCredits,
                paidCredits: updatedExpInfo.paidCredits,
                remainingCredits: updatedExpInfo.totalCredits,
                devMode: DEV_MODE,
                allowed: updatedExpInfo.totalCredits > 0
            });

            let fullAnalysis = '';

            // セクション1: パフォーマンスレポートを生成
            const response1 = await GeminiAPI.sendMessage(section1Prompt, [], userProfile, 'gemini-2.5-pro');
            if (response1.success) {
                fullAnalysis += response1.text + '\n\n';
                setAiAnalysis(fullAnalysis);
            } else {
                throw new Error(response1.error || 'セクション1の生成に失敗');
            }

            // セクション2: 指示書プランを生成
            const response2 = await GeminiAPI.sendMessage(section2Prompt, [], userProfile, 'gemini-2.5-pro');
            if (response2.success) {
                fullAnalysis += response2.text;
                setAiAnalysis(fullAnalysis);

                // AI分析の結果をLocalStorageに永続化
                const today = getTodayDate();
                const analyses = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ANALYSES) || '{}');
                if (analyses[today]) {
                    analyses[today].aiComment = fullAnalysis;
                    localStorage.setItem(STORAGE_KEYS.DAILY_ANALYSES, JSON.stringify(analyses));
                }

                // 指示書プランを翌日の指示書として保存
                const directiveText = response2.text;
                // 「- 【カテゴリー】内容」の形式から抽出
                const directiveMatch = directiveText.match(/【(.+?)】(.+)/);
                if (directiveMatch) {
                    const category = directiveMatch[1]; // 食事/運動/睡眠など
                    const message = directiveMatch[2].trim();

                    // カテゴリーをtypeに変換
                    let type = 'meal';
                    if (category.includes('運動') || category.includes('トレーニング')) {
                        type = 'exercise';
                    } else if (category.includes('睡眠') || category.includes('コンディション')) {
                        type = 'condition';
                    }

                    // 翌日の日付を計算
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

                    // 翌日の23:59を期限として設定
                    const deadline = new Date(tomorrow);
                    deadline.setHours(23, 59, 59, 999);

                    // 指示書を保存
                    const directives = JSON.parse(localStorage.getItem(STORAGE_KEYS.DIRECTIVES) || '[]');
                    // 翌日の既存指示書を削除
                    const filteredDirectives = directives.filter(d => d.date !== tomorrowStr);
                    filteredDirectives.push({
                        date: tomorrowStr,
                        message: message,
                        type: type,
                        completed: false,
                        deadline: deadline.toISOString(),
                        createdAt: new Date().toISOString()
                    });
                    localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(filteredDirectives));

                    // directiveUpdatedイベントを発火してダッシュボードを更新
                    window.dispatchEvent(new Event('directiveUpdated'));
                }
            } else {
                throw new Error(response2.error || 'セクション2の生成に失敗');
            }
        } catch (error) {
            console.error('AI分析エラー:', error);
            setAiAnalysis('申し訳ございません。AI分析の生成中に問題が発生しました。\n\nエラー内容: ' + error.message + '\n\nしばらく時間をおいて、「再生成」ボタンをタップしてお試しください。');
        }

        setAiLoading(false);

        // クレジット消費後、ダッシュボードの表示を更新するイベントを発火
        window.dispatchEvent(new CustomEvent('creditUpdated'));

        // 経験値システム：スコアを経験値として加算
        if (scores) {
            try {
                const today = getTodayDate();
                const expResult = await ExperienceService.processDailyScore(userId, today, scores);
                console.log('[Analysis] Experience processing result:', expResult);

                // レベルアップ時の通知
                if (expResult.leveledUp) {
                    console.log(`[Analysis] Level up! New level: ${expResult.level}, Credits earned: ${expResult.creditsEarned}`);
                    // レベルアップモーダルを表示する処理は後ほど実装
                    // グローバルイベントを発火してダッシュボードに通知
                    window.dispatchEvent(new CustomEvent('levelUp', {
                        detail: {
                            level: expResult.level,
                            creditsEarned: expResult.creditsEarned,
                            milestoneReached: expResult.milestoneReached
                        }
                    }));
                }
            } catch (expError) {
                console.error('[Analysis] Failed to process experience:', expError);
                // エラーが発生しても分析自体は成功しているので、ユーザーには通知しない
            }
        }

        // 分析完了をマーク
        await markFeatureCompleted(userId, 'analysis');

        // 初回分析後：全機能を開放
        // 注：isFirstAnalysisParamがfalseでも、未開放の機能は開放する
        // 各機能が未開放なら開放する（初回分析かどうかに関わらず）
        const directiveCompleted = isFeatureCompleted(userId, 'directive');
        const templateCompleted = isFeatureCompleted(userId, 'template');
        const routineCompleted = isFeatureCompleted(userId, 'routine');
        const shortcutCompleted = isFeatureCompleted(userId, 'shortcut');

        // 未開放の機能を開放
        if (!directiveCompleted || !templateCompleted || !routineCompleted || !shortcutCompleted) {
            // モーダル①: 指示書・履歴
            if (!directiveCompleted) {
                await markFeatureCompleted(userId, 'directive');
            }
            if (!isFeatureCompleted(userId, 'idea')) {
                await markFeatureCompleted(userId, 'idea');
            }
            if (!isFeatureCompleted(userId, 'history')) {
                await markFeatureCompleted(userId, 'history');
            }

            // モーダル②: PG BASE・COMY
            if (!isFeatureCompleted(userId, 'pg_base')) {
                await markFeatureCompleted(userId, 'pg_base');
            }
            if (!isFeatureCompleted(userId, 'community')) {
                await markFeatureCompleted(userId, 'community');
            }

            // モーダル③: テンプレート・ルーティン・ショートカット
            if (!templateCompleted) {
                await markFeatureCompleted(userId, 'template');
            }
            if (!routineCompleted) {
                await markFeatureCompleted(userId, 'routine');
            }
            if (!shortcutCompleted) {
                await markFeatureCompleted(userId, 'shortcut');
            }
            if (!isFeatureCompleted(userId, 'history_analysis')) {
                await markFeatureCompleted(userId, 'history_analysis');
            }

            // 機能開放後、App.jsのunlockedFeaturesを即座に更新
            if (onFeatureUnlocked) {
                onFeatureUnlocked();
            }

            // 初回分析の場合のみ、ダッシュボードでモーダル表示
            if (isFirstAnalysisParam) {
                localStorage.setItem('showFeatureUnlockModals', 'true');
                // ダッシュボードにイベントを通知
                window.dispatchEvent(new CustomEvent('featureUnlockCompleted'));
            }
        }

        // Premium販促モーダル（初回分析後）
        // 新機能開放モーダルが完了した後に表示するためのフラグを設定
        if (isFirstAnalysisParam && !DEV_PREMIUM_MODE) {
            localStorage.setItem('showUpgradeModalPending', 'true');
        }
    };

    // 対話型Q&A機能
    const handleUserQuestion = async () => {
        if (!userQuestion.trim() || qaLoading) return;

        const question = userQuestion.trim();
        setUserQuestion('');
        setQaLoading(true);

        // ユーザーの質問を会話履歴に追加
        const newHistory = [...conversationHistory, {
            type: 'user',
            content: question,
            timestamp: new Date().toISOString()
        }];
        setConversationHistory(newHistory);

        // 質問送信直後に最下部までスクロール
        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        try {
            // 会話履歴を整形
            const conversationContext = conversationHistory.length > 0
                ? conversationHistory.map(msg => {
                    if (msg.type === 'user') {
                        return `**ユーザー**: ${msg.content}`;
                    } else {
                        return `**あなた（AIコーチ）**: ${msg.content}`;
                    }
                }).join('\n\n')
                : 'まだ会話は始まっていません。';

            // 文脈を含むプロンプトを作成
            const contextPrompt = `## 役割
あなたは、ユーザーの質問に答える、親身で優秀なAIパフォーマンスコーチです。

## 重要な前提
あなたは既に以下のレポートを生成しています。このレポートの内容を**絶対的な前提**として、ユーザーの質問に回答してください。
レポートに書かれている情報と矛盾する回答や、独自に再計算・再評価した回答は絶対にしないでください。

### あなたが生成したレポート全文
${aiAnalysis || '（レポート生成中または未生成）'}

## これまでの会話履歴
${conversationContext}

## ユーザーからの新しい質問
「${question}」

## タスク
**必ず上記のレポート内容と会話履歴を前提として**、ユーザーの新しい質問に回答してください。

- ✅ レポートに書かれている評価やスコアをそのまま引用する
- ✅ これまでの会話の文脈を踏まえて回答する（過去の質問で既に説明した内容は「先ほどお伝えした通り...」と参照可能）
- ✅ レポートの分析結果を基に、質問に対する補足説明や深堀りをする
- ✅ レポートで言及されていない内容は「レポートには記載がありませんが...」と前置きする
- ❌ レポートと異なる評価や数値を提示しない
- ❌ レポートや会話履歴を無視して独自に分析しない
- ❌ 同じ説明を何度も繰り返さない（会話履歴を参照して簡潔に）

専門用語を避け、高校生にも理解できるような言葉で、簡潔かつ丁寧に回答してください。
`;

            // 質問1回につき1クレジット消費
            console.log('[Analysis Q&A] Consuming 1 credit for question');
            const creditResult = await ExperienceService.consumeCredits(userId, 1);
            if (!creditResult.success) {
                setConversationHistory([...newHistory, {
                    type: 'ai',
                    content: 'クレジットが不足しています。レベルアップまたは追加購入でクレジットを獲得してください。',
                    timestamp: new Date().toISOString()
                }]);
                setQaLoading(false);
                return;
            }
            console.log('[Analysis Q&A] Credit consumed successfully. Remaining:', creditResult.remaining);

            // クレジット消費後、更新された情報を取得して表示
            const updatedExpInfo = await ExperienceService.getUserExperience(userId);
            const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_MODE;
            setCreditInfo({
                tier: isPremium ? 'premium' : 'free',
                totalCredits: updatedExpInfo.totalCredits,
                freeCredits: updatedExpInfo.freeCredits,
                paidCredits: updatedExpInfo.paidCredits,
                remainingCredits: updatedExpInfo.totalCredits,
                devMode: DEV_MODE,
                allowed: updatedExpInfo.totalCredits > 0
            });
            console.log('[Analysis Q&A] Updated credit info displayed:', updatedExpInfo.totalCredits);

            const response = await GeminiAPI.sendMessage(contextPrompt, [], userProfile, 'gemini-2.5-pro');

            if (response.success) {
                // AIの回答を会話履歴に追加
                setConversationHistory([...newHistory, {
                    type: 'ai',
                    content: response.text,
                    timestamp: new Date().toISOString()
                }]);

                // 自動スクロール
                setTimeout(() => {
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else {
                setConversationHistory([...newHistory, {
                    type: 'ai',
                    content: '申し訳ございません。質問への回答生成に失敗しました。もう一度お試しください。',
                    timestamp: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Q&Aエラー:', error);
            setConversationHistory([...newHistory, {
                type: 'ai',
                content: '申し訳ございません。エラーが発生しました。ネットワーク接続を確認の上、もう一度お試しください。',
                timestamp: new Date().toISOString()
            }]);
        }

        setQaLoading(false);

        // クレジット消費後、ダッシュボードの表示を更新するイベントを発火
        window.dispatchEvent(new CustomEvent('creditUpdated'));
    };

    // 過去データから体質・傾向・相関を分析
    const analyzeHistoricalTrends = (historicalData, todayRecord, profile) => {
        if (historicalData.length === 0) {
            return {
                recordCount: 0,
                insights: ['まだ十分なデータがありません。継続して記録することで、より詳細な分析ができるようになります。'],
                recommendations: []
            };
        }

        const insights = [];
        const recordCount = historicalData.length;

        const calorieVariance = historicalData.map(d => (d.record.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0));
        const avgCalories = calorieVariance.reduce((a, b) => a + b, 0) / calorieVariance.length;
        const variance = calorieVariance.reduce((sum, val) => sum + Math.pow(val - avgCalories, 2), 0) / calorieVariance.length;
        const stdDev = Math.sqrt(variance);
        const consistency = stdDev < 300 ? '高い' : stdDev < 500 ? '中程度' : '低い';
        insights.push(`カロリー摂取の一貫性: ${consistency}（平均${Math.round(avgCalories)}kcal、標準偏差${Math.round(stdDev)}kcal）`);

        const proteinIntakes = historicalData.map(d => (d.record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0));
        const avgProtein = proteinIntakes.reduce((a, b) => a + b, 0) / proteinIntakes.length;
        const proteinStatus = avgProtein >= profile.leanBodyMass * 2 ? '十分' : avgProtein >= profile.leanBodyMass * 1.5 ? 'やや不足' : '不足';
        insights.push(`タンパク質摂取: ${proteinStatus}（平均${Math.round(avgProtein)}g/日、LBM比${(avgProtein / profile.leanBodyMass).toFixed(2)}g/kg）`);

        const workoutDays = historicalData.filter(d => (d.record.workouts || []).length > 0).length;
        const workoutFrequency = (workoutDays / recordCount * 100).toFixed(0);
        insights.push(`トレーニング頻度: 週${((workoutDays / recordCount) * 7).toFixed(1)}回（過去${recordCount}日中${workoutDays}日、${workoutFrequency}%）`);

        const conditionData = historicalData.filter(d => d.record.conditions).map(d => ({ sleep: d.record.conditions.sleepHours || 0, fatigue: d.record.conditions.fatigue || '普通', protein: (d.record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0) }));

        if (conditionData.length > 5) {
            const avgSleep = conditionData.reduce((s, d) => s + d.sleep, 0) / conditionData.length;
            const lowFatigueDays = conditionData.filter(d => d.fatigue === '低' || d.fatigue === '普通').length;
            const recoveryRate = (lowFatigueDays / conditionData.length * 100).toFixed(0);
            insights.push(`睡眠: 平均${avgSleep.toFixed(1)}時間、疲労回復率${recoveryRate}%`);

            if (avgSleep < 6) {
                insights.push(`気づき: 睡眠時間が不足傾向です。筋肉の回復にはタンパク質だけでなく、7-9時間の睡眠が重要です。`);
            }
        }

        const pfcBalances = historicalData.map(d => {
            const p = (d.record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
            const f = (d.record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
            const c = (d.record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);
            const total = p * 4 + f * 9 + c * 4;
            return { pRatio: total > 0 ? ((p * 4) / total * 100).toFixed(0) : 0, fRatio: total > 0 ? ((f * 9) / total * 100).toFixed(0) : 0, cRatio: total > 0 ? ((c * 4) / total * 100).toFixed(0) : 0 };
        });
        const avgPRatio = pfcBalances.reduce((s, b) => s + parseFloat(b.pRatio), 0) / pfcBalances.length;
        const avgFRatio = pfcBalances.reduce((s, b) => s + parseFloat(b.fRatio), 0) / pfcBalances.length;
        const avgCRatio = pfcBalances.reduce((s, b) => s + parseFloat(b.cRatio), 0) / pfcBalances.length;
        insights.push(`PFCバランス平均: P${avgPRatio.toFixed(0)}% / F${avgFRatio.toFixed(0)}% / C${avgCRatio.toFixed(0)}%`);

        const weightData = historicalData.filter(d => d.record.conditions && d.record.conditions.bodyWeight).map(d => ({ date: d.date, weight: d.record.conditions.bodyWeight })).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (weightData.length >= 3) {
            const firstWeight = weightData[0].weight;
            const lastWeight = weightData[weightData.length - 1].weight;
            const weightChange = lastWeight - firstWeight;
            const trend = weightChange > 0 ? '増加' : weightChange < 0 ? '減少' : '維持';
            insights.push(`体重変動: ${Math.abs(weightChange).toFixed(1)}kg ${trend}（${firstWeight}kg → ${lastWeight}kg）`);
        }

        const recommendations = [];
        if (avgProtein < profile.leanBodyMass * 2 && profile.purpose && profile.purpose.includes('バルクアップ')) {
            recommendations.push('バルクアップ目的でタンパク質がやや不足傾向です。LBM×2.5g/日を目指しましょう。');
        }
        if (workoutFrequency < 50) {
            recommendations.push('トレーニング頻度が週3回未満です。週4-5回のトレーニングで成長ホルモン分泌を最大化できます。');
        }
        if (avgCRatio < 30 && profile.purpose && profile.purpose.includes('バルクアップ')) {
            recommendations.push('炭水化物比率が低めです。トレーニング前後に糖質を摂取することで、パフォーマンスと回復が向上します。');
        }
        if (consistency === '低い') {
            recommendations.push('カロリー摂取のばらつきが大きいです。毎日一定のカロリーを摂取することで、体組成の管理がしやすくなります。');
        }

        return { recordCount: recordCount, insights: insights, recommendations: recommendations.length > 0 ? recommendations : ['現在の食事・トレーニング習慣を継続しましょう！'] };
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">分析中...</p>
                </div>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                <header className="p-4 flex items-center border-b bg-gradient-to-r from-purple-600 to-indigo-600 flex-shrink-0">
                    <button onClick={handleClose} className="text-white">
                        <Icon name="ArrowLeft" size={24} />
                    </button>
                    <h1 className="text-xl font-bold mx-auto text-white">本日の分析</h1>
                    <div className="w-6"></div>
                </header>
                <div className="p-6 flex items-center justify-center flex-grow">
                    <div className="text-center text-gray-500">
                        <Icon name="AlertCircle" size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>本日の記録がまだありません</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
            <header className="p-4 flex items-center border-b bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0 sticky top-0 z-30">
                <button onClick={handleClose} className="text-white">
                    <Icon name="ArrowLeft" size={24} />
                </button>
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-bold text-white">AIコーチ</h1>
                    <p className="text-xs text-white opacity-80">トップアスリート育成プログラム</p>
                </div>
                <button onClick={() => {
                    // スコアを再計算して渡す
                    const freshScores = calculateScores(userProfile, dailyRecord, targetPFC);
                    generateAIAnalysis(analysis, historicalInsights, false, freshScores);
                }} className="text-white">
                    <Icon name="RefreshCw" size={20} />
                </button>
            </header>

            {/* クレジット表示バー */}
            {creditInfo && (
                <div className={`px-4 py-2 border-b flex items-center justify-between ${
                    creditInfo.tier === 'premium' ? 'bg-gradient-to-r from-purple-50 to-pink-50' : 'bg-blue-50'
                }`}>
                    <div className="flex items-center gap-2">
                        {creditInfo.tier === 'premium' ? (
                            <Icon name="Crown" size={16} className="text-purple-600" />
                        ) : (
                            <Icon name="Gift" size={16} className="text-blue-600" />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                            {creditInfo.tier === 'premium' ? 'Premium会員' : '無料プラン'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">分析クレジット:</span>
                        <span className={`text-sm font-bold ${
                            creditInfo.totalCredits <= 3 ? 'text-red-600' :
                            creditInfo.totalCredits <= 10 ? 'text-orange-600' :
                            'text-green-600'
                        }`}>
                            {creditInfo.totalCredits}
                        </span>
                        <span className="text-xs text-gray-500">
                            (無料:{creditInfo.freeCredits} / 有料:{creditInfo.paidCredits})
                        </span>
                        <button
                            onClick={() => setShowCreditInfoModal(true)}
                            className="p-1 hover:bg-white/50 rounded transition"
                        >
                            <Icon name="Info" size={16} className="text-gray-500" />
                        </button>
                    </div>
                </div>
            )}

            <div className="p-4 flex-grow overflow-y-auto space-y-3" style={{ paddingBottom: `${babHeight + 80}px` }}>
                {/* 日付バッジ */}
                <div className="flex justify-center">
                    <div className="bg-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-700 font-medium flex items-center gap-2">
                        <Icon name="Calendar" size={14} />
                        {new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                        {dailyRecord.routine && dailyRecord.routine.name && (
                            <>
                                <span>-</span>
                                <Icon name="Dumbbell" size={14} />
                                {dailyRecord.routine.name}
                            </>
                        )}
                    </div>
                </div>

                {/* AIからのメッセージ: AI生成分析のみ表示 */}
                {aiLoading ? (
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 rounded-full p-2 flex-shrink-0">
                            <Icon name="Bot" size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-200">
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    <span className="ml-3 text-sm text-gray-600">AI分析を生成中...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : aiAnalysis ? (
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 rounded-full p-2 flex-shrink-0">
                            <Icon name="Bot" size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-200">
                                <div className="text-sm text-gray-700 leading-relaxed">
                                    <MarkdownRenderer text={aiAnalysis} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* 区切り線: Q&Aセクション */}
                {!aiLoading && aiAnalysis && (
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <span className="text-xs text-gray-500 font-medium">質問・相談</span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                )}

                {/* 対話型Q&A: 会話履歴 */}
                {conversationHistory.map((msg, idx) => (
                    <div key={idx}>
                        {msg.type === 'user' ? (
                            /* ユーザーの質問（右側） */
                            <div className="flex items-start gap-3 justify-end">
                                <div className="flex-1 max-w-[85%]">
                                    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl rounded-tr-none p-4 shadow-md text-white">
                                        <p className="text-sm leading-relaxed">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-purple-600 rounded-full p-2 flex-shrink-0">
                                    <Icon name="User" size={20} className="text-white" />
                                </div>
                            </div>
                        ) : (
                            /* AIの回答（左側） */
                            <div className="flex items-start gap-3">
                                <div className="bg-indigo-600 rounded-full p-2 flex-shrink-0">
                                    <Icon name="MessageCircle" size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-200">
                                        <div className="text-sm text-gray-800 leading-relaxed">
                                            <MarkdownRenderer text={msg.content} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Q&A ローディング */}
                {qaLoading && (
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-600 rounded-full p-2 flex-shrink-0">
                            <Icon name="MessageCircle" size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-200">
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                                    <span className="text-sm text-gray-600">考え中...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* スクロール用の参照 */}
                <div ref={chatEndRef}></div>

            </div>

            {/* 質問入力エリア（BAB連動固定） */}
            {!aiLoading && aiAnalysis && (
                <div
                    className="fixed left-0 right-0 border-t bg-white shadow-lg z-[9990]"
                    style={{ bottom: `${babHeight}px` }}
                >
                    <div className="flex items-center gap-2 p-3">
                        <button
                            onClick={() => setShowHelpModal(true)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex-shrink-0"
                        >
                            <Icon name="Info" size={20} />
                        </button>
                        <input
                            type="text"
                            value={userQuestion}
                            onChange={(e) => setUserQuestion(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleUserQuestion()}
                            placeholder="レポートについて質問してください..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            disabled={qaLoading}
                        />
                        <button
                            onClick={handleUserQuestion}
                            disabled={!userQuestion.trim() || qaLoading}
                            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                            <Icon name="Send" size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* ヘルプモーダル */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={() => setShowHelpModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="HelpCircle" size={24} className="text-indigo-600" />
                                質問機能の使い方
                            </h3>
                            <button onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm text-gray-700">
                            <p className="font-medium text-indigo-600">💡 質問例</p>
                            <ul className="space-y-2 pl-4">
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 flex-shrink-0">•</span>
                                    <span>「タンパク質が不足する原因は？」</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 flex-shrink-0">•</span>
                                    <span>「この改善提案をもっと詳しく教えて」</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 flex-shrink-0">•</span>
                                    <span>「睡眠の質を上げる方法は？」</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 flex-shrink-0">•</span>
                                    <span>「目的達成のために何を優先すべき？」</span>
                                </li>
                            </ul>
                            <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
                                AIコーチがレポート内容に基づいて、あなたの疑問に答えます。
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* クレジット消費説明モーダル */}
            {showCreditInfoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4" onClick={() => setShowCreditInfoModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icon name="Info" size={24} className="text-indigo-600" />
                                クレジットについて
                            </h3>
                            <button onClick={() => setShowCreditInfoModal(false)} className="text-gray-400 hover:text-gray-600">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="space-y-4 text-sm text-gray-700">
                            {/* クレジット消費ルール */}
                            <div>
                                <p className="font-bold text-indigo-600 mb-2">📊 クレジット消費ルール</p>
                                <p className="text-xs text-gray-600 mb-3">すべての分析機能で1クレジットを消費します</p>
                                <ul className="space-y-2 pl-4">
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-400 flex-shrink-0">•</span>
                                        <span><span className="font-medium">レポート生成：</span>1クレジット</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-400 flex-shrink-0">•</span>
                                        <span><span className="font-medium">質問1回：</span>1クレジット</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-400 flex-shrink-0">•</span>
                                        <span><span className="font-medium">履歴分析1項目：</span>1クレジット</span>
                                    </li>
                                </ul>
                            </div>

                            {/* 無料プラン */}
                            <div className="pt-4 border-t border-gray-200">
                                <p className="font-bold text-green-600 mb-2">🎁 無料プラン</p>
                                <ul className="space-y-2 pl-4">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400 flex-shrink-0">•</span>
                                        <span><span className="font-medium">月21クレジット</span></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400 flex-shrink-0">•</span>
                                        <span className="text-xs text-gray-600">毎月1日に付与、月末に失効</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400 flex-shrink-0">•</span>
                                        <span className="text-xs text-gray-600">クレジットは共有（何回でも同じ分析可能）</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-400 flex-shrink-0">•</span>
                                        <span className="text-xs text-gray-600">7日間はすべての機能が利用可能</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Premium会員 */}
                            <div className="pt-4 border-t border-gray-200">
                                <p className="font-bold text-purple-600 mb-2 flex items-center gap-1">
                                    <Icon name="Crown" size={16} />
                                    8日目以降（Premium会員）
                                </p>
                                <ul className="space-y-2 pl-4">
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-400 flex-shrink-0">•</span>
                                        <span><span className="font-medium">月100クレジット付与</span></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-400 flex-shrink-0">•</span>
                                        <span>すべての機能が無制限</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-400 flex-shrink-0">•</span>
                                        <span className="text-xs text-gray-600">指示書、PG BASE、COMYなど</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* マイクロラーニングポップアップ */}
            {microLearningContent && (
                <MicroLearningPopup
                    content={microLearningContent}
                    onClose={() => setMicroLearningContent(null)}
                    onComplete={() => {
                        // 完了時の処理（ユーザープロフィール更新など）
                        console.log('Micro-learning completed:', microLearningContent.title);
                    }}
                />
            )}

            {/* 協働プランニングモーダル */}
            {showCollaborativePlanning && (
                <CollaborativePlanningView
                    onClose={() => setShowCollaborativePlanning(false)}
                    userId={userId}
                    userProfile={userProfile}
                    dailyRecord={dailyRecord}
                    analysis={analysis}
                />
            )}

            {/* 初回分析後の販促モーダル */}
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
                            {/* 残りクレジット */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-gray-700 mb-1">今月の残りクレジット</p>
                                <p className="text-3xl font-bold text-blue-600">
                                    {creditInfo ? creditInfo.remainingCredits : 20} 回
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    毎月1日に付与、月末に失効
                                </p>
                            </div>

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
                                    if (onUpgradeClick) {
                                        onUpgradeClick();
                                    } else {
                                        alert('サブスクリプション画面は準備中です');
                                    }
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
        </div>
    );
};

// ===== CalendarView Component (lines 5221-5298) =====
const CalendarView = ({ selectedStartDate, selectedEndDate, onDateSelect, analyses, historyData }) => {
    const [currentMonth, setCurrentMonth] = useState(selectedStartDate || new Date());

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startOfMonth.getDay());
    const endDate = new Date(endOfMonth);
    if (endOfMonth.getDay() !== 6) {
        endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()));
    }

    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
    }

    const getDayStatus = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        const analysis = analyses[dateStr];
        const dayData = historyData.find(d => d.date === dateStr);
        const hasRecord = dayData && dayData.calories > 0;
        const hasHighScore = analysis && analysis.achievementRates && analysis.achievementRates.overall >= 80;
        if (hasRecord && hasHighScore) {
            return 'highScore';
        }
        return null;
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full">
                    <Icon name="ChevronLeft" size={20} />
                </button>
                <h4 className="font-bold text-lg">
                    {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                </h4>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full">
                    <Icon name="ChevronRight" size={20} />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
                {['日', '月', '火', '水', '木', '金', '土'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {dates.map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const startStr = selectedStartDate ? selectedStartDate.toISOString().split('T')[0] : null;
                    const endStr = selectedEndDate ? selectedEndDate.toISOString().split('T')[0] : null;

                    const isSelected = (startStr && dateStr === startStr) || (endStr && dateStr === endStr);
                    const inRange = selectedStartDate && selectedEndDate && date > selectedStartDate && date < selectedEndDate;
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const dayStatus = getDayStatus(date);

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onDateSelect(date)}
                            className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-lg transition text-sm ${
                                date.getMonth() !== currentMonth.getMonth() ? 'text-gray-300' : 'text-gray-700'
                            } ${
                                isSelected ? 'bg-indigo-600 text-white font-bold' :
                                inRange ? 'bg-indigo-100' :
                                isToday ? 'bg-yellow-100' :
                                'hover:bg-gray-100'
                            }`}
                        >
                            {date.getDate()}
                            {dayStatus === 'highScore' && <div className="absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ===== HistoryView Component (lines 5300-6078) =====
const HistoryView = ({ onClose, userId, userProfile, lastUpdate, setInfoModal }) => {
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 6);
        return date;
    });
    const [endDate, setEndDate] = useState(new Date());
    const [historyData, setHistoryData] = useState([]);
    const [analyses, setAnalyses] = useState({});
    const [selectedMetric, setSelectedMetric] = useState('calories');
    const [expandedDates, setExpandedDates] = useState(new Set());
    const [selectedDateAnalysis, setSelectedDateAnalysis] = useState(null);

    useEffect(() => {
        loadHistoryData();
    }, [startDate, endDate, lastUpdate]);

    const handleDateSelect = (date) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(date);
            setEndDate(null);
        } else {
            if (date < startDate) {
                setEndDate(startDate);
                setStartDate(date);
            } else {
                setEndDate(date);
            }
        }
    };

    // 期間選択関数（固定日数）
    const selectPeriodDays = (days) => {
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - (days - 1));
        setStartDate(start);
        setEndDate(today);
    };

    // 期間選択関数（今週、先週、今月、先月）
    const selectPeriodRange = (rangeType) => {
        const today = new Date();
        let start, end;

        switch(rangeType) {
            case 'thisWeek':
                // 今週（月曜日～今日）
                const dayOfWeek = today.getDay();
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                start = new Date(today);
                start.setDate(today.getDate() - diffToMonday);
                end = today;
                break;

            case 'lastWeek':
                // 先週（先週の月曜日～日曜日）
                const lastSunday = new Date(today);
                const daysToLastSunday = today.getDay() === 0 ? 0 : today.getDay();
                lastSunday.setDate(today.getDate() - daysToLastSunday);
                start = new Date(lastSunday);
                start.setDate(lastSunday.getDate() - 6);
                end = lastSunday;
                break;

            case 'thisMonth':
                // 今月（1日～今日）
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = today;
                break;

            case 'lastMonth':
                // 先月（先月の1日～末日）
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
        }

        setStartDate(start);
        setEndDate(end);
    };

    const loadHistoryData = async () => {
        if (!startDate) return;
        setLoading(true);

        const effectiveEndDate = endDate || startDate;
        const data = [];

        const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
        const directives = savedDirectives ? JSON.parse(savedDirectives) : [];

        const savedAnalyses = localStorage.getItem(STORAGE_KEYS.DAILY_ANALYSES);
        const loadedAnalyses = savedAnalyses ? JSON.parse(savedAnalyses) : {};
        setAnalyses(loadedAnalyses);

        for (let d = new Date(startDate); d <= effectiveEndDate; d.setDate(d.getDate() + 1)) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const record = await DataService.getDailyRecord(userId, dateStr);
            const directive = directives.find(dir => dir.date === dateStr);

            if (record) {
                const totalCalories = (record.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
                const totalProtein = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
                const totalFat = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
                const totalCarbs = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);

                // 体組成データを取得（コンディション記録から）
                const latestCondition = record.conditions; // conditionsはオブジェクト

                // RM更新記録を取得（ワークアウトから）
                const rmUpdates = (record.workouts || []).flatMap(workout => (workout.sets || []).filter(set => set.rmUpdate).map(set => set.rmUpdate));

                data.push({
                    date: dateStr,
                    calories: totalCalories, protein: totalProtein, fat: totalFat, carbs: totalCarbs,
                    weight: latestCondition?.weight || null,
                    bodyFat: latestCondition?.bodyFat || null,
                    rmUpdates,
                    meals: record.meals || [],
                    workouts: record.workouts || [],
                    conditions: record.conditions || null,
                    directive: directive || null
                });
            } else {
                data.push({
                    date: dateStr, calories: 0, protein: 0, fat: 0, carbs: 0, weight: null, bodyFat: null, rmUpdates: [],
                    meals: [], workouts: [], conditions: null, directive: directive || null
                });
            }
        }

        setHistoryData(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
        setLoading(false);
    };

    // 指定日付の分析データを読み込む
    const loadAnalysisForDate = (dateStr) => {
        const analysis = analyses[dateStr];
        if (analysis) {
            setSelectedDateAnalysis(analysis);
        } else {
            // 分析データがない場合
            setSelectedDateAnalysis({
                date: dateStr,
                error: '分析データがありません',
                comment: 'この日の分析はまだ生成されていません。'
            });
        }
    };

    const targetPFC = LBMUtils.calculateTargetPFC(
        userProfile.tdeeBase || 2200,
        userProfile.weightChangePace || 0,
        userProfile.leanBodyMass || 60,
        userProfile.style || '一般',
        userProfile.purpose || 'メンテナンス',
        userProfile.dietStyle || 'バランス',
        userProfile.calorieAdjustment,
        userProfile.customPFC
    );

    const maxCalories = Math.max(...historyData.map(d => d.calories), targetPFC.calories);
    const maxProtein = Math.max(...historyData.map(d => d.protein), targetPFC.protein);
    const maxFat = Math.max(...historyData.map(d => d.fat || 0), targetPFC.fat);
    const maxCarbs = Math.max(...historyData.map(d => d.carbs || 0), targetPFC.carbs);

    // 指示書達成率を計算
    const directivesWithData = historyData.filter(d => d.directive);
    const completedDirectives = directivesWithData.filter(d => d.directive.completed).length;
    const directiveAchievementRate = directivesWithData.length > 0
        ? Math.round((completedDirectives / directivesWithData.length) * 100)
        : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto slide-up">
                <div className="sticky top-0 bg-white border-b p-4 z-10">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold">履歴</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <Icon name="X" size={20} />
                        </button>
                    </div>
                    {/* 指示書達成率 */}
                    {directivesWithData.length > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Icon name="FileText" size={16} className="text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">指示書達成率</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-green-600">{directiveAchievementRate}%</span>
                                    <span className="text-xs text-gray-500 ml-2">({completedDirectives}/{directivesWithData.length})</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Icon name="Calendar" size={18} />
                            <h4 className="font-bold">期間選択</h4>
                            <button
                                type="button"
                                onClick={() => setInfoModal({
                                    show: true,
                                    title: 'カレンダーの使い方',
                                    content: `カレンダーの日付をクリックして、履歴を表示したい期間を選択します。\n\n【期間選択の方法】\n1. 1回目のクリックで「開始日」を選択します。\n2. 2回目のクリックで「終了日」を選択します。\n3. 選択した期間のデータが自動で表示されます。\n\n【単一日付の選択】\n開始日を選択した後、もう一度同じ日付をクリックすると、その1日だけのデータが表示されます。\n\n【色の見方】\n• 黄色: 今日\n• 濃い紫: 選択した期間の開始日と終了日\n• 薄い紫: 選択した期間内の日\n• 緑の点: その日の総合分析スコアが80点以上だった日`
                                })}
                                className="text-indigo-600 hover:text-indigo-800"
                            >
                                <Icon name="Info" size={16} />
                            </button>
                        </div>
                        <CalendarView
                            selectedStartDate={startDate}
                            selectedEndDate={endDate}
                            onDateSelect={handleDateSelect}
                            analyses={analyses}
                            historyData={historyData}
                        />
                    </div>

                    {/* カテゴリ別指標切り替え */}
                    <div className="space-y-2">
                        {/* カロリー/PFC */}
                        <details open className="border rounded-lg overflow-hidden">
                            <summary className="cursor-pointer p-3 bg-indigo-50 hover:bg-indigo-100 font-medium flex items-center gap-2">
                                <Icon name="Flame" size={16} className="text-indigo-700" />
                                <span>カロリー / PFC</span>
                            </summary>
                            <div className="p-3 flex gap-2 flex-wrap bg-white">
                                {[
                                    { id: 'calories', label: 'カロリー', color: 'indigo' },
                                    { id: 'protein', label: 'P（タンパク質）', color: 'cyan' },
                                    { id: 'fat', label: 'F（脂質）', color: 'yellow' },
                                    { id: 'carbs', label: 'C（炭水化物）', color: 'green' }
                                ].map(metric => (
                                    <button
                                        key={metric.id}
                                        onClick={() => setSelectedMetric(metric.id)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                                            selectedMetric === metric.id
                                                ? `bg-${metric.color}-600 text-white`
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {metric.label}
                                    </button>
                                ))}
                            </div>
                        </details>

                        {/* 体組成 */}
                        <details open className="border rounded-lg overflow-hidden">
                            <summary className="cursor-pointer p-3 bg-green-50 hover:bg-green-100 font-medium flex items-center gap-2">
                                <Icon name="Scale" size={16} className="text-green-700" />
                                <span>体組成</span>
                            </summary>
                            <div className="p-3 flex gap-2 flex-wrap bg-white">
                                {[
                                    { id: 'weight', label: '体重', color: 'blue' },
                                    { id: 'bodyFat', label: '体脂肪率', color: 'orange' }
                                ].map(metric => (
                                    <button
                                        key={metric.id}
                                        onClick={() => setSelectedMetric(metric.id)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                                            selectedMetric === metric.id
                                                ? `bg-${metric.color}-600 text-white`
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {metric.label}
                                    </button>
                                ))}
                            </div>
                        </details>

                        {/* RM更新 */}
                        <details open className="border rounded-lg overflow-hidden">
                            <summary className="cursor-pointer p-3 bg-purple-50 hover:bg-purple-100 font-medium flex items-center gap-2">
                                <Icon name="Trophy" size={16} className="text-purple-700" />
                                <span>RM更新記録</span>
                            </summary>
                            <div className="p-3 bg-white">
                                {historyData.filter(d => d.rmUpdates && d.rmUpdates.length > 0).length > 0 ? (
                                    <div className="space-y-2">
                                        {historyData.filter(d => d.rmUpdates && d.rmUpdates.length > 0).map(d => (
                                            <div key={d.date} className="border-l-4 border-purple-500 pl-3 py-2">
                                                <div className="text-xs text-gray-500">{d.date}</div>
                                                {d.rmUpdates.map((rm, idx) => (
                                                    <div key={idx} className="text-sm font-medium text-purple-700">{rm}</div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 text-center py-2">RM更新記録がありません</div>
                                )}
                            </div>
                        </details>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <Icon name="Loader" size={48} className="animate-spin text-indigo-600 mx-auto" />
                        </div>
                    ) : (
                        <>
                            {/* 折れ線グラフ */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <h4 className="font-bold mb-3 flex items-center gap-2">
                                    <Icon name="TrendingUp" size={18} />
                                    {selectedMetric === 'calories' && 'カロリー推移'}
                                    {selectedMetric === 'protein' && 'タンパク質推移'}
                                    {selectedMetric === 'fat' && '脂質推移'}
                                    {selectedMetric === 'carbs' && '炭水化物推移'}
                                    {selectedMetric === 'weight' && '体重推移'}
                                    {selectedMetric === 'bodyFat' && '体脂肪率推移'}
                                </h4>

                                {/* 期間選択ボタン */}
                                <div className="mb-3 flex flex-wrap gap-2">
                                    <button onClick={() => selectPeriodDays(7)} className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition">7日</button>
                                    <button onClick={() => selectPeriodDays(14)} className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition">14日</button>
                                    <button onClick={() => selectPeriodDays(30)} className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition">30日</button>
                                    <button onClick={() => selectPeriodRange('thisWeek')} className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition">今週</button>
                                    <button onClick={() => selectPeriodRange('lastWeek')} className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition">先週</button>
                                    <button onClick={() => selectPeriodRange('thisMonth')} className="px-3 py-1 text-xs font-medium bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition">今月</button>
                                    <button onClick={() => selectPeriodRange('lastMonth')} className="px-3 py-1 text-xs font-medium bg-pink-100 text-pink-700 rounded-full hover:bg-pink-200 transition">先月</button>
                                </div>

                                {/* カテゴリ範囲表示 */}
                                {historyData.length > 0 && (() => {
                                    const values = historyData.map(d => d[selectedMetric] || 0).filter(v => v > 0);
                                    if (values.length === 0) return null;
                                    const min = Math.min(...values);
                                    const max = Math.max(...values);
                                    const unit = selectedMetric === 'calories' ? 'kcal' :
                                                selectedMetric === 'bodyFat' ? '%' :
                                                ['protein', 'fat', 'carbs'].includes(selectedMetric) ? 'g' : 'kg';
                                    return (
                                        <div className="mb-3 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-600">全期間の範囲:</span>
                                                <span className="font-semibold text-gray-800">
                                                    <span className="text-orange-600">{min.toFixed(1)}</span>
                                                    <span className="text-gray-400 mx-1">～</span>
                                                    <span className="text-green-600">{max.toFixed(1)}</span>
                                                    <span className="ml-1">{unit}</span>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="relative" style={{ height: '300px' }}>
                                    <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
                                        {/* グリッド線 */}
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <line
                                                key={i}
                                                x1="0"
                                                y1={i * 75}
                                                x2="800"
                                                y2={i * 75}
                                                stroke="#e5e7eb"
                                                strokeWidth="1"
                                            />
                                        ))}

                                        {/* 折れ線 */}
                                        {(() => {
                                            if (historyData.length === 0) return null; // データがない場合は何も描画しない
                                            const values = historyData.map(d => d[selectedMetric] || 0);
                                            const maxValue = Math.max(...values, 1);

                                            const getX = (index) => {
                                                if (historyData.length <= 1) return 400; // データが1つの場合は中央に
                                                return (index / (historyData.length - 1)) * 800;
                                            };

                                            const points = historyData.map((d, i) => {
                                                const x = getX(i);
                                                const y = 300 - ((d[selectedMetric] || 0) / maxValue) * 280;
                                                return `${x},${y}`;
                                            }).join(' ');

                                            return (
                                                <>
                                                    {/* エリア塗りつぶし (データが2つ以上の場合のみ) */}
                                                    {historyData.length > 1 && (
                                                        <polygon
                                                            points={`0,300 ${points} ${800},300`}
                                                            fill={
                                                                selectedMetric === 'calories' ? 'rgba(99, 102, 241, 0.1)' :
                                                                selectedMetric === 'protein' ? 'rgba(6, 182, 212, 0.1)' :
                                                                selectedMetric === 'fat' ? 'rgba(245, 158, 11, 0.1)' :
                                                                'rgba(34, 197, 94, 0.1)'
                                                            }
                                                        />
                                                    )}
                                                    {/* ライン (データが2つ以上の場合のみ) */}
                                                    {historyData.length > 1 && (
                                                        <polyline
                                                            points={points}
                                                            fill="none"
                                                            stroke={
                                                                selectedMetric === 'calories' ? '#6366f1' :
                                                                selectedMetric === 'protein' ? '#06b6d4' :
                                                                selectedMetric === 'fat' ? '#f59e0b' :
                                                                '#22c55e'
                                                            }
                                                            strokeWidth="3"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    )}
                                                    {/* ポイント */}
                                                    {historyData.map((d, i) => {
                                                        const x = getX(i);
                                                        const y = 300 - ((d[selectedMetric] || 0) / maxValue) * 280;
                                                        return (
                                                            <circle
                                                                key={i}
                                                                cx={x}
                                                                cy={y}
                                                                r="4"
                                                                fill="white"
                                                                stroke={
                                                                    selectedMetric === 'calories' ? '#6366f1' :
                                                                    selectedMetric === 'protein' ? '#06b6d4' :
                                                                    selectedMetric === 'fat' ? '#f59e0b' :
                                                                    '#22c55e'
                                                                }
                                                                strokeWidth="2"
                                                            />
                                                        );
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                    {/* Y軸ラベル（単位表示） */}
                                    <div className="absolute left-0 top-0 flex flex-col justify-between h-full text-xs text-gray-500 pr-2" style={{ width: '50px' }}>
                                        <span>{Math.round(Math.max(...historyData.map(d => d[selectedMetric] || 0), 1) * 100) / 100}{selectedMetric === 'calories' ? 'kcal' : selectedMetric === 'weight' ? 'kg' : selectedMetric === 'bodyFat' ? '%' : 'g'}</span>
                                        <span>{Math.round(Math.max(...historyData.map(d => d[selectedMetric] || 0), 1) * 0.75 * 100) / 100}{selectedMetric === 'calories' ? 'kcal' : selectedMetric === 'weight' ? 'kg' : selectedMetric === 'bodyFat' ? '%' : 'g'}</span>
                                        <span>{Math.round(Math.max(...historyData.map(d => d[selectedMetric] || 0), 1) * 0.5 * 100) / 100}{selectedMetric === 'calories' ? 'kcal' : selectedMetric === 'weight' ? 'kg' : selectedMetric === 'bodyFat' ? '%' : 'g'}</span>
                                        <span>{Math.round(Math.max(...historyData.map(d => d[selectedMetric] || 0), 1) * 0.25 * 100) / 100}{selectedMetric === 'calories' ? 'kcal' : selectedMetric === 'weight' ? 'kg' : selectedMetric === 'bodyFat' ? '%' : 'g'}</span>
                                        <span>0{selectedMetric === 'calories' ? 'kcal' : selectedMetric === 'weight' ? 'kg' : selectedMetric === 'bodyFat' ? '%' : 'g'}</span>
                                    </div>
                                    {/* X軸ラベル */}
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>{new Date(historyData[0]?.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</span>
                                        <span>{new Date(historyData[Math.floor(historyData.length / 2)]?.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</span>
                                        <span>{new Date(historyData[historyData.length - 1]?.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 履歴リスト（折りたたみ式） */}
                            <div className="space-y-3">
                                {historyData.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).filter(d => d.calories > 0).map((day, index) => {
                                    const isExpanded = expandedDates.has(day.date);
                                    return (
                                        <div key={index} className="bg-gray-50 rounded-xl border border-gray-200">
                                            <button
                                                onClick={() => {
                                                    const newExpanded = new Set(expandedDates);
                                                    if (isExpanded) {
                                                        newExpanded.delete(day.date);
                                                    } else {
                                                        newExpanded.add(day.date);
                                                    }
                                                    setExpandedDates(newExpanded);
                                                }}
                                                className="w-full p-4 flex justify-between items-center hover:bg-gray-100 transition rounded-xl"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon name={isExpanded ? "ChevronDown" : "ChevronRight"} size={20} className="text-gray-500" />
                                                    <h4 className="font-bold">
                                                        {new Date(day.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                                                    </h4>
                                                </div>
                                                <span className="text-sm font-bold text-indigo-600">
                                                    {Math.round(day.netCalories)}kcal
                                                </span>
                                            </button>

                                            {isExpanded && (
                                                <div className="px-4 pb-4 space-y-3">
                                                    {/* サマリー */}
                                                    <div className="grid grid-cols-2 gap-2 text-sm bg-white p-3 rounded-lg">
                                                        <div className="flex justify-between col-span-2">
                                                            <span className="text-gray-600 font-bold">総合スコア</span>
                                                            <span className="font-bold text-purple-600">{analyses[day.date]?.achievementRates?.overall || '-'}点</span>
                                                        </div>
                                                        <div className="flex justify-between col-span-2">
                                                            <span className="text-gray-600">摂取</span>
                                                            <span className="font-medium">{Math.round(day.calories)}kcal</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">タンパク質</span>
                                                            <span className="font-medium text-cyan-600">{day.protein.toFixed(1)}g</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">脂質</span>
                                                            <span className="font-medium text-yellow-600">{(day.fat || 0).toFixed(1)}g</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">炭水化物</span>
                                                            <span className="font-medium text-green-600">{(day.carbs || 0).toFixed(1)}g</span>
                                                        </div>
                                                        {day.weight && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">体重</span>
                                                                <span className="font-medium text-blue-600">{day.weight}kg</span>
                                                            </div>
                                                        )}
                                                        {day.bodyFat && (
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">体脂肪率</span>
                                                                <span className="font-medium text-orange-600">{day.bodyFat}%</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* 食事詳細 */}
                                                    {day.meals.length > 0 && (
                                                        <div className="bg-white p-3 rounded-lg">
                                                            <h5 className="font-bold text-sm mb-2 flex items-center gap-1">
                                                                <Icon name="Utensils" size={14} />
                                                                食事記録
                                                            </h5>
                                                            <div className="space-y-2">
                                                                {day.meals.map((meal, i) => (
                                                                    <div key={i} className="text-xs">
                                                                        <div className="font-medium">{meal.time} - {meal.name}</div>
                                                                        <div className="text-gray-600 ml-2">
                                                                            {meal.items?.map(item => item.name).join(', ') || '詳細なし'}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* トレーニング詳細 */}
                                                    {day.workouts.length > 0 && (
                                                        <div className="bg-white p-3 rounded-lg">
                                                            <h5 className="font-bold text-sm mb-2 flex items-center gap-1">
                                                                <Icon name="Dumbbell" size={14} />
                                                                トレーニング記録
                                                            </h5>
                                                            <div className="space-y-2">
                                                                {day.workouts.map((workout, i) => (
                                                                    <div key={i} className="text-xs">
                                                                        <div className="font-medium">{workout.name}</div>
                                                                        <div className="text-gray-600 ml-2">
                                                                            {workout.exercises?.length || 0}種目
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* コンディション */}
                                                    {day.conditions && (
                                                        <div className="bg-white p-3 rounded-lg">
                                                            <h5 className="font-bold text-sm mb-2 flex items-center gap-1">
                                                                <Icon name="Activity" size={14} />
                                                                コンディション
                                                            </h5>
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                <div>睡眠: {day.conditions.sleepHours || '-'}時間</div>
                                                                <div>疲労: {day.conditions.fatigue || '-'}</div>
                                                                <div>ストレス: {day.conditions.stress || '-'}</div>
                                                                <div>腸内環境: {day.conditions.gut || '-'}</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 指示書 */}
                                                    {day.directive && (
                                                        <button
                                                            onClick={() => {
                                                                alert(`📅 ${new Date(day.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })}の指示書\n\n${day.directive.message}\n\n${day.directive.completed ? '✅ 完了済み' : '⚠️ 未完了'}`);
                                                            }}
                                                            className={`w-full p-3 rounded-lg border-2 text-left hover:opacity-80 transition ${day.directive.completed ? 'bg-gray-50 border-gray-300' : 'bg-green-50 border-green-300'}`}
                                                        >
                                                            <h5 className="font-bold text-sm mb-2 flex items-center justify-between">
                                                                <div className="flex items-center gap-1">
                                                                    <Icon name="FileText" size={14} className={day.directive.completed ? "text-gray-500" : "text-green-600"} />
                                                                    <span className={day.directive.completed ? "text-gray-500 line-through" : "text-green-900"}>指示書</span>
                                                                </div>
                                                                {day.directive.completed && (
                                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                                        <Icon name="CheckCircle" size={12} />
                                                                        完了
                                                                    </span>
                                                                )}
                                                            </h5>
                                                            <p className={`text-xs whitespace-pre-wrap ${day.directive.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                                                {day.directive.message.length > 50 ? day.directive.message.substring(0, 50) + '...' : day.directive.message}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-1">タップして全文を表示</p>
                                                        </button>
                                                    )}

                                                    {/* 分析を見るボタン */}
                                                    <button
                                                        onClick={() => loadAnalysisForDate(day.date)}
                                                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2"
                                                    >
                                                        <Icon name="BarChart3" size={18} />
                                                        この日の分析を見る
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {historyData.filter(d => d.calories > 0).length === 0 && (
                                    <p className="text-center text-gray-500 py-12">この期間の記録はありません</p>
                                )}
                            </div>

                            {/* 統計情報 */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="font-bold">統計情報</h4>
                                    <button
                                        type="button"
                                        onClick={() => setInfoModal({
                                            show: true,
                                            title: '統計情報について',
                                            content: '現在カレンダーで選択されている期間の集計データが表示されます。\n\n• 平均カロリー: 期間内の総摂取カロリーを記録日数で割った平均値です。\n• 平均タンパク質: 期間内の総タンパク質摂取量を記録日数で割った平均値です。\n• 記録日数: 期間内で食事またはトレーニングが記録された日数を表します。'
                                        })}
                                        className="text-indigo-600 hover:text-indigo-800"
                                    >
                                        <Icon name="Info" size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">平均カロリー</p>
                                        <p className="text-xl font-bold text-indigo-600">
                                            {Math.round(historyData.reduce((sum, d) => sum + d.calories, 0) / historyData.length)}kcal
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">平均タンパク質</p>
                                        <p className="text-xl font-bold text-cyan-600">
                                            {(historyData.reduce((sum, d) => sum + d.protein, 0) / historyData.length).toFixed(1)}g
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">記録日数</p>
                                        <p className="text-xl font-bold text-green-600">
                                            {historyData.filter(d => d.calories > 0).length}日
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 分析モーダル */}
            {selectedDateAnalysis && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto slide-up">
                        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center z-10 rounded-t-2xl">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Icon name="BarChart3" size={20} />
                                {new Date(selectedDateAnalysis.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })}の分析
                            </h3>
                            <button onClick={() => setSelectedDateAnalysis(null)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition">
                                <Icon name="X" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {selectedDateAnalysis.error ? (
                                // エラー表示
                                <div className="text-center py-12">
                                    <Icon name="AlertCircle" size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-gray-600 mb-2 font-semibold">{selectedDateAnalysis.error}</p>
                                    <p className="text-sm text-gray-500">{selectedDateAnalysis.comment}</p>
                                </div>
                            ) : (
                                <>
                                    {/* 総合評価 */}
                                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 text-center border border-purple-200">
                                        <p className="text-sm text-gray-600 mb-2">総合達成率</p>
                                        <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-2">
                                            {selectedDateAnalysis.achievementRates.overall}%
                                        </p>
                                        <div className="flex items-center justify-center gap-2 mt-3">
                                            {selectedDateAnalysis.evaluation === 'excellent' && (
                                                <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                                    <Icon name="Star" size={14} />
                                                    優秀
                                                </span>
                                            )}
                                            {selectedDateAnalysis.evaluation === 'good' && (
                                                <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                                    <Icon name="ThumbsUp" size={14} />
                                                    良好
                                                </span>
                                            )}
                                            {selectedDateAnalysis.evaluation === 'moderate' && (
                                                <span className="px-4 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                                    <Icon name="Minus" size={14} />
                                                    普通
                                                </span>
                                            )}
                                            {selectedDateAnalysis.evaluation === 'poor' && (
                                                <span className="px-4 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                                    <Icon name="AlertTriangle" size={14} />
                                                    要改善
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* AIコメント */}
                                    {selectedDateAnalysis.aiComment && (
                                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                                            <h4 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                                                <Icon name="MessageSquare" size={18} className="text-purple-600" />
                                                AIコーチからの評価
                                            </h4>
                                            <div className="text-sm text-gray-700 leading-relaxed">
                                                <MarkdownRenderer text={selectedDateAnalysis.aiComment} />
                                            </div>
                                        </div>
                                    )}

                                    {/* 達成率詳細 */}
                                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                                        <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                                            <Icon name="Target" size={18} className="text-indigo-600" />
                                            栄養素別達成率
                                        </h4>
                                        <div className="space-y-4">
                                            {/* カロリー */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-gray-700">カロリー</span>
                                                    <span className="text-sm font-bold text-indigo-600">{selectedDateAnalysis.achievementRates.calories}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-indigo-600 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(selectedDateAnalysis.achievementRates.calories, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>実績: {selectedDateAnalysis.actual.calories}kcal</span>
                                                    <span>目標: {selectedDateAnalysis.target.calories}kcal</span>
                                                </div>
                                            </div>

                                            {/* タンパク質 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-gray-700">タンパク質</span>
                                                    <span className="text-sm font-bold text-cyan-600">{selectedDateAnalysis.achievementRates.protein}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-cyan-600 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(selectedDateAnalysis.achievementRates.protein, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>実績: {selectedDateAnalysis.actual.protein}g</span>
                                                    <span>目標: {selectedDateAnalysis.target.protein}g</span>
                                                </div>
                                            </div>

                                            {/* 脂質 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-gray-700">脂質</span>
                                                    <span className="text-sm font-bold text-yellow-600">{selectedDateAnalysis.achievementRates.fat}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-yellow-600 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(selectedDateAnalysis.achievementRates.fat, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>実績: {selectedDateAnalysis.actual.fat}g</span>
                                                    <span>目標: {selectedDateAnalysis.target.fat}g</span>
                                                </div>
                                            </div>

                                            {/* 炭水化物 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-medium text-gray-700">炭水化物</span>
                                                    <span className="text-sm font-bold text-green-600">{selectedDateAnalysis.achievementRates.carbs}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-green-600 h-2 rounded-full transition-all"
                                                        style={{ width: `${Math.min(selectedDateAnalysis.achievementRates.carbs, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>実績: {selectedDateAnalysis.actual.carbs}g</span>
                                                    <span>目標: {selectedDateAnalysis.target.carbs}g</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 改善アドバイス */}
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
                                        <h4 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                                            <Icon name="Lightbulb" size={18} className="text-amber-600" />
                                            改善アドバイス
                                        </h4>
                                        <p className="text-gray-700 leading-relaxed">{selectedDateAnalysis.improvement}</p>
                                    </div>

                                    {/* 生成日時 */}
                                    <div className="text-center text-xs text-gray-400">
                                        分析生成日時: {new Date(selectedDateAnalysis.generatedAt).toLocaleString('ja-JP')}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
