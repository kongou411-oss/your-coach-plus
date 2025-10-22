// ===== Authentication Components =====
const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            let userCredential;
            if (isSignUp) {
                userCredential = await auth.createUserWithEmailAndPassword(email, password);
            } else {
                userCredential = await auth.signInWithEmailAndPassword(email, password);
            }

            // 認証成功後、ユーザー情報をFirestoreに保存
            if (userCredential && userCredential.user) {
                await DataService.saveOrUpdateAuthUser(userCredential.user);
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);

            // Google認証成功後、ユーザー情報をFirestoreに保存
            if (result && result.user) {
                await DataService.saveOrUpdateAuthUser(result.user);
            }
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
    const [step, setStep] = useState(0); // Start from 0 for goal selection
    const [infoModal, setInfoModal] = useState({ show: false, title: '', content: '' });
    const [visualGuideModal, setVisualGuideModal] = useState({ show: false, gender: '男性', selectedLevel: 5 });
    const [showBodyFatInfoIcon, setShowBodyFatInfoIcon] = useState(() => {
        const viewed = localStorage.getItem('onboarding_bodyFatInfoViewed');
        return viewed !== 'true';
    });
    const [showBodyFatStandardIcon, setShowBodyFatStandardIcon] = useState(() => {
        const viewed = localStorage.getItem('onboarding_bodyFatStandardViewed');
        return viewed !== 'true';
    });
    const [profile, setProfile] = useState({
        nickname: '',
        gender: '男性',
        age: 25,
        height: 170,
        weight: 70,
        bodyFatPercentage: 15,
        activityLevel: 3,
        purpose: 'メンテナンス',
        weightChangePace: 0,
        primaryGoal: null, // New: user's primary goal
        recommendedStart: null, // New: recommended starting feature
        userChoosesOwn: false // New: whether user wants to choose their own path
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
                <h2 className="text-2xl font-bold mb-6">
                    {step === 0 ? 'あなたの目標を教えてください' : `プロフィール設定 (${step}/3)`}
                </h2>

                {step === 0 && (
                    <div className="space-y-4">
                        <p className="text-gray-600 text-center mb-6">
                            最大の目標は何ですか？これに基づいて、最適な開始点をご提案します。
                        </p>
                        <div className="space-y-3">
                            {[
                                { id: 'bulk', label: 'バルクアップ', desc: '筋肉を増やして体を大きくしたい', icon: '💪', color: 'blue', purpose: 'バルクアップ', pace: 1 },
                                { id: 'diet', label: 'ダイエット', desc: '脂肪を落として引き締めたい', icon: '🔥', color: 'red', purpose: 'ダイエット', pace: -1 },
                                { id: 'maintain', label: 'メンテナンス', desc: '現状を維持しながら健康的に過ごしたい', icon: '⚖️', color: 'green', purpose: 'メンテナンス', pace: 0 },
                                { id: 'recomp', label: 'リコンプ', desc: '脂肪を落としながら筋肉をつけたい', icon: '⚡', color: 'purple', purpose: 'リコンプ', pace: -1 }
                            ].map(goal => (
                                <button
                                    key={goal.id}
                                    onClick={() => {
                                        setProfile(prev => ({
                                            ...prev,
                                            primaryGoal: goal.id,
                                            purpose: goal.purpose,
                                            weightChangePace: goal.pace
                                        }));
                                    }}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition hover:shadow-lg ${
                                        profile.primaryGoal === goal.id
                                            ? `border-${goal.color}-500 bg-${goal.color}-50`
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-3xl">{goal.icon}</span>
                                        <div>
                                            <h3 className="font-bold text-lg">{goal.label}</h3>
                                            <p className="text-sm text-gray-600">{goal.desc}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {profile.primaryGoal && (
                            <button
                                onClick={() => setStep(1)}
                                className="w-full mt-6 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700"
                            >
                                次へ
                            </button>
                        )}
                    </div>
                )}

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
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                体脂肪率 (%)
                                {!infoModal.show && !visualGuideModal.show && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInfoModal({
                                                    show: true,
                                                    title: '体脂肪率とは？',
                                                    content: `体脂肪率は、体重のうち脂肪が占める割合を示す指標です。

【体脂肪率の重要性】
• 除脂肪体重（LBM）の計算に必要
• LBMから基礎代謝量（BMR）を算出
• 個別化された栄養目標の設定に使用

【測定方法】
• 体組成計（InBodyなど）での測定を推奨
• 不明な場合は外見から推定できます（目アイコンをタップ）

【注意】
正確な体脂肪率を知ることで、より精密な栄養管理が可能になります。`
                                                });
                                            }}
                                            className="text-indigo-600 hover:text-indigo-800"
                                            title="体脂肪率について"
                                        >
                                            <Icon name="Info" size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setVisualGuideModal({ ...visualGuideModal, show: true, gender: profile.gender });
                                            }}
                                            className="text-orange-600 hover:text-orange-800"
                                            title="外見から体脂肪率を推定"
                                        >
                                            <Icon name="Eye" size={16} />
                                        </button>
                                    </>
                                )}
                            </label>
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
                                活動レベル
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
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                スタイル
                                <button
                                    type="button"
                                    onClick={() => setInfoModal({
                                        show: true,
                                        title: 'スタイルとは？',
                                        content: `トレーニングスタイルによってPFC（タンパク質・脂質・炭水化物）の推奨バランスが異なります。

【一般】
・週1〜3回程度の軽めのトレーニング
・健康維持や軽い体づくりが目的
・タンパク質係数: 標準

【ボディメイカー】
・週4回以上の本格的なトレーニング
・筋肥大や競技パフォーマンス向上が目的
・タンパク質係数: 2倍（より多くのタンパク質を推奨）

あとから設定画面で変更することも可能です。`
                                    })}
                                    className="text-indigo-600 hover:text-indigo-800"
                                >
                                    <Icon name="Info" size={16} />
                                </button>
                            </label>
                            <select
                                value={profile.style || '一般'}
                                onChange={(e) => setProfile({...profile, style: e.target.value})}
                                className="w-full px-4 py-3 border rounded-lg"
                            >
                                <option value="一般">一般</option>
                                <option value="ボディメイカー">ボディメイカー</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                カロリー調整値（任意）
                                <button
                                    type="button"
                                    onClick={() => setInfoModal({
                                        show: true,
                                        title: 'カロリー調整値とは？',
                                        content: `あなたの目標に合わせて1日の摂取カロリーを微調整する値です。

【目標別で自動調整】
• バルクアップ: +300 kcal（筋肉をつけやすくする）
• ダイエット: -300 kcal（脂肪を落としやすくする）
• メンテナンス: ±0 kcal（現状維持）
• リコンプ: ±0 kcal（体組成改善）

【任意変更も可能】
もっと早く結果を出したい場合や、ゆっくり進めたい場合は、この値を手動で変更できます。

例：
• より速くダイエット: -500 kcal
• ゆっくりバルクアップ: +200 kcal

空欄のままにすると目標別のデフォルト値が自動適用されます。`
                                    })}
                                    className="text-indigo-600 hover:text-indigo-800"
                                >
                                    <Icon name="Info" size={16} />
                                </button>
                            </label>
                            <input
                                type="number"
                                value={profile.calorieAdjustment !== undefined && profile.calorieAdjustment !== null ? profile.calorieAdjustment : ''}
                                onChange={(e) => setProfile({...profile, calorieAdjustment: e.target.value === '' ? null : Number(e.target.value)})}
                                className="w-full px-4 py-3 border rounded-lg"
                                placeholder={`目標別で自動調整（${profile.primaryGoal === 'bulk' ? '+300' : profile.primaryGoal === 'diet' ? '-300' : '±0'} kcal）`}
                            />
                            <p className="text-xs text-gray-600 mt-1">
                                未入力の場合、目標に応じて自動調整されます
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-600 mb-2">選択された目標</p>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">
                                    {profile.primaryGoal === 'bulk' && '💪'}
                                    {profile.primaryGoal === 'diet' && '🔥'}
                                    {profile.primaryGoal === 'maintain' && '⚖️'}
                                    {profile.primaryGoal === 'recomp' && '⚡'}
                                </span>
                                <div>
                                    <p className="font-bold text-lg text-gray-800">
                                        {profile.primaryGoal === 'bulk' && 'バルクアップ'}
                                        {profile.primaryGoal === 'diet' && 'ダイエット'}
                                        {profile.primaryGoal === 'maintain' && 'メンテナンス'}
                                        {profile.primaryGoal === 'recomp' && 'リコンプ'}
                                    </p>
                                    <p className="text-sm text-gray-600">{profile.purpose}</p>
                                </div>
                            </div>
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
                                    LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage),
                                    profile.style || '一般',
                                    profile.purpose || 'メンテナンス',
                                    'バランス',
                                    profile.calorieAdjustment,
                                    profile.customPFC
                                ).calories} kcal/日
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 mt-8">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300"
                        >
                            戻る
                        </button>
                    )}
                    {step > 0 && step < 3 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700"
                        >
                            次へ
                        </button>
                    ) : step === 3 ? (
                        <button
                            onClick={handleComplete}
                            className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700"
                        >
                            開始する
                        </button>
                    ) : null}
                </div>

                {/* 情報モーダル */}
                {/* 情報モーダル（iアイコン用） */}
                {infoModal.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={() => setInfoModal({ show: false, title: '', content: '' })}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex justify-between items-center z-10">
                                <h3 className="font-bold text-lg">{infoModal.title}</h3>
                                <button onClick={() => setInfoModal({ show: false, title: '', content: '' })} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-full">
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-700 whitespace-pre-line leading-relaxed">{infoModal.content}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Visual Guide Modal（目アイコン用・体脂肪率％基準） */}
                {visualGuideModal.show && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-pink-600 text-white p-4 flex justify-between items-center z-10">
                                <h3 className="font-bold text-lg">外見から体脂肪率を推定</h3>
                                <button onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-full">
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
                                                                <span className="font-bold text-gray-900">レベル {guide.level}</span>
                                                                <span className="text-sm font-semibold text-orange-600">({guide.range})</span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-2">{guide.title}</p>
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
        </div>
    );
};
