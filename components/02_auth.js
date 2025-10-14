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
