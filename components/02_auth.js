// ===== Authentication Components =====
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
    const [step, setStep] = useState(1); // Start from step 1 directly
    const [profile, setProfile] = useState({
        nickname: '',
        displayName: '', // 氏名（フルネーム）
        gender: '男性',
        age: 25,
        idealSleepHours: 4, // 理想の睡眠時間（1:5h以下、2:6h、3:7h、4:8h、5:9h以上）
        height: 170,
        weight: 70,
        bodyFatPercentage: 15,
        idealWeight: 70, // 理想の体重
        idealBodyFatPercentage: 15, // 理想の体脂肪率
        idealLBM: null, // 理想のLBM（自動計算）
        style: '一般', // トレーニングスタイル
        activityLevel: 3,
        customActivityMultiplier: null, // カスタム活動レベル係数
        purpose: 'メンテナンス',
        weightChangePace: 0,
        calorieAdjustment: 0 // カロリー調整値
    });
    const [visualGuideModal, setVisualGuideModal] = useState({ show: false, gender: '男性', selectedLevel: null });
    const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
    const [customMultiplierInputValue, setCustomMultiplierInputValue] = useState('');

    const handleComplete = async () => {
        const lbm = LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage);
        const bmr = LBMUtils.calculateBMR(lbm);
        const tdeeBase = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier);

        // 無料トライアル終了日（7日後）
        const now = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        const completeProfile = {
            ...profile,
            // 基本情報
            email: user.email,
            displayName: profile.displayName || profile.nickname || '',
            age: profile.age || 25,
            gender: profile.gender || '男性',

            // 体組成・活動レベル
            leanBodyMass: lbm,
            bmr: bmr,
            tdeeBase: tdeeBase,
            activityLevel: profile.activityLevel || 3,
            customActivityMultiplier: profile.customActivityMultiplier || null,

            // 目的・カロリー設定
            purpose: profile.purpose || 'メンテナンス',
            weightChangePace: profile.weightChangePace || 0,
            calorieAdjustment: profile.calorieAdjustment || 0,

            // サブスクリプション情報
            subscriptionTier: 'free',
            subscriptionStatus: 'none',

            // クレジットシステム（21回分付与：レポート7+質問7+履歴分析7）
            analysisCredits: 21,
            totalAnalysisUsed: 0,
            currentMonthUsed: 0,
            lifetimeCreditsPurchased: 0,

            // 経験値・レベル・クレジットシステム（新）
            experience: 0,
            level: 1,
            freeCredits: 14, // 初回クレジット
            paidCredits: 0,
            processedScoreDates: [],
            processedDirectiveDates: [],

            // 無料トライアル
            freeTrialStartDate: DEV_MODE ? now.toISOString() : firebase.firestore.Timestamp.fromDate(now),
            freeTrialEndDate: DEV_MODE ? trialEndDate.toISOString() : firebase.firestore.Timestamp.fromDate(trialEndDate),
            freeTrialCreditsUsed: 0,
            isFreeTrialExpired: false,

            // 登録日
            joinDate: new Date().toISOString(),
            registrationDate: new Date().toISOString(),
            createdAt: DEV_MODE ? now.toISOString() : firebase.firestore.Timestamp.fromDate(now)
        };

        console.log('[Auth] Creating new user profile:', {
            lbm,
            bmr,
            tdeeBase,
            activityLevel: profile.activityLevel,
            customActivityMultiplier: profile.customActivityMultiplier,
            calorieAdjustment: profile.calorieAdjustment,
            purpose: profile.purpose
        });
        await DataService.saveUserProfile(user.uid, completeProfile);
        if (onComplete) onComplete(completeProfile);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl slide-up">
                <h2 className="text-2xl font-bold mb-6">
                    プロフィール設定 ({step}/4)
                </h2>

                {step === 1 && (
                    <div className="space-y-6">
                        <div className="border-l-4 border-blue-500 pl-4">
                            <label className="block text-sm font-medium mb-2">氏名</label>
                            <input
                                type="text"
                                value={profile.displayName}
                                onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="例: 山田 太郎"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">※本名をご入力ください</p>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-4">
                            <label className="block text-sm font-medium mb-2">ニックネーム（任意）</label>
                            <input
                                type="text"
                                value={profile.nickname}
                                onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="例: トレーニー太郎"
                            />
                            <p className="text-xs text-gray-500 mt-1">※アプリ内で表示される名前</p>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-4">
                            <label className="block text-sm font-medium mb-2">性別</label>
                            <select
                                value={profile.gender}
                                onChange={(e) => setProfile({...profile, gender: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg"
                            >
                                <option value="男性">男性</option>
                                <option value="女性">女性</option>
                                <option value="その他">その他</option>
                            </select>
                        </div>
                        <div className="border-l-4 border-blue-500 pl-4">
                            <label className="block text-sm font-medium mb-2">年齢</label>
                            <input
                                type="number"
                                value={profile.age}
                                onChange={(e) => setProfile({...profile, age: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="border-l-4 border-blue-500 pl-4">
                            <label className="block text-sm font-medium mb-2">理想の睡眠時間</label>
                            <div className="flex w-full items-center justify-between space-x-2 rounded-full bg-gray-100 p-1.5">
                                {[
                                    { value: 1, label: '5h以下' },
                                    { value: 2, label: '6h' },
                                    { value: 3, label: '7h' },
                                    { value: 4, label: '8h' },
                                    { value: 5, label: '9h以上' }
                                ].map(item => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setProfile({...profile, idealSleepHours: item.value})}
                                        className={`flex-1 rounded-full py-2 text-center text-xs font-medium transition-colors duration-300 ${
                                            item.value === (profile.idealSleepHours || 4)
                                                ? 'bg-blue-500 text-white'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">※成人の推奨睡眠時間は7-8時間です</p>
                        </div>

                        <div className="border-l-4 border-blue-500 pl-4">
                            <label className="block text-sm font-medium mb-2">トレーニングスタイル</label>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setProfile({...profile, style: '一般'})}
                                    className={`w-full p-3 rounded-lg border-2 transition ${
                                        profile.style === '一般'
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-blue-300'
                                    }`}
                                >
                                    <div className="font-bold text-sm">一般</div>
                                    <div className="text-xs text-gray-600">健康維持・日常フィットネス</div>
                                </button>
                                {['筋肥大', '筋力', '持久力', 'バランス'].map(styleOption => (
                                    <button
                                        key={styleOption}
                                        type="button"
                                        onClick={() => setProfile({...profile, style: styleOption})}
                                        className={`w-full p-3 rounded-lg border-2 transition ${
                                            profile.style === styleOption
                                                ? 'border-purple-500 bg-purple-50 shadow-md'
                                                : 'border-gray-200 bg-white hover:border-purple-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="text-left">
                                                <div className="font-bold text-sm">{styleOption}</div>
                                                <div className="text-xs text-gray-600">
                                                    {styleOption === '筋肥大' && 'ボディメイク・筋肉増強'}
                                                    {styleOption === '筋力' && '最大筋力・パワー向上'}
                                                    {styleOption === '持久力' && '有酸素・スタミナ重視'}
                                                    {styleOption === 'バランス' && '総合的な身体能力'}
                                                </div>
                                            </div>
                                            <span className="text-xs text-purple-600 font-medium">ボディメイカー</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">※ボディメイカーは高度なトレーニング向け</p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <div className="border-l-4 border-green-500 pl-4">
                            <label className="block text-sm font-medium mb-2">身長 (cm)</label>
                            <input
                                type="number"
                                value={profile.height}
                                onChange={(e) => setProfile({...profile, height: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="border-l-4 border-green-500 pl-4">
                            <label className="block text-sm font-medium mb-2">体重 (kg)</label>
                            <input
                                type="number"
                                value={profile.weight}
                                onChange={(e) => setProfile({...profile, weight: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                        </div>
                        <div className="border-l-4 border-green-500 pl-4">
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                体脂肪率 (%)
                                <button
                                    type="button"
                                    onClick={() => setVisualGuideModal({ ...visualGuideModal, show: true, gender: profile.gender })}
                                    className="text-orange-600 hover:text-orange-800"
                                >
                                    <Icon name="Eye" size={16} />
                                </button>
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={profile.bodyFatPercentage}
                                onChange={(e) => setProfile({...profile, bodyFatPercentage: e.target.value === '' ? '' : Number(e.target.value)})}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                            <p className="text-sm text-gray-500 mt-1">不明な場合は推定値でOKです</p>
                        </div>
                        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                            <p className="text-sm font-medium text-cyan-800">現在のLBM</p>
                            <p className="text-2xl font-bold text-cyan-900 mt-2">
                                {LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage).toFixed(1)} kg
                            </p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                            <h3 className="text-sm font-bold text-purple-800 mb-3">理想の体型目標</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-purple-700">理想の体重 (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={profile.idealWeight}
                                        onChange={(e) => {
                                            const newIdealWeight = e.target.value === '' ? '' : Number(e.target.value);
                                            setProfile({
                                                ...profile,
                                                idealWeight: newIdealWeight,
                                                idealLBM: newIdealWeight && profile.idealBodyFatPercentage
                                                    ? LBMUtils.calculateLBM(newIdealWeight, profile.idealBodyFatPercentage)
                                                    : null
                                            });
                                        }}
                                        className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-purple-700">理想の体脂肪率 (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={profile.idealBodyFatPercentage}
                                        onChange={(e) => {
                                            const newIdealBF = e.target.value === '' ? '' : Number(e.target.value);
                                            setProfile({
                                                ...profile,
                                                idealBodyFatPercentage: newIdealBF,
                                                idealLBM: profile.idealWeight && newIdealBF
                                                    ? LBMUtils.calculateLBM(profile.idealWeight, newIdealBF)
                                                    : null
                                            });
                                        }}
                                        className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                                    />
                                </div>

                                {profile.idealLBM && (
                                    <div className="bg-white p-3 rounded-lg border border-purple-300">
                                        <p className="text-xs font-medium text-purple-700">理想のLBM（自動計算）</p>
                                        <p className="text-xl font-bold text-purple-900 mt-1">
                                            {profile.idealLBM.toFixed(1)} kg
                                        </p>
                                        <p className="text-xs text-purple-600 mt-1">
                                            現在より {(profile.idealLBM - LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage)).toFixed(1)} kg
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <div className="border-l-4 border-orange-500 pl-4">
                            <label className="block text-sm font-medium mb-2">目的</label>
                            <div className="space-y-2">
                                {[
                                    { value: 'ダイエット', label: 'ダイエット', sub: '脂肪を落とす', pace: -1, adjustment: -300 },
                                    { value: 'メンテナンス', label: 'メンテナンス', sub: '現状維持', pace: 0, adjustment: 0 },
                                    { value: 'バルクアップ', label: 'バルクアップ', sub: '筋肉をつける', pace: 1, adjustment: 300 },
                                    { value: 'リコンプ', label: 'リコンプ', sub: '体組成改善', pace: 0, adjustment: 0 }
                                ].map(({ value, label, sub, pace, adjustment }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setProfile({...profile, purpose: value, weightChangePace: pace, calorieAdjustment: adjustment})}
                                        className={`w-full p-3 rounded-lg border-2 transition flex items-center justify-between ${
                                            profile.purpose === value
                                                ? 'border-orange-500 bg-orange-50 shadow-md'
                                                : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow'
                                        }`}
                                    >
                                        <div className="text-left">
                                            <div className="font-bold text-sm">{label}</div>
                                            <div className="text-xs text-gray-600">{sub}</div>
                                        </div>
                                        {profile.purpose === value && (
                                            <Icon name="Check" size={20} className="text-orange-600" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6">
                        {/* カスタム活動レベル */}
                        <div className="border-l-4 border-indigo-500 pl-4">
                            <label className="block text-sm font-medium mb-2">活動レベル（詳細設定）</label>
                            {!profile.customActivityMultiplier && (
                                <select
                                    value={profile.activityLevel}
                                    onChange={(e) => setProfile({...profile, activityLevel: e.target.value === '' ? '' : Number(e.target.value)})}
                                    className="w-full px-3 py-2 border rounded-lg"
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
                                        placeholder="例: 1.4"
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
                                            className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            設定
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCustomMultiplierInput(false);
                                                setCustomMultiplierInputValue('');
                                            }}
                                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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

                        {/* カロリー調整値 */}
                        <div className="border-l-4 border-orange-500 pl-4">
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <div className="flex flex-col">
                                    <span>カロリー調整値（kcal/日）</span>
                                    <span className="text-xs text-gray-500 font-normal mt-0.5">メンテナンスから±調整</span>
                                </div>
                            </label>
                            <input
                                type="number"
                                step="50"
                                value={profile.calorieAdjustment !== undefined ? profile.calorieAdjustment : 0}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                                    setProfile({...profile, calorieAdjustment: value});
                                }}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                推奨範囲: ±300kcal（安全で持続可能なペース）
                            </p>
                        </div>

                        {/* 最終目標カロリー表示 */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border-2 border-indigo-200">
                            <p className="text-sm font-medium text-indigo-800 mb-2">あなたの目標摂取カロリー</p>
                            <p className="text-3xl font-bold text-indigo-900">
                                {Math.round(
                                    LBMUtils.calculateTDEE(
                                        LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage),
                                        profile.activityLevel,
                                        profile.customActivityMultiplier
                                    ) + (profile.calorieAdjustment || 0)
                                )} kcal/日
                            </p>
                            <div className="mt-3 text-xs text-gray-700 space-y-1">
                                <p>• 基準カロリー（TDEE）: {Math.round(LBMUtils.calculateTDEE(
                                    LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage),
                                    profile.activityLevel,
                                    profile.customActivityMultiplier
                                ))} kcal</p>
                                <p>• 調整値: {profile.calorieAdjustment >= 0 ? '+' : ''}{profile.calorieAdjustment || 0} kcal</p>
                                <p>• 目的: {profile.purpose}</p>
                            </div>
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
                    {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700"
                        >
                            次へ
                        </button>
                    ) : step === 4 ? (
                        <button
                            onClick={handleComplete}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700"
                        >
                            開始する
                        </button>
                    ) : null}
                </div>
            </div>

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
        </div>
    );
};
