// ===== Your Coach+ Beta - All Components =====
// このファイルは全てのReactコンポーネントを読み込みます

const { useState, useEffect, useRef, useCallback } = React;

// ===== Firebase初期化 =====
const firebaseConfig = {
    apiKey: "AIzaSyDtdRgSvHeFgWQczUH9o_8MRnZqNGn9eBw",
    authDomain: "yourcoach-c1f28.firebaseapp.com",
    projectId: "yourcoach-c1f28",
    storageBucket: "yourcoach-c1f28.firebasestorage.app",
    messagingSenderId: "366193088662",
    appId: "1:366193088662:web:4eb24b2cc84dbdd39e6bb2",
    measurementId: "G-1NLXFYDCJF"
};

let auth, db, storage, functions;
if (!DEV_MODE) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    functions = firebase.functions();
}

// ===== Utility Components (Icon, MarkdownRenderer) =====
// ===== Utility Components =====
// Extracted from index_beta.html
// These components can be loaded via <script type="text/babel"> tag

// ===== Icon Component =====
// Lucide icon wrapper with dynamic rendering
// Usage: <Icon name="ChevronDown" size={24} className="my-class" />
const Icon = ({ name, className = '', size = 24, fill = 'none', ...otherProps }) => {
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        if (!containerRef.current || !window.lucide) return;

        const kebabName = name.split('').map((char) => {
            if (char === char.toUpperCase() && char !== char.toLowerCase()) {
                return '-' + char.toLowerCase();
            }
            return char;
        }).join('').replace(/^-/, '');

        containerRef.current.innerHTML = '';
        const iconElement = document.createElement('i');
        iconElement.setAttribute('data-lucide', kebabName);
        containerRef.current.appendChild(iconElement);

        window.lucide.createIcons({
            icons: window.lucide,
            attrs: {
                'stroke-width': 2,
                width: size,
                height: size,
                fill: fill
            }
        });

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [name, size, fill]);

    return <span ref={containerRef} className={className} style={{ display: 'inline-flex', alignItems: 'center' }} {...otherProps} />;
};

// ===== MarkdownRenderer Component =====
// Simple markdown to HTML converter
// Supports: **bold**, *italic*, and line breaks
// Usage: <MarkdownRenderer text="**Bold** and *italic* text" />
const MarkdownRenderer = ({ text }) => {
    if (!text) return null;
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
    return <div dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, '<br />') }} />;
};
// ===== Authentication and Onboarding Components =====
// Extracted from index_beta.html
// For use with <script type="text/babel"> tag

