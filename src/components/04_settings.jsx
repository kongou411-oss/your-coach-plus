import React from 'react';
import toast from 'react-hot-toast';

// ===== 確認モーダルコンポーネント =====
const ConfirmModal = ({ show, title, message, onConfirm, onCancel }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-4 dark:text-white">{title}</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                        確認
                    </button>
                </div>
            </div>
        </div>
    );
};

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

    // 確認モーダルstate
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });


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

    // テンプレート読み込み
    useEffect(() => {
        loadTemplates();
    }, []);

    // クレジット情報読み込み（新システム）
    useEffect(() => {
        loadCreditInfo();
    }, [userId, userProfile]);

    // ========== 通知関連（凍結 2025-11-10） ==========
    /*
    // 初期設定時に通知スケジュールを自動保存
    useEffect(() => {
        const initializeNotificationSchedule = async () => {
            // 通知設定が存在し、かつ通知権限が許可されている場合のみ実行
            if (profile.notificationSettings && NotificationService.checkPermission() === 'granted') {
                try {
                    const result = await NotificationService.scheduleNotification(userId, profile.notificationSettings);
                    if (result.success) {
                        console.log('[Settings] Initial notification schedule saved:', result.schedules);
                    }
                } catch (error) {
                    console.error('[Settings] Failed to initialize notification schedule:', error);
                }
            }
        };

        initializeNotificationSchedule();
    }, [userId, profile.notificationSettings]);
    */

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

    /*
    // 通知設定を更新して自動保存（凍結 2025-11-10）
    const handleNotificationSettingChange = async (newSettings) => {
        const updatedProfile = {
            ...profile,
            notificationSettings: newSettings
        };
        setProfile(updatedProfile);

        // 通知設定のみを保存（fcmTokenを含む他のフィールドを上書きしない）
        try {
            if (DEV_MODE) {
                // DEV_MODEの場合はプロファイル全体を保存
                onUpdateProfile(updatedProfile);
            } else {
                // 本番環境では通知設定のみを更新（merge: trueで他のフィールドを保護）
                await db.collection('users').doc(userId).set({
                    notificationSettings: newSettings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 通知をスケジュール（これはnotificationSchedulesフィールドのみを更新）
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
    */

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

    // 確認モーダルを表示するヘルパー関数
    const showConfirm = (title, message, onConfirm) => {
        return new Promise((resolve) => {
            setConfirmModal({
                show: true,
                title,
                message,
                onConfirm: () => {
                    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
                    onConfirm();
                    resolve(true);
                }
            });
        });
    };

    const hideConfirm = () => {
        setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
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
        showConfirm(
            'データ削除の確認',
            '本当に全データを削除しますか？この操作は取り消せません。',
            () => {
                localStorage.clear();
                toast.success('データを削除しました。ページをリロードしてください。');
            }
        );
    };

    // フィードバック送信
    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) {
            toast.error('フィードバック内容を入力してください');
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
            toast.error('フィードバックの送信に失敗しました: ' + error.message);
        } finally {
            setFeedbackSending(false);
        }
    };

    return (
        <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden slide-up">
                {/* ヘッダー（固定） */}
                <div className="flex-shrink-0 bg-white border-b p-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold">設定</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <Icon name="X" size={20} />
                    </button>
                </div>

                {/* スクロール可能なコンテンツエリア */}
                <div className="flex-1 overflow-y-auto">
                    {/* 設定メニュー）折りたたみ式一覧を*/}
                    <div className="p-6 space-y-3">
                    {/* 使い方 */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="BookOpen" size={18} className="text-blue-600" />
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
                    <details className="border rounded-lg border-amber-200 bg-[#FFF59A]/10">
                        <summary className="cursor-pointer p-4 hover:bg-amber-100 font-medium flex items-center gap-2">
                            <Icon name="Crown" size={18} className="text-amber-600" />
                            プレミアム
                            {(userProfile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE) && (
                                <span className="ml-2 px-2 py-0.5 bg-[#FFF59A] text-gray-800 text-xs rounded-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                    <span className="relative z-10">Premium会員</span>
                                </span>
                            )}
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t border-amber-200">
                            <div className="space-y-4">
                                {(() => {
                                    const isPremium = userProfile?.subscriptionStatus === 'active' || DEV_PREMIUM_MODE;
                                    const isTrial = usageDays <= 7;
                                    const daysRemaining = isTrial ? Math.max(0, 8 - usageDays) : 0;

                                    if (isPremium) {
                                        // Premium会員
                                        return (
                                            <div className="bg-white p-4 rounded-lg border border-amber-200">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Icon name="Crown" size={24} className="text-amber-600" />
                                                    <div>
                                                        <p className="font-bold text-gray-800">Premium会員</p>
                                                        <p className="text-sm text-gray-600">すべての機能が利用可能</p>
                                                    </div>
                                                </div>

                                                <div className="bg-[#FFF59A]/10 p-4 rounded-lg border border-amber-200 mb-3">
                                                    <p className="text-sm font-medium text-gray-700 mb-1">月額料金</p>
                                                    <p className="text-3xl font-bold text-amber-600">¥740</p>
                                                    <p className="text-xs text-gray-500 mt-1">税込</p>
                                                </div>

                                                <button
                                                    className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300"
                                                    onClick={() => showConfirm('サブスクリプション解約の確認', 'サブスクリプションを解約しますか？', () => toast('解約処理は実装予定！'))}
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
                                                    className="w-full bg-[#FFF59A] text-gray-800 font-bold py-3 rounded-lg hover:opacity-90 relative overflow-hidden"
                                                    onClick={() => toast('サブスクリプション画面は実装予定！')}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                                    <span className="relative z-10">月額740円でPremium登録</span>
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
                                                    className="w-full bg-[#FFF59A] text-gray-800 font-bold py-3 rounded-lg hover:opacity-90 relative overflow-hidden"
                                                    onClick={() => toast('サブスクリプション画面は実装予定！')}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                                    <span className="relative z-10">月額740円でPremium登録</span>
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
                            <Icon name="UserCircle" size={18} className="text-blue-600" />
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
                                                {(() => {
                                                    // createdAt, joinDate, registrationDateのいずれかを使用
                                                    const dateField = userProfile.createdAt || userProfile.joinDate || userProfile.registrationDate;
                                                    if (!dateField) return '不明';

                                                    // Firestore Timestampの場合
                                                    if (dateField.toDate && typeof dateField.toDate === 'function') {
                                                        return dateField.toDate().toLocaleDateString('ja-JP');
                                                    }
                                                    // ISO文字列の場合
                                                    return new Date(dateField).toLocaleDateString('ja-JP');
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 経験値・レベル情報 */}
                                {expData && (
                                    <div className="bg-[#FFF59A]/10 border-2 border-amber-200 p-4 rounded-lg">
                                        <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                                            <Icon name="Award" size={14} className="text-amber-600" />
                                            経験値・レベル
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-600">現在のレベル</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-amber-600 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                                                        {expData.level}
                                                    </div>
                                                    <span className="font-bold text-amber-600">Level {expData.level}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                                                    <span>次のレベルまで</span>
                                                    <span className="font-semibold">{expData.expCurrent} / {expData.expRequired} XP</span>
                                                </div>
                                                <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(expData.expProgress || 0, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-amber-200">
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
                                                    <p className="font-bold text-amber-600">{expData.paidCredits}</p>
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
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h4 className="font-bold text-sm text-blue-900 mb-2">パスワード</h4>
                                    <button
                                        onClick={async () => {
                                            const email = userProfile.email;
                                            if (email) {
                                                try {
                                                    await firebase.auth().sendPasswordResetEmail(email);
                                                    toast.success('パスワードリセットメールを送信しました。メールをご確認ください。');
                                                } catch (error) {
                                                    toast.error('エラー: ' + error.message);
                                                }
                                            } else {
                                                toast('メールアドレスが設定されていません');
                                            }
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                                    >
                                        パスワードをリセット
                                    </button>
                                </div>

                                {/* 2段階認証 */}
                                <div className="border-l-4 border-blue-500 pl-4">
                                    <h4 className="font-bold text-sm text-blue-900 mb-2 flex items-center gap-2">
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
                                                onClick={() => {
                                                    showConfirm('2FA解除の確認', '2FAを解除しますか？セキュリティが低下します。', async () => {
                                                        const result = await MFAService.unenrollMFA();
                                                        if (result.success) {
                                                            setMfaEnrolled(false);
                                                            toast('2FAを解除しました');
                                                        } else {
                                                            toast.error('エラー: ' + result.error);
                                                        }
                                                    });
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
                                        onClick={() => {
                                            showConfirm(
                                                'アカウント削除の確認',
                                                '本当にアカウントを削除しますか？この操作は取り消せません。',
                                                () => {
                                                    showConfirm(
                                                        '最終確認',
                                                        'すべてのデータが完全に削除されます。本当によろしいですか？',
                                                        async () => {
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
                                                                            toast('再認証がキャンセルされました。アカウント削除を中止します。');
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
                                                                            toast.error('再認証に失敗しました。ログアウトして再度ログイン後、アカウント削除を実行してください。');
                                                                            window.location.reload();
                                                                            return;
                                                                        }
                                                                        throw authError;
                                                                    }

                                                                    // すべて成功したら、LocalStorageをクリア
                                                                    console.log('[Account Delete] Clearing all localStorage data');
                                                                    localStorage.clear();
                                                                    toast.success('アカウントを削除しました');
                                                                    // ページをリロードして状態をリセット
                                                                    window.location.reload();
                                                                }
                                                            } catch (error) {
                                                                console.error('[Account Delete] Error:', error);
                                                                toast.error('アカウント削除中にエラーが発生しました: ' + error.message);
                                                            }
                                                        }
                                                    );
                                                }
                                            );
                                        }}
                                        className="text-sm text-red-600 hover:text-red-700 underline"
                                    >
                                        アカウントを削除
                                    </button>
                                </div>

                                <button
                                    className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700"
                                    onClick={() => {
                                        showConfirm(
                                            'ログアウトの確認',
                                            '本当にログアウトしますか？',
                                            () => {
                                                // LocalStorageをクリア（オンボーディング状態や機能開放状態をリセット）
                                                console.log('[Logout] Clearing all localStorage data');
                                                localStorage.clear();
                                                // ログアウト実行
                                                auth.signOut();
                                            }
                                        );
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
                            <Icon name="User" size={18} className="text-blue-600" />
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
                                                <h5 className="font-bold text-blue-700 mb-2 flex items-center gap-1">
                                                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
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
                                                <div className="bg-teal-50 p-3 rounded-lg border border-teal-300">
                                                    <p className="text-xs font-medium text-teal-700">理想のLBMを自動計算！</p>
                                                    <p className="text-lg font-bold text-teal-600 mt-1">
                                                        {profile.idealLBM.toFixed(1)} kg
                                                    </p>
                                                    <p className="text-xs text-teal-600 mt-1">
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
                                                                toast('1.0から2.5の間の数値を入力してください');
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
                                    <div className="border-l-4 border-blue-500 pl-4">
                                        <h4 className="text-xs font-bold text-blue-700 mb-2">STEP 4: PFCバランス設定</h4>

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
                                                            ? 'border-amber-500 bg-amber-50 shadow-md'
                                                            : 'border-gray-200 bg-white hover:border-amber-300'
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
                            <Icon name="Zap" size={18} className="text-blue-600" />
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
                                    <Icon name="ChevronRight" size={16} className="text-blue-600" />
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
                                    <Icon name="ChevronLeft" size={16} className="text-blue-600" />
                                    <span className="text-sm font-medium">右側を表示</span>
                                </label>
                            </div>

                            {/* 左側ショートカット */}
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Icon name="ChevronRight" size={16} className="text-blue-600" />
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
                                            { action: 'open_history', label: '履歴', icon: 'TrendingUp', color: 'text-blue-600' },
                                            { action: 'open_pgbase', label: 'PGBASE', icon: 'BookOpen', color: 'text-cyan-600' },
                                            { action: 'open_community', label: 'COMY', icon: 'Users', color: 'text-blue-600' },
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
                                    <Icon name="ChevronLeft" size={16} className="text-blue-600" />
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
                                            { action: 'open_history', label: '履歴', icon: 'TrendingUp', color: 'text-blue-600' },
                                            { action: 'open_pgbase', label: 'PGBASE', icon: 'BookOpen', color: 'text-cyan-600' },
                                            { action: 'open_community', label: 'COMY', icon: 'Users', color: 'text-blue-600' },
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
                            <Icon name="BookTemplate" size={18} className="text-blue-600" />
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
                                            className="px-3 py-1 bg-[#4A9EFF] text-white text-xs rounded-lg hover:bg-[#3b8fef] transition flex items-center gap-1"
                                        >
                                            <Icon name="Plus" size={14} />
                                            作成
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
                                                                className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                                            >
                                                                <Icon name="Edit" size={18} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    showConfirm('テンプレート削除の確認', 'このテンプレートを削除しますか？', async () => {
                                                                        await DataService.deleteMealTemplate(userId, template.id);
                                                                        await loadTemplates();
                                                                    });
                                                                }}
                                                                className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                            >
                                                                <Icon name="Trash2" size={18} />
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
                                            className="px-3 py-1 bg-[#4A9EFF] text-white text-xs font-bold rounded-lg hover:bg-[#3b8fef] shadow-md transition flex items-center gap-1"
                                        >
                                            <Icon name="Plus" size={14} />
                                            作成
                                        </button>
                                    </div>
                                </div>
                                {workoutTemplates.length === 0 ? (
                                    <p className="text-sm text-gray-500">保存されたテンプレートはありません</p>
                                ) : (
                                    <div className="space-y-2 mt-3">
                                        {workoutTemplates.map(template => {
                                            // 新形式（複数種目）と旧形式（単一種目）の両方に対応
                                            const exercises = template.exercises || (template.exercise ? [{ exercise: template.exercise, sets: template.sets || [] }] : []);
                                            const exerciseCount = exercises.length;
                                            const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
                                            const totalDuration = exercises.reduce((sum, ex) => sum + (ex.sets || []).reduce((s, set) => s + (set.duration || 0), 0), 0);

                                            return (
                                                <details key={template.id} className="bg-gray-50 p-3 rounded-lg">
                                                    <summary className="flex items-center justify-between cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{template.name}</p>
                                                            <p className="text-xs text-gray-600">
                                                                {exerciseCount}種目 | {totalSets}セット | {totalDuration}分
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setTemplateEditType('workout');
                                                                    setShowTemplateEditModal(true);
                                                                }}
                                                                className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                                            >
                                                                <Icon name="Edit" size={18} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    showConfirm('テンプレート削除の確認', 'このテンプレートを削除しますか？', async () => {
                                                                        await DataService.deleteWorkoutTemplate(userId, template.id);
                                                                        await loadTemplates();
                                                                    });
                                                                }}
                                                                className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                            >
                                                                <Icon name="Trash2" size={18} />
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
                                        showConfirm('アイテム削除の確認', 'このアイテムを削除しますか？', () => {
                                            const updated = customFoods.filter((_, i) => i !== index);
                                            setCustomFoods(updated);
                                            localStorage.setItem('customFoods', JSON.stringify(updated));
                                        });
                                    };

                                    const deleteAllByType = (itemType) => {
                                        const typeName = itemType === 'food' ? '食材' : itemType === 'recipe' ? '料理' : 'サプリ';
                                        showConfirm('全削除の確認', `すべての${typeName}を削除しますか？`, () => {
                                            const updated = customFoods.filter(item => item.itemType !== itemType);
                                            setCustomFoods(updated);
                                            localStorage.setItem('customFoods', JSON.stringify(updated));
                                        });
                                    };

                                    const editItem = (item, index) => {
                                        // TODO: Open edit modal with the same form as custom creation
                                        toast('編集機能は次の更新で実装予定です');
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
                            <Icon name="Repeat" size={18} className="text-blue-600" />
                            ルーティン
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t">
                            {/* ルーティン作成 */}
                            <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-bold text-blue-900 mb-2">ルーティン管理</h4>
                                <p className="text-sm text-blue-700">
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
                                        toast('ルーティンは最大12個（Day7 + 追加5枠）まで設定できます');
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
                                        toast.error('Day1~7は削除できません');
                                        return;
                                    }
                                    showConfirm('追加枠削除の確認', 'この追加枠を削除しますか？', () => {
                                        const updated = localRoutines.filter(r => r.id !== id);
                                        saveRoutines(updated);
                                    });
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
                                                className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition font-medium"
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
                                                    className="px-6 py-3 bg-[#4A9EFF] text-white rounded-lg font-bold hover:bg-[#3b8fef] shadow-lg transition"
                                                >
                                                    開始                                                </button>
                                            </div>
                                        )}

                                        {/* 管理用ボタン */}
                                        {localRoutines.length > 0 && (
                                            <div className="flex gap-3 pt-4 border-t">
                                                <button
                                                    onClick={() => {
                                                        showConfirm('ルーティンリセットの確認', 'ルーティンをリセットしますか？', () => {
                                                            localStorage.removeItem(STORAGE_KEYS.ROUTINES);
                                                            localStorage.removeItem(STORAGE_KEYS.ROUTINE_START_DATE);
                                                            localStorage.removeItem(STORAGE_KEYS.ROUTINE_ACTIVE);
                                                            window.location.reload();
                                                        });
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

                    {/* ========== 通知設定（凍結 2025-11-10）========== */}
                    {/* 通知機能は凍結されました。実装内容は NOTIFICATION_IMPLEMENTATION_ARCHIVE.md を参照してください */}
                    {/* ========== 通知設定ここまで ========== */}

                    {/* データ管理*/}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Database" size={18} className="text-blue-600" />
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
                                        onClick={() => {
                                            showConfirm('キャッシュクリアの確認', 'すべてのキャッシュをクリアしますか？\n（通知設定やユーザーデータは保持されます）', async () => {
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

                                                    toast('キャッシュをクリアしました。\nページをリロードします。');
                                                    window.location.reload(true);
                                                } catch (error) {
                                                    console.error('[Cache] Failed to clear cache:', error);
                                                    toast.error('キャッシュクリアに失敗しました: ' + error.message);
                                                }
                                            });
                                        }}
                                        className="w-full px-4 py-2 bg-[#4A9EFF] text-white font-bold rounded-lg hover:bg-[#3b8fef] shadow-lg transition flex items-center justify-center gap-2"
                                    >
                                        <Icon name="RefreshCw" size={16} />
                                        クリア
                                    </button>
                                    <p className="text-xs text-gray-500">
                                        ※ 通知設定、記録、プロフィールなどのユーザーデータは削除されません
                                    </p>
                                </div>
                            </div>

                            {/* カスタムアイテム管理 */}
                            {(() => {
                                const [customItemTab, setCustomItemTab] = React.useState('food');
                                const [customFoods, setCustomFoods] = React.useState([]);
                                const [loading, setLoading] = React.useState(false);
                                const [showEditModal, setShowEditModal] = React.useState(false);
                                const [editingItem, setEditingItem] = React.useState(null);

                                // Firestoreから読み込み
                                const loadCustomFoods = async () => {
                                    if (!userId) {
                                        console.log('[Settings] ユーザーIDがないためスキップ');
                                        return;
                                    }

                                    setLoading(true);
                                    try {
                                        console.log('[Settings] customFoods読み込み開始...');
                                        const customFoodsSnapshot = await firebase.firestore()
                                            .collection('users')
                                            .doc(userId)
                                            .collection('customFoods')
                                            .get();

                                        const foods = customFoodsSnapshot.docs.map(doc => ({
                                            id: doc.id,
                                            ...doc.data()
                                        }));

                                        setCustomFoods(foods);
                                        console.log(`[Settings] customFoods読み込み完了: ${foods.length}件`);
                                    } catch (error) {
                                        console.error('[Settings] customFoods読み込みエラー:', error);
                                        toast.error('読み込みに失敗しました');
                                    } finally {
                                        setLoading(false);
                                    }
                                };

                                // 初回読み込み
                                React.useEffect(() => {
                                    loadCustomFoods();
                                }, [userId]);

                                // itemTypeが未設定の古いデータはデフォルトで'food'として扱う
                                const foodItems = customFoods.filter(item => !item.itemType || item.itemType === 'food');
                                const recipeItems = customFoods.filter(item => item.itemType === 'recipe');
                                const supplementItems = customFoods.filter(item => item.itemType === 'supplement');

                                const deleteItem = async (item) => {
                                    showConfirm('アイテム削除の確認', `「${item.name}」を削除しますか？`, async () => {
                                        try {
                                            await firebase.firestore()
                                                .collection('users')
                                                .doc(userId)
                                                .collection('customFoods')
                                                .doc(item.name)
                                                .delete();

                                            console.log(`[Settings] カスタムアイテムを削除: ${item.name}`);
                                            toast.success('削除しました');
                                            loadCustomFoods(); // 再読み込み
                                        } catch (error) {
                                            console.error('[Settings] 削除エラー:', error);
                                            toast.error('削除に失敗しました');
                                        }
                                    });
                                };

                                const deleteAllByType = async (itemType) => {
                                    const typeName = itemType === 'food' ? '食材' : itemType === 'recipe' ? '料理' : 'サプリ';
                                    const itemsToDelete = customFoods.filter(item =>
                                        itemType === 'food' ? (!item.itemType || item.itemType === 'food') : item.itemType === itemType
                                    );

                                    showConfirm('全削除の確認', `すべての${typeName}（${itemsToDelete.length}件）を削除しますか？`, async () => {
                                        try {
                                            const batch = firebase.firestore().batch();
                                            itemsToDelete.forEach(item => {
                                                const docRef = firebase.firestore()
                                                    .collection('users')
                                                    .doc(userId)
                                                    .collection('customFoods')
                                                    .doc(item.name);
                                                batch.delete(docRef);
                                            });

                                            await batch.commit();
                                            console.log(`[Settings] ${typeName}を全削除: ${itemsToDelete.length}件`);
                                            toast.success(`${typeName}を全削除しました`);
                                            loadCustomFoods(); // 再読み込み
                                        } catch (error) {
                                            console.error('[Settings] 全削除エラー:', error);
                                            toast.error('削除に失敗しました');
                                        }
                                    });
                                };

                                const editItem = (item) => {
                                    // vitamins/mineralsをフラットな構造に展開
                                    const editData = {
                                        name: item.name,
                                        itemType: item.itemType || 'food',
                                        category: item.category || '穀類',
                                        servingSize: item.servingSize || 100,
                                        servingUnit: item.servingUnit || 'g',
                                        calories: item.calories || 0,
                                        protein: item.protein || 0,
                                        fat: item.fat || 0,
                                        carbs: item.carbs || 0,
                                        // ビタミン
                                        vitaminA: item.vitamins?.A || 0,
                                        vitaminB1: item.vitamins?.B1 || 0,
                                        vitaminB2: item.vitamins?.B2 || 0,
                                        vitaminB6: item.vitamins?.B6 || 0,
                                        vitaminB12: item.vitamins?.B12 || 0,
                                        vitaminC: item.vitamins?.C || 0,
                                        vitaminD: item.vitamins?.D || 0,
                                        vitaminE: item.vitamins?.E || 0,
                                        vitaminK: item.vitamins?.K || 0,
                                        niacin: item.vitamins?.niacin || 0,
                                        pantothenicAcid: item.vitamins?.pantothenicAcid || 0,
                                        biotin: item.vitamins?.biotin || 0,
                                        folicAcid: item.vitamins?.folicAcid || 0,
                                        // ミネラル
                                        sodium: item.minerals?.sodium || 0,
                                        potassium: item.minerals?.potassium || 0,
                                        calcium: item.minerals?.calcium || 0,
                                        magnesium: item.minerals?.magnesium || 0,
                                        phosphorus: item.minerals?.phosphorus || 0,
                                        iron: item.minerals?.iron || 0,
                                        zinc: item.minerals?.zinc || 0,
                                        copper: item.minerals?.copper || 0,
                                        manganese: item.minerals?.manganese || 0,
                                        iodine: item.minerals?.iodine || 0,
                                        selenium: item.minerals?.selenium || 0,
                                        chromium: item.minerals?.chromium || 0,
                                        molybdenum: item.minerals?.molybdenum || 0,
                                        // その他
                                        otherNutrients: item.otherNutrients || []
                                    };
                                    setEditingItem(editData);
                                    setShowEditModal(true);
                                };

                                return (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-bold text-blue-800">カスタムアイテム管理</h4>
                                            <button
                                                onClick={loadCustomFoods}
                                                disabled={loading}
                                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition flex items-center gap-1 disabled:opacity-50"
                                            >
                                                <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
                                                更新
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">AI解析や手動で作成した食材・料理・サプリを管理できます。</p>

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
                                                            {foodItems.map((item, idx) => (
                                                                <div key={item.id || idx} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-medium text-sm">{item.name}</p>
                                                                            {item.customLabel && (
                                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                                    {item.customLabel}
                                                                                </span>
                                                                            )}
                                                                            {item.category && item.category !== 'カスタム食材' && (
                                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                                    {item.category}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-gray-600">
                                                                            {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => editItem(item)}
                                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                        >
                                                                            <Icon name="Edit" size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteItem(item)}
                                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
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
                                                            {recipeItems.map((item, idx) => (
                                                                <div key={item.id || idx} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-medium text-sm">{item.name}</p>
                                                                            {item.customLabel && (
                                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                                    {item.customLabel}
                                                                                </span>
                                                                            )}
                                                                            {item.category && item.category !== 'カスタム料理' && (
                                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                                    {item.category}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-gray-600">
                                                                            {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => editItem(item)}
                                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                        >
                                                                            <Icon name="Edit" size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteItem(item)}
                                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
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
                                                            {supplementItems.map((item, idx) => (
                                                                <div key={item.id || idx} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-medium text-sm">{item.name}</p>
                                                                            {item.customLabel && (
                                                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                                                    {item.customLabel}
                                                                                </span>
                                                                            )}
                                                                            {item.category && item.category !== 'カスタムサプリ' && (
                                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                                                    {item.category}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-gray-600">
                                                                            {item.servingSize}{item.servingUnit}あたり | {item.calories}kcal | P:{item.protein}g F:{item.fat}g C:{item.carbs}g
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => editItem(item)}
                                                                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                                                        >
                                                                            <Icon name="Edit" size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deleteItem(item)}
                                                                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                                                        >
                                                                            <Icon name="Trash2" size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* 編集モーダル */}
                                        {showEditModal && editingItem && (
                                            <div className="fixed inset-0 bg-black bg-opacity-60 z-[10000] flex items-center justify-center p-4">
                                                <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
                                                    {/* ヘッダー */}
                                                    <div className="sticky top-0 bg-[#4A9EFF] text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                                            <Icon name="Edit" size={20} />
                                                            カスタムアイテムを編集
                                                        </h3>
                                                        <button
                                                            onClick={() => {
                                                                setShowEditModal(false);
                                                                setEditingItem(null);
                                                            }}
                                                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                                                        >
                                                            <Icon name="X" size={20} />
                                                        </button>
                                                    </div>

                                                    <div className="p-6 space-y-4">
                                                        {/* 名前 */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                                                            <input
                                                                type="text"
                                                                value={editingItem.name}
                                                                onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                                                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                            />
                                                        </div>

                                                        {/* カテゴリ */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                                                            <select
                                                                value={editingItem.itemType}
                                                                onChange={(e) => setEditingItem({...editingItem, itemType: e.target.value})}
                                                                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                            >
                                                                <option value="food">食材</option>
                                                                <option value="recipe">料理</option>
                                                                <option value="supplement">サプリ</option>
                                                            </select>
                                                        </div>

                                                        {/* サブカテゴリ & 1回分の量 */}
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                <label className="block text-xs text-gray-600 mb-1">サブカテゴリ</label>
                                                                <input
                                                                    type="text"
                                                                    value={editingItem.category}
                                                                    onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                                                                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-gray-600 mb-1">1回分の量</label>
                                                                <div className="flex gap-1">
                                                                    <input
                                                                        type="number"
                                                                        value={editingItem.servingSize}
                                                                        onChange={(e) => setEditingItem({...editingItem, servingSize: parseFloat(e.target.value) || 0})}
                                                                        className="w-20 px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-center"
                                                                    />
                                                                    <select
                                                                        value={editingItem.servingUnit}
                                                                        onChange={(e) => setEditingItem({...editingItem, servingUnit: e.target.value})}
                                                                        className="w-16 px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                                    >
                                                                        <option value="g">g</option>
                                                                        <option value="mg">mg</option>
                                                                        <option value="ml">ml</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* 基本栄養素 */}
                                                        <div className="border-t pt-4">
                                                            <p className="text-sm font-medium text-gray-700 mb-2">
                                                                基本栄養素（{editingItem.servingSize}{editingItem.servingUnit}あたり）
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-xs text-gray-600">カロリー (kcal)</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        value={editingItem.calories || ''}
                                                                        onChange={(e) => setEditingItem({...editingItem, calories: parseFloat(e.target.value) || 0})}
                                                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">タンパク質 (g)</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        value={editingItem.protein || ''}
                                                                        onChange={(e) => setEditingItem({...editingItem, protein: parseFloat(e.target.value) || 0})}
                                                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">脂質 (g)</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        value={editingItem.fat || ''}
                                                                        onChange={(e) => setEditingItem({...editingItem, fat: parseFloat(e.target.value) || 0})}
                                                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">炭水化物 (g)</label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        value={editingItem.carbs || ''}
                                                                        onChange={(e) => setEditingItem({...editingItem, carbs: parseFloat(e.target.value) || 0})}
                                                                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ビタミン */}
                                                        <div className="border-t pt-4">
                                                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                                <Icon name="Droplet" size={16} className="text-orange-500" />
                                                                ビタミン
                                                            </p>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div>
                                                                    <label className="text-xs text-gray-600">A (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.vitaminA || ''} onChange={(e) => setEditingItem({...editingItem, vitaminA: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">B1 (mg)</label>
                                                                    <input type="number" step="0.01" value={editingItem.vitaminB1 || ''} onChange={(e) => setEditingItem({...editingItem, vitaminB1: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">B2 (mg)</label>
                                                                    <input type="number" step="0.01" value={editingItem.vitaminB2 || ''} onChange={(e) => setEditingItem({...editingItem, vitaminB2: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">B6 (mg)</label>
                                                                    <input type="number" step="0.01" value={editingItem.vitaminB6 || ''} onChange={(e) => setEditingItem({...editingItem, vitaminB6: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">B12 (μg)</label>
                                                                    <input type="number" step="0.01" value={editingItem.vitaminB12 || ''} onChange={(e) => setEditingItem({...editingItem, vitaminB12: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">C (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.vitaminC || ''} onChange={(e) => setEditingItem({...editingItem, vitaminC: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">D (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.vitaminD || ''} onChange={(e) => setEditingItem({...editingItem, vitaminD: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">E (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.vitaminE || ''} onChange={(e) => setEditingItem({...editingItem, vitaminE: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">K (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.vitaminK || ''} onChange={(e) => setEditingItem({...editingItem, vitaminK: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">ナイアシン (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.niacin || ''} onChange={(e) => setEditingItem({...editingItem, niacin: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">パントテン酸 (mg)</label>
                                                                    <input type="number" step="0.01" value={editingItem.pantothenicAcid || ''} onChange={(e) => setEditingItem({...editingItem, pantothenicAcid: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">ビオチン (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.biotin || ''} onChange={(e) => setEditingItem({...editingItem, biotin: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">葉酸 (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.folicAcid || ''} onChange={(e) => setEditingItem({...editingItem, folicAcid: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ミネラル */}
                                                        <div className="border-t pt-4">
                                                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                                <Icon name="Gem" size={16} className="text-blue-500" />
                                                                ミネラル
                                                            </p>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <div>
                                                                    <label className="text-xs text-gray-600">ナトリウム (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.sodium || ''} onChange={(e) => setEditingItem({...editingItem, sodium: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">カリウム (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.potassium || ''} onChange={(e) => setEditingItem({...editingItem, potassium: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">カルシウム (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.calcium || ''} onChange={(e) => setEditingItem({...editingItem, calcium: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">マグネシウム (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.magnesium || ''} onChange={(e) => setEditingItem({...editingItem, magnesium: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">リン (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.phosphorus || ''} onChange={(e) => setEditingItem({...editingItem, phosphorus: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">鉄 (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.iron || ''} onChange={(e) => setEditingItem({...editingItem, iron: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">亜鉛 (mg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.zinc || ''} onChange={(e) => setEditingItem({...editingItem, zinc: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">銅 (mg)</label>
                                                                    <input type="number" step="0.01" value={editingItem.copper || ''} onChange={(e) => setEditingItem({...editingItem, copper: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">マンガン (mg)</label>
                                                                    <input type="number" step="0.01" value={editingItem.manganese || ''} onChange={(e) => setEditingItem({...editingItem, manganese: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">ヨウ素 (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.iodine || ''} onChange={(e) => setEditingItem({...editingItem, iodine: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">セレン (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.selenium || ''} onChange={(e) => setEditingItem({...editingItem, selenium: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">クロム (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.chromium || ''} onChange={(e) => setEditingItem({...editingItem, chromium: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-gray-600">モリブデン (μg)</label>
                                                                    <input type="number" step="0.1" value={editingItem.molybdenum || ''} onChange={(e) => setEditingItem({...editingItem, molybdenum: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* その他の栄養素 */}
                                                        <div className="border-t pt-4">
                                                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                                <Icon name="Plus" size={16} className="text-purple-500" />
                                                                その他の栄養素
                                                            </p>
                                                            <div className="space-y-2">
                                                                {(editingItem.otherNutrients || []).map((nutrient, idx) => (
                                                                    <div key={idx} className="flex gap-2 items-center">
                                                                        <input
                                                                            type="text"
                                                                            value={nutrient.name || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...(editingItem.otherNutrients || [])];
                                                                                updated[idx] = {...updated[idx], name: e.target.value};
                                                                                setEditingItem({...editingItem, otherNutrients: updated});
                                                                            }}
                                                                            placeholder="栄養素名 (例: クレアチン)"
                                                                            className="flex-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-400 focus:outline-none"
                                                                        />
                                                                        <input
                                                                            type="number"
                                                                            step="0.1"
                                                                            value={nutrient.value || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...(editingItem.otherNutrients || [])];
                                                                                updated[idx] = {...updated[idx], value: parseFloat(e.target.value) || 0};
                                                                                setEditingItem({...editingItem, otherNutrients: updated});
                                                                            }}
                                                                            placeholder="量"
                                                                            className="w-20 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-400 focus:outline-none"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={nutrient.unit || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...(editingItem.otherNutrients || [])];
                                                                                updated[idx] = {...updated[idx], unit: e.target.value};
                                                                                setEditingItem({...editingItem, otherNutrients: updated});
                                                                            }}
                                                                            placeholder="単位"
                                                                            className="w-16 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-400 focus:outline-none"
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const updated = (editingItem.otherNutrients || []).filter((_, i) => i !== idx);
                                                                                setEditingItem({...editingItem, otherNutrients: updated});
                                                                            }}
                                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                                        >
                                                                            <Icon name="X" size={16} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    onClick={() => {
                                                                        const updated = [...(editingItem.otherNutrients || []), {name: '', value: 0, unit: 'g'}];
                                                                        setEditingItem({...editingItem, otherNutrients: updated});
                                                                    }}
                                                                    className="w-full px-3 py-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 transition text-sm flex items-center justify-center gap-1"
                                                                >
                                                                    <Icon name="Plus" size={14} />
                                                                    栄養素を追加
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* 保存ボタン */}
                                                        <div className="flex gap-2 pt-4">
                                                            <button
                                                                onClick={() => {
                                                                    setShowEditModal(false);
                                                                    setEditingItem(null);
                                                                }}
                                                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                                            >
                                                                キャンセル
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const customFood = {
                                                                            name: editingItem.name,
                                                                            category: editingItem.category,
                                                                            itemType: editingItem.itemType,
                                                                            calories: editingItem.calories || 0,
                                                                            protein: editingItem.protein || 0,
                                                                            fat: editingItem.fat || 0,
                                                                            carbs: editingItem.carbs || 0,
                                                                            servingSize: editingItem.servingSize || 100,
                                                                            servingUnit: editingItem.servingUnit || 'g',
                                                                            vitamins: {
                                                                                A: editingItem.vitaminA || 0,
                                                                                B1: editingItem.vitaminB1 || 0,
                                                                                B2: editingItem.vitaminB2 || 0,
                                                                                B6: editingItem.vitaminB6 || 0,
                                                                                B12: editingItem.vitaminB12 || 0,
                                                                                C: editingItem.vitaminC || 0,
                                                                                D: editingItem.vitaminD || 0,
                                                                                E: editingItem.vitaminE || 0,
                                                                                K: editingItem.vitaminK || 0,
                                                                                niacin: editingItem.niacin || 0,
                                                                                pantothenicAcid: editingItem.pantothenicAcid || 0,
                                                                                biotin: editingItem.biotin || 0,
                                                                                folicAcid: editingItem.folicAcid || 0
                                                                            },
                                                                            minerals: {
                                                                                sodium: editingItem.sodium || 0,
                                                                                potassium: editingItem.potassium || 0,
                                                                                calcium: editingItem.calcium || 0,
                                                                                magnesium: editingItem.magnesium || 0,
                                                                                phosphorus: editingItem.phosphorus || 0,
                                                                                iron: editingItem.iron || 0,
                                                                                zinc: editingItem.zinc || 0,
                                                                                copper: editingItem.copper || 0,
                                                                                manganese: editingItem.manganese || 0,
                                                                                iodine: editingItem.iodine || 0,
                                                                                selenium: editingItem.selenium || 0,
                                                                                chromium: editingItem.chromium || 0,
                                                                                molybdenum: editingItem.molybdenum || 0
                                                                            },
                                                                            otherNutrients: editingItem.otherNutrients || [],
                                                                            updatedAt: new Date().toISOString()
                                                                        };

                                                                        await firebase.firestore()
                                                                            .collection('users')
                                                                            .doc(userId)
                                                                            .collection('customFoods')
                                                                            .doc(customFood.name)
                                                                            .set(customFood, { merge: true });

                                                                        console.log(`[Settings] カスタムアイテムを更新: ${customFood.name}`);
                                                                        toast.success('更新しました');
                                                                        loadCustomFoods(); // 再読み込み
                                                                        setShowEditModal(false);
                                                                        setEditingItem(null);
                                                                    } catch (error) {
                                                                        console.error('[Settings] 更新エラー:', error);
                                                                        toast.error('更新に失敗しました');
                                                                    }
                                                                }}
                                                                className="flex-1 px-4 py-3 bg-[#4A9EFF] text-white rounded-lg hover:bg-[#3b8fef] font-bold shadow-md"
                                                            >
                                                                保存
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                                <h4 className="font-bold mb-3 text-blue-800">栄養指標</h4>
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
                            <Icon name="MessageSquare" size={18} className="text-blue-600" />
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

                    {/* 開発者セクション（常時表示・後日非表示か削除予定） */}
                    <details className="border rounded-lg">
                        <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                            <Icon name="Settings" size={18} className="text-blue-600" />
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
                                                    toast('Premium会員に切替え、クレジット100を付与しました');
                                                } else {
                                                    toast('Premium会員に切替えました');
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
                            <div className="border rounded-lg p-6 bg-gray-50">
                                <h4 className="font-bold mb-4 flex items-center gap-2">
                                    <Icon name="Database" size={18} className="text-gray-600" />
                                    ストレージ管理（LocalStorage）
                                </h4>
                                <div className="space-y-3">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
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
                                                            <summary className="cursor-pointer font-mono text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center justify-between">
                                                                <span className="truncate">{key}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        showConfirm('LocalStorageキー削除の確認', `"${key}" を削除しますか？`, () => {
                                                                            localStorage.removeItem(key);
                                                                            window.location.reload();
                                                                        });
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
                                            showConfirm('全LocalStorage削除の確認', 'すべてのLocalStorageデータを削除しますか？\nこの操作は取り消せません。', () => {
                                                localStorage.clear();
                                                toast('LocalStorageをクリアしました');
                                                window.location.reload();
                                            });
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
                                                toast('パスワードが間違っています');
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
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                                        >
                                                            <Icon name="Edit" size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                showConfirm('テンプレート削除の確認', `「${template.name}」を削除しますか？`, async () => {
                                                                    await DataService.deleteMealTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                });
                                                            }}
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                        >
                                                            <Icon name="Trash2" size={18} />
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
                                        const totalDuration = exercises.reduce((sum, ex) => sum + (ex.sets || []).reduce((s, set) => s + (set.duration || 0), 0), 0);

                                        return (
                                            <details key={template.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                <summary className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 -m-3 p-3 rounded-lg">
                                                    <Icon name="Dumbbell" size={18} className="text-orange-600" />
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{template.name}</p>
                                                        <p className="text-xs text-gray-600">
                                                            {exercises.length}種目 | {exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)}セット | {totalDuration}分
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setShowTemplateEditModal(false);
                                                                onOpenAddView && onOpenAddView('workout', true, template);
                                                            }}
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition border-2 border-blue-500"
                                                        >
                                                            <Icon name="Edit" size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                showConfirm('テンプレート削除の確認', `「${template.name}」を削除しますか？`, async () => {
                                                                    await DataService.deleteWorkoutTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                });
                                                            }}
                                                            className="w-10 h-10 rounded-lg bg-white shadow-md flex items-center justify-center text-red-600 hover:bg-red-50 transition border-2 border-red-500"
                                                        >
                                                            <Icon name="Trash2" size={18} />
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
                    <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center z-10">
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
                                        toast.error('エラー: ' + result.error);
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
                                        toast('2FAを設定しました');
                                    } else {
                                        toast.error('エラー: ' + result.error);
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

        {/* 確認モーダル */}
        <ConfirmModal
            show={confirmModal.show}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.onConfirm}
            onCancel={hideConfirm}
        />

        </>
    );
};

// グローバルに公開
window.SettingsView = SettingsView;
