// ===== Settings Components =====
// TutorialView機能は削除されました（ダミー定義）
const TutorialView = ({ onClose, onComplete }) => {
    return null;
};


// ===== 設定画面 =====
const SettingsView = ({ onClose, userProfile, onUpdateProfile, userId, usageDays, unlockedFeatures, onOpenAddView, darkMode, onToggleDarkMode, shortcuts = [], onUpdateShortcuts, reopenTemplateEditModal = false, reopenTemplateEditType = null, onTemplateEditModalOpened }) => {
    const [profile, setProfile] = useState({...userProfile});
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'data', 'advanced'
    const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
    const [customMultiplierInputValue, setCustomMultiplierInputValue] = useState('');
    const [infoModal, setInfoModal] = useState({ show: false, title: '', content: '' });
    const [visualGuideModal, setVisualGuideModal] = useState({ show: false, gender: '男性', selectedLevel: 5 });

    // userProfileが変更されたときにprofile stateを更新
    useEffect(() => {
        setProfile({...userProfile});
    }, [userProfile]);

    // 詳細設定用のstate（デフォルト値をプロフィールから取得）
    const [advancedSettings, setAdvancedSettings] = useState({
        proteinCoefficient: userProfile.proteinCoefficient || 2.5,
        fatRatio: userProfile.fatRatio || 0.25,
        proteinRatio: userProfile.proteinRatio || 30,
        fatRatioPercent: userProfile.fatRatioPercent || 25,
        carbRatio: userProfile.carbRatio || 45,
        ageProteinBoost: userProfile.ageProteinBoost !== undefined ? userProfile.ageProteinBoost : true,
        bodymakerBoost: userProfile.bodymakerBoost !== undefined ? userProfile.bodymakerBoost : true,
        trainingBoost: userProfile.trainingBoost !== undefined ? userProfile.trainingBoost : true,
        sleepAdjustment: userProfile.sleepAdjustment !== undefined ? userProfile.sleepAdjustment : true,
        stressAdjustment: userProfile.stressAdjustment !== undefined ? userProfile.stressAdjustment : true,
        usePurposeBased: userProfile.usePurposeBased !== false // デフォルトは目的別モード（falseが明示的に設定されていない限り）
    });
    const [localRoutines, setLocalRoutines] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.ROUTINES);
        return saved ? JSON.parse(saved) : [];
    });
    const [mealTemplates, setMealTemplates] = useState([]);
    const [workoutTemplates, setWorkoutTemplates] = useState([]);
    const [supplementTemplates, setSupplementTemplates] = useState([]);
    const [showTemplateEditModal, setShowTemplateEditModal] = useState(false); // テンプレート編集モーダル表示
    const [templateEditType, setTemplateEditType] = useState(null); // 'meal' or 'workout'
    const [selectedTemplateForEdit, setSelectedTemplateForEdit] = useState(null); // 編集対象のテンプレート

    // テンプレート読み込み
    useEffect(() => {
        loadTemplates();
    }, []);

    // AddItemViewから戻ってきた時にテンプレート編集モーダルを再度開く
    useEffect(() => {
        if (reopenTemplateEditModal && reopenTemplateEditType) {
            setTemplateEditType(reopenTemplateEditType);
            setShowTemplateEditModal(true);
            onTemplateEditModalOpened && onTemplateEditModalOpened();
        }
    }, [reopenTemplateEditModal, reopenTemplateEditType]);

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

        // 目的別モードの場合はカスタムPFC比率をクリア、カスタムモードの場合は保持
        const pfcSettings = advancedSettings.usePurposeBased !== false
            ? {
                // 目的別モード：カスタムPFC比率をクリア
                proteinRatio: undefined,
                fatRatioPercent: undefined,
                carbRatio: undefined
            }
            : {
                // カスタムモード：カスタムPFC比率を保持
                proteinRatio: advancedSettings.proteinRatio,
                fatRatioPercent: advancedSettings.fatRatioPercent,
                carbRatio: advancedSettings.carbRatio
            };

        const updatedProfile = {
            ...profile,
            ...advancedSettings, // 詳細設定を統合
            ...pfcSettings, // PFC設定を上書き
            leanBodyMass: lbm,
            bmr: bmr,
            tdeeBase: tdeeBase
        };

        console.log('=== Profile Save Debug ===');
        console.log('profile.style:', profile.style);
        console.log('advancedSettings.usePurposeBased:', advancedSettings.usePurposeBased);
        console.log('pfcSettings:', pfcSettings);
        console.log('updatedProfile.style:', updatedProfile.style);
        console.log('updatedProfile:', updatedProfile);

        onUpdateProfile(updatedProfile);
        onClose();

        // スタイル変更後、ダッシュボードの推奨量を更新するためにリロード
        setTimeout(() => {
            window.location.reload();
        }, 100);
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
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="BookOpen" size={18} className="text-indigo-600" />
                            使い方
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-700 font-semibold">YourCoachの基本フロー</p>

                                {/* フローチャート */}
                                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 space-y-3">
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
                            </div>
                        </div>
                    </details>

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

                                    {/* STEP 1: 個人情報 */}
                                    <div className="border-l-4 border-blue-500 pl-4">
                                        <h4 className="text-xs font-bold text-blue-700 mb-2">STEP 1: 個人情報</h4>
                                        <div className="space-y-2.5">
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">ニックネーム</label>
                                                <input
                                                    type="text"
                                                    value={profile.nickname}
                                                    onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1.5">年齢</label>
                                                    <input
                                                        type="number"
                                                        value={profile.age}
                                                        onChange={(e) => setProfile({...profile, age: e.target.value === '' ? '' : Number(e.target.value)})}
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1.5">性別</label>
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
                                            </div>
                                        </div>
                                    </div>

                                    {/* STEP 2: 活動量 */}
                                    <div className="border-l-4 border-green-500 pl-4">
                                        <h4 className="text-xs font-bold text-green-700 mb-2">STEP 2: 活動量</h4>
                                        <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                                            活動レベル
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const lbm = LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
                                                    const bmr = LBMUtils.calculateBMR(lbm);
                                                    const tdee = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier);
                                                    const multipliers = {1: 1.05, 2: 1.225, 3: 1.4, 4: 1.575, 5: 1.75};
                                                    const multiplier = profile.customActivityMultiplier || multipliers[profile.activityLevel] || 1.4;

                                                    setInfoModal({
                                                        show: true,
                                                        title: '活動レベルとTDEE計算',
                                                        content: `あなたの日常生活がどれだけ活動的かを数値化したものです。この係数を基礎代謝量に掛けることで、1日の大まかな消費カロリー（TDEE）を算出します。

【TDEE計算式】
TDEE = 基礎代謝(BMR) × 活動レベル係数

【現在の計算結果】
• 基礎代謝(BMR): ${Math.round(bmr)}kcal
• 活動レベル係数: ${multiplier.toFixed(2)}x
• TDEE: ${Math.round(tdee)}kcal

【計算の内訳】
${Math.round(bmr)}kcal × ${multiplier.toFixed(2)} = ${Math.round(tdee)}kcal

【重要】
これはあくまで日常生活の活動量であり、トレーニングによる消費カロリーは、より精密な『PG式』で別途計算されます。より正確な設定をしたい方は、係数を直接入力することも可能です。`
                                                    });
                                                }}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={16} />
                                            </button>
                                        </label>
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

                                    {/* STEP 3: 目的・カロリー設定 */}
                                    <div className="border-l-4 border-orange-500 pl-4">
                                        <h4 className="text-xs font-bold text-orange-700 mb-2">STEP 3: 目的・カロリー設定</h4>
                                        <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
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

