// ===== Analysis Components =====
const AnalysisView = ({ onClose, userId, userProfile, dailyRecord, targetPFC, setLastUpdate }) => {
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

    const handleClose = () => {
        if (aiLoading) {
            alert('AI分析が完了するまでお待ちください。');
            return;
        }
        onClose();
    };

    const performAnalysis = async () => {
        setLoading(true);

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

        generateAIAnalysis(analysisData, insights);
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
    const generateAIAnalysis = async (currentAnalysis, insights) => {
        setAiLoading(true);

        // 既存のAI分析をクリア
        setAiAnalysis(null);

        // 過去30日分のログデータを準備
        const dailyLogsForPrompt = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const record = await DataService.getDailyRecord(userId, dateStr);

            if (record && record.meals && record.meals.length > 0) {
                const totalProtein = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
                const totalFat = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
                const totalCarbs = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);
                const totalCalories = (record.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);

                dailyLogsForPrompt.push({
                    date: dateStr,
                    routine: record.routine || { type: "休息日", is_rest_day: true },
                    diet: {
                        protein_g: Math.round(totalProtein),
                        fat_g: Math.round(totalFat),
                        carbs_g: Math.round(totalCarbs),
                        total_calories: Math.round(totalCalories),
                        supplements: [] // サプリメントデータがあれば追加
                    },
                    workout: {
                        exercise_count: (record.workouts || []).length,
                        total_time_min: 0, // 必要に応じて計算
                        exercises: (record.workouts || []).map(w => w.name).join(', ')
                    },
                    condition: {
                        sleep_hours: record.conditions?.sleepHours || 0,
                        sleep_quality: record.conditions?.sleepQuality || 0,
                        appetite: record.conditions?.appetite || 0,
                        gut_health: record.conditions?.digestion || 0,
                        concentration: record.conditions?.focus || 0,
                        stress_level: record.conditions?.stress || 0
                    },
                    memo: record.notes || null
                });
            }
        }

        const promptData = {
            user_profile: {
                height_cm: userProfile.height || 170,
                weight_kg: userProfile.weight || 70,
                body_fat_percentage: userProfile.bodyFatPercentage || 15,
                lean_body_mass_kg: userProfile.leanBodyMass || 60,
                style: userProfile.style || "一般"
            },
            daily_logs: dailyLogsForPrompt
        };

        // セクション1: パフォーマンスレポート
        const section1Prompt = `## 役割とゴール

あなたは、トップアスリートから成長期の学生までを指導する、データサイエンティスト兼エリートパーソナルコーチです。
あなたの最重要ミッションは、ユーザーのLBM（除脂肪体重）を維持・向上させることです。

## インプットデータ

${JSON.stringify(promptData, null, 2)}

## タスク

最新日のデータを基に、本日のパフォーマンスレポートを生成してください。

### 出力形式（この形式を厳守）

① 本日のパフォーマンスレポート (スコア: [0-100の整数] 点)

評価:
- [ポジティブな評価点1を1文1行で記述]
- [ポジティブな評価点2を1文1行で記述]
- [ポジティブな評価点3を1文1行で記述]

改善提案:
- [今日の状態をさらに良くするための具体的アクションを1文1行で記述]

重要:
- 箇条書きには「-」のみを使用（アスタリスク不可）
- 評価点は3項目、各1文1行で完結
- 改善提案は1項目、1文1行で完結
- LBM至上主義: すべての評価はLBMを基準に
- 専門用語を避け、高校生にも理解できる言葉で
- 「承知いたしました」などの返答は不要
`;

        // セクション2: トレンド分析
        const section2Prompt = `## 役割とゴール

あなたは、データサイエンティスト兼エリートパーソナルコーチです。
ユーザーのLBM向上のため、過去のデータから勝ちパターンと負けパターンを分析します。

## インプットデータ

${JSON.stringify(promptData, null, 2)}

## データ不足時の対応

もし過去のdaily_logsが空または不足している場合:
- 「現時点では過去データが不足しているため、トレンド分析はできません」と正直に伝える
- データが蓄積された後に分析できることを説明する
- 今後のデータ記録を続けることを推奨する

## タスク

過去30日分のデータを基に、中長期トレンド分析を生成してください。
データが十分にある場合のみ、パターン分析を行ってください。

### 出力形式（この形式を厳守）

② 中長期トレンド分析 (LBM向上への道筋)

📈 過去7日間の勝ちパターン:
- [相関関係に基づき、パフォーマンスが良かった際の共通点を記述]
- [もう一つの共通点を記述]

📉 過去30日間の負けパターン:
- [相関関係に基づき、パフォーマンスが低下した際の共通点を記述]
- [もう一つの共通点を記述]

重要:
- 箇条書きには「-」のみを使用（アスタリスク不可）
- 各項目は1文1行で完結
- ルーティン（例：「脚の日」「胸の日」）による違いを考慮
- 観測可能な事実と結果の相関関係に焦点を当てる
- 「承知いたしました」などの返答は不要
- 簡潔に記述
`;

        // セクション3: 指示書プラン生成
        const section3Prompt = `## 役割とゴール

あなたは、エリートパーソナルコーチです。
ユーザーのLBM向上のため、明日実行すべき具体的なアクションプランを1行で提案します。

## インプットデータ

${JSON.stringify(promptData, null, 2)}

${dailyRecord.notes ? `
## ユーザーの気づき

ユーザーは「${dailyRecord.notes}」という気づきを記録しています。
この気づきを最大限に尊重し、仮説検証をサポートする形で提案してください。
` : ''}

## タスク

過去のデータ分析と最新の状態を踏まえ、明日実行すべき指示書プランを1行で生成してください。

### 出力形式（この形式を厳守）

③ 明日の指示書プラン

- [食事/運動/睡眠のいずれかのカテゴリーに関する、具体的で実行可能な1行のアクションプラン]

例:
- 【食事】夕食に鶏むね肉150gを追加してタンパク質を目標値に近づける
- 【運動】ベンチプレス80kg×8回×3セットで胸のトレーニングを行う
- 【睡眠】23時までに就寝して8時間睡眠を確保する

重要:
- 必ず【カテゴリー】を先頭につける
- 1行で完結させる（改行不可）
- 具体的な数値を含める
- 実行可能で明確な指示にする
- 箇条書きには「-」のみを使用（アスタリスク不可）
- 「承知いたしました」などの返答は不要
`;

        try {
            let fullAnalysis = '';

            // セクション1: パフォーマンスレポートを生成
            const response1 = await GeminiAPI.sendMessage(section1Prompt, [], userProfile, 'gemini-2.5-pro');
            if (response1.success) {
                fullAnalysis += response1.text + '\n\n---\n\n';
                setAiAnalysis(fullAnalysis);
            } else {
                throw new Error(response1.error || 'セクション1の生成に失敗');
            }

            // セクション2: トレンド分析を生成
            const response2 = await GeminiAPI.sendMessage(section2Prompt, [], userProfile, 'gemini-2.5-pro');
            if (response2.success) {
                fullAnalysis += response2.text + '\n\n---\n\n';
                setAiAnalysis(fullAnalysis);
            } else {
                throw new Error(response2.error || 'セクション2の生成に失敗');
            }

            // セクション3: 指示書プランを生成
            const response3 = await GeminiAPI.sendMessage(section3Prompt, [], userProfile, 'gemini-2.5-pro');
            if (response3.success) {
                fullAnalysis += response3.text;
                setAiAnalysis(fullAnalysis);

                // AI分析の結果をLocalStorageに永続化
                const today = getTodayDate();
                const analyses = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ANALYSES) || '{}');
                if (analyses[today]) {
                    analyses[today].aiComment = fullAnalysis;
                    localStorage.setItem(STORAGE_KEYS.DAILY_ANALYSES, JSON.stringify(analyses));
                }

                // 指示書プランを翌日の指示書として保存
                const directiveText = response3.text;
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
                throw new Error(response3.error || 'セクション3の生成に失敗');
            }
        } catch (error) {
            console.error('AI分析エラー:', error);
            setAiAnalysis('申し訳ございません。AI分析の生成中に問題が発生しました。\n\nエラー内容: ' + error.message + '\n\nしばらく時間をおいて、「再生成」ボタンをタップしてお試しください。');
        }

        setAiLoading(false);
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

        try {
            // 過去30日分のログデータを準備（Q&A用）
            const dailyLogsForQA = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const record = await DataService.getDailyRecord(userId, dateStr);

                if (record && record.meals && record.meals.length > 0) {
                    const totalProtein = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.protein || 0), 0), 0);
                    const totalFat = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.fat || 0), 0), 0);
                    const totalCarbs = (record.meals || []).reduce((sum, m) => sum + (m.items || []).reduce((s, i) => s + (i.carbs || 0), 0), 0);
                    const totalCalories = (record.meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);

                    dailyLogsForQA.push({
                        date: dateStr,
                        routine: record.routine || { type: "休息日", is_rest_day: true },
                        diet: {
                            protein_g: Math.round(totalProtein),
                            fat_g: Math.round(totalFat),
                            carbs_g: Math.round(totalCarbs),
                            total_calories: Math.round(totalCalories)
                        },
                        workout: {
                            exercise_count: (record.workouts || []).length,
                            exercises: (record.workouts || []).map(w => w.name).join(', ')
                        },
                        condition: {
                            sleep_hours: record.conditions?.sleepHours || 0,
                            sleep_quality: record.conditions?.sleepQuality || 0,
                            appetite: record.conditions?.appetite || 0,
                            gut_health: record.conditions?.digestion || 0,
                            concentration: record.conditions?.focus || 0,
                            stress_level: record.conditions?.stress || 0
                        },
                        memo: record.notes || null
                    });
                }
            }

            const qaPromptData = {
                user_profile: {
                    height_cm: userProfile.height || 170,
                    weight_kg: userProfile.weight || 70,
                    body_fat_percentage: userProfile.bodyFatPercentage || 15,
                    lean_body_mass_kg: userProfile.leanBodyMass || 60,
                    style: userProfile.style || "一般"
                },
                daily_logs: dailyLogsForQA
            };

            // 文脈を含むプロンプトを作成
            const contextPrompt = `## 役割
あなたは、ユーザーの質問に答える、親身で優秀なAIパフォーマンスコーチです。

## 文脈
あなたは以前、以下のユーザーデータに基づいて、下記の「AIコーチングレポート」を生成しました。この会話は、そのレポートに関するユーザーからの質問です。

### ユーザープロファイルと全データ
${JSON.stringify(qaPromptData, null, 2)}

### あなたが生成したレポート
${aiAnalysis || '（レポート生成中または未生成）'}

## ユーザーからの質問
「${question}」

## タスク
上記の文脈をすべて踏まえ、ユーザーの質問に対して、専門用語を避け、高校生にも理解できるような言葉で、簡潔かつ丁寧な回答を生成してください。
`;

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
                <button onClick={() => generateAIAnalysis(analysis, historicalInsights)} className="text-white">
                    <Icon name="RefreshCw" size={20} />
                </button>
            </header>

            <div className="p-4 flex-grow overflow-y-auto space-y-3">
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

            {/* 質問入力エリア（固定） */}
            {!aiLoading && aiAnalysis && (
                <div className="border-t bg-white p-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
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
                            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icon name="Send" size={20} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        💡 例: 「タンパク質が不足する原因は？」「この改善提案をもっと詳しく教えて」
                    </p>
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
        userProfile.leanBodyMass || 60
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
