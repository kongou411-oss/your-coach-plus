// ===== Settings Components =====
// TutorialView機能は削除されました（ダミー定義）
const TutorialView = ({ onClose, onComplete }) => {
    return null;
};

// ===== 通知診断コンポーネント =====
const NotificationDiagnostics = ({ userId }) => {
    const [diagData, setDiagData] = useState(null);
    const [loading, setLoading] = useState(false);

    const runDiagnostics = async () => {
        setLoading(true);
        try {
            const data = {
                timestamp: new Date().toLocaleString('ja-JP'),
                permission: 'unsupported',
                fcmSupported: false,
                fcmToken: null,
                fcmTokenShort: null,
                firestoreCheck: null,
                scheduleCheck: null,
                scheduleCount: 0,
                error: null
            };

            // 通知権限チェック
            if ('Notification' in window) {
                data.permission = Notification.permission;
            }

            // 通知スケジュールチェック
            try {
                console.log('[Diagnostics] Checking schedules for userId:', userId);
                console.log('[Diagnostics] DEV_MODE:', DEV_MODE);

                if (!DEV_MODE) {
                    const userDoc = await db.collection('users').doc(userId).get();
                    console.log('[Diagnostics] User doc exists:', userDoc.exists);

                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        console.log('[Diagnostics] User data:', userData);
                        const schedules = userData?.notificationSchedules || [];
                        console.log('[Diagnostics] Schedules:', schedules);

                        data.scheduleCount = schedules.length;
                        data.scheduleCheck = schedules.length > 0 ? 'found' : 'empty';
                        data.scheduleDebug = `Doc exists, ${schedules.length} schedules`;
                    } else {
                        data.scheduleCheck = 'no_user_doc';
                        data.scheduleDebug = 'User document does not exist';
                    }
                } else {
                    const stored = localStorage.getItem('notificationSchedules_' + userId);
                    const schedules = stored ? JSON.parse(stored) : [];
                    data.scheduleCount = schedules.length;
                    data.scheduleCheck = schedules.length > 0 ? 'found' : 'empty';
                    data.scheduleDebug = 'LocalStorage mode';
                }
            } catch (err) {
                console.error('[Diagnostics] Schedule check error:', err);
                data.scheduleCheck = 'error';
                data.scheduleError = err.message;
                data.scheduleDebug = `Error: ${err.message}`;
            }

            // FCMサポートチェック
            if (typeof firebase !== 'undefined' && firebase.messaging && firebase.messaging.isSupported()) {
                data.fcmSupported = true;

                // FCMトークン取得を試行
                try {
                    const result = await NotificationService.getFCMToken(userId);
                    if (result.success) {
                        data.fcmToken = result.token;
                        // トークンの先頭20文字と末尾10文字のみ表示
                        const token = result.token;
                        data.fcmTokenShort = token.length > 30
                            ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}`
                            : token;

                        // Firestoreに保存されているか確認
                        if (!DEV_MODE) {
                            try {
                                const tokenDoc = await db.collection('users')
                                    .doc(userId)
                                    .collection('tokens')
                                    .doc(result.token)
                                    .get();
                                data.firestoreCheck = tokenDoc.exists ? 'saved' : 'not_saved';
                            } catch (err) {
                                data.firestoreCheck = 'error';
                                data.firestoreError = err.message;
                            }
                        } else {
                            data.firestoreCheck = 'dev_mode';
                        }
                    } else {
                        data.error = result.error;
                    }
                } catch (err) {
                    data.error = err.message;
                }
            }

            setDiagData(data);
        } catch (err) {
            setDiagData({
                timestamp: new Date().toLocaleString('ja-JP'),
                error: err.message
            });
        }
        setLoading(false);
    };

    return (
        <div className="space-y-3">
            <div className="bg-purple-100 rounded-lg p-3 border border-purple-200">
                <p className="text-sm text-purple-900 mb-2">
                    <strong>📱 通知が届かない場合の診断ツール</strong>
                </p>
                <p className="text-xs text-purple-800">
                    このボタンをクリックすると、通知機能の状態を詳しく確認できます。
                </p>
            </div>

            <button
                onClick={runDiagnostics}
                disabled={loading}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Icon name="Loader" size={16} className="animate-spin" />
                        診断中...
                    </>
                ) : (
                    <>
                        <Icon name="Activity" size={16} />
                        診断を実行
                    </>
                )}
            </button>

            {diagData && (
                <div className="bg-white rounded-lg p-4 border border-purple-200 space-y-3 text-sm">
                    <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
                        <Icon name="Clock" size={14} className="text-purple-600" />
                        <span className="text-xs text-gray-600">{diagData.timestamp}</span>
                    </div>

                    {/* 通知権限 */}
                    <div className="flex items-start gap-2">
                        <div className="w-32 font-medium text-gray-700">通知権限</div>
                        <div className="flex-1">
                            {diagData.permission === 'granted' && (
                                <span className="text-green-600 flex items-center gap-1">
                                    <Icon name="CheckCircle" size={16} />
                                    許可済み
                                </span>
                            )}
                            {diagData.permission === 'denied' && (
                                <span className="text-red-600 flex items-center gap-1">
                                    <Icon name="XCircle" size={16} />
                                    拒否されています
                                </span>
                            )}
                            {diagData.permission === 'default' && (
                                <span className="text-orange-600 flex items-center gap-1">
                                    <Icon name="AlertCircle" size={16} />
                                    未設定（上の「権限を許可」ボタンを押してください）
                                </span>
                            )}
                            {diagData.permission === 'unsupported' && (
                                <span className="text-gray-600 flex items-center gap-1">
                                    <Icon name="XCircle" size={16} />
                                    このブラウザは非対応
                                </span>
                            )}
                        </div>
                    </div>

                    {/* FCMサポート */}
                    <div className="flex items-start gap-2">
                        <div className="w-32 font-medium text-gray-700">FCM対応</div>
                        <div className="flex-1">
                            {diagData.fcmSupported ? (
                                <span className="text-green-600 flex items-center gap-1">
                                    <Icon name="CheckCircle" size={16} />
                                    対応しています
                                </span>
                            ) : (
                                <span className="text-red-600 flex items-center gap-1">
                                    <Icon name="XCircle" size={16} />
                                    非対応
                                </span>
                            )}
                        </div>
                    </div>

                    {/* FCMトークン */}
                    <div className="flex items-start gap-2">
                        <div className="w-32 font-medium text-gray-700">FCMトークン</div>
                        <div className="flex-1">
                            {diagData.fcmToken ? (
                                <div>
                                    <span className="text-green-600 flex items-center gap-1 mb-1">
                                        <Icon name="CheckCircle" size={16} />
                                        取得成功
                                    </span>
                                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded font-mono break-all">
                                        {diagData.fcmTokenShort}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-red-600 flex items-center gap-1">
                                    <Icon name="XCircle" size={16} />
                                    取得できませんでした
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Firestore保存状態 */}
                    {diagData.firestoreCheck && (
                        <div className="flex items-start gap-2">
                            <div className="w-32 font-medium text-gray-700">Firestore保存</div>
                            <div className="flex-1">
                                {diagData.firestoreCheck === 'saved' && (
                                    <span className="text-green-600 flex items-center gap-1">
                                        <Icon name="CheckCircle" size={16} />
                                        保存されています
                                    </span>
                                )}
                                {diagData.firestoreCheck === 'not_saved' && (
                                    <span className="text-red-600 flex items-center gap-1">
                                        <Icon name="XCircle" size={16} />
                                        保存されていません（再ログインしてください）
                                    </span>
                                )}
                                {diagData.firestoreCheck === 'error' && (
                                    <span className="text-red-600 flex items-center gap-1">
                                        <Icon name="XCircle" size={16} />
                                        確認エラー: {diagData.firestoreError}
                                    </span>
                                )}
                                {diagData.firestoreCheck === 'dev_mode' && (
                                    <span className="text-blue-600 flex items-center gap-1">
                                        <Icon name="Info" size={16} />
                                        開発モード（LocalStorage使用）
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 通知スケジュール */}
                    {diagData.scheduleCheck && (
                        <div className="flex items-start gap-2">
                            <div className="w-32 font-medium text-gray-700">通知スケジュール</div>
                            <div className="flex-1">
                                {diagData.scheduleCheck === 'found' && (
                                    <span className="text-green-600 flex items-center gap-1">
                                        <Icon name="CheckCircle" size={16} />
                                        {diagData.scheduleCount}件設定済み
                                    </span>
                                )}
                                {diagData.scheduleCheck === 'empty' && (
                                    <div>
                                        <span className="text-orange-600 flex items-center gap-1">
                                            <Icon name="AlertCircle" size={16} />
                                            未設定（上の「通知設定を保存」ボタンを押してください）
                                        </span>
                                        {diagData.scheduleDebug && (
                                            <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                                Debug: {diagData.scheduleDebug}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {diagData.scheduleCheck === 'no_user_doc' && (
                                    <div>
                                        <span className="text-red-600 flex items-center gap-1">
                                            <Icon name="XCircle" size={16} />
                                            ユーザードキュメントが見つかりません
                                        </span>
                                        {diagData.scheduleDebug && (
                                            <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                                Debug: {diagData.scheduleDebug}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {diagData.scheduleCheck === 'error' && (
                                    <div>
                                        <span className="text-red-600 flex items-center gap-1">
                                            <Icon name="XCircle" size={16} />
                                            エラー: {diagData.scheduleError}
                                        </span>
                                        {diagData.scheduleDebug && (
                                            <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                                Debug: {diagData.scheduleDebug}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* エラー */}
                    {diagData.error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Icon name="AlertCircle" size={16} className="text-red-600 mt-0.5" />
                                <div>
                                    <div className="font-medium text-red-800 mb-1">エラー</div>
                                    <div className="text-xs text-red-700">{diagData.error}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 推奨アクション */}
                    {diagData.permission !== 'granted' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Icon name="AlertTriangle" size={16} className="text-yellow-600 mt-0.5" />
                                <div className="text-xs text-yellow-800">
                                    <strong>推奨アクション:</strong> 上の「Push通知設定」で「権限を許可」ボタンをクリックしてください。
                                </div>
                            </div>
                        </div>
                    )}
                    {diagData.fcmToken && diagData.firestoreCheck === 'not_saved' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Icon name="AlertTriangle" size={16} className="text-yellow-600 mt-0.5" />
                                <div className="text-xs text-yellow-800">
                                    <strong>推奨アクション:</strong> ログアウトして再度ログインしてください。
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
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
                            {creditInfo && creditInfo.tier === 'premium' && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">Premium会員</span>
                            )}
                            <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t border-purple-200">
                            {creditInfo ? (
                                <div className="space-y-4">
                                    {/* 無料会員 */}
                                    {creditInfo.tier === 'free' && (
                                        <>
                                            {creditInfo.freeTrialActive ? (
                                                <div className="bg-white p-4 rounded-lg border border-blue-200">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <Icon name="Gift" size={24} className="text-blue-600" />
                                                        <div>
                                                            <p className="font-bold text-gray-800">無料トライアル中</p>
                                                            <p className="text-sm text-gray-600">残り {creditInfo.freeTrialDaysRemaining} 日</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                                        <p className="text-sm font-medium text-gray-700 mb-1">残りクレジット</p>
                                                        <p className="text-2xl font-bold text-indigo-600">{creditInfo.remainingCredits} 回</p>
                                                    </div>
                                                    <button
                                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700"
                                                        onClick={() => alert('サブスクリプション画面は実装予定！')}
                                                    >
                                                        月額400円でPremium登録
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <Icon name="AlertCircle" size={24} className="text-red-600" />
                                                        <div>
                                                            <p className="font-bold text-gray-800">無料期間終了</p>
                                                            <p className="text-sm text-gray-600">残りを続けるにはPremium登録が必要です</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <button
                                                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700"
                                                            onClick={() => alert('サブスクリプション画面は実装予定！')}
                                                        >
                                                            月額400円でPremium登録
                                                        </button>
                                                        <button
                                                            className="w-full bg-gray-600 text-white font-bold py-3 rounded-lg hover:bg-gray-700"
                                                            onClick={() => alert('クレジット購入画面は実装予定！')}
                                                        >
                                                            クレジット追加購入
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Premium会員 */}
                                    {creditInfo.tier === 'premium' && (
                                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Icon name="Crown" size={24} className="text-purple-600" />
                                                <div>
                                                    <p className="font-bold text-gray-800">Premium会員</p>
                                                    <p className="text-sm text-gray-600">すべての機能が利用可能</p>
                                                </div>
                                            </div>

                                            {/* クレジット残高表示 */}
                                            <div className="space-y-2 mb-3">
                                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">合計クレジット</p>
                                                    <p className="text-3xl font-bold text-purple-600">{creditInfo.totalCredits}</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                                                        <p className="text-xs font-medium text-gray-600 mb-1">無料クレジット</p>
                                                        <p className="text-xl font-bold text-blue-600">{creditInfo.freeCredits}</p>
                                                        <p className="text-xs text-gray-500 mt-1">レベルアップで獲得</p>
                                                    </div>
                                                    <div className="bg-green-50 p-2.5 rounded-lg border border-green-200">
                                                        <p className="text-xs font-medium text-gray-600 mb-1">有料クレジット</p>
                                                        <p className="text-xl font-bold text-green-600">{creditInfo.paidCredits}</p>
                                                        <p className="text-xs text-gray-500 mt-1">追加購入分</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {creditInfo.totalCredits < 20 && (
                                                <button
                                                    className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 mb-2"
                                                    onClick={() => alert('クレジット追加購入画面は実装予定！')}
                                                >
                                                    クレジット追加購入
                                                </button>
                                            )}
                                            <button
                                                className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300"
                                                onClick={() => confirm('サブスクリプションを解約しますか？') && alert('解約処理は実装予定！')}
                                            >
                                                サブスクリプション解約
                                            </button>
                                        </div>
                                    )}

                                    {/* 開発モード表示 */}
                                    {creditInfo.devMode && (
                                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                            <p className="text-sm text-yellow-800">
                                                <Icon name="Code" size={16} className="inline mr-1" />
                                                開発モード：すべてのPremium機能が有効
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">読み込み中...</p>
                            )}
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
                                                            // ユーザーデータを削除
                                                            await firebase.firestore().collection('users').doc(user.uid).delete();
                                                            // アカウントを削除
                                                            await user.delete();
                                                            alert('アカウントを削除しました');
                                                        }
                                                    } catch (error) {
                                                        if (error.code === 'auth/requires-recent-login') {
                                                            alert('セキュリティのため、再ログインしてからアカウント削除を実行してください。');
                                                        } else {
                                                            alert('エラー: ' + error.message);
                                                        }
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
                            <div className="space-y-3 max-h-[70vh] overflow-y-auto pb-12">

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
                                                            • タンパク質 = 除脂肪体重 × 係数（一般:1.0, アスリート:2.0-2.8）<br/>
                                                            • 脂質 = 除脂肪体重 × 係数 × 0.25（バランス）or × 0.35（低糖質）<br/>
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
                                                    content: `あなたのボディメイクの目的を選択してください。目的に応じて推奨カロリーとPFCバランスが自動調整されます。
【ダイエット（脂肪を落とす）】• 目標： 体脂肪を減らし、引き締まった体を作る
• カロリー: メンテナンスカロリー -300kcal
• タンパク質: 高め（筋肉維持のため）• 推奨ペース: 週0.5〜0.7kg減
【メンテナンス（現状維持）】• 目標： 現在の体重・体組成を維持
• カロリー: メンテナンスカロリー ±0kcal
• バランス型の栄養配分• 健康的生活習慣の維持
【バルクアップ（筋肉をつける）】• 目標： 筋肉量を増やし、体を大きくする
• カロリー: メンテナンスカロリー +300kcal
• タンパク質: 非常に高め
• 炭水化物: 多め（筋肉合成のエネルギー）• 推奨ペース: 週0.5kg増
【リコンプ（体組成改善）】• 目標： 脂肪を落としながら筋肉をつける
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
                                            <p className="text-xs text-gray-500 mt-2">※ボディメイカーはタンパク質・ビタミン・ミネラルの推奨量が2倍になります</p>
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
                                                合計 {(advancedSettings.proteinRatio || 30) + (advancedSettings.fatRatioPercent || 25) + (advancedSettings.carbRatio || 45)}%
                                                {((advancedSettings.proteinRatio || 30) + (advancedSettings.fatRatioPercent || 25) + (advancedSettings.carbRatio || 45)) === 100 &&
                                                    <span className="text-green-600 ml-2">✓バランス良好</span>
                                                }
                                            </div>
                                        </div>
                                        )}
                                    </div>


                            <button
                                onClick={handleSave}
                                className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition"
                            >
                                保存                            </button>
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
                                                                        テンプレート紐づけ                                                                        <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                                    </summary>
                                                                    <div className="space-y-2 mt-3">
                                                                        {/* 食事テンプレート*/}
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

                                                                        {/* トレーニングテンプレート*/}
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
                                                                        紐づけたテンプレートは、記録画面で自動的に読み込まれます                                                                    </p>
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

                                                                    {/* テンプレート紐づけ*/}
                                                                    <details className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                        <summary className="font-medium text-sm text-yellow-900 cursor-pointer flex items-center gap-2 hover:text-yellow-700">
                                                                            <Icon name="BookTemplate" size={14} />
                                                                            テンプレート紐づけ                                                                            <Icon name="ChevronDown" size={14} className="ml-auto" />
                                                                        </summary>
                                                                        <div className="space-y-2 mt-3">
                                                                            {/* 食事テンプレート*/}
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

                                                                            {/* トレーニングテンプレート*/}
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
                                                                            紐づけたテンプレートは、記録画面で自動的に読み込まれます                                                                        </p>
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

                    {/* 通知診断 */}
                    <details className="border rounded-lg border-purple-300 bg-purple-50">
                        <summary className="cursor-pointer p-4 hover:bg-purple-100 font-medium flex items-center gap-2">
                            <Icon name="Activity" size={18} className="text-purple-600" />
                            通知診断（トラブルシューティング）
                            <Icon name="ChevronDown" size={16} className="ml-auto text-purple-400" />
                        </summary>
                        <div className="p-4 pt-0 border-t space-y-3">
                            <NotificationDiagnostics userId={userId} />
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

                            {/* 通知診断ツール */}
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-bold mb-2 text-blue-800 flex items-center gap-2">
                                    <Icon name="Bell" size={16} />
                                    通知診断ツール
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    通知が来ない場合、この診断ツールで問題を特定できます。
                                </p>
                                <button
                                    onClick={async () => {
                                        let report = '=== 通知診断レポート ===\n\n';

                                        // 通知権限をチェック
                                        if ('Notification' in window) {
                                            report += `✓ 通知API: サポート済み\n`;
                                            report += `通知権限: ${Notification.permission}\n`;
                                            if (Notification.permission !== 'granted') {
                                                report += `⚠️ 通知権限が許可されていません\n`;
                                            }
                                        } else {
                                            report += `✗ 通知API: サポートされていません\n`;
                                        }

                                        // Service Workerをチェック
                                        if ('serviceWorker' in navigator) {
                                            report += `\n✓ Service Worker: サポート済み\n`;
                                            const registrations = await navigator.serviceWorker.getRegistrations();
                                            report += `登録数: ${registrations.length}\n`;
                                            registrations.forEach((reg, i) => {
                                                report += `  [${i+1}] ${reg.active ? '✓ アクティブ' : '✗ 非アクティブ'}\n`;
                                            });
                                        } else {
                                            report += `\n✗ Service Worker: サポートされていません\n`;
                                        }

                                        // 通知スケジュールをチェック
                                        const schedules = localStorage.getItem('notificationSchedules_' + userId);
                                        if (schedules) {
                                            const parsed = JSON.parse(schedules);
                                            report += `\n✓ 通知スケジュール: ${parsed.length}件\n`;
                                            parsed.forEach((s, i) => {
                                                report += `  [${i+1}] ${s.type} - ${s.time}\n`;
                                            });
                                        } else {
                                            report += `\n⚠️ 通知スケジュール: 未設定\n`;
                                        }

                                        // 通知チェッカーの状態
                                        report += `\n通知チェッカー: ${window.notificationCheckInterval ? '✓ 動作中' : '✗ 停止中'}\n`;

                                        // IndexedDBをチェック
                                        try {
                                            const db = await new Promise((resolve, reject) => {
                                                const request = indexedDB.open('YourCoachNotifications', 1);
                                                request.onsuccess = () => resolve(request.result);
                                                request.onerror = () => reject(request.error);
                                            });
                                            report += `\n✓ IndexedDB: 利用可能\n`;
                                        } catch (error) {
                                            report += `\n✗ IndexedDB: エラー - ${error.message}\n`;
                                        }

                                        alert(report);
                                        console.log(report);
                                    }}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                >
                                    <Icon name="Search" size={16} />
                                    診断を実行
                                </button>
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

                    {/* 開発者*/}
                    {DEV_MODE && (
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
                                        const currentDay = daysSinceReg + 1; // 1日目から表示
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
                                                    return `${daysSinceReg + 1}日目`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {(() => {
                                                const daysSinceReg = calculateDaysSinceRegistration(userId);
                                                const currentDay = daysSinceReg + 1;
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
                                                    const date = new Date();
                                                    date.setDate(date.getDate() - 7); // 7日前に登録したことにする
                                                    localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, date.toISOString());
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
                        </div>
                        </div>
                    </details>
                    )}

                    {/* 管理者パネル (開発モードのみ表示) */}
                    {DEV_MODE && (
                        <details className="border rounded-lg border-red-300 bg-red-50">
                            <summary className="cursor-pointer p-4 hover:bg-red-100 font-medium flex items-center gap-2">
                                <Icon name="Shield" size={18} className="text-red-600" />
                                管理者パネル
                                <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-4 pt-0 border-t border-red-200">
                                <div className="space-y-3">
                                    <p className="text-sm text-red-700 mb-3">
                                        🔒 管理者パネルへのアクセスには認証が必須です                                    </p>
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
                                        COMY投稿承認パネルを開く                                    </button>
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

        </>
    );
};

window.SettingsView = SettingsView;