【リコンプ（体組成改善）】
• 目標: 脂肪を落としながら筋肉をつける
• カロリー: メンテナンスカロリー ±0kcal
• タンパク質: 非常に高め
• トレーニング強度が最重要

目的はいつでも変更できます。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>

                                        {/* 目的選択ボタン（縦並び） */}
                                        <div className="space-y-2 mb-3">
                                            {[
                                                { value: 'ダイエット', label: 'ダイエット', sub: '脂肪を落とす', adjust: -300 },
                                                { value: 'メンテナンス', label: 'メンテナンス', sub: '現状維持', adjust: 0 },
                                                { value: 'バルクアップ', label: 'バルクアップ', sub: '筋肉をつける', adjust: 300 },
                                                { value: 'リコンプ', label: 'リコンプ', sub: '体組成改善', adjust: 0 }
                                            ].map(({ value, label, sub, adjust }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => {
                                                        let pace = 0;
                                                        if (value === 'ダイエット') pace = -1;
                                                        else if (value === 'バルクアップ') pace = 1;
                                                        setProfile({...profile, purpose: value, weightChangePace: pace, calorieAdjustment: adjust});
                                                    }}
                                                    className={`w-full p-2 rounded-lg border-2 transition flex items-center justify-between ${
                                                        profile.purpose === value
                                                            ? 'border-orange-500 bg-orange-50 shadow-md'
                                                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow'
                                                    }`}
                                                >
                                                    <div className="text-left">
                                                        <div className="font-bold text-sm">{label}</div>
                                                        <div className="text-xs text-gray-600">{sub}</div>
                                                    </div>
                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                        adjust > 0 ? 'bg-green-100 text-green-700' :
                                                        adjust < 0 ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {adjust > 0 ? '+' : ''}{adjust}kcal
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* カロリー調整値 */}
                                        <div className="mt-3">
                                            <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                                                <div className="flex flex-col">
                                                    <span>カロリー調整値（kcal/日）</span>
                                                    <span className="text-xs text-gray-500 font-normal mt-0.5">メンテナンスから±調整</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const lbm = LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
                                                        const tdee = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier);
                                                        const targetCalories = tdee + (profile.calorieAdjustment || 0);

                                                        setInfoModal({
                                                            show: true,
                                                            title: 'カロリー調整値と目標摂取カロリー',
                                                            content: `メンテナンスカロリー（TDEE）からの調整値を設定します。

【目標摂取カロリー計算式】
目標摂取カロリー = TDEE + カロリー調整値

【現在の計算結果】
• TDEE: ${Math.round(tdee)}kcal
• カロリー調整値: ${profile.calorieAdjustment >= 0 ? '+' : ''}${profile.calorieAdjustment || 0}kcal
• 目標摂取カロリー: ${Math.round(targetCalories)}kcal/日

【計算の内訳】
${Math.round(tdee)}kcal ${profile.calorieAdjustment >= 0 ? '+' : ''} ${profile.calorieAdjustment || 0}kcal = ${Math.round(targetCalories)}kcal

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

【リコンプ時】
• 0kcal: 体組成改善（トレーニングが重要）

【注意】
極端なカロリー調整は、代謝の低下、筋肉の減少、リバウンドのリスクを高めます。±200〜300kcalの範囲で調整することを強く推奨します。`
                                                        });
                                                    }}
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
                                                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                                                    setProfile({...profile, calorieAdjustment: value});
                                                }}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* STEP 4: PFCバランス設定 */}
                                    <div className="border-l-4 border-purple-500 pl-4">
                                        <h4 className="text-xs font-bold text-purple-700 mb-2">STEP 4: PFCバランス設定</h4>

                                        {/* スタイル選択 */}
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                                                スタイル
                                                <button
                                                    type="button"
                                                    onClick={() => setInfoModal({
                                                        show: true,
                                                        title: 'スタイルとタンパク質係数',
                                                        content: `スタイルによってタンパク質の推奨係数が変わります。

【一般】
・LBM × 1.0倍のタンパク質係数
・健康維持や日常的なトレーニングを行う方向け

【ボディメイカー】
・LBM × 2.0倍のタンパク質係数（一般の2倍）
・筋肥大や体づくりを重視する方向け
・高強度のトレーニングを行う方向け`
                                                    })}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <Icon name="Info" size={14} />
                                                </button>
                                            </label>
                                            <select
                                                value={profile.style || '一般'}
                                                onChange={(e) => setProfile({...profile, style: e.target.value})}
                                                className="w-full px-3 py-2 border rounded-lg"
                                            >
                                                <option value="一般">一般</option>
                                                <option value="ボディメイカー">ボディメイカー</option>
                                            </select>
                                        </div>

                                        <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                                            PFCバランス（目標比率）
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
                                                    const tdeeBase = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier);
                                                    const targetCalories = tdeeBase + (profile.calorieAdjustment || 0);
                                                    const lifestyle = profile.style || '一般';
                                                    const purpose = profile.purpose || 'メンテナンス';
                                                    const dietStyle = profile.dietStyle || 'バランス';

                                                    let coefficient = 1.0;
                                                    if (lifestyle === 'ボディメイカー') {
                                                        if (purpose === 'バルクアップ') coefficient = 2.8;
                                                        else if (purpose === 'ダイエット') coefficient = 2.4;
                                                        else coefficient = 2.0;
                                                    } else {
                                                        if (purpose === 'バルクアップ') coefficient = 1.4;
                                                        else if (purpose === 'ダイエット') coefficient = 1.2;
                                                        else coefficient = 1.0;
                                                    }

                                                    const proteinG = Math.round(lbm * coefficient);
                                                    const proteinCal = proteinG * 4;

                                                    let fatRatio = 0.25;
                                                    if (dietStyle === '低脂質') fatRatio = 0.15;
                                                    else if (dietStyle === '低炭水化物') fatRatio = 0.35;
                                                    else if (dietStyle === 'ケトジェニック') fatRatio = 0.60;

                                                    const fatCal = targetCalories * fatRatio;
                                                    const fatG = Math.round(fatCal / 9);
                                                    const carbCal = targetCalories - proteinCal - fatCal;
                                                    const carbG = Math.round(carbCal / 4);
                                                    const proteinPercent = Math.round((proteinCal / targetCalories) * 100);
                                                    const fatPercent = Math.round((fatCal / targetCalories) * 100);
                                                    const carbPercent = Math.round((carbCal / targetCalories) * 100);

                                                    setInfoModal({
                                                        show: true,
                                                        title: 'PFCバランスと目的別推奨値',
                                                        content: `タンパク質(P)、脂質(F)、炭水化物(C)の目標比率を設定します。

【📊 目的別推奨値】
${lifestyle} × ${purpose} (LBM ${lbm.toFixed(1)}kg × ${coefficient}倍)

🔴 タンパク質: ${proteinG}g (${proteinCal}kcal, ${proteinPercent}%)
🟡 脂質: ${fatG}g (${Math.round(fatCal)}kcal, ${fatPercent}%)
🟢 炭水化物: ${carbG}g (${Math.round(carbCal)}kcal, ${carbPercent}%)
━━━━━━━━━━━━━━━━━━━━━
合計: ${Math.round(targetCalories)}kcal

【カスタム比率のデフォルト値】
🔴 タンパク質: 30%
🟡 脂質: 25%
🟢 炭水化物: 45%

合計は必ず100%になるように自動調整されます。`
                                                    });
                                                }}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>

                                        {/* モード選択 */}
                                        <div className="mb-2">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAdvancedSettings({
                                                            ...advancedSettings,
                                                            usePurposeBased: true
                                                        });
                                                    }}
                                                    className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition ${
                                                        advancedSettings.usePurposeBased === true
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    デフォルト比率
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAdvancedSettings({
                                                            ...advancedSettings,
                                                            usePurposeBased: false
                                                        });
                                                    }}
                                                    className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition ${
                                                        advancedSettings.usePurposeBased === false
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    カスタム比率
                                                </button>
                                            </div>
                                        </div>

                                        {/* カスタム比率設定（カスタムモード時のみ表示） */}
                                        {advancedSettings.usePurposeBased === false && (
                                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                            {/* タンパク質 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-green-700">タンパク質 (P)</span>
                                                    <span className="text-sm font-bold">{advancedSettings.proteinRatio || 30}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="50"
                                                    step="1"
                                                    value={advancedSettings.proteinRatio || 30}
                                                    onChange={(e) => {
                                                        const newP = Number(e.target.value);
                                                        const currentF = advancedSettings.fatRatioPercent || 25;
                                                        const newC = 100 - newP - currentF;
                                                        if (newC >= 15 && newC <= 60) {
                                                            setAdvancedSettings({
                                                                ...advancedSettings,
                                                                proteinRatio: newP,
                                                                carbRatio: newC
                                                            });
                                                        }
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                            {/* 脂質 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-yellow-700">脂質 (F)</span>
                                                    <span className="text-sm font-bold">{advancedSettings.fatRatioPercent || 25}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="40"
                                                    step="1"
                                                    value={advancedSettings.fatRatioPercent || 25}
                                                    onChange={(e) => {
                                                        const newF = Number(e.target.value);
                                                        const currentP = advancedSettings.proteinRatio || 30;
                                                        const newC = 100 - currentP - newF;
                                                        if (newC >= 15 && newC <= 60) {
                                                            setAdvancedSettings({
                                                                ...advancedSettings,
                                                                fatRatioPercent: newF,
                                                                carbRatio: newC
                                                            });
                                                        }
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                            {/* 炭水化物 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-orange-700">炭水化物 (C)</span>
                                                    <span className="text-sm font-bold">{advancedSettings.carbRatio || 45}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="60"
                                                    step="1"
                                                    value={advancedSettings.carbRatio || 45}
                                                    onChange={(e) => {
                                                        const newC = Number(e.target.value);
                                                        const currentP = advancedSettings.proteinRatio || 30;
                                                        const newF = 100 - currentP - newC;
                                                        if (newF >= 15 && newF <= 40) {
                                                            setAdvancedSettings({
                                                                ...advancedSettings,
                                                                carbRatio: newC,
                                                                fatRatioPercent: newF
                                                            });
                                                        }
                                                    }}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="text-xs text-gray-600 pt-2 border-t">
                                                合計: {(advancedSettings.proteinRatio || 30) + (advancedSettings.fatRatioPercent || 25) + (advancedSettings.carbRatio || 45)}%
                                                {((advancedSettings.proteinRatio || 30) + (advancedSettings.fatRatioPercent || 25) + (advancedSettings.carbRatio || 45)) === 100 &&
                                                    <span className="text-green-600 ml-2">✓ バランス良好</span>
                                                }
                                            </div>
                                        </div>
                                        )}
                                    </div>


                            <button
                                onClick={handleSave}
                                className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition"
                            >
                                保存
                            </button>
                            </div>
                        </div>
                    </details>

                    {/* ショートカット */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Zap" size={18} className="text-purple-600" />
                            ショートカット
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            <p className="text-sm text-gray-600 mb-4">画面左右のショートカットボタンをカスタマイズできます。各項目の表示位置と順番を変更できます。</p>

                            {/* 表示/非表示切り替え */}
                            <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        defaultChecked={(() => {
                                            const saved = localStorage.getItem('chevronShortcutsVisibility');
                                            return saved ? JSON.parse(saved).left : true;
                                        })()}
                                        onChange={(e) => {
                                            const saved = localStorage.getItem('chevronShortcutsVisibility');
                                            const visibility = saved ? JSON.parse(saved) : { left: true, right: true };
                                            visibility.left = e.target.checked;
                                            localStorage.setItem('chevronShortcutsVisibility', JSON.stringify(visibility));
                                            window.dispatchEvent(new CustomEvent('shortcutsVisibilityUpdated', { detail: visibility }));
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <Icon name="ChevronRight" size={16} className="text-purple-600" />
                                    <span className="text-sm font-medium">左側を表示</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        defaultChecked={(() => {
                                            const saved = localStorage.getItem('chevronShortcutsVisibility');
                                            return saved ? JSON.parse(saved).right : true;
                                        })()}
                                        onChange={(e) => {
                                            const saved = localStorage.getItem('chevronShortcutsVisibility');
                                            const visibility = saved ? JSON.parse(saved) : { left: true, right: true };
                                            visibility.right = e.target.checked;
                                            localStorage.setItem('chevronShortcutsVisibility', JSON.stringify(visibility));
                                            window.dispatchEvent(new CustomEvent('shortcutsVisibilityUpdated', { detail: visibility }));
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <Icon name="ChevronLeft" size={16} className="text-purple-600" />
                                    <span className="text-sm font-medium">右側を表示</span>
                                </label>
                            </div>

                            {/* 左側ショートカット */}
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="ChevronRight" size={16} className="text-purple-600" />
                                    左側
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                                        <select
                                            value={shortcuts.find(s => s.side === 'left')?.position || 'middle'}
                                            onChange={(e) => {
                                                const updated = shortcuts.map(s =>
                                                    s.side === 'left' ? { ...s, position: e.target.value } : s
                                                );
                                                onUpdateShortcuts(updated);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        >
                                            <option value="top">上</option>
                                            <option value="middle">中</option>
                                            <option value="bottom">下</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">サイズ</label>
                                        <select
                                            value={shortcuts.find(s => s.side === 'left')?.size || 'small'}
                                            onChange={(e) => {
                                                const updated = shortcuts.map(s =>
                                                    s.side === 'left' ? { ...s, size: e.target.value } : s
                                                );
                                                onUpdateShortcuts(updated);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        >
                                            <option value="small">小</option>
                                            <option value="medium">中</option>
                                            <option value="large">大</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {(() => {
                                        const allItems = [
                                            { action: 'open_body_composition', label: '体組成', icon: 'Activity', color: 'text-teal-600' },
                                            { action: 'open_meal', label: '食事', icon: 'Utensils', color: 'text-green-600' },
                                            { action: 'open_meal_photo', label: '写真解析', icon: 'Camera', color: 'text-green-600' },
                                            { action: 'open_workout', label: '運動', icon: 'Dumbbell', color: 'text-orange-600' },
                                            { action: 'open_condition', label: 'コンディション', icon: 'HeartPulse', color: 'text-red-600' },
                                            { action: 'open_idea', label: '閃き', icon: 'Lightbulb', color: 'text-yellow-500' },
                                            { action: 'open_analysis', label: '分析', icon: 'PieChart', color: 'text-indigo-600' },
                                            { action: 'open_history', label: '履歴', icon: 'TrendingUp', color: 'text-purple-600' },
                                            { action: 'open_pgbase', label: 'PGBASE', icon: 'BookOpen', color: 'text-cyan-600' },
                                            { action: 'open_community', label: 'COMY', icon: 'Users', color: 'text-pink-600' },
                                            { action: 'open_settings', label: '設定', icon: 'Settings', color: 'text-gray-600' }
                                        ];

                                        // 左側の項目リストを取得
                                        const leftShortcuts = shortcuts
                                            .filter(s => s.side === 'left' && s.enabled)
                                            .sort((a, b) => (a.order || 0) - (b.order || 0));

                                        const [draggedIndex, setDraggedIndex] = React.useState(null);

                                        return (
                                            <>
                                                {leftShortcuts.map((shortcut, index) => {
                                                    const item = allItems.find(i => i.action === shortcut.action);
                                                    if (!item) return null;
                                                    const isDragging = draggedIndex === index;

                                                    return (
                                                        <div
                                                            key={`${shortcut.action}-${index}`}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                setDraggedIndex(index);
                                                                e.dataTransfer.effectAllowed = 'move';
                                                            }}
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                e.dataTransfer.dropEffect = 'move';
                                                            }}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                if (draggedIndex === null || draggedIndex === index) return;

                                                                const updated = [...shortcuts];
                                                                const leftItems = updated.filter(s => s.side === 'left' && s.enabled);
                                                                const [draggedItem] = leftItems.splice(draggedIndex, 1);
                                                                leftItems.splice(index, 0, draggedItem);

                                                                // order値を更新
                                                                leftItems.forEach((item, i) => {
                                                                    const idx = updated.findIndex(s => s === item);
                                                                    if (idx !== -1) updated[idx].order = i;
                                                                });

                                                                onUpdateShortcuts(updated);
                                                                setDraggedIndex(null);
                                                            }}
                                                            onDragEnd={() => setDraggedIndex(null)}
                                                            className={`flex items-center gap-3 p-2 bg-white border rounded-lg ${
                                                                isDragging ? 'opacity-50' : ''
                                                            }`}
                                                        >
                                                            <Icon name="GripHorizontal" size={16} className="text-gray-400 cursor-move" />
                                                            <Icon name={item.icon} size={18} className={item.color} />
                                                            <span className="flex-1 text-sm font-medium text-gray-800">
                                                                {item.label}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = shortcuts.map(s =>
                                                                        s === shortcut ? { ...s, enabled: false } : s
                                                                    );
                                                                    onUpdateShortcuts(updated);
                                                                }}
                                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                            >
                                                                <Icon name="X" size={16} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                {/* 項目を追加ボタン */}
                                                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-dashed rounded-lg">
                                                    <Icon name="Plus" size={16} className="text-gray-400" />
                                                    <select
                                                        onChange={(e) => {
                                                            if (!e.target.value) return;
                                                            const action = e.target.value;
                                                            const maxOrder = Math.max(...shortcuts.filter(s => s.side === 'left' && s.enabled).map(s => s.order || 0), -1);

                                                            // 既存の項目を探す
                                                            const existingIndex = shortcuts.findIndex(s => s.action === action);
                                                            let updated;

                                                            if (existingIndex !== -1) {
                                                                // 既存項目を有効化
                                                                updated = shortcuts.map((s, i) =>
                                                                    i === existingIndex ? { ...s, side: 'left', enabled: true, order: maxOrder + 1 } : s
                                                                );
                                                            } else {
                                                                // 新規追加
                                                                updated = [...shortcuts, {
                                                                    action,
                                                                    side: 'left',
                                                                    enabled: true,
                                                                    order: maxOrder + 1,
                                                                    position: 'middle',
                                                                    size: 'small'
                                                                }];
                                                            }

                                                            onUpdateShortcuts(updated);
                                                            e.target.value = '';
                                                        }}
                                                        className="flex-1 px-3 py-1.5 text-sm border-none bg-transparent text-gray-600 cursor-pointer"
                                                        defaultValue=""
                                                    >
                                                        <option value="">項目を追加...</option>
                                                        {allItems.map(item => (
                                                            <option key={item.action} value={item.action}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* 右側ショートカット */}
                            <div className="mb-4">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="ChevronLeft" size={16} className="text-purple-600" />
                                    右側
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                                        <select
                                            value={shortcuts.find(s => s.side === 'right')?.position || 'middle'}
                                            onChange={(e) => {
                                                const updated = shortcuts.map(s =>
                                                    s.side === 'right' ? { ...s, position: e.target.value } : s
                                                );
                                                onUpdateShortcuts(updated);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        >
                                            <option value="top">上</option>
                                            <option value="middle">中</option>
                                            <option value="bottom">下</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">サイズ</label>
                                        <select
                                            value={shortcuts.find(s => s.side === 'right')?.size || 'small'}
                                            onChange={(e) => {
                                                const updated = shortcuts.map(s =>
                                                    s.side === 'right' ? { ...s, size: e.target.value } : s
                                                );
                                                onUpdateShortcuts(updated);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg text-sm"
                                        >
                                            <option value="small">小</option>
                                            <option value="medium">中</option>
                                            <option value="large">大</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {(() => {
                                        const allItems = [
                                            { action: 'open_body_composition', label: '体組成', icon: 'Activity', color: 'text-teal-600' },
                                            { action: 'open_meal', label: '食事', icon: 'Utensils', color: 'text-green-600' },
                                            { action: 'open_meal_photo', label: '写真解析', icon: 'Camera', color: 'text-green-600' },
                                            { action: 'open_workout', label: '運動', icon: 'Dumbbell', color: 'text-orange-600' },
                                            { action: 'open_condition', label: 'コンディション', icon: 'HeartPulse', color: 'text-red-600' },
                                            { action: 'open_idea', label: '閃き', icon: 'Lightbulb', color: 'text-yellow-500' },
                                            { action: 'open_analysis', label: '分析', icon: 'PieChart', color: 'text-indigo-600' },
                                            { action: 'open_history', label: '履歴', icon: 'TrendingUp', color: 'text-purple-600' },
                                            { action: 'open_pgbase', label: 'PGBASE', icon: 'BookOpen', color: 'text-cyan-600' },
                                            { action: 'open_community', label: 'COMY', icon: 'Users', color: 'text-pink-600' },
                                            { action: 'open_settings', label: '設定', icon: 'Settings', color: 'text-gray-600' }
                                        ];

                                        // 右側の項目リストを取得
                                        const rightShortcuts = shortcuts
                                            .filter(s => s.side === 'right' && s.enabled)
                                            .sort((a, b) => (a.order || 0) - (b.order || 0));

                                        const [draggedIndex, setDraggedIndex] = React.useState(null);

                                        return (
                                            <>
                                                {rightShortcuts.map((shortcut, index) => {
                                                    const item = allItems.find(i => i.action === shortcut.action);
                                                    if (!item) return null;
                                                    const isDragging = draggedIndex === index;

                                                    return (
                                                        <div
                                                            key={`${shortcut.action}-${index}`}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                setDraggedIndex(index);
                                                                e.dataTransfer.effectAllowed = 'move';
                                                            }}
                                                            onDragOver={(e) => {
                                                                e.preventDefault();
                                                                e.dataTransfer.dropEffect = 'move';
                                                            }}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                if (draggedIndex === null || draggedIndex === index) return;

                                                                const updated = [...shortcuts];
                                                                const rightItems = updated.filter(s => s.side === 'right' && s.enabled);
                                                                const [draggedItem] = rightItems.splice(draggedIndex, 1);
                                                                rightItems.splice(index, 0, draggedItem);

                                                                // order値を更新
                                                                rightItems.forEach((item, i) => {
                                                                    const idx = updated.findIndex(s => s === item);
                                                                    if (idx !== -1) updated[idx].order = i;
                                                                });

                                                                onUpdateShortcuts(updated);
                                                                setDraggedIndex(null);
                                                            }}
                                                            onDragEnd={() => setDraggedIndex(null)}
                                                            className={`flex items-center gap-3 p-2 bg-white border rounded-lg ${
                                                                isDragging ? 'opacity-50' : ''
                                                            }`}
                                                        >
                                                            <Icon name="GripHorizontal" size={16} className="text-gray-400 cursor-move" />
                                                            <Icon name={item.icon} size={18} className={item.color} />
                                                            <span className="flex-1 text-sm font-medium text-gray-800">
                                                                {item.label}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = shortcuts.map(s =>
                                                                        s === shortcut ? { ...s, enabled: false } : s
                                                                    );
                                                                    onUpdateShortcuts(updated);
                                                                }}
                                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                            >
                                                                <Icon name="X" size={16} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                {/* 項目を追加ボタン */}
                                                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-dashed rounded-lg">
                                                    <Icon name="Plus" size={16} className="text-gray-400" />
                                                    <select
                                                        onChange={(e) => {
                                                            if (!e.target.value) return;
                                                            const action = e.target.value;
                                                            const maxOrder = Math.max(...shortcuts.filter(s => s.side === 'right' && s.enabled).map(s => s.order || 0), -1);

                                                            // 既存の項目を探す
                                                            const existingIndex = shortcuts.findIndex(s => s.action === action);
                                                            let updated;

                                                            if (existingIndex !== -1) {
                                                                // 既存項目を有効化
                                                                updated = shortcuts.map((s, i) =>
                                                                    i === existingIndex ? { ...s, side: 'right', enabled: true, order: maxOrder + 1 } : s
                                                                );
                                                            } else {
                                                                // 新規追加
                                                                updated = [...shortcuts, {
                                                                    action,
                                                                    side: 'right',
                                                                    enabled: true,
                                                                    order: maxOrder + 1,
                                                                    position: 'middle',
                                                                    size: 'small'
                                                                }];
                                                            }

                                                            onUpdateShortcuts(updated);
                                                            e.target.value = '';
                                                        }}
                                                        className="flex-1 px-3 py-1.5 text-sm border-none bg-transparent text-gray-600 cursor-pointer"
                                                        defaultValue=""
                                                    >
                                                        <option value="">項目を追加...</option>
                                                        {allItems.map(item => (
                                                            <option key={item.action} value={item.action}>
                                                                {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
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
                                <div className="mb-3">
                                    <h3 className="font-semibold text-green-800 mb-2">食事テンプレート</h3>
                                    <div className="flex items-center justify-between">
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
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setTemplateEditType('meal');
                                                                    setShowTemplateEditModal(true);
                                                                }}
                                                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                            >
                                                                <Icon name="Edit" size={16} />
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.preventDefault();
                                                                    if (confirm('このテンプレートを削除しますか？')) {
                                                                        await DataService.deleteMealTemplate(userId, template.id);
                                                                        await loadTemplates();
                                                                    }
                                                                }}
                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                            >
                                                                <Icon name="Trash2" size={16} />
                                                            </button>
                                                        </div>
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

                            {/* 運動テンプレート */}
                            <div className="border rounded-lg p-4">
                                <div className="mb-3">
                                    <h3 className="font-semibold text-orange-800 mb-2">運動テンプレート</h3>
                                    <div className="flex items-center justify-between">
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
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setTemplateEditType('workout');
                                                                    setShowTemplateEditModal(true);
                                                                }}
                                                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                            >
                                                                <Icon name="Edit" size={16} />
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.preventDefault();
                                                                    if (confirm('このテンプレートを削除しますか？')) {
                                                                        await DataService.deleteWorkoutTemplate(userId, template.id);
                                                                        await loadTemplates();
                                                                    }
                                                                }}
                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                            >
                                                                <Icon name="Trash2" size={16} />
                                                            </button>
                                                        </div>
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

                        </div>
                        </div>
                    </details>

                    {/* ルーティン */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Repeat" size={18} className="text-indigo-600" />
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

        {/* テンプレート編集選択モーダル */}
        {showTemplateEditModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                    {/* ヘッダー */}
                    <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center rounded-t-2xl">
                        <h3 className="text-lg font-bold">
                            {templateEditType === 'meal' ? '食事テンプレート編集' : '運動テンプレート編集'}
                        </h3>
                        <button
                            onClick={() => {
                                setShowTemplateEditModal(false);
                                setTemplateEditType(null);
                            }}
                            className="text-white hover:text-gray-200 transition"
                        >
                            <Icon name="X" size={24} />
                        </button>
                    </div>

                    {/* コンテンツ */}
                    <div className="p-4 space-y-3">
                        {/* 新しいテンプレートを作成 */}
                        <button
                            type="button"
                            onClick={() => {
                                setShowTemplateEditModal(false);
                                onOpenAddView && onOpenAddView(templateEditType === 'meal' ? 'meal' : 'workout', true);
                            }}
                            className="w-full bg-gray-100 border-2 border-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-200 transition flex items-center gap-4"
                        >
                            <Icon name="Plus" size={32} />
                            <div className="text-left flex-1">
                                <div className="font-bold text-base">新しいテンプレートを作成</div>
                                <div className="text-xs text-gray-500 mt-0.5">新規作成画面を開く</div>
                            </div>
                        </button>

                        {/* テンプレート一覧 */}
                        {templateEditType === 'meal' && mealTemplates.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-medium text-sm text-gray-700 mb-2">保存済みテンプレート</h4>
                                <div className="space-y-2">
                                    {mealTemplates.map(template => {
                                        const totalCals = (template.items || []).reduce((sum, i) => sum + (i.calories || 0), 0);
                                        const totalProtein = (template.items || []).reduce((sum, i) => sum + (i.protein || 0), 0);
                                        const totalFat = (template.items || []).reduce((sum, i) => sum + (i.fat || 0), 0);
                                        const totalCarbs = (template.items || []).reduce((sum, i) => sum + (i.carbs || 0), 0);

                                        return (
                                            <details key={template.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <summary className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                    <Icon name="Utensils" size={18} className="text-green-600" />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{template.name}</p>
                                                        <p className="text-xs text-gray-600">
                                                            {template.items?.length || 0}品目 | {Math.round(totalCals)}kcal
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setShowTemplateEditModal(false);
                                                                onOpenAddView && onOpenAddView('meal', true, template);
                                                            }}
                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                        >
                                                            <Icon name="Edit" size={16} />
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                if (confirm(`「${template.name}」を削除しますか？`)) {
                                                                    await DataService.deleteMealTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                }
                                                            }}
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
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
                            </div>
                        )}

                        {templateEditType === 'workout' && workoutTemplates.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="font-medium text-sm text-gray-700 mb-2">保存済みテンプレート</h4>
                                <div className="space-y-2">
                                    {workoutTemplates.map(template => {
                                        // 新形式（複数種目）と旧形式（単一種目）の両方に対応
                                        const exercises = template.exercises || (template.exercise ? [{ exercise: template.exercise, sets: template.sets || [] }] : []);
                                        const totalCals = exercises.reduce((sum, ex) => sum + (ex.sets || []).reduce((s, set) => s + (set.calories || 0), 0), 0);

                                        return (
                                            <details key={template.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <summary className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                    <Icon name="Dumbbell" size={18} className="text-orange-600" />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{template.name}</p>
                                                        <p className="text-xs text-gray-600">
                                                            {exercises.length}種目 | {exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)}セット | {Math.round(totalCals)}kcal
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setShowTemplateEditModal(false);
                                                                onOpenAddView && onOpenAddView('workout', true, template);
                                                            }}
                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                        >
                                                            <Icon name="Edit" size={16} />
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                if (confirm(`「${template.name}」を削除しますか？`)) {
                                                                    await DataService.deleteWorkoutTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                }
                                                            }}
                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                        >
                                                            <Icon name="Trash2" size={16} />
                                                        </button>
                                                    </div>
                                                </summary>
                                                <div className="mt-3 space-y-3 border-t pt-3">
                                                    {exercises.map((ex, exIdx) => (
                                                        <div key={exIdx} className="bg-white p-2 rounded">
                                                            <p className="font-medium text-xs text-gray-700 mb-2">{ex.exercise?.name || '種目不明'}</p>
                                                            <div className="space-y-1">
                                                                {(ex.sets || []).map((set, idx) => (
                                                                    <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                                                                        <div className="flex justify-between mb-1">
                                                                            <span className="font-medium">セット{idx + 1}</span>
                                                                            <span className="text-gray-600">{Math.round(set.calories || 0)}kcal</span>
                                                                        </div>
                                                                        <div className="text-gray-600 space-x-2">
                                                                            <span>{set.weight}kg</span>
                                                                            <span>×{set.reps}回</span>
                                                                            {set.distance > 0 && <span>| {set.distance}m</span>}
                                                                            <span>| TUT {set.tut}秒</span>
                                                                            <span>| Rest {set.restInterval}秒</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

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

