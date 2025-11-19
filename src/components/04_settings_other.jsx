import React from 'react';
import toast from 'react-hot-toast';

// ===== その他タブコンポーネント =====
const OtherTab = ({
    feedbackText,
    setFeedbackText,
    feedbackSending,
    feedbackSent,
    handleSendFeedback,
    show2FASetup,
    setShow2FASetup,
    phoneNumber,
    setPhoneNumber,
    verificationId,
    setVerificationId,
    verificationCode,
    setVerificationCode,
    setMfaEnrolled,
    userId,
    usageDays,
    userProfile
}) => {
    const Icon = window.Icon;

    return (
        <>
            {/* アプリ情報 */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="Info" size={18} className="text-blue-600" />
                    アプリ情報
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4">
                        {/* バージョン情報 */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Icon name="Sparkles" size={20} className="text-indigo-600" />
                                    <span className="font-bold text-gray-800">Your Coach+</span>
                                </div>
                                <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-medium">
                                    v{window.APP_VERSION}
                                </span>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Icon name="Calendar" size={14} className="text-gray-400" />
                                    <span>最終更新: {(() => {
                                        const parts = (window.APP_VERSION || '').split('.');
                                        const minorKey = `${parts[0]}.${parts[1]}`;
                                        return window.RELEASE_NOTES?.[minorKey]?.date || '不明';
                                    })()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="Zap" size={14} className="text-gray-400" />
                                    <span>LBMを中心とした科学的な体づくり</span>
                                </div>
                            </div>
                        </div>

                        {/* リリースノートボタン */}
                        <a
                            href="/home.html#release-notes"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition">
                                    <Icon name="FileText" size={18} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">リリースノート</p>
                                    <p className="text-xs text-gray-600">更新履歴を確認</p>
                                </div>
                            </div>
                            <Icon name="ExternalLink" size={18} className="text-gray-400 group-hover:text-indigo-600 transition" />
                        </a>

                        {/* 追加リンク */}
                        <div className="grid grid-cols-2 gap-3">
                            <a
                                href="/privacy.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                                <Icon name="Shield" size={16} className="text-gray-600" />
                                <span className="text-gray-700">プライバシー</span>
                            </a>
                            <a
                                href="/terms.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                                <Icon name="FileText" size={16} className="text-gray-600" />
                                <span className="text-gray-700">利用規約</span>
                            </a>
                        </div>

                        {/* 運営者情報 */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-2">運営者</p>
                            <p className="text-sm font-medium text-gray-800 mb-3">Your Coach+</p>
                            <a
                                href="mailto:kongou411@gmail.com"
                                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition"
                            >
                                <Icon name="Mail" size={14} />
                                <span>kongou411@gmail.com</span>
                            </a>
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
                                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
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
                                    <p className="text-xs text-gray-600 mt-2 text-center">
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

                    {/* 機能開放状況*/}
                    <div className="border rounded-lg p-6">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <Icon name="Lock" size={18} />
                            機能開放状況                                </h4>
                        <div className="space-y-2">
                            {/* 進行状況に応じた機能一覧 */}
                            {(() => {
                                const completionStatus = getFeatureCompletionStatus(userId);
                                const currentDay = usageDays; // 0-6日目がトライアル期間（内部計算）
                                const isPremium = userProfile?.subscriptionStatus === 'active';
                                const isTrial = currentDay < 7; // 0-6日目がトライアル

                                const featureList = [
                                    // 無料機能（常に利用可能）
                                    { id: 'food', name: '食事記録', unlocked: true, free: true },
                                    { id: 'training', name: '運動記録', unlocked: true, free: true },
                                    { id: 'condition', name: 'コンディション', unlocked: true, free: true },
                                    { id: 'template', name: 'テンプレート（1枠）', unlocked: true, free: true },
                                    { id: 'routine', name: 'ルーティン', unlocked: true, free: true },
                                    { id: 'pg_base', name: 'PG BASE（初期教科書）', unlocked: true, free: true },

                                    // Premium専用機能（8日目以降）
                                    { id: 'ai_photo', name: 'AI食事認識', unlocked: false, premium: !isTrial && !isPremium },
                                    { id: 'analysis', name: 'AI分析', unlocked: false, premium: !isTrial && !isPremium },
                                    { id: 'directive', name: '指示書', unlocked: false, premium: !isTrial && !isPremium },
                                    { id: 'history', name: '履歴', unlocked: false, premium: !isTrial && !isPremium },
                                    { id: 'history_analysis', name: '履歴分析', unlocked: false, premium: !isTrial && !isPremium },
                                    { id: 'shortcut', name: 'ショートカット', unlocked: false, premium: !isTrial && !isPremium },
                                    { id: 'community', name: 'コミュニティ', unlocked: false, premium: !isTrial && !isPremium },
                                    { id: 'detailed_nutrients', name: '詳細栄養素', unlocked: false, premium: !isTrial && !isPremium }
                                ];

                                return (
                                    <>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                            <p className="text-xs text-gray-600">
                                                <Icon name="Info" size={14} className="inline text-blue-600 mr-1" />
                                                現在: {currentDay + 1}日目 ({isTrial ? `無料期間：残り${7-currentDay}日` : (isPremium ? 'Premium会員' : '無料会員・機能制限中')})
                                            </p>
                                        </div>
                                        {featureList.map((feature) => (
                                            <div key={feature.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                                                <span className="text-sm">{feature.name}</span>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    feature.free ? 'bg-blue-100 text-blue-700' :
                                                    feature.premium ? 'bg-red-100 text-red-700' :
                                                    feature.unlocked ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {feature.free ? '✓無料' : (feature.premium ? '🔒Premium必須' : (feature.unlocked ? '✓開放済み' : '⏳未開放'))}
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
                                        {`${usageDays + 1}日目`}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                    {(() => {
                                        const currentDay = usageDays; // 0-6日目がトライアル
                                        const isTrial = currentDay < 7;
                                        const isPremium = userProfile?.subscriptionStatus === 'active';

                                        if (isTrial) {
                                            return (
                                                <span className="text-green-600 font-medium">
                                                    🎁 無料トライアル中（残り{7 - currentDay}日）
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
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, today.toISOString());
                                            localStorage.removeItem(STORAGE_KEYS.FEATURES_COMPLETED);
                                            window.location.reload();
                                        }}
                                        className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium"
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
                                    onClick={async () => {
                                        // +7日進める（登録日を7日前に移動）
                                        const currentRegDateStr = await getRegistrationDate(userId);
                                        const currentReg = new Date(currentRegDateStr);
                                        currentReg.setDate(currentReg.getDate() - 7);
                                        currentReg.setHours(0, 0, 0, 0);
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

                    {/* プレミアムモード切り替え */}
                    <div className="border rounded-lg p-6">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <Icon name="Crown" size={18} className="text-amber-600" />
                            プレミアムモード（開発用）
                        </h4>
                        <div className="space-y-4">
                            {/* 現在の状態表示 */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">現在の状態</span>
                                    <span className={`text-lg font-bold ${
                                        userProfile?.subscriptionStatus === 'active'
                                        ? 'text-amber-600'
                                        : 'text-gray-600'
                                    }`}>
                                        {userProfile?.subscriptionStatus === 'active' ? '👑 Premium会員' : '無料会員'}
                                    </span>
                                </div>
                            </div>

                            {/* モード切り替えボタン */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={async () => {
                                        try {
                                            // LocalStorageに保存
                                            const currentProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) || {};
                                            currentProfile.subscriptionStatus = 'none';
                                            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(currentProfile));

                                            // Firestoreにも保存（ブラウザ/PWA間で同期）
                                            const db = firebase.firestore();
                                            await db.collection('users').doc(userId).set({
                                                subscriptionStatus: 'none'
                                            }, { merge: true });

                                            console.log('[開発モード] 無料会員に切り替え（Firestore + LocalStorage）');
                                            window.location.reload();
                                        } catch (error) {
                                            console.error('プレミアムモード切り替えエラー:', error);
                                            toast.error('切り替えに失敗しました');
                                        }
                                    }}
                                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                >
                                    <Icon name="User" size={18} className="inline mr-1" />
                                    無料会員にする
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            // LocalStorageに保存
                                            const currentProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) || {};
                                            currentProfile.subscriptionStatus = 'active';
                                            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(currentProfile));

                                            // Firestoreにも保存（ブラウザ/PWA間で同期）
                                            const db = firebase.firestore();
                                            await db.collection('users').doc(userId).set({
                                                subscriptionStatus: 'active'
                                            }, { merge: true });

                                            console.log('[開発モード] Premium会員に切り替え（Firestore + LocalStorage）');
                                            window.location.reload();
                                        } catch (error) {
                                            console.error('プレミアムモード切り替えエラー:', error);
                                            toast.error('切り替えに失敗しました');
                                        }
                                    }}
                                    className="px-4 py-3 bg-[#FFF59A] text-gray-800 rounded-lg hover:opacity-90 transition font-medium relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                    <span className="relative z-10">
                                        <Icon name="Crown" size={18} className="inline mr-1" />
                                        Premium会員にする
                                    </span>
                                </button>
                            </div>

                            {/* 注意事項 */}
                            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <Icon name="AlertTriangle" size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-orange-700">
                                        <p className="font-medium mb-1">開発用機能</p>
                                        <p>この機能は開発・テスト用です。実際のサブスクリプション登録は別途実装されます。</p>
                                    </div>
                                </div>
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
                                                <p className="text-sm text-gray-600 text-center py-4">
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
                                                    <summary className="cursor-pointer font-mono text-xs font-semibold text-gray-600 hover:text-gray-800 flex items-center justify-between">
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
                                                        <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
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
        </>
    );
};

export default OtherTab;
