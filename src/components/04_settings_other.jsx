import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { STORAGE_KEYS } from '../config.js';

// グローバル関数を取得
const getFeatureCompletionStatus = window.getFeatureCompletionStatus;
const getRegistrationDate = window.getRegistrationDate;

// ===== コード入力セクション（企業コード・紹介コード統合） =====
const CodeInputSection = ({ userId, userProfile }) => {
    const Icon = window.Icon;
    const [code, setCode] = useState('');
    const [validating, setValidating] = useState(false);

    // 企業コード関連
    const [hasEnterpriseAccess, setHasEnterpriseAccess] = useState(false);
    const [enterpriseInfo, setEnterpriseInfo] = useState(null);

    // 紹介コード関連
    const [hasReferral, setHasReferral] = useState(false);
    const [referralInfo, setReferralInfo] = useState(null);
    const [showReferralForm, setShowReferralForm] = useState(false);
    const [referralMetadata, setReferralMetadata] = useState({
        email: '',
        name: '',
        phoneNumber: ''
    });

    // ギフトコード関連
    const [hasGiftCode, setHasGiftCode] = useState(false);
    const [giftCodeInfo, setGiftCodeInfo] = useState(null);

    // コード種別を判定
    const getCodeType = (inputCode) => {
        if (!inputCode) return null;
        const trimmed = inputCode.trim().toUpperCase();
        if (trimmed.startsWith('B2B-')) return 'enterprise';
        if (trimmed.startsWith('USER-')) return 'referral';
        // それ以外で3文字以上ならギフトコードとして扱う
        if (trimmed.length >= 3) return 'gift';
        return null;
    };

    const codeType = getCodeType(code);

    // 既存のアクセス権確認
    useEffect(() => {
        if (userProfile?.enterpriseAccess) {
            setHasEnterpriseAccess(true);
            const db = firebase.firestore();
            db.collection('users').doc(userId).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.enterpriseInfo) {
                        setEnterpriseInfo(data.enterpriseInfo);
                    }
                }
            });
        }
        if (userProfile?.referredBy) {
            setHasReferral(true);
            setReferralInfo({
                appliedAt: userProfile.referralAppliedAt
            });
        }
        // ギフトコード適用済みチェック
        if (userProfile?.subscription?.giftCodeActive) {
            setHasGiftCode(true);
            setGiftCodeInfo({
                code: userProfile.subscription.giftCode,
                activatedAt: userProfile.subscription.giftCodeActivatedAt
            });
        }
    }, [userProfile, userId]);

    // 企業コード検証
    const validateEnterpriseCode = async () => {
        setValidating(true);
        try {
            const functions = window.firebase.app().functions('asia-northeast2');
            const validateCode = functions.httpsCallable('validateB2B2CCode');
            const result = await validateCode({
                accessCode: code.trim()
            });

            if (result.data.valid) {
                toast.success('企業コードが認証されました！Premium機能が利用可能になります。');
                setHasEnterpriseAccess(true);
                setEnterpriseInfo(result.data.enterpriseInfo || null);
                setCode('');
                return true;
            } else {
                toast.error(result.data.message || '無効な企業コードです');
                return false;
            }
        } catch (error) {
            console.error('[Enterprise] Code validation error:', error);
            const errorMessage = error.message || '企業コードの検証中にエラーが発生しました';
            toast.error(errorMessage);
            return false;
        } finally {
            setValidating(false);
        }
    };

    // 紹介コード適用
    const applyReferralCode = async () => {
        // バリデーション
        if (!referralMetadata.email || !referralMetadata.name || !referralMetadata.phoneNumber) {
            toast.error('すべての項目を入力してください');
            return false;
        }

        // メール形式チェック
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(referralMetadata.email)) {
            toast.error('有効なメールアドレスを入力してください');
            return false;
        }

        // 電話番号形式チェック（ハイフンあり/なし両対応）
        const phoneRegex = /^0\d{9,10}$/;
        const cleanPhone = referralMetadata.phoneNumber.replace(/-/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            toast.error('有効な電話番号を入力してください（例: 09012345678）');
            return false;
        }

        setValidating(true);
        try {
            const functions = window.firebase.app().functions('asia-northeast2');
            const applyCode = functions.httpsCallable('applyReferralCode');
            const result = await applyCode({
                referralCode: code.trim().toUpperCase(),
                userMetadata: {
                    email: referralMetadata.email,
                    name: referralMetadata.name,
                    phoneNumber: cleanPhone
                }
            });

            toast.success(result.data.message || '紹介コードを適用しました！');
            setHasReferral(true);
            setReferralInfo({ appliedAt: new Date() });
            setCode('');
            setShowReferralForm(false);
            setReferralMetadata({ email: '', name: '', phoneNumber: '' });
            return true;
        } catch (error) {
            console.error('[Referral] Code apply error:', error);
            const errorMessage = error.message || '紹介コードの適用に失敗しました';
            toast.error(errorMessage);
            return false;
        } finally {
            setValidating(false);
        }
    };

    // ギフトコード検証
    const validateGiftCode = async () => {
        setValidating(true);
        try {
            const result = await window.GiftCodeService.redeemCode(code.trim());
            if (result.success) {
                toast.success(result.message || 'Premium会員になりました！');
                setHasGiftCode(true);
                setGiftCodeInfo({ code: code.trim().toUpperCase(), activatedAt: new Date() });
                setCode('');
                // ページリロードで状態を更新
                setTimeout(() => window.location.reload(), 1500);
                return true;
            }
        } catch (error) {
            console.error('[GiftCode] Error:', error);
            const errorMessage = error.message || error.details?.message || 'コードの適用に失敗しました';
            toast.error(errorMessage);
            return false;
        } finally {
            setValidating(false);
        }
    };

    // コード認証ボタン押下時
    const handleSubmit = () => {
        if (!code.trim()) {
            toast.error('コードを入力してください');
            return;
        }

        if (codeType === 'enterprise') {
            validateEnterpriseCode();
        } else if (codeType === 'referral') {
            setShowReferralForm(true);
        } else if (codeType === 'gift') {
            validateGiftCode();
        } else {
            toast.error('無効なコード形式です');
        }
    };

    // 既存アクセス権の表示
    const renderExistingAccess = () => {
        const items = [];

        if (hasEnterpriseAccess) {
            items.push(
                <div key="enterprise" className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Icon name="Building" size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-green-800 mb-1">企業プラン有効</h4>
                            <p className="text-sm text-green-700">
                                法人・ジム向けプランでPremium機能をご利用いただけます。
                            </p>
                            {enterpriseInfo && (
                                <div className="mt-2 text-sm space-y-1">
                                    <p className="text-gray-700">
                                        <span className="font-medium">企業名:</span> {enterpriseInfo.companyName || '不明'}
                                    </p>
                                    {enterpriseInfo.expiresAt && (
                                        <p className="text-gray-700">
                                            <span className="font-medium">有効期限:</span>{' '}
                                            {new Date(enterpriseInfo.expiresAt).toLocaleDateString('ja-JP')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (hasReferral) {
            items.push(
                <div key="referral" className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Icon name="Gift" size={20} className="text-pink-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-pink-800 mb-1">紹介コード適用済み</h4>
                            <p className="text-sm text-pink-700">
                                Premium登録完了後、50回分の分析クレジットが付与されます。
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        if (hasGiftCode) {
            items.push(
                <div key="giftcode" className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Icon name="Crown" size={20} className="text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-purple-800 mb-1">ギフトコード適用済み</h4>
                            <p className="text-sm text-purple-700">
                                Premium機能が有効になっています。
                            </p>
                            {giftCodeInfo?.code && (
                                <p className="text-xs text-gray-600 mt-1">
                                    コード: {giftCodeInfo.code}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return items.length > 0 ? <div className="space-y-3">{items}</div> : null;
    };

    // 紹介コード用の追加情報フォーム
    if (showReferralForm) {
        return (
            <div className="space-y-4">
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Icon name="Gift" size={18} className="text-pink-600" />
                        <h4 className="font-bold text-pink-800">紹介コード: {code.toUpperCase()}</h4>
                    </div>
                    <p className="text-sm text-pink-700">
                        紹介特典を受け取るために、以下の情報を入力してください。
                        <br />
                        <span className="text-xs text-gray-600">※不正利用防止のため確認用に使用します</span>
                    </p>
                </div>

                <div className="space-y-3">
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700 mb-1 block">
                            氏名 <span className="text-red-500">*</span>
                        </span>
                        <input
                            type="text"
                            value={referralMetadata.name}
                            onChange={(e) => setReferralMetadata({ ...referralMetadata, name: e.target.value })}
                            placeholder="山田 太郎"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            disabled={validating}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-gray-700 mb-1 block">
                            メールアドレス <span className="text-red-500">*</span>
                        </span>
                        <input
                            type="email"
                            value={referralMetadata.email}
                            onChange={(e) => setReferralMetadata({ ...referralMetadata, email: e.target.value })}
                            placeholder="example@email.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            disabled={validating}
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-gray-700 mb-1 block">
                            電話番号 <span className="text-red-500">*</span>
                        </span>
                        <input
                            type="tel"
                            value={referralMetadata.phoneNumber}
                            onChange={(e) => setReferralMetadata({ ...referralMetadata, phoneNumber: e.target.value })}
                            placeholder="09012345678"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                            disabled={validating}
                        />
                    </label>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setShowReferralForm(false);
                            setReferralMetadata({ email: '', name: '', phoneNumber: '' });
                        }}
                        disabled={validating}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={applyReferralCode}
                        disabled={validating || !referralMetadata.email || !referralMetadata.name || !referralMetadata.phoneNumber}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                            validating || !referralMetadata.email || !referralMetadata.name || !referralMetadata.phoneNumber
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90'
                        }`}
                    >
                        {validating ? (
                            <>
                                <Icon name="Loader" size={18} className="animate-spin" />
                                適用中...
                            </>
                        ) : (
                            <>
                                <Icon name="Gift" size={18} />
                                紹介コードを適用
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // メインのコード入力フォーム
    return (
        <div className="space-y-4">
            {/* 既存のアクセス権表示 */}
            {renderExistingAccess()}

            {/* コード入力説明 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Icon name="Key" size={18} className="text-gray-600" />
                    コード入力
                </h4>
                <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex items-start gap-2">
                        <Icon name="Building" size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span><strong>企業コード</strong>（B2B-XXXX）: 法人・ジム向けプランのPremium特典</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Icon name="Gift" size={14} className="text-pink-600 mt-0.5 flex-shrink-0" />
                        <span><strong>紹介コード</strong>（USER-XXXX）: 友達紹介の50回クレジット特典</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Icon name="Crown" size={14} className="text-purple-600 mt-0.5 flex-shrink-0" />
                        <span><strong>ギフトコード</strong>: Premium無料招待コード</span>
                    </div>
                </div>
            </div>

            {/* コード入力フォーム */}
            {(!hasEnterpriseAccess || !hasReferral || !hasGiftCode) && (
                <div className="space-y-3">
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700 mb-2 block">
                            コードを入力
                        </span>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="コードを入力"
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none font-mono ${
                                codeType === 'enterprise'
                                    ? 'border-blue-300 focus:ring-blue-500 bg-blue-50/30'
                                    : codeType === 'referral'
                                    ? 'border-pink-300 focus:ring-pink-500 bg-pink-50/30'
                                    : codeType === 'gift'
                                    ? 'border-purple-300 focus:ring-purple-500 bg-purple-50/30'
                                    : 'border-gray-300 focus:ring-gray-500'
                            }`}
                            disabled={validating}
                        />
                        {codeType && (
                            <p className={`text-xs mt-1 ${
                                codeType === 'enterprise' ? 'text-blue-600'
                                : codeType === 'referral' ? 'text-pink-600'
                                : 'text-purple-600'
                            }`}>
                                {codeType === 'enterprise' ? '企業コード' : codeType === 'referral' ? '紹介コード' : 'ギフトコード'}として認識されました
                            </p>
                        )}
                    </label>

                    <button
                        onClick={handleSubmit}
                        disabled={validating || !code.trim()}
                        className={`w-full px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                            validating || !code.trim()
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                : codeType === 'referral'
                                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90'
                                : codeType === 'gift'
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {validating ? (
                            <>
                                <Icon name="Loader" size={18} className="animate-spin" />
                                検証中...
                            </>
                        ) : (
                            <>
                                <Icon name={codeType === 'gift' ? 'Crown' : 'Key'} size={18} />
                                コードを認証
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* 全て適用済みの場合 */}
            {hasEnterpriseAccess && hasReferral && hasGiftCode && (
                <p className="text-sm text-gray-600 text-center py-2">
                    すべてのコードが適用済みです
                </p>
            )}
        </div>
    );
};

// ===== その他タブコンポーネント =====
const OtherTab = ({
    feedbackText,
    setFeedbackText,
    feedbackSending,
    feedbackSent,
    handleSendFeedback,
    userId,
    usageDays,
    userProfile,
    showConfirm,
    unlockedFeatures,
    onClose
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

            {/* コード入力（企業コード・紹介コード統合） */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="Key" size={18} className="text-purple-600" />
                    コード入力
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <CodeInputSection userId={userId} userProfile={userProfile} />
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

            {/* ヘルプセンター */}
            <details className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="HelpCircle" size={18} className="text-indigo-600" />
                    ヘルプセンター
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-3">
                        {/* 基本フロー */}
                        <details className="border border-indigo-200 rounded-lg bg-indigo-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-indigo-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="PlayCircle" size={16} className="text-indigo-600" />
                                基本フロー
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-indigo-200">
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-600 mb-2">
                                        毎日この流れを繰り返すことで、確実にパフォーマンスが向上します。
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">食事を記録</p>
                                                <p className="text-xs text-gray-600">写真撮影 or 検索で簡単入力</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">運動を記録</p>
                                                <p className="text-xs text-gray-600">筋トレ・有酸素・日常活動を記録</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">コンディションを記録</p>
                                                <p className="text-xs text-gray-600">体重・睡眠・体調を記録</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">AI分析を実行</p>
                                                <p className="text-xs text-gray-600">栄養バランス・改善点を自動分析</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">5</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">指示書を確認</p>
                                                <p className="text-xs text-gray-600">具体的な行動アドバイスを取得</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-2 bg-white rounded-lg border border-gray-100">
                                            <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">6</div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800">実践 → 継続</p>
                                                <p className="text-xs text-gray-600">指示書に従って改善を続ける</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* 便利な使い方 */}
                        <details className="border border-blue-200 rounded-lg bg-blue-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-blue-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="Zap" size={16} className="text-blue-600" />
                                便利な使い方
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-blue-200">
                                <div className="space-y-3">
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Camera" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">写真で食事解析</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            食事の写真を撮るだけでAIが自動認識。カロリー・栄養素を瞬時に計算します。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Copy" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">予測入力</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            前日の記録をワンタップでコピー。同じ食事が続く日の入力が楽になります。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="RefreshCw" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">ルーティン入力</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            毎日同じ食事はルーティンに登録。ワンタップで一括入力できます。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="TrendingUp" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">履歴分析</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            週間・月間の傾向を可視化。長期的な改善ポイントが見えてきます。
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon name="Lightbulb" size={14} className="text-blue-600" />
                                            <p className="font-medium text-sm text-gray-800">閃き</p>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            日々の活動から生まれたアイデアやノウハウを記録。自分だけの知見を蓄積できます。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* 用語集 */}
                        <details className="border border-purple-200 rounded-lg bg-purple-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-purple-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="BookOpen" size={16} className="text-purple-600" />
                                用語集
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-purple-200">
                                <div className="space-y-2">
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">PGBASE</p>
                                        <p className="text-xs text-gray-600">あなた専用の情報データベース。教科書で基礎と応用が学べ、AIがより的確なアドバイスを提供します。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">指示書</p>
                                        <p className="text-xs text-gray-600">AI分析結果に基づく具体的な行動アドバイス。「明日は○○を食べましょう」など実践的な内容です。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">LBM（除脂肪体重）</p>
                                        <p className="text-xs text-gray-600">体重から脂肪を除いた重さ。筋肉量の指標となり、基礎代謝や必要カロリー計算に使用されます。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">PFCバランス</p>
                                        <p className="text-xs text-gray-600">タンパク質(P)・脂質(F)・炭水化物(C)の比率。プロフィール設定から自分でカスタマイズできます。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-purple-700">クレジット</p>
                                        <p className="text-xs text-gray-600">AI分析・写真解析を実行するために必要なポイント。Premium会員は毎月補充されます。</p>
                                    </div>
                                </div>
                            </div>
                        </details>

                        {/* FAQ */}
                        <details className="border border-green-200 rounded-lg bg-green-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-green-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="MessageCircle" size={16} className="text-green-600" />
                                よくある質問
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-green-200">
                                <div className="space-y-2">
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. 無料で何ができますか？
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            食事・運動の記録、基本的な栄養計算は無料です。AI分析・写真解析・履歴分析などはPremium機能となります（7日間無料トライアルあり）。
                                        </div>
                                    </details>
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. データは安全ですか？
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            すべてのデータはGoogleのセキュアなサーバー（Firebase）に暗号化して保存されます。第三者への提供は一切行いません。
                                        </div>
                                    </details>
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. 食品が見つかりません
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            検索で見つからない場合は「カスタム食品」で自分で登録できます。また、写真解析を使うとAIが自動認識してくれます。
                                        </div>
                                    </details>
                                    <details className="bg-white rounded border border-gray-100">
                                        <summary className="cursor-pointer p-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            Q. クレジットがなくなったら？
                                        </summary>
                                        <div className="p-2 pt-0 text-xs text-gray-600 border-t">
                                            Premium会員は毎月クレジットが補充されます。追加購入も可能です。無料会員の場合はPremiumへのアップグレードをご検討ください。
                                        </div>
                                    </details>
                                </div>
                            </div>
                        </details>

                        {/* 困ったときは */}
                        <details className="border border-orange-200 rounded-lg bg-orange-50/30">
                            <summary className="cursor-pointer p-3 hover:bg-orange-50 font-medium text-sm flex items-center gap-2">
                                <Icon name="AlertCircle" size={16} className="text-orange-600" />
                                困ったときは
                                <Icon name="ChevronDown" size={14} className="ml-auto text-gray-400" />
                            </summary>
                            <div className="p-3 pt-0 border-t border-orange-200">
                                <div className="space-y-2">
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">アプリが重い・固まる</p>
                                        <p className="text-xs text-gray-600">アプリを一度閉じて再起動してください。改善しない場合はブラウザのキャッシュをクリアしてください。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">データが保存されない</p>
                                        <p className="text-xs text-gray-600">インターネット接続を確認してください。オフラインでは一部機能が制限されます。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">通知が届かない</p>
                                        <p className="text-xs text-gray-600">ブラウザの通知許可を確認してください。設定→機能→通知設定から再設定も可能です。</p>
                                    </div>
                                    <div className="p-2 bg-white rounded border border-gray-100">
                                        <p className="font-medium text-sm text-orange-700">その他の問題</p>
                                        <p className="text-xs text-gray-600">上記の「フィードバック」からお問い合わせください。できる限り早くサポートいたします。</p>
                                    </div>
                                </div>
                            </div>
                        </details>
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
                                const currentDay = usageDays; // usageDays: 登録からの経過日数（1日目=0, 2日目=1...）
                                const isPremium = userProfile?.subscriptionStatus === 'active';
                                const isTrial = currentDay < 7; // 0-6日目がトライアル（1-7日目）
                                const hasPremiumAccess = isTrial || isPremium;

                                // 実際のunlockedFeatures配列を使って開放状態を判定
                                const isUnlocked = (featureId) => {
                                    return Array.isArray(unlockedFeatures) && unlockedFeatures.includes(featureId);
                                };

                                const featureList = [
                                    // 無料機能（常に利用可能）
                                    { id: 'food', name: '食事記録', unlocked: isUnlocked('food'), free: true },
                                    { id: 'training', name: '運動記録', unlocked: isUnlocked('training'), free: true },
                                    { id: 'condition', name: 'コンディション', unlocked: isUnlocked('condition'), free: true },
                                    { id: 'template', name: 'テンプレート（1枠）', unlocked: isUnlocked('template'), free: true },
                                    { id: 'routine', name: 'ルーティン', unlocked: isUnlocked('routine'), free: true },
                                    { id: 'shortcut', name: 'ショートカット', unlocked: isUnlocked('shortcut'), free: true },

                                    // Premium専用機能（トライアル期間 or Premium会員）
                                    { id: 'ai_photo_recognition', name: 'AI食事認識', unlocked: isUnlocked('ai_photo_recognition'), premium: !hasPremiumAccess },
                                    { id: 'analysis', name: 'AI分析', unlocked: isUnlocked('analysis'), premium: !hasPremiumAccess },
                                    { id: 'idea', name: '閃き', unlocked: isUnlocked('idea'), premium: !hasPremiumAccess },
                                    { id: 'history', name: '履歴', unlocked: isUnlocked('history'), premium: !hasPremiumAccess },
                                    { id: 'pg_base', name: 'PG BASE', unlocked: isUnlocked('pg_base'), premium: !hasPremiumAccess },
                                    { id: 'community', name: 'コミュニティ', unlocked: isUnlocked('community'), premium: !hasPremiumAccess },
                                    { id: 'detailed_nutrients', name: '詳細栄養素', unlocked: isUnlocked('detailed_nutrients'), premium: !hasPremiumAccess }
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
                                            // PremiumServiceを使用してPremium状態を無効化
                                            const success = await window.PremiumService.setPremiumStatus(userId, false);
                                            if (success) {
                                                console.log('[開発モード] 無料会員に切り替え（PremiumService）');
                                                toast.success('無料会員に切り替えました');
                                                window.location.reload();
                                            } else {
                                                throw new Error('setPremiumStatus failed');
                                            }
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
                                            // PremiumServiceを使用してPremium状態を有効化
                                            const success = await window.PremiumService.setPremiumStatus(userId, true);
                                            if (success) {
                                                // クレジットが0または未設定の場合は100を付与
                                                const expInfo = await window.ExperienceService.getUserExperience(userId);
                                                if (expInfo.totalCredits === 0) {
                                                    await window.ExperienceService.addFreeCredits(userId, 100);
                                                    console.log('[開発モード] 無料クレジットを100付与');
                                                }

                                                const updatedExpInfo = await window.ExperienceService.getUserExperience(userId);
                                                console.log('[開発モード] Premium会員に切り替え（PremiumService）');
                                                toast.success(`Premium会員に切り替えました（クレジット: ${updatedExpInfo.totalCredits}）`);
                                                window.location.reload();
                                            } else {
                                                throw new Error('setPremiumStatus failed');
                                            }
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

                    </div>
                </div>
            </details>
        </>
    );
};

export default OtherTab;