// ===== ログイン画面 =====
const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md slide-up">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Coach+</h1>
                    <p className="text-gray-600">LBMを中心とした科学的な体づくり</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                    >
                        {isSignUp ? 'アカウント作成' : 'ログイン'}
                    </button>
                </form>

                <div className="mt-4">
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                        <Icon name="Chrome" size={20} />
                        Googleでログイン
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                        {isSignUp ? 'すでにアカウントをお持ちの方' : 'アカウントをお持ちでない方'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ===== オンボーディング画面 =====
const OnboardingScreen = ({ user, onComplete }) => {
    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState({
        nickname: '',
        gender: '男性',
        age: 25,
        height: 170,
        weight: 70,
        bodyFatPercentage: 15,
        activityLevel: 3,
        purpose: 'メンテナンス',
        weightChangePace: 0
    });

    const handleComplete = async () => {
        const lbm = LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage);
        const bmr = LBMUtils.calculateBMR(lbm);
        const tdeeBase = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier);

        const completeProfile = {
            ...profile,
            leanBodyMass: lbm,
            bmr: bmr,
            tdeeBase: tdeeBase,
            joinDate: new Date().toISOString()
        };

        await DataService.saveUserProfile(user.uid, completeProfile);
        if (onComplete) onComplete(completeProfile);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl slide-up">
                <h2 className="text-2xl font-bold mb-6">プロフィール設定 ({step}/3)</h2>

                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">ニックネーム</label>
                            <input
                                type="text"
                                value={profile.nickname}
                                onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                                className="w-full px-4 py-3 border rounded-lg"
                                placeholder="例: トレーニー太郎"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">性別</label>
                            <select
                                value={profile.gender}
                                onChange={(e) => setProfile({...profile, gender: e.target.value})}
                                className="w-full px-4 py-3 border rounded-lg"
                            >
                                <option value="男性">男性</option>
                                <option value="女性">女性</option>
                                <option value="その他">その他</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">食文化</label>
                            <p className="text-xs text-gray-600 mb-2">
                                あなたの食生活に近いものを複数選択してください。好みに合った、継続しやすい食材を優先的に提案します。
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {['アジア', '欧米', 'ラテン', 'その他'].map(culture => (
                                    <label key={culture} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={(profile.culturalRoots || []).includes(culture)}
                                            onChange={(e) => {
                                                const roots = profile.culturalRoots || [];
                                                if (e.target.checked) {
                                                    setProfile({...profile, culturalRoots: [...roots, culture]});
                                                } else {
                                                    setProfile({...profile, culturalRoots: roots.filter(r => r !== culture)});
                                                }
                                            }}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{culture}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">年齢</label>
                            <input
                                type="number"
                                value={profile.age}
                                onChange={(e) => setProfile({...profile, age: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-4 py-3 border rounded-lg"
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">身長 (cm)</label>
                            <input
                                type="number"
                                value={profile.height}
                                onChange={(e) => setProfile({...profile, height: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-4 py-3 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">体重 (kg)</label>
                            <input
                                type="number"
                                value={profile.weight}
                                onChange={(e) => setProfile({...profile, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-4 py-3 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">体脂肪率 (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={profile.bodyFatPercentage}
                                onChange={(e) => setProfile({...profile, bodyFatPercentage: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-4 py-3 border rounded-lg"
                            />
                            <p className="text-sm text-gray-500 mt-1">不明な場合は推定値でOKです</p>
                        </div>
                        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                            <p className="text-sm font-medium text-cyan-800">計算結果</p>
                            <p className="text-2xl font-bold text-cyan-900 mt-2">
                                LBM: {LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage).toFixed(1)} kg
                            </p>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                生活スタイル
                                <button
                                    type="button"
                                    onClick={() => setInfoModal({
                                        show: true,
                                        title: '活動レベル係数とは？',
                                        content: `あなたの日常生活がどれだけ活動的かを数値化したものです。この係数を基礎代謝量に掛けることで、1日の大まかな消費カロリー（TDEE）を算出します。

【重要】
これはあくまで日常生活の活動量であり、トレーニングによる消費カロリーは、より精密な『PG式』で別途計算されます。より正確な設定をしたい方は、係数を直接入力することも可能です。`
                                    })}
                                    className="text-indigo-600 hover:text-indigo-800"
                                >
                                    <Icon name="Info" size={16} />
                                </button>
                            </label>
                            <select
                                value={profile.activityLevel}
                                onChange={(e) => setProfile({...profile, activityLevel: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-4 py-3 border rounded-lg"
                            >
                                <option value={1}>デスクワーク中心</option>
                                <option value={2}>立ち仕事が多い</option>
                                <option value={3}>軽い肉体労働</option>
                                <option value={4}>重い肉体労働</option>
                                <option value={5}>非常に激しい肉体労働</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">目的</label>
                            <select
                                value={profile.purpose}
                                onChange={(e) => {
                                    const purpose = e.target.value;
                                    let pace = 0;
                                    if (purpose === '減量') pace = -1;
                                    else if (purpose === '増量') pace = 1;
                                    setProfile({...profile, purpose, weightChangePace: pace});
                                }}
                                className="w-full px-4 py-3 border rounded-lg"
                            >
                                <option value="減量">減量（脂肪を落とす）</option>
                                <option value="メンテナンス">現状維持</option>
                                <option value="増量">増量（筋肉をつける）</option>
                            </select>
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                            <p className="text-sm font-medium text-indigo-800">あなたの目標</p>
                            <p className="text-2xl font-bold text-indigo-900 mt-2">
                                {LBMUtils.calculateTargetPFC(
                                    LBMUtils.calculateTDEE(
                                        LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage),
                                        profile.activityLevel
                                    ),
                                    profile.weightChangePace,
                                    LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage)
                                ).calories} kcal/日
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 mt-8">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
                        >
                            戻る
                        </button>
                    )}
                    {step < 3 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700"
                        >
                            次へ
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700"
                        >
                            開始する
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
// ===== ダッシュボード表示 =====
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

    // トレーニング消費カロリー
    const totalBurned = dailyRecord.workouts?.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0) || 0;

    // DIT（食事誘発性熱産生）の計算
    const dit = (currentIntake.protein * 4 * 0.30) + (currentIntake.fat * 9 * 0.04) + (currentIntake.carbs * 4 * 0.06);

    // EPOC（運動後過剰酸素消費）の計算
    const epoc = totalBurned * 0.10;

    // 総消費カロリー = 運動消費 + DIT + EPOC
    const totalExpenditure = totalBurned + dit + epoc;

    // currentIntakeにDIT/EPOC/totalExpenditureを追加
    currentIntake.dit = dit;
    currentIntake.epoc = epoc;
    currentIntake.totalExpenditure = totalExpenditure;

    // 純摂取 = 摂取 - 運動消費
    const netCalories = currentIntake.calories - totalBurned;
    // 実質摂取 = 摂取 - (運動消費 + DIT + EPOC)
    const effectiveCalories = currentIntake.calories - totalExpenditure;
    const caloriesPercent = (effectiveCalories / targetPFC.calories) * 100;
    const proteinPercent = (currentIntake.protein / targetPFC.protein) * 100;

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
                                <span className="font-medium">カロリー収支</span>
                                <button
                                    onClick={() => setInfoModal({
                                        show: true,
                                        title: '💡 カロリー収支の詳細',
                                        content: `【摂取カロリー】
食事とサプリメントから摂取したカロリー
${currentIntake.calories} kcal

━━━━━━━━━━━━━━━━━━━━━━

【消費カロリー内訳】

• 運動消費: ${totalBurned} kcal

• DIT (食事誘発性熱産生): ${Math.round(currentIntake.dit || 0)} kcal
  → 食事を消化・吸収する際に消費されるエネルギー
  → P: 30%, F: 4%, C: 6%

• EPOC (運動後過剰酸素消費): ${Math.round(currentIntake.epoc || 0)} kcal
  → 運動後の代謝亢進による追加消費
  → 運動消費の約10%

総消費: ${Math.round(totalExpenditure)} kcal

━━━━━━━━━━━━━━━━━━━━━━

【収支計算】

純摂取 (摂取 - 運動): ${netCalories} kcal

実質摂取 (摂取 - 総消費): ${Math.round(effectiveCalories)} kcal
※実質摂取が体内に蓄積される正味のカロリーです`
                                    })}
                                    className="text-indigo-600 hover:text-indigo-800"
                                >
                                    <Icon name="Info" size={16} />
                                </button>
                            </div>
                            <div className="text-sm text-right">
                                <div className="font-bold text-gray-800">
                                    {Math.round(effectiveCalories)} / {targetPFC.calories} kcal
                                </div>
                            </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                                style={{ width: `${Math.min((effectiveCalories / targetPFC.calories) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            実質摂取カロリー = 摂取 - (運動 + DIT + EPOC)
                        </p>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">タンパク質 (P)</span>
                            <span className="text-sm text-gray-600">
                                {currentIntake.protein.toFixed(1)} / {targetPFC.protein} g
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                                style={{ width: `${Math.min(proteinPercent, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">脂質 (F)</span>
                            <span className="text-sm text-gray-600">
                                {currentIntake.fat.toFixed(1)} / {targetPFC.fat} g
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-500 to-orange-600 transition-all duration-500"
                                style={{ width: `${Math.min((currentIntake.fat / targetPFC.fat) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="font-medium">炭水化物 (C)</span>
                            <span className="text-sm text-gray-600">
                                {currentIntake.carbs.toFixed(1)} / {targetPFC.carbs} g
                            </span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
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
// ===== チュートリアルビュー =====
const TutorialView = ({ onClose, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = TUTORIAL_STEPS.length;
    const step = TUTORIAL_STEPS[currentStep];

    const handleNext = () => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        localStorage.setItem(STORAGE_KEYS.TUTORIAL_COMPLETED, 'skipped');
        onClose();
    };

    const handleComplete = () => {
        localStorage.setItem(STORAGE_KEYS.TUTORIAL_COMPLETED, 'true');

        // バッジ授与
        const badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');
        if (!badges.find(b => b.id === BADGES.TUTORIAL_COMPLETE.id)) {
            badges.push({
                ...BADGES.TUTORIAL_COMPLETE,
                earnedAt: new Date().toISOString()
            });
            localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
        }

        onComplete();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                {/* ヘッダー */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <Icon name={step.icon} size={32} />
                            <div>
                                <h2 className="text-xl font-bold">{step.title}</h2>
                                <p className="text-sm opacity-90">
                                    {currentStep + 1} / {totalSteps}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleSkip} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition">
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    {/* プログレスバー */}
                    <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
                        <div
                            className="bg-white h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* コンテンツ */}
                <div className="p-6">
                    <div className="whitespace-pre-line text-gray-700 text-base leading-relaxed mb-6">
                        {step.content}
                    </div>

                    {/* ステージバッジ */}
                    <div className="flex items-center gap-2 mb-6">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                            step.stage === '守' ? 'bg-green-100 text-green-700' :
                            step.stage === '破' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                        }`}>
                            {step.stage}
                        </span>
                        <span className="text-xs text-gray-500">
                            {step.stage === '守' ? '基礎を学ぶ' :
                             step.stage === '破' ? '応用・カスタマイズ' :
                             '独自の方法を確立'}
                        </span>
                    </div>

                    {/* ナビゲーションボタン */}
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrevious}
                                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            >
                                <Icon name="ChevronLeft" size={20} className="inline mr-1" />
                                戻る
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition font-bold"
                        >
                            {currentStep === totalSteps - 1 ? '完了' : '次へ'}
                            {currentStep < totalSteps - 1 && <Icon name="ChevronRight" size={20} className="inline ml-1" />}
                        </button>
                    </div>

                    {/* スキップボタン */}
                    {currentStep < totalSteps - 1 && (
                        <button
                            onClick={handleSkip}
                            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            チュートリアルをスキップ
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ===== 設定画面 =====
const SettingsView = ({ onClose, userProfile, onUpdateProfile, userId, usageDays, unlockedFeatures, onOpenAddView, darkMode, onToggleDarkMode }) => {
    const [profile, setProfile] = useState({...userProfile});
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'data', 'advanced'
    const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
    const [customMultiplierInputValue, setCustomMultiplierInputValue] = useState('');
    const [infoModal, setInfoModal] = useState({ show: false, title: '', content: '' });
    const [visualGuideModal, setVisualGuideModal] = useState({ show: false, gender: '男性', selectedLevel: 5 });

    // 詳細設定用のstate（デフォルト値をプロフィールから取得）
    const [advancedSettings, setAdvancedSettings] = useState({
        proteinCoefficient: userProfile.proteinCoefficient || 2.5,
        fatRatio: userProfile.fatRatio || 0.25,
        ageProteinBoost: userProfile.ageProteinBoost !== undefined ? userProfile.ageProteinBoost : true,
        bodymakerBoost: userProfile.bodymakerBoost !== undefined ? userProfile.bodymakerBoost : true,
        trainingBoost: userProfile.trainingBoost !== undefined ? userProfile.trainingBoost : true,
        sleepAdjustment: userProfile.sleepAdjustment !== undefined ? userProfile.sleepAdjustment : true,
        stressAdjustment: userProfile.stressAdjustment !== undefined ? userProfile.stressAdjustment : true
    });
    const [localRoutines, setLocalRoutines] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.ROUTINES);
        return saved ? JSON.parse(saved) : [];
    });
    const [mealTemplates, setMealTemplates] = useState([]);
    const [workoutTemplates, setWorkoutTemplates] = useState([]);
    const [supplementTemplates, setSupplementTemplates] = useState([]);

    // テンプレート読み込み
    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        const meals = await DataService.getMealTemplates(userId);
        const workouts = await DataService.getWorkoutTemplates(userId);
        const supplements = await DataService.getSupplementTemplates(userId);
        setMealTemplates(meals);
        setWorkoutTemplates(workouts);
        setSupplementTemplates(supplements);
    };

    const handleSave = () => {
        // LBM再計算
        const lbm = LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage);
        const bmr = LBMUtils.calculateBMR(lbm);
        const tdeeBase = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier);

        const updatedProfile = {
            ...profile,
            ...advancedSettings, // 詳細設定を統合
            leanBodyMass: lbm,
            bmr: bmr,
            tdeeBase: tdeeBase
        };

        onUpdateProfile(updatedProfile);
        onClose();
    };

    const handleExportData = async () => {
        // 全データ取得
        const allData = {
            profile: userProfile,
            records: {}
        };

        // 過去30日分のデータを取得
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const record = await DataService.getDailyRecord(userId, dateStr);
            if (record) {
                allData.records[dateStr] = record;
            }
        }

        // JSONダウンロード
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `yourcoach_data_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleClearData = () => {
        if (confirm('本当に全データを削除しますか？この操作は取り消せません。')) {
            localStorage.clear();
            alert('データを削除しました。ページをリロードしてください。');
        }
    };

    return (
        <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto slide-up">
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                    <h3 className="text-lg font-bold">設定</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <Icon name="X" size={20} />
                    </button>
                </div>

                {/* 設定メニュー（折りたたみ式一覧） */}
                <div className="p-6 space-y-3">
                    {/* 使い方 */}
                    <details className="border rounded-lg border-indigo-300 bg-indigo-50">
                        <summary className="cursor-pointer p-4 hover:bg-indigo-100 font-medium flex items-center gap-2">
                            <Icon name="BookOpen" size={18} className="text-indigo-600" />
                            使い方
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t border-indigo-200">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-700 font-semibold">YourCoachの基本フロー</p>

                                {/* フローチャート */}
                                <div className="bg-white p-4 rounded-lg border-2 border-indigo-200 space-y-3">
                                    {/* ステップ1 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                        <div>
                                            <p className="font-bold text-indigo-900">プロフィール設定</p>
                                            <p className="text-xs text-gray-600">体重・体脂肪率・目的を入力 → LBM自動計算 → 個別化基準値決定</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ2 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                        <div>
                                            <p className="font-bold text-indigo-900">毎日の記録</p>
                                            <p className="text-xs text-gray-600">食事・トレーニング・サプリを記録 → PFC・ビタミン・ミネラル自動集計</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ3 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                        <div>
                                            <p className="font-bold text-indigo-900">達成状況を確認</p>
                                            <p className="text-xs text-gray-600">ダッシュボードで目標値との比較 → 不足栄養素を特定</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ4 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                                        <div>
                                            <p className="font-bold text-indigo-900">調整・最適化</p>
                                            <p className="text-xs text-gray-600">食事内容を調整 → 1-12週間サイクルで継続</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ5 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">✓</div>
                                        <div>
                                            <p className="font-bold text-green-900">目標達成</p>
                                            <p className="text-xs text-gray-600">理想の身体へ！365日継続でキープ</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 守破離システム説明 */}
                                <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 p-4 rounded-lg border border-gray-200">
                                    <p className="font-bold text-sm mb-2 flex items-center gap-2">
                                        <Icon name="TrendingUp" size={16} />
                                        守破離システム
                                    </p>
                                    <div className="space-y-2 text-xs">
                                        <p><span className="font-bold text-green-700">守(0-9日)</span>: 基礎記録機能で習慣化</p>
                                        <p><span className="font-bold text-blue-700">破(10-17日)</span>: AIコーチ・分析機能が開放</p>
                                        <p><span className="font-bold text-purple-700">離(18日~)</span>: 全機能開放、独自メソッド確立</p>
                                    </div>
                                </div>

                                {/* ポイント */}
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <p className="font-bold text-yellow-900 text-xs mb-1">💡 重要ポイント</p>
                                    <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                                        <li>基準値はLBM・血液型・目的で完全個別化</li>
                                        <li>筋肉の新陳代謝周期は50日、焦らず継続</li>
                                        <li>テンプレート・ルーティン機能で効率化</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </details>
{/* 表示設定 */}                    <details className="border rounded-lg border-gray-300 bg-gray-50">                        <summary className="cursor-pointer p-4 hover:bg-gray-100 font-medium flex items-center gap-2">                            <Icon name="Monitor" size={18} className="text-gray-600" />                            表示設定                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />                        </summary>                        <div className="p-4 pt-0 border-t border-gray-200">                            <div className="space-y-4">                                {/* ダークモード切り替え */}                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">                                    <div className="flex items-center gap-3">                                        <Icon name={darkMode ? "Moon" : "Sun"} size={20} className={darkMode ? "text-indigo-600" : "text-yellow-600"} />                                        <div>                                            <p className="font-medium">{darkMode ? "ダークモード" : "ライトモード"}</p>                                            <p className="text-xs text-gray-500">画面の配色を切り替え</p>                                        </div>                                    </div>                                    <button                                        onClick={onToggleDarkMode}                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? "bg-indigo-600" : "bg-gray-300"}`}                                    >                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? "translate-x-6" : "translate-x-1"}`} />                                    </button>                                </div>                            </div>                        </div>                    </details>

                    {/* プロフィール */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="User" size={18} className="text-indigo-600" />
                            プロフィール
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            {/* プロフィール内容 */}
                            <div className="space-y-3">
                            {/* 基本情報 */}
                            <details className="border rounded-lg" style={{marginTop: '1.5rem'}}>
                                <summary className="cursor-pointer p-3 hover:bg-gray-50 font-medium flex items-center gap-2">
                                    <Icon name="User" size={16} />
                                    基本情報
                                </summary>
                                <div className="p-4 pt-0 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">ニックネーム</label>
                                        <input
                                            type="text"
                                            value={profile.nickname}
                                            onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                                            className="w-full px-4 py-3 border rounded-lg"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">年齢</label>
                                            <input
                                                type="number"
                                                value={profile.age}
                                                onChange={(e) => setProfile({...profile, age: e.target.value === '' ? '' : e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">性別</label>
                                            <select
                                                value={profile.gender}
                                                onChange={(e) => setProfile({...profile, gender: e.target.value})}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            >
                                                <option value="男性">男性</option>
                                                <option value="女性">女性</option>
                                                <option value="その他">その他</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">食文化</label>
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-600">
                                                あなたの食生活に近いものを複数選択してください。好みに合った、継続しやすい食材を優先的に提案します。
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {['アジア', '欧米', 'ラテン', 'その他'].map(culture => (
                                                    <label key={culture} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                                                        <input
                                                            type="checkbox"
                                                            checked={(profile.culturalRoots || []).includes(culture)}
                                                            onChange={(e) => {
                                                                const roots = profile.culturalRoots || [];
                                                                if (e.target.checked) {
                                                                    setProfile({...profile, culturalRoots: [...roots, culture]});
                                                                } else {
                                                                    setProfile({...profile, culturalRoots: roots.filter(r => r !== culture)});
                                                                }
                                                            }}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm">{culture}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">スタイル</label>
                                        <select
                                            value={profile.style || '一般'}
                                            onChange={(e) => setProfile({...profile, style: e.target.value})}
                                            className="w-full px-4 py-3 border rounded-lg"
                                        >
                                            <option value="一般">一般</option>
                                            <option value="ボディメイカー">ボディメイカー</option>
                                        </select>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {profile.style === 'ボディメイカー' ? '高タンパク・精密な栄養管理基準' : '標準的な栄養基準'}
                                        </p>
                                    </div>
                                </div>
                            </details>


                            {/* 体組成 */}
                            <details className="border rounded-lg">
                                <summary className="cursor-pointer p-3 hover:bg-gray-50 font-medium flex items-center gap-2">
                                    <Icon name="Activity" size={16} />
                                    体組成
                                </summary>
                                <div className="p-4 pt-0 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">身長 (cm)</label>
                                            <input
                                                type="number"
                                                value={profile.height}
                                                onChange={(e) => setProfile({...profile, height: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">体重 (kg)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={profile.weight}
                                                onChange={(e) => setProfile({...profile, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            体脂肪率 (%)
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'LBM（除脂肪体重）とは？',
                                                    content: `体重から脂肪の重さを除いた、筋肉や骨、内臓などの総量です。身体を動かすエンジンのようなものであり、基礎代謝量を決定する最も重要な指標です。

『Your Coach+』では、身長と体重のみで算出されるBMIを完全に排除し、あなたの身体の「質」を正しく評価するために、すべての計算基準にLBMを採用しています。

【体組成の測定方法】
**体組成計での測定を強く推奨します**

• ジムの体組成計（InBodyなど）
  → 最も正確。多くのジムで無料測定可能
• 家庭用体組成計
  → 手軽で毎日測定可能（例: タニタ、オムロン）
• 測定タイミング
  → 朝、起床後・トイレ後・空腹時に測定

【計算式】
LBM = 体重 × (1 - 体脂肪率 / 100)

例: 体重70kg、体脂肪率15%の場合
LBM = 70 × (1 - 0.15) = 59.5kg

**重要**: 正確な体脂肪率の測定が、PFCバランスの精度を大きく左右します。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setVisualGuideModal({
                                                    show: true,
                                                    gender: profile.gender || '男性',
                                                    selectedLevel: 5
                                                })}
                                                className="text-orange-600 hover:text-orange-800"
                                                title="外見から推定"
                                            >
                                                <Icon name="Eye" size={16} />
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={profile.bodyFatPercentage}
                                            onChange={(e) => setProfile({...profile, bodyFatPercentage: e.target.value === '' ? '' : Number(e.target.value)})}
                                            className="w-full px-4 py-3 border rounded-lg"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            <Icon name="Eye" size={12} className="inline" /> = 体組成計がない場合は外見から推定できます
                                        </p>
                                    </div>
                                </div>
                            </details>

                            {/* 活動レベル・目的 */}
                            <details className="border rounded-lg">
                                <summary className="cursor-pointer p-3 hover:bg-gray-50 font-medium flex items-center gap-2">
                                    <Icon name="Target" size={16} />
                                    活動レベル・目的
                                </summary>
                                <div className="p-4 pt-0 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            生活スタイル
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '活動レベル係数とは？',
                                                    content: `あなたの日常生活がどれだけ活動的かを数値化したものです。この係数を基礎代謝量に掛けることで、1日の大まかな消費カロリー（TDEE）を算出します。

【重要】
これはあくまで日常生活の活動量であり、トレーニングによる消費カロリーは、より精密な『PG式』で別途計算されます。より正確な設定をしたい方は、係数を直接入力することも可能です。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={16} />
                                            </button>
                                        </label>
                                        {!profile.customActivityMultiplier && (
                                            <select
                                                value={profile.activityLevel}
                                                onChange={(e) => setProfile({...profile, activityLevel: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border rounded-lg"
                                                disabled={profile.customActivityMultiplier}
                                            >
                                                <option value={1}>デスクワーク中心 - 1.05x</option>
                                                <option value={2}>立ち仕事が多い - 1.225x</option>
                                                <option value={3}>軽い肉体労働 - 1.4x</option>
                                                <option value={4}>重い肉体労働 - 1.575x</option>
                                                <option value={5}>非常に激しい肉体労働 - 1.75x</option>
                                            </select>
                                        )}
                                        {profile.customActivityMultiplier && (
                                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                <p className="text-sm text-indigo-800">
                                                    カスタム係数: <span className="font-bold">{profile.customActivityMultiplier}x</span>
                                                </p>
                                            </div>
                                        )}
                                        {showCustomMultiplierInput && !profile.customActivityMultiplier && (
                                            <div className="mt-2 p-3 bg-gray-50 border rounded-lg space-y-2">
                                                <label className="block text-sm font-medium">係数を入力 (1.0〜2.5)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1.0"
                                                    max="2.5"
                                                    value={customMultiplierInputValue}
                                                    onChange={(e) => setCustomMultiplierInputValue(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                    placeholder="例: 1.45"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const value = parseFloat(customMultiplierInputValue);
                                                            if (!isNaN(value) && value >= 1.0 && value <= 2.5) {
                                                                setProfile({...profile, customActivityMultiplier: value});
                                                                setShowCustomMultiplierInput(false);
                                                                setCustomMultiplierInputValue('');
                                                            } else {
                                                                alert('1.0から2.5の間の数値を入力してください');
                                                            }
                                                        }}
                                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                                    >
                                                        設定
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowCustomMultiplierInput(false);
                                                            setCustomMultiplierInputValue('');
                                                        }}
                                                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                                    >
                                                        キャンセル
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (profile.customActivityMultiplier) {
                                                    setProfile({...profile, customActivityMultiplier: null});
                                                } else {
                                                    const multipliers = {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75};
                                                    const currentMultiplier = multipliers[profile.activityLevel] || 1.4;
                                                    setCustomMultiplierInputValue(currentMultiplier.toString());
                                                    setShowCustomMultiplierInput(!showCustomMultiplierInput);
                                                }
                                            }}
                                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 underline"
                                        >
                                            {profile.customActivityMultiplier ? '5段階選択に戻す' : showCustomMultiplierInput ? '入力を閉じる' : 'または、活動レベル係数を直接入力する'}
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            目的
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '目的の設定',
                                                    content: `あなたのボディメイクの目的を選択してください。目的に応じて推奨カロリーとPFCバランスが自動調整されます。

【ダイエット（脂肪を落とす）】
• 目標: 体脂肪を減らし、引き締まった体を作る
• カロリー: メンテナンスカロリー -300kcal
• タンパク質: 高め（筋肉維持のため）
• 推奨ペース: 週0.5〜0.7kg減

【メンテナンス（現状維持）】
• 目標: 現在の体重・体組成を維持
• カロリー: メンテナンスカロリー ±0kcal
• バランス型の栄養配分
• 健康的な生活習慣の維持

【バルクアップ（筋肉をつける）】
• 目標: 筋肉量を増やし、体を大きくする
• カロリー: メンテナンスカロリー +300kcal
• タンパク質: 非常に高め
• 炭水化物: 多め（筋肉合成のエネルギー）
• 推奨ペース: 週0.5kg増

目的はいつでも変更できます。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <select
                                            value={profile.purpose}
                                            onChange={(e) => {
                                                const purpose = e.target.value;
                                                let pace = 0;
                                                let calorieAdjust = 0;
                                                if (purpose === 'ダイエット') {
                                                    pace = -1;
                                                    calorieAdjust = -300;
                                                } else if (purpose === 'バルクアップ') {
                                                    pace = 1;
                                                    calorieAdjust = 300;
                                                }
                                                setProfile({...profile, purpose, weightChangePace: pace, calorieAdjustment: calorieAdjust});
                                            }}
                                            className="w-full px-4 py-3 border rounded-lg"
                                        >
                                            <option value="ダイエット">ダイエット（脂肪を落とす）</option>
                                            <option value="メンテナンス">メンテナンス（現状維持）</option>
                                            <option value="バルクアップ">バルクアップ（筋肉をつける）</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            <span>
                                                カロリー調整値（kcal/日）
                                                <span className="text-xs text-gray-500 ml-2">メンテナンスから±調整</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'カロリー調整値',
                                                    content: `メンテナンスカロリーからの調整値を設定します。

【推奨範囲: ±300kcal】
安全で持続可能なペースで体重を変化させるための推奨範囲です。

【ダイエット時（マイナス値）】
• -200kcal: 穏やか（週0.5kg減）
• -300kcal: 標準的（週0.7kg減）★推奨
• -400kcal以上: 急激（リバウンドリスク高）

【バルクアップ時（プラス値）】
• +200kcal: 控えめ（週0.25kg増）
• +300kcal: 標準的（週0.5kg増）★推奨
• +400kcal以上: 積極的（脂肪増加リスク高）

【メンテナンス時】
• 0kcal: 現状維持

【注意】
極端なカロリー調整は、代謝の低下、筋肉の減少、リバウンドのリスクを高めます。±200〜300kcalの範囲で調整することを強く推奨します。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            step="50"
                                            value={profile.calorieAdjustment !== undefined ? profile.calorieAdjustment : 0}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? 0 : e.target.value === '' ? '' : Number(e.target.value);
                                                setProfile({...profile, calorieAdjustment: value});
                                            }}
                                            className="w-full px-4 py-3 border rounded-lg"
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">
                                            プラス値で増量、マイナス値で減量。±200kcalが標準的な調整幅です。
                                        </p>
                                    </div>
                                </div>
                            </details>

                            {/* 詳細設定（高度な設定） */}
                            <details className="border rounded-lg border-purple-300 bg-purple-50">
                                <summary className="cursor-pointer p-3 hover:bg-purple-100 font-medium flex items-center gap-2">
                                    <Icon name="Settings" size={16} className="text-purple-700" />
                                    <span className="text-purple-900">詳細設定（高度な設定）</span>
                                </summary>
                                <div className="p-4 pt-0 space-y-4 bg-white">
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs">
                                        <p className="font-bold text-yellow-900 mb-1">⚙️ 高度な設定</p>
                                        <p className="text-gray-700">すべての変数を任意に変更できます。デフォルト値は自動算出されています。</p>
                                    </div>

                                    {/* タンパク質係数 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            タンパク質係数（g/kg LBM）
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'タンパク質係数とは？',
                                                    content: `除脂肪体重（LBM）1kgあたりのタンパク質必要量を設定します。

【推奨値】
• 一般的なトレーニング: 2.0〜2.5g/kg LBM
• 本格的な筋肥大: 2.5〜3.0g/kg LBM
• 減量中: 2.5〜3.0g/kg LBM（筋肉維持）
• メンテナンス: 2.0〜2.2g/kg LBM

【例】
LBM 60kgで係数2.5の場合: 60 × 2.5 = 150g/日

デフォルト値（2.5）は科学的根拠に基づく最適値です。個別のニーズに応じて調整してください。`
                                                })}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={advancedSettings.proteinCoefficient}
                                            onChange={(e) => setAdvancedSettings({...advancedSettings, proteinCoefficient: e.target.value === '' ? '' : Number(e.target.value)})}
                                            className="w-full px-4 py-3 border rounded-lg"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">推奨範囲: 2.0〜3.0（デフォルト: 2.5）</p>
                                    </div>

                                    {/* 脂質比率 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            脂質カロリー比率
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '脂質カロリー比率とは？',
                                                    content: `総カロリーに占める脂質の割合を設定します。

【推奨値】
• バランス型: 0.25（25%）
• 低脂質・高炭水化物: 0.20〜0.22（20〜22%）
• ケトジェニック以外: 0.30以下を推奨

【計算例】
総カロリー2000kcal、比率0.25の場合:
• 脂質: 2000 × 0.25 = 500kcal
• 脂質グラム: 500 ÷ 9 = 約55g

【重要】
脂質は細胞膜やホルモン生成に必須です。極端に低い設定（0.15未満）は避けてください。`
                                                })}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.05"
                                            value={advancedSettings.fatRatio}
                                            onChange={(e) => setAdvancedSettings({...advancedSettings, fatRatio: e.target.value === '' ? '' : Number(e.target.value)})}
                                            className="w-full px-4 py-3 border rounded-lg"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">推奨範囲: 0.20〜0.30（デフォルト: 0.25 = 25%）</p>
                                    </div>


                                    {/* 自動調整ON/OFF */}
                                    <div className="space-y-2 border-t pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="font-medium text-sm">自動調整機能</p>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '自動調整機能とは？',
                                                    content: `コンディション記録に基づいて、目標カロリーやマクロ栄養素を自動で微調整する機能です。

【調整される項目と反映箇所】

1. **年齢によるタンパク質ブースト**
   • 反映箇所: タンパク質目標値（P）
   • 40歳以上で+0.2g/kg LBM
   • ダッシュボード上部の目標PFC円グラフに即時反映

2. **ボディメイカーブースト**
   • 反映箇所: タンパク質目標値（P）
   • +0.5g/kg LBM
   • 本格的な筋肥大を目指す方向け

3. **トレーニング強度による回復ブースト**
   • 反映箇所: タンパク質目標値（P）
   • 高強度日: +10%、複数部位: +5%
   • トレーニング記録後に自動適用

4. **睡眠による自動調整**
   • 反映箇所: 基礎代謝・総カロリー目標
   • 睡眠6h以下: -5%、8h以上: +3%
   • コンディション記録後に自動適用

5. **ストレスレベルによる自動調整**
   • 反映箇所: 総カロリー目標
   • 高ストレス: +100kcal、中程度: +50kcal
   • コンディション記録後に自動適用

【確認方法】
ダッシュボード上部のPFC円グラフで、調整後の目標値を確認できます。より精密な管理をしたい方は、個別にON/OFFを切り替えることができます。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={16} />
                                            </button>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={advancedSettings.ageProteinBoost}
                                                onChange={(e) => setAdvancedSettings({...advancedSettings, ageProteinBoost: e.target.checked})}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm">年齢による自動調整（40歳以上: +0.2g/kg）</span>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '年齢による自動調整',
                                                    content: `40歳以上の場合、タンパク質係数を自動で+0.2g/kg増やします。

【理由】
加齢に伴い筋肉合成能力が低下するため、より多くのタンパク質が必要になります。40歳以上では基礎代謝の低下と筋肉量の維持が重要になります。

【効果】
筋肉の減少を防ぎ、代謝を維持することで健康的な体組成を保ちます。`
                                                })}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                <Icon name="Info" size={12} />
                                            </button>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={advancedSettings.bodymakerBoost}
                                                onChange={(e) => setAdvancedSettings({...advancedSettings, bodymakerBoost: e.target.checked})}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm">ボディメイカーブースト（+0.5g/kg）</span>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'ボディメイカーブースト',
                                                    content: `本格的な筋肥大を目指す方向けに、タンパク質係数を+0.5g/kg増やします。

【推奨対象】
• 週4回以上の高強度トレーニング実施者
• 競技ボディビルダー・フィジーク選手
• 短期間で筋肉量を大幅に増やしたい方

【効果】
筋肉合成を最大化し、トレーニング効果を最大限引き出します。`
                                                })}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                <Icon name="Info" size={12} />
                                            </button>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={advancedSettings.trainingBoost}
                                                onChange={(e) => setAdvancedSettings({...advancedSettings, trainingBoost: e.target.checked})}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm">トレーニング強度による回復ブースト</span>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'トレーニング強度による回復ブースト',
                                                    content: `トレーニング記録に基づき、タンパク質を自動調整します。

【調整基準】
• 高強度トレーニング日: タンパク質+10%
• 複数部位のトレーニング日: タンパク質+5%

【効果】
トレーニングで損傷した筋繊維の修復を促進し、超回復を最適化します。`
                                                })}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                <Icon name="Info" size={12} />
                                            </button>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={advancedSettings.sleepAdjustment}
                                                onChange={(e) => setAdvancedSettings({...advancedSettings, sleepAdjustment: e.target.checked})}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm">睡眠による自動調整</span>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '睡眠による自動調整',
                                                    content: `睡眠の質に基づき、代謝とカロリーを自動調整します。

【調整基準】
• 睡眠時間6h以下: 基礎代謝-5%
• 睡眠の質が悪い: 回復能力低下を考慮
• 睡眠時間8h以上: 代謝効率+3%

【効果】
睡眠不足時は過剰なカロリー摂取を防ぎ、十分な睡眠時は筋肉合成を促進します。`
                                                })}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                <Icon name="Info" size={12} />
                                            </button>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={advancedSettings.stressAdjustment}
                                                onChange={(e) => setAdvancedSettings({...advancedSettings, stressAdjustment: e.target.checked})}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-sm">ストレスレベルによる自動調整</span>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'ストレスレベルによる自動調整',
                                                    content: `ストレスレベルに基づき、カロリーと栄養素を自動調整します。

【調整基準】
• 高ストレス時: カロリー+100kcal（コルチゾール対策）
• 中程度のストレス: カロリー+50kcal
• タンパク質を微増（筋肉分解防止）

【効果】
ストレスによる筋肉の異化（分解）を防ぎ、体組成の維持をサポートします。`
                                                })}
                                                className="text-purple-600 hover:text-purple-800"
                                            >
                                                <Icon name="Info" size={12} />
                                            </button>
                                        </label>
                                    </div>
                                </div>
                            </details>

                            <button
                                onClick={handleSave}
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                            >
                                保存
                            </button>
                            </div>
                        </div>
                    </details>


                    {/* テンプレート */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="BookTemplate" size={18} className="text-indigo-600" />
                            テンプレート
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">保存したテンプレートを管理できます。ルーティンに紐づけて使用することも可能です。</p>

                            {/* 食事テンプレート */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-green-800">🍽️ 食事テンプレート</h3>
                                        <p className="text-xs text-gray-600">よく食べる食事の組み合わせを保存</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">{mealTemplates.length}件</span>
                                        <button
                                            onClick={() => onOpenAddView && onOpenAddView('meal')}
                                            className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition flex items-center gap-1"
                                        >
                                            <Icon name="Plus" size={14} />
                                            新規作成
                                        </button>
                                    </div>
                                </div>
                                {mealTemplates.length === 0 ? (
                                    <p className="text-sm text-gray-500">保存されたテンプレートはありません</p>
                                ) : (
                                    <div className="space-y-2 mt-3">
                                        {mealTemplates.map(template => {
                                            const totalCals = (template.items || []).reduce((sum, i) => sum + (i.calories || 0), 0);
                                            const totalProtein = (template.items || []).reduce((sum, i) => sum + (i.protein || 0), 0);
                                            const totalFat = (template.items || []).reduce((sum, i) => sum + (i.fat || 0), 0);
                                            const totalCarbs = (template.items || []).reduce((sum, i) => sum + (i.carbs || 0), 0);

                                            return (
                                                <details key={template.id} className="bg-gray-50 p-3 rounded-lg">
                                                    <summary className="flex items-center justify-between cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{template.name}</p>
                                                            <p className="text-xs text-gray-600">
                                                                {template.items?.length || 0}品目 | {Math.round(totalCals)}kcal
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                if (confirm('このテンプレートを削除しますか？')) {
                                                                    await DataService.deleteMealTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                }
                                                            }}
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition ml-2"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </summary>
                                                    <div className="mt-3 space-y-2 border-t pt-3">
                                                        <div className="grid grid-cols-4 gap-2 text-xs bg-white p-2 rounded">
                                                            <div className="text-center">
                                                                <div className="font-medium text-gray-500">カロリー</div>
                                                                <div className="font-bold">{Math.round(totalCals)}</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="font-medium text-gray-500">P</div>
                                                                <div className="font-bold">{totalProtein.toFixed(1)}g</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="font-medium text-gray-500">F</div>
                                                                <div className="font-bold">{totalFat.toFixed(1)}g</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="font-medium text-gray-500">C</div>
                                                                <div className="font-bold">{totalCarbs.toFixed(1)}g</div>
                                                            </div>
                                                        </div>
                                                        {(template.items || []).map((item, idx) => (
                                                            <div key={idx} className="text-xs bg-white p-2 rounded flex justify-between">
                                                                <span className="font-medium">{item.name} ({item.amount}g)</span>
                                                                <span className="text-gray-600">
                                                                    {Math.round(item.calories)}kcal | P{item.protein.toFixed(1)} F{item.fat.toFixed(1)} C{item.carbs.toFixed(1)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* トレーニングテンプレート */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-orange-800">💪 トレーニングテンプレート</h3>
                                        <p className="text-xs text-gray-600">よく行う種目とセット数を保存</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">{workoutTemplates.length}件</span>
                                        <button
                                            onClick={() => onOpenAddView && onOpenAddView('workout')}
                                            className="px-3 py-1 bg-orange-600 text-white text-xs rounded-lg hover:bg-orange-700 transition flex items-center gap-1"
                                        >
                                            <Icon name="Plus" size={14} />
                                            新規作成
                                        </button>
                                    </div>
                                </div>
                                {workoutTemplates.length === 0 ? (
                                    <p className="text-sm text-gray-500">保存されたテンプレートはありません</p>
                                ) : (
                                    <div className="space-y-2 mt-3">
                                        {workoutTemplates.map(template => {
                                            const totalCals = (template.sets || []).reduce((sum, s) => sum + (s.calories || 0), 0);

                                            return (
                                                <details key={template.id} className="bg-gray-50 p-3 rounded-lg">
                                                    <summary className="flex items-center justify-between cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{template.name}</p>
                                                            <p className="text-xs text-gray-600">
                                                                {template.exercise?.name || '種目不明'} | {template.sets?.length || 0}セット | {Math.round(totalCals)}kcal
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                if (confirm('このテンプレートを削除しますか？')) {
                                                                    await DataService.deleteWorkoutTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                }
                                                            }}
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition ml-2"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </summary>
                                                    <div className="mt-3 space-y-2 border-t pt-3">
                                                        {(template.sets || []).map((set, idx) => (
                                                            <div key={idx} className="text-xs bg-white p-2 rounded">
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="font-medium">セット{idx + 1}</span>
                                                                    <span className="text-gray-600">{Math.round(set.calories || 0)}kcal</span>
                                                                </div>
                                                                <div className="text-gray-600 space-x-2">
                                                                    <span>{set.weight}kg</span>
                                                                    <span>×{set.reps}回</span>
                                                                    <span>| {set.distance}m</span>
                                                                    <span>| TUT {set.tut}秒</span>
                                                                    <span>| Rest {set.restInterval}秒</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* サプリメントテンプレート */}
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-blue-800">💊 サプリメントテンプレート</h3>
                                        <p className="text-xs text-gray-600">よく使うサプリの組み合わせを保存</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">{supplementTemplates.length}件</span>
                                        <button
                                            onClick={() => onOpenAddView && onOpenAddView('supplement')}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                                        >
                                            <Icon name="Plus" size={14} />
                                            新規作成
                                        </button>
                                    </div>
                                </div>
                                {supplementTemplates.length === 0 ? (
                                    <p className="text-sm text-gray-500">保存されたテンプレートはありません</p>
                                ) : (
                                    <div className="space-y-2 mt-3">
                                        {supplementTemplates.map(template => (
                                            <details key={template.id} className="bg-gray-50 p-3 rounded-lg">
                                                <summary className="flex items-center justify-between cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{template.name}</p>
                                                        <p className="text-xs text-gray-600">{template.items?.length || 0}品目</p>
                                                    </div>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            if (confirm('このテンプレートを削除しますか？')) {
                                                                await DataService.deleteSupplementTemplate(userId, template.id);
                                                                await loadTemplates();
                                                            }
                                                        }}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition ml-2"
                                                    >
                                                        <Icon name="Trash2" size={16} />
                                                    </button>
                                                </summary>
                                                <div className="mt-3 space-y-2 border-t pt-3">
                                                    {(template.items || []).map((item, idx) => (
                                                        <div key={idx} className="text-xs bg-white p-2 rounded flex justify-between">
                                                            <span className="font-medium">{item.name}</span>
                                                            <span className="text-gray-600">{item.amount}{item.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                    </details>

                    {/* ルーティン */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Calendar" size={18} className="text-indigo-600" />
                            ルーティン
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            {/* ルーティン内容 */}
                            <div className="space-y-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h4 className="font-bold text-purple-900 mb-2">ルーティン管理</h4>
                                <p className="text-sm text-purple-700">
                                    Day1~7のデフォルトルーティンと、最大5つまで追加可能な追加枠を設定できます。
                                </p>
                            </div>

                            {(() => {
                                const saveRoutines = (updated) => {
                                    setLocalRoutines(updated);
                                    localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updated));
                                };

                                const updateRoutine = (id, updates) => {
                                    const updated = localRoutines.map(r => r.id === id ? { ...r, ...updates } : r);
                                    saveRoutines(updated);
                                };

                                const addRoutine = () => {
                                    if (localRoutines.length >= 12) {
                                        alert('ルーティンは最大12個（Day7 + 追加5枠）まで設定できます');
                                        return;
                                    }
                                    const nextId = Math.max(...localRoutines.map(r => r.id), 0) + 1;
                                    const dayNumber = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'][nextId] || `⑧${nextId - 7}`;
                                    const updated = [...localRoutines, {
                                        id: nextId,
                                        name: `${dayNumber}追加日`,
                                        splitType: '',
                                        isRestDay: false
                                    }];
                                    saveRoutines(updated);
                                };

                                const deleteRoutine = (id) => {
                                    if (id <= 7) {
                                        alert('Day1~7は削除できません');
                                        return;
                                    }
                                    if (confirm('この追加枠を削除しますか？')) {
                                        const updated = localRoutines.filter(r => r.id !== id);
                                        saveRoutines(updated);
                                    }
                                };

                                return (
                                    <div className="space-y-6">
                                        {/* Day1~7 */}
                                        <div>
                                            <h3 className="font-semibold mb-3">Day1~7（デフォルト）</h3>
                                            <div className="space-y-3">
                                                {localRoutines.filter(r => r.id <= 7).map(routine => (
                                                    <div key={routine.id} className="border rounded-lg p-4 bg-white">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <input
                                                                type="text"
                                                                value={routine.name}
                                                                onChange={(e) => updateRoutine(routine.id, { name: e.target.value })}
                                                                className="font-bold text-indigo-600 bg-transparent border-b border-indigo-300 focus:outline-none w-32"
                                                            />
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={routine.isRestDay}
                                                                    onChange={(e) => updateRoutine(routine.id, {
                                                                        isRestDay: e.target.checked,
                                                                        splitType: e.target.checked ? '' : routine.splitType
                                                                    })}
                                                                    className="rounded"
                                                                />
                                                                休息日
                                                            </label>
                                                        </div>
                                                        {!routine.isRestDay && (
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="font-medium text-sm">分割法</label>
                                                                    <select
                                                                        value={routine.splitType}
                                                                        onChange={(e) => {
                                                                            if (e.target.value === '__custom__') {
                                                                                const custom = prompt('分割法を入力してください（例: 胸・三頭・肩）', routine.splitType);
                                                                                if (custom !== null) {
                                                                                    updateRoutine(routine.id, { splitType: custom });
                                                                                }
                                                                            } else {
                                                                                updateRoutine(routine.id, { splitType: e.target.value });
                                                                            }
                                                                        }}
                                                                        className="w-full mt-1 p-2 border rounded-lg"
                                                                    >
                                                                        <option value="">選択してください</option>
                                                                        <option value="胸">胸</option>
                                                                        <option value="背中">背中</option>
                                                                        <option value="脚">脚</option>
                                                                        <option value="肩">肩</option>
                                                                        <option value="腕">腕</option>
                                                                        <option value="尻">尻</option>
                                                                        <option value="腹筋・体幹">腹筋・体幹</option>
                                                                        <option value="上半身">上半身</option>
                                                                        <option value="下半身">下半身</option>
                                                                        <option value="全身">全身</option>
                                                                        <option value="プッシュ（押す）">プッシュ（押す）</option>
                                                                        <option value="プル（引く）">プル（引く）</option>
                                                                        <option value="有酸素">有酸素</option>
                                                                        <option value="胸・三頭">胸・三頭</option>
                                                                        <option value="背中・二頭">背中・二頭</option>
                                                                        <option value="肩・腕">肩・腕</option>
                                                                        <option value="__custom__">✏️ カスタム入力...</option>
                                                                    </select>
                                                                </div>

                                                                {/* テンプレート紐づけ */}
                                                                <details className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                    <summary className="font-medium text-sm text-yellow-900 cursor-pointer flex items-center gap-2 hover:text-yellow-700">
                                                                        <Icon name="BookTemplate" size={14} />
                                                                        テンプレート紐づけ
                                                                        <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                                    </summary>
                                                                    <div className="space-y-2 mt-3">
                                                                        {/* 食事テンプレート */}
                                                                        <div>
                                                                            <label className="text-xs text-gray-600">食事</label>
                                                                            <select
                                                                                value={routine.mealTemplateId || ''}
                                                                                onChange={(e) => updateRoutine(routine.id, { mealTemplateId: e.target.value || null })}
                                                                                className="w-full mt-1 p-2 border rounded text-sm"
                                                                            >
                                                                                <option value="">テンプレートなし</option>
                                                                                {mealTemplates.map(t => (
                                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>

                                                                        {/* トレーニングテンプレート */}
                                                                        <div>
                                                                            <label className="text-xs text-gray-600">トレーニング</label>
                                                                            <select
                                                                                value={routine.workoutTemplateId || ''}
                                                                                onChange={(e) => updateRoutine(routine.id, { workoutTemplateId: e.target.value || null })}
                                                                                className="w-full mt-1 p-2 border rounded text-sm"
                                                                            >
                                                                                <option value="">テンプレートなし</option>
                                                                                {workoutTemplates.map(t => (
                                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>

                                                                        {/* サプリメントテンプレート */}
                                                                        <div>
                                                                            <label className="text-xs text-gray-600">サプリメント</label>
                                                                            <select
                                                                                value={routine.supplementTemplateId || ''}
                                                                                onChange={(e) => updateRoutine(routine.id, { supplementTemplateId: e.target.value || null })}
                                                                                className="w-full mt-1 p-2 border rounded text-sm"
                                                                            >
                                                                                <option value="">テンプレートなし</option>
                                                                                {supplementTemplates.map(t => (
                                                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-xs text-yellow-700 mt-2">
                                                                        紐づけたテンプレートは、記録画面で自動的に読み込まれます
                                                                    </p>
                                                                </details>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 追加枠 */}
                                        {localRoutines.filter(r => r.id > 7).length > 0 && (
                                            <div>
                                                <h3 className="font-semibold mb-3">追加枠（最大5つ）</h3>
                                                <div className="space-y-3">
                                                    {localRoutines.filter(r => r.id > 7).map(routine => (
                                                        <div key={routine.id} className="border rounded-lg p-4 bg-gray-50">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <input
                                                                    type="text"
                                                                    value={routine.name}
                                                                    onChange={(e) => updateRoutine(routine.id, { name: e.target.value })}
                                                                    className="font-bold text-indigo-600 bg-transparent border-b border-indigo-300 focus:outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => deleteRoutine(routine.id)}
                                                                    className="text-red-600 hover:text-red-800"
                                                                >
                                                                    <Icon name="Trash2" size={18} />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <label className="flex items-center gap-2 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={routine.isRestDay}
                                                                        onChange={(e) => updateRoutine(routine.id, {
                                                                            isRestDay: e.target.checked,
                                                                            splitType: e.target.checked ? '' : routine.splitType
                                                                        })}
                                                                        className="rounded"
                                                                    />
                                                                    休息日
                                                                </label>
                                                            </div>
                                                            {!routine.isRestDay && (
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="font-medium text-sm">分割法</label>
                                                                        <select
                                                                            value={routine.splitType}
                                                                            onChange={(e) => {
                                                                                if (e.target.value === '__custom__') {
                                                                                    const custom = prompt('分割法を入力してください（例: 胸・三頭・肩）', routine.splitType);
                                                                                    if (custom !== null) {
                                                                                        updateRoutine(routine.id, { splitType: custom });
                                                                                    }
                                                                                } else {
                                                                                    updateRoutine(routine.id, { splitType: e.target.value });
                                                                                }
                                                                            }}
                                                                            className="w-full mt-1 p-2 border rounded-lg"
                                                                        >
                                                                            <option value="">選択してください</option>
                                                                            <option value="胸">胸</option>
                                                                            <option value="背中">背中</option>
                                                                            <option value="脚">脚</option>
                                                                            <option value="肩">肩</option>
                                                                            <option value="腕">腕</option>
                                                                            <option value="尻">尻</option>
                                                                            <option value="腹筋・体幹">腹筋・体幹</option>
                                                                            <option value="上半身">上半身</option>
                                                                            <option value="下半身">下半身</option>
                                                                            <option value="全身">全身</option>
                                                                            <option value="プッシュ（押す）">プッシュ（押す）</option>
                                                                            <option value="プル（引く）">プル（引く）</option>
                                                                            <option value="有酸素">有酸素</option>
                                                                            <option value="胸・三頭">胸・三頭</option>
                                                                            <option value="背中・二頭">背中・二頭</option>
                                                                            <option value="肩・腕">肩・腕</option>
                                                                            <option value="__custom__">✏️ カスタム入力...</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* テンプレート紐づけ */}
                                                                    <details className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                        <summary className="font-medium text-sm text-yellow-900 cursor-pointer flex items-center gap-2 hover:text-yellow-700">
                                                                            <Icon name="BookTemplate" size={14} />
                                                                            テンプレート紐づけ
                                                                            <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                                        </summary>
                                                                        <div className="space-y-2 mt-3">
                                                                            {/* 食事テンプレート */}
                                                                            <div>
                                                                                <label className="text-xs text-gray-600">食事</label>
                                                                                <select
                                                                                    value={routine.mealTemplateId || ''}
                                                                                    onChange={(e) => updateRoutine(routine.id, { mealTemplateId: e.target.value || null })}
                                                                                    className="w-full mt-1 p-2 border rounded text-sm"
                                                                                >
                                                                                    <option value="">テンプレートなし</option>
                                                                                    {mealTemplates.map(t => (
                                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>

                                                                            {/* トレーニングテンプレート */}
                                                                            <div>
                                                                                <label className="text-xs text-gray-600">トレーニング</label>
                                                                                <select
                                                                                    value={routine.workoutTemplateId || ''}
                                                                                    onChange={(e) => updateRoutine(routine.id, { workoutTemplateId: e.target.value || null })}
                                                                                    className="w-full mt-1 p-2 border rounded text-sm"
                                                                                >
                                                                                    <option value="">テンプレートなし</option>
                                                                                    {workoutTemplates.map(t => (
                                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>

                                                                            {/* サプリメントテンプレート */}
                                                                            <div>
                                                                                <label className="text-xs text-gray-600">サプリメント</label>
                                                                                <select
                                                                                    value={routine.supplementTemplateId || ''}
                                                                                    onChange={(e) => updateRoutine(routine.id, { supplementTemplateId: e.target.value || null })}
                                                                                    className="w-full mt-1 p-2 border rounded text-sm"
                                                                                >
                                                                                    <option value="">テンプレートなし</option>
                                                                                    {supplementTemplates.map(t => (
                                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-xs text-yellow-700 mt-2">
                                                                            紐づけたテンプレートは、記録画面で自動的に読み込まれます
                                                                        </p>
                                                                    </details>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 追加ボタン */}
                                        {localRoutines.length < 12 && localRoutines.length >= 7 && (
                                            <button
                                                onClick={addRoutine}
                                                className="w-full py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 transition font-medium"
                                            >
                                                <Icon name="Plus" size={18} className="inline mr-2" />
                                                追加枠を追加（{localRoutines.length - 7}/5）
                                            </button>
                                        )}

                                        {localRoutines.length === 0 && (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500 mb-4">ルーティンが設定されていません</p>
                                                <button
                                                    onClick={() => {
                                                        const defaultRoutines = [
                                                            { id: 1, name: '①月曜日', splitType: '胸', isRestDay: false },
                                                            { id: 2, name: '②火曜日', splitType: '背中', isRestDay: false },
                                                            { id: 3, name: '③水曜日', splitType: '脚', isRestDay: false },
                                                            { id: 4, name: '④木曜日', splitType: '休み', isRestDay: true },
                                                            { id: 5, name: '⑤金曜日', splitType: '肩・腕', isRestDay: false },
                                                            { id: 6, name: '⑥土曜日', splitType: '全身', isRestDay: false },
                                                            { id: 7, name: '⑦日曜日', splitType: '休み', isRestDay: true }
                                                        ];
                                                        localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(defaultRoutines));
                                                        localStorage.setItem(STORAGE_KEYS.ROUTINE_START_DATE, new Date().toISOString());
                                                        localStorage.setItem(STORAGE_KEYS.ROUTINE_ACTIVE, 'true');
                                                        window.location.reload();
                                                    }}
                                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition"
                                                >
                                                    デフォルトルーティンで開始
                                                </button>
                                            </div>
                                        )}

                                        {/* 管理ボタン */}
                                        {localRoutines.length > 0 && (
                                            <div className="flex gap-3 pt-4 border-t">
                                                <button
                                                    onClick={() => {
                                                        if (confirm('ルーティンをリセットしますか？')) {
                                                            localStorage.removeItem(STORAGE_KEYS.ROUTINES);
                                                            localStorage.removeItem(STORAGE_KEYS.ROUTINE_START_DATE);
                                                            localStorage.removeItem(STORAGE_KEYS.ROUTINE_ACTIVE);
                                                            window.location.reload();
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium border border-red-200"
                                                >
                                                    <Icon name="Trash2" size={18} className="inline mr-2" />
                                                    リセット
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        localStorage.setItem(STORAGE_KEYS.ROUTINE_START_DATE, new Date().toISOString());
                                                        window.location.reload();
                                                    }}
                                                    className="flex-1 px-4 py-3 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium border border-indigo-200"
                                                >
                                                    <Icon name="RotateCcw" size={18} className="inline mr-2" />
                                                    Day1から再開
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            </div>
                        </div>
                    </details>

                    {/* 通知設定 */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Bell" size={18} className="text-indigo-600" />
                            通知設定
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t space-y-4">
                            {/* ルーティン通知 */}
                            <div className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={profile.notificationSettings?.routine !== false}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notificationSettings: {
                                                    ...(profile.notificationSettings || {}),
                                                    routine: e.target.checked
                                                }
                                            })}
                                            className="rounded"
                                        />
                                        <div>
                                            <div className="font-medium text-sm">ルーティン通知</div>
                                            <div className="text-xs text-gray-600">その日のトレーニング内容をお知らせ</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-6">
                                    <label className="block text-xs font-medium mb-1">通知時刻</label>
                                    <input
                                        type="time"
                                        value={profile.notificationSettings?.routineTime || '08:00'}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            notificationSettings: {
                                                ...(profile.notificationSettings || {}),
                                                routineTime: e.target.value
                                            }
                                        })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                        disabled={profile.notificationSettings?.routine === false}
                                    />
                                </div>
                            </div>

                            {/* 記録リマインド */}
                            <div className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={profile.notificationSettings?.recordReminder !== false}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notificationSettings: {
                                                    ...(profile.notificationSettings || {}),
                                                    recordReminder: e.target.checked
                                                }
                                            })}
                                            className="rounded"
                                        />
                                        <div>
                                            <div className="font-medium text-sm">記録リマインド</div>
                                            <div className="text-xs text-gray-600">記録がない場合に通知</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-6">
                                    <label className="block text-xs font-medium mb-1">通知時刻</label>
                                    <input
                                        type="time"
                                        value={profile.notificationSettings?.recordReminderTime || '19:30'}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            notificationSettings: {
                                                ...(profile.notificationSettings || {}),
                                                recordReminderTime: e.target.value
                                            }
                                        })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                        disabled={profile.notificationSettings?.recordReminder === false}
                                    />
                                </div>
                            </div>

                            {/* サマリー通知 */}
                            <div className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={profile.notificationSettings?.summary !== false}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notificationSettings: {
                                                    ...(profile.notificationSettings || {}),
                                                    summary: e.target.checked
                                                }
                                            })}
                                            className="rounded"
                                        />
                                        <div>
                                            <div className="font-medium text-sm">サマリー通知</div>
                                            <div className="text-xs text-gray-600">1日の終わりに達成状況を要約</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-6">
                                    <label className="block text-xs font-medium mb-1">通知時刻</label>
                                    <input
                                        type="time"
                                        value={profile.notificationSettings?.summaryTime || '23:00'}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            notificationSettings: {
                                                ...(profile.notificationSettings || {}),
                                                summaryTime: e.target.value
                                            }
                                        })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                        disabled={profile.notificationSettings?.summary === false}
                                    />
                                </div>
                            </div>

                            {/* ミニマムタスク */}
                            <div className="border-t pt-3">
                                <label className="block text-sm font-medium mb-2">ミニマムタスク</label>
                                <input
                                    type="text"
                                    value={profile.minimumTask || ''}
                                    onChange={(e) => setProfile({...profile, minimumTask: e.target.value})}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                    placeholder="例: 腕立て1回"
                                />
                                <p className="text-xs text-gray-600 mt-1">
                                    「少しだけなら頑張れる」ときに提案する最低限のタスクを設定してください。
                                </p>
                            </div>
                        </div>
                    </details>

                    {/* データ管理 */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Database" size={18} className="text-indigo-600" />
                            データ管理
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                        <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <div className="flex items-start gap-3">
                                    <Icon name="Trash2" size={20} className="text-red-600 mt-1" />
                                    <div className="flex-1">
                                        <h4 className="font-bold mb-2 text-red-800">全データの削除</h4>
                                        <p className="text-sm text-gray-600 mb-3">
                                            すべてのデータを削除します。この操作は取り消せません。
                                        </p>
                                        <button
                                            onClick={handleClearData}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                        >
                                            全データ削除
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-bold mb-2">アプリ情報</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">バージョン</span>
                                        <span className="font-medium">Beta 1.0.0</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">開発モード</span>
                                        <span className="font-medium">{DEV_MODE ? 'ON' : 'OFF'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </details>

                    {/* 開発者 */}
                    {DEV_MODE && (
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Settings" size={18} className="text-orange-600" />
                            開発者
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            {/* 開発者モードコンテンツ */}
                            <div className="space-y-6">
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                    <Icon name="AlertTriangle" size={18} />
                                    開発者モード
                                </h4>
                                <p className="text-sm text-orange-700">
                                    このタブは開発中のみ表示されます。守破離機能のテストや日付の手動操作が可能です。
                                </p>
                            </div>

                            {/* 日付手動進行 */}
                            <div className="border rounded-lg p-6">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Calendar" size={18} />
                                    日付手動進行
                                </h4>
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm text-gray-600">現在の利用日数</span>
                                            <span className="text-2xl font-bold text-indigo-600">{usageDays}日</span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            現在のステージ: {
                                                usageDays < 10 ? '守 (基礎)' :
                                                usageDays < 18 ? '破 (応用)' :
                                                '離 (独自)'
                                            }
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                const newDays = Math.max(0, usageDays - 1);
                                                localStorage.setItem(STORAGE_KEYS.USAGE_DAYS, newDays.toString());
                                                window.location.reload();
                                            }}
                                            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                                        >
                                            <Icon name="ChevronLeft" size={18} className="inline mr-1" />
                                            -1日
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newDays = usageDays + 1;
                                                localStorage.setItem(STORAGE_KEYS.USAGE_DAYS, newDays.toString());
                                                window.location.reload();
                                            }}
                                            className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                                        >
                                            <Icon name="ChevronRight" size={18} className="inline mr-1" />
                                            +1日
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <button
                                            onClick={() => {
                                                localStorage.setItem(STORAGE_KEYS.USAGE_DAYS, '0');
                                                // 機能開放状態もリセット
                                                localStorage.removeItem(STORAGE_KEYS.UNLOCKED_FEATURES);
                                                window.location.reload();
                                            }}
                                            className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition font-medium"
                                        >
                                            0日 (初期状態)
                                        </button>
                                        <button
                                            onClick={() => {
                                                localStorage.setItem(STORAGE_KEYS.USAGE_DAYS, '30');
                                                // 全機能開放
                                                const allFeatures = Object.values(FEATURES).map(f => f.id);
                                                localStorage.setItem(STORAGE_KEYS.UNLOCKED_FEATURES, JSON.stringify(allFeatures));
                                                window.location.reload();
                                            }}
                                            className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition font-medium"
                                        >
                                            30日 (全開放)
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => {
                                                localStorage.setItem(STORAGE_KEYS.USAGE_DAYS, '5');
                                                window.location.reload();
                                            }}
                                            className="px-3 py-2 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition"
                                        >
                                            5日 (守)
                                        </button>
                                        <button
                                            onClick={() => {
                                                localStorage.setItem(STORAGE_KEYS.USAGE_DAYS, '12');
                                                window.location.reload();
                                            }}
                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition"
                                        >
                                            12日 (破)
                                        </button>
                                        <button
                                            onClick={() => {
                                                localStorage.setItem(STORAGE_KEYS.USAGE_DAYS, '25');
                                                window.location.reload();
                                            }}
                                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 transition"
                                        >
                                            25日 (離)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 機能開放状態 */}
                            <div className="border rounded-lg p-6">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Lock" size={18} />
                                    機能開放状態
                                </h4>
                                <div className="space-y-2">
                                    {Object.values(FEATURES).map(feature => {
                                        const isUnlocked = usageDays >= feature.requiredDays;
                                        const stageColor =
                                            feature.stage === '守' ? 'bg-green-100 text-green-700' :
                                            feature.stage === '破' ? 'bg-blue-100 text-blue-700' :
                                            'bg-purple-100 text-purple-700';
                                        return (
                                            <div key={feature.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs px-2 py-1 rounded-full ${stageColor} font-bold`}>
                                                        {feature.stage}
                                                    </span>
                                                    <span className="font-medium">{feature.name}</span>
                                                    <span className="text-xs text-gray-500">({feature.requiredDays}日〜)</span>
                                                </div>
                                                <div>
                                                    {isUnlocked ? (
                                                        <span className="text-green-600 flex items-center gap-1">
                                                            <Icon name="CheckCircle" size={18} />
                                                            <span className="text-sm font-medium">開放済み</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 flex items-center gap-1">
                                                            <Icon name="Lock" size={18} />
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
                    </details>
                    )}

                    {/* 管理者パネル (開発モードのみ表示) */}
                    {DEV_MODE && (
                        <details className="border rounded-lg border-red-300 bg-red-50">
                            <summary className="cursor-pointer p-4 hover:bg-red-100 font-medium flex items-center gap-2">
                                <Icon name="Shield" size={18} className="text-red-600" />
                                管理者機能
                                <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-4 pt-0 border-t border-red-200">
                                <div className="space-y-3">
                                    <p className="text-sm text-red-700 mb-3">
                                        🔒 管理者機能へのアクセスには認証が必要です
                                    </p>
                                    <button
                                        onClick={() => {
                                            const password = prompt('管理者パスワードを入力してください:');
                                            if (password === 'admin2024') {
                                                onClose();
                                                setTimeout(() => {
                                                    document.dispatchEvent(new CustomEvent('openAdminPanel'));
                                                }, 100);
                                            } else if (password !== null) {
                                                alert('パスワードが間違っています');
                                            }
                                        }}
                                        className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
                                    >
                                        <Icon name="Shield" size={18} />
                                        COMY投稿承認パネルを開く
                                    </button>
                                    <p className="text-xs text-gray-600 mt-2">
                                        ※ 本番環境では、Firebase Authenticationのカスタムクレームでadminロールを付与してください
                                    </p>
                                </div>
                            </div>
                        </details>
                    )}
            </div>
            </div>
        </div>

        {/* 情報モーダル */}
        {infoModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={() => setInfoModal({ show: false, title: '', content: '' })}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center z-10">
                        <h3 className="font-bold text-lg">{infoModal.title}</h3>
                        <button onClick={() => setInfoModal({ show: false, title: '', content: '' })} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1">
                            <Icon name="X" size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{infoModal.content}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Visual Guide Modal */}
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
                                    setProfile({ ...profile, bodyFatPercentage: estimate.bodyFatPercentage });
                                    setVisualGuideModal({ ...visualGuideModal, show: false });
                                }}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-pink-600 text-white rounded-lg hover:from-orange-700 hover:to-pink-700 font-medium"
                            >
                                この値を使用する
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
// ===========================
// Analysis and History Components
// Extracted from index_beta.html
// ===========================

// ===== AnalysisView Component (lines 4684-5218) =====
const AnalysisView = ({ onClose, userId, userProfile, dailyRecord, targetPFC, setLastUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [historicalInsights, setHistoricalInsights] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [suggestedDirective, setSuggestedDirective] = useState(null);

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
        const totalBurned = (dailyRecord.workouts || []).reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

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
            actual: { calories: Math.round(totalCalories), protein: Math.round(totalProtein), fat: Math.round(totalFat), carbs: Math.round(totalCarbs), burned: Math.round(totalBurned) },
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

        // プロンプトからマークダウンと絵文字を除去する関数
        const sanitizeText = (text) => {
            if (!text) return '';
            return text
                // マークダウン記号を除去
                .replace(/\*\*/g, '')
                .replace(/##/g, '')
                .replace(/###/g, '')
                // 絵文字を除去（包括的なUnicodeレンジ）
                .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 顔文字
                .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // シンボルと絵文字
                .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 交通手段と地図記号
                .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // 旗
                .replace(/[\u{2600}-\u{26FF}]/gu, '')   // その他記号
                .replace(/[\u{2700}-\u{27BF}]/gu, '')   // 装飾記号
                .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // 異体字セレクタ
                .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // 補助絵文字
                .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // 拡張絵文字
                .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // シンボルと絵文字拡張
                .trim();
        };

        // インサイトデータを無害化
        const sanitizedInsights = insights.insights ?
            insights.insights.map(i => sanitizeText(i)).join('\n')
            : 'データ不足';

        // プロンプト全体を無害化
        const rawPrompt = `
あなたは、ユーザーの日々の頑張りを一番近くで応援する専属コーチです。
以下のデータに基づき、今日の努力を称え、明日がもっと良くなるための、シンプルで具体的なアドバイスと明日の指示書を提案してください。

【ユーザー情報】
- LBM（除脂肪体重）: ${userProfile.leanBodyMass || 'N/A'}kg
- 目標: ${sanitizeText(userProfile.goal || '未設定')}
- 体重: ${userProfile.weight || 'N/A'}kg
- 体脂肪率: ${userProfile.bodyFatPercentage || 'N/A'}%

【本日の達成率】
- 総合達成率: ${currentAnalysis.achievementRates.overall}%
- カロリー: ${currentAnalysis.achievementRates.calories}% (実績${currentAnalysis.actual.calories}kcal / 目標${targetPFC.calories}kcal)
- タンパク質: ${currentAnalysis.achievementRates.protein}% (実績${currentAnalysis.actual.protein}g / 目標${targetPFC.protein}g)
- 脂質: ${currentAnalysis.achievementRates.fat}% (実績${currentAnalysis.actual.fat}g / 目標${targetPFC.fat}g)
- 炭水化物: ${currentAnalysis.achievementRates.carbs}% (実績${currentAnalysis.actual.carbs}g / 目標${targetPFC.carbs}g)
- 運動消費: ${currentAnalysis.actual.burned}kcal

【過去30日の傾向】
${sanitizedInsights}

コミュニケーションの原則
- 承認と共感: まずは今日の頑張りを具体的に褒めます（例：「タンパク質目標100%達成、素晴らしいですね」）
- 完璧を目指させない: 達成できなかった項目があっても、責めるのではなく「惜しかったですね」「明日はこうすればもっと良くなりますよ」と前向きな姿勢を示します
- ワンポイント集中: アドバイスは一つか二つに絞り、ユーザーが「これならできそう」と思えるものにします

回答形式（簡潔かつ、ポジティブな言葉で）
・本日の振り返り
今日のデータで最も良かった点を具体的に褒める。総合評価をポジティブに伝える

・明日のためのワンポイントアドバイス
今日の結果を踏まえ、「これだけは意識してみよう」というアクションを一つだけ提案する。具体的で簡単なものが望ましい

・明日の指示書
本日のデータで最も不足している要素を1つだけ特定し、それを改善する最も効果的な行動を提案してください。
余計な説明や選択肢は不要です。以下の形式で簡潔に：
[DIRECTIVE_TYPE:meal]鶏むね肉150g追加
[DIRECTIVE_TYPE:exercise]ベンチプレス80kg×8回×3セット
[DIRECTIVE_TYPE:condition]睡眠8時間確保

※[DIRECTIVE_TYPE:カテゴリー]の直後に最も重要な行動1つだけを記載
※カテゴリーはmeal、exercise、conditionのいずれか
※優先順位: タンパク質不足>カロリー過不足>運動不足>睡眠不足

・最後にひとこと
ユーザーを勇気づけ、リラックスさせるような、ポジティブなメッセージで締めくくる

重要:
- LBM至上主義: すべての評価はLBMを基準に
- ユーザー主権: 押し付けではなく提案として
- 簡潔に: 各セクション2-3行以内
- 指示書は必ず[DIRECTIVE_TYPE:]形式で出力すること
`;

        const sanitizedPrompt = sanitizeText(rawPrompt);

        try {
            // 分析機能：gemini-2.5-proを使用
            const response = await GeminiAPI.sendMessage(sanitizedPrompt, [], userProfile, 'gemini-2.5-pro');
            if (response.success) {
                // AI応答から指示書を抽出（タグを非表示にするため）
                let displayText = response.text;
                const directiveMatch = response.text.match(/\[DIRECTIVE_TYPE:(meal|exercise|condition)\](.+?)(?=\n|$)/);

                if (directiveMatch) {
                    const directiveType = directiveMatch[1]; // meal, exercise, condition
                    const directiveText = directiveMatch[2].trim();

                    // タグをユーザーフレンドリーなラベルに置き換え
                    const labelMap = {
                        'meal': '【食事】',
                        'exercise': '【運動】',
                        'condition': '【コンディション】'
                    };
                    const label = labelMap[directiveType] || '【指示】';
                    displayText = displayText.replace(/\[DIRECTIVE_TYPE:(meal|exercise|condition)\]/, label);

                    // 指示書を自動保存（タグなしのテキストを保存）
                    const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
                    const directives = savedDirectives ? JSON.parse(savedDirectives) : [];
                    const now = new Date();
                    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    const today = getTodayDate();

                    const newDirective = {
                        date: today,
                        message: directiveText,
                        type: directiveType,
                        deadline: deadline.toISOString(),
                        createdAt: now.toISOString(),
                        completed: false
                    };

                    const updatedDirectives = directives.filter(d => d.date !== today);
                    updatedDirectives.push(newDirective);
                    localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(updatedDirectives));

                    // ダッシュボードを更新するためのイベントを発火
                    window.dispatchEvent(new Event('directiveUpdated'));
                }

                setAiAnalysis(displayText);

                // AI分析の結果をLocalStorageに永続化（表示用テキストを保存）
                const today = getTodayDate();
                const analyses = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ANALYSES) || '{}');
                if (analyses[today]) {
                    analyses[today].aiComment = displayText;
                    localStorage.setItem(STORAGE_KEYS.DAILY_ANALYSES, JSON.stringify(analyses));
                }
            } else {
                // ユーザーフレンドリーなエラーメッセージを表示
                const errorMessage = response.error || '不明なエラー';
                console.error('AI分析エラー詳細:', errorMessage);
                setAiAnalysis('申し訳ございません。AI分析の生成に失敗しました。\n\nしばらく時間をおいて、「再生成」ボタンをタップしてお試しください。\n\n問題が続く場合は、記録データを確認してください。');
            }
        } catch (error) {
            console.error('AI分析エラー:', error);
            setAiAnalysis('申し訳ございません。AI分析の生成中に問題が発生しました。\n\nネットワーク接続を確認の上、「再生成」ボタンをタップしてお試しください。');
        }

        setAiLoading(false);
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
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <header className="p-4 flex items-center border-b bg-gradient-to-r from-purple-600 to-indigo-600 flex-shrink-0">
                <button onClick={handleClose} className="text-white">
                    <Icon name="ArrowLeft" size={24} />
                </button>
                <h1 className="text-xl font-bold mx-auto text-white">本日の分析</h1>
                <div className="w-6"></div>
            </header>

            <div className="p-6 flex-grow overflow-y-auto bg-gray-50 space-y-6">
                {/* 総合評価 */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 text-center border border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">総合達成率</p>
                    <p className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mb-2">
                        {analysis.achievementRates.overall}%
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        {analysis.evaluation === 'excellent' && (
                            <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                <Icon name="Star" size={14} />
                                優秀
                            </span>
                        )}
                        {analysis.evaluation === 'good' && (
                            <span className="px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                <Icon name="ThumbsUp" size={14} />
                                良好
                            </span>
                        )}
                        {analysis.evaluation === 'moderate' && (
                            <span className="px-4 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                <Icon name="Minus" size={14} />
                                普通
                            </span>
                        )}
                        {analysis.evaluation === 'poor' && (
                            <span className="px-4 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-1">
                                <Icon name="AlertTriangle" size={14} />
                                要改善
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })} 現在
                    </p>
                </div>

                {/* 達成率詳細 */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <Icon name="Target" size={18} className="text-indigo-600" />
                        本日の栄養素達成率
                    </h4>
                    <div className="space-y-4">
                        {/* カロリー */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">カロリー</span>
                                <span className="text-sm font-bold text-indigo-600">{analysis.achievementRates.calories}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-3 rounded-full transition-all"
                                    style={{ width: `${Math.min(analysis.achievementRates.calories, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>実績: {analysis.actual.calories}kcal</span>
                                <span>目標: {analysis.target.calories}kcal</span>
                            </div>
                        </div>

                        {/* タンパク質 */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">タンパク質</span>
                                <span className="text-sm font-bold text-cyan-600">{analysis.achievementRates.protein}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-cyan-600 h-3 rounded-full transition-all"
                                    style={{ width: `${Math.min(analysis.achievementRates.protein, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>実績: {analysis.actual.protein}g</span>
                                <span>目標: {analysis.target.protein}g</span>
                            </div>
                        </div>

                        {/* 脂質 */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">脂質</span>
                                <span className="text-sm font-bold text-yellow-600">{analysis.achievementRates.fat}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-yellow-600 h-3 rounded-full transition-all"
                                    style={{ width: `${Math.min(analysis.achievementRates.fat, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>実績: {analysis.actual.fat}g</span>
                                <span>目標: {analysis.target.fat}g</span>
                            </div>
                        </div>

                        {/* 炭水化物 */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">炭水化物</span>
                                <span className="text-sm font-bold text-green-600">{analysis.achievementRates.carbs}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-green-600 h-3 rounded-full transition-all"
                                    style={{ width: `${Math.min(analysis.achievementRates.carbs, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>実績: {analysis.actual.carbs}g</span>
                                <span>目標: {analysis.target.carbs}g</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 過去データからの傾向分析 */}
                {historicalInsights && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                            <Icon name="TrendingUp" size={18} className="text-purple-600" />
                            あなたの体質・傾向分析
                            <span className="ml-auto text-xs text-gray-500 font-normal">過去{historicalInsights.recordCount}日分のデータ</span>
                        </h4>
                        <div className="space-y-3">
                            {historicalInsights.insights.map((insight, idx) => (
                                <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{insight}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 改善提案 */}
                {historicalInsights && historicalInsights.recommendations && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5 shadow-sm">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                            <Icon name="Lightbulb" size={18} className="text-amber-600" />
                            あなたへの改善提案
                        </h4>
                        <div className="space-y-3">
                            {historicalInsights.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <Icon name="CheckCircle" size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI分析 */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold flex items-center gap-2 text-purple-800">
                            <Icon name="Sparkles" size={18} className="text-purple-600" />
                            AI分析
                        </h4>
                        {!aiLoading && (
                            <button
                                onClick={() => generateAIAnalysis(analysis, historicalInsights)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                            >
                                <Icon name="RefreshCw" size={14} />
                                再生成
                            </button>
                        )}
                    </div>
                    {aiLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-sm text-gray-600">AI分析を生成中...</span>
                        </div>
                    ) : aiAnalysis ? (
                        <div className="text-sm text-gray-700 leading-relaxed">
                            <MarkdownRenderer text={aiAnalysis} />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">AI分析を生成できませんでした。</p>
                    )}
                </div>

                {/* トレーニング実績 */}
                {analysis.actual.burned > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h4 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                            <Icon name="Dumbbell" size={18} className="text-red-600" />
                            本日のトレーニング
                        </h4>
                        <p className="text-2xl font-bold text-red-600">{analysis.actual.burned}kcal</p>
                        <p className="text-xs text-gray-500 mt-1">消費カロリー</p>
                    </div>
                )}
            </div>
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
        const hasRecord = dayData && (dayData.calories > 0 || dayData.burned > 0);
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
                const totalBurned = (record.workouts || []).reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
                const dit = (totalProtein * 4 * 0.30) + (totalFat * 9 * 0.04) + (totalCarbs * 4 * 0.06);
                const epoc = totalBurned * 0.10;
                const totalExpenditure = totalBurned + dit + epoc;

                // 体組成データを取得（コンディション記録から）
                const latestCondition = record.conditions; // conditionsはオブジェクト

                // RM更新記録を取得（ワークアウトから）
                const rmUpdates = (record.workouts || []).flatMap(workout => (workout.sets || []).filter(set => set.rmUpdate).map(set => set.rmUpdate));

                data.push({
                    date: dateStr,
                    calories: totalCalories, protein: totalProtein, fat: totalFat, carbs: totalCarbs,
                    burned: totalBurned, dit, epoc, totalExpenditure,
                    netCalories: totalCalories - totalExpenditure,
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
                    date: dateStr, calories: 0, protein: 0, fat: 0, carbs: 0, burned: 0, dit: 0, epoc: 0,
                    totalExpenditure: 0, netCalories: 0, weight: null, bodyFat: null, rmUpdates: [],
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
                        <details className="border rounded-lg overflow-hidden">
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
                        <details className="border rounded-lg overflow-hidden">
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
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="TrendingUp" size={18} />
                                    {selectedMetric === 'calories' && 'カロリー推移'}
                                    {selectedMetric === 'protein' && 'タンパク質推移'}
                                    {selectedMetric === 'fat' && '脂質推移'}
                                    {selectedMetric === 'carbs' && '炭水化物推移'}
                                    {selectedMetric === 'weight' && '体重推移'}
                                    {selectedMetric === 'bodyFat' && '体脂肪率推移'}
                                </h4>
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
                                {historyData.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).filter(d => d.calories > 0 || d.burned > 0).map((day, index) => {
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
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">摂取</span>
                                                            <span className="font-medium">{Math.round(day.calories)}kcal</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">消費</span>
                                                            <span className="font-medium">-{Math.round(day.burned)}kcal</span>
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
                                                                            {workout.exercises?.length || 0}種目 • {workout.caloriesBurned || 0}kcal消費
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
                                {historyData.filter(d => d.calories > 0 || d.burned > 0).length === 0 && (
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
                                            content: '現在カレンダーで選択されている期間の集計データが表示されます。\n\n• 平均カロリー: 期間内の総摂取カロリーを記録日数で割った平均値です。\n• 平均タンパク質: 期間内の総タンパク質摂取量を記録日数で割った平均値です。\n• 総消費カロリー: 期間内のトレーニングによる総消費カロリーです。\n• 記録日数: 期間内で食事またはトレーニングが記録された日数を表します。'
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
                                        <p className="text-sm text-gray-600">総消費カロリー</p>
                                        <p className="text-xl font-bold text-orange-600">
                                            {Math.round(historyData.reduce((sum, d) => sum + d.burned, 0))}kcal
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
// ===== Community-Related Components =====
// Extracted from index_beta.html
// Components: PGBaseView, CommunityPostView, AdminPanel, COMYView, ContinuitySupportView

// ===== PG BASEビュー =====
const PGBaseView = ({ onClose, userId, userProfile }) => {
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('modules'); // 'modules' | 'ai'
    const [aiChatHistory, setAiChatHistory] = useState([]);
    const [aiInputMessage, setAiInputMessage] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const aiChatContainerRef = useRef(null);

    // Textbookモジュール一覧
    const textbookModules = [
        {
            id: 'mental_textbook',
            title: 'メンタルの教科書',
            category: '心理学',
            path: './module/mental_textbook_new.html',
            description: 'モチベーション、習慣形成、ストレス管理などメンタル面の科学的アプローチ',
            icon: 'Brain'
        },
        {
            id: 'pg_formula_textbook',
            title: 'PG式の教科書',
            category: '運動科学',
            path: './module/pg_formula_textbook_new.html',
            description: 'METsを超えた革新的カロリー計算アルゴリズムの科学的根拠と実践',
            icon: 'Zap'
        },
        {
            id: 'protein_textbook',
            title: 'タンパク質の教科書',
            category: '栄養学',
            path: './module/Nutrition/macro/protein_textbook_new.html',
            description: 'タンパク質の役割、アミノ酸スコア、摂取タイミング、プロテインの選び方',
            icon: 'Apple'
        },
        {
            id: 'carb_textbook',
            title: '炭水化物の教科書',
            category: '栄養学',
            path: './module/Nutrition/macro/carb_textbook_new.html',
            description: '炭水化物の種類、GI値、タイミング、糖質制限の科学',
            icon: 'Apple'
        },
        {
            id: 'fat_textbook',
            title: '脂質の教科書',
            category: '栄養学',
            path: './module/Nutrition/macro/fat_textbook_new.html',
            description: '脂質の種類、オメガ3/6/9、トランス脂肪酸、ケトジェニックダイエット',
            icon: 'Apple'
        },
        {
            id: 'basic_supplements_textbook',
            title: '基礎サプリメントの教科書',
            category: '栄養学',
            path: './module/basic_supplements_textbook_new.html',
            description: 'クレアチン、アミノ酸、ベータアラニン、HMBなど基礎サプリメントの科学',
            icon: 'Apple'
        },
        {
            id: 'vitamin_mineral_textbook',
            title: 'ビタミン・ミネラルの教科書',
            category: '栄養学',
            path: './module/Nutrition/micro/vitamin_mineral_textbook_new.html',
            description: '微量栄養素の役割、欠乏症、過剰症、サプリメント摂取の考え方',
            icon: 'Apple'
        }
    ];

    // チャット履歴の読み込み
    useEffect(() => {
        loadAIChatHistory();
    }, []);

    const loadAIChatHistory = async () => {
        const history = await DataService.getPGBaseChatHistory();
        setAiChatHistory(history);
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

        const workoutDays = historicalData.filter(d => (d.record.workouts || []).length > 0).length;
        const workoutFrequency = ((workoutDays / historicalData.length) * 7).toFixed(1);

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
2. 「タンパク質の教科書」: タンパク質の役割、アミノ酸スコア、摂取タイミング
3. 「炭水化物の教科書」: 炭水化物の種類、GI値、糖質制限
4. 「脂質の教科書」: 脂質の種類、オメガ3/6/9、ケトジェニック
5. 「ビタミン・ミネラルの教科書」: 微量栄養素の役割、欠乏症
6. 「アミノ酸の教科書」: BCAA、EAA、グルタミン
7. 「クレアチンの教科書」: クレアチンの効果、摂取方法
8. 「応用サプリメントの教科書」: ベータアラニン、HMB、カルニチン

## 思考の原則
1. **ボトルネックの特定**: 提供されたデータから、ユーザーの目標達成を最も妨げている要因（ボトルネック）を一つ見つけ出します。
2. **解決策の提示**: そのボトルネックを解消するために最も効果的なモジュールを1〜2個、自信を持って推奨します。
3. **未来の提示**: モジュールで学ぶことによって、ユーザーの課題がどう解決され、理想の姿に近づけるかを具体的に示します。

【回答形式】※簡潔かつ、温かみのある言葉で
### ✅ 素晴らしい点と、さらに良くなる点
[ユーザーの努力を具体的に褒め（例：記録継続）、データに基づいた改善点を1つ指摘]

### 💡 今、学ぶべきこと
[推奨モジュール名を「」で提示。「なぜなら〜」の形で、理由をデータと目標に結びつけて説明]

### 💪 期待できる未来
[この学びを通じて、ユーザーがどう変化できるかを具体的に描写]

### 🚀 次のステップ
[「まずは『〇〇の教科書』を読んでみませんか？」のように、具体的な次のアクションを問いかける形で締めくくる]

**重要原則**:
- LBM至上主義: すべての評価はLBMを基準に
- ユーザー主権: 押し付けではなく提案として
- 必ずモジュール名を「」で囲んで明記
`;

        const fullMessage = systemPrompt + '\n\n【ユーザーの質問】\n' + userMessage;

        try {
            // PG BASE：学習推奨機能、gemini-2.5-proを使用
            const response = await GeminiAPI.sendMessage(fullMessage, aiChatHistory, userProfile, 'gemini-2.5-pro');

            if (response.success) {
                const updatedHistory = [...newHistory, {
                    role: 'assistant',
                    content: response.text,
                    timestamp: new Date().toISOString()
                }];
                setAiChatHistory(updatedHistory);
                await DataService.savePGBaseChatHistory(updatedHistory);
            } else {
                const errorHistory = [...newHistory, {
                    role: 'assistant',
                    content: 'エラーが発生しました: ' + response.error,
                    timestamp: new Date().toISOString()
                }];
                setAiChatHistory(errorHistory);
            }
        } catch (error) {
            console.error('AI送信エラー:', error);
            const errorHistory = [...newHistory, {
                role: 'assistant',
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
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-4 flex items-center justify-between shadow-lg">
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
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-4 flex items-center justify-between shadow-lg">
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

            {/* タブ切り替え（モジュール/AIモード） */}
            <div className="bg-white border-b border-gray-200 px-4 pt-3">
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setViewMode('modules')}
                        className={`px-5 py-2 rounded-t-lg font-medium text-sm transition ${
                            viewMode === 'modules'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Icon name="BookOpen" size={16} className="inline mr-1" />
                        モジュール
                    </button>
                    <button
                        onClick={() => setViewMode('ai')}
                        className={`px-5 py-2 rounded-t-lg font-medium text-sm transition ${
                            viewMode === 'ai'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <Icon name="Sparkles" size={16} className="inline mr-1" />
                        AIモード
                    </button>
                </div>
            </div>

            {/* カテゴリフィルター（モジュール表示時のみ） */}
            {viewMode === 'modules' && (
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                    <div className="flex gap-3 flex-wrap">
                        {[
                            { value: 'all', label: 'すべて', icon: 'LayoutGrid', color: 'purple' },
                            { value: '心理学', label: '心理学', icon: 'Brain', color: 'pink' },
                            { value: '栄養学', label: '栄養学', icon: 'Apple', color: 'green' },
                            { value: '運動科学', label: '運動科学', icon: 'Zap', color: 'orange' }
                        ].map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setSelectedCategory(cat.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition ${
                                    selectedCategory === cat.value
                                        ? cat.color === 'purple' ? 'bg-purple-600 text-white' :
                                          cat.color === 'pink' ? 'bg-pink-600 text-white' :
                                          cat.color === 'green' ? 'bg-green-600 text-white' :
                                          'bg-orange-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        <p className="text-gray-500">該当するモジュールが見つかりませんでした</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredModules.map(module => (
                            <button
                                key={module.id}
                                onClick={() => setSelectedModule(module)}
                                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-lg transition text-left border-2 border-transparent hover:border-purple-300"
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        module.category === '心理学' ? 'bg-gradient-to-br from-pink-500 to-rose-500' :
                                        module.category === '運動科学' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                                        'bg-gradient-to-br from-green-500 to-emerald-500'
                                    }`}>
                                        <Icon name={module.icon} size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 mb-1">{module.title}</h3>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                            module.category === '心理学' ? 'bg-pink-100 text-pink-700' :
                                            module.category === '運動科学' ? 'bg-orange-100 text-orange-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {module.category}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">{module.description}</p>
                                <div className="mt-3 flex items-center text-purple-600 text-sm font-medium">
                                    <span>教科書を開く</span>
                                    <Icon name="ChevronRight" size={16} className="ml-1" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                </div>
            )}

            {/* AIモード */}
            {viewMode === 'ai' && (
                <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
                    {/* チャット履歴 */}
                    <div ref={aiChatContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4" style={{paddingBottom: '2rem'}}>
                        {aiChatHistory.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="MessageCircle" size={48} className="mx-auto mb-4 text-purple-300" />
                                <p className="text-gray-600 font-medium mb-2">PG BASE AIモード</p>
                                <p className="text-sm text-gray-500 px-8">
                                    あなたの記録データと傾向をもとに、最適な知識モジュールを提案します。<br/>
                                    気になることや悩みを気軽に質問してください。
                                </p>
                            </div>
                        ) : (
                            aiChatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${
                                        msg.role === 'user'
                                            ? 'bg-purple-600 text-white'
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
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                        <span className="text-sm text-gray-600">分析中...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* 下部スペーサー（入力欄の高さ分） */}
                        <div className="h-4"></div>
                    </div>

                    {/* 入力欄 */}
                    <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={aiInputMessage}
                                onChange={(e) => setAiInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendAIMessage()}
                                placeholder="質問や悩みを入力..."
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                disabled={aiLoading}
                            />
                            <button
                                onClick={sendAIMessage}
                                disabled={!aiInputMessage.trim() || aiLoading}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                            >
                                <Icon name="Send" size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// ===== コミュニティ投稿ビュー =====
const CommunityPostView = ({ onClose, onSubmitPost, userProfile, usageDays, historyData }) => {
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
            // 画像アップロード（本番環境ではFirebase Storageへ）
            let beforePhotoUrl = beforePhoto;
            let afterPhotoUrl = afterPhoto;

            if (!DEV_MODE && postCategory === 'body') {
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
        { id: 'mental_textbook', title: 'メンタルの教科書', category: '心理学' },
        { id: 'pg_formula_textbook', title: 'PG式の教科書', category: '運動科学' },
        { id: 'carb_textbook', title: '炭水化物の教科書', category: '栄養学' },
        { id: 'protein_textbook', title: 'タンパク質の教科書', category: '栄養学' },
        { id: 'fat_textbook', title: '脂質の教科書', category: '栄養学' },
        { id: 'vitamin_mineral_textbook', title: 'ビタミン・ミネラルの教科書', category: '栄養学' }
    ];

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
                    <label className="font-medium text-sm text-gray-700 mb-3 block">投稿カテゴリー</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setPostCategory('body')}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                postCategory === 'body'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 bg-white hover:border-indigo-300'
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
                            <div className="text-gray-700 mt-2 font-semibold">
                                ✓ アプリ内カメラでビフォー・アフター写真撮影（必須）
                            </div>
                            <div className="text-gray-700 font-semibold">
                                ✓ Your Coach+ データ連携（必須）
                            </div>
                            <div className="text-indigo-700 mt-2 font-semibold">
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
                            <label className="font-medium text-sm text-gray-700 mb-2 block">
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
                                    <div className="border-2 border-dashed border-indigo-300 rounded-lg p-2 text-center">
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
                                                    <Icon name="Camera" size={32} className="mx-auto text-indigo-400 mb-1" />
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
                        <label className="font-medium text-sm text-gray-700 mb-2 block">投稿内容</label>
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
                                <label className="font-medium text-sm text-gray-700 mb-2 block">
                                    引用する記録データを選択<span className="text-red-500">*</span>
                                </label>

                                {/* データタイプ選択 */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setDataSelectionType('single')}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                                            dataSelectionType === 'single'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        特定日
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDataSelectionType('average')}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                                            dataSelectionType === 'average'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                        <p className="text-xs font-semibold text-indigo-700 mb-2">{titleText}</p>
                                        <div className="space-y-1 text-xs text-gray-700">
                                            <div>• カロリー: {dataToShow.calories}kcal</div>
                                            <div>• タンパク質: {dataToShow.protein}g</div>
                                            <div>• 脂質: {dataToShow.fat}g</div>
                                            <div>• 炭水化物: {dataToShow.carbs}g</div>
                                            <div>• トレーニング時間: {dataToShow.workoutTime}分 {dataSelectionType === 'average' ? '(休養日除外)' : ''}</div>
                                            {dataToShow.weight && <div>• 体重: {dataToShow.weight}kg</div>}
                                            {dataToShow.lbm && <div>• 除脂肪体重: {dataToShow.lbm}kg</div>}
                                            {lbmChange && (
                                                <div className="font-semibold text-indigo-700 mt-2">
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
                        <label className="font-medium text-sm text-gray-700 mb-2 block">
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
                                            <span className="font-semibold text-sm text-gray-700">
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
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
                                            <p className="text-xs text-gray-500">
                                                {new Date(post.timestamp).toLocaleString('ja-JP')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                        post.category === 'body'
                                            ? 'bg-indigo-100 text-indigo-700'
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
                                            <img src={post.afterPhoto} alt="After" className="w-full rounded-lg border-2 border-indigo-300" />
                                        </div>
                                    </div>
                                )}

                                {/* 投稿内容 */}
                                <div className="mb-4">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">投稿内容:</p>
                                    <p className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                        {post.content}
                                    </p>
                                </div>

                                {/* データ連携情報 */}
                                {post.attachedData && (
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg mb-4">
                                        <p className="text-xs font-semibold text-indigo-700 mb-3 flex items-center gap-1">
                                            <Icon name="Database" size={14} />
                                            データ連携情報
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 text-xs text-gray-700">
                                            <div>• 継続: {post.attachedData.usageDays}日</div>
                                            <div>• 記録: {post.attachedData.recordDays}日</div>
                                            <div>• カロリー: {post.attachedData.totalCalories}kcal</div>
                                            <div>• タンパク質: {post.attachedData.protein}g</div>
                                            <div>• 体重: {post.attachedData.weight}kg</div>
                                            <div>• LBM: {post.attachedData.lbm}kg</div>
                                            {post.attachedData.lbmChange && (
                                                <div className="col-span-3 font-semibold text-indigo-700">
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
                        <h3 className="text-lg font-bold text-gray-900 mb-4">投稿を承認しますか？</h3>
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
                        <h3 className="text-lg font-bold text-gray-900 mb-4">投稿を却下</h3>
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
    const [activeView, setActiveView] = useState('feed'); // 'feed', 'post', 'mypage'
    const [posts, setPosts] = useState([]);
    const [fabOpen, setFabOpen] = useState(false);
    const [commentingPostId, setCommentingPostId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [shareModalPostId, setShareModalPostId] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null);

    useEffect(() => {
        loadPosts();
        // URLパラメータから投稿IDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('post');
        if (postId) {
            setSelectedPostId(postId);
            setCommentingPostId(postId);
        }
    }, []);

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

    const toggleLike = async (postId) => {
        const updatedPosts = posts.map(post => {
            if (post.id === postId) {
                // いいねしたユーザーのリストを管理
                const likedUsers = post.likedUsers || [];
                const hasLiked = likedUsers.includes(userId);

                if (hasLiked) {
                    // すでにいいね済み → 取り消し
                    return {
                        ...post,
                        likes: Math.max(0, (post.likes || 0) - 1),
                        likedUsers: likedUsers.filter(id => id !== userId)
                    };
                } else {
                    // まだいいねしていない → いいね追加
                    return {
                        ...post,
                        likes: (post.likes || 0) + 1,
                        likedUsers: [...likedUsers, userId]
                    };
                }
            }
            return post;
        });
        setPosts(updatedPosts);
        await DataService.saveCommunityPosts(updatedPosts);
    };

    const handleAddComment = async (postId) => {
        if (!commentText.trim()) return;

        const updatedPosts = posts.map(post => {
            if (post.id === postId) {
                const newComment = {
                    id: Date.now().toString(),
                    userId: userId,
                    author: userProfile?.nickname || 'ユーザー',
                    content: commentText,
                    timestamp: new Date().toISOString()
                };
                return {
                    ...post,
                    comments: [...(post.comments || []), newComment]
                };
            }
            return post;
        });

        setPosts(updatedPosts);
        await DataService.saveCommunityPosts(updatedPosts);
        setCommentText('');
        // コメント送信後、コメント欄は開いたまま保持
    };

    const handleToggleComments = async (postId) => {
        if (commentingPostId === postId) {
            // 閉じる場合
            setCommentingPostId(null);
        } else {
            // 開く場合：最新データを取得してコメント欄を開く
            const latestPosts = await DataService.getCommunityPosts();
            setPosts(latestPosts);
            setCommentingPostId(postId);
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
                alert('投稿リンクをクリップボードにコピーしました！');
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
            <div className="bg-gradient-to-r from-pink-600 to-orange-600 text-white px-4 py-4 flex items-center justify-between shadow-lg">
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

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
                {activeView === 'feed' && (
                    <div className="max-w-2xl mx-auto p-4 space-y-4">
                        {approvedPosts.length === 0 ? (
                            <div className="text-center py-12">
                                <Icon name="MessageSquare" size={64} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500 mb-2 font-medium">まだ投稿がありません</p>
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
                                                ? 'bg-indigo-100 text-indigo-700'
                                                : 'bg-teal-100 text-teal-700'
                                        }`}>
                                            {post.category === 'body' ? '💪 ボディメイク' : '🧠 メンタル'}
                                        </span>
                                        <p className="text-xs text-gray-500">
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

                                    {/* 投稿者 */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {post.author?.[0] || 'U'}
                                        </div>
                                        <p className="font-medium text-gray-800 text-sm">{post.author}</p>
                                    </div>

                                    {/* 投稿内容 */}
                                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>

                                    {/* データ連携情報 */}
                                    {post.attachedData && (
                                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg mb-3">
                                            <p className="text-xs font-semibold text-indigo-700 mb-2">📊 データ連携</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                                                <div>• 継続: {post.attachedData.usageDays}日</div>
                                                <div>• 記録: {post.attachedData.recordDays}日</div>
                                                <div>• カロリー: {post.attachedData.totalCalories}kcal</div>
                                                <div>• タンパク質: {post.attachedData.protein}g</div>
                                                {post.attachedData.lbmChange && (
                                                    <div className="col-span-2 font-semibold text-indigo-700">
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
                                                    ? 'text-pink-600'
                                                    : 'text-gray-600 hover:text-pink-600'
                                            }`}
                                        >
                                            <Icon name="Heart" size={18} fill={(post.likedUsers || []).includes(userId) ? 'currentColor' : 'none'} />
                                            <span className="text-sm">{post.likes || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => handleToggleComments(post.id)}
                                            className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition"
                                        >
                                            <Icon name="MessageCircle" size={18} />
                                            <span className="text-sm">{post.comments?.length || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => handleShare(post)}
                                            className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition"
                                        >
                                            <Icon name="Share2" size={18} />
                                        </button>
                                    </div>

                                    {/* コメントセクション */}
                                    {commentingPostId === post.id && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            {/* コメント一覧 */}
                                            {post.comments && post.comments.length > 0 && (
                                                <div className="mb-3 space-y-2 max-h-60 overflow-y-auto">
                                                    {post.comments.map(comment => (
                                                        <div key={comment.id} className="bg-gray-50 rounded-lg p-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                                    {comment.author?.[0] || 'U'}
                                                                </div>
                                                                <span className="text-xs font-semibold text-gray-800">{comment.author}</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(comment.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 ml-8">{comment.content}</p>
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
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={() => handleAddComment(post.id)}
                                                    disabled={!commentText.trim()}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
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
                                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                                    {userProfile.name?.[0] || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">{userProfile.name || 'ユーザー'}</h3>
                                    <p className="text-gray-600 text-sm">
                                        {userProfile.goal || '目標設定なし'} | {userProfile.style || '一般'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-800">
                                        {posts.filter(p => p.userId === userId).length}
                                    </p>
                                    <p className="text-xs text-gray-600">投稿</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-800">0</p>
                                    <p className="text-xs text-gray-600">フォロー</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-800">0</p>
                                    <p className="text-xs text-gray-600">フォロワー</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-700">あなたの投稿</h4>
                            {posts.filter(p => p.userId === userId).length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-lg">
                                    <p className="text-gray-500">まだ投稿がありません</p>
                                </div>
                            ) : (
                                posts.filter(p => p.userId === userId).map(post => (
                                    <div key={post.id} className="bg-white rounded-lg shadow-sm p-4">
                                        <p className="text-gray-700 mb-2">{post.content}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(post.timestamp).toLocaleString('ja-JP')}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* FABボタン */}
            <div className="fixed bottom-6 right-6 z-50">
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
                    className="w-14 h-14 bg-gradient-to-br from-pink-600 to-orange-600 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:shadow-xl transition transform hover:scale-110"
                >
                    <Icon name={fabOpen ? "X" : "Plus"} size={24} />
                </div>
            </div>
        </div>
    );
};

// ===== 統合継続支援システム（3層のセーフティネット） =====
const ContinuitySupportView = ({ onClose, userProfile, dailyRecord, targetPFC, aiSuggestion, onAutopilotRequest, onMinimumTask, onCheckIn }) => {
    const [selectedMode, setSelectedMode] = useState(null); // 'autopilot', 'minimum', 'checkin'

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto slide-up">
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white rounded-t-2xl">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full">
                        <Icon name="X" size={20} />
                    </button>
                    <h3 className="text-xl font-bold mb-2">今日はいかがでしたか？</h3>
                    <p className="text-sm opacity-90">完璧な一日でなくても大丈夫です。</p>
                </div>

                <div className="p-6 space-y-4">
                    {!selectedMode ? (
                        <>
                            {/* 選択肢1: オートパイロット・モード */}
                            <button
                                onClick={() => {
                                    setSelectedMode('autopilot');
                                    onAutopilotRequest();
                                }}
                                className="w-full p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition text-left"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Icon name="Sparkles" size={20} className="text-white" />
                                    </div>
                                    <div className="font-bold text-blue-900 text-lg">何をすれば良いか分からない</div>
                                </div>
                                <p className="text-sm text-blue-700 ml-13">
                                    AIがあなたに最適な行動を1つだけ提案します
                                </p>
                            </button>

                            {/* 選択肢2: ミニマムタスク */}
                            <button
                                onClick={() => setSelectedMode('minimum')}
                                className="w-full p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl hover:from-green-100 hover:to-emerald-100 transition text-left"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Icon name="Zap" size={20} className="text-white" />
                                    </div>
                                    <div className="font-bold text-green-900 text-lg">少しだけなら頑張れる</div>
                                </div>
                                <p className="text-sm text-green-700 ml-13">
                                    最低限のタスク: {userProfile?.minimumTask || '腕立て1回'}
                                </p>
                            </button>

                            {/* 選択肢3: セーフティ・チェックイン */}
                            <button
                                onClick={() => setSelectedMode('checkin')}
                                className="w-full p-5 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl hover:from-purple-100 hover:to-pink-100 transition text-left"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Icon name="Heart" size={20} className="text-white" />
                                    </div>
                                    <div className="font-bold text-purple-900 text-lg">今日はどうしても動けない</div>
                                </div>
                                <p className="text-sm text-purple-700 ml-13">
                                    休息もトレーニングの一部です
                                </p>
                            </button>
                        </>
                    ) : selectedMode === 'autopilot' ? (
                        <>
                            {aiSuggestion ? (
                                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon name="Sparkles" size={20} className="text-blue-600" />
                                        <h4 className="font-bold text-blue-900">AIからの提案</h4>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 mb-3">
                                        <p className="text-lg font-bold text-gray-900 mb-2">{aiSuggestion.action}</p>
                                        <p className="text-sm text-gray-600">{aiSuggestion.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            // 提案を記録して完了
                                            alert('提案を実行しました！素晴らしいです！');
                                            onClose();
                                        }}
                                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                                    >
                                        完了
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                                    <p className="text-sm text-gray-600">AIが最適な提案を考えています...</p>
                                </div>
                            )}
                            <button
                                onClick={() => setSelectedMode(null)}
                                className="w-full py-2 text-gray-600 text-sm hover:text-gray-800"
                            >
                                戻る
                            </button>
                        </>
                    ) : selectedMode === 'minimum' ? (
                        <>
                            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon name="Zap" size={20} className="text-green-600" />
                                    <h4 className="font-bold text-green-900">ミニマムタスク</h4>
                                </div>
                                <div className="bg-white rounded-lg p-4 mb-3">
                                    <p className="text-2xl font-bold text-gray-900 mb-2">{userProfile?.minimumTask || '腕立て1回'}</p>
                                    <p className="text-sm text-gray-600">この小さな一歩が、明日への継続に繋がります。</p>
                                </div>
                                <button
                                    onClick={onMinimumTask}
                                    className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
                                >
                                    完了
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedMode(null)}
                                className="w-full py-2 text-gray-600 text-sm hover:text-gray-800"
                            >
                                戻る
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon name="Heart" size={20} className="text-purple-600" />
                                    <h4 className="font-bold text-purple-900">セーフティ・チェックイン</h4>
                                </div>
                                <div className="bg-white rounded-lg p-4 mb-3">
                                    <p className="text-lg font-bold text-gray-900 mb-2">素晴らしい判断です</p>
                                    <p className="text-sm text-gray-600 mb-3">
                                        休息もトレーニングの一部です。今日は体と心を休めて、明日また頑張りましょう。
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        このチェックインにより、継続日数は維持されます。
                                    </p>
                                </div>
                                <button
                                    onClick={onCheckIn}
                                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition"
                                >
                                    継続の意思を示す
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedMode(null)}
                                className="w-full py-2 text-gray-600 text-sm hover:text-gray-800"
                            >
                                戻る
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
        // ===== 追加アイテムビュー =====
        const AddItemView = ({ type, onClose, onAdd, userProfile, predictedData, unlockedFeatures, user, currentRoutine, usageDays, dailyRecord }) => {
            const [searchTerm, setSearchTerm] = useState('');
            const [selectedItem, setSelectedItem] = useState(null);
            const [amount, setAmount] = useState(type === 'supplement' ? '1' : '100');
            const [expandedCategories, setExpandedCategories] = useState({});
            const [mealName, setMealName] = useState('');
            const [addedItems, setAddedItems] = useState([]);
            const [mealTemplates, setMealTemplates] = useState([]);
            const [supplementTemplates, setSupplementTemplates] = useState([]);
            const [showTemplates, setShowTemplates] = useState(false);
            const [templateName, setTemplateName] = useState('');
            const [selectedExercise, setSelectedExercise] = useState(null);

            // Workout用のstate
            const [exercises, setExercises] = useState([]);
            const [currentExercise, setCurrentExercise] = useState(null);
            const [sets, setSets] = useState([]);
            const [currentSet, setCurrentSet] = useState({
                weight: 50,
                reps: 10,
                distance: 0.5,
                tut: 30,
                restInterval: 90,
                duration: 0
            });
            const [workoutTemplates, setWorkoutTemplates] = useState([]);
            const [showCustomExerciseForm, setShowCustomExerciseForm] = useState(false);
            const [workoutInfoModal, setWorkoutInfoModal] = useState({ show: false, title: '', content: '' });
            const [showAdvancedTraining, setShowAdvancedTraining] = useState(false);
            const [customExerciseData, setCustomExerciseData] = useState({
                name: '',
                category: 'その他',
                subcategory: '',
                exerciseType: 'anaerobic',
                jointType: 'single',
                defaultDistance: 0.5,
                defaultTutPerRep: 3,
                exerciseFactor: 1.0,
                epocRate: 0.15,
                intervalMultiplier: 1.3,
                equipment: '',
                difficulty: '初級',
                primaryMuscles: [],
                secondaryMuscles: []
            });

            // テンプレート読み込み
            useEffect(() => {
                if (type === 'meal' && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id)) {
                    DataService.getMealTemplates(user.uid).then(setMealTemplates);
                } else if (type === 'supplement' && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id)) {
                    DataService.getSupplementTemplates(user.uid).then(setSupplementTemplates);
                }
            }, [type]);

            const renderConditionInput = () => {
                const [condition, setCondition] = useState({
                    sleepHours: 7,
                    sleep: 3,
                    fatigue: 3,
                    stress: 3,
                    mood: 3,
                    thinking: 3,
                    appetite: 3,
                    gut: 3,
                    weight: userProfile.weight || 0,
                    bodyFat: userProfile.bodyFat || 0,
                    notes: ''
                });

                const RatingButton = ({ label, value, onChange, options }) => (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{label}</label>
                        <div className="grid grid-cols-5 gap-2">
                            {options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onChange(opt.value)}
                                    className={`py-3 px-2 rounded-lg border-2 transition ${
                                        value === opt.value
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-2xl mb-1">{opt.emoji}</div>
                                    <div className="text-xs font-medium">{opt.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );

                return (
                    <div className="space-y-5">
                        {/* 睡眠時間 */}
                        <RatingButton
                            label="⏰ 睡眠時間"
                            value={condition.sleepHours}
                            onChange={(val) => setCondition({...condition, sleepHours: val})}
                            options={[
                                { value: 5, emoji: '😫', label: '5h以下' },
                                { value: 6, emoji: '😪', label: '6h' },
                                { value: 7, emoji: '😐', label: '7h' },
                                { value: 8, emoji: '😊', label: '8h' },
                                { value: 9, emoji: '🌟', label: '9h以上' }
                            ]}
                        />

                        <RatingButton
                            label="😴 睡眠の質"
                            value={condition.sleep}
                            onChange={(val) => setCondition({...condition, sleep: val})}
                            options={[
                                { value: 1, emoji: '😫', label: '最悪' },
                                { value: 2, emoji: '😪', label: '悪い' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '😊', label: '良い' },
                                { value: 5, emoji: '🌟', label: '最高' }
                            ]}
                        />

                        <RatingButton
                            label="💪 疲労度（回復具合）"
                            value={condition.fatigue}
                            onChange={(val) => setCondition({...condition, fatigue: val})}
                            options={[
                                { value: 1, emoji: '🥱', label: 'ヘトヘト' },
                                { value: 2, emoji: '😓', label: '疲れ' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '🙂', label: '回復' },
                                { value: 5, emoji: '💪', label: '絶好調' }
                            ]}
                        />

                        <RatingButton
                            label="😰 ストレスレベル"
                            value={condition.stress}
                            onChange={(val) => setCondition({...condition, stress: val})}
                            options={[
                                { value: 1, emoji: '😌', label: 'なし' },
                                { value: 2, emoji: '🙂', label: '少し' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '😰', label: '多い' },
                                { value: 5, emoji: '🤯', label: '極度' }
                            ]}
                        />

                        <RatingButton
                            label="😊 気分"
                            value={condition.mood}
                            onChange={(val) => setCondition({...condition, mood: val})}
                            options={[
                                { value: 1, emoji: '😢', label: '落ち込み' },
                                { value: 2, emoji: '😕', label: '微妙' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '😊', label: '良い' },
                                { value: 5, emoji: '🤗', label: '最高' }
                            ]}
                        />

                        <RatingButton
                            label="🧠 思考のクリアさ"
                            value={condition.thinking}
                            onChange={(val) => setCondition({...condition, thinking: val})}
                            options={[
                                { value: 1, emoji: '😵', label: 'フォグ' },
                                { value: 2, emoji: '😕', label: 'ぼんやり' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '🙂', label: 'クリア' },
                                { value: 5, emoji: '✨', label: '超クリア' }
                            ]}
                        />

                        <RatingButton
                            label="🍽️ 食欲"
                            value={condition.appetite}
                            onChange={(val) => setCondition({...condition, appetite: val})}
                            options={[
                                { value: 1, emoji: '😣', label: 'なし' },
                                { value: 2, emoji: '😕', label: '少ない' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '😋', label: 'あり' },
                                { value: 5, emoji: '🤤', label: '旺盛' }
                            ]}
                        />

                        <RatingButton
                            label="🦠 腸内環境"
                            value={condition.gut}
                            onChange={(val) => setCondition({...condition, gut: val})}
                            options={[
                                { value: 1, emoji: '😖', label: '悪い' },
                                { value: 2, emoji: '😕', label: '不調' },
                                { value: 3, emoji: '😐', label: '普通' },
                                { value: 4, emoji: '🙂', label: '良好' },
                                { value: 5, emoji: '✨', label: '快調' }
                            ]}
                        />

                        {/* 体組成記録 */}
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                                <Icon name="Scale" size={16} />
                                体組成記録（任意）
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                                        体重 (kg)
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: '体重記録について',
                                                content: `毎日の体重を記録して変化を追跡します。

【記録のタイミング】
• 起床後、トイレを済ませた後
• 朝食前の空腹時
• 毎日同じ時間帯に測定

【活用方法】
体重の変化を履歴グラフで確認でき、ダイエットやバルクアップの進捗を可視化できます。目標に応じた体重管理に役立ちます。`
                                            })}
                                            className="text-indigo-600 hover:text-indigo-800"
                                        >
                                            <Icon name="Info" size={12} />
                                        </button>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={condition.weight}
                                        onChange={(e) => setCondition({...condition, weight: parseFloat(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                                        placeholder="例: 65.5"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 flex items-center gap-1">
                                        体脂肪率 (%)
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: '体脂肪率記録について',
                                                content: `体脂肪率を記録して体組成の変化を追跡します。

【測定方法】
• 体組成計で測定
• 起床後、空腹時に測定
• 毎日同じ時間帯・条件で測定

【活用方法】
体重と体脂肪率から除脂肪体重（LBM）を計算し、筋肉量の増減を把握できます。ボディメイクの質を評価する重要な指標です。`
                                            })}
                                            className="text-indigo-600 hover:text-indigo-800"
                                        >
                                            <Icon name="Info" size={12} />
                                        </button>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={condition.bodyFat}
                                        onChange={(e) => setCondition({...condition, bodyFat: parseFloat(e.target.value) || 0})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                                        placeholder="例: 15.5"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">メモ（任意）</label>
                            <textarea
                                value={condition.notes}
                                onChange={(e) => setCondition({...condition, notes: e.target.value})}
                                placeholder="体調や気になることを記録..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                rows="3"
                            />
                        </div>

                        <button
                            onClick={() => {
                                const newCondition = {
                                    id: Date.now(),
                                    time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                    ...condition
                                };

                                onAdd(newCondition);

                                // 体組成をプロフィールに即時反映（記録後に実行）
                                if (condition.weight > 0 || condition.bodyFat > 0) {
                                    setTimeout(() => {
                                        const currentProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) || {};
                                        if (condition.weight > 0) {
                                            currentProfile.weight = condition.weight;
                                        }
                                        if (condition.bodyFat > 0) {
                                            currentProfile.bodyFat = condition.bodyFat;
                                            currentProfile.bodyFatPercentage = condition.bodyFat;
                                            // LBM（除脂肪体重）を再計算
                                            currentProfile.leanBodyMass = currentProfile.weight * (1 - currentProfile.bodyFat / 100);
                                        }
                                        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(currentProfile));
                                        // ページをリロードして更新を反映
                                        window.location.reload();
                                    }, 100);
                                }
                            }}
                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            記録する
                        </button>
                    </div>
                );
            };

            const renderSupplementInput = () => {
                const fuzzyMatch = (text, query) => {
                    if (!query || query.trim() === '') return true;
                    const normalize = (str) => {
                        return str
                            .toLowerCase()
                            .replace(/[（）\(\)]/g, '') // 括弧を削除
                            .replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
                            .replace(/\s+/g, ''); // 空白削除
                    };
                    const normalizedText = normalize(text);
                    const normalizedQuery = normalize(query);
                    return normalizedText.includes(normalizedQuery);
                };

                const [addedItems, setAddedItems] = useState([]);
                const [showCustomSupplementForm, setShowCustomSupplementForm] = useState(false);
                const [customSupplementData, setCustomSupplementData] = useState({
                    name: '',
                    category: 'ビタミン・ミネラル',
                    servingSize: 1,
                    servingUnit: 'g',
                    calories: 0,
                    protein: 0,
                    fat: 0,
                    carbs: 0,
                    vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                    vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                    niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                    sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                    iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                    otherNutrients: [] // [{name: '', amount: '', unit: ''}]
                });

                const filteredSupplements = supplementDB.filter(supp =>
                    fuzzyMatch(supp.name, searchTerm)
                );

                // テンプレート保存
                const saveAsTemplate = async () => {
                    if (!templateName.trim() || addedItems.length === 0) {
                        alert('テンプレート名を入力し、サプリメントを追加してください');
                        return;
                    }
                    const template = {
                        id: Date.now(),
                        name: templateName,
                        items: addedItems
                    };
                    await DataService.saveSupplementTemplate(user.uid, template);
                    const templates = await DataService.getSupplementTemplates(user.uid);
                    setSupplementTemplates(templates);
                    alert('テンプレートを保存しました');
                    setTemplateName('');
                };

                const loadTemplate = (template) => {
                    // ディープコピーして参照を切る（複製不具合を防止）
                    const copiedItems = JSON.parse(JSON.stringify(template.items));
                    setAddedItems(copiedItems);
                };

                const deleteTemplate = async (templateId) => {
                    if (confirm('このテンプレートを削除しますか？')) {
                        await DataService.deleteSupplementTemplate(user.uid, templateId);
                        const templates = await DataService.getSupplementTemplates(user.uid);
                        setSupplementTemplates(templates);
                    }
                };

                return (
                    <div className="space-y-4">
                        {/* ①検索欄 */}
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="サプリメントを検索..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />

                        {/* ②折りたたみカテゴリ一覧 */}
                        {!selectedItem ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {(() => {
                                    const categories = {};
                                    filteredSupplements.forEach(supp => {
                                        if (!categories[supp.category]) {
                                            categories[supp.category] = [];
                                        }
                                        categories[supp.category].push(supp);
                                    });

                                    return Object.keys(categories).map(category => (
                                        <div key={category} className="border rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                            >
                                                <span className="font-medium">{category}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{categories[category].length}品目</span>
                                                    <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={20} />
                                                </div>
                                            </button>
                                            {expandedCategories[category] && (
                                                <div className="p-2 space-y-1">
                                                    {categories[category].map(supp => (
                                                        <button
                                                            key={supp.id}
                                                            onClick={() => setSelectedItem(supp)}
                                                            className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg transition"
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium">{supp.name}</span>
                                                                <div className="text-right text-xs text-gray-500">
                                                                    <div>{supp.calories}kcal</div>
                                                                    <div>P:{supp.protein}g</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                                            <p className="text-sm text-gray-600">{selectedItem.category}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold">{selectedItem.calories}kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold">{selectedItem.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold">{selectedItem.fat}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold">{selectedItem.carbs}g</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        回数（1回分 = {selectedItem.unit || `${selectedItem.servingSize || 1}${selectedItem.servingUnit || 'g'}`}）
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: 'サプリメント入力の使い方',
                                                content: `サプリメントの摂取回数を入力します。

【入力方法】
1. スライダーをドラッグして回数を設定（1～20回）
2. 目盛り数値（1、5、10など）をタップで即座に設定
3. 入力欄に直接数値を入力

【1回分とは？】
• プロテイン: 付属スプーン1杯（約25g）
• クレアチン: 付属スプーン1杯（約5g）
• マルチビタミン: 1粒・1錠
• BCAA: 付属スプーン1杯（約5g）

【入力例】
• プロテインを朝晩2回飲む → 「2」と入力
• マルチビタミンを1日1粒 → 「1」と入力
• クレアチンを1日4回 → 「4」と入力

【PFC自動計算】
入力した回数に応じて、たんぱく質（P）・脂質（F）・炭水化物（C）が自動計算され、1日の目標に反映されます。`
                                            })}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Icon name="Info" size={14} />
                                        </button>
                                    </label>
                                    <div className="mb-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            step="1"
                                            value={amount || 1}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            style={{
                                                background: `linear-gradient(to right, #2563eb 0%, #2563eb ${((amount || 1)/20)*100}%, #e5e7eb ${((amount || 1)/20)*100}%, #e5e7eb 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span onClick={() => setAmount(1)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">1</span>
                                            <span onClick={() => setAmount(5)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">5</span>
                                            <span onClick={() => setAmount(10)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">10</span>
                                            <span onClick={() => setAmount(15)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">15</span>
                                            <span onClick={() => setAmount(20)} className="cursor-pointer hover:text-blue-600 hover:font-bold transition">20</span>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        value={amount || '1'}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="1"
                                    />
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium mb-2">摂取量（{amount || 1}回分）</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-600">カロリー</p>
                                            <p className="font-bold text-blue-600">
                                                {Math.round(selectedItem.calories * Number(amount || 1))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">P</p>
                                            <p className="font-bold">{(selectedItem.protein * Number(amount || 1)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">F</p>
                                            <p className="font-bold">{(selectedItem.fat * Number(amount || 1)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">C</p>
                                            <p className="font-bold">{(selectedItem.carbs * Number(amount || 1)).toFixed(1)}g</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const numAmount = Number(amount || 1);

                                        // Calculate vitamins and minerals based on amount
                                        const vitamins = {};
                                        const minerals = {};

                                        if (selectedItem.vitamins) {
                                            Object.keys(selectedItem.vitamins).forEach(key => {
                                                vitamins[key] = selectedItem.vitamins[key] * numAmount;
                                            });
                                        }

                                        if (selectedItem.minerals) {
                                            Object.keys(selectedItem.minerals).forEach(key => {
                                                minerals[key] = selectedItem.minerals[key] * numAmount;
                                            });
                                        }

                                        // その他の栄養素を計算
                                        const otherNutrients = {};
                                        const otherNutrientKeys = ['caffeine', 'catechin', 'tannin', 'polyphenol', 'chlorogenicAcid',
                                                                    'creatine', 'lArginine', 'lCarnitine', 'EPA', 'DHA', 'coQ10',
                                                                    'lutein', 'astaxanthin'];
                                        otherNutrientKeys.forEach(key => {
                                            if (selectedItem[key]) {
                                                otherNutrients[key] = selectedItem[key] * numAmount;
                                            }
                                        });

                                        // unitフィールドから分量と単位を抽出
                                        let servingSize = selectedItem.servingSize || 1;
                                        let servingUnit = selectedItem.servingUnit || 'g';

                                        if (selectedItem.unit) {
                                            // "30g" → servingSize=30, servingUnit="g"
                                            // "1粒" → servingSize=1, servingUnit="粒"
                                            // "2粒" → servingSize=2, servingUnit="粒"
                                            const match = selectedItem.unit.match(/^(\d+(?:\.\d+)?)(.*)/);
                                            if (match) {
                                                servingSize = parseFloat(match[1]);
                                                servingUnit = match[2] || 'g';
                                            }
                                        }

                                        const newItem = {
                                            name: selectedItem.name,
                                            amount: `${numAmount}回分`,
                                            servings: numAmount,
                                            totalWeight: servingSize * numAmount,
                                            servingSize: servingSize,
                                            servingUnit: servingUnit,
                                            unit: selectedItem.unit || `${servingSize}${servingUnit}`,
                                            protein: selectedItem.protein * numAmount,
                                            fat: selectedItem.fat * numAmount,
                                            carbs: selectedItem.carbs * numAmount,
                                            calories: selectedItem.calories * numAmount,
                                            vitamins: vitamins,
                                            minerals: minerals,
                                            otherNutrients: otherNutrients
                                        };
                                        setAddedItems([...addedItems, newItem]);
                                        setSelectedItem(null);
                                        setAmount('1');
                                    }}
                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
                                >
                                    追加
                                </button>
                            </div>
                        )}

                        {/* ③追加済みアイテム一覧 */}
                        {addedItems.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <p className="text-sm font-medium text-blue-900 mb-3">追加済み ({addedItems.length}品目)</p>
                                <div className="space-y-2">
                                    {addedItems.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center bg-white p-2 rounded">
                                            <span className="text-sm">{item.name} × {item.amount}</span>
                                            <button
                                                onClick={() => setAddedItems(addedItems.filter((_, i) => i !== index))}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Icon name="X" size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ④テンプレート（一覧+新規保存） - 12日以上で開放 */}
                        {unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id) && !selectedItem && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                <button
                                    onClick={() => setShowTemplates(!showTemplates)}
                                    className="w-full flex items-center justify-between mb-3"
                                >
                                    <span className="font-medium text-yellow-800 flex items-center gap-2">
                                        <Icon name="BookTemplate" size={16} />
                                        テンプレート
                                    </span>
                                    <Icon name={showTemplates ? "ChevronUp" : "ChevronDown"} size={16} />
                                </button>

                                {showTemplates && (
                                    <div className="space-y-3">
                                        {/* テンプレート一覧 */}
                                        {supplementTemplates.length > 0 && (
                                            <div className="space-y-2">
                                                {supplementTemplates.map(template => (
                                                    <div key={template.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                                        <button
                                                            onClick={() => loadTemplate(template)}
                                                            className="flex-1 text-left text-sm hover:text-blue-600"
                                                        >
                                                            <p className="font-medium">{template.name}</p>
                                                            <p className="text-xs text-gray-500">{template.items.length}品目</p>
                                                        </button>
                                                        <button
                                                            onClick={() => deleteTemplate(template.id)}
                                                            className="p-1 text-red-500 hover:text-red-700"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* テンプレート新規保存 */}
                                        {addedItems.length > 0 && (
                                            <div className="pt-3 border-t border-yellow-300">
                                                <p className="text-xs text-yellow-800 mb-2">新しいテンプレートとして保存</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value)}
                                                        placeholder="テンプレート名（例: 朝の定番サプリ）"
                                                        className="flex-1 px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={saveAsTemplate}
                                                        className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                                                    >
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {supplementTemplates.length === 0 && addedItems.length === 0 && (
                                            <p className="text-sm text-gray-600">保存されたテンプレートはありません</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* カスタムサプリメント作成 */}
                        {!selectedItem && (
                            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                                <div className="w-full flex items-center justify-between">
                                    <button
                                        onClick={() => setShowCustomSupplementForm(!showCustomSupplementForm)}
                                        className="flex-1 flex items-center gap-2 font-medium text-green-800"
                                    >
                                        <Icon name="Plus" size={16} />
                                        カスタムサプリメントを作成
                                    </button>
                                    <button type="button" onClick={() => {
                                        setWorkoutInfoModal({
                                            show: true,
                                            title: 'カスタムサプリメント作成について',
                                            content: `データベースにないサプリメントを独自に登録できます。

【基本情報の入力】
• 名前: サプリメントの名称（例: マイプロテイン ホエイ）
• カテゴリ: 種類を選択（プロテイン、ビタミン・ミネラル、アミノ酸など）
• 1回分の量: 1回あたりの摂取量と単位（例: 30g、500ml）

【栄養素の入力】
• 基本栄養素: カロリー、タンパク質、脂質、炭水化物
• ビタミン・ミネラル: 詳細な微量栄養素（任意）
• すべて「1回分あたり」の含有量を入力してください

【データの参照方法】
1. 商品パッケージの栄養成分表示を確認
2. メーカー公式サイトの製品情報ページ
3. 栄養データベース（文部科学省の食品成分データベースなど）

【作成後の使い方】
保存すると、サプリメント選択画面に追加され、他のサプリと同様に記録できるようになります。回数（servings）を入力すると、PFCに自動反映されます。

【注意点】
• 正確な栄養情報の入力が重要です
• ビタミン・ミネラルは任意項目です（わかる範囲で入力）
• 作成後も編集・削除が可能です`
                                        });
                                    }} className="text-green-700 hover:text-green-900 p-1">
                                        <Icon name="Info" size={14} />
                                    </button>
                                    <button
                                        onClick={() => setShowCustomSupplementForm(!showCustomSupplementForm)}
                                        className="text-green-800 p-1"
                                    >
                                        <Icon name={showCustomSupplementForm ? "ChevronUp" : "ChevronDown"} size={16} />
                                    </button>
                                </div>
                                {showCustomSupplementForm && (
                                    <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
                                        <input
                                            type="text"
                                            value={customSupplementData.name}
                                            onChange={(e) => setCustomSupplementData({...customSupplementData, name: e.target.value})}
                                            placeholder="名前（例: マルチビタミン）"
                                            className="w-full px-3 py-2 text-sm border rounded-lg"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={customSupplementData.category}
                                                onChange={(e) => setCustomSupplementData({...customSupplementData, category: e.target.value})}
                                                className="w-full px-3 py-2 text-sm border rounded-lg"
                                            >
                                                <option value="ビタミン・ミネラル">ビタミン・ミネラル</option>
                                                <option value="プロテイン">プロテイン</option>
                                                <option value="アミノ酸">アミノ酸</option>
                                                <option value="ドリンク">ドリンク</option>
                                                <option value="その他">その他</option>
                                            </select>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={customSupplementData.servingSize}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, servingSize: e.target.value === '' ? '' : (parseFloat(e.target.value) || 1)})}
                                                    placeholder="1回分の量"
                                                    className="flex-1 px-3 py-2 text-sm border rounded-lg"
                                                />
                                                <select
                                                    value={customSupplementData.servingUnit}
                                                    onChange={(e) => setCustomSupplementData({...customSupplementData, servingUnit: e.target.value})}
                                                    className="px-3 py-2 text-sm border rounded-lg"
                                                >
                                                    <option value="g">g</option>
                                                    <option value="mg">mg</option>
                                                    <option value="ml">ml</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">基本栄養素（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-600">カロリー (kcal)</label>
                                                    <input type="number" value={customSupplementData.calories} onChange={(e) => setCustomSupplementData({...customSupplementData, calories: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600">タンパク質 (g)</label>
                                                    <input type="number" value={customSupplementData.protein} onChange={(e) => setCustomSupplementData({...customSupplementData, protein: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600">脂質 (g)</label>
                                                    <input type="number" value={customSupplementData.fat} onChange={(e) => setCustomSupplementData({...customSupplementData, fat: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-600">炭水化物 (g)</label>
                                                    <input type="number" value={customSupplementData.carbs} onChange={(e) => setCustomSupplementData({...customSupplementData, carbs: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">ビタミン（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-xs text-gray-600">ビタミンA (μg)</label><input type="number" value={customSupplementData.vitaminA} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminA: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB1 (mg)</label><input type="number" value={customSupplementData.vitaminB1} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB1: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB2 (mg)</label><input type="number" value={customSupplementData.vitaminB2} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB2: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB6 (mg)</label><input type="number" value={customSupplementData.vitaminB6} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB6: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンB12 (μg)</label><input type="number" value={customSupplementData.vitaminB12} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminB12: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンC (mg)</label><input type="number" value={customSupplementData.vitaminC} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminC: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンD (μg)</label><input type="number" value={customSupplementData.vitaminD} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminD: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンE (mg)</label><input type="number" value={customSupplementData.vitaminE} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminE: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビタミンK (μg)</label><input type="number" value={customSupplementData.vitaminK} onChange={(e) => setCustomSupplementData({...customSupplementData, vitaminK: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ナイアシン (mg)</label><input type="number" value={customSupplementData.niacin} onChange={(e) => setCustomSupplementData({...customSupplementData, niacin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">パントテン酸 (mg)</label><input type="number" value={customSupplementData.pantothenicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, pantothenicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ビオチン (μg)</label><input type="number" value={customSupplementData.biotin} onChange={(e) => setCustomSupplementData({...customSupplementData, biotin: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">葉酸 (μg)</label><input type="number" value={customSupplementData.folicAcid} onChange={(e) => setCustomSupplementData({...customSupplementData, folicAcid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">ミネラル（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-xs text-gray-600">ナトリウム (mg)</label><input type="number" value={customSupplementData.sodium} onChange={(e) => setCustomSupplementData({...customSupplementData, sodium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">カリウム (mg)</label><input type="number" value={customSupplementData.potassium} onChange={(e) => setCustomSupplementData({...customSupplementData, potassium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">カルシウム (mg)</label><input type="number" value={customSupplementData.calcium} onChange={(e) => setCustomSupplementData({...customSupplementData, calcium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">マグネシウム (mg)</label><input type="number" value={customSupplementData.magnesium} onChange={(e) => setCustomSupplementData({...customSupplementData, magnesium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">リン (mg)</label><input type="number" value={customSupplementData.phosphorus} onChange={(e) => setCustomSupplementData({...customSupplementData, phosphorus: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">鉄 (mg)</label><input type="number" value={customSupplementData.iron} onChange={(e) => setCustomSupplementData({...customSupplementData, iron: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">亜鉛 (mg)</label><input type="number" value={customSupplementData.zinc} onChange={(e) => setCustomSupplementData({...customSupplementData, zinc: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">銅 (mg)</label><input type="number" value={customSupplementData.copper} onChange={(e) => setCustomSupplementData({...customSupplementData, copper: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">マンガン (mg)</label><input type="number" value={customSupplementData.manganese} onChange={(e) => setCustomSupplementData({...customSupplementData, manganese: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">ヨウ素 (μg)</label><input type="number" value={customSupplementData.iodine} onChange={(e) => setCustomSupplementData({...customSupplementData, iodine: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">セレン (μg)</label><input type="number" value={customSupplementData.selenium} onChange={(e) => setCustomSupplementData({...customSupplementData, selenium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">クロム (μg)</label><input type="number" value={customSupplementData.chromium} onChange={(e) => setCustomSupplementData({...customSupplementData, chromium: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                                <div><label className="text-xs text-gray-600">モリブデン (μg)</label><input type="number" value={customSupplementData.molybdenum} onChange={(e) => setCustomSupplementData({...customSupplementData, molybdenum: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-2">
                                            <p className="text-xs font-medium text-gray-700 mb-2">その他の栄養素（{customSupplementData.servingSize}{customSupplementData.servingUnit}あたり）</p>
                                            {customSupplementData.otherNutrients.map((nutrient, idx) => (
                                                <div key={idx} className="flex gap-2 mb-2">
                                                    <input type="text" value={nutrient.name} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].name = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="栄養素名" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                    <input type="number" value={nutrient.amount} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].amount = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="量" className="w-20 px-2 py-1 text-sm border rounded" />
                                                    <input type="text" value={nutrient.unit} onChange={(e) => { const updated = [...customSupplementData.otherNutrients]; updated[idx].unit = e.target.value; setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} placeholder="単位" className="w-16 px-2 py-1 text-sm border rounded" />
                                                    <button onClick={() => { const updated = customSupplementData.otherNutrients.filter((_, i) => i !== idx); setCustomSupplementData({...customSupplementData, otherNutrients: updated}); }} className="text-red-500"><Icon name="X" size={16} /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => setCustomSupplementData({...customSupplementData, otherNutrients: [...customSupplementData.otherNutrients, {name: '', amount: '', unit: ''}]})} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">+ 栄養素を追加</button>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (!customSupplementData.name.trim()) {
                                                    alert('サプリメント名を入力してください');
                                                    return;
                                                }
                                                const customSupplement = {
                                                    id: Date.now(),
                                                    ...customSupplementData,
                                                    isCustom: true
                                                };
                                                setSelectedItem(customSupplement);
                                                setCustomSupplementData({
                                                    name: '', category: 'ビタミン・ミネラル', servingSize: 1, servingUnit: 'g',
                                                    calories: 0, protein: 0, fat: 0, carbs: 0,
                                                    vitaminA: 0, vitaminB1: 0, vitaminB2: 0, vitaminB6: 0, vitaminB12: 0,
                                                    vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0,
                                                    niacin: 0, pantothenicAcid: 0, biotin: 0, folicAcid: 0,
                                                    sodium: 0, potassium: 0, calcium: 0, magnesium: 0, phosphorus: 0,
                                                    iron: 0, zinc: 0, copper: 0, manganese: 0, iodine: 0, selenium: 0, chromium: 0, molybdenum: 0,
                                                    otherNutrients: []
                                                });
                                                setShowCustomSupplementForm(false);
                                            }}
                                            className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                        >
                                            作成して選択
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ⑤記録ボタン */}
                        {addedItems.length > 0 && !selectedItem && (
                            <button
                                onClick={async () => {
                                    const newSupplement = {
                                        id: Date.now(),
                                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                        name: 'サプリメント',
                                        icon: 'Pill',
                                        items: addedItems
                                    };

                                    // テンプレートとして自動保存（テンプレート名があり、テンプレート機能が開放されている場合）
                                    if (templateName && unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id)) {
                                        const template = {
                                            id: Date.now(),
                                            name: templateName,
                                            items: addedItems
                                        };
                                        await DataService.saveSupplementTemplate(user.uid, template);
                                        const templates = await DataService.getSupplementTemplates(user.uid);
                                        setSupplementTemplates(templates);
                                        setTemplateName('');
                                    }

                                    onAdd(newSupplement);
                                }}
                                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                記録する
                            </button>
                        )}
                    </div>
                );
            };

            const renderWorkoutInput = () => {
                const fuzzyMatch = (text, query) => {
                    if (!query || query.trim() === '') return true;
                    const normalize = (str) => {
                        return str
                            .toLowerCase()
                            .replace(/[（）\(\)]/g, '') // 括弧を削除
                            .replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
                            .replace(/\s+/g, ''); // 空白削除
                    };
                    const normalizedText = normalize(text);
                    const normalizedQuery = normalize(query);
                    return normalizedText.includes(normalizedQuery);
                };

                useEffect(() => {
                    loadTemplates();
                    // ルーティンからワークアウト自動読み込み
                    if (currentRoutine && !currentRoutine.isRestDay && currentRoutine.exercises) {
                        // ルーティンの最初の種目を自動選択
                        if (currentRoutine.exercises.length > 0) {
                            const firstExercise = currentRoutine.exercises[0];
                            setCurrentExercise(firstExercise.exercise);
                            if (firstExercise.sets && firstExercise.sets.length > 0) {
                                setSets(firstExercise.sets.map(set => ({
                                    ...set,
                                    duration: set.duration || 0
                                })));
                            }
                        }
                    }
                }, []);

                const loadTemplates = async () => {
                    const templates = await DataService.getWorkoutTemplates(user.uid);
                    setWorkoutTemplates(templates);
                };

                const saveAsTemplate = async () => {
                    if (exercises.length === 0 || !templateName.trim()) {
                        alert('テンプレート名を入力し、種目を追加してください');
                        return;
                    }
                    const template = {
                        id: Date.now(),
                        name: templateName,
                        exercises: exercises, // 複数種目を保存
                        createdAt: new Date().toISOString()
                    };
                    await DataService.saveWorkoutTemplate(user.uid, template);
                    setTemplateName('');
                    alert('テンプレートを保存しました');
                    loadTemplates();
                };

                const loadTemplate = (template) => {
                    // 新形式（複数種目）と旧形式（単一種目）の両方に対応
                    if (template.exercises && Array.isArray(template.exercises)) {
                        // 新形式：複数種目を読み込み
                        setExercises(template.exercises);
                        setCurrentExercise(null);
                        setSets([]);
                    } else if (template.exercise) {
                        // 旧形式：単一種目を読み込み
                        setCurrentExercise(template.exercise);
                        setSets(template.sets || []);
                    }
                    setShowTemplates(false);
                };

                const deleteTemplate = async (templateId) => {
                    if (confirm('このテンプレートを削除しますか？')) {
                        await DataService.deleteWorkoutTemplate(user.uid, templateId);
                        loadTemplates();
                    }
                };

                const handleWorkoutSave = async () => {
                    if (exercises.length === 0) {
                        alert('運動を追加してください');
                        return;
                    }

                    // 現在の日付を取得
                    const today = new Date().toISOString().split('T')[0];

                    // 運動データを保存
                    const workoutData = exercises.map(ex => ({
                        name: ex.exercise.name,
                        category: ex.exercise.category,
                        sets: ex.sets,
                        calories: ex.calories
                    }));

                    // dailyRecordに保存
                    const existingRecord = await DataService.getDailyRecord(user?.uid || DEV_USER_ID, today);
                    const updatedRecord = {
                        ...existingRecord,
                        exercises: [...(existingRecord.exercises || []), ...workoutData]
                    };

                    await DataService.saveDailyRecord(user?.uid || DEV_USER_ID, today, updatedRecord);

                    alert('運動を保存しました');
                    onClose();
                };

                const filteredExercises = exerciseDB.filter(ex =>
                    fuzzyMatch(ex.name, searchTerm) ||
                    fuzzyMatch(ex.category, searchTerm)
                );

                // セット単位では体積のみを記録（カロリーは種目単位で計算）
                const calculateSetVolume = (set) => {
                    const weight = set.weight || 0;
                    const reps = set.reps || 0;
                    return weight * reps; // 総体積 (kg × reps)
                };

                // 種目全体のカロリーを計算（論文の回帰式）
                const calculateExerciseCalories = (sets) => {
                    /**
                     * レジスタンス運動カロリー消費予測式（回帰モデル）
                     *
                     * 【科学的根拠】
                     * 間接熱量測定法による実測データから導出された多重線形回帰式
                     * R² = 0.751, SEE = 29.7 kcal, p < 0.0001
                     *
                     * 【重要】この式は1回のワークアウトセッション全体に対する予測式
                     *
                     * 【計算式】
                     * 正味kcal = 1.125(身長, cm) - 0.662(年齢, 歳) - 0.800(脂肪量, kg)
                     *           + 1.344(LBM, kg) + 2.278(総体積 × 10^-3) - 144.846
                     *
                     * 【総体積の定義】
                     * 総体積 = Σ(使用重量(kg) × 回数(reps)) ← 全セットの合計
                     */

                    // ユーザープロフィール取得
                    const userProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || '{}');
                    const height = userProfile.height || 170; // 身長 (cm)
                    const age = userProfile.age || 30; // 年齢 (歳)
                    const lbm = userProfile.leanBodyMass || 50; // 除脂肪体重 (kg)
                    const weight_total = userProfile.weight || 70; // 体重 (kg)
                    const fatMass = weight_total - lbm; // 脂肪量 (kg)

                    // 全セットの総体積を計算
                    const totalVolume = sets.reduce((sum, set) => {
                        return sum + calculateSetVolume(set);
                    }, 0);

                    // 回帰式による消費カロリー計算
                    const netKcal =
                        1.125 * height -
                        0.662 * age -
                        0.800 * fatMass +
                        1.344 * lbm +
                        2.278 * (totalVolume * 0.001) -
                        144.846;

                    // 負の値を防ぐ
                    return Math.max(netKcal, 0);
                };

                return (
                    <div className="space-y-4">
                        {/* ①検索欄 */}
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="種目を検索..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />

                        {/* PG-K式説明バナー */}
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                            <button
                                type="button"
                                onClick={() => setWorkoutInfoModal({
                                    show: true,
                                    title: 'PG-K式とは？ - METsを超えた科学的カロリー計算',
                                    content: `Your Coach+は、従来のMETs法の限界を克服した独自アルゴリズム「PG-K式（PG-Kinetic Formula）」を搭載しています。

【従来のMETs法の致命的欠陥】

一般的なフィットネスアプリは、METsという固定値でカロリーを計算します：
• ウェイトトレーニング（軽度）= 3.5 METs
• ウェイトトレーニング（高強度）= 6.0 METs

これには4つの深刻な問題があります：

1. **総体重のみ使用**
   → 筋肉量と脂肪量を区別しない
   → 筋肉質な人ほど不正確

2. **実際の仕事量を無視**
   → 10kgのダンベルも200kgのバーベルも同じ扱い
   → 重量・回数・距離が反映されない

3. **休息時間の混同**
   → セット間の休憩も「高強度」として計算
   → 実際の運動時間の3〜4倍を過大評価

4. **アフターバーン効果（EPOC）の無視**
   → トレーニング後24〜48時間続く代謝亢進を計算外
   → 筋トレの真価を見逃す

【PG-K式の革新性】

Your Coach+のPG-K式は、これらすべてを解決します：

**A: 物理的仕事量の正確な計算**
カロリー = (重量 × 距離 × 回数 × 種目係数) / 4184 / 0.22

• 重量・距離・回数を個別に計測
• Joule → kcal の正確な単位変換
• 人体の機械効率（η=0.22）を科学的に反映
• 種目係数で全身動員度を調整

**B: 体組成に基づく代謝コスト**
代謝 = BMR/秒 × 運動強度(1.5倍) × TUT

• LBM（除脂肪体重）と脂肪量を分離
• BMR = (LBM × 22) + (脂肪 × 4.5) kcal/day
• あなた固有の代謝能力を反映
• セット中の緊張時間（TUT）を考慮

**C: 断続的トレーニングの正確な処理**
• セット単位で個別計算
• 休息時間を過大評価しない
• 実際の運動時間のみを正確に評価

【科学的根拠】

PG-K式は、ウェスタンケンタッキー大学（WKU）の研究が証明した2大予測因子を統合：

1. **除脂肪体重（LBM）** - エネルギー消費の主要因
2. **総仕事量** - 実際に行った物理的な仕事

この研究の予測精度（R²=0.751）は、エネルギー消費の変動の75%を説明できることを意味し、この分野で非常に高い精度です。

【あなたへの価値】

✓ **正当な評価**: あなたの努力が正確に数値化される
✓ **個別最適化**: あなたの体組成に基づく計算
✓ **科学的信頼性**: 学術研究に基づいた独自技術
✓ **モチベーション**: 真のカロリー消費を知ることで継続力UP

出典: "METsを超えて: 筋力トレーニングにおけるエネルギー消費量の科学的再評価"`
                                })}
                                className="w-full text-left flex items-start gap-3 hover:opacity-80 transition"
                            >
                                <div className="flex-shrink-0 w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                                    <Icon name="Zap" size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-orange-900 mb-1 flex items-center gap-2">
                                        PG-K式搭載 - METsを超えた科学
                                        <Icon name="ChevronRight" size={16} className="text-orange-600" />
                                    </h3>
                                    <p className="text-xs text-orange-700">
                                        あなたの体組成と実際の仕事量で、正確にカロリーを計算します
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* ②折りたたみカテゴリ一覧 */}
                        {!currentExercise ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {(() => {
                                        const categories = {};
                                        filteredExercises.forEach(ex => {
                                            if (!categories[ex.category]) {
                                                categories[ex.category] = [];
                                            }
                                            categories[ex.category].push(ex);
                                        });

                                        return Object.keys(categories).map(category => (
                                            <div key={category} className="border rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                                >
                                                    <span className="font-medium">{category}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{categories[category].length}種目</span>
                                                        <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={20} />
                                                    </div>
                                                </button>
                                                {expandedCategories[category] && (
                                                    <div className="p-2 space-y-1">
                                                        {categories[category].map(exercise => (
                                                            <button
                                                                key={exercise.id}
                                                                onClick={() => setCurrentExercise(exercise)}
                                                                className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded-lg transition"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <p className="font-medium">{exercise.name}</p>
                                                                        <p className="text-xs text-gray-500">{exercise.subcategory}</p>
                                                                    </div>
                                                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full self-start">
                                                                        {exercise.exerciseType === 'aerobic' ? '有酸素' : '無酸素'}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{currentExercise.name}</h4>
                                            <p className="text-sm text-gray-600">{currentExercise.category}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCurrentExercise(null);
                                                setSets([]);
                                            }}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* 重量入力 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            重量 (kg)
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkoutInfoModal({
                                                        show: true,
                                                        title: 'トレーニング重量入力の使い方',
                                                        content: `使用した重量をキログラム単位で入力します。

【入力方法】
1. スライダーをドラッグして大まかな重量を設定（0～500kg）
2. 目盛り数値（100kg、200kgなど）をタップで即座に設定
3. 入力欄に直接数値を入力
4. 増減ボタン（-10～+10）で微調整

【入力の目安】
• ダンベル: 片手の重量（例: 10kg）
• バーベル: プレート込みの総重量（例: 60kg）
• マシン: 選択したウェイトの重量
• 自重トレーニング: 体重を入力

【PG式での活用】
重量は運動強度の重要な指標です。PG式では、重量と回数、可動距離を組み合わせて物理的仕事量を算出し、正確な消費カロリーを計算します。`
                                                    })}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <Icon name="Info" size={14} />
                                                </button>
                                            </label>
                                            {/* スライダー - 重量 */}
                                            <div className="mb-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="500"
                                                    step="2.5"
                                                    value={currentSet.weight}
                                                    onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${(currentSet.weight/500)*100}%, #e5e7eb ${(currentSet.weight/500)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 0})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">0kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 100})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">100kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 200})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">200kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 300})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">300kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 400})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">400kg</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, weight: 500})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">500kg</span>
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                value={currentSet.weight}
                                                onChange={(e) => setCurrentSet({...currentSet, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 10)})}
                                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                                >
                                                    -10
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 5)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Math.max(0, Number(currentSet.weight) - 2.5)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -2.5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 2.5})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +2.5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 5})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, weight: Number(currentSet.weight) + 10})}
                                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                                >
                                                    +10
                                                </button>
                                            </div>
                                    </div>

                                    {/* 回数入力 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            回数
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkoutInfoModal({
                                                        show: true,
                                                        title: 'トレーニング回数入力の使い方',
                                                        content: `1セットで実施した回数（レップ数）を入力します。

【入力方法】
1. スライダーをドラッグして回数を設定（1～50回）
2. 目盛り数値（10回、20回など）をタップで即座に設定
3. 入力欄に直接数値を入力
4. 増減ボタン（-5/-3/-1/+1/+3/+5）で微調整

【トレーニング目的別の目安】
• 筋力向上: 1～5回（高重量）
• 筋肥大: 6～12回（中重量）
• 筋持久力: 13回以上（低～中重量）
• 有酸素運動: 継続時間を総時間に入力

【PG式での活用】
回数は運動の質を示す指標です。重量×回数×可動距離で物理的仕事量が決まり、それがPG式による精密な消費カロリー計算の基礎となります。`
                                                    })}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <Icon name="Info" size={14} />
                                                </button>
                                            </label>
                                            {/* スライダー - 回数 */}
                                            <div className="mb-2">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="50"
                                                    step="1"
                                                    value={currentSet.reps}
                                                    onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value === '' ? '' : Number(e.target.value)})}
                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                                    style={{
                                                        background: `linear-gradient(to right, #ea580c 0%, #ea580c ${(currentSet.reps/50)*100}%, #e5e7eb ${(currentSet.reps/50)*100}%, #e5e7eb 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 1})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">1回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 10})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">10回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 20})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">20回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 30})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">30回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 40})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">40回</span>
                                                    <span onClick={() => setCurrentSet({...currentSet, reps: 50})} className="cursor-pointer hover:text-orange-600 hover:font-bold transition">50回</span>
                                                </div>
                                            </div>
                                            <input
                                                type="number"
                                                value={currentSet.reps}
                                                onChange={(e) => setCurrentSet({...currentSet, reps: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                            {/* 増減ボタン */}
                                            <div className="grid grid-cols-6 gap-1 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 5)})}
                                                    className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                                >
                                                    -5
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 3)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -3
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Math.max(1, Number(currentSet.reps) - 1)})}
                                                    className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                                >
                                                    -1
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 1})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +1
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 3})}
                                                    className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                                >
                                                    +3
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSet({...currentSet, reps: Number(currentSet.reps) + 5})}
                                                    className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                                >
                                                    +5
                                                </button>
                                            </div>
                                    </div>

                                    {/* RM更新記録（常設） */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            RM更新記録（任意）
                                            <button
                                                type="button"
                                                onClick={() => setWorkoutInfoModal({
                                                    show: true,
                                                    title: 'RM更新記録とは？',
                                                    content: `この種目で自己ベスト（RM: Repetition Maximum）を更新した場合に記録します。

【RMとは】
• 1RM: 1回だけ挙げられる最大重量
• 5RM: 5回だけ挙げられる最大重量
• 10RM: 10回だけ挙げられる最大重量

【記録例】
• ベンチプレス 1reps × 100kg
• スクワット 5reps × 120kg
• デッドリフト 3reps × 150kg

【活用方法】
履歴画面でRM更新の記録を確認でき、筋力の成長を可視化できます。目標達成のモチベーション維持に役立ちます。

【入力形式】
「種目名 回数reps × 重量kg」の形式で入力すると見やすくなります。
例: ベンチプレス 1reps × 100kg`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentSet.rmUpdate || ''}
                                            onChange={(e) => setCurrentSet({...currentSet, rmUpdate: e.target.value})}
                                            placeholder="例: ベンチプレス 1reps × 100kg"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>

                                    {/* 総時間（常設） */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                            総時間 (分)
                                            <button
                                                type="button"
                                                onClick={() => setWorkoutInfoModal({
                                                    show: true,
                                                    title: '総時間とは？',
                                                    content: `この種目に費やした総時間を分単位で入力します。ウォームアップからクールダウンまでの全体時間です。

【入力の目安】
• 筋トレ: 5～15分/種目（セット間休憩含む）
• 有酸素運動: 実施した時間（例: ランニング30分）
• ストレッチ: 実施した時間

【意図】
総時間は、セット間の休憩時間や準備動作も含めた総合的な運動時間を把握するための指標です。特に有酸素運動や持久系トレーニングでは重要な入力項目となります。

【オプション】
この項目は任意入力です。空欄の場合は他のパラメータから消費カロリーを算出します。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            value={currentSet.duration}
                                            onChange={(e) => setCurrentSet({...currentSet, duration: e.target.value === '' ? '' : Number(e.target.value)})}
                                            placeholder="この種目にかかった時間"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>

                                    {/* セット追加ボタン */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                setSets([...sets, { ...currentSet, setType: 'warmup' }]);
                                            }}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Zap" size={20} />
                                            <span>アップセット追加</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSets([...sets, { ...currentSet, setType: 'main' }]);
                                            }}
                                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                                        >
                                            <Icon name="Plus" size={20} />
                                            <span>メインセット追加</span>
                                        </button>
                                    </div>

                                    {sets.length > 0 && (
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-sm font-medium mb-2">セット一覧</p>
                                            {sets.map((set, index) => (
                                                <div key={index} className="border-b border-gray-200 py-2 text-sm last:border-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">Set {index + 1}</span>
                                                            {set.setType === 'warmup' ? (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                    アップ
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                                    メイン
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setSets(sets.filter((_, i) => i !== index))}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="text-xs text-gray-600 space-y-0.5">
                                                        <div><span>重量: {set.weight}kg</span></div>
                                                        <div><span>回数: {set.reps}回</span></div>
                                                        <div><span>体積: {calculateSetVolume(set)} kg×reps</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="border-t mt-2 pt-2 space-y-1">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>総体積</span>
                                                    <span>{sets.reduce((sum, s) => sum + calculateSetVolume(s), 0)} kg×reps</span>
                                                </div>
                                                <div className="flex justify-between font-bold">
                                                    <span>推定カロリー</span>
                                                    <span className="text-orange-600">
                                                        {Math.round(calculateExerciseCalories(sets))}kcal
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        if (sets.length === 0) return;
                                        // 論文の回帰式で種目全体のカロリーを計算
                                        const totalCalories = calculateExerciseCalories(sets);
                                        const newExercise = {
                                            exercise: currentExercise,
                                            sets: sets,
                                            calories: Math.round(totalCalories)
                                        };
                                        setExercises([...exercises, newExercise]);
                                        setCurrentExercise(null);
                                        setSets([]);
                                    }}
                                    disabled={sets.length === 0}
                                    className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    種目を追加
                                </button>
                            </div>
                        )}

                        {/* 記録済み種目一覧 */}
                        {exercises.length > 0 && (
                            <div className="bg-white p-4 rounded-lg shadow">
                                <h4 className="font-bold mb-3">記録済み種目</h4>
                                {exercises.map((ex, index) => (
                                    <div key={index} className="border-b py-3 last:border-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-medium">{ex.exercise.name}</p>
                                                <p className="text-xs text-gray-600">{ex.sets.length}セット</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-orange-600">{ex.calories}kcal</span>
                                                <button
                                                    onClick={() => setExercises(exercises.filter((_, i) => i !== index))}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Icon name="Trash2" size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="border-t pt-3 mt-3 flex justify-between font-bold text-lg">
                                    <span>合計消費カロリー</span>
                                    <span className="text-orange-600">
                                        {exercises.reduce((sum, ex) => sum + ex.calories, 0)}kcal
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleWorkoutSave}
                            disabled={exercises.length === 0}
                            className="w-full bg-orange-600 text-white font-bold py-4 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Icon name="Check" size={24} />
                            <span>運動を保存</span>
                        </button>

                        {/* 運動履歴画面 */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-bold mb-3">今日の運動記録</h4>
                            <div className="space-y-2">
                                {(dailyRecord.exercises || []).map((exercise, index) => (
                                    <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                                        <p className="font-medium">{exercise.name}</p>
                                        <p className="text-sm text-gray-600">
                                            {exercise.sets?.length || 0}セット / {Math.round(exercise.calories || 0)}kcal
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            };

// ========== 運動記録コンポーネント終了 ==========

            const renderFoodInput = () => {
                // 曖昧検索用のヘルパー関数
                const fuzzyMatch = (text, query) => {
                    if (!query || query.trim() === '') return true;
                    // ひらがな、カタカナ、漢字の正規化
                    const normalize = (str) => {
                        return str
                            .toLowerCase()
                            .replace(/[（）\(\)]/g, '') // 括弧を削除
                            .replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
                            .replace(/\s+/g, ''); // 空白削除
                    };
                    const normalizedText = normalize(text);
                    const normalizedQuery = normalize(query);
                    return normalizedText.includes(normalizedQuery);
                };

                // Helper function to map foodDatabase format to tracking format
                const mapNutrients = (food) => {
                    const vitamins = {
                        A: food.vitaminA || 0,
                        D: food.vitaminD || 0,
                        E: food.vitaminE || 0,
                        K: food.vitaminK || 0,
                        B1: food.vitaminB1 || 0,
                        B2: food.vitaminB2 || 0,
                        B3: food.niacin || 0,
                        B5: food.pantothenicAcid || 0,
                        B6: food.vitaminB6 || 0,
                        B7: food.biotin || 0,
                        B9: food.folicAcid || 0,
                        B12: food.vitaminB12 || 0,
                        C: food.vitaminC || 0
                    };
                    const minerals = {
                        calcium: food.calcium || 0,
                        iron: food.iron || 0,
                        magnesium: food.magnesium || 0,
                        phosphorus: food.phosphorus || 0,
                        potassium: food.potassium || 0,
                        sodium: food.sodium || 0,
                        zinc: food.zinc || 0,
                        copper: food.copper || 0,
                        manganese: food.manganese || 0,
                        selenium: food.selenium || 0,
                        iodine: food.iodine || 0,
                        chromium: food.chromium || 0
                    };
                    return {
                        vitamins,
                        minerals,
                        caffeine: food.caffeine || 0,
                        catechin: food.catechin || 0,
                        tannin: food.tannin || 0,
                        polyphenol: food.polyphenol || 0,
                        chlorogenicAcid: food.chlorogenicAcid || 0,
                        creatine: food.creatine || 0,
                        lArginine: food.lArginine || 0,
                        lCarnitine: food.lCarnitine || 0,
                        EPA: food.EPA || 0,
                        DHA: food.DHA || 0,
                        coQ10: food.coQ10 || 0,
                        lutein: food.lutein || 0,
                        astaxanthin: food.astaxanthin || 0
                    };
                };

                const filteredFoods = {};
                Object.keys(foodDB).forEach(category => {
                    const items = Object.keys(foodDB[category]).filter(name =>
                        fuzzyMatch(name, searchTerm)
                    );
                    if (items.length > 0) {
                        filteredFoods[category] = items;
                    }
                });

                // テンプレート保存
                const saveAsTemplate = async () => {
                    if (!templateName.trim() || addedItems.length === 0) {
                        alert('テンプレート名を入力し、食材を追加してください');
                        return;
                    }
                    const template = {
                        id: Date.now(),
                        name: templateName,
                        items: addedItems
                    };
                    await DataService.saveMealTemplate(user.uid, template);
                    const templates = await DataService.getMealTemplates(user.uid);
                    setMealTemplates(templates);
                    alert('テンプレートを保存しました');
                    setTemplateName('');
                };

                const loadTemplate = (template) => {
                    // ディープコピーして参照を切る（複製不具合を防止）
                    const copiedItems = JSON.parse(JSON.stringify(template.items));
                    setAddedItems(copiedItems);
                    setMealName(template.name);
                };

                const deleteTemplate = async (templateId) => {
                    if (confirm('このテンプレートを削除しますか？')) {
                        await DataService.deleteMealTemplate(user.uid, templateId);
                        const templates = await DataService.getMealTemplates(user.uid);
                        setMealTemplates(templates);
                    }
                };

                return (
                    <div className="space-y-4">
                        {/* ①検索欄 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">食事名</label>
                            <input
                                type="text"
                                value={mealName}
                                onChange={(e) => setMealName(e.target.value)}
                                placeholder="朝食、1食目など..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="食材を検索..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />

                        {/* ②折りたたみカテゴリ一覧（よく使う食材含む） */}
                        {!selectedItem ? (
                            <div className="space-y-3">
                                {/* よく使う食材（予測） - 9日以上で開放 */}
                                {usageDays >= 9 && predictedData?.commonMeals && predictedData.commonMeals.length > 0 && !searchTerm && addedItems.length === 0 && (
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon name="Sparkles" size={16} className="text-purple-600" />
                                            <p className="text-sm font-medium text-purple-800 flex items-center gap-2">
                                                よく使う食材
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {predictedData.commonMeals.map(foodName => {
                                                // データベースから該当食材を探す
                                                let foundFood = null;
                                                let foundCategory = null;
                                                Object.keys(foodDB).forEach(cat => {
                                                    if (foodDB[cat][foodName]) {
                                                        foundFood = foodDB[cat][foodName];
                                                        foundCategory = cat;
                                                    }
                                                });

                                                if (!foundFood) return null;

                                                return (
                                                    <button
                                                        key={foodName}
                                                        onClick={() => {
                                                            const nutrients = mapNutrients(foundFood);
                                                            setSelectedItem({ name: foodName, ...foundFood, category: foundCategory, ...nutrients });
                                                        }}
                                                        className="px-3 py-1.5 bg-white border border-purple-300 rounded-full text-sm hover:bg-purple-100 transition"
                                                    >
                                                        {foodName}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {Object.keys(filteredFoods).map(category => (
                                        <div key={category} className="border rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedCategories(prev => ({...prev, [category]: !prev[category]}))}
                                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                                            >
                                                <span className="font-medium">{category}</span>
                                                <Icon name={expandedCategories[category] ? 'ChevronDown' : 'ChevronRight'} size={20} />
                                            </button>
                                            {expandedCategories[category] && (
                                                <div className="p-2 space-y-1">
                                                    {filteredFoods[category].map(foodName => {
                                                        const food = foodDB[category][foodName];
                                                        return (
                                                            <button
                                                                key={foodName}
                                                                onClick={() => {
                                                                    const nutrients = mapNutrients(food);
                                                                    setSelectedItem({ name: foodName, ...food, category, ...nutrients });
                                                                }}
                                                                className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg transition"
                                                            >
                                                                <div className="flex justify-between">
                                                                    <span>{foodName}</span>
                                                                    <span className="text-sm text-gray-500">{food.calories}kcal/100g</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg">{selectedItem.name}</h4>
                                            <p className="text-sm text-gray-600">{selectedItem.category}</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <Icon name="X" size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold">{selectedItem.calories}kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold">{selectedItem.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold">{selectedItem.fat}g</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold">{selectedItem.carbs}g</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">※100gあたり</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                        量 (g)
                                        <button
                                            type="button"
                                            onClick={() => setWorkoutInfoModal({
                                                show: true,
                                                title: '食事入力の使い方',
                                                content: `食材の量をグラム単位で入力します。

【入力方法】
1. スライダーをドラッグして大まかな量を設定
2. 目盛り数値（100g、200gなど）をタップで即座に設定
3. 入力欄に直接数値を入力
4. 増減ボタン（-100～+100）で微調整

【入力のコツ】
• よく食べる量を覚えておくと便利です
• 例: ご飯茶碗1杯 ≒ 150g
• 例: 鶏むね肉（手のひら大）≒ 100g
• 例: 卵1個 ≒ 50g

【PFC自動計算】
入力した量に応じて、たんぱく質（P）・脂質（F）・炭水化物（C）が自動計算され、1日の目標に反映されます。`
                                            })}
                                            className="text-indigo-600 hover:text-indigo-800"
                                        >
                                            <Icon name="Info" size={14} />
                                        </button>
                                    </label>

                                    {/* スライダー */}
                                    <div className="mb-3">
                                        <input
                                            type="range"
                                            min="0"
                                            max="500"
                                            step="5"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            style={{
                                                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(amount/500)*100}%, #e5e7eb ${(amount/500)*100}%, #e5e7eb 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span onClick={() => setAmount(0)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">0g</span>
                                            <span onClick={() => setAmount(100)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">100g</span>
                                            <span onClick={() => setAmount(200)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">200g</span>
                                            <span onClick={() => setAmount(300)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">300g</span>
                                            <span onClick={() => setAmount(400)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">400g</span>
                                            <span onClick={() => setAmount(500)} className="cursor-pointer hover:text-indigo-600 hover:font-bold transition">500g</span>
                                        </div>
                                    </div>

                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                    {/* 増減ボタン */}
                                    <div className="grid grid-cols-6 gap-1 mt-2">
                                        <button
                                            onClick={() => setAmount(Math.max(0, Number(amount) - 100))}
                                            className="py-1.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 font-medium"
                                        >
                                            -100
                                        </button>
                                        <button
                                            onClick={() => setAmount(Math.max(0, Number(amount) - 50))}
                                            className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                        >
                                            -50
                                        </button>
                                        <button
                                            onClick={() => setAmount(Math.max(0, Number(amount) - 10))}
                                            className="py-1.5 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
                                        >
                                            -10
                                        </button>
                                        <button
                                            onClick={() => setAmount(Number(amount) + 10)}
                                            className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                        >
                                            +10
                                        </button>
                                        <button
                                            onClick={() => setAmount(Number(amount) + 50)}
                                            className="py-1.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 font-medium"
                                        >
                                            +50
                                        </button>
                                        <button
                                            onClick={() => setAmount(Number(amount) + 100)}
                                            className="py-1.5 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200 font-medium"
                                        >
                                            +100
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium mb-2">摂取量</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-600">カロリー</p>
                                            <p className="font-bold text-indigo-600">
                                                {Math.round(selectedItem.calories * (Number(amount) / 100))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">P</p>
                                            <p className="font-bold">{(selectedItem.protein * (Number(amount) / 100)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">F</p>
                                            <p className="font-bold">{(selectedItem.fat * (Number(amount) / 100)).toFixed(1)}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">C</p>
                                            <p className="font-bold">{(selectedItem.carbs * (Number(amount) / 100)).toFixed(1)}g</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const numAmount = Number(amount);
                                            const ratio = numAmount / 100;

                                            // Calculate vitamins and minerals based on amount
                                            const vitamins = {};
                                            const minerals = {};

                                            if (selectedItem.vitamins) {
                                                Object.keys(selectedItem.vitamins).forEach(key => {
                                                    vitamins[key] = selectedItem.vitamins[key] * ratio;
                                                });
                                            }

                                            if (selectedItem.minerals) {
                                                Object.keys(selectedItem.minerals).forEach(key => {
                                                    minerals[key] = selectedItem.minerals[key] * ratio;
                                                });
                                            }

                                            // その他の栄養素を計算
                                            const otherNutrients = {};
                                            const otherNutrientKeys = ['caffeine', 'catechin', 'tannin', 'polyphenol', 'chlorogenicAcid',
                                                                        'creatine', 'lArginine', 'lCarnitine', 'EPA', 'DHA', 'coQ10',
                                                                        'lutein', 'astaxanthin'];
                                            otherNutrientKeys.forEach(key => {
                                                if (selectedItem[key]) {
                                                    otherNutrients[key] = selectedItem[key] * ratio;
                                                }
                                            });

                                            // Add to the list of items
                                            const newItem = {
                                                name: selectedItem.name,
                                                amount: numAmount,
                                                protein: selectedItem.protein * ratio,
                                                fat: selectedItem.fat * ratio,
                                                carbs: selectedItem.carbs * ratio,
                                                calories: selectedItem.calories * ratio,
                                                vitamins: vitamins,
                                                minerals: minerals,
                                                otherNutrients: otherNutrients
                                            };
                                            setAddedItems([...addedItems, newItem]);
                                            setSelectedItem(null);
                                            setAmount('100');
                                        }}
                                        className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        追加
                                    </button>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="px-4 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                                    >
                                        キャンセル
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ③追加済みアイテム一覧 */}
                        {addedItems.length > 0 && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm font-medium text-indigo-900">追加済み ({addedItems.length}品目)</p>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {addedItems.map((item, index) => (
                                        <div key={index} className="bg-white p-2 rounded-lg flex justify-between items-center">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-xs text-gray-600">{item.amount}g - {Math.round(item.calories)}kcal</p>
                                            </div>
                                            <button
                                                onClick={() => setAddedItems(addedItems.filter((_, i) => i !== index))}
                                                className="text-red-500 hover:text-red-700 ml-2"
                                            >
                                                <Icon name="Trash2" size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-indigo-200">
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div>
                                            <p className="text-gray-600">カロリー</p>
                                            <p className="font-bold text-indigo-600">
                                                {Math.round(addedItems.reduce((sum, item) => sum + item.calories, 0))}kcal
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">P</p>
                                            <p className="font-bold">
                                                {addedItems.reduce((sum, item) => sum + item.protein, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">F</p>
                                            <p className="font-bold">
                                                {addedItems.reduce((sum, item) => sum + item.fat, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">C</p>
                                            <p className="font-bold">
                                                {addedItems.reduce((sum, item) => sum + item.carbs, 0).toFixed(1)}g
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ④テンプレート（一覧+新規保存） - 12日以上で開放 */}
                        {unlockedFeatures.includes(FEATURES.TRAINING_TEMPLATE.id) && !selectedItem && (
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                <button
                                    onClick={() => setShowTemplates(!showTemplates)}
                                    className="w-full flex items-center justify-between mb-3"
                                >
                                    <span className="font-medium text-yellow-800 flex items-center gap-2">
                                        <Icon name="BookTemplate" size={16} />
                                        テンプレート
                                    </span>
                                    <Icon name={showTemplates ? "ChevronUp" : "ChevronDown"} size={16} />
                                </button>

                                {showTemplates && (
                                    <div className="space-y-3">
                                        {/* テンプレート一覧 */}
                                        {mealTemplates.length > 0 && (
                                            <div className="space-y-2">
                                                {mealTemplates.map(template => (
                                                    <div key={template.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                                                        <button
                                                            onClick={() => loadTemplate(template)}
                                                            className="flex-1 text-left text-sm hover:text-indigo-600"
                                                        >
                                                            <p className="font-medium">{template.name}</p>
                                                            <p className="text-xs text-gray-500">{template.items.length}品目</p>
                                                        </button>
                                                        <button
                                                            onClick={() => deleteTemplate(template.id)}
                                                            className="p-1 text-red-500 hover:text-red-700"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* テンプレート新規保存 */}
                                        {addedItems.length > 0 && (
                                            <div className="pt-3 border-t border-yellow-300">
                                                <p className="text-xs text-yellow-800 mb-2">新しいテンプレートとして保存</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value)}
                                                        placeholder="テンプレート名（例: 朝食パターン1）"
                                                        className="flex-1 px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={saveAsTemplate}
                                                        className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                                                    >
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {mealTemplates.length === 0 && addedItems.length === 0 && (
                                            <p className="text-sm text-gray-600">保存されたテンプレートはありません</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ⑤記録ボタン */}
                        {addedItems.length > 0 && !selectedItem && (
                            <button
                                onClick={async () => {
                                    const totalCalories = addedItems.reduce((sum, item) => sum + item.calories, 0);
                                    const newMeal = {
                                        id: Date.now(),
                                        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                                        name: mealName || '食事',
                                        calories: Math.round(totalCalories),
                                        items: addedItems.map(item => ({
                                            name: item.name,
                                            amount: `${item.amount}g`,
                                            protein: item.protein,
                                            fat: item.fat,
                                            carbs: item.carbs,
                                            vitamins: item.vitamins,
                                            minerals: item.minerals
                                        }))
                                    };

                                    onAdd(newMeal);
                                }}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
                            >
                                記録する ({addedItems.length}品目)
                            </button>
                        )}
                    </div>
                );
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden slide-up flex flex-col">
                        <div className="bg-white border-b p-4 flex justify-between items-center flex-shrink-0">
                            <h3 className="text-lg font-bold">
                                {type === 'meal' && '食事を記録'}
                                {type === 'workout' && 'トレーニングを記録'}
                                {type === 'supplement' && 'サプリメントを記録'}
                                {type === 'condition' && 'コンディションを記録'}
                            </h3>
                            <button onClick={() => {
                                // 食事記録中に食材を選択している場合は、まず検索リストに戻る
                                if (type === 'meal' && selectedItem) {
                                    setSelectedItem(null);
                                }
                                // トレーニング記録中に種目を選択している場合は、まず検索リストに戻る
                                else if (type === 'workout' && currentExercise) {
                                    setCurrentExercise(null);
                                }
                                // それ以外の場合はモーダルを閉じる
                                else {
                                    onClose();
                                }
                            }} className="p-2 hover:bg-gray-100 rounded-full">
                                <Icon name="X" size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {type === 'meal' && renderFoodInput()}
                            {type === 'workout' && renderWorkoutInput()}
                            {type === 'supplement' && renderSupplementInput()}
                            {type === 'condition' && renderConditionInput()}
                        </div>
                    </div>
                </div>
            );
        };
        // ===== メインアプリコンポーネント =====
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
            const [showPGBaseView, setShowPGBaseView] = useState(false);
            const [showCOMYView, setShowCOMYView] = useState(false);
            const [showSettings, setShowSettings] = useState(false);
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
            const [showTutorial, setShowTutorial] = useState(false);
            const [earnedBadges, setEarnedBadges] = useState([]);
            const [lastUpdate, setLastUpdate] = useState(Date.now());
            const [bottomBarMenu, setBottomBarMenu] = useState(null); // 'daily', 'history', 'settings'
            const [showDatePicker, setShowDatePicker] = useState(false); // 日付ピッカーモーダル
            const [calendarViewYear, setCalendarViewYear] = useState(new Date().getFullYear());
            const [calendarViewMonth, setCalendarViewMonth] = useState(new Date().getMonth() + 1);

            // AI入力関連
            const [aiInputText, setAiInputText] = useState('');
            const [aiProcessing, setAiProcessing] = useState(false);
            const [aiParsedData, setAiParsedData] = useState(null);

            // チュートリアル初回起動チェック
            useEffect(() => {
                const tutorialCompleted = localStorage.getItem(STORAGE_KEYS.TUTORIAL_COMPLETED);
                if (!tutorialCompleted && userProfile) {
                    // プロフィールが設定されていて、かつチュートリアル未完了の場合
                    setShowTutorial(true);
                }

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
                                const joinDate = new Date(profile.joinDate);
                                const today = new Date();
                                days = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));
                            }
                            setUsageDays(days);

                            // 動的オンボーディング + 日数ベースの機能開放
                            const unlocked = ['food']; // 食事記録は最初から開放
                            const triggers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ONBOARDING_TRIGGERS) || '{}');

                            Object.values(FEATURES).forEach(feature => {
                                if (feature.trigger === 'initial') {
                                    // initial: 最初から開放
                                    if (!unlocked.includes(feature.id)) unlocked.push(feature.id);
                                } else if (feature.trigger === 'days') {
                                    // days: 日数ベースで開放
                                    if (days >= feature.requiredDays && !unlocked.includes(feature.id)) {
                                        unlocked.push(feature.id);
                                    }
                                } else if (feature.trigger && triggers[feature.trigger]) {
                                    // 動的トリガー: トリガーが発火済みなら開放
                                    if (!unlocked.includes(feature.id)) unlocked.push(feature.id);
                                }
                            });
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
                                const joinDate = new Date(profile.joinDate);
                                const today = new Date();
                                const days = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));
                                setUsageDays(days);

                                // 動的オンボーディング + 日数ベースの機能開放
                                const unlocked = ['food']; // 食事記録は最初から開放
                                const triggers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ONBOARDING_TRIGGERS) || '{}');

                                Object.values(FEATURES).forEach(feature => {
                                    if (feature.trigger === 'initial') {
                                        // initial: 最初から開放
                                        if (!unlocked.includes(feature.id)) unlocked.push(feature.id);
                                    } else if (feature.trigger === 'days') {
                                        // days: 日数ベースで開放
                                        if (days >= feature.requiredDays && !unlocked.includes(feature.id)) {
                                            unlocked.push(feature.id);
                                        }
                                    } else if (feature.trigger && triggers[feature.trigger]) {
                                        // 動的トリガー: トリガーが発火済みなら開放
                                        if (!unlocked.includes(feature.id)) unlocked.push(feature.id);
                                    }
                                });
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

            // FABメニュー項目クリック
            const handleFABItemClick = (type) => {
                // 分析
                if (type === 'analysis') {
                    if (!unlockedFeatures.includes('analysis')) {
                        alert('この機能はコンディション記録後に開放されます');
                        return;
                    }
                    setShowAnalysisView(true);
                    setFabOpen(false);
                    return;
                }

                // PG BASE
                if (type === 'pgbase') {
                    if (!unlockedFeatures.includes('pg_base')) {
                        alert(`この機能は${FEATURES.PG_BASE.requiredDays}日継続で開放されます（残り${Math.max(0, FEATURES.PG_BASE.requiredDays - usageDays)}日）`);
                        return;
                    }
                    setShowPGBaseView(true);
                    setFabOpen(false);
                    return;
                }

                // 履歴
                if (type === 'history') {
                    if (!unlockedFeatures.includes('history_graph')) {
                        alert(`この機能は${FEATURES.HISTORY_GRAPH.requiredDays}日継続で開放されます（残り${Math.max(0, FEATURES.HISTORY_GRAPH.requiredDays - usageDays)}日）`);
                        return;
                    }
                    setShowHistoryView(true);
                    setFabOpen(false);
                    return;
                }

                // COMY
                if (type === 'comy') {
                    if (!unlockedFeatures.includes('community')) {
                        alert(`この機能は${FEATURES.COMMUNITY.requiredDays}日継続で開放されます（残り${Math.max(0, FEATURES.COMMUNITY.requiredDays - usageDays)}日）`);
                        return;
                    }
                    setShowCOMYView(true);
                    setFabOpen(false);
                    return;
                }

                // 食事・サプリ・トレーニング・コンディション
                const featureMap = {
                    'meal': 'food',
                    'supplement': 'supplement',
                    'workout': 'training',
                    'condition': 'condition'
                };

                const featureId = featureMap[type];
                if (!unlockedFeatures.includes(featureId)) {
                    const feature = Object.values(FEATURES).find(f => f.id === featureId);
                    if (feature) {
                        const triggerMessages = {
                            'after_meal': '最初の食事を記録すると開放されます',
                            'after_supplement': '最初のサプリを記録すると開放されます',
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
                return <OnboardingScreen user={user} onComplete={(profile) => setUserProfile(profile)} />;
            }

            // LBM計算
            const lbm = userProfile.leanBodyMass || LBMUtils.calculateLBM(userProfile.weight, userProfile.bodyFatPercentage || 15);
            const targetPFC = LBMUtils.calculateTargetPFC(
                userProfile.tdeeBase || 2200,
                userProfile.weightChangePace || 0,
                lbm
            );

            // 進捗計算
            const totalFeatures = Object.keys(FEATURES).length;
            const progress = (unlockedFeatures.length / totalFeatures) * 100;

            return (
                <div className="min-h-screen bg-gray-50 pb-24">
                    {/* 日付ナビゲーションバー */}
                    <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
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
                            <Icon name="ChevronLeft" size={20} />
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
                                <span className="font-medium">
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
                            <Icon name="ChevronRight" size={20} />
                        </button>
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

                    {/* 指示書・ルーティンセクション */}
                    <div className="px-4 pt-4 space-y-3">
                        {/* 指示書（AI生成提案型 - 分析閲覧後に開放） */}
                        {unlockedFeatures.includes('directive') && (() => {
                            const savedDirectives = localStorage.getItem(STORAGE_KEYS.DIRECTIVES);
                            const directives = savedDirectives ? JSON.parse(savedDirectives) : [];
                            // 表示中の日付の指示書を取得
                            const todayDirective = directives.find(d => d.date === currentDate);

                            const handleSave = () => {
                                const now = new Date();
                                const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24時間後
                                const newDirective = {
                                    date: currentDate, // 表示中の日付に保存
                                    message: directiveText,
                                    type: directiveType, // タイプを保存
                                    deadline: deadline.toISOString(),
                                    createdAt: now.toISOString()
                                };

                                const updatedDirectives = directives.filter(d => d.date !== currentDate);
                                updatedDirectives.push(newDirective);
                                localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(updatedDirectives));
                                setDirectiveEditing(false);
                                setDirectiveText('');
                            };

                            // 編集中
                            if (directiveEditing) {
                                return (
                                    <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-500 rounded-xl p-4 shadow-lg slide-up">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Icon name="FileText" size={20} className="text-green-700" />
                                                <span className="font-bold text-green-900">今日の指示書</span>
                                            </div>
                                            <button
                                                onClick={() => setDirectiveEditing(false)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                <Icon name="X" size={20} />
                                            </button>
                                        </div>

                                        {/* タイプ選択 */}
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => setDirectiveType('meal')}
                                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                    directiveType === 'meal'
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon name="Utensils" size={14} className="inline mr-1" />
                                                食事
                                            </button>
                                            <button
                                                onClick={() => setDirectiveType('exercise')}
                                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                    directiveType === 'exercise'
                                                        ? 'bg-orange-600 text-white'
                                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon name="Dumbbell" size={14} className="inline mr-1" />
                                                運動
                                            </button>
                                            <button
                                                onClick={() => setDirectiveType('condition')}
                                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                    directiveType === 'condition'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                                }`}
                                            >
                                                <Icon name="Activity" size={14} className="inline mr-1" />
                                                体調
                                            </button>
                                        </div>

                                        <textarea
                                            value={directiveText}
                                            onChange={(e) => setDirectiveText(e.target.value)}
                                            placeholder={
                                                directiveType === 'meal' ? '例: 鶏むね肉150g追加' :
                                                directiveType === 'exercise' ? '例: ベンチプレス 80kg×8回×3セット' :
                                                '例: 睡眠8時間確保、水分2L摂取'
                                            }
                                            className="w-full p-3 border border-green-300 rounded-lg text-gray-800 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
                                            rows="4"
                                        />
                                        <div className="flex flex-col gap-2 mt-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={async () => {
                                                        // 表示中の日付または最新の分析データを取得
                                                        const analyses = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ANALYSES) || '{}');
                                                        let latestAnalysis = analyses[currentDate];

                                                        // 表示中の日付のデータがなければ、前日のデータを取得
                                                        if (!latestAnalysis) {
                                                            const prevDate = new Date(currentDate + 'T00:00:00');
                                                            prevDate.setDate(prevDate.getDate() - 1);
                                                            const prevDateStr = prevDate.toISOString().split('T')[0];
                                                            latestAnalysis = analyses[prevDateStr];
                                                        }

                                                        if (!latestAnalysis) {
                                                            alert('まず分析を実行してください。分析結果に基づいてAIが最適な指示書を提案します。');
                                                            return;
                                                        }

                                                        // AI に提案を生成させる（タイプ別）
                                                        let suggestion = '';

                                                        if (directiveType === 'meal') {
                                                            // 食事提案（PFC分析ベース）
                                                            if (latestAnalysis.achievementRates.protein < 90) {
                                                                const diff = Math.ceil(targetPFC.protein - latestAnalysis.actual.protein);
                                                                // 鶏むね肉: 100gあたり23g（皮なし）のタンパク質
                                                                const grams = Math.ceil(diff / 0.23);
                                                                suggestion = `鶏むね肉${grams}g追加`;
                                                            } else if (latestAnalysis.achievementRates.carbs > 110) {
                                                                const diff = Math.ceil(latestAnalysis.actual.carbs - targetPFC.carbs);
                                                                // 白米: 100gあたり37gの炭水化物
                                                                const grams = Math.ceil(diff / 0.37);
                                                                suggestion = `白米-${grams}g減らす`;
                                                            } else if (latestAnalysis.achievementRates.fat < 90) {
                                                                const diff = Math.ceil(targetPFC.fat - latestAnalysis.actual.fat);
                                                                // アボカド: 100gあたり15gの脂質
                                                                const grams = Math.ceil(diff / 0.15);
                                                                suggestion = `アボカド${grams}g追加`;
                                                            } else if (latestAnalysis.achievementRates.overall >= 95 && latestAnalysis.achievementRates.overall <= 105) {
                                                                suggestion = '昨日の食事を完全再現';
                                                            } else {
                                                                suggestion = 'PFC比率を整える';
                                                            }
                                                        } else if (directiveType === 'exercise') {
                                                            // 運動提案（前日のトレーニング履歴と目標ベース）
                                                            const todayWorkouts = dailyRecord.workouts || [];
                                                            const totalCaloriesBurned = todayWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);

                                                            if (totalCaloriesBurned === 0) {
                                                                // 運動なし
                                                                if (userProfile.goal === 'diet' || userProfile.goal === 'lose_fat') {
                                                                    suggestion = 'HIIT 20分 または ウォーキング 60分';
                                                                } else if (userProfile.goal === 'bulk' || userProfile.goal === 'gain_muscle') {
                                                                    suggestion = 'コンパウンド種目 4種目×3セット';
                                                                } else {
                                                                    suggestion = '中強度トレーニング 30-45分';
                                                                }
                                                            } else if (totalCaloriesBurned < 200) {
                                                                suggestion = '運動強度を上げる（重量+10%）';
                                                            } else {
                                                                suggestion = '今日は休養日。ストレッチ推奨';
                                                            }
                                                        } else if (directiveType === 'condition') {
                                                            // 体調管理提案（睡眠・ストレスベース）
                                                            const condition = dailyRecord.conditions;
                                                            if (condition) {
                                                                if (condition.sleepHours < 7) {
                                                                    suggestion = '睡眠時間を8時間確保する';
                                                                } else if (condition.stress >= 4) {
                                                                    suggestion = '深呼吸10分、リラックス時間を設ける';
                                                                } else if (condition.fatigue <= 2) {
                                                                    suggestion = '休養日を設ける、マッサージ推奨';
                                                                } else if (condition.appetite <= 2) {
                                                                    suggestion = '消化の良い食事、少量頻回に変更';
                                                                } else {
                                                                    suggestion = '現在の生活習慣を維持';
                                                                }
                                                            } else {
                                                                suggestion = '睡眠8時間、水分2L、ストレス管理';
                                                            }
                                                        }

                                                        setDirectiveText(suggestion);
                                                    }}
                                                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition text-xs font-medium"
                                                >
                                                    AI
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500">24時間後に期限切れ</div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setDirectiveEditing(false)}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                                                    >
                                                        キャンセル
                                                    </button>
                                                    <button
                                                        onClick={handleSave}
                                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-bold"
                                                    >
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // 指示書がある場合
                            if (todayDirective) {
                                const deadline = new Date(todayDirective.deadline);
                                const now = new Date();
                                const timeLeft = deadline - now;
                                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                                const isExpired = timeLeft <= 0;

                                const isCompleted = todayDirective.completed || false;

                                const handleToggleComplete = () => {
                                    const updatedDirectives = directives.map(d =>
                                        d.date === currentDate ? {...d, completed: !isCompleted} : d
                                    );
                                    localStorage.setItem(STORAGE_KEYS.DIRECTIVES, JSON.stringify(updatedDirectives));
                                    // 強制的に再レンダリング
                                    window.location.reload();
                                };

                                const directiveIconName =
                                    todayDirective.type === 'meal' ? 'Utensils' :
                                    todayDirective.type === 'exercise' ? 'Dumbbell' :
                                    todayDirective.type === 'condition' ? 'Activity' :
                                    'FileText';

                                const directiveColor =
                                    todayDirective.type === 'meal' ? 'emerald' :
                                    todayDirective.type === 'exercise' ? 'orange' :
                                    todayDirective.type === 'condition' ? 'indigo' :
                                    'green';

                                return (
                                    <div className={`border-2 rounded-xl p-4 shadow-lg slide-up ${isCompleted ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400' : `bg-gradient-to-r from-${directiveColor}-50 to-teal-50 border-${directiveColor}-500`}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Icon name={directiveIconName} size={20} className={isCompleted ? "text-gray-500" : `text-${directiveColor}-700`} />
                                                <span className={`font-bold ${isCompleted ? "text-gray-700 line-through" : `text-${directiveColor}-900`}`}>
                                                    今日の指示書
                                                    {todayDirective.type && (
                                                        <span className="text-xs ml-2 opacity-70">
                                                            ({todayDirective.type === 'meal' ? '食事' : todayDirective.type === 'exercise' ? '運動' : '体調'})
                                                        </span>
                                                    )}
                                                </span>
                                                <button
                                                    onClick={() => setInfoModal({
                                                        show: true,
                                                        title: '💡 指示書について',
                                                        content: '1日1つ目標を決めて、その通りに実行しましょう。\n\n指示書を作成することで、今日やるべきことを明確にし、達成することで自己管理能力が向上します。\n\n例：\n• トレーニング: 脚の日（スクワット5セット）\n• 食事: タンパク質180g摂取\n• 睡眠: 23時までに就寝'
                                                    })}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <Icon name="Info" size={16} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isExpired && !isCompleted && (
                                                    <div className="text-right mr-2">
                                                        <div className="text-xs text-gray-600">残り時間</div>
                                                        <div className="font-bold text-red-600">{hoursLeft}h {minutesLeft}m</div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setDirectiveText(todayDirective.message);
                                                        setDirectiveEditing(true);
                                                    }}
                                                    className={isCompleted ? "text-gray-500 hover:text-gray-700" : "text-green-700 hover:text-green-900"}
                                                >
                                                    <Icon name="Edit2" size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className={`rounded-lg p-3 mb-3 ${isCompleted ? "bg-gray-100" : "bg-white"}`}>
                                            <p className={`whitespace-pre-wrap ${isCompleted ? "text-gray-500 line-through" : "text-gray-800"}`}>{todayDirective.message}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {isExpired && !isCompleted && (
                                                    <div className="text-sm text-red-600 font-medium">期限切れ</div>
                                                )}
                                                {isCompleted && (
                                                    <div className="text-sm text-gray-600 font-medium flex items-center gap-1">
                                                        <Icon name="CheckCircle" size={16} className="text-green-600" />
                                                        完了済み
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleToggleComplete}
                                                className={`px-4 py-2 rounded-lg font-bold transition text-sm flex items-center gap-2 ${
                                                    isCompleted
                                                    ? 'bg-gray-400 text-white hover:bg-gray-500'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                }`}
                                            >
                                                <Icon name={isCompleted ? "RotateCcw" : "CheckCircle"} size={16} />
                                                {isCompleted ? '未完了に戻す' : '完了'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            // 指示書がない場合は AI 生成提案ボタン
                            return (
                                <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-500 rounded-xl p-4 shadow-lg slide-up">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Icon name="Sparkles" size={20} className="text-green-700" />
                                            <span className="font-bold text-green-900">今日の指示書</span>
                                            <button
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '💡 AI指示書について',
                                                    content: 'AIがあなたの分析結果に基づいて、今日の最適な目標を提案します。\n\n提案された指示書は編集可能で、自分の状況に合わせてカスタマイズできます。\n\n指示書を達成することで、自己管理能力が向上し、目標達成率が高まります。'
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={16} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setDirectiveText('');
                                                    setDirectiveEditing(true);
                                                }}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition text-sm"
                                            >
                                                手動で作成
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                        AIに今日の目標を提案してもらうか、手動で作成できます
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ルーティン - 12日で開放 */}
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
                                        <div className="bg-white border-2 border-purple-500 p-4 rounded-xl shadow-lg slide-up">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Icon name="Calendar" size={24} className="text-purple-600" />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-xs text-gray-500">今日のルーティン</div>
                                                            <div className="text-xs text-gray-500">Day {currentIndex + 1}/{routines.length}</div>
                                                            <div className="font-bold text-xs text-gray-900">{currentRoutine.name}</div>
                                                        </div>
                                                        <div className="font-bold text-lg text-gray-900">{currentRoutine.splitType}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowSettings(true);
                                                        // 設定画面でルーティンタブを開く（後ほど実装）
                                                    }}
                                                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-purple-700 transition"
                                                >
                                                    管理
                                                </button>
                                            </div>
                                            {currentRoutine.note && (
                                                <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 p-2 rounded">
                                                    {currentRoutine.note}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                            }

                            // ルーティン未設定時
                            return (
                                <div className="bg-white border-2 border-purple-500 p-4 rounded-xl shadow-lg slide-up">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Calendar" size={24} className="text-purple-600" />
                                            <div>
                                                <div className="font-bold text-lg text-gray-900">ルーティンを設定</div>
                                                <div className="text-sm text-gray-600">毎日の記録を簡単に</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    // デフォルトルーティンを設定（ルーティン名と分割名を統一）
                                                    const defaultRoutines = [
                                                        { id: 1, name: '胸', splitType: '胸', isRestDay: false },
                                                        { id: 2, name: '背中', splitType: '背中', isRestDay: false },
                                                        { id: 3, name: '脚', splitType: '脚', isRestDay: false },
                                                        { id: 4, name: '休み', splitType: '休み', isRestDay: true },
                                                        { id: 5, name: '肩・腕', splitType: '肩・腕', isRestDay: false },
                                                        { id: 6, name: '全身', splitType: '全身', isRestDay: false },
                                                        { id: 7, name: '休み', splitType: '休み', isRestDay: true }
                                                    ];
                                                    localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(defaultRoutines));
                                                    localStorage.setItem(STORAGE_KEYS.ROUTINE_START_DATE, new Date().toISOString());
                                                    localStorage.setItem(STORAGE_KEYS.ROUTINE_ACTIVE, 'true');
                                                    window.location.reload();
                                                }}
                                                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition"
                                            >
                                                開始
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowSettings(true);
                                                    // 設定画面でルーティンタブを開く
                                                }}
                                                className="bg-purple-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-purple-700 transition"
                                            >
                                                管理
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* メインコンテンツ */}
                    <div className="p-4 pb-32">
                        <DashboardView
                            dailyRecord={dailyRecord}
                            targetPFC={targetPFC}
                            unlockedFeatures={unlockedFeatures}
                            profile={userProfile}
                            setInfoModal={setInfoModal}
                            yesterdayRecord={yesterdayRecord}
                            setDailyRecord={setDailyRecord}
                            user={user}
                            currentDate={currentDate}
                            onDateChange={handleDateChange}
                            onDeleteItem={async (type, itemId) => {
                                // 表示中の日付（currentDate）から削除
                                const currentRecord = await DataService.getDailyRecord(user.uid, currentDate);

                                if (!currentRecord) return;

                                if (type === 'meal') {
                                    currentRecord.meals = currentRecord.meals?.filter(m => m.id !== itemId);
                                } else if (type === 'workout') {
                                    currentRecord.workouts = currentRecord.workouts?.filter(w => w.id !== itemId);
                                } else if (type === 'supplement') {
                                    currentRecord.supplements = currentRecord.supplements?.filter(s => s.id !== itemId);
                                }

                                await DataService.saveDailyRecord(user.uid, currentDate, currentRecord);
                                setDailyRecord(currentRecord);
                            }}
                        />
                    </div>

                    {/* 追加ビュー */}
                    {showAddView && (
                        <AddItemView
                            type={addViewType}
                            onClose={() => {
                                setShowAddView(false);
                                if (openedFromSettings) {
                                    setShowSettings(true);
                                    setOpenedFromSettings(false);
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
                                // 表示中の日付（currentDate）に記録を保存
                                const currentRecord = await DataService.getDailyRecord(user.uid, currentDate);

                                let updatedRecord = currentRecord || { meals: [], workouts: [], supplements: [], conditions: null };

                                // トリガー判定用の変数
                                let triggerFired = null;

                                // 既存のトリガー状態を取得
                                const triggers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ONBOARDING_TRIGGERS) || '{}');

                                if (addViewType === 'meal') {
                                    updatedRecord.meals = [...(updatedRecord.meals || []), item];
                                    // 初めての食事記録でサプリメント機能を開放
                                    if (!triggers.after_meal) {
                                        triggerFired = 'after_meal';
                                    }
                                } else if (addViewType === 'workout') {
                                    updatedRecord.workouts = [...(updatedRecord.workouts || []), item];
                                    // 初めてのトレーニング記録でコンディション機能を開放
                                    if (!triggers.after_training) {
                                        triggerFired = 'after_training';
                                    }
                                } else if (addViewType === 'supplement') {
                                    updatedRecord.supplements = [...(updatedRecord.supplements || []), item];
                                    // 初めてのサプリメント記録でトレーニング機能を開放
                                    if (!triggers.after_supplement) {
                                        triggerFired = 'after_supplement';
                                    }
                                } else if (addViewType === 'condition') {
                                    updatedRecord.conditions = item; // コンディションは1日1回
                                    // 初めてのコンディション記録で分析機能を開放
                                    if (!triggers.after_condition) {
                                        triggerFired = 'after_condition';
                                    }
                                }

                                await DataService.saveDailyRecord(user.uid, currentDate, updatedRecord);
                                setDailyRecord(updatedRecord);
                                setLastUpdate(Date.now());

                                // トリガーが発火した場合、機能を開放
                                if (triggerFired) {
                                    triggers[triggerFired] = true;
                                    localStorage.setItem(STORAGE_KEYS.ONBOARDING_TRIGGERS, JSON.stringify(triggers));

                                    // 機能開放を再計算
                                    const unlocked = [...unlockedFeatures];
                                    Object.values(FEATURES).forEach(feature => {
                                        if (feature.trigger === triggerFired && !unlocked.includes(feature.id)) {
                                            unlocked.push(feature.id);
                                        }
                                    });
                                    setUnlockedFeatures(unlocked);

                                    // 新機能開放の通知
                                    const newFeature = Object.values(FEATURES).find(f => f.trigger === triggerFired);
                                    if (newFeature) {
                                        alert(`🎉 新機能「${newFeature.name}」が開放されました！\n${newFeature.description}`);
                                    }
                                }

                                setShowAddView(false);
                                if (openedFromSettings) {
                                    setShowSettings(true);
                                    setOpenedFromSettings(false);
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
                            onClose={() => {
                                setShowAnalysisView(false);

                                // 最初の分析閲覧で指示書機能を開放
                                const triggers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ONBOARDING_TRIGGERS) || '{}');
                                if (!triggers.after_analysis) {
                                    triggers.after_analysis = true;
                                    localStorage.setItem(STORAGE_KEYS.ONBOARDING_TRIGGERS, JSON.stringify(triggers));

                                    // 機能開放を再計算
                                    const unlocked = [...unlockedFeatures];
                                    Object.values(FEATURES).forEach(feature => {
                                        if (feature.trigger === 'after_analysis' && !unlocked.includes(feature.id)) {
                                            unlocked.push(feature.id);
                                        }
                                    });
                                    setUnlockedFeatures(unlocked);

                                    // 新機能開放の通知
                                    const newFeature = Object.values(FEATURES).find(f => f.trigger === 'after_analysis');
                                    if (newFeature) {
                                        setInfoModal({
                                            show: true,
                                            title: `🎉 新機能「${newFeature.name}」開放`,
                                            content: newFeature.description
                                        });
                                    }
                                }
                            }}
                            userId={user.uid}
                            userProfile={userProfile}
                            dailyRecord={dailyRecord}
                            targetPFC={targetPFC}
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

以下のユーザー入力から、食事・運動・サプリメントの記録を抽出してJSON形式で返してください。

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
                                                {aiParsedData.supplements && aiParsedData.supplements.length > 0 && (
                                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Icon name="Pill" size={18} className="text-green-600" />
                                                            <h3 className="font-semibold text-green-900">サプリ記録</h3>
                                                        </div>
                                                        {aiParsedData.supplements.map((supp, idx) => (
                                                            <div key={idx} className="mb-3 p-3 bg-white rounded border border-green-200">
                                                                <input
                                                                    type="text"
                                                                    value={supp.name}
                                                                    onChange={(e) => {
                                                                        const updated = {...aiParsedData};
                                                                        updated.supplements[idx].name = e.target.value;
                                                                        setAiParsedData(updated);
                                                                    }}
                                                                    className="w-full mb-2 px-2 py-1 text-sm border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                                                                    placeholder="サプリ名"
                                                                />
                                                                <div>
                                                                    <label className="text-xs text-green-700">量(g)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={supp.amount}
                                                                        onChange={(e) => {
                                                                            const updated = {...aiParsedData};
                                                                            updated.supplements[idx].amount = Number(e.target.value);
                                                                            setAiParsedData(updated);
                                                                        }}
                                                                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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

                                                        // サプリ記録を準備
                                                        if (aiParsedData.supplements && aiParsedData.supplements.length > 0) {
                                                            aiParsedData.supplements.forEach((supp, idx) => {
                                                                newSupplements.push({
                                                                    id: Date.now() + idx * 0.1,
                                                                    name: supp.name,
                                                                    amount: supp.amount,
                                                                    timestamp: new Date().toISOString()
                                                                });
                                                            });
                                                        }

                                                        // 一括で保存
                                                        const updatedRecord = {
                                                            ...dailyRecord,
                                                            meals: [...(dailyRecord.meals || []), ...newMeals],
                                                            exercises: [...(dailyRecord.exercises || []), ...newExercises],
                                                            supplements: [...(dailyRecord.supplements || []), ...newSupplements]
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
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h3 className="font-bold mb-2">守破離とは</h3>
                                        <div className="space-y-2 text-sm text-gray-700">
                                            <p><strong className="text-green-600">守（0-9日）</strong>: 基礎を学ぶ段階。基本的な記録機能を使いこなします。</p>
                                            <p><strong className="text-blue-600">破（10-17日）</strong>: 応用・カスタマイズ段階。AIコーチや高度な機能が使えます。</p>
                                            <p><strong className="text-purple-600">離（18日〜）</strong>: 独自の方法を確立する段階。全機能が開放されます。</p>
                                        </div>
                                    </div>

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
                            }}
                            userId={user.uid}
                            usageDays={usageDays}
                            unlockedFeatures={unlockedFeatures}
                            onOpenAddView={(type) => {
                                setAddViewType(type);
                                setShowAddView(true);
                                setOpenedFromSettings(true);
                                setShowSettings(false);
                            }}
                            darkMode={darkMode}
                            onToggleDarkMode={() => setDarkMode(!darkMode)}
                        />
                    )}

                    {/* チュートリアル */}
                    {showTutorial && (
                        <TutorialView
                            onClose={() => setShowTutorial(false)}
                            onComplete={() => {
                                // バッジ再読み込み
                                const badges = JSON.parse(localStorage.getItem(STORAGE_KEYS.BADGES) || '[]');
                                setEarnedBadges(badges);
                            }}
                        />
                    )}

                    {/* 情報モーダル */}
                    <InfoModal />

                    {/* サブメニュー（ボトムバーの上に展開） */}
                    {bottomBarMenu === 'daily' && (
                        <div className="fixed bottom-16 left-0 right-0 z-[9998] bg-blue-50 border-t shadow-lg px-4 py-3">
                            <div className="grid grid-cols-6 gap-2">
                                <button
                                    onClick={() => {
                                        setShowAIInput(true);
                                        setBottomBarMenu(null);
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
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-green-100 transition"
                                >
                                    <Icon name="Utensils" size={18} className="text-green-600" />
                                    <span className="text-xs text-gray-700">食事</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setAddViewType('supplement');
                                        setShowAddView(true);
                                        setBottomBarMenu(null);
                                    }}
                                    className="flex flex-col items-center gap-1 px-3 py-2 bg-white rounded-lg hover:bg-blue-100 transition"
                                >
                                    <Icon name="Pill" size={18} className="text-blue-600" />
                                    <span className="text-xs text-gray-700">サプリ</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setAddViewType('workout');
                                        setShowAddView(true);
                                        setBottomBarMenu(null);
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
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-indigo-100 transition"
                                >
                                    <Icon name="PieChart" size={18} className="text-indigo-600" />
                                    <span className="text-xs text-gray-700">分析</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {bottomBarMenu === 'pgbase' && (
                        <div className="fixed bottom-16 left-0 right-0 z-[9998] bg-purple-50 border-t shadow-lg px-4 py-3">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        if (!unlockedFeatures.includes('history_graph')) {
                                            alert('履歴機能は2日継続で開放されます');
                                            return;
                                        }
                                        setShowHistoryView(true);
                                        setBottomBarMenu(null);
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
                                            alert('教科書機能は10日継続で開放されます');
                                            return;
                                        }
                                        setShowPGBaseView(true);
                                        setBottomBarMenu(null);
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
                                            alert('COMY機能は30日継続で開放されます');
                                            return;
                                        }
                                        setShowCOMYView(true);
                                        setBottomBarMenu(null);
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

                    {bottomBarMenu === 'settings' && (
                        <div className="fixed bottom-16 left-0 right-0 z-[9998] bg-orange-50 border-t shadow-lg px-4 py-3">
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => {
                                        setShowSettings(true);
                                        setBottomBarMenu(null);
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
                                    }}
                                    className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg hover:bg-orange-100 transition"
                                >
                                    <Icon name="Award" size={18} className="text-orange-600" />
                                    <span className="text-xs text-gray-700">バッジ</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowTutorial(true);
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
                    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t shadow-lg py-3">
                        {/* ボトムナビゲーション（3ボタン） */}
                        <div className="grid grid-cols-3 gap-0">
                            {/* ①デイリー */}
                            <button
                                onClick={() => setBottomBarMenu(bottomBarMenu === 'daily' ? null : 'daily')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                                    bottomBarMenu === 'daily' ? 'bg-blue-50' : 'hover:bg-gray-50'
                                }`}
                            >
                                <Icon name="Home" size={20} className={bottomBarMenu === 'daily' ? 'text-blue-600' : 'text-gray-600'} />
                                <span className={`text-xs font-medium ${bottomBarMenu === 'daily' ? 'text-blue-600' : 'text-gray-600'}`}>
                                    デイリー
                                </span>
                            </button>

                            {/* ②PGBASE */}
                            <button
                                onClick={() => setBottomBarMenu(bottomBarMenu === 'pgbase' ? null : 'pgbase')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                                    bottomBarMenu === 'pgbase' ? 'bg-purple-50' : 'hover:bg-gray-50'
                                }`}
                            >
                                <Icon name="BookOpen" size={20} className={bottomBarMenu === 'pgbase' ? 'text-purple-600' : 'text-gray-600'} />
                                <span className={`text-xs font-medium ${bottomBarMenu === 'pgbase' ? 'text-purple-600' : 'text-gray-600'}`}>
                                    PGBASE
                                </span>
                            </button>

                            {/* ③設定・バッジ・チュートリアル */}
                            <button
                                onClick={() => setBottomBarMenu(bottomBarMenu === 'settings' ? null : 'settings')}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${
                                    bottomBarMenu === 'settings' ? 'bg-orange-50' : 'hover:bg-gray-50'
                                }`}
                            >
                                <Icon name="Settings" size={20} className={bottomBarMenu === 'settings' ? 'text-orange-600' : 'text-gray-600'} />
                                <span className={`text-xs font-medium ${bottomBarMenu === 'settings' ? 'text-orange-600' : 'text-gray-600'}`}>
                                    設定
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

// ===== React Rendering =====
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
