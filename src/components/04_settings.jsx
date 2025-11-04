import React from 'react';
// ===== Settings Components =====
// TutorialView機能は削除されました（ダミー定義）
const TutorialView = ({ onClose, onComplete }) => {
    return null;
};


// ===== 設定画面 =====
const SettingsView = ({ onClose, userProfile, onUpdateProfile, userId, usageDays, unlockedFeatures, onOpenAddView, darkMode, onToggleDarkMode, shortcuts = [], onUpdateShortcuts, reopenTemplateEditModal = false, reopenTemplateEditType = null, onTemplateEditModalOpened }) => {
    const [profile, setProfile] = useState({...userProfile});

    // 経験値・レベル・クレジット情報
    const [expData, setExpData] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'premium', 'account', 'data', 'advanced'
    const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);

    // クレジット情報state
    const [creditInfo, setCreditInfo] = useState(null);
    const [customMultiplierInputValue, setCustomMultiplierInputValue] = useState('');
    const [infoModal, setInfoModal] = useState({ show: false, title: '', content: '' });
    const [visualGuideModal, setVisualGuideModal] = useState({ show: false, gender: '男性', selectedLevel: 5 });


    // MFA設定state
    const [mfaEnrolled, setMfaEnrolled] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');

    // userProfileが変更されたときにprofile stateを更新
    useEffect(() => {
        setProfile({...userProfile});
    }, [userProfile]);

    // 経験値・レベル・クレジット・リワード情報を取得
    useEffect(() => {
        loadExperienceData();
        // レベルアップイベントをリッスン
        window.addEventListener('levelUp', loadExperienceData);
        return () => window.removeEventListener('levelUp', loadExperienceData);
    }, [userId]);

    const loadExperienceData = async () => {
        if (!userId) return;
        try {
            const data = await ExperienceService.getUserExperience(userId);
            const expToNext = ExperienceService.getExpToNextLevel(data.level, data.experience);
            const milestonesData = await ExperienceService.getMilestones(userId);

            setExpData({
                ...data,
                expCurrent: expToNext.current,
                expRequired: expToNext.required,
                expProgress: Math.round((expToNext.current / expToNext.required) * 100)
            });
            setMilestones(milestonesData);
        } catch (error) {
            console.error('[Settings] Failed to load experience data:', error);
        }
    };

    // MFA登録状況を確認
    useEffect(() => {
        if (userId && typeof MFAService !== 'undefined' && typeof firebase !== 'undefined') {
            try {
                setMfaEnrolled(MFAService.isMFAEnrolled());
            } catch (error) {
                console.error('[Settings] Failed to check MFA enrollment:', error);
                setMfaEnrolled(false);
            }
        }
    }, [userId]);

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
        usePurposeBased: userProfile.usePurposeBased !== false // デフォルトは目的別モード（falseが明示的に設定されている場合のみfalse）
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

    // フィードバック用state
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackSending, setFeedbackSending] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);

    // ヘルプモーダル用state
    const [showHelpModal, setShowHelpModal] = useState(null);

    // テンプレート読み込み
    useEffect(() => {
        loadTemplates();
    }, []);

    // クレジット情報読み込み（新システム）
    useEffect(() => {
        loadCreditInfo();
    }, [userId, userProfile]);

    const loadCreditInfo = async () => {
        try {
            // 新しい経験値システムから取得
            const expInfo = await ExperienceService.getUserExperience(userId);

            // Premium会員かどうかの判定
            const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_MODE;

            setCreditInfo({
                tier: isPremium ? 'premium' : 'free',
                totalCredits: expInfo.totalCredits,
                freeCredits: expInfo.freeCredits,
                paidCredits: expInfo.paidCredits,
                devMode: DEV_MODE
            });
        } catch (error) {
            console.error('[Settings] Error loading credit info:', error);
        }
    };

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

    // 通知設定を更新して自動保存
    const handleNotificationSettingChange = async (newSettings) => {
        const updatedProfile = {
            ...profile,
            notificationSettings: newSettings
        };
        setProfile(updatedProfile);
        // 即座に保存
        onUpdateProfile(updatedProfile);

        // 通知をスケジュール
        try {
            const result = await NotificationService.scheduleNotification(userId, newSettings);
            if (result.success) {
                console.log('[Settings] Notifications scheduled:', result.schedules);
            } else {
                console.error('[Settings] Failed to schedule notifications:', result.error);
            }
        } catch (error) {
            console.error('[Settings] Error scheduling notifications:', error);
        }
    };

    const handleSave = () => {
        // LBM再計算
        const lbm = LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage);
        const fatMass = profile.weight - lbm;
        const bmr = LBMUtils.calculateBMR(lbm, fatMass);
        const tdeeBase = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier, fatMass);

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

    // フィードバック送信
    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) {
            alert('フィードバック内容を入力してください');
            return;
        }

        setFeedbackSending(true);
        try {
            const functions = firebase.app().functions('asia-northeast1');
            const sendFeedback = functions.httpsCallable('sendFeedback');
            await sendFeedback({
                feedback: feedbackText,
                userId: userId,
                userEmail: firebase.auth().currentUser?.email || '未登録',
                timestamp: new Date().toISOString()
            });

            setFeedbackSent(true);
            setFeedbackText('');
            setTimeout(() => setFeedbackSent(false), 3000);
        } catch (error) {
            console.error('[Feedback] Failed to send:', error);
            alert('フィードバックの送信に失敗しました: ' + error.message);
        } finally {
            setFeedbackSending(false);
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

                {/* 設定メニュー）折りたたみ式一覧を*/}
                <div className="p-6 space-y-3">
                    {/* 使い方 */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="BookOpen" size={18} className="text-purple-600" />
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
                                            <p className="text-xs text-gray-600">体重・体脂肪率・目標を入力→LBM自動計算→個別化基準値決定</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ2 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                        <div>
                                            <p className="font-bold text-indigo-900">毎日の記録</p>
                                            <p className="text-xs text-gray-600">食事・トレーニング・サプリを記録→PFC・ビタミン・ミネラル自動集計</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ3 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                        <div>
                                            <p className="font-bold text-indigo-900">達成状況を確認</p>
                                            <p className="text-xs text-gray-600">ダッシュボードで目標値との比較→不足栄養素を特定</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ4 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                                        <div>
                                            <p className="font-bold text-indigo-900">調整・最適化</p>
                                            <p className="text-xs text-gray-600">食事内容を調整→1-12週間サイクルで継続</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-center"><Icon name="ArrowDown" size={20} className="text-indigo-400" /></div>

                                    {/* ステップ5 */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">✓</div>
                                        <div>
                                            <p className="font-bold text-green-900">目標達成</p>
                                            <p className="text-xs text-gray-600">理想の身体へ→65日継続でキープ</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </details>

                    {/* プレミアム */}
                    <details className="border rounded-lg border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                        <summary className="cursor-pointer p-4 hover:bg-purple-100 font-medium flex items-center gap-2">
                            <Icon name="Crown" size={18} className="text-purple-600" />
                            プレミアム
                            {(userProfile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE) && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">Premium会員</span>
                            )}
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t border-purple-200">
                            <div className="space-y-4">
                                {(() => {
                                    const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                    const isTrial = usageDays <= 7;
                                    const daysRemaining = isTrial ? Math.max(0, 8 - usageDays) : 0;

                                    if (isPremium) {
                                        // Premium会員
                                        return (
                                            <div className="bg-white p-4 rounded-lg border border-purple-200">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Icon name="Crown" size={24} className="text-purple-600" />
                                                    <div>
                                                        <p className="font-bold text-gray-800">Premium会員</p>
                                                        <p className="text-sm text-gray-600">すべての機能が利用可能</p>
                                                    </div>
                                                </div>

                                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200 mb-3">
                                                    <p className="text-sm font-medium text-gray-700 mb-1">月額料金</p>
                                                    <p className="text-3xl font-bold text-purple-600">¥740</p>
                                                    <p className="text-xs text-gray-500 mt-1">税込</p>
                                                </div>

                                                <button
                                                    className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300"
                                                    onClick={() => confirm('サブスクリプションを解約しますか？') && alert('解約処理は実装予定！')}
                                                >
                                                    サブスクリプション解約
                                                </button>

                                                {DEV_PREMIUM_MODE && (
                                                    <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                        <p className="text-sm text-yellow-800">
                                                            <Icon name="Code" size={16} className="inline mr-1" />
                                                            開発モード：すべてのPremium機能が有効
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else if (isTrial) {
                                        // 無料トライアル中
                                        return (
                                            <div className="bg-white p-4 rounded-lg border border-blue-200">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Icon name="Gift" size={24} className="text-blue-600" />
                                                    <div>
                                                        <p className="font-bold text-gray-800">無料トライアル中</p>
                                                        <p className="text-sm text-gray-600">残り {daysRemaining} 日</p>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                                                    <p className="text-sm font-medium text-gray-700 mb-1">現在の利用日数</p>
                                                    <p className="text-2xl font-bold text-blue-600">{usageDays} 日目</p>
                                                    <p className="text-xs text-gray-500 mt-1">8日目以降はPremium登録が必要です</p>
                                                </div>

                                                <button
                                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700"
                                                    onClick={() => alert('サブスクリプション画面は実装予定！')}
                                                >
                                                    月額740円でPremium登録
                                                </button>
                                            </div>
                                        );
                                    } else {
                                        // 無料期間終了
                                        return (
                                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Icon name="AlertCircle" size={24} className="text-red-600" />
                                                    <div>
                                                        <p className="font-bold text-gray-800">無料期間終了</p>
                                                        <p className="text-sm text-gray-600">Premium登録で全機能をご利用いただけます</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-3 rounded-lg mb-3">
                                                    <p className="text-sm font-medium text-gray-700 mb-1">現在の利用日数</p>
                                                    <p className="text-2xl font-bold text-red-600">{usageDays} 日目</p>
                                                </div>

                                                <button
                                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700"
                                                    onClick={() => alert('サブスクリプション画面は実装予定！')}
                                                >
                                                    月額740円でPremium登録
                                                </button>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </details>

                    {/* アカウント */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="UserCircle" size={18} className="text-purple-600" />
                            アカウント
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">メールアドレス</label>
                                            <p className="text-sm font-medium text-gray-800">{userProfile.email || '未設定'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">氏名</label>
                                            <p className="text-sm font-medium text-gray-800">{userProfile.displayName || '未設定'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">登録日</label>
                                            <p className="text-sm font-medium text-gray-800">
                                                {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('ja-JP') : '不明'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 経験値・レベル情報 */}
                                {expData && (
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 p-4 rounded-lg">
                                        <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                                            <Icon name="Award" size={14} className="text-purple-600" />
                                            経験値・レベル
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">現在のレベル</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-purple-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                                                        {expData.level}
                                                    </div>
                                                    <span className="font-bold text-purple-600">Level {expData.level}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                                                    <span>次のレベルまで</span>
                                                    <span className="font-semibold">{expData.expCurrent} / {expData.expRequired} XP</span>
                                                </div>
                                                <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(expData.expProgress || 0, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                                                <span className="text-xs text-gray-600">累計経験値</span>
                                                <span className="font-bold text-gray-800">{expData.experience.toLocaleString()} XP</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* クレジット残高 */}
                                {expData && (
                                    <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                                        <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                                            <Icon name="Coins" size={14} className="text-blue-600" />
                                            クレジット残高
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">合計</span>
                                                <span className="text-2xl font-bold text-blue-600">{expData.totalCredits}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
                                                <div className="bg-white p-2 rounded">
                                                    <p className="text-xs text-gray-600 mb-0.5">無料付与</p>
                                                    <p className="font-bold text-green-600">{expData.freeCredits}</p>
                                                </div>
                                                <div className="bg-white p-2 rounded">
                                                    <p className="text-xs text-gray-600 mb-0.5">有料購入</p>
                                                    <p className="font-bold text-purple-600">{expData.paidCredits}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 pt-2">
                                                ※ Gemini API利用1回につきクレジット消費
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* リワード一覧 */}
                                {milestones.length > 0 && (
                                    <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-lg">
                                        <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                                            <Icon name="Trophy" size={14} className="text-yellow-600" />
                                            リワード
                                        </h4>
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {milestones.map((milestone, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center justify-between p-2 rounded ${
                                                        milestone.achieved ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon
                                                            name={milestone.achieved ? "CheckCircle" : "Circle"}
                                                            size={14}
                                                            className={milestone.achieved ? "text-green-600" : "text-gray-400"}
                                                        />
                                                        <span className={`text-xs font-semibold ${milestone.achieved ? 'text-green-800' : 'text-gray-600'}`}>
                                                            Level {milestone.level}
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs font-bold ${milestone.achieved ? 'text-green-700' : 'text-gray-500'}`}>
                                                        +{milestone.reward} クレジット
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* パスワードリセット */}
                                <div className="border-l-4 border-purple-500 pl-4">
                                    <h4 className="font-bold text-sm text-purple-900 mb-2">パスワード</h4>
                                    <button
                                        onClick={async () => {
                                            const email = userProfile.email;
                                            if (email) {
                                                try {
                                                    await firebase.auth().sendPasswordResetEmail(email);
                                                    alert('パスワードリセットメールを送信しました。メールをご確認ください。');
                                                } catch (error) {
                                                    alert('エラー: ' + error.message);
                                                }
                                            } else {
                                                alert('メールアドレスが設定されていません');
                                            }
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                                    >
                                        パスワードをリセット
                                    </button>
                                </div>

                                {/* 2段階認証 */}
                                <div className="border-l-4 border-purple-500 pl-4">
                                    <h4 className="font-bold text-sm text-purple-900 mb-2 flex items-center gap-2">
                                        <Icon name="Shield" size={16} />
                                        2段階認証（2FA）
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        2段階認証を有効にすると、ログイン時にSMSで認証コードが送信され、アカウントのセキュリティが強化されます。
                                    </p>

                                    {mfaEnrolled ? (
                                        <div className="space-y-3">
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2 text-green-700">
                                                    <Icon name="CheckCircle" size={16} />
                                                    <span className="text-sm font-medium">SMS認証が設定されています</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={async () => {
                                                    if (confirm('2FAを解除しますか？セキュリティが低下します。')) {
                                                        const result = await MFAService.unenrollMFA();
                                                        if (result.success) {
                                                            setMfaEnrolled(false);
                                                            alert('2FAを解除しました');
                                                        } else {
                                                            alert('エラー: ' + result.error);
                                                        }
                                                    }
                                                }}
                                                className="text-sm text-red-600 hover:text-red-700 underline"
                                            >
                                                2FAを解除
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-xs text-blue-700">
                                                    ※ SMS送信料金が発生する場合があります（月50通まで無料）
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => setShow2FASetup(true)}
                                                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                                            >
                                                <Icon name="Shield" size={14} />
                                                2FAを設定する
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* アカウント削除 */}
                                <div className="border-l-4 border-red-500 pl-4">
                                    <h4 className="font-bold text-sm text-red-900 mb-2">アカウント削除</h4>
                                    <p className="text-xs text-gray-600 mb-3">
                                        アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。
                                    </p>
                                    <button
                                        onClick={async () => {
                                            if (confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
                                                if (confirm('すべてのデータが完全に削除されます。本当によろしいですか？')) {
                                                    try {
                                                        const user = firebase.auth().currentUser;
                                                        if (user) {
                                                            // 先に再認証を実行（Google認証の場合）
                                                            try {
                                                                console.log('[Account Delete] Re-authenticating user...');
                                                                const provider = new firebase.auth.GoogleAuthProvider();
                                                                await user.reauthenticateWithPopup(provider);
                                                                console.log('[Account Delete] Re-authentication successful');
                                                            } catch (reauthError) {
                                                                console.error('[Account Delete] Re-authentication failed:', reauthError);
                                                                if (reauthError.code === 'auth/popup-closed-by-user') {
                                                                    alert('再認証がキャンセルされました。アカウント削除を中止します。');
                                                                    return;
                                                                }
                                                                // 再認証エラーでも続行を試みる
                                                            }

                                                            // Firestoreユーザーデータを削除
                                                            try {
                                                                await firebase.firestore().collection('users').doc(user.uid).delete();
                                                                console.log('[Account Delete] Firestore user data deleted');
                                                            } catch (firestoreError) {
                                                                console.warn('[Account Delete] Firestore deletion failed:', firestoreError);
                                                                // Firestoreエラーは無視して続行
                                                            }

                                                            // Firebase認証アカウントを削除
                                                            try {
                                                                await user.delete();
                                                                console.log('[Account Delete] Firebase auth account deleted');
                                                            } catch (authError) {
                                                                if (authError.code === 'auth/requires-recent-login') {
                                                                    // それでも再認証が必要な場合
                                                                    console.log('[Account Delete] Still requires re-authentication');
                                                                    localStorage.clear();
                                                                    await firebase.auth().signOut();
                                                                    alert('再認証に失敗しました。ログアウトして再度ログイン後、アカウント削除を実行してください。');
                                                                    window.location.reload();
                                                                    return;
                                                                }
                                                                throw authError;
                                                            }

                                                            // すべて成功したら、LocalStorageをクリア
                                                            console.log('[Account Delete] Clearing all localStorage data');
                                                            localStorage.clear();
                                                            alert('アカウントを削除しました');
                                                            // ページをリロードして状態をリセット
                                                            window.location.reload();
                                                        }
                                                    } catch (error) {
                                                        console.error('[Account Delete] Error:', error);
                                                        alert('アカウント削除中にエラーが発生しました: ' + error.message);
                                                    }
                                                }
                                            }
                                        }}
                                        className="text-sm text-red-600 hover:text-red-700 underline"
                                    >
                                        アカウントを削除
                                    </button>
                                </div>

                                <button
                                    className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700"
                                    onClick={() => {
                                        if (confirm('本当にログアウトしますか？')) {
                                            // LocalStorageをクリア（オンボーディング状態や機能開放状態をリセット）
                                            console.log('[Logout] Clearing all localStorage data');
                                            localStorage.clear();
                                            // ログアウト実行
                                            auth.signOut();
                                        }
                                    }}
                                >
                                    ログアウト
                                </button>
                            </div>
                        </div>
                    </details>

                    {/* プロフィール */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="User" size={18} className="text-purple-600" />
                            プロフィール
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 border-t">
                            {/* プロフィール入力 */}
                            <div className="space-y-3 max-h-[70vh] overflow-y-auto pb-4">

                                    {/* 計算ロジック解説 */}
                                    <details className="bg-blue-50 border-2 border-blue-200 rounded-lg mb-4">
                                        <summary className="cursor-pointer p-3 hover:bg-blue-100 font-medium flex items-center gap-2 text-blue-800">
                                            <Icon name="Info" size={18} className="text-blue-600" />
                                            <span className="text-sm">計算ロジック解説（全フロー）</span>
                                            <Icon name="ChevronDown" size={16} className="ml-auto text-blue-400" />
                                        </summary>
                                        <div className="p-4 pt-2 border-t border-blue-200 text-sm text-gray-700 space-y-4">
                                            {/* BMR計算 */}
                                            <div>
                                                <h5 className="font-bold text-blue-700 mb-2 flex items-center gap-1">
                                                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                                                    基礎代謝量（BMR）
                                                </h5>
                                                <div className="pl-6 space-y-1 text-xs">
                                                    <p className="font-medium text-gray-800">【計算式】Katch-McArdle式 + 脂肪組織代謝</p>
                                                    <p className="text-gray-600">BMR = (370 + 21.6 × 除脂肪体重) + (脂肪量 × 4.5)</p>
                                                    <p className="text-gray-500 mt-1">
                                                        • 除脂肪体重（LBM）= 体重 × (1 - 体脂肪率 ÷ 100)<br/>
                                                        • 脂肪量 = 体重 - 除脂肪体重<br/>
                                                        • 脂肪組織も1日4.5kcal/kgのエネルギーを消費します
                                                    </p>
                                                </div>
                                            </div>

                                            {/* TDEE計算 */}
                                            <div>
                                                <h5 className="font-bold text-green-700 mb-2 flex items-center gap-1">
                                                    <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                                                    1日の総消費カロリー（TDEE）
                                                </h5>
                                                <div className="pl-6 space-y-1 text-xs">
                                                    <p className="font-medium text-gray-800">【計算式】TDEE = BMR × 活動レベル係数</p>
                                                    <p className="text-gray-500 mt-1">
                                                        • レベル1（1.05）: ほぼ運動なし<br/>
                                                        • レベル2（1.225）: 週1-2回の軽い運動<br/>
                                                        • レベル3（1.4）: 週3-4回の運動<br/>
                                                        • レベル4（1.575）: 週5-6回の運動<br/>
                                                        • レベル5（1.75）: 毎日の激しい運動<br/>
                                                        • カスタム: 独自の係数を直接入力可能
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 目標摂取カロリー */}
                                            <div>
                                                <h5 className="font-bold text-orange-700 mb-2 flex items-center gap-1">
                                                    <span className="bg-orange-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                                                    目標摂取カロリー
                                                </h5>
                                                <div className="pl-6 space-y-1 text-xs">
                                                    <p className="font-medium text-gray-800">【計算式】目標摂取カロリー = TDEE + カロリー調整値</p>
                                                    <p className="text-gray-500 mt-1">
                                                        • メンテナンス: +0kcal（現状維持）<br/>
                                                        • ダイエット: -300kcal（減量）<br/>
                                                        • バルクアップ: +300kcal（増量）<br/>
                                                        • リコンプ: +0kcal（体組成改善、トレーニングが重要）<br/>
                                                        • カスタム: 独自の調整値を入力可能（推奨範囲：±300kcal）
                                                    </p>
                                                </div>
                                            </div>

                                            {/* PFCバランス */}
                                            <div>
                                                <h5 className="font-bold text-purple-700 mb-2 flex items-center gap-1">
                                                    <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                                                    PFCバランス（タンパク質・脂質・炭水化物）
                                                </h5>
                                                <div className="pl-6 space-y-2 text-xs">
                                                    <div>
                                                        <p className="font-medium text-gray-800">【目的別モード】</p>
                                                        <p className="text-gray-600">スタイル・目的・食事スタイルに応じて自動計算</p>
                                                        <p className="text-gray-500 mt-1">
                                                            • タンパク質 = 除脂肪体重 × 係数（一般:1.2、ボディメイカー:2.2 ※目的に関わらず固定）<br/>
                                                            • 脂質 = 目標カロリー × 0.25（バランス）or × 0.35（低糖質）<br/>
                                                            • 炭水化物 = 残りのカロリーを炭水化物で充当
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800">【カスタムモード】</p>
                                                        <p className="text-gray-600">カロリー比率を直接指定（例: P30% F25% C45%）</p>
                                                        <p className="text-gray-500 mt-1">
                                                            • タンパク質 = 目標カロリー × P% ÷ 4kcal/g<br/>
                                                            • 脂質 = 目標カロリー × F% ÷ 9kcal/g<br/>
                                                            • 炭水化物 = 目標カロリー × C% ÷ 4kcal/g
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-blue-100 p-3 rounded border border-blue-300 text-xs text-blue-800">
                                                <p className="font-bold mb-1">💡 ポイント</p>
                                                <p>各STEPで設定を変更すると、リアルタイムで目標値が再計算されます。設定完了後、必ず「保存」ボタンをクリックしてください。</p>
                                            </div>
                                        </div>
                                    </details>

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
                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">理想の睡眠時間</label>
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

                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">理想の体重 (kg)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={profile.idealWeight || ''}
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
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1.5">理想の体脂肪率(%)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={profile.idealBodyFatPercentage || ''}
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
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                />
                                            </div>

                                            {profile.idealLBM && (
                                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-300">
                                                    <p className="text-xs font-medium text-purple-700">理想のLBMを自動計算！</p>
                                                    <p className="text-lg font-bold text-purple-900 mt-1">
                                                        {profile.idealLBM.toFixed(1)} kg
                                                    </p>
                                                    <p className="text-xs text-purple-600 mt-1">
                                                        現在より {(profile.idealLBM - (profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15))).toFixed(1)} kg
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* STEP 2: 活動量 */}
                                    <div className="border-l-4 border-green-500 pl-4">
                                        <h4 className="text-xs font-bold text-green-700 mb-2">STEP 2: 活動量</h4>
                                        <label className="block text-sm font-medium mb-1.5">
                                            活動レベル
                                        </label>
                                        {!profile.customActivityMultiplier && (
                                            <select
                                                value={profile.activityLevel}
                                                onChange={(e) => setProfile({...profile, activityLevel: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                disabled={profile.customActivityMultiplier}
                                            >
                                                <option value={1}>デスクワーク中心- 1.05x</option>
                                                <option value={2}>立ち仕事が多い - 1.225x</option>
                                                <option value={3}>軽い体労働 - 1.4x</option>
                                                <option value={4}>重い肉体労働- 1.575x</option>
                                                <option value={5}>非常に激しい肉体労働- 1.75x</option>
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
                                                <label className="block text-sm font-medium">係数を入力(1.0〜2.5)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1.0"
                                                    max="2.5"
                                                    value={customMultiplierInputValue}
                                                    onChange={(e) => setCustomMultiplierInputValue(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                    placeholder="例 1.45"
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
                                                        設定                                                    </button>
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

                                    {/* STEP 3: 目的別カロリー設定*/}
                                    <div className="border-l-4 border-orange-500 pl-4">
                                        <h4 className="text-xs font-bold text-orange-700 mb-2">STEP 3: 目的別カロリー設定</h4>
                                        <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                                            目的                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: '目的別設定',
                                                    content: `あなたのボディメイクの目的を選択してください。
目的に応じて推奨カロリーとPFCバランスが自動調整されます。

※ 表示されるカロリーとタンパク質係数は、
あなたのスタイル（一般/ボディメイカー）と
体組成データに基づいて自動計算されます。

【ダイエット（脂肪を落とす）】
• 目標：体脂肪を減らし、引き締まった体を作る
• メンテナンスカロリー：${(() => {
    const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage || 15);
    const fatMass = profile.weight - lbm;
    return Math.round(LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier, fatMass) - 300);
})()}kcal
• タンパク質：LBM × ${profile.style === 'ボディメイカー' ? '2.2' : '1.2'}
• 推奨ペース：週0.5〜0.7kg減

【メンテナンス（現状維持）】
• 目標：現在の体重・体組成を維持
• メンテナンスカロリー：${(() => {
    const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage || 15);
    const fatMass = profile.weight - lbm;
    return Math.round(LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier, fatMass));
})()}kcal
• バランス型の栄養配分
• 健康的生活習慣の維持

【バルクアップ（筋肉をつける）】
• 目標：筋肉量を増やし、体を大きくする
• メンテナンスカロリー：${(() => {
    const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage || 15);
    const fatMass = profile.weight - lbm;
    return Math.round(LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier, fatMass) + 300);
})()}kcal
• タンパク質：LBM × ${profile.style === 'ボディメイカー' ? '2.2' : '1.2'}
• 炭水化物：多め（筋肉合成のエネルギー）
• 推奨ペース：週0.5kg増

【リコンプ（体組成改善）】
• 目標：脂肪を落としながら筋肉をつける
• メンテナンスカロリー：${(() => {
    const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage || 15);
    const fatMass = profile.weight - lbm;
    return Math.round(LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier, fatMass));
})()}kcal
• タンパク質：LBM × ${profile.style === 'ボディメイカー' ? '2.2' : '1.2'}
• トレーニング強度が最重要

目的はいつでも変更できます。`
                                                })}
                                                className="text-indigo-600 hover:text-indigo-800"
                                            >
                                                <Icon name="Info" size={14} />
                                            </button>
                                        </label>

                                        {/* 目的選択（ボタン、縦並び）*/}
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
                                                    <span>カロリー調整値kcal/日</span>
                                                    <span className="text-xs text-gray-500 font-normal mt-0.5">メンテナンスから±調整</span>
                                                </div>
                                            </label>
                                            <input
                                                type="number"
                                                step="50"
                                                value={profile.calorieAdjustment !== undefined && profile.calorieAdjustment !== null ? profile.calorieAdjustment : ''}
                                                onChange={(e) => {
                                                    const value = e.target.value === '' ? null : Number(e.target.value);
                                                    setProfile({...profile, calorieAdjustment: value});
                                                }}
                                                className="w-full px-3 py-2 border rounded-lg"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* STEP 4: PFCバランス設定*/}
                                    <div className="border-l-4 border-purple-500 pl-4">
                                        <h4 className="text-xs font-bold text-purple-700 mb-2">STEP 4: PFCバランス設定</h4>

                                        {/* スタイル選択*/}
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium mb-1.5">
                                                トレーニングスタイル
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setProfile({...profile, style: '一般'})}
                                                    className={`p-4 rounded-lg border-2 transition ${
                                                        profile.style === '一般'
                                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                                            : 'border-gray-200 bg-white hover:border-blue-300'
                                                    }`}
                                                >
                                                    <div className="font-bold text-base mb-1">一般</div>
                                                    <div className="text-xs text-gray-600">健康維持・日常フィットネス</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setProfile({...profile, style: 'ボディメイカー'})}
                                                    className={`p-4 rounded-lg border-2 transition ${
                                                        profile.style === 'ボディメイカー'
                                                            ? 'border-purple-500 bg-purple-50 shadow-md'
                                                            : 'border-gray-200 bg-white hover:border-purple-300'
                                                    }`}
                                                >
                                                    <div className="font-bold text-base mb-1">ボディメイカー</div>
                                                    <div className="text-xs text-gray-600">本格的な筋トレ・競技力向上</div>
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                ※ボディメイカーはタンパク質の推奨量が一般の約1.8倍<br/>
                                                （一般 LBM×1.2、ボディメイカー LBM×2.2）、<br/>
                                                ビタミン・ミネラルの推奨量が2倍になります
                                            </p>
                                        </div>

                                        <label className="block text-sm font-medium mb-1.5">
                                            PFCバランス（目標比率）
                                        </label>

                                        {/* モード選択*/}
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

                                        {/* カスタム比率設定（カスタムモード時のみ表示を*/}
                                        {advancedSettings.usePurposeBased === false && (
                                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                            {/* タンパク質 */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-green-700">タンパク質 (P)</span>
                                                    <span className="text-sm font-bold">
                                                        {advancedSettings.proteinRatio || 30}%
                                                        {(() => {
                                                            const targetCalories = (profile.tdeeBase || 2200) + (profile.calorieAdjustment || 0);
                                                            const proteinG = Math.round((targetCalories * (advancedSettings.proteinRatio || 30) / 100) / 4);
                                                            return ` (${proteinG}g)`;
                                                        })()}
                                                    </span>
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
                                                    <span className="text-sm font-bold">
                                                        {advancedSettings.fatRatioPercent || 25}%
                                                        {(() => {
                                                            const targetCalories = (profile.tdeeBase || 2200) + (profile.calorieAdjustment || 0);
                                                            const fatG = Math.round((targetCalories * (advancedSettings.fatRatioPercent || 25) / 100) / 9);
                                                            return ` (${fatG}g)`;
                                                        })()}
                                                    </span>
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
                                                    <span className="text-sm font-bold">
                                                        {advancedSettings.carbRatio || 45}%
                                                        {(() => {
                                                            const targetCalories = (profile.tdeeBase || 2200) + (profile.calorieAdjustment || 0);
                                                            const carbG = Math.round((targetCalories * (advancedSettings.carbRatio || 45) / 100) / 4);
                                                            return ` (${carbG}g)`;
                                                        })()}
                                                    </span>
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
                                                合計 {(advancedSettings.proteinRatio || 30) + (advancedSettings.fatRatioPercent || 25) + (advancedSettings.carbRatio || 45)}%
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
                    {/* ショートカット - 初回分析後に開放 */}
                    {unlockedFeatures.includes('shortcut') && (
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Zap" size={18} className="text-purple-600" />
                            ショートカット
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            <p className="text-sm text-gray-600 mb-4">画面左右のショートカットボタンをカスタマイズできます。各項目の表示位置と項目を変更できます。</p>

                            {/* 表示/非表示分析切替*/}
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
                    )}

                    {/* テンプレート - 初回分析後に開放 */}
                    {unlockedFeatures.includes('template') && (
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="BookTemplate" size={18} className="text-purple-600" />
                            テンプレート                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">保存したテンプレートを管理できます。ルーティンに紐づけて使用することも可能です。</p>

                            {/* 食事テンプレート*/}
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

                            {/* 運動テンプレート*/}
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
                    )}

                    {/* ルーティン - 初回分析後に開放 */}
                    {false && (
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Package" size={18} className="text-blue-600" />
                            旧カスタムアイテム管理（削除予定）
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">手動で作成した食材・料理・サプリを管理できます。</p>

                                {(() => {
                                    const [customItemTab, setCustomItemTab] = React.useState('food');
                                    const [customFoods, setCustomFoods] = React.useState(() => {
                                        const saved = localStorage.getItem('customFoods');
                                        return saved ? JSON.parse(saved) : [];
                                    });

                                    const foodItems = customFoods.filter(item => item.itemType === 'food');
                                    const recipeItems = customFoods.filter(item => item.itemType === 'recipe');
                                    const supplementItems = customFoods.filter(item => item.itemType === 'supplement');

                                    const deleteItem = (index) => {
                                        if (confirm('このアイテムを削除しますか？')) {
                                            const updated = customFoods.filter((_, i) => i !== index);
                                            setCustomFoods(updated);
                                            localStorage.setItem('customFoods', JSON.stringify(updated));
                                        }
                                    };

                                    const deleteAllByType = (itemType) => {
                                        const typeName = itemType === 'food' ? '食材' : itemType === 'recipe' ? '料理' : 'サプリ';
                                        if (confirm(`すべての${typeName}を削除しますか？`)) {
                                            const updated = customFoods.filter(item => item.itemType !== itemType);
                                            setCustomFoods(updated);
                                            localStorage.setItem('customFoods', JSON.stringify(updated));
                                        }
                                    };

                                    const editItem = (item, index) => {
                                        // TODO: Open edit modal with the same form as custom creation
                                        alert('編集機能は次の更新で実装予定です');
                                    };

                                    return (
                                        <>
                                            {/* タブ切り替え */}
                                            <div className="flex gap-2 border-b">
                                                <button
                                                    onClick={() => setCustomItemTab('food')}
                                                    className={`px-4 py-2 font-medium transition ${
                                                        customItemTab === 'food'
                                                            ? 'border-b-2 border-green-600 text-green-600'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    食材 ({foodItems.length})
                                                </button>
                                                <button
                                                    onClick={() => setCustomItemTab('recipe')}
                                                    className={`px-4 py-2 font-medium transition ${
                                                        customItemTab === 'recipe'
                                                            ? 'border-b-2 border-green-600 text-green-600'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    料理 ({recipeItems.length})
                                                </button>
                                                <button
                                                    onClick={() => setCustomItemTab('supplement')}
                                                    className={`px-4 py-2 font-medium transition ${
                                                        customItemTab === 'supplement'
                                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    サプリ ({supplementItems.length})
                                                </button>
                                            </div>

                                            {/* アイテム一覧 */}
                                            <div className="space-y-2">
                                                {customItemTab === 'food' && (
                                                    <>
                                                        {foodItems.length === 0 ? (
                                                            <p className="text-sm text-gray-500 py-4 text-center">カスタム食材はありません</p>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-end mb-2">
                                                                    <button
                                                                        onClick={() => deleteAllByType('food')}
                                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                                    >
                                                                        すべて削除
                                                                    </button>
                                                                </div>
                                                                {foodItems.map((item, idx) => {
                                                                    const actualIndex = customFoods.findIndex(f => f === item);
                                                                    return (
                                                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                                                            <div className="flex-1">
                                                                                <p className="font-medium text-sm">{item.name}</p>
                                                                                <p className="text-xs text-gray-600">
                                                                                    {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    onClick={() => editItem(item, actualIndex)}
                                                                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                                >
                                                                                    <Icon name="Edit" size={16} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => deleteItem(actualIndex)}
                                                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                                >
                                                                                    <Icon name="Trash2" size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </>
                                                )}

                                                {customItemTab === 'recipe' && (
                                                    <>
                                                        {recipeItems.length === 0 ? (
                                                            <p className="text-sm text-gray-500 py-4 text-center">カスタム料理はありません</p>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-end mb-2">
                                                                    <button
                                                                        onClick={() => deleteAllByType('recipe')}
                                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                                    >
                                                                        すべて削除
                                                                    </button>
                                                                </div>
                                                                {recipeItems.map((item, idx) => {
                                                                    const actualIndex = customFoods.findIndex(f => f === item);
                                                                    return (
                                                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                                                            <div className="flex-1">
                                                                                <p className="font-medium text-sm">{item.name}</p>
                                                                                <p className="text-xs text-gray-600">
                                                                                    {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    onClick={() => editItem(item, actualIndex)}
                                                                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                                >
                                                                                    <Icon name="Edit" size={16} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => deleteItem(actualIndex)}
                                                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                                >
                                                                                    <Icon name="Trash2" size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </>
                                                )}

                                                {customItemTab === 'supplement' && (
                                                    <>
                                                        {supplementItems.length === 0 ? (
                                                            <p className="text-sm text-gray-500 py-4 text-center">カスタムサプリはありません</p>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-end mb-2">
                                                                    <button
                                                                        onClick={() => deleteAllByType('supplement')}
                                                                        className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                                    >
                                                                        すべて削除
                                                                    </button>
                                                                </div>
                                                                {supplementItems.map((item, idx) => {
                                                                    const actualIndex = customFoods.findIndex(f => f === item);
                                                                    return (
                                                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                                                            <div className="flex-1">
                                                                                <p className="font-medium text-sm">{item.name}</p>
                                                                                <p className="text-xs text-gray-600">
                                                                                    {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                    onClick={() => editItem(item, actualIndex)}
                                                                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                                >
                                                                                    <Icon name="Edit" size={16} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => deleteItem(actualIndex)}
                                                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                                >
                                                                                    <Icon name="Trash2" size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </details>
                    )}

                    {/* ルーティン - 初回分析後に開放 */}
                    {unlockedFeatures.includes('routine') && (
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Repeat" size={18} className="text-purple-600" />
                            ルーティン
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            {/* ルーティン作成 */}
                            <div className="space-y-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h4 className="font-bold text-purple-900 mb-2">ルーティン管理</h4>
                                <p className="text-sm text-purple-700">
                                    Day1~7のデフォルトルーティンと、最大5つまで追加可能な追加枠を設定できます。                                </p>
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
                                                                休養日
                                                            </label>
                                                        </div>
                                                        {!routine.isRestDay && (
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <label className="font-medium text-sm">分類</label>
                                                                    <select
                                                                        value={routine.splitType}
                                                                        onChange={(e) => {
                                                                            if (e.target.value === '__custom__') {
                                                                                const custom = prompt('分割法を入力してください（例：胸・三頭・肩）', routine.splitType);
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
                                                                        <option value="胸">胸</option>
                                                                        <option value="肩">肩</option>
                                                                        <option value="背">背</option>
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
                                                                        <option value="__custom__">✏️ カスタム入力..</option>
                                                                    </select>
                                                                </div>

                                                                {/* テンプレート紐づけ*/}
                                                                <details className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                    <summary className="font-medium text-sm text-yellow-900 cursor-pointer flex items-center gap-2 hover:text-yellow-700">
                                                                        <Icon name="BookTemplate" size={14} />
                                                                        テンプレート紐づけ（複数選択可）
                                                                        <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                                    </summary>
                                                                    <div className="space-y-3 mt-3">
                                                                        {/* 食事テンプレート（複数選択）*/}
                                                                        <div>
                                                                            <label className="text-xs font-medium text-gray-700">食事テンプレート</label>
                                                                            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                                                                {mealTemplates.length > 0 ? mealTemplates.map(t => (
                                                                                    <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-yellow-100 rounded cursor-pointer">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={(routine.mealTemplates || []).includes(t.id)}
                                                                                            onChange={(e) => {
                                                                                                const current = routine.mealTemplates || [];
                                                                                                const updated = e.target.checked
                                                                                                    ? [...current, t.id]
                                                                                                    : current.filter(id => id !== t.id);
                                                                                                updateRoutine(routine.id, { mealTemplates: updated });
                                                                                            }}
                                                                                            className="rounded"
                                                                                        />
                                                                                        <span className="text-sm">{t.name}</span>
                                                                                    </label>
                                                                                )) : (
                                                                                    <p className="text-xs text-gray-500">食事テンプレートがありません</p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* トレーニングテンプレート（複数選択）*/}
                                                                        <div>
                                                                            <label className="text-xs font-medium text-gray-700">トレーニングテンプレート</label>
                                                                            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                                                                {workoutTemplates.length > 0 ? workoutTemplates.map(t => (
                                                                                    <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-yellow-100 rounded cursor-pointer">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={(routine.workoutTemplates || []).includes(t.id)}
                                                                                            onChange={(e) => {
                                                                                                const current = routine.workoutTemplates || [];
                                                                                                const updated = e.target.checked
                                                                                                    ? [...current, t.id]
                                                                                                    : current.filter(id => id !== t.id);
                                                                                                updateRoutine(routine.id, { workoutTemplates: updated });
                                                                                            }}
                                                                                            className="rounded"
                                                                                        />
                                                                                        <span className="text-sm">{t.name}</span>
                                                                                    </label>
                                                                                )) : (
                                                                                    <p className="text-xs text-gray-500">トレーニングテンプレートがありません</p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                    </div>
                                                                    <p className="text-xs text-yellow-700 mt-2">
                                                                        ✨ 選択した複数のテンプレートが「ルーティン入力」ボタンで一括追加されます
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
                                                                    休養日
                                                                </label>
                                                            </div>
                                                            {!routine.isRestDay && (
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="font-medium text-sm">分類</label>
                                                                        <select
                                                                            value={routine.splitType}
                                                                            onChange={(e) => {
                                                                                if (e.target.value === '__custom__') {
                                                                                    const custom = prompt('分割法を入力してください（例：胸・三頭・肩）', routine.splitType);
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
                                                                            <option value="胸">胸</option>
                                                                            <option value="肩">肩</option>
                                                                            <option value="背">背</option>
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
                                                                            <option value="__custom__">✏️ カスタム入力..</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* テンプレート紐づけ（複数選択）*/}
                                                                    <details className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                        <summary className="font-medium text-sm text-yellow-900 cursor-pointer flex items-center gap-2 hover:text-yellow-700">
                                                                            <Icon name="BookTemplate" size={14} />
                                                                            テンプレート紐づけ（複数選択可）
                                                                            <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                                        </summary>
                                                                        <div className="space-y-3 mt-3">
                                                                            {/* 食事テンプレート（複数選択）*/}
                                                                            <div>
                                                                                <label className="text-xs font-medium text-gray-700">食事テンプレート</label>
                                                                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                                                                    {mealTemplates.length > 0 ? mealTemplates.map(t => (
                                                                                        <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-yellow-100 rounded cursor-pointer">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={(routine.mealTemplates || []).includes(t.id)}
                                                                                                onChange={(e) => {
                                                                                                    const current = routine.mealTemplates || [];
                                                                                                    const updated = e.target.checked
                                                                                                        ? [...current, t.id]
                                                                                                        : current.filter(id => id !== t.id);
                                                                                                    updateRoutine(routine.id, { mealTemplates: updated });
                                                                                                }}
                                                                                                className="rounded"
                                                                                            />
                                                                                            <span className="text-sm">{t.name}</span>
                                                                                        </label>
                                                                                    )) : (
                                                                                        <p className="text-xs text-gray-500">食事テンプレートがありません</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* トレーニングテンプレート（複数選択）*/}
                                                                            <div>
                                                                                <label className="text-xs font-medium text-gray-700">トレーニングテンプレート</label>
                                                                                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                                                                    {workoutTemplates.length > 0 ? workoutTemplates.map(t => (
                                                                                        <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-yellow-100 rounded cursor-pointer">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={(routine.workoutTemplates || []).includes(t.id)}
                                                                                                onChange={(e) => {
                                                                                                    const current = routine.workoutTemplates || [];
                                                                                                    const updated = e.target.checked
                                                                                                        ? [...current, t.id]
                                                                                                        : current.filter(id => id !== t.id);
                                                                                                    updateRoutine(routine.id, { workoutTemplates: updated });
                                                                                                }}
                                                                                                className="rounded"
                                                                                            />
                                                                                            <span className="text-sm">{t.name}</span>
                                                                                        </label>
                                                                                    )) : (
                                                                                        <p className="text-xs text-gray-500">トレーニングテンプレートがありません</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                        </div>
                                                                        <p className="text-xs text-yellow-700 mt-2">
                                                                            ✨ 選択した複数のテンプレートが「ルーティン入力」ボタンで一括追加されます
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
                                                追加枠を追加 ({localRoutines.length - 7}/5)
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
                                                    デフォルトルーティンで始める                                                </button>
                                            </div>
                                        )}

                                        {/* 管理用ボタン */}
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
                    )}

                    {/* 通知設定*/}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Bell" size={18} className="text-indigo-600" />
                            通知設定                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t space-y-4">
                            {/* 通知権限設定 */}
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Bell" size={18} className="text-blue-600" />
                                    <h4 className="font-bold text-sm text-blue-900">Push通知設定</h4>
                                </div>

                                {/* 権限ステータス */}
                                <div className="bg-white rounded-lg p-3 border border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-medium text-gray-700 mb-1">通知権限</div>
                                            <div className="text-sm font-bold">
                                                {NotificationService.checkPermission() === 'granted' && (
                                                    <span className="text-green-600 flex items-center gap-1">
                                                        <Icon name="CheckCircle" size={16} />
                                                        許可済み
                                                    </span>
                                                )}
                                                {NotificationService.checkPermission() === 'denied' && (
                                                    <span className="text-red-600 flex items-center gap-1">
                                                        <Icon name="XCircle" size={16} />
                                                        拒否
                                                    </span>
                                                )}
                                                {NotificationService.checkPermission() === 'default' && (
                                                    <span className="text-gray-600 flex items-center gap-1">
                                                        <Icon name="AlertCircle" size={16} />
                                                        未設定
                                                    </span>
                                                )}
                                                {NotificationService.checkPermission() === 'unsupported' && (
                                                    <span className="text-gray-600 flex items-center gap-1">
                                                        <Icon name="AlertCircle" size={16} />
                                                        非対応
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const result = await NotificationService.requestPermission();
                                                if (result.success) {
                                                    alert('通知権限が許可されました！');
                                                    // FCMトークンも取得
                                                    const tokenResult = await NotificationService.getFCMToken(userId);
                                                    if (tokenResult.success) {
                                                        console.log('FCM Token obtained:', tokenResult.token);
                                                    }
                                                } else {
                                                    alert('通知権限が拒否されました。ブラウザの設定から許可してください。');
                                                }
                                                // 再レンダリングのため状態を更新
                                                setProfile({...profile});
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                            disabled={NotificationService.checkPermission() === 'granted'}
                                        >
                                            {NotificationService.checkPermission() === 'granted' ? '設定済み' : '権限を許可'}
                                        </button>
                                    </div>
                                </div>

                                {/* 説明 */}
                                <div className="text-xs text-gray-700 bg-white rounded p-2 border border-blue-100">
                                    <p className="mb-1">📱 <strong>Push通知を有効にする</strong></p>
                                    <p>食事時間、運動時間、記録リマインダーなどを通知で受け取れます。</p>
                                    <p className="mt-1 text-gray-600">※ 通知を受け取るには、まず「権限を許可」ボタンをクリックしてください。</p>
                                </div>
                            </div>

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
                                        onChange={(e) => handleNotificationSettingChange({
                                            ...(profile.notificationSettings || {}),
                                            routineTime: e.target.value
                                        })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                        disabled={profile.notificationSettings?.routine === false}
                                    />
                                </div>
                            </div>

                            {/* 記録リマインダー*/}
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
                                        onChange={(e) => handleNotificationSettingChange({
                                            ...(profile.notificationSettings || {}),
                                            recordReminderTime: e.target.value
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
                                        onChange={(e) => handleNotificationSettingChange({
                                            ...(profile.notificationSettings || {}),
                                            summaryTime: e.target.value
                                        })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                        disabled={profile.notificationSettings?.summary === false}
                                    />
                                </div>
                            </div>

                            {/* 食事通知（複数時間枠） */}
                            <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={profile.notificationSettings?.meal !== false}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notificationSettings: {
                                                    ...(profile.notificationSettings || {}),
                                                    meal: e.target.checked
                                                }
                                            })}
                                            className="rounded"
                                        />
                                        <div>
                                            <div className="font-medium text-sm">食事通知</div>
                                            <div className="text-xs text-gray-600">食事時間をリマインド（複数設定可能）</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-6 space-y-2">
                                    <label className="block text-xs font-medium mb-1">通知時刻（複数設定可）</label>
                                    {(profile.notificationSettings?.mealTimes || ['07:00', '12:00', '19:00']).map((time, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={(e) => {
                                                    const newTimes = [...(profile.notificationSettings?.mealTimes || ['07:00', '12:00', '19:00'])];
                                                    newTimes[index] = e.target.value;
                                                    handleNotificationSettingChange({
                                                        ...(profile.notificationSettings || {}),
                                                        mealTimes: newTimes
                                                    });
                                                }}
                                                className="px-3 py-2 border rounded-lg text-sm flex-1"
                                                disabled={profile.notificationSettings?.meal === false}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentTimes = profile.notificationSettings?.mealTimes || ['07:00', '12:00', '19:00'];
                                                    if (currentTimes.length > 1) {
                                                        const newTimes = currentTimes.filter((_, i) => i !== index);
                                                        handleNotificationSettingChange({
                                                            ...(profile.notificationSettings || {}),
                                                            mealTimes: newTimes
                                                        });
                                                    }
                                                }}
                                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                                disabled={profile.notificationSettings?.meal === false || (profile.notificationSettings?.mealTimes || ['07:00', '12:00', '19:00']).length <= 1}
                                            >
                                                <Icon name="X" size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const currentTimes = profile.notificationSettings?.mealTimes || ['07:00', '12:00', '19:00'];
                                            const newTimes = [...currentTimes, '15:00'];
                                            handleNotificationSettingChange({
                                                ...(profile.notificationSettings || {}),
                                                mealTimes: newTimes
                                            });
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 rounded border border-green-300"
                                        disabled={profile.notificationSettings?.meal === false}
                                    >
                                        <Icon name="Plus" size={14} />
                                        時間枠を追加
                                    </button>
                                </div>
                            </div>

                            {/* 運動通知 */}
                            <div className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={profile.notificationSettings?.workout !== false}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                notificationSettings: {
                                                    ...(profile.notificationSettings || {}),
                                                    workout: e.target.checked
                                                }
                                            })}
                                            className="rounded"
                                        />
                                        <div>
                                            <div className="font-medium text-sm">運動通知</div>
                                            <div className="text-xs text-gray-600">トレーニング時間をリマインド</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-6">
                                    <label className="block text-xs font-medium mb-1">通知時刻</label>
                                    <input
                                        type="time"
                                        value={profile.notificationSettings?.workoutTime || '18:00'}
                                        onChange={(e) => handleNotificationSettingChange({
                                            ...(profile.notificationSettings || {}),
                                            workoutTime: e.target.value
                                        })}
                                        className="px-3 py-2 border rounded-lg text-sm"
                                        disabled={profile.notificationSettings?.workout === false}
                                    />
                                </div>
                            </div>

                            {/* 手動保存ボタン */}
                            <div className="mt-4 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const result = await NotificationService.scheduleNotification(userId, profile.notificationSettings);
                                            if (result.success) {
                                                alert(`✓ 通知設定を保存しました\n\n${result.schedules.length}件のスケジュールを登録`);
                                                console.log('[Settings] Manual save successful:', result);
                                            } else {
                                                alert(`✗ 保存に失敗しました\n\nエラー: ${result.error}`);
                                                console.error('[Settings] Manual save failed:', result);
                                            }
                                        } catch (error) {
                                            alert(`✗ 保存エラー\n\n${error.message}`);
                                            console.error('[Settings] Manual save error:', error);
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                >
                                    <Icon name="Save" size={18} />
                                    通知設定を保存
                                </button>
                                <p className="text-xs text-gray-600 mt-2 text-center">
                                    ※ 時刻を変更したら必ずこのボタンを押してください
                                </p>
                            </div>

                        </div>
                    </details>

                    {/* データ管理*/}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Database" size={18} className="text-indigo-600" />
                            データ管理                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                        <div className="space-y-4">
                            {/* PWAキャッシュクリア */}
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <h4 className="font-bold mb-2 text-orange-800 flex items-center gap-2">
                                    <Icon name="RefreshCw" size={16} />
                                    PWAキャッシュクリア
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    アプリの動作がおかしい場合、キャッシュをクリアすると改善することがあります。
                                </p>
                                <div className="space-y-2">
                                    <button
                                        onClick={async () => {
                                            if (confirm('すべてのキャッシュをクリアしますか？\n（通知設定やユーザーデータは保持されます）')) {
                                                try {
                                                    // Service Workerのキャッシュをクリア
                                                    if ('caches' in window) {
                                                        const cacheNames = await caches.keys();
                                                        await Promise.all(
                                                            cacheNames.map(cacheName => caches.delete(cacheName))
                                                        );
                                                        console.log('[Cache] Service Worker caches cleared');
                                                    }

                                                    // Service Workerを再登録
                                                    if ('serviceWorker' in navigator) {
                                                        const registrations = await navigator.serviceWorker.getRegistrations();
                                                        await Promise.all(
                                                            registrations.map(registration => registration.unregister())
                                                        );
                                                        console.log('[Cache] Service Workers unregistered');

                                                        // 再登録
                                                        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                                                        console.log('[Cache] Service Worker re-registered');
                                                    }

                                                    alert('キャッシュをクリアしました。\nページをリロードします。');
                                                    window.location.reload(true);
                                                } catch (error) {
                                                    console.error('[Cache] Failed to clear cache:', error);
                                                    alert('キャッシュクリアに失敗しました: ' + error.message);
                                                }
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                                    >
                                        <Icon name="RefreshCw" size={16} />
                                        キャッシュをクリア
                                    </button>
                                    <p className="text-xs text-gray-500">
                                        ※ 通知設定、記録、プロフィールなどのユーザーデータは削除されません
                                    </p>
                                </div>
                            </div>

                            {/* カスタムアイテム管理 */}
                            {(() => {
                                const [customItemTab, setCustomItemTab] = React.useState('food');
                                const [customFoods, setCustomFoods] = React.useState(() => {
                                    const saved = localStorage.getItem('customFoods');
                                    return saved ? JSON.parse(saved) : [];
                                });

                                const foodItems = customFoods.filter(item => item.itemType === 'food');
                                const recipeItems = customFoods.filter(item => item.itemType === 'recipe');
                                const supplementItems = customFoods.filter(item => item.itemType === 'supplement');

                                const deleteItem = (index) => {
                                    if (confirm('このアイテムを削除しますか？')) {
                                        const updated = customFoods.filter((_, i) => i !== index);
                                        setCustomFoods(updated);
                                        localStorage.setItem('customFoods', JSON.stringify(updated));
                                    }
                                };

                                const deleteAllByType = (itemType) => {
                                    const typeName = itemType === 'food' ? '食材' : itemType === 'recipe' ? '料理' : 'サプリ';
                                    if (confirm(`すべての${typeName}を削除しますか？`)) {
                                        const updated = customFoods.filter(item => item.itemType !== itemType);
                                        setCustomFoods(updated);
                                        localStorage.setItem('customFoods', JSON.stringify(updated));
                                    }
                                };

                                const editItem = (item, index) => {
                                    // TODO: Open edit modal with the same form as custom creation
                                    alert('編集機能は実装予定です');
                                };

                                return (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <h4 className="font-bold mb-2 text-blue-800">カスタムアイテム管理</h4>
                                        <p className="text-sm text-gray-600 mb-3">手動で作成した食材・料理・サプリを管理できます。</p>

                                        {/* タブ切り替え */}
                                        <div className="flex gap-2 border-b mb-3">
                                            <button
                                                onClick={() => setCustomItemTab('food')}
                                                className={`px-4 py-2 font-medium transition text-sm ${
                                                    customItemTab === 'food'
                                                        ? 'border-b-2 border-green-600 text-green-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                食材 ({foodItems.length})
                                            </button>
                                            <button
                                                onClick={() => setCustomItemTab('recipe')}
                                                className={`px-4 py-2 font-medium transition text-sm ${
                                                    customItemTab === 'recipe'
                                                        ? 'border-b-2 border-green-600 text-green-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                料理 ({recipeItems.length})
                                            </button>
                                            <button
                                                onClick={() => setCustomItemTab('supplement')}
                                                className={`px-4 py-2 font-medium transition text-sm ${
                                                    customItemTab === 'supplement'
                                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                サプリ ({supplementItems.length})
                                            </button>
                                        </div>

                                        {/* アイテム一覧 */}
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {customItemTab === 'food' && (
                                                <>
                                                    {foodItems.length === 0 ? (
                                                        <p className="text-sm text-gray-500 py-4 text-center">カスタム食材はありません</p>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-end mb-2">
                                                                <button
                                                                    onClick={() => deleteAllByType('food')}
                                                                    className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                                >
                                                                    すべて削除
                                                                </button>
                                                            </div>
                                                            {foodItems.map((item, idx) => {
                                                                const actualIndex = customFoods.findIndex(f => f === item);
                                                                return (
                                                                    <div key={idx} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                                                                        <div className="flex-1">
                                                                            <p className="font-medium text-sm">{item.name}</p>
                                                                            <p className="text-xs text-gray-600">
                                                                                {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                onClick={() => editItem(item, actualIndex)}
                                                                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                            >
                                                                                <Icon name="Edit" size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => deleteItem(actualIndex)}
                                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                            >
                                                                                <Icon name="Trash2" size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {customItemTab === 'recipe' && (
                                                <>
                                                    {recipeItems.length === 0 ? (
                                                        <p className="text-sm text-gray-500 py-4 text-center">カスタム料理はありません</p>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-end mb-2">
                                                                <button
                                                                    onClick={() => deleteAllByType('recipe')}
                                                                    className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                                >
                                                                    すべて削除
                                                                </button>
                                                            </div>
                                                            {recipeItems.map((item, idx) => {
                                                                const actualIndex = customFoods.findIndex(f => f === item);
                                                                return (
                                                                    <div key={idx} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                                                                        <div className="flex-1">
                                                                            <p className="font-medium text-sm">{item.name}</p>
                                                                            <p className="text-xs text-gray-600">
                                                                                {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                onClick={() => editItem(item, actualIndex)}
                                                                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                            >
                                                                                <Icon name="Edit" size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => deleteItem(actualIndex)}
                                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                            >
                                                                                <Icon name="Trash2" size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {customItemTab === 'supplement' && (
                                                <>
                                                    {supplementItems.length === 0 ? (
                                                        <p className="text-sm text-gray-500 py-4 text-center">カスタムサプリはありません</p>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-end mb-2">
                                                                <button
                                                                    onClick={() => deleteAllByType('supplement')}
                                                                    className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
                                                                >
                                                                    すべて削除
                                                                </button>
                                                            </div>
                                                            {supplementItems.map((item, idx) => {
                                                                const actualIndex = customFoods.findIndex(f => f === item);
                                                                return (
                                                                    <div key={idx} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                                                                        <div className="flex-1">
                                                                            <p className="font-medium text-sm">{item.name}</p>
                                                                            <p className="text-xs text-gray-600">
                                                                                {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <button
                                                                                onClick={() => editItem(item, actualIndex)}
                                                                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                            >
                                                                                <Icon name="Edit" size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => deleteItem(actualIndex)}
                                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                            >
                                                                                <Icon name="Trash2" size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* 全データベースアイテム一覧 */}
                            {(() => {
                                const [dbTab, setDbTab] = React.useState('food');
                                const [dbSearchTerm, setDbSearchTerm] = React.useState('');
                                const [expandedCategories, setExpandedCategories] = React.useState({});
                                const [selectedItemDetail, setSelectedItemDetail] = React.useState(null);
                                const [showDetailModal, setShowDetailModal] = React.useState(false);

                                const toggleCategory = (category) => {
                                    setExpandedCategories(prev => ({
                                        ...prev,
                                        [category]: !prev[category]
                                    }));
                                };

                                // 食品データベースのアイテムをカテゴリごとに整理
                                const organizedFoodDB = React.useMemo(() => {
                                    const organized = {};
                                    Object.keys(foodDatabase).forEach(category => {
                                        const items = [];
                                        Object.keys(foodDatabase[category]).forEach(itemName => {
                                            if (itemName.includes(dbSearchTerm)) {
                                                items.push({
                                                    name: itemName,
                                                    ...foodDatabase[category][itemName]
                                                });
                                            }
                                        });
                                        if (items.length > 0) {
                                            organized[category] = items;
                                        }
                                    });
                                    return organized;
                                }, [dbSearchTerm]);

                                // トレーニングデータベースのアイテムをカテゴリごとに整理
                                const organizedTrainingDB = React.useMemo(() => {
                                    const organized = {};
                                    Object.keys(trainingDatabase).forEach(category => {
                                        const items = [];
                                        Object.keys(trainingDatabase[category]).forEach(itemName => {
                                            if (itemName.includes(dbSearchTerm)) {
                                                items.push({
                                                    name: itemName,
                                                    ...trainingDatabase[category][itemName]
                                                });
                                            }
                                        });
                                        if (items.length > 0) {
                                            organized[category] = items;
                                        }
                                    });
                                    return organized;
                                }, [dbSearchTerm]);

                                const totalFoodItems = Object.values(organizedFoodDB).reduce((sum, items) => sum + items.length, 0);
                                const totalTrainingItems = Object.values(organizedTrainingDB).reduce((sum, items) => sum + items.length, 0);

                                return (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                        <h4 className="font-bold mb-2 text-green-800 flex items-center gap-2">
                                            <Icon name="Database" size={18} />
                                            全データベースアイテム一覧
                                        </h4>
                                        <p className="text-sm text-gray-600 mb-3">アプリに登録されているすべてのアイテムを確認できます。</p>

                                        {/* タブ切り替え */}
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={() => setDbTab('food')}
                                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                                                    dbTab === 'food'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                食品 ({totalFoodItems})
                                            </button>
                                            <button
                                                onClick={() => setDbTab('training')}
                                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                                                    dbTab === 'training'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                運動 ({totalTrainingItems})
                                            </button>
                                        </div>

                                        {/* 検索ボックス */}
                                        <input
                                            type="text"
                                            placeholder="アイテムを検索..."
                                            value={dbSearchTerm}
                                            onChange={(e) => setDbSearchTerm(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 text-sm"
                                        />

                                        {/* 食品データベース */}
                                        {dbTab === 'food' && (
                                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                                {Object.keys(organizedFoodDB).length === 0 ? (
                                                    <p className="text-sm text-gray-500 text-center py-4">該当するアイテムがありません</p>
                                                ) : (
                                                    Object.keys(organizedFoodDB).map(category => (
                                                        <div key={category} className="bg-white rounded-lg border border-gray-200">
                                                            <button
                                                                onClick={() => toggleCategory(category)}
                                                                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
                                                            >
                                                                <span className="font-medium text-sm">{category} ({organizedFoodDB[category].length})</span>
                                                                <Icon name={expandedCategories[category] ? "ChevronUp" : "ChevronDown"} size={16} />
                                                            </button>
                                                            {expandedCategories[category] && (
                                                                <div className="p-3 pt-0 space-y-1 max-h-60 overflow-y-auto">
                                                                    {organizedFoodDB[category].map((item, idx) => (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => {
                                                                                setSelectedItemDetail(item);
                                                                                setShowDetailModal(true);
                                                                            }}
                                                                            className="w-full text-sm py-1.5 px-2 bg-gray-50 rounded flex justify-between items-center hover:bg-gray-100 transition cursor-pointer"
                                                                        >
                                                                            <span className="text-left">{item.name}</span>
                                                                            <span className="text-xs text-gray-500">
                                                                                {item.calories}kcal • P:{item.protein}g • F:{item.fat}g • C:{item.carbs}g
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* トレーニングデータベース */}
                                        {dbTab === 'training' && (
                                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                                {Object.keys(organizedTrainingDB).length === 0 ? (
                                                    <p className="text-sm text-gray-500 text-center py-4">該当するアイテムがありません</p>
                                                ) : (
                                                    Object.keys(organizedTrainingDB).map(category => (
                                                        <div key={category} className="bg-white rounded-lg border border-gray-200">
                                                            <button
                                                                onClick={() => toggleCategory(category)}
                                                                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
                                                            >
                                                                <span className="font-medium text-sm">{category} ({organizedTrainingDB[category].length})</span>
                                                                <Icon name={expandedCategories[category] ? "ChevronUp" : "ChevronDown"} size={16} />
                                                            </button>
                                                            {expandedCategories[category] && (
                                                                <div className="p-3 pt-0 space-y-1 max-h-60 overflow-y-auto">
                                                                    {organizedTrainingDB[category].map((item, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="w-full text-sm py-1.5 px-2 bg-gray-50 rounded flex justify-between items-center"
                                                                        >
                                                                            <span className="text-left">{item.name}</span>
                                                                            <span className="text-xs text-gray-500">
                                                                                {item.met && `MET: ${item.met}`}
                                                                                {item.category && ` • ${item.category}`}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}

                                        {/* アイテム詳細モーダル */}
                                        {showDetailModal && selectedItemDetail && (
                                            <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4">
                                                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                                                    <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                                                        <h3 className="text-lg font-bold">{selectedItemDetail.name}</h3>
                                                        <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                                                            <Icon name="X" size={24} />
                                                        </button>
                                                    </div>
                                                    <div className="p-6 space-y-4">
                                                        {/* 基本栄養素 */}
                                                        <div className="bg-gray-50 p-4 rounded-lg">
                                                            <h4 className="font-bold mb-3 text-gray-800">基本栄養素（{selectedItemDetail.servingSize || 100}{selectedItemDetail.servingUnit || 'g'}あたり）</h4>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <p className="text-xs text-gray-600">カロリー</p>
                                                                    <p className="font-bold text-lg" style={{color: '#7686BA'}}>{selectedItemDetail.calories || 0}kcal</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600">たんぱく質</p>
                                                                    <p className="font-bold text-lg text-red-600">{selectedItemDetail.protein || 0}g</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600">脂質</p>
                                                                    <p className="font-bold text-lg text-yellow-600">{selectedItemDetail.fat || 0}g</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600">炭水化物</p>
                                                                    <p className="font-bold text-lg text-green-600">{selectedItemDetail.carbs || 0}g</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 食物繊維・糖質 */}
                                                        {(selectedItemDetail.fiber || selectedItemDetail.sugar) && (
                                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                                <h4 className="font-bold mb-3 text-blue-800">食物繊維・糖質</h4>
                                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                                    {selectedItemDetail.sugar !== undefined && (
                                                                        <div>
                                                                            <p className="text-xs text-gray-600">糖質</p>
                                                                            <p className="font-bold">{selectedItemDetail.sugar}g</p>
                                                                        </div>
                                                                    )}
                                                                    {selectedItemDetail.fiber !== undefined && (
                                                                        <div>
                                                                            <p className="text-xs text-gray-600">食物繊維</p>
                                                                            <p className="font-bold">{selectedItemDetail.fiber}g</p>
                                                                        </div>
                                                                    )}
                                                                    {selectedItemDetail.solubleFiber !== undefined && (
                                                                        <div>
                                                                            <p className="text-xs text-gray-600">水溶性食物繊維</p>
                                                                            <p className="font-bold">{selectedItemDetail.solubleFiber}g</p>
                                                                        </div>
                                                                    )}
                                                                    {selectedItemDetail.insolubleFiber !== undefined && (
                                                                        <div>
                                                                            <p className="text-xs text-gray-600">不溶性食物繊維</p>
                                                                            <p className="font-bold">{selectedItemDetail.insolubleFiber}g</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* GI値・DIAAS */}
                                                        {(selectedItemDetail.gi || selectedItemDetail.diaas) && (
                                                            <div className="bg-purple-50 p-4 rounded-lg">
                                                                <h4 className="font-bold mb-3 text-purple-800">栄養指標</h4>
                                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                                    {selectedItemDetail.gi && (
                                                                        <div>
                                                                            <p className="text-xs text-gray-600">GI値</p>
                                                                            <p className="font-bold">{selectedItemDetail.gi}</p>
                                                                        </div>
                                                                    )}
                                                                    {selectedItemDetail.diaas && (
                                                                        <div>
                                                                            <p className="text-xs text-gray-600">DIAAS</p>
                                                                            <p className="font-bold">{selectedItemDetail.diaas}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ビタミン */}
                                                        {(() => {
                                                            const vitaminMap = {
                                                                'vitaminA': { label: 'ビタミンA', unit: 'μg' },
                                                                'vitaminB1': { label: 'ビタミンB1', unit: 'mg' },
                                                                'vitaminB2': { label: 'ビタミンB2', unit: 'mg' },
                                                                'vitaminB6': { label: 'ビタミンB6', unit: 'mg' },
                                                                'vitaminB12': { label: 'ビタミンB12', unit: 'μg' },
                                                                'vitaminC': { label: 'ビタミンC', unit: 'mg' },
                                                                'vitaminD': { label: 'ビタミンD', unit: 'μg' },
                                                                'vitaminE': { label: 'ビタミンE', unit: 'mg' },
                                                                'vitaminK': { label: 'ビタミンK', unit: 'μg' },
                                                                'niacin': { label: 'ナイアシン', unit: 'mg' },
                                                                'pantothenicAcid': { label: 'パントテン酸', unit: 'mg' },
                                                                'biotin': { label: 'ビオチン', unit: 'μg' },
                                                                'folicAcid': { label: '葉酸', unit: 'μg' }
                                                            };
                                                            const vitamins = Object.keys(vitaminMap).filter(key => selectedItemDetail[key] !== undefined && selectedItemDetail[key] !== 0);

                                                            return vitamins.length > 0 && (
                                                                <div className="bg-yellow-50 p-4 rounded-lg">
                                                                    <h4 className="font-bold mb-3 text-yellow-800">ビタミン</h4>
                                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                                        {vitamins.map(key => (
                                                                            <div key={key}>
                                                                                <p className="text-xs text-gray-600">{vitaminMap[key].label}</p>
                                                                                <p className="font-bold">{selectedItemDetail[key]}{vitaminMap[key].unit}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* ミネラル */}
                                                        {(() => {
                                                            const mineralMap = {
                                                                'sodium': { label: 'ナトリウム', unit: 'mg' },
                                                                'potassium': { label: 'カリウム', unit: 'mg' },
                                                                'calcium': { label: 'カルシウム', unit: 'mg' },
                                                                'magnesium': { label: 'マグネシウム', unit: 'mg' },
                                                                'phosphorus': { label: 'リン', unit: 'mg' },
                                                                'iron': { label: '鉄', unit: 'mg' },
                                                                'zinc': { label: '亜鉛', unit: 'mg' },
                                                                'copper': { label: '銅', unit: 'mg' },
                                                                'manganese': { label: 'マンガン', unit: 'mg' },
                                                                'iodine': { label: 'ヨウ素', unit: 'μg' },
                                                                'selenium': { label: 'セレン', unit: 'μg' },
                                                                'chromium': { label: 'クロム', unit: 'μg' },
                                                                'molybdenum': { label: 'モリブデン', unit: 'μg' }
                                                            };
                                                            const minerals = Object.keys(mineralMap).filter(key => selectedItemDetail[key] !== undefined && selectedItemDetail[key] !== 0);

                                                            return minerals.length > 0 && (
                                                                <div className="bg-orange-50 p-4 rounded-lg">
                                                                    <h4 className="font-bold mb-3 text-orange-800">ミネラル</h4>
                                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                                        {minerals.map(key => (
                                                                            <div key={key}>
                                                                                <p className="text-xs text-gray-600">{mineralMap[key].label}</p>
                                                                                <p className="font-bold">{selectedItemDetail[key]}{mineralMap[key].unit}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* MET値（トレーニング用） */}
                                                        {selectedItemDetail.met && (
                                                            <div className="bg-green-50 p-4 rounded-lg">
                                                                <h4 className="font-bold mb-3 text-green-800">運動強度</h4>
                                                                <div className="text-sm">
                                                                    <p className="text-xs text-gray-600">MET値</p>
                                                                    <p className="font-bold text-lg">{selectedItemDetail.met}</p>
                                                                    <p className="text-xs text-gray-500 mt-2">※運動強度の指標。安静時を1としたエネルギー消費量の比率</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-6 border-t">
                                                        <button
                                                            onClick={() => setShowDetailModal(false)}
                                                            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
                                                        >
                                                            閉じる
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <div className="flex items-start gap-3">
                                    <Icon name="Trash2" size={20} className="text-red-600 mt-1" />
                                    <div className="flex-1">
                                        <h4 className="font-bold mb-2 text-red-800">全データの削除</h4>
                                        <p className="text-sm text-gray-600 mb-3">
                                            すべてのデータを削除します。この操作は取り消せません。                                        </p>
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

                    {/* フィードバック */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="MessageSquare" size={18} className="text-green-600" />
                            フィードバック
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            <div className="space-y-4">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h4 className="font-bold mb-2 text-green-800 flex items-center gap-2">
                                        <Icon name="Heart" size={16} />
                                        アプリの感想を教えてください
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        あなたの声がアプリをより良くします。使い心地、改善点、要望など、どんなことでもお聞かせください。
                                    </p>

                                    {feedbackSent ? (
                                        <div className="bg-white p-4 rounded-lg border border-green-300 text-center">
                                            <Icon name="CheckCircle" size={32} className="text-green-600 mx-auto mb-2" />
                                            <p className="font-bold text-green-800">送信完了！</p>
                                            <p className="text-sm text-gray-600">貴重なご意見ありがとうございました</p>
                                        </div>
                                    ) : (
                                        <>
                                            <textarea
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder="アプリの感想、改善点、要望などをご自由にお書きください...&#10;&#10;例：&#10;・〇〇機能が便利です&#10;・〇〇の使い方がわかりにくい&#10;・〇〇機能がほしいです"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
                                                rows="6"
                                                disabled={feedbackSending}
                                            />
                                            <button
                                                onClick={handleSendFeedback}
                                                disabled={feedbackSending || !feedbackText.trim()}
                                                className={`w-full mt-3 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                                                    feedbackSending || !feedbackText.trim()
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-green-600 text-white hover:bg-green-700'
                                                }`}
                                            >
                                                {feedbackSending ? (
                                                    <>
                                                        <Icon name="Loader" size={18} className="animate-spin" />
                                                        送信中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="Send" size={18} />
                                                        フィードバックを送信
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                送信先: kongou411@gmail.com
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </details>

                    {/* ヘルプセクション */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="HelpCircle" size={18} className="text-green-600" />
                            ヘルプ
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 mb-4">
                                    アプリの各機能の使い方を確認できます。
                                </p>

                                {/* 1. はじめに（オンボーディング） */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'onboarding' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Sparkles" size={20} className="text-purple-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">はじめに</div>
                                                <div className="text-xs text-gray-500">アプリの使い方・初期設定</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 1-1. カロリー調整値について */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'calorie_adjustment' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Info" size={20} className="text-indigo-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">カロリー調整値</div>
                                                <div className="text-xs text-gray-500">カロリー調整値の設定について</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 2. ダッシュボード */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'dashboard' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Home" size={20} className="text-blue-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">ダッシュボード</div>
                                                <div className="text-xs text-gray-500">ホーム画面の見方</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 2-1. 採点基準 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'scoring' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Info" size={20} className="text-indigo-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">採点基準</div>
                                                <div className="text-xs text-gray-500">食事・運動・コンディションのスコア算出方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 2-2. 記録について */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'record_info' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Info" size={20} className="text-teal-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">記録について</div>
                                                <div className="text-xs text-gray-500">通常記録・予測入力・ルーティン入力の違い</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 3. 食事記録 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'meal' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Utensils" size={20} className="text-green-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">食事記録</div>
                                                <div className="text-xs text-gray-500">食事の記録方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 3-1. AI食事認識 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'ai_food' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Camera" size={20} className="text-cyan-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">AI食事認識</div>
                                                <div className="text-xs text-gray-500">写真から食事を記録する方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 3-2. 食事保存方法 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'meal_save_method' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Save" size={20} className="text-blue-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">食事保存方法</div>
                                                <div className="text-xs text-gray-500">データベース保存とリスト追加の違い</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 4. 運動記録 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'workout' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Dumbbell" size={20} className="text-orange-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">運動記録</div>
                                                <div className="text-xs text-gray-500">トレーニングの記録方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 4-1. 運動保存方法 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'workout_save_method' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Save" size={20} className="text-violet-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">運動保存方法</div>
                                                <div className="text-xs text-gray-500">テンプレート保存とリスト追加の違い</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 4-2. RM更新記録について */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'rm_update' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="TrendingUp" size={20} className="text-orange-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">RM更新記録</div>
                                                <div className="text-xs text-gray-500">自己ベスト更新の記録方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 4-3. 総時間について */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'total_time' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Clock" size={20} className="text-orange-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">総時間</div>
                                                <div className="text-xs text-gray-500">トレーニング時間の記録について</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 5. サプリメント記録 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'supplement' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Pill" size={20} className="text-yellow-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">サプリメント記録</div>
                                                <div className="text-xs text-gray-500">サプリの記録方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 6. コンディション記録 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'condition' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Heart" size={20} className="text-red-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">コンディション記録</div>
                                                <div className="text-xs text-gray-500">体調の記録方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 7. AI分析 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'analysis' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Brain" size={20} className="text-purple-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">AI分析</div>
                                                <div className="text-xs text-gray-500">AIコーチの使い方</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 8. テンプレート */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'template' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="BookTemplate" size={20} className="text-indigo-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">テンプレート</div>
                                                <div className="text-xs text-gray-500">テンプレートの活用方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 9. ルーティン */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'routine' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Repeat" size={20} className="text-teal-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">ルーティン</div>
                                                <div className="text-xs text-gray-500">ルーティンの設定方法</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 10. 履歴 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'history' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="LineChart" size={20} className="text-blue-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">履歴</div>
                                                <div className="text-xs text-gray-500">履歴グラフの見方</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 11. コミュニティ */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'community' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Users" size={20} className="text-pink-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">コミュニティ</div>
                                                <div className="text-xs text-gray-500">コミュニティの使い方</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 12. 設定 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'settings' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Settings" size={20} className="text-gray-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">設定</div>
                                                <div className="text-xs text-gray-500">各種設定項目の説明</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 13. プライバシーポリシー */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'privacy' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="Shield" size={20} className="text-blue-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">プライバシーポリシー</div>
                                                <div className="text-xs text-gray-500">個人情報の取り扱いについて</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>

                                {/* 14. 利用規約 */}
                                <button
                                    onClick={() => setShowHelpModal({ type: 'terms' })}
                                    className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="FileText" size={20} className="text-slate-600" />
                                            <div>
                                                <div className="font-medium text-gray-800">利用規約</div>
                                                <div className="text-xs text-gray-500">サービス利用に関する規約</div>
                                            </div>
                                        </div>
                                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </details>

                    {/* 開発者セクション（常時表示・後日非表示か削除予定） */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Settings" size={18} className="text-orange-600" />
                            開発者                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            {/* 開発者ハードコンテンツ*/}
                            <div className="space-y-6">
                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                    <Icon name="AlertTriangle" size={18} />
                                    開発者用ツール                                </h4>
                                <p className="text-sm text-orange-700">
                                    このタブは開発中のみ表示されます。守破離機能のテストや日付の手動操作が可能です。                                </p>
                            </div>

                            {/* Premium有効/無効分析切替*/}
                            <div className="border rounded-lg p-6 bg-yellow-50">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Crown" size={18} className="text-yellow-600" />
                                    Premium会員分析切替                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-white p-4 rounded-lg border border-yellow-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">現在の状態</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                DEV_PREMIUM_MODE ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {DEV_PREMIUM_MODE ? '👑 Premium会員' : '無料会員'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            {DEV_PREMIUM_MODE
                                                ? '月額支払い時にクレジット100付与+全機能利用可能'
                                                : '1-7日目は全機能無料、8日目以降は機能制限'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={async () => {
                                                localStorage.setItem('DEV_PREMIUM_MODE', 'false');
                                                window.location.reload();
                                            }}
                                            className={`px-4 py-3 rounded-lg font-medium transition ${
                                                !DEV_PREMIUM_MODE
                                                    ? 'bg-gray-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            無料会員
                                        </button>
                                        <button
                                            onClick={async () => {
                                                // Premium会員に切替えてクレジット100付与
                                                localStorage.setItem('DEV_PREMIUM_MODE', 'true');
                                                const result = await ExperienceService.addPaidCredits(userId, 100);
                                                if (result.success) {
                                                    alert('Premium会員に切替え、クレジット100を付与しました');
                                                } else {
                                                    alert('Premium会員に切替えました');
                                                }
                                                window.location.reload();
                                            }}
                                            className={`px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-1 ${
                                                DEV_PREMIUM_MODE
                                                    ? 'bg-yellow-600 text-white'
                                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                            }`}
                                        >
                                            <Icon name="Crown" size={16} />
                                            Premium会員
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 機能開放状況*/}
                            <div className="border rounded-lg p-6">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Lock" size={18} />
                                    機能開放状況                                </h4>
                                <div className="space-y-2">
                                    {/* 進行状況に応じた機能一覧 */}
                                    {(() => {
                                        const completionStatus = getFeatureCompletionStatus(userId);
                                        const daysSinceReg = calculateDaysSinceRegistration(userId);
                                        const currentDay = daysSinceReg; // calculateDaysSinceRegistrationが既に+1済み
                                        const isPremium = DEV_PREMIUM_MODE;
                                        const isTrial = currentDay <= 7;

                                        const featureList = [
                                            { id: 'food', name: '食事記録', unlocked: true },
                                            { id: 'training', name: '運動記録', unlocked: completionStatus.food },
                                            { id: 'condition', name: 'コンディション', unlocked: completionStatus.training },
                                            { id: 'analysis', name: '分析', unlocked: completionStatus.condition, premium: !isTrial && !isPremium },
                                            { id: 'directive', name: '指示書', unlocked: completionStatus.directive, premium: !isTrial && !isPremium },
                                            { id: 'pg_base', name: 'PG BASE', unlocked: completionStatus.pg_base, premium: !isTrial && !isPremium },
                                            { id: 'community', name: 'COMY', unlocked: completionStatus.community, premium: !isTrial && !isPremium },
                                            { id: 'template', name: 'テンプレート', unlocked: completionStatus.template, premium: !isTrial && !isPremium },
                                            { id: 'routine', name: 'ルーティン', unlocked: completionStatus.routine, premium: !isTrial && !isPremium },
                                            { id: 'shortcut', name: 'ショートカット', unlocked: completionStatus.shortcut, premium: !isTrial && !isPremium },
                                            { id: 'history', name: '履歴', unlocked: completionStatus.history, premium: !isTrial && !isPremium },
                                            { id: 'history_analysis', name: '履歴分析', unlocked: completionStatus.history_analysis, premium: !isTrial && !isPremium }
                                        ];

                                        return (
                                            <>
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                                    <p className="text-xs text-gray-700">
                                                        <Icon name="Info" size={14} className="inline text-blue-600 mr-1" />
                                                        現在: {currentDay}日目 ({isTrial ? `無料期間：残り${8-currentDay}日` : (isPremium ? 'Premium会員' : '無料会員・機能制限中')})
                                                    </p>
                                                </div>
                                                {featureList.map((feature) => (
                                                    <div key={feature.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                                                        <span className="text-sm">{feature.name}</span>
                                                        <span className={`text-xs px-2 py-1 rounded ${
                                                            feature.premium ? 'bg-red-100 text-red-700' :
                                                            feature.unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                        }`}>
                                                            {feature.premium ? '🔒Premium必須' : (feature.unlocked ? '✓開放済み' : '⏳未開放')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* 日付手動進行 */}
                            <div className="border rounded-lg p-6">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Calendar" size={18} />
                                    日付手動進行
                                </h4>
                                <div className="space-y-4">
                                    {/* 現在の日数表示 */}
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm text-gray-600">現在</span>
                                            <span className="text-2xl font-bold text-indigo-600">
                                                {(() => {
                                                    const daysSinceReg = calculateDaysSinceRegistration(userId);
                                                    return `${daysSinceReg}日目`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {(() => {
                                                const daysSinceReg = calculateDaysSinceRegistration(userId);
                                                const currentDay = daysSinceReg; // calculateDaysSinceRegistrationが既に+1済み
                                                const isTrial = currentDay <= 7;
                                                const isPremium = DEV_PREMIUM_MODE;

                                                if (isTrial) {
                                                    return (
                                                        <span className="text-green-600 font-medium">
                                                            🎁 無料トライアル中（残り{8 - currentDay}日）
                                                        </span>
                                                    );
                                                } else if (isPremium) {
                                                    return (
                                                        <span className="text-yellow-600 font-medium">
                                                            👑 Premium会員（全機能利用可能）
                                                        </span>
                                                    );
                                                } else {
                                                    return (
                                                        <span className="text-red-600 font-medium">
                                                            🔒 トライアル終了・Premium機能制限中
                                                        </span>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>

                                    {/* 日付操作ボタン */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    // 1日目（登録日）に戻る
                                                    localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, new Date().toISOString());
                                                    localStorage.removeItem(STORAGE_KEYS.FEATURES_COMPLETED);
                                                    window.location.reload();
                                                }}
                                                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                            >
                                                <Icon name="RotateCcw" size={18} className="inline mr-1" />
                                                1日目へ戻る（登録日）
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // 8日目（Premium制限開始）へジャンプ
                                                    const registrationDate = new Date();
                                                    registrationDate.setDate(registrationDate.getDate() - 7);
                                                    registrationDate.setHours(0, 0, 0, 0);
                                                    localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, registrationDate.toISOString());

                                                    // 全機能完了マーク
                                                    const allCompleted = {
                                                        food: true,
                                                        training: true,
                                                        condition: true,
                                                        analysis: true,
                                                        directive: true,
                                                        pg_base: true,
                                                        template: true,
                                                        routine: true,
                                                        shortcut: true,
                                                        history: true,
                                                        history_analysis: true,
                                                        idea: true,
                                                        community: true
                                                    };
                                                    localStorage.setItem(STORAGE_KEYS.FEATURES_COMPLETED, JSON.stringify(allCompleted));
                                                    window.location.reload();
                                                }}
                                                className="px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                                            >
                                                <Icon name="FastForward" size={18} className="inline mr-1" />
                                                8日目へ（Premium制限開始）
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // +7日進める（登録日を7日前に移動）
                                                const currentReg = new Date(getRegistrationDate(userId));
                                                currentReg.setDate(currentReg.getDate() - 7);
                                                localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, currentReg.toISOString());
                                                window.location.reload();
                                            }}
                                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                                        >
                                            <Icon name="ChevronRight" size={18} className="inline mr-1" />
                                            +7日進める
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* LocalStorage管理 */}
                            <div className="border rounded-lg p-6 bg-purple-50">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Database" size={18} className="text-purple-600" />
                                    ストレージ管理（LocalStorage）
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-white p-4 rounded-lg border border-purple-200 max-h-96 overflow-y-auto">
                                        <div className="space-y-2">
                                            {(() => {
                                                const keys = Object.keys(localStorage);
                                                if (keys.length === 0) {
                                                    return (
                                                        <p className="text-sm text-gray-500 text-center py-4">
                                                            LocalStorageは空です
                                                        </p>
                                                    );
                                                }
                                                return keys.sort().map((key) => {
                                                    const value = localStorage.getItem(key);
                                                    let displayValue;
                                                    try {
                                                        const parsed = JSON.parse(value);
                                                        displayValue = JSON.stringify(parsed, null, 2);
                                                    } catch {
                                                        displayValue = value;
                                                    }
                                                    return (
                                                        <details key={key} className="border rounded p-2 bg-gray-50">
                                                            <summary className="cursor-pointer font-mono text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center justify-between">
                                                                <span className="truncate">{key}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm(`"${key}" を削除しますか？`)) {
                                                                            localStorage.removeItem(key);
                                                                            window.location.reload();
                                                                        }
                                                                    }}
                                                                    className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs"
                                                                >
                                                                    削除
                                                                </button>
                                                            </summary>
                                                            <div className="mt-2 p-2 bg-white rounded border">
                                                                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                                                    {displayValue}
                                                                </pre>
                                                            </div>
                                                        </details>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('すべてのLocalStorageデータを削除しますか？\nこの操作は取り消せません。')) {
                                                localStorage.clear();
                                                alert('LocalStorageをクリアしました');
                                                window.location.reload();
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2"
                                    >
                                        <Icon name="Trash2" size={18} />
                                        すべてのストレージをクリア
                                    </button>
                                </div>
                            </div>

                            {/* 管理者ツール */}
                            <div className="border rounded-lg p-6 bg-red-50 border-red-300">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Shield" size={18} className="text-red-600" />
                                    管理者ツール
                                </h4>
                                <div className="space-y-3">
                                    <p className="text-sm text-red-700 mb-3">
                                        🔒 管理者パネルへのアクセスには認証が必須です
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
                        </div>
                        </div>
                    </details>

            </div>
            </div>
        </div>

        {/* テンプレート編集  択モーダル */}
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

                    {/* コンテンツ*/}
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
                                ⚠️ この推定値は外見に基づく主観的評価であり、実際の体脂肪率は±3-5%の誤差があります。正確な測定には体組成計の使用を強く推奨します。                            </p>
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

        {/* 2FA設定モーダル */}
        {show2FASetup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold mb-4">2段階認証の設定</h3>

                    {!verificationId ? (
                        // ステップ1: 電話番号入力
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    電話番号（国際形式）
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="+8190XXXXXXXX"
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    例: +819012345678
                                </p>
                            </div>

                            <div id="recaptcha-container"></div>

                            <button
                                onClick={async () => {
                                    // reCAPTCHAを初期化
                                    if (!window.recaptchaVerifier) {
                                        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
                                            'recaptcha-container',
                                            { size: 'normal' }
                                        );
                                    }

                                    const result = await MFAService.enrollSMS2FA(phoneNumber);
                                    if (result.success) {
                                        setVerificationId(result.verificationId);
                                    } else {
                                        alert('エラー: ' + result.error);
                                    }
                                }}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                            >
                                認証コードを送信
                            </button>
                        </div>
                    ) : (
                        // ステップ2: 認証コード入力
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                {phoneNumber} に認証コードを送信しました
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    認証コード（6桁）
                                </label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="123456"
                                    maxLength={6}
                                    className="w-full px-4 py-2 border rounded-lg text-center text-2xl tracking-widest"
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    const result = await MFAService.confirmSMS2FA(verificationId, verificationCode);
                                    if (result.success) {
                                        setMfaEnrolled(true);
                                        setShow2FASetup(false);
                                        setVerificationId(null);
                                        setVerificationCode('');
                                        setPhoneNumber('');
                                        alert('2FAを設定しました');
                                    } else {
                                        alert('エラー: ' + result.error);
                                    }
                                }}
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                            >
                                確認
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setShow2FASetup(false);
                            setVerificationId(null);
                            setVerificationCode('');
                            setPhoneNumber('');
                        }}
                        className="w-full mt-3 text-gray-600 hover:text-gray-800"
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        )}

        {/* ヘルプモーダル */}
        {showHelpModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center p-4" onClick={() => setShowHelpModal(null)}>
                <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    {/* ヘッダー */}
                    <div className={`sticky top-0 bg-gradient-to-r ${getHelpGradient(showHelpModal.type)} text-white p-4 rounded-t-2xl flex justify-between items-center z-10`}>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Icon name={getHelpIcon(showHelpModal.type)} size={20} />
                            {getHelpTitle(showHelpModal.type)}
                        </h3>
                        <button
                            onClick={() => setShowHelpModal(null)}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                        >
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    {/* コンテンツ */}
                    <div className="p-6 space-y-6">
                        {getHelpContent(showHelpModal.type)}
                    </div>

                    {/* 閉じるボタン */}
                    <div className="pt-4 border-t">
                        <button
                            onClick={() => setShowHelpModal(null)}
                            className={`w-full px-6 py-3 bg-gradient-to-r ${getHelpGradient(showHelpModal.type)} text-white font-bold rounded-lg hover:opacity-90 transition`}
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        )}

        </>
    );
};

// ヘルプモーダル用のユーティリティ関数
const getHelpIcon = (type) => {
    const icons = {
        onboarding: 'Sparkles',
        dashboard: 'Home',
        scoring: 'Info',
        record_info: 'Info',
        meal: 'Utensils',
        ai_food: 'Camera',
        meal_save_method: 'Save',
        workout: 'Dumbbell',
        workout_save_method: 'Save',
        supplement: 'Pill',
        condition: 'Heart',
        analysis: 'Brain',
        template: 'BookTemplate',
        routine: 'Repeat',
        history: 'LineChart',
        community: 'Users',
        settings: 'Settings',
        privacy: 'Shield',
        terms: 'FileText',
        calorie_adjustment: 'Info',
        rm_update: 'TrendingUp',
        total_time: 'Clock'
    };
    return icons[type] || 'HelpCircle';
};

const getHelpIconColor = (type) => {
    const colors = {
        onboarding: 'text-purple-600',
        dashboard: 'text-blue-600',
        scoring: 'text-indigo-600',
        record_info: 'text-teal-600',
        meal: 'text-green-600',
        ai_food: 'text-cyan-600',
        meal_save_method: 'text-blue-600',
        workout: 'text-orange-600',
        workout_save_method: 'text-violet-600',
        supplement: 'text-yellow-600',
        condition: 'text-red-600',
        analysis: 'text-purple-600',
        template: 'text-indigo-600',
        routine: 'text-teal-600',
        history: 'text-blue-600',
        community: 'text-pink-600',
        settings: 'text-gray-600',
        privacy: 'text-blue-600',
        terms: 'text-slate-600',
        calorie_adjustment: 'text-indigo-600',
        rm_update: 'text-orange-600',
        total_time: 'text-orange-600'
    };
    return colors[type] || 'text-gray-600';
};

// 各モーダルタイプに応じたグラデーションカラーを返す
const getHelpGradient = (type) => {
    const gradients = {
        onboarding: 'from-purple-600 to-indigo-600',
        dashboard: 'from-blue-600 to-cyan-600',
        scoring: 'from-indigo-600 to-purple-600',
        record_info: 'from-teal-600 to-cyan-600',
        meal: 'from-green-600 to-emerald-600',
        ai_food: 'from-cyan-600 to-blue-600',
        meal_save_method: 'from-blue-600 to-indigo-600',
        workout: 'from-orange-600 to-red-600',
        workout_save_method: 'from-violet-600 to-purple-600',
        supplement: 'from-yellow-600 to-orange-600',
        condition: 'from-red-600 to-pink-600',
        analysis: 'from-purple-600 to-pink-600',
        template: 'from-indigo-600 to-blue-600',
        routine: 'from-teal-600 to-green-600',
        history: 'from-blue-600 to-indigo-600',
        community: 'from-pink-600 to-rose-600',
        settings: 'from-gray-600 to-slate-600',
        privacy: 'from-blue-600 to-cyan-600',
        terms: 'from-slate-600 to-gray-600',
        calorie_adjustment: 'from-indigo-600 to-purple-600',
        rm_update: 'from-orange-600 to-amber-600',
        total_time: 'from-orange-600 to-red-600'
    };
    return gradients[type] || 'from-purple-600 to-indigo-600';
};

const getHelpTitle = (type) => {
    const titles = {
        onboarding: 'はじめに',
        dashboard: 'ダッシュボード',
        scoring: '採点基準',
        record_info: '記録について',
        meal: '食事記録',
        ai_food: 'AI食事認識',
        meal_save_method: '食事保存方法',
        workout: '運動記録',
        workout_save_method: '運動保存方法',
        supplement: 'サプリメント記録',
        condition: 'コンディション記録',
        analysis: 'AI分析',
        template: 'テンプレート',
        routine: 'ルーティン',
        history: '履歴',
        community: 'コミュニティ',
        settings: '設定',
        privacy: 'プライバシーポリシー',
        terms: '利用規約',
        calorie_adjustment: 'カロリー調整値について',
        rm_update: 'RM更新記録について',
        total_time: '総時間について'
    };
    return titles[type] || 'ヘルプ';
};

const getHelpContent = (type) => {
    const contents = {
        onboarding: (
            <>
                <h3>Your Coach+へようこそ！</h3>
                <p>Your Coach+は、あなたの健康とフィットネスの目標達成をサポートするパーソナルコーチングアプリです。</p>

                <h4>主な機能</h4>
                <ul>
                    <li><strong>食事記録</strong>: 写真撮影・検索・手動入力で簡単に記録</li>
                    <li><strong>運動記録</strong>: トレーニング内容を詳細に記録</li>
                    <li><strong>AI分析</strong>: あなたの記録をAIが分析してアドバイス</li>
                    <li><strong>テンプレート</strong>: よく使う食事や運動を保存して再利用</li>
                    <li><strong>コミュニティ</strong>: 他のユーザーと交流してモチベーションアップ</li>
                </ul>

                <h4>使い始め方</h4>
                <ol>
                    <li>まずはプロフィール設定を完了させましょう</li>
                    <li>今日の食事を記録してみましょう</li>
                    <li>運動をした後は運動記録を追加</li>
                    <li>コンディション（睡眠・体調）を記録</li>
                    <li>AI分析でアドバイスを受けましょう</li>
                </ol>
            </>
        ),
        dashboard: (
            <>
                <h3>ダッシュボードの見方</h3>
                <p>ダッシュボード（ホーム画面）には、今日の記録の概要が表示されます。</p>

                <h4>表示項目</h4>
                <ul>
                    <li><strong>PFCバランス</strong>: タンパク質・脂質・炭水化物の摂取バランス</li>
                    <li><strong>カロリー</strong>: 目標カロリーに対する達成度</li>
                    <li><strong>食事カード</strong>: 今日記録した食事の一覧</li>
                    <li><strong>運動カード</strong>: 今日記録した運動の一覧</li>
                    <li><strong>サプリメント</strong>: 今日摂取したサプリメント</li>
                    <li><strong>コンディション</strong>: 睡眠時間・体調スコア</li>
                </ul>

                <h4>操作方法</h4>
                <ul>
                    <li>各カードをタップして編集・削除が可能</li>
                    <li>右下の「＋」ボタンから新規記録を追加</li>
                    <li>日付を変更して過去の記録を確認</li>
                </ul>
            </>
        ),
        scoring: (
            <>
                <div className="space-y-4">
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
                </div>
            </>
        ),
        record_info: (
            <>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">記録の種類について</h3>
                    <p className="text-sm text-gray-600">
                        Your Coach+では、3種類の記録方法があります。それぞれの特徴を理解して、効率的に記録しましょう。
                    </p>

                    {/* 通常の記録 */}
                    <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Plus" size={18} className="text-green-600" />
                            <h4 className="font-bold text-gray-800">【通常の記録】</h4>
                        </div>
                        <p className="text-sm text-gray-700">
                            ＋ボタンから、食事・運動・サプリメントを記録できます。記録した内容は即座にダッシュボードに反映されます。
                        </p>
                        <div className="bg-gray-50 rounded p-2 mt-2">
                            <p className="text-xs text-gray-600">
                                💡 最も基本的な記録方法です。毎日の食事や運動を自由に記録できます。
                            </p>
                        </div>
                    </div>

                    {/* 予測入力 */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Sparkles" size={18} className="text-indigo-600" />
                            <h4 className="font-bold text-indigo-900">【予測入力】</h4>
                        </div>
                        <p className="text-sm text-indigo-800">
                            前日のデータから今日の食事・運動を自動的に予測して入力します。
                        </p>
                        <ul className="list-disc list-inside text-sm text-indigo-700 space-y-1 ml-2">
                            <li>青背景で表示されます</li>
                            <li>予測データは編集可能です</li>
                            <li>そのまま分析に使用できます</li>
                        </ul>
                        <div className="bg-indigo-100 rounded p-2 mt-2">
                            <p className="text-xs text-indigo-700">
                                💡 毎日同じような食事をする方におすすめです。予測後に微調整すれば記録が楽になります。
                            </p>
                        </div>
                    </div>

                    {/* ルーティン入力 */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon name="Repeat" size={18} className="text-purple-600" />
                            <h4 className="font-bold text-purple-900">【ルーティン入力】</h4>
                        </div>
                        <p className="text-sm text-purple-800">
                            設定したルーティンに紐づけたテンプレートを自動入力します。
                        </p>
                        <ul className="list-disc list-inside text-sm text-purple-700 space-y-1 ml-2">
                            <li>紫背景で表示されます</li>
                            <li>ルーティンデータは編集可能です</li>
                            <li>そのまま分析に使用できます</li>
                        </ul>
                        <div className="bg-purple-100 rounded p-2 mt-2">
                            <p className="text-xs text-purple-700 mb-1">
                                <strong>設定方法：</strong> 設定 → ルーティン → 各日に食事・運動テンプレートを紐づけ
                            </p>
                            <p className="text-xs text-purple-700">
                                💡 分割法（胸・背中・脚など）を設定している方におすすめです。曜日ごとに自動で適切なトレーニングが入力されます。
                            </p>
                        </div>
                    </div>
                </div>
            </>
        ),
        meal: (
            <>
                <div className="space-y-6">
                    {/* 記録方法 */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="Plus" size={20} className="text-green-600" />
                            食事の記録方法
                        </h4>
                        <div className="space-y-3">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <p className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                    <Icon name="Camera" size={18} />
                                    方法1: 写真から記録（AI解析）
                                </p>
                                <p className="text-sm text-purple-800 mb-2">
                                    食事の写真を撮影すると、AIが自動で食材を認識して栄養素を計算します。最も簡単な方法です。精肉のパックを解析すると、g数がそのまま一覧に登録されます。
                                </p>
                                <p className="text-xs text-purple-700">
                                    💡 クレジット1個消費 | 複数の食材を一度に認識可能
                                </p>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <Icon name="Search" size={18} />
                                    方法2: 検索して記録
                                </p>
                                <p className="text-sm text-blue-800 mb-2">
                                    食材名で検索してデータベースから選択します。正確な栄養素データで記録できます。
                                </p>
                                <p className="text-xs text-blue-700">
                                    💡 クレジット不要 | 1,000種類以上の食材データベース
                                </p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                    <Icon name="Edit" size={18} />
                                    方法3: 手動で作成
                                </p>
                                <p className="text-sm text-amber-800 mb-2">
                                    カスタム食材を自分で作成します。栄養成分表示や八訂データを参照して入力します。
                                </p>
                                <p className="text-xs text-amber-700">
                                    💡 クレジット不要 | 一度作成すると保存され、次回から簡単に使用可能
                                </p>
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                            <p className="text-sm text-green-800">
                                <strong>💡 推奨:</strong> Your Coach+は自炊での食事管理を前提として設計されています。食材単位で記録することで、より正確な栄養管理が可能になります。
                            </p>
                        </div>
                    </div>

                    {/* テンプレート機能 */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="Clock" size={20} className="text-indigo-600" />
                            テンプレート機能
                        </h4>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <p className="font-semibold text-indigo-900 mb-2">
                                よく食べる食事を保存して簡単に記録
                            </p>
                            <p className="text-sm text-indigo-800 mb-3">
                                12日以上利用すると開放される機能です。頻繁に食べる食事の組み合わせをテンプレートとして保存できます。
                            </p>
                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-indigo-300">
                                <p className="font-semibold mb-1">使い方:</p>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                    <li>食事を記録した後、「テンプレートとして保存」をタップ</li>
                                    <li>次回から記録画面の下部にテンプレートが表示される</li>
                                    <li>テンプレートをタップすると、保存した食事がすぐに追加される</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* 編集・削除 */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="Settings" size={20} className="text-gray-600" />
                            編集・削除
                        </h4>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="font-semibold text-gray-900 mb-2">食事を編集・削除する</p>
                            <p className="text-sm text-gray-700 mb-2">
                                食事カードの右上にある「ペン」アイコンで食事全体を編集、「ゴミ箱」アイコンで削除できます。
                            </p>
                            <p className="text-xs text-gray-600">
                                💡 各食材の個別編集・削除は、編集画面で行えます。
                            </p>
                        </div>
                    </div>
                </div>
            </>
        ),
        meal_save_method: (
            <>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold">保存方法について</h3>
                    <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded">
                        <h4 className="font-semibold text-gray-900 mb-1">データベースに保存</h4>
                        <p className="text-sm text-gray-700">
                            カスタムアイテムをデータベースに保存します。今すぐ記録には追加されませんが、次回以降、食材検索から簡単に見つけて使用できます。
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                            <strong>使用例：</strong>よく使う自家製料理やサプリを登録しておきたい場合
                        </p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded">
                        <h4 className="font-semibold text-gray-900 mb-1">リストに追加</h4>
                        <p className="text-sm text-gray-700">
                            カスタムアイテムをデータベースに保存し、同時に現在の記録リストにも追加します。今すぐ記録したい場合に便利です。
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                            <strong>使用例：</strong>AI写真解析で検出された未登録の食品を編集して記録したい場合
                        </p>
                    </div>
                </div>
            </>
        ),
        workout: (
            <>
                <div className="space-y-6">
                    {/* 記録方法 */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="Plus" size={20} className="text-orange-600" />
                            運動の記録方法
                        </h4>
                        <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <Icon name="Search" size={18} />
                                    方法1: 検索して記録
                                </p>
                                <p className="text-sm text-blue-800 mb-2">
                                    種目名で検索してデータベースから選択します。
                                </p>
                                <p className="text-xs text-blue-700">
                                    💡 100種類以上の運動種目データベース
                                </p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                                    <Icon name="Edit" size={18} />
                                    方法2: 手動で作成
                                </p>
                                <p className="text-sm text-amber-800 mb-2">
                                    カスタム種目を自分で作成します。オリジナルの運動を記録できます。
                                </p>
                                <p className="text-xs text-amber-700">
                                    💡 一度作成すると保存され、次回から簡単に使用可能
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 入力項目 */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="Edit3" size={20} className="text-purple-600" />
                            入力項目
                        </h4>
                        <div className="space-y-2">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <p className="font-semibold text-purple-900 mb-1">種目・セット</p>
                                <p className="text-sm text-purple-800">
                                    運動の種目名と実施したセット数を入力します。
                                </p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <p className="font-semibold text-purple-900 mb-1">重量・回数</p>
                                <p className="text-sm text-purple-800 mb-2">
                                    筋トレの場合は、使用重量（kg）と回数を入力します。自重トレーニングの場合は、自分の体重（kg）を記入します。
                                </p>
                                <p className="text-xs text-purple-700">
                                    💡 総重量 = 重量 × 回数 × セット数
                                </p>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <p className="font-semibold text-purple-900 mb-1">時間</p>
                                <p className="text-sm text-purple-800">
                                    運動の実施時間（分）を入力します。筋トレ、有酸素運動、ストレッチなど、すべての運動で記録できます。
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RM値について */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="TrendingUp" size={20} className="text-green-600" />
                            RM値とは
                        </h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="font-semibold text-green-900 mb-2">
                                Repetition Maximum（最大挙上重量）
                            </p>
                            <p className="text-sm text-green-800 mb-3">
                                RM値は、その重量で何回できるかを示す指標です。例えば、100kgで10回できる場合、「10RM = 100kg」となります。
                            </p>
                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-green-300">
                                <p className="font-semibold mb-2">RM値の計算式:</p>
                                <p className="text-xs mb-2">1RM（最大挙上重量） = 使用重量 × (1 + 回数 ÷ 40)</p>
                                <p className="text-xs text-green-700">
                                    例: 80kg × 10回 → 1RM = 100kg
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 総重量と総時間 */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="BarChart3" size={20} className="text-indigo-600" />
                            総重量と総時間の表示
                        </h4>
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <p className="font-semibold text-indigo-900 mb-2">
                                運動セクションの見出し横に表示
                            </p>
                            <p className="text-sm text-indigo-800 mb-3">
                                その日の筋トレ総重量（kg）と全運動の総時間（分）が自動で集計されて表示されます。
                            </p>
                            <div className="bg-white rounded p-3 text-sm text-gray-700 border border-indigo-300 space-y-1">
                                <p className="text-xs"><strong>総重量:</strong> すべての筋トレ種目の「重量×回数×セット数」の合計</p>
                                <p className="text-xs"><strong>総時間:</strong> すべての運動の時間の合計</p>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        ),
        workout_save_method: (
            <>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold">保存方法について</h3>
                    <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded">
                        <h4 className="font-semibold text-gray-900 mb-1">テンプレートとして保存</h4>
                        <p className="text-sm text-gray-700">
                            運動をテンプレートとして保存します。今すぐ記録には追加されませんが、次回以降、テンプレート一覧から簡単に呼び出して使用できます。
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                            <strong>使用例：</strong>定番のトレーニングメニューを保存しておきたい場合
                        </p>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded">
                        <h4 className="font-semibold text-gray-900 mb-1">リストに追加</h4>
                        <p className="text-sm text-gray-700">
                            運動をテンプレートとして保存し、同時に現在の記録リストにも追加します。今すぐ記録したい場合に便利です。
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                            <strong>使用例：</strong>カスタム種目を作成して今日の記録に追加したい場合
                        </p>
                    </div>
                </div>
            </>
        ),
        ai_food: (
            <>
                <div className="space-y-6">
                    {/* 全フローの説明 */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="Zap" size={20} className="text-purple-600" />
                            解析から記録までの流れ
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <p className="font-semibold text-gray-800">写真を撮影または選択</p>
                                    <p className="text-sm text-gray-600 mt-1">食事の写真をカメラで撮影、またはギャラリーから選択します。</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <p className="font-semibold text-gray-800">AIが自動で食材を認識・解析</p>
                                    <p className="text-sm text-gray-600 mt-1">「AIで食品を認識」ボタンを押すと、AIが写真から食材を自動で検出し、量とカロリー・PFCを推定します。</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                <div>
                                    <p className="font-semibold text-gray-800">認識結果を確認・調整</p>
                                    <p className="text-sm text-gray-600 mt-1">認識された食材の名前、量、栄養素を確認します。数量を調整したり、不要な食材を削除できます。</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                                <div>
                                    <p className="font-semibold text-gray-800">必要に応じて食材を追加</p>
                                    <p className="text-sm text-gray-600 mt-1">AIが見逃した食材は「食材を手動で追加」ボタンから追加できます。</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">5</div>
                                <div>
                                    <p className="font-semibold text-gray-800">「確定して追加」で記録完了</p>
                                    <p className="text-sm text-gray-600 mt-1">内容を確認したら「確定して追加」ボタンを押して、食事に追加します。</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 未登録食材の見分け方 */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="AlertTriangle" size={20} className="text-yellow-600" />
                            未登録食材の見分け方
                        </h4>
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                            <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                <Icon name="AlertCircle" size={18} />
                                黄色背景 + ⚠️警告表示 = データベース未登録
                            </p>
                            <p className="text-sm text-yellow-800">
                                AIが認識した食材がデータベースに登録されていない場合、黄色い背景で表示され、「⚠️ データベースに未登録の食品です」という警告が表示されます。
                            </p>
                        </div>
                    </div>

                    {/* 未登録食材の対処法 */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            <Icon name="Wrench" size={20} className="text-orange-600" />
                            未登録食材の対処法
                        </h4>
                        <div className="space-y-2">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <p className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
                                    <Icon name="Search" size={16} />
                                    方法1: 「もしかして」候補から選択
                                </p>
                                <p className="text-sm text-orange-800">
                                    AIが認識した名前に似た食材を最大3つ提案します。類似度が表示されるので、正しい食材をタップして置き換えできます。
                                </p>
                            </div>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                <p className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
                                    <Icon name="Plus" size={16} />
                                    方法2: カスタム食材として登録
                                </p>
                                <p className="text-sm text-orange-800">
                                    「カスタム食材として登録」ボタンを押して、栄養素を手動で入力します。一度登録すると、次回から簡単に使用できます。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        ),
        supplement: (
            <>
                <h3>サプリメント記録の方法</h3>
                <p>サプリメントを記録して、微量栄養素の摂取状況を管理しましょう。</p>

                <h4>記録方法</h4>
                <ul>
                    <li><strong>検索</strong>: 一般的なサプリメントはデータベースから検索</li>
                    <li><strong>カスタム作成</strong>: オリジナルのサプリメントを登録</li>
                </ul>

                <h4>テンプレート機能</h4>
                <p>毎日飲むサプリメントセットを「テンプレート」として保存できます。</p>
            </>
        ),
        condition: (
            <>
                <h3>コンディション記録の方法</h3>
                <p>毎日の体調を記録することで、トレンドを把握し、パフォーマンスとの関連を分析できます。</p>

                <h4>記録項目（6項目）</h4>
                <ul>
                    <li><strong>睡眠時間</strong>: 昨晩の睡眠時間</li>
                    <li><strong>睡眠の質</strong>: 熟睡度（1-5段階）</li>
                    <li><strong>食欲</strong>: 食欲の状態（1-5段階）</li>
                    <li><strong>腸内環境</strong>: お通じの調子（1-5段階）</li>
                    <li><strong>集中力</strong>: 仕事・勉強の集中度（1-5段階）</li>
                    <li><strong>ストレス</strong>: ストレスレベル（1-5段階）</li>
                </ul>
            </>
        ),
        analysis: (
            <>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold">AI分析の使い方</h3>
                    <p>あなたの記録をAIが分析して、パーソナライズされたアドバイスを提供します。</p>

                    <h4 className="font-bold text-gray-800 mt-4">分析内容</h4>
                    <ul className="list-disc list-inside space-y-1">
                        <li><strong>PFC評価</strong>: タンパク質・脂質・炭水化物のバランス</li>
                        <li><strong>カロリー評価</strong>: 目標達成度の評価</li>
                        <li><strong>運動評価</strong>: トレーニング内容の評価</li>
                        <li><strong>コンディション評価</strong>: 体調スコアの評価</li>
                        <li><strong>総合アドバイス</strong>: 改善点と具体的なアクション</li>
                    </ul>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
                        <h4 className="font-bold text-indigo-900 mb-2">💡 質問機能</h4>
                        <p className="text-sm text-indigo-800 mb-2">
                            レポート生成後、AIに直接質問して個別のアドバイスを受けることができます。
                        </p>
                        <div className="text-sm text-indigo-700">
                            <p className="font-semibold mb-1">質問例:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>「タンパク質が不足する原因は？」</li>
                                <li>「この改善提案をもっと詳しく教えて」</li>
                                <li>「睡眠の質を上げる方法は？」</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                        <h4 className="font-bold text-purple-900 mb-2">📊 クレジットについて</h4>
                        <p className="text-sm text-purple-800 mb-3">すべての分析機能で1クレジットを消費します</p>
                        <div className="text-sm text-purple-700 space-y-2">
                            <div>
                                <p className="font-semibold">クレジット消費:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                                    <li>レポート生成: 1クレジット</li>
                                    <li>質問1回: 1クレジット</li>
                                    <li>履歴分析1項目: 1クレジット</li>
                                </ul>
                            </div>
                            <div className="pt-2 border-t border-purple-300">
                                <p className="font-semibold text-green-700">無料プラン: 月5クレジット</p>
                                <p className="font-semibold text-yellow-700">Premium: 月100クレジット</p>
                            </div>
                        </div>
                    </div>

                    <h4 className="font-bold text-gray-800 mt-4">レポート保存</h4>
                    <p className="text-sm">生成されたレポートを保存して、後から見返すことができます。</p>
                </div>
            </>
        ),
        template: (
            <>
                <h3>テンプレートの使い方</h3>
                <p>よく使う食事・運動・サプリメントを「テンプレート」として保存して、記録作業を効率化しましょう。</p>

                <h4>テンプレートの作成</h4>
                <ol>
                    <li>通常通り食事・運動・サプリを記録</li>
                    <li>「テンプレートとして保存」ボタンをクリック</li>
                    <li>テンプレート名を入力して保存</li>
                </ol>

                <h4>テンプレートの使用</h4>
                <ol>
                    <li>記録画面で「テンプレート」を選択</li>
                    <li>使用したいテンプレートを選択</li>
                    <li>内容を確認して記録</li>
                </ol>
            </>
        ),
        routine: (
            <>
                <h3>ルーティンの使い方</h3>
                <p>ルーティン機能を使うと、毎日・特定の曜日に決まった記録を自動で追加できます。</p>

                <h4>ルーティンの作成</h4>
                <ol>
                    <li>設定画面の「ルーティン」セクションを開く</li>
                    <li>「新規ルーティン追加」をクリック</li>
                    <li>ルーティン名・タイプ（食事/運動/サプリ）を設定</li>
                    <li>実行曜日を選択</li>
                    <li>内容を設定して保存</li>
                </ol>

                <h4>自動記録</h4>
                <p>設定した曜日になると、自動的にダッシュボードに追加されます。</p>
            </>
        ),
        history: (
            <>
                <h3>履歴の見方</h3>
                <p>過去の記録をグラフで視覚化して、トレンドを把握しましょう。</p>

                <h4>表示できるグラフ</h4>
                <ul>
                    <li><strong>体重・体脂肪率</strong>: 体組成の推移</li>
                    <li><strong>PFCバランス</strong>: 栄養バランスの推移</li>
                    <li><strong>カロリー</strong>: 摂取カロリーの推移</li>
                    <li><strong>運動時間</strong>: トレーニング量の推移</li>
                    <li><strong>コンディション</strong>: 体調スコアの推移</li>
                </ul>

                <h4>期間の選択</h4>
                <p>1週間・1ヶ月・3ヶ月・1年など、期間を選択して表示できます。</p>
            </>
        ),
        community: (
            <>
                <h3>コミュニティの使い方</h3>
                <p>他のユーザーと交流して、モチベーションを高めましょう。</p>

                <h4>できること</h4>
                <ul>
                    <li><strong>投稿閲覧</strong>: 他のユーザーの投稿を見る</li>
                    <li><strong>いいね・コメント</strong>: 投稿にリアクション</li>
                    <li><strong>自分で投稿</strong>: 成果や経験をシェア</li>
                </ul>

                <h4>投稿の作成</h4>
                <ol>
                    <li>コミュニティ画面右下の「＋」ボタン</li>
                    <li>写真・テキストを入力</li>
                    <li>投稿ボタンをクリック</li>
                </ol>

                <p className="text-sm text-gray-600 mt-4">※投稿は管理者承認後に公開されます</p>
            </>
        ),
        settings: (
            <>
                <h3>設定項目の説明</h3>
                <p>各種設定を行い、アプリをカスタマイズしましょう。</p>

                <h4>プロフィール設定</h4>
                <ul>
                    <li><strong>基本情報</strong>: 身長・体重・体脂肪率</li>
                    <li><strong>目標</strong>: 減量・増量・維持など</li>
                    <li><strong>活動レベル</strong>: 日常の運動量</li>
                </ul>

                <h4>Premium会員</h4>
                <p>Premium会員になると、すべての機能が使い放題になります。</p>

                <h4>アカウント管理</h4>
                <ul>
                    <li><strong>メールアドレス変更</strong>: ログインメールの変更</li>
                    <li><strong>パスワード変更</strong>: セキュリティ強化</li>
                    <li><strong>2段階認証</strong>: SMS認証の設定</li>
                </ul>

                <h4>データ管理</h4>
                <ul>
                    <li><strong>カスタムアイテム</strong>: 自分で作成した食材・料理</li>
                    <li><strong>テンプレート</strong>: 保存したテンプレートの管理</li>
                    <li><strong>エクスポート</strong>: データのバックアップ</li>
                </ul>
            </>
        ),
        privacy: (
            <div className="h-[70vh]">
                <iframe src="/privacy.html" className="w-full h-full border-0 rounded"></iframe>
            </div>
        ),
        terms: (
            <div className="h-[70vh]">
                <iframe src="/terms.html" className="w-full h-full border-0 rounded"></iframe>
            </div>
        ),
        calorie_adjustment: (
            <>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">カロリー調整値について</h3>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700 mb-3">
                            目的に応じたデフォルト値が自動的に設定されます：
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-2 text-sm text-gray-700">
                            <li><strong>減量（ダイエット）</strong>: -300kcal</li>
                            <li><strong>増量（バルクアップ）</strong>: +300kcal</li>
                            <li><strong>メンテナンス</strong>: 0kcal</li>
                            <li><strong>リコンプ</strong>: 0kcal</li>
                        </ul>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <Icon name="Lightbulb" size={18} />
                            使い方
                        </p>
                        <p className="text-sm text-gray-700">
                            微調整したい場合のみ、この欄に数値を入力してください。<br />
                            わからない場合は<strong>空欄のまま</strong>でOKです。デフォルト値が自動適用されます。
                        </p>
                    </div>
                </div>
            </>
        ),
        rm_update: (
            <>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">RM更新記録について</h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="font-semibold text-orange-900 mb-2">RM（Rep Maximum）とは？</p>
                        <p className="text-sm text-gray-700 mb-2">
                            特定の回数だけ持ち上げられる最大重量のことです。
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1 text-sm text-gray-700">
                            <li><strong>1RM</strong>: 1回だけ持ち上げられる最大重量</li>
                            <li><strong>5RM</strong>: 5回だけ持ち上げられる最大重量</li>
                            <li><strong>10RM</strong>: 10回だけ持ち上げられる最大重量</li>
                        </ul>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                            <Icon name="TrendingUp" size={18} />
                            RM更新記録の使い方
                        </p>
                        <p className="text-sm text-gray-700">
                            自己ベストを更新した時に記録します。進捗を可視化して、モチベーションアップに繋げましょう。
                        </p>
                        <p className="text-xs text-amber-800 mt-2">
                            💡 <strong>任意項目</strong>です。記録しなくても問題ありません。
                        </p>
                    </div>
                </div>
            </>
        ),
        total_time: (
            <>
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-800">総時間について</h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="font-semibold text-orange-900 mb-2">総時間とは？</p>
                        <p className="text-sm text-gray-700">
                            そのトレーニング種目にかかった合計時間（ウォームアップ、セット間の休憩時間を含む）を分単位で記録します。
                        </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                            <Icon name="Clock" size={18} />
                            使い方
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-1 text-sm text-gray-700">
                            <li>トレーニング全体の時間管理に役立ちます</li>
                            <li>消費カロリー計算にも使用されます</li>
                            <li><strong>任意項目</strong>です。記録しなくても問題ありません</li>
                        </ul>
                    </div>
                </div>
            </>
        )
    };

    return contents[type] || <p>説明が見つかりません。</p>;
};

// グローバルに公開
window.SettingsView = SettingsView;
