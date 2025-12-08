import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useConfirmModal, ConfirmModal } from './00_confirm_modal';
import { STORAGE_KEYS, DEFAULT_ROUTINES } from '../config.js';
import BasicTab from './04_settings_basic';
import FeaturesTab from './04_settings_features';
import DataTab from './04_settings_data';
import OtherTab from './04_settings_other';

const SettingsView = ({
    userProfile,
    onUpdateProfile,
    onClose,
    userId,
    shortcuts = [],
    onUpdateShortcuts,
    usageDays,
    unlockedFeatures,
    onOpenAddView,
    darkMode,
    onToggleDarkMode,
    reopenTemplateEditModal = false,
    reopenTemplateEditType = null,
    onTemplateEditModalOpened,
    initialTab = 'basic', // 初期タブ（デフォルトは基本設定）
    onOpenSubscription // Subscription画面を開く関数
}) => {
    const Icon = window.Icon;
    const LBMUtils = window.LBMUtils;

    // ===== State管理 =====
    const [activeTab, setActiveTab] = useState(initialTab);
    const [profile, setProfile] = useState({ ...userProfile });
    const [advancedSettings, setAdvancedSettings] = useState({
        usePurposeBased: userProfile.usePurposeBased !== false,
        proteinRatio: userProfile.proteinRatio ?? 30,
        fatRatioPercent: userProfile.fatRatioPercent ?? 25,
        carbRatio: userProfile.carbRatio ?? 45
    });

    // カスタムactivityMultiplier関連
    const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
    const [customMultiplierInputValue, setCustomMultiplierInputValue] = useState('');

    // モーダル表示制御
    const [infoModal, setInfoModal] = useState({ show: false, title: '', content: '' });
    const [visualGuideModal, setVisualGuideModal] = useState({
        show: false,
        gender: userProfile.gender || '男性',
        selectedLevel: 5
    });

    // 2FA関連
    const [mfaEnrolled, setMfaEnrolled] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationId] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');

    // フィードバック関連
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackSending, setFeedbackSending] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState(false);

    // 経験値・マイルストーン計算
    const [expData, setExpData] = useState(null);
    const [milestones, setMilestones] = useState([]);

    // テンプレート関連
    const [mealTemplates, setMealTemplates] = useState([]);
    const [workoutTemplates, setWorkoutTemplates] = useState([]);
    const [showTemplateEditModal, setShowTemplateEditModal] = useState(false);
    const [templateEditType, setTemplateEditType] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // ルーティン関連（Firestoreから読み込み）
    const [localRoutines, setLocalRoutines] = useState([]);

    // 確認モーダル
    const { showConfirm, hideConfirm, ConfirmModalComponent } = useConfirmModal();

    // ===== 初期化・副作用 =====
    useEffect(() => {
        // 経験値データの計算（ExperienceServiceと同じロジックを使用）
        if (userProfile.experience !== undefined) {
            const experience = userProfile.experience || 0;

            // ExperienceServiceと同じ計算式: 100 * level * (level - 1) / 2
            const getRequiredExpForLevel = (level) => 100 * level * (level - 1) / 2;

            // 現在のレベルを計算
            let level = 1;
            while (getRequiredExpForLevel(level + 1) <= experience) {
                level++;
            }

            // 次のレベルまでの経験値を計算
            const currentLevelRequired = getRequiredExpForLevel(level);
            const nextLevelRequired = getRequiredExpForLevel(level + 1);
            const expCurrent = experience - currentLevelRequired;
            const expRequired = nextLevelRequired - currentLevelRequired;
            const expProgress = (expCurrent / expRequired) * 100;

            // クレジット計算
            const freeCredits = userProfile.freeCredits || 0;
            const paidCredits = userProfile.paidCredits || 0;
            const totalCredits = freeCredits + paidCredits;

            setExpData({
                level,
                experience,
                expCurrent,
                expRequired,
                expProgress,
                freeCredits,
                paidCredits,
                totalCredits
            });

            // マイルストーン計算
            const calculatedMilestones = [];
            for (let i = 1; i <= 10; i++) {
                const targetLevel = i * 10;
                calculatedMilestones.push({
                    level: targetLevel,
                    reward: 5,
                    achieved: level >= targetLevel
                });
            }
            setMilestones(calculatedMilestones);
        }

        // MFA登録状態の確認
        checkMFAEnrollment();
    }, [userProfile]);

    // テンプレート読み込み
    useEffect(() => {
        loadTemplates();
        loadRoutines();
    }, [userId]);

    const checkMFAEnrollment = async () => {
        if (window.MFAService && typeof window.MFAService.checkMFAEnrollment === 'function') {
            const result = await window.MFAService.checkMFAEnrollment();
            if (result.success) {
                setMfaEnrolled(result.enrolled);
            }
        }
    };

    const loadTemplates = async () => {
        if (!userId) return;

        try {
            // 食事テンプレート読み込み
            const mealTemplatesData = await window.DataService.getMealTemplates(userId);
            setMealTemplates(mealTemplatesData || []);

            // 運動テンプレート読み込み
            const workoutTemplatesData = await window.DataService.getWorkoutTemplates(userId);
            setWorkoutTemplates(workoutTemplatesData || []);
        } catch (error) {
            console.error('[Settings] Failed to load templates:', error);
        }
    };

    const loadRoutines = async () => {
        if (!userId) return;

        try {
            // Firestoreからルーティンを読み込み
            const routinesSnapshot = await firebase.firestore()
                .collection('users')
                .doc(userId)
                .collection('routines')
                .orderBy('id', 'asc')
                .get();

            if (!routinesSnapshot.empty) {
                const routinesData = routinesSnapshot.docs.map(doc => ({
                    ...doc.data(),
                    firestoreId: doc.id
                }));
                // 重複するidを除去（最初に見つかったものを優先）
                const uniqueRoutines = routinesData.reduce((acc, routine) => {
                    if (!acc.find(r => r.id === routine.id)) {
                        acc.push(routine);
                    }
                    return acc;
                }, []);
                setLocalRoutines(uniqueRoutines);
            } else {
                // Firestoreにルーティンがない場合、デフォルトルーティンを作成
                // Firestoreに保存
                const batch = firebase.firestore().batch();
                DEFAULT_ROUTINES.forEach(routine => {
                    const docRef = firebase.firestore()
                        .collection('users')
                        .doc(userId)
                        .collection('routines')
                        .doc();
                    batch.set(docRef, routine);
                });
                await batch.commit();

                // ルーティン設定をユーザードキュメントに保存
                await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .set({
                        routineStartDate: new Date().toISOString(),
                        routineActive: true
                    }, { merge: true });

                setLocalRoutines(DEFAULT_ROUTINES);
            }
        } catch (error) {
            console.error('[Settings] Failed to load routines:', error);
        }
    };

    // ===== 共通関数 =====
    const handleSave = () => {
        // LBM再計算
        const lbm = LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage);
        const fatMass = profile.weight - lbm;
        const bmr = LBMUtils.calculateBMR(lbm, fatMass);
        const tdeeBase = LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier, fatMass);

        // カロリー調整値をペースから再計算（データ整合性のため）
        let calorieAdjustment = profile.calorieAdjustment || 0;
        const pace = profile.customPaceValue !== null && profile.customPaceValue !== undefined
            ? profile.customPaceValue
            : profile.weightChangePace;
        if (pace && (profile.purpose === 'ダイエット' || profile.purpose === 'バルクアップ')) {
            calorieAdjustment = LBMUtils.calculateCalorieAdjustmentFromPace(pace, profile.paceUnit || 'kg', profile.weight);
        }

        // カスタムモードの場合はカスタムPFC比率を保存、目的別モードの場合は既存値を保持
        const pfcSettings = advancedSettings.usePurposeBased === false
            ? {
                // カスタムモード：カスタムPFC比率を明示的に保存
                proteinRatio: advancedSettings.proteinRatio,
                fatRatioPercent: advancedSettings.fatRatioPercent,
                carbRatio: advancedSettings.carbRatio
            }
            : {}; // 目的別モード：PFC比率は触らない（既存値を保持）

        const updatedProfile = {
            ...profile,
            ...advancedSettings, // 詳細設定を統合
            ...pfcSettings, // PFC設定を上書き
            leanBodyMass: lbm,
            bmr: bmr,
            tdeeBase: tdeeBase,
            calorieAdjustment: calorieAdjustment, // 再計算したカロリー調整値
            featuresCompleted: profile.featuresCompleted || {} // 機能開放状態を保持
        };

        // Firestoreはundefinedを許可しないため、undefinedフィールドを削除
        Object.keys(updatedProfile).forEach(key => {
            if (updatedProfile[key] === undefined) {
                delete updatedProfile[key];
            }
        });

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
            const record = await window.DataService.getDailyRecord(userId, dateStr);
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

    // タブ定義
    const TABS = [
        { id: 'basic', label: '基本', icon: 'User' },
        { id: 'features', label: '機能', icon: 'Zap' },
        { id: 'data', label: 'データ', icon: 'Database' },
        { id: 'other', label: 'その他', icon: 'MoreHorizontal' }
    ];

    return (
        <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden slide-up">
                {/* ヘッダー（固定） */}
                <div className="flex-shrink-0 bg-white border-b">
                    <div className="p-4 flex justify-between items-center">
                        <h3 className="text-lg font-bold">設定</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <Icon name="X" size={20} />
                        </button>
                    </div>

                    {/* タブバー */}
                    <div className="flex border-b overflow-x-auto">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[80px] px-4 py-3 flex flex-col items-center justify-center gap-1 transition ${
                                    activeTab === tab.id
                                        ? 'border-b-2 border-[#4A9EFF] text-[#4A9EFF] font-medium'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Icon name={tab.icon} size={20} />
                                <span className="text-xs">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* コンテンツエリア（スクロール可能） */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* 基本タブ */}
                    {activeTab === 'basic' && (
                        <BasicTab
                            userProfile={userProfile}
                            usageDays={usageDays}
                            profile={profile}
                            setProfile={setProfile}
                            expData={expData}
                            milestones={milestones}
                            advancedSettings={advancedSettings}
                            setAdvancedSettings={setAdvancedSettings}
                            showCustomMultiplierInput={showCustomMultiplierInput}
                            setShowCustomMultiplierInput={setShowCustomMultiplierInput}
                            customMultiplierInputValue={customMultiplierInputValue}
                            setCustomMultiplierInputValue={setCustomMultiplierInputValue}
                            infoModal={infoModal}
                            setInfoModal={setInfoModal}
                            visualGuideModal={visualGuideModal}
                            setVisualGuideModal={setVisualGuideModal}
                            mfaEnrolled={mfaEnrolled}
                            setMfaEnrolled={setMfaEnrolled}
                            show2FASetup={show2FASetup}
                            setShow2FASetup={setShow2FASetup}
                            phoneNumber={phoneNumber}
                            setPhoneNumber={setPhoneNumber}
                            verificationId={verificationId}
                            setVerificationId={setVerificationId}
                            verificationCode={verificationCode}
                            setVerificationCode={setVerificationCode}
                            showConfirm={showConfirm}
                            handleSave={handleSave}
                            userId={userId}
                            unlockedFeatures={unlockedFeatures}
                            onOpenSubscription={onOpenSubscription}
                        />
                    )}

                    {/* 機能タブ */}
                    {activeTab === 'features' && (
                        <FeaturesTab
                            unlockedFeatures={unlockedFeatures}
                            shortcuts={shortcuts}
                            onUpdateShortcuts={onUpdateShortcuts}
                            userId={userId}
                            userProfile={userProfile}
                            usageDays={usageDays}
                            mealTemplates={mealTemplates}
                            workoutTemplates={workoutTemplates}
                            onOpenAddView={onOpenAddView}
                            localRoutines={localRoutines}
                            setLocalRoutines={setLocalRoutines}
                            showConfirm={showConfirm}
                            showTemplateEditModal={showTemplateEditModal}
                            setShowTemplateEditModal={setShowTemplateEditModal}
                            templateEditType={templateEditType}
                            setTemplateEditType={setTemplateEditType}
                            selectedTemplate={selectedTemplate}
                            setSelectedTemplate={setSelectedTemplate}
                            loadTemplates={loadTemplates}
                            loadRoutines={loadRoutines}
                        />
                    )}

                    {/* データタブ */}
                    {activeTab === 'data' && (
                        <DataTab
                            userId={userId}
                            handleExportData={handleExportData}
                            handleClearData={handleClearData}
                            showConfirm={showConfirm}
                        />
                    )}

                    {/* その他タブ */}
                    {activeTab === 'other' && (
                        <OtherTab
                            feedbackText={feedbackText}
                            setFeedbackText={setFeedbackText}
                            feedbackSending={feedbackSending}
                            feedbackSent={feedbackSent}
                            handleSendFeedback={handleSendFeedback}
                            userId={userId}
                            usageDays={usageDays}
                            userProfile={userProfile}
                            showConfirm={showConfirm}
                            onClose={onClose}
                            unlockedFeatures={unlockedFeatures}
                        />
                    )}
                </div>
            </div>
        </div>

        {/* 確認モーダル */}
        <ConfirmModalComponent />

        {/* 情報モーダル */}
        {infoModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[10001] flex items-center justify-center p-4 modal-safe-area" onClick={() => setInfoModal({ show: false, title: '', content: '' })}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto modal-content-safe" onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 bg-[#4A9EFF] text-white flex justify-between items-center z-10 rounded-t-2xl" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
                        <h3 className="font-bold text-lg">{infoModal.title}</h3>
                        <button onClick={() => setInfoModal({ show: false, title: '', content: '' })} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2">
                            <Icon name="X" size={24} />
                        </button>
                    </div>
                    <div className="p-6">
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">{infoModal.content}</p>
                    </div>
                </div>
            </div>
        )}

        {/* Visual Guide Modal */}
        {visualGuideModal.show && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-safe-area">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content-safe">
                    <div className="sticky top-0 bg-orange-600 text-white flex justify-between items-center z-10 rounded-t-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
                        <h3 className="font-bold text-lg">外見から体脂肪率を推定</h3>
                        <button onClick={() => setVisualGuideModal({ ...visualGuideModal, show: false })} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2">
                            <Icon name="X" size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800 font-medium">
                                ⚠️ この推定値は外見に基づく主観的評価であり、実際の体脂肪率は±3-5%の誤差があります。正確な測定には体組成計の使用を強く推奨します。
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
                                                        <span className="font-bold text-gray-800">{guide.title}</span>
                                                        <span className="text-sm text-gray-600">({guide.range})</span>
                                                    </div>
                                                    <ul className="text-sm text-gray-600 space-y-1">
                                                        {guide.features.map((feature, idx) => (
                                                            <li key={idx}>• {feature}</li>
                                                        ))}
                                                    </ul>
                                                    <p className="text-xs text-gray-600 mt-2">健康: {guide.health}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <p className="text-sm font-medium text-gray-600 mb-2">推定結果</p>
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
                                    setProfile({
                                        ...profile,
                                        bodyFatPercentage: estimate.bodyFatPercentage
                                    });
                                    setVisualGuideModal({ ...visualGuideModal, show: false });
                                    toast.success(`体脂肪率を ${estimate.bodyFatPercentage}% に設定しました`);
                                }}
                                className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700"
                            >
                                この値を使用
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

// グローバルに公開
window.SettingsView = SettingsView;

export default SettingsView;
