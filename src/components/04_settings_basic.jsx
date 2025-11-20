import React from 'react';
import toast from 'react-hot-toast';

// ===== 基本設定タブコンポーネント =====
const BasicTab = ({
    userProfile,
    usageDays,
    profile,
    setProfile,
    expData,
    milestones,
    advancedSettings,
    setAdvancedSettings,
    showCustomMultiplierInput,
    setShowCustomMultiplierInput,
    customMultiplierInputValue,
    setCustomMultiplierInputValue,
    infoModal,
    setInfoModal,
    visualGuideModal,
    setVisualGuideModal,
    mfaEnrolled,
    setMfaEnrolled,
    show2FASetup,
    setShow2FASetup,
    phoneNumber,
    setPhoneNumber,
    verificationId,
    setVerificationId,
    verificationCode,
    setVerificationCode,
    showConfirm,
    handleSave,
    userId,
    unlockedFeatures
}) => {
    const Icon = window.Icon;
    const LBMUtils = window.LBMUtils;

    return (
        <div className="space-y-3">
            {/* 使い方 */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="BookOpen" size={18} className="text-blue-600" />
                    使い方
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 font-semibold">YourCoachの基本フロー</p>

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
                    {(userProfile?.subscriptionStatus === 'active') && (
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
                            const isPremium = userProfile?.subscriptionStatus === 'active';
                            const isTrial = usageDays < 7; // 0-6日目がトライアル
                            const daysRemaining = isTrial ? Math.max(0, 7 - usageDays) : 0;

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
                                            <p className="text-sm font-medium text-gray-600 mb-1">月額料金</p>
                                            <p className="text-3xl font-bold text-amber-600">¥940</p>
                                            <p className="text-xs text-gray-600 mt-1">税込</p>
                                        </div>

                                        <button
                                            className="w-full bg-gray-200 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-300"
                                            onClick={() => showConfirm('サブスクリプション解約の確認', 'サブスクリプションを解約しますか？', () => toast('解約処理は実装予定！'))}
                                        >
                                            サブスクリプション解約
                                        </button>
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
                                            <p className="text-sm font-medium text-gray-600 mb-1">現在の利用日数</p>
                                            <p className="text-2xl font-bold text-blue-600">{usageDays + 1} 日目</p>
                                            <p className="text-xs text-gray-600 mt-1">8日目以降はPremium登録が必要です</p>
                                        </div>

                                        <button
                                            className="w-full bg-[#FFF59A] text-gray-800 font-bold py-3 rounded-lg hover:opacity-90 relative overflow-hidden"
                                            onClick={() => toast('サブスクリプション画面は実装予定！')}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                            <span className="relative z-10">月額940円でPremium登録</span>
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
                                            <p className="text-sm font-medium text-gray-600 mb-1">現在の利用日数</p>
                                            <p className="text-2xl font-bold text-red-600">{usageDays + 1} 日目</p>
                                        </div>

                                        <button
                                            className="w-full bg-[#FFF59A] text-gray-800 font-bold py-3 rounded-lg hover:opacity-90 relative overflow-hidden"
                                            onClick={() => toast('サブスクリプション画面は実装予定！')}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                            <span className="relative z-10">月額940円でPremium登録</span>
                                        </button>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            </details>

            {/* アカウント */}
            <details id="account" className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="UserCircle" size={18} className="text-blue-600" />
                    アカウント
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pb-4">
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
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ユーザーID</label>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-mono text-gray-800 flex-1 truncate">{userId || '不明'}</p>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(userId || '');
                                                toast.success('ユーザーIDをコピーしました');
                                            }}
                                            className="flex-shrink-0 p-1.5 hover:bg-gray-200 rounded transition"
                                            title="コピー"
                                        >
                                            <Icon name="Copy" size={14} className="text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ログイン方法</label>
                                    <p className="text-sm font-medium text-gray-800">
                                        {(() => {
                                            const user = firebase.auth().currentUser;
                                            if (!user || !user.providerData || user.providerData.length === 0) return '不明';

                                            const providerId = user.providerData[0].providerId;
                                            if (providerId === 'password') return 'メールアドレス';
                                            if (providerId === 'google.com') return 'Google';
                                            return providerId;
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-blue-200">
                                        <div className="bg-white p-2 rounded">
                                            <p className="text-xs text-gray-600 mb-0.5">無料付与</p>
                                            <p className="font-bold text-green-600">{expData.freeCredits}</p>
                                        </div>
                                        <div className="bg-white p-2 rounded">
                                            <p className="text-xs text-gray-600 mb-0.5">有料購入</p>
                                            <p className="font-bold text-amber-600">{expData.paidCredits}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 pt-2">
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
                                            <span className={`text-xs font-bold ${milestone.achieved ? 'text-green-700' : 'text-gray-600'}`}>
                                                +{milestone.reward} クレジット
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 同期状態確認 */}
                        {(() => {
                            const [syncStatus, setSyncStatus] = React.useState(null);
                            const [isChecking, setIsChecking] = React.useState(false);
                            const [isSyncing, setIsSyncing] = React.useState(false);
                            const [showDebugInfo, setShowDebugInfo] = React.useState(false);

                            const checkSyncStatus = async () => {
                                setIsChecking(true);
                                try {
                                    const db = firebase.firestore();
                                    const userDocRef = db.collection('users').doc(userId);
                                    const userDoc = await userDocRef.get();

                                    if (!userDoc.exists) {
                                        setSyncStatus({
                                            status: 'error',
                                            message: 'ユーザーデータが見つかりません',
                                            lastSync: null
                                        });
                                        return;
                                    }

                                    const userData = userDoc.data();
                                    const lastModified = userData.lastModified || userData.updatedAt;

                                    setSyncStatus({
                                        status: 'success',
                                        message: 'Firestoreと正常に接続されています',
                                        lastSync: lastModified ? (lastModified.toDate ? lastModified.toDate() : new Date(lastModified)) : null
                                    });
                                } catch (error) {
                                    console.error('Sync check error:', error);
                                    setSyncStatus({
                                        status: 'error',
                                        message: `接続エラー: ${error.message}`,
                                        lastSync: null
                                    });
                                } finally {
                                    setIsChecking(false);
                                }
                            };

                            const forceResync = async () => {
                                setIsSyncing(true);
                                try {
                                    const db = firebase.firestore();
                                    const userDocRef = db.collection('users').doc(userId);

                                    // 0. Firestoreに再同期フラグを設定（ブラウザ/PWA間で共有可能）
                                    await userDocRef.set({
                                        forceResyncFlag: true,
                                        forceResyncTimestamp: new Date().toISOString()
                                    }, { merge: true });
                                    console.log('再同期フラグをFirestoreに設定しました');

                                    // 1. LocalStorageをクリア（認証情報以外）
                                    const keysToPreserve = ['firebase:authUser', 'firebase:host'];
                                    const preservedData = {};
                                    keysToPreserve.forEach(key => {
                                        const value = localStorage.getItem(key);
                                        if (value) preservedData[key] = value;
                                    });

                                    localStorage.clear();

                                    // 認証情報を復元
                                    Object.keys(preservedData).forEach(key => {
                                        localStorage.setItem(key, preservedData[key]);
                                    });

                                    // 2. ServiceWorkerキャッシュをクリア（PWA対応）
                                    if ('caches' in window) {
                                        const cacheNames = await caches.keys();
                                        await Promise.all(
                                            cacheNames.map(cacheName => caches.delete(cacheName))
                                        );
                                        console.log('ServiceWorkerキャッシュをクリアしました');
                                    }

                                    // 3. Firestoreから最新データを取得して確認
                                    const userDoc = await userDocRef.get({ source: 'server' }); // 強制的にサーバーから取得

                                    if (!userDoc.exists) {
                                        toast.error('ユーザーデータが見つかりません');
                                        // エラー時はフラグを削除
                                        await userDocRef.set({
                                            forceResyncFlag: firebase.firestore.FieldValue.delete()
                                        }, { merge: true });
                                        return;
                                    }

                                    const userData = userDoc.data();
                                    console.log('Firestore最新データ取得完了:', {
                                        userId,
                                        dataKeys: Object.keys(userData || {}),
                                        timestamp: new Date().toISOString()
                                    });

                                    // 4. ページをリロードして最新データを反映
                                    toast.success('データを再同期しています...');
                                    setTimeout(() => {
                                        window.location.reload(true); // 強制リロード
                                    }, 1000);
                                } catch (error) {
                                    console.error('Force resync error:', error);
                                    toast.error(`再同期エラー: ${error.message}`);
                                    setIsSyncing(false);
                                }
                            };

                            return (
                                <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
                                    <h4 className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                                        <Icon name="RefreshCw" size={14} className="text-purple-600" />
                                        同期状態
                                    </h4>
                                    <div className="space-y-3">
                                        {syncStatus && (
                                            <div className={`p-3 rounded-lg ${
                                                syncStatus.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                            }`}>
                                                <div className="flex items-start gap-2">
                                                    <Icon
                                                        name={syncStatus.status === 'success' ? 'CheckCircle' : 'AlertCircle'}
                                                        size={16}
                                                        className={syncStatus.status === 'success' ? 'text-green-600' : 'text-red-600'}
                                                    />
                                                    <div className="flex-1">
                                                        <p className={`text-xs font-medium ${
                                                            syncStatus.status === 'success' ? 'text-green-800' : 'text-red-800'
                                                        }`}>
                                                            {syncStatus.message}
                                                        </p>
                                                        {syncStatus.lastSync && (
                                                            <p className="text-xs text-gray-600 mt-1">
                                                                最終更新: {syncStatus.lastSync.toLocaleString('ja-JP')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <button
                                                onClick={checkSyncStatus}
                                                disabled={isChecking}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                <Icon name={isChecking ? "Loader" : "Search"} size={14} className={isChecking ? "animate-spin" : ""} />
                                                <span className="text-xs font-medium">
                                                    {isChecking ? '確認中...' : '同期状態を確認'}
                                                </span>
                                            </button>
                                            <button
                                                onClick={forceResync}
                                                disabled={isSyncing}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                <Icon name={isSyncing ? "Loader" : "RotateCcw"} size={14} className={isSyncing ? "animate-spin" : ""} />
                                                <span className="text-xs font-medium">
                                                    {isSyncing ? '再同期中...' : '強制再同期'}
                                                </span>
                                            </button>
                                        </div>

                                        <div className="bg-white p-2 rounded border border-purple-200">
                                            <p className="text-xs text-gray-600">
                                                <Icon name="Info" size={12} className="inline mr-1" />
                                                ブラウザとスマホPWAで異なるデータが表示される場合は、「同期状態を確認」→「強制再同期」をお試しください
                                            </p>
                                        </div>

                                        {/* デバッグ情報表示 */}
                                        <button
                                            onClick={() => setShowDebugInfo(!showDebugInfo)}
                                            className="w-full text-xs text-gray-600 hover:text-gray-800 underline flex items-center justify-center gap-1"
                                        >
                                            <Icon name={showDebugInfo ? "ChevronUp" : "ChevronDown"} size={12} />
                                            {showDebugInfo ? 'デバッグ情報を閉じる' : 'デバッグ情報を表示'}
                                        </button>

                                        {showDebugInfo && (
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                                                <div className="text-xs space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">ブラウザ:</span>
                                                        <span className="font-mono text-gray-800 text-[10px]">
                                                            {(() => {
                                                                const ua = navigator.userAgent;
                                                                if (ua.includes('Chrome')) return 'Chrome';
                                                                if (ua.includes('Safari')) return 'Safari';
                                                                if (ua.includes('Firefox')) return 'Firefox';
                                                                if (ua.includes('Edge')) return 'Edge';
                                                                return 'その他';
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">PWAモード:</span>
                                                        <span className="font-mono text-gray-800 text-[10px]">
                                                            {window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone ? 'スタンドアロン' : 'ブラウザ'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">OS:</span>
                                                        <span className="font-mono text-gray-800 text-[10px]">
                                                            {(() => {
                                                                const ua = navigator.userAgent;
                                                                if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
                                                                if (/Android/.test(ua)) return 'Android';
                                                                if (/Win/.test(ua)) return 'Windows';
                                                                if (/Mac/.test(ua)) return 'macOS';
                                                                if (/Linux/.test(ua)) return 'Linux';
                                                                return 'その他';
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">ServiceWorker:</span>
                                                        <span className="font-mono text-gray-800 text-[10px]">
                                                            {navigator.serviceWorker?.controller ? '有効' : '無効'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">オンライン状態:</span>
                                                        <span className={`font-mono text-[10px] ${navigator.onLine ? 'text-green-600' : 'text-red-600'}`}>
                                                            {navigator.onLine ? 'オンライン' : 'オフライン'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const debugInfo = {
                                                            userId,
                                                            subscriptionStatus: userProfile?.subscriptionStatus || 'none',
                                                            isPremium: userProfile?.subscriptionStatus === 'active',
                                                            userAgent: navigator.userAgent,
                                                            pwaMode: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,
                                                            online: navigator.onLine,
                                                            serviceWorker: !!navigator.serviceWorker?.controller,
                                                            timestamp: new Date().toISOString()
                                                        };
                                                        navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                                                        toast.success('デバッグ情報をコピーしました');
                                                    }}
                                                    className="w-full px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition"
                                                >
                                                    デバッグ情報をコピー
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

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
                                                const result = await window.MFAService.unenrollMFA();
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
                                    console.log('[Account Delete] Button clicked');
                                    console.log('[Account Delete] showConfirm:', typeof showConfirm, showConfirm);
                                    if (!showConfirm) {
                                        toast.error('確認モーダルが利用できません');
                                        return;
                                    }
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
                                        firebase.auth().signOut();
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
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto overflow-x-hidden pb-4">

                            {/* 計算ロジック解説 */}
                            <details className="bg-blue-50 border-2 border-blue-200 rounded-lg mb-4">
                                <summary className="cursor-pointer p-3 hover:bg-blue-100 font-medium flex items-center gap-2 text-blue-800">
                                    <Icon name="Info" size={18} className="text-blue-600" />
                                    <span className="text-sm">計算ロジック解説（全フロー）</span>
                                    <Icon name="ChevronDown" size={16} className="ml-auto text-blue-400" />
                                </summary>
                                <div className="p-4 pt-2 border-t border-blue-200 text-sm text-gray-600 space-y-4">
                                    {/* BMR計算 */}
                                    <div>
                                        <h5 className="font-bold text-blue-700 mb-2 flex items-center gap-1">
                                            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                                            基礎代謝量（BMR）
                                        </h5>
                                        <div className="pl-6 space-y-1 text-xs">
                                            <p className="font-medium text-gray-800">【計算式】Katch-McArdle式 + 脂肪組織代謝</p>
                                            <p className="text-gray-600">BMR = (370 + 21.6 × 除脂肪体重) + (脂肪量 × 4.5)</p>
                                            <p className="text-gray-600 mt-1">
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
                                            <p className="text-gray-600 mt-1">
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
                                            <p className="text-gray-600 mt-1">
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
                                                <p className="text-gray-600 mt-1">
                                                    • タンパク質 = 除脂肪体重 × 係数（一般:1.2、ボディメイカー:2.2 ※目的に関わらず固定）<br/>
                                                    • 脂質 = 目標カロリー × 0.25（バランス）or × 0.35（低糖質）<br/>
                                                    • 炭水化物 = 残りのカロリーを炭水化物で充当
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">【カスタムモード】</p>
                                                <p className="text-gray-600">カロリー比率を直接指定（例: P30% F25% C45%）</p>
                                                <p className="text-gray-600 mt-1">
                                                    • タンパク質 = 目標カロリー × P% ÷ 4kcal/g<br/>
                                                    • 脂質 = 目標カロリー × F% ÷ 9kcal/g<br/>
                                                    • 炭水化物 = 目標カロリー × C% ÷ 4kcal/g
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-100 p-3 rounded border border-blue-300 text-xs text-blue-800">
                                        <p className="font-bold mb-1">💡 ポイント</p>
                                        <p>各STEPで設定を変更すると、リアルタイムで目標値が再計算されます。設定完了後、必ず「保存」ボタンをタップしてください。</p>
                                    </div>
                                </div>
                            </details>

                            {/* STEP 1: 個人情報 */}
                            <div className="border-l-4 border-[#4A9EFF] pl-4">
                                <h4 className="text-xs font-bold text-gray-800 mb-2">STEP 1: 個人情報</h4>
                                <div className="space-y-2.5">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">ニックネーム</label>
                                        <input
                                            type="text"
                                            value={profile.nickname}
                                            onChange={(e) => setProfile({...profile, nickname: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">年齢</label>
                                            <input
                                                type="number"
                                                value={profile.age}
                                                onChange={(e) => setProfile({...profile, age: e.target.value === '' ? '' : Number(e.target.value)})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">性別</label>
                                            <select
                                                value={profile.gender}
                                                onChange={(e) => setProfile({...profile, gender: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                            >
                                                <option value="男性">男性</option>
                                                <option value="女性">女性</option>
                                                <option value="その他">その他</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">想定食事回数 / 日</label>
                                            <select
                                                value={profile.mealsPerDay || 4}
                                                onChange={(e) => setProfile({...profile, mealsPerDay: Number(e.target.value)})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                            >
                                                <option value={2}>2回</option>
                                                <option value={3}>3回</option>
                                                <option value={4}>4回（推奨）</option>
                                                <option value={5}>5回</option>
                                                <option value={6}>6回</option>
                                                <option value={7}>7回</option>
                                                <option value={8}>8回</option>
                                                <option value={9}>9回</option>
                                                <option value={10}>10回</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                1食あたりのGL上限に影響します（間食・補食を含む）
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">理想の睡眠時間</label>
                                        <div className="flex w-full items-center justify-between gap-2 rounded-full bg-gray-100 p-1.5">
                                            {[
                                                { value: 2, label: '6h' },
                                                { value: 3, label: '7h' },
                                                { value: 4, label: '8h' },
                                                { value: 5, label: '9h↑' }
                                            ].map(item => (
                                                <button
                                                    key={item.value}
                                                    type="button"
                                                    onClick={() => setProfile({...profile, idealSleepHours: item.value})}
                                                    className={`flex-1 rounded-full py-2 px-1 text-center text-xs font-medium transition-colors duration-300 whitespace-nowrap ${
                                                        item.value === (profile.idealSleepHours || 4)
                                                            ? 'bg-[#4A9EFF] text-white'
                                                            : 'text-gray-600 hover:text-gray-800'
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">※成人の推奨睡眠時間は7-8時間です</p>
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                        />
                                    </div>

                                    {profile.idealLBM && (
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                            <p className="text-xs font-medium text-blue-700">理想のLBMを自動計算！</p>
                                            <p className="text-lg font-bold text-blue-600 mt-1">
                                                {profile.idealLBM.toFixed(1)} kg
                                            </p>
                                            <p className="text-xs text-blue-600 mt-1">
                                                現在より {(profile.idealLBM - (profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15))).toFixed(1)} kg
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* STEP 2: 活動量 */}
                            <div className="border-l-4 border-[#4A9EFF] pl-4">
                                <h4 className="text-xs font-bold text-gray-800 mb-2">STEP 2: 活動量</h4>
                                <label className="block text-sm font-medium mb-1.5">
                                    活動レベル
                                </label>
                                {!profile.customActivityMultiplier && (
                                    <select
                                        value={profile.activityLevel}
                                        onChange={(e) => setProfile({...profile, activityLevel: e.target.value === '' ? '' : Number(e.target.value)})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
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
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800">
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
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
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
                                                className="flex-1 px-4 py-2 bg-[#4A9EFF] text-white rounded-lg hover:bg-[#3b8fef]"
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
                                    className="mt-2 text-sm text-[#4A9EFF] hover:text-[#3b8fef] underline"
                                >
                                    {profile.customActivityMultiplier ? '5段階選択に戻す' : showCustomMultiplierInput ? '入力を閉じる' : 'または、活動レベル係数を直接入力する'}
                                </button>
                            </div>

                            {/* STEP 3: 目的別カロリー設定*/}
                            <div className="border-l-4 border-[#4A9EFF] pl-4">
                                <h4 className="text-xs font-bold text-gray-800 mb-2">STEP 3: 目的別カロリー設定</h4>
                                <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                                    目的
                                    <button
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
                                        className="text-[#4A9EFF] hover:text-[#3b8fef]"
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
                                                    ? 'border-[#4A9EFF] bg-blue-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-[#4A9EFF] hover:shadow'
                                            }`}
                                        >
                                            <div className="text-left">
                                                <div className="font-bold text-sm">{label}</div>
                                                <div className="text-xs text-gray-600">{sub}</div>
                                            </div>
                                            <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                adjust > 0 ? 'bg-green-100 text-green-700' :
                                                adjust < 0 ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
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
                                            <span className="text-xs text-gray-600 font-normal mt-0.5">メンテナンスから±調整</span>
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* STEP 4: PFCバランス設定*/}
                            <div className="border-l-4 border-[#4A9EFF] pl-4">
                                <h4 className="text-xs font-bold text-gray-800 mb-2">STEP 4: PFCバランス設定</h4>

                                {/* スタイル選択*/}
                                <div className="mb-3">
                                    <label className="block text-sm font-medium mb-1.5">
                                        トレーニングスタイル
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setProfile({...profile, style: '一般'})}
                                            className={`p-4 rounded-lg border-2 transition ${
                                                profile.style === '一般'
                                                    ? 'border-[#4A9EFF] bg-blue-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-[#4A9EFF]'
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
                                                    ? 'border-[#4A9EFF] bg-blue-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-[#4A9EFF]'
                                            }`}
                                        >
                                            <div className="font-bold text-base mb-1">ボディメイカー</div>
                                            <div className="text-xs text-gray-600">本格的な筋トレ・競技力向上</div>
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2">
                                        ※ボディメイカーはタンパク質の推奨量が一般の約1.8倍<br/>
                                        （一般 LBM×1.2、ボディメイカー LBM×2.2）、<br/>
                                        ビタミン・ミネラルの推奨量が2倍、食物繊維の推奨量が1.2倍になります
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
                                                    ? 'bg-[#4A9EFF] text-white'
                                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
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
                                                    ? 'bg-[#4A9EFF] text-white'
                                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
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
                                            <span className="text-sm font-medium text-red-500">タンパク質 (P)</span>
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
                                            <span className="text-sm font-medium text-yellow-500">脂質 (F)</span>
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
                                            <span className="text-sm font-medium text-green-500">炭水化物 (C)</span>
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
        </div>
    );
};

export default BasicTab;
