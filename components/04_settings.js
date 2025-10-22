// ===== Settings Components =====
// TutorialView機能は削除されました（ダミー定義）
const TutorialView = ({ onClose, onComplete }) => {
    return null;
};


// ===== 設定画面 =====
const SettingsView = ({ onClose, userProfile, onUpdateProfile, userId, usageDays, unlockedFeatures, onOpenAddView, darkMode, onToggleDarkMode }) => {
    const [profile, setProfile] = useState({...userProfile});
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'data', 'advanced'
    const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
    const [customMultiplierInputValue, setCustomMultiplierInputValue] = useState('');
    const [infoModal, setInfoModal] = useState({ show: false, title: '', content: '' });
    const [visualGuideModal, setVisualGuideModal] = useState({ show: false, gender: '男性', selectedLevel: 5 });
    const [showWearableIntegration, setShowWearableIntegration] = useState(false);

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
{/* ウェアラブルデバイス連携 */}
                    <details className="border rounded-lg border-gray-300 bg-gradient-to-br from-green-50 to-teal-50">
                        <summary className="cursor-pointer p-4 hover:bg-green-100 font-medium flex items-center gap-2">
                            <Icon name="Watch" size={18} className="text-green-600" />
                            ウェアラブルデバイス連携
                            <span className="ml-auto text-xs bg-green-600 text-white px-2 py-1 rounded-full">NEW</span>
                            <Icon name="ChevronDown" size={16} className="ml-2 text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t border-green-200">
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600">
                                    Apple WatchやAndroidスマートウォッチと連携して、睡眠データを自動で記録
                                </p>
                                <button
                                    onClick={() => setShowWearableIntegration(true)}
                                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-3 rounded-lg hover:from-green-700 hover:to-teal-700 transition flex items-center justify-center gap-2"
                                >
                                    <Icon name="Watch" size={18} />
                                    デバイスを接続
                                </button>
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

        {/* ウェアラブル連携モーダル */}
        {showWearableIntegration && (
            <WearableIntegration
                onClose={() => setShowWearableIntegration(false)}
                userId={userId}
                userProfile={profile}
            />
        )}
        </>
    );
};
// ===========================
// Analysis and History Components
// Extracted from index_beta.html
// ===========================

