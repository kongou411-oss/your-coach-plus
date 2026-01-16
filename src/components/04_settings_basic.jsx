import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { isNativeApp } from '../capacitor-push';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// iOS版でコード機能を非表示にするためのヘルパー（App Storeガイドライン3.1.1対応）
const isIOSNative = () => isNativeApp() && Capacitor.getPlatform() === 'ios';

// ===== コード入力セクション（企業コード・紹介コード・ギフトコード統合） =====
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
        setValidating(true);
        try {
            const functions = window.firebase.app().functions('asia-northeast2');
            const applyCode = functions.httpsCallable('applyReferralCode');
            const result = await applyCode({
                referralCode: code.trim().toUpperCase()
            });

            toast.success(result.data.message || '紹介コードを適用しました！50クレジットが付与されました。');
            setHasReferral(true);
            setReferralInfo({ appliedAt: new Date() });
            setCode('');
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
            applyReferralCode();
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
                <div key="enterprise" className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <Icon name="Building" size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-green-800 text-sm">企業プラン有効</h4>
                            {enterpriseInfo && (
                                <p className="text-xs text-gray-600 mt-1">
                                    {enterpriseInfo.companyName || '企業'}
                                    {enterpriseInfo.expiresAt && ` (〜${new Date(enterpriseInfo.expiresAt).toLocaleDateString('ja-JP')})`}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (hasReferral) {
            items.push(
                <div key="referral" className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <Icon name="Gift" size={16} className="text-pink-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-pink-800 text-sm">紹介コード適用済み</h4>
                            <p className="text-xs text-pink-700">50回分のクレジット付与済み</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (hasGiftCode) {
            items.push(
                <div key="giftcode" className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <Icon name="Crown" size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-purple-800 text-sm">ギフトコード適用済み</h4>
                            {giftCodeInfo?.code && (
                                <p className="text-xs text-gray-600">コード: {giftCodeInfo.code}</p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return items.length > 0 ? <div className="space-y-2">{items}</div> : null;
    };

    // メインのコード入力フォーム
    return (
        <div className="space-y-3">
            {/* 既存のアクセス権表示 */}
            {renderExistingAccess()}

            {/* コード入力説明 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-start gap-2">
                        <Icon name="Building" size={12} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span><strong>企業コード</strong>（B2B-XXXX）: 法人・ジム向けプレミアム</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Icon name="Gift" size={12} className="text-pink-600 mt-0.5 flex-shrink-0" />
                        <span><strong>紹介コード</strong>（USER-XXXX）: 50回クレジット特典</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Icon name="Crown" size={12} className="text-purple-600 mt-0.5 flex-shrink-0" />
                        <span><strong>ギフトコード</strong>: Premium無料招待</span>
                    </div>
                </div>
            </div>

            {/* コード入力フォーム */}
            {(!hasEnterpriseAccess || !hasReferral || !hasGiftCode) && (
                <div className="space-y-2">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="コードを入力"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none font-mono text-sm ${
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
                        <p className={`text-xs ${
                            codeType === 'enterprise' ? 'text-blue-600'
                            : codeType === 'referral' ? 'text-pink-600'
                            : 'text-purple-600'
                        }`}>
                            {codeType === 'enterprise' ? '企業コード' : codeType === 'referral' ? '紹介コード' : 'ギフトコード'}として認識
                        </p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={validating || !code.trim()}
                        className={`w-full px-3 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm ${
                            validating || !code.trim()
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                : codeType === 'referral'
                                ? 'bg-pink-600 text-white hover:bg-pink-700'
                                : codeType === 'gift'
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        {validating ? (
                            <>
                                <Icon name="Loader" size={16} className="animate-spin" />
                                検証中...
                            </>
                        ) : (
                            <>
                                <Icon name="Key" size={16} />
                                コードを認証
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* 全て適用済みの場合 */}
            {hasEnterpriseAccess && hasReferral && hasGiftCode && (
                <p className="text-xs text-gray-600 text-center py-1">
                    すべてのコードが適用済みです
                </p>
            )}
        </div>
    );
};

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
    onOpenSubscription,
    setVerificationCode,
    showConfirm,
    handleSave,
    userId,
    unlockedFeatures
}) => {
    const Icon = window.Icon;
    const LBMUtils = window.LBMUtils;

    // アイコン画像クロップ用state
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    // 画像読み込み完了時に初期クロップを設定
    const handleImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        // 画像の中央に正方形のクロップ領域を設定
        const cropSize = Math.min(width, height) * 0.8;
        const x = (width - cropSize) / 2;
        const y = (height - cropSize) / 2;

        const initialCrop = {
            unit: 'px',
            x: x,
            y: y,
            width: cropSize,
            height: cropSize
        };
        setCrop(initialCrop);
        setCompletedCrop(initialCrop);
    };

    // 画像選択時
    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('画像サイズは5MB以下にしてください');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result);
            // 初期値はhandleImageLoadで設定される
            setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
            setCompletedCrop(null);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // リセット
    };

    // クロップ確定時
    const handleCropComplete = async () => {
        if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) {
            toast.error('範囲を選択してください');
            return;
        }

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        const pixelCrop = {
            x: completedCrop.x * scaleX,
            y: completedCrop.y * scaleY,
            width: completedCrop.width * scaleX,
            height: completedCrop.height * scaleY
        };

        const outputSize = 200;
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            outputSize,
            outputSize
        );

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfile({...profile, avatarUrl: compressedDataUrl});

        // 即座にFirestoreに保存
        if (userId) {
            try {
                const db = firebase.firestore();
                await db.collection('users').doc(userId).update({
                    avatarUrl: compressedDataUrl
                });
                toast.success('アイコン画像を保存しました');
            } catch (err) {
                console.error('Avatar save error:', err);
                toast.error('アイコン画像の保存に失敗しました');
            }
        }

        setCropModalOpen(false);
        setImageSrc(null);
    };

    return (
        <>
        {/* アイコン画像クロップモーダル */}
        {cropModalOpen && (
            <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-bold text-lg">アイコン画像の範囲を選択</h3>
                        <button
                            onClick={() => {
                                setCropModalOpen(false);
                                setImageSrc(null);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <Icon name="X" size={20} />
                        </button>
                    </div>
                    <div className="p-4">
                        {imageSrc && (
                            <ReactCrop
                                crop={crop}
                                onChange={(c) => setCrop(c)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                circularCrop
                            >
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt="Crop"
                                    onLoad={handleImageLoad}
                                    style={{ maxHeight: '60vh', width: '100%', objectFit: 'contain' }}
                                />
                            </ReactCrop>
                        )}
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            ドラッグして範囲を選択してください
                        </p>
                    </div>
                    <div className="p-4 border-t flex gap-2">
                        <button
                            onClick={() => {
                                setCropModalOpen(false);
                                setImageSrc(null);
                            }}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleCropComplete}
                            className="flex-1 px-4 py-2 bg-[#4A9EFF] text-white rounded-lg hover:bg-blue-600 transition"
                        >
                            確定
                        </button>
                    </div>
                </div>
            </div>
        )}
        <div className="space-y-3">
            {/* プレミアム */}
            <details className="border rounded-lg border-amber-200 bg-[#FFF59A]/10">
                <summary className="cursor-pointer p-4 hover:bg-amber-100 font-medium flex items-center gap-2">
                    <Icon name="Crown" size={18} className="text-amber-600" />
                    プレミアム
                    {userProfile?.isPremium && (
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
                            const isPremium = userProfile?.isPremium;
                            const isGiftPremium = userProfile?.subscription?.giftCodeActive === true;
                            const isB2BPremium = userProfile?.b2b2cOrgId ? true : false;
                            const hasReferralBonus = userProfile?.referralBonusApplied === true;
                            
                            // コード利用者はトライアル対象外
                            const hasCodeAccess = isGiftPremium || isB2BPremium || hasReferralBonus;
                            const isTrial = !hasCodeAccess && usageDays < 7; // 0-6日目がトライアル（コード利用者除外）
                            const daysRemaining = isTrial ? Math.max(0, 7 - usageDays) : 0;

                            // 企業コード（B2B）でプレミアムの場合
                            if (isB2BPremium) {
                                const orgName = userProfile?.b2b2cOrgName || '企業';
                                const accessCode = userProfile?.b2b2cAccessCode || '-';
                                const joinedAt = userProfile?.b2b2cJoinedAt;

                                const formatDate = (timestamp) => {
                                    if (!timestamp) return '-';
                                    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                                    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                                };

                                return (
                                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Icon name="Building2" size={24} className="text-blue-600" />
                                            <div>
                                                <p className="font-bold text-gray-800">Premium会員</p>
                                                <p className="text-sm text-blue-600 font-medium">企業プラン</p>
                                            </div>
                                        </div>

                                        {/* 企業情報 */}
                                        <div className="bg-blue-50 p-3 rounded-lg mb-3 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">プラン</span>
                                                <span className="text-sm font-medium text-blue-700">企業（福利厚生）</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">適用コード</span>
                                                <span className="text-sm font-medium text-gray-800">{accessCode}</span>
                                            </div>
                                            {joinedAt && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">適用日</span>
                                                    <span className="text-sm font-medium text-gray-800">{formatDate(joinedAt)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-lg border border-blue-200 mb-3">
                                            <p className="text-sm font-medium text-gray-600 mb-1">料金</p>
                                            <p className="text-3xl font-bold text-blue-600">¥0</p>
                                            <p className="text-xs text-gray-600 mt-1">企業負担</p>
                                        </div>

                                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon name="CheckCircle" size={16} className="text-green-600" />
                                                <p className="text-sm font-medium text-green-800">全機能利用可能</p>
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                Premium機能をご利用いただけます。
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            // ギフトコードでプレミアムの場合
                            if (isGiftPremium) {
                                const giftCode = userProfile?.subscription?.giftCode || '-';
                                const activatedAt = userProfile?.subscription?.giftCodeActivatedAt;

                                const formatDate = (timestamp) => {
                                    if (!timestamp) return '-';
                                    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                                    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                                };

                                return (
                                    <div className="bg-white p-4 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Icon name="Gift" size={24} className="text-purple-600" />
                                            <div>
                                                <p className="font-bold text-gray-800">Premium会員</p>
                                                <p className="text-sm text-purple-600 font-medium">ギフトコード特典</p>
                                            </div>
                                        </div>

                                        {/* ギフト情報 */}
                                        <div className="bg-purple-50 p-3 rounded-lg mb-3 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">プラン</span>
                                                <span className="text-sm font-medium text-purple-700">ギフト（無料）</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">適用コード</span>
                                                <span className="text-sm font-medium text-gray-800">{giftCode}</span>
                                            </div>
                                            {activatedAt && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">適用日</span>
                                                    <span className="text-sm font-medium text-gray-800">{formatDate(activatedAt)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">有効期限</span>
                                                <span className="text-sm font-medium text-green-600">無期限</span>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg border border-purple-200 mb-3">
                                            <p className="text-sm font-medium text-gray-600 mb-1">料金</p>
                                            <p className="text-3xl font-bold text-purple-600">¥0</p>
                                            <p className="text-xs text-gray-600 mt-1">ギフト特典</p>
                                        </div>

                                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Icon name="Infinity" size={16} className="text-green-600" />
                                                <p className="text-sm font-medium text-green-800">無制限特典</p>
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                AI分析クレジットが無制限でご利用いただけます。
                                            </p>
                                        </div>
                                    </div>
                                );
                            }

                            if (isPremium) {
                                // Premium会員（有料）
                                const willCancel = userProfile?.subscription?.cancelAtPeriodEnd;
                                const periodEnd = userProfile?.subscription?.currentPeriodEnd;
                                const periodStart = userProfile?.subscription?.currentPeriodStart;
                                const interval = userProfile?.subscription?.interval || 'month';

                                // 日付フォーマット関数
                                const formatDate = (timestamp) => {
                                    if (!timestamp) return '-';
                                    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                                    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                                };

                                return (
                                    <div className="bg-white p-4 rounded-lg border border-amber-200">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Icon name="Crown" size={24} className="text-amber-600" />
                                            <div>
                                                <p className="font-bold text-gray-800">Premium会員</p>
                                                <p className="text-sm text-gray-600">
                                                    {willCancel ? '解約予定（期間終了まで利用可能）' : 'すべての機能が利用可能'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 契約情報 */}
                                        <div className="bg-gray-50 p-3 rounded-lg mb-3 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">プラン</span>
                                                <span className="text-sm font-medium text-gray-800">
                                                    {interval === 'year' ? '年額プラン' : '月額プラン'}
                                                </span>
                                            </div>
                                            {periodStart && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">開始日</span>
                                                    <span className="text-sm font-medium text-gray-800">{formatDate(periodStart)}</span>
                                                </div>
                                            )}
                                            {periodEnd && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">終了日</span>
                                                    <span className="text-sm font-medium text-gray-800">{formatDate(periodEnd)}</span>
                                                </div>
                                            )}
                                            {!willCancel ? (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">次回請求日</span>
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {periodEnd ? formatDate(periodEnd) : '-'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">解約予定</span>
                                                    <span className="text-sm font-medium text-orange-600">
                                                        {periodEnd ? formatDate(periodEnd) : '-'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {willCancel && periodEnd && (
                                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mb-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon name="AlertCircle" size={16} className="text-orange-600" />
                                                    <p className="text-sm font-medium text-orange-800">解約予定</p>
                                                </div>
                                                <p className="text-xs text-gray-600">
                                                    {formatDate(periodEnd)} までプレミアム機能をご利用いただけます。
                                                    その後は無料プランに移行します。
                                                </p>
                                            </div>
                                        )}

                                        <div className="bg-[#FFF59A]/10 p-4 rounded-lg border border-amber-200 mb-3">
                                            <p className="text-sm font-medium text-gray-600 mb-1">
                                                {interval === 'year' ? '年額料金' : '月額料金'}
                                            </p>
                                            <p className="text-3xl font-bold text-amber-600">
                                                {interval === 'year' ? '¥9,400' : '¥940'}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">税込</p>
                                        </div>

                                        <div className="space-y-2">
                                            {willCancel ? (
                                                <button
                                                    className="w-full bg-[#FFF59A] text-gray-800 font-bold py-2 rounded-lg hover:opacity-90"
                                                    onClick={() => showConfirm(
                                                        'サブスクリプション再開の確認',
                                                        'サブスクリプションを再開しますか？解約予定をキャンセルして、継続利用が可能になります。',
                                                        async () => {
                                                            try {
                                                                const functions = window.firebase.app().functions('asia-northeast2');
                                                                const resumeSubscription = functions.httpsCallable('resumeSubscription');
                                                                await resumeSubscription();
                                                                toast.success('サブスクリプションを再開しました');
                                                                // ページリロードでデータを更新
                                                                setTimeout(() => window.location.reload(), 1500);
                                                            } catch (error) {
                                                                console.error('[Subscription] Resume error:', error);
                                                                toast.error('再開処理中にエラーが発生しました: ' + error.message);
                                                            }
                                                        }
                                                    )}
                                                >
                                                    サブスクリプション再開
                                                </button>
                                            ) : (
                                                <button
                                                    className="w-full bg-gray-200 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-300"
                                                    onClick={() => showConfirm(
                                                        'サブスクリプション解約の確認',
                                                        'サブスクリプションを解約しますか？解約後も現在の課金期間終了まで利用できます。',
                                                        async () => {
                                                            try {
                                                                const functions = window.firebase.app().functions('asia-northeast2');
                                                                const cancelSubscription = functions.httpsCallable('cancelSubscription');
                                                                await cancelSubscription();
                                                                toast.success('サブスクリプションを解約しました');
                                                                // ページリロードでデータを更新
                                                                setTimeout(() => window.location.reload(), 1500);
                                                            } catch (error) {
                                                                console.error('[Subscription] Cancel error:', error);
                                                                toast.error('解約処理中にエラーが発生しました: ' + error.message);
                                                            }
                                                        }
                                                    )}
                                                >
                                                    サブスクリプション解約
                                                </button>
                                            )}

                                            <button
                                                className="w-full bg-[#FFF59A] text-gray-800 font-bold py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                                                onClick={() => onOpenSubscription('credit_pack')}
                                            >
                                                <Icon name="ShoppingCart" size={18} />
                                                クレジット追加購入
                                            </button>

                                            <button
                                                className="w-full bg-white text-gray-600 py-2 rounded-lg hover:bg-gray-50 border border-gray-200 flex items-center justify-center gap-2 text-sm"
                                                onClick={async () => {
                                                    try {
                                                        const functions = window.firebase.app().functions('asia-northeast2');
                                                        const syncSubscriptionInfo = functions.httpsCallable('syncSubscriptionInfo');
                                                        toast.loading('同期中...', { id: 'sync' });
                                                        await syncSubscriptionInfo();
                                                        toast.success('サブスクリプション情報を同期しました', { id: 'sync' });
                                                        setTimeout(() => window.location.reload(), 1000);
                                                    } catch (error) {
                                                        console.error('[Subscription] Sync error:', error);
                                                        toast.error('同期に失敗しました: ' + error.message, { id: 'sync' });
                                                    }
                                                }}
                                            >
                                                <Icon name="RefreshCw" size={14} />
                                                契約情報を更新
                                            </button>
                                        </div>
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

                                        <div className="space-y-2">
                                            <button
                                                className="w-full bg-[#FFF59A] text-gray-800 font-bold py-3 rounded-lg hover:opacity-90 relative overflow-hidden"
                                                onClick={() => onOpenSubscription && onOpenSubscription('premium')}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    <Icon name="Crown" size={18} />
                                                    月額940円でPremium登録
                                                </span>
                                            </button>

                                            <button
                                                className="w-full bg-white text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-50 border-2 border-[#FFF59A] flex items-center justify-center gap-2"
                                                onClick={() => onOpenSubscription && onOpenSubscription('credit_pack')}
                                            >
                                                <Icon name="ShoppingCart" size={18} />
                                                クレジット追加購入
                                            </button>
                                        </div>

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

                                        <div className="space-y-2">
                                            <button
                                                className="w-full bg-[#FFF59A] text-gray-800 font-bold py-3 rounded-lg hover:opacity-90 relative overflow-hidden"
                                                onClick={() => onOpenSubscription && onOpenSubscription('premium')}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    <Icon name="Crown" size={18} />
                                                    月額940円でPremium登録
                                                </span>
                                            </button>

                                            <button
                                                className="w-full bg-white text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-50 border-2 border-[#FFF59A] flex items-center justify-center gap-2"
                                                onClick={() => onOpenSubscription && onOpenSubscription('credit_pack')}
                                            >
                                                <Icon name="ShoppingCart" size={18} />
                                                クレジット追加購入
                                            </button>
                                        </div>

                                    </div>
                                );
                            }
                        })()}

                        {/* 友達紹介 */}
                        <div className="border-t border-amber-200 pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon name="Gift" size={18} className="text-pink-600" />
                                <h4 className="font-bold text-gray-800">友達紹介で特典ゲット</h4>
                            </div>
                            <div className="bg-pink-50 p-4 rounded-lg border border-pink-200 mb-4">
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-start gap-2">
                                        <Icon name="Check" size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>友達:</strong> 50回分の分析クレジット</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Icon name="Check" size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>あなた:</strong> 50回分の分析クレジット</span>
                                    </div>
                                </div>
                            </div>
                            {/* iOS版では紹介コード機能を非表示（App Storeガイドライン3.1.1対応） */}
                            {!isIOSNative() && <ReferralCodeSection userProfile={userProfile} userId={userId} />}
                        </div>

                        {/* コード入力 - iOS版では非表示（App Storeガイドライン3.1.1対応） */}
                        {!isIOSNative() && (
                            <div className="border-t border-amber-200 pt-4 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon name="Key" size={18} className="text-purple-600" />
                                    <h4 className="font-bold text-gray-800">コード入力</h4>
                                </div>
                                <CodeInputSection userId={userId} userProfile={userProfile} />
                            </div>
                        )}
                    </div>
                </div>
            </details>

            {/* アカウント */}
            <details id="account" className="border rounded-lg">
                <summary className="cursor-pointer p-4 hover:bg-gray-50 font-medium flex items-center gap-2">
                    <Icon name="UserCircle" size={18} className="text-[#4A9EFF]" />
                    アカウント
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 pt-0 border-t">
                    <div className="space-y-4 pb-4">
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
                                {userProfile?.subscription?.giftCodeActive ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">合計</span>
                                            <div className="flex items-center gap-1">
                                                <Icon name="Infinity" size={24} className="text-purple-600" />
                                                <span className="text-sm text-purple-600 font-medium">無制限</span>
                                            </div>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                            <div className="flex items-center gap-2">
                                                <Icon name="Gift" size={16} className="text-purple-600" />
                                                <p className="text-sm text-purple-700 font-medium">ギフト特典: 無制限</p>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">
                                                AI分析を無制限でご利用いただけます
                                            </p>
                                        </div>
                                    </div>
                                ) : (
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
                                )}
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
                                                <Icon name="HelpCircle" size={16} className="inline mr-1" />
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
                                                            isPremium: userProfile?.isPremium || false,
                                                            giftCodeActive: userProfile?.subscription?.giftCodeActive || false,
                                                            b2b2cOrgId: userProfile?.b2b2cOrgId || null,
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
                                    if (!showConfirm) {
                                        toast.error('確認モーダルが利用できません');
                                        return;
                                    }
                                    const isPremium = userProfile?.isPremium;
                                    const warningMessage = isPremium
                                        ? 'アカウントを削除すると、有料プランの有効期限が残っていても即座に無効になり、すべてのデータが完全に削除されます。日割り等の返金は行われません。この操作は取り消せません。本当に削除しますか？'
                                        : 'アカウントを削除すると、すべてのデータが完全に削除されます。この操作は取り消せません。本当に削除しますか？';

                                    showConfirm(
                                        'アカウント削除の確認',
                                        warningMessage,
                                        () => {
                                            showConfirm(
                                                '最終確認',
                                                'この操作は取り消せません。本当によろしいですか？',
                                                async () => {
                                                    try {
                                                        const user = firebase.auth().currentUser;
                                                        if (!user) {
                                                            toast.error('ログインしていません');
                                                            return;
                                                        }

                                                        // Cloud Functionを呼び出して完全削除（Stripe + Firestore + Auth）
                                                        const functions = window.firebase.app().functions('asia-northeast2');
                                                        const deleteAccount = functions.httpsCallable('deleteAccount');

                                                        await deleteAccount();

                                                        // LocalStorage・SessionStorageをクリア
                                                        localStorage.clear();
                                                        sessionStorage.clear();

                                                        // 削除成功メッセージを表示
                                                        toast.success('アカウントを完全に削除しました。ご利用ありがとうございました。');

                                                        // ログイン画面にリダイレクト（即座にリロード）
                                                        setTimeout(() => {
                                                            window.location.href = '/';
                                                        }, 1500);
                                                    } catch (error) {
                                                        console.error('[Account Delete] Error:', error);
                                                        const errorMessage = error.message || 'アカウント削除中にエラーが発生しました';
                                                        toast.error(errorMessage);
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
                                    async () => {
                                        // LocalStorageをクリア（オンボーディング状態や機能開放状態をリセット）
                                        localStorage.clear();
                                        sessionStorage.clear();
                                        // ネイティブアプリの場合はGoogle認証もサインアウト
                                        if (isNativeApp()) {
                                            try {
                                                await GoogleAuth.signOut();
                                            } catch (error) {
                                                console.error('[Logout] GoogleAuth signOut error:', error);
                                            }
                                        }
                                        // ログアウト実行
                                        await firebase.auth().signOut();
                                        // ページをリロードして完全にリセット
                                        window.location.reload();
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
                    <Icon name="User" size={18} className="text-[#4A9EFF]" />
                    プロフィール
                    <Icon name="ChevronDown" size={16} className="ml-auto text-gray-400" />
                </summary>
                <div className="p-4 border-t">
                    {/* プロフィール入力 */}
                    <div className="space-y-3 pb-4">

                            {/* 計算ロジック解説 */}
                            <details className="bg-blue-50 border-2 border-blue-200 rounded-lg mb-4">
                                <summary className="cursor-pointer p-3 hover:bg-blue-100 font-medium flex items-center gap-2 text-blue-800">
                                    <Icon name="HelpCircle" size={16} className="text-blue-600" />
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
                                                <strong>ペースからの自動計算:</strong><br/>
                                                体脂肪 1kg ≒ 7,200 kcal<br/>
                                                カロリー調整 = (月間目標kg × 7,200) ÷ 30日
                                            </p>
                                            <p className="text-gray-600 mt-1">
                                                • ダイエット標準: -1 kg/月 → -240kcal/日<br/>
                                                • バルクアップ標準: +1 kg/月 → +240kcal/日<br/>
                                                • メンテナンス/リコンプ: 0kcal<br/>
                                                • ペースは4段階から選択、またはカスタム入力可能
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
                                    {/* アイコン画像 */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">アイコン画像</label>
                                        <div className="flex items-center gap-4">
                                            {/* プレビュー */}
                                            <div className="relative">
                                                {profile.avatarUrl ? (
                                                    <img
                                                        src={profile.avatarUrl}
                                                        alt="アイコン"
                                                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                                        {profile.nickname?.[0] || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            {/* アップロードボタン */}
                                            <div className="flex flex-col gap-2">
                                                <label className="cursor-pointer px-4 py-2 bg-[#4A9EFF] text-white text-sm rounded-lg hover:bg-blue-600 transition flex items-center gap-2">
                                                    <Icon name="Camera" size={16} />
                                                    画像を選択
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleImageSelect}
                                                    />
                                                </label>
                                                {profile.avatarUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            setProfile({...profile, avatarUrl: null});

                                                            // 即座にFirestoreから削除
                                                            if (userId) {
                                                                try {
                                                                    const db = firebase.firestore();
                                                                    await db.collection('users').doc(userId).update({
                                                                        avatarUrl: firebase.firestore.FieldValue.delete()
                                                                    });
                                                                    toast.success('アイコン画像を削除しました');
                                                                } catch (err) {
                                                                    console.error('Avatar delete error:', err);
                                                                    toast.error('アイコン画像の削除に失敗しました');
                                                                }
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                                                    >
                                                        <Icon name="Trash2" size={16} />
                                                        削除
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">COMYの投稿やプロフィールで表示されます</p>
                                    </div>
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
                                                value={profile.mealsPerDay || 5}
                                                onChange={(e) => setProfile({...profile, mealsPerDay: Number(e.target.value)})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none"
                                            >
                                                <option value={2}>2回</option>
                                                <option value={3}>3回</option>
                                                <option value={4}>4回</option>
                                                <option value={5}>5回（推奨）</option>
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
• タンパク質：LBM × ${profile.style === 'ボディメイカー' ? '2.3' : '1.2'}
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
• タンパク質：LBM × ${profile.style === 'ボディメイカー' ? '2.3' : '1.2'}
• 炭水化物：多め（筋肉合成のエネルギー）
• 推奨ペース：週0.5kg増

【リコンプ（体組成改善）】
• 目標：脂肪を落としながら筋肉をつける
• メンテナンスカロリー：${(() => {
    const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight, profile.bodyFatPercentage || 15);
    const fatMass = profile.weight - lbm;
    return Math.round(LBMUtils.calculateTDEE(lbm, profile.activityLevel, profile.customActivityMultiplier, fatMass));
})()}kcal
• タンパク質：LBM × ${profile.style === 'ボディメイカー' ? '2.3' : '1.2'}
• トレーニング強度が最重要

目的はいつでも変更できます。`
                                        })}
                                        className="text-[#4A9EFF] hover:text-[#3b8fef]"
                                    >
                                        <Icon name="HelpCircle" size={16} />
                                    </button>
                                </label>

                                {/* 目的選択（ボタン、縦並び）*/}
                                <div className="space-y-2 mb-3">
                                    {[
                                        { value: 'ダイエット', label: 'ダイエット', sub: '脂肪を落とす', defaultPace: -1 },
                                        { value: 'メンテナンス', label: 'メンテナンス', sub: '現状維持', defaultPace: 0 },
                                        { value: 'バルクアップ', label: 'バルクアップ', sub: '筋肉をつける', defaultPace: 1 },
                                        { value: 'リコンプ', label: 'リコンプ', sub: '体組成改善', defaultPace: 0 }
                                    ].map(({ value, label, sub, defaultPace }) => {
                                        // ペースからカロリー調整値を算出
                                        const adjust = LBMUtils.calculateCalorieAdjustmentFromPace(defaultPace, 'kg');
                                        return (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => {
                                                setProfile({
                                                    ...profile,
                                                    purpose: value,
                                                    weightChangePace: defaultPace,
                                                    paceUnit: 'kg',
                                                    customPaceValue: null,
                                                    calorieAdjustment: adjust
                                                });
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
                                                {defaultPace !== 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        標準: {defaultPace > 0 ? '+' : ''}{defaultPace} kg/月
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                adjust > 0 ? 'bg-green-100 text-green-700' :
                                                adjust < 0 ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {adjust > 0 ? '+' : ''}{adjust}kcal
                                            </div>
                                        </button>
                                    )})}
                                </div>

                                {/* ペース設定（ダイエット・バルクアップ時のみ表示） */}
                                {(profile.purpose === 'ダイエット' || profile.purpose === 'バルクアップ') && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                            <span>ペース設定</span>
                                            <button
                                                type="button"
                                                onClick={() => setInfoModal({
                                                    show: true,
                                                    title: 'ペース設定について',
                                                    content: `体重変化のペースを設定すると、カロリー調整値が自動計算されます。

【計算式】
体脂肪 1kg ≒ 7,200 kcal
日次カロリー調整 = (月間目標kg × 7,200) ÷ 30日

【単位の違い】
• kg/月: 体重の絶対変化量（体格に関係なく固定）
• 体脂肪率%/月: 現在の体重に対する割合で変化
  （例: 70kgで-1%→-0.7kg→-168kcal/日）

【推奨ペース】
ダイエット: -0.5〜-2 kg/月 または -1〜-3%/月
バルクアップ: +0.5〜+2 kg/月 または +0.5〜+2%/月

※ 安全のため、上限は -1,000〜+500 kcal/日 に制限されています。`
                                                })}
                                                className="text-[#4A9EFF] hover:text-[#3b8fef]"
                                            >
                                                <Icon name="HelpCircle" size={16} />
                                            </button>
                                        </label>

                                        {/* 単位選択 */}
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newPresets = LBMUtils.getPacePresets(profile.purpose, 'kg', profile.weight);
                                                    const defaultPreset = newPresets.find(p => Math.abs(p.value) === 1) || newPresets[1];
                                                    setProfile({
                                                        ...profile,
                                                        paceUnit: 'kg',
                                                        weightChangePace: defaultPreset?.value || (profile.purpose === 'ダイエット' ? -1 : 1),
                                                        customPaceValue: null,
                                                        calorieAdjustment: defaultPreset?.kcal || (profile.purpose === 'ダイエット' ? -240 : 240)
                                                    });
                                                }}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                    (profile.paceUnit || 'kg') === 'kg'
                                                        ? 'bg-[#4A9EFF] text-white'
                                                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                kg/月
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newPresets = LBMUtils.getPacePresets(profile.purpose, 'bf_percent', profile.weight);
                                                    const defaultPreset = newPresets.find(p => Math.abs(p.value) === 1) || newPresets[1];
                                                    setProfile({
                                                        ...profile,
                                                        paceUnit: 'bf_percent',
                                                        weightChangePace: defaultPreset?.value || (profile.purpose === 'ダイエット' ? -1 : 1),
                                                        customPaceValue: null,
                                                        calorieAdjustment: defaultPreset?.kcal || 0
                                                    });
                                                }}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                    profile.paceUnit === 'bf_percent'
                                                        ? 'bg-[#4A9EFF] text-white'
                                                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                体脂肪率%/月
                                            </button>
                                        </div>

                                        {/* プリセット選択 */}
                                        <div className="space-y-2 mb-3">
                                            {LBMUtils.getPacePresets(profile.purpose, profile.paceUnit || 'kg', profile.weight).map((preset) => (
                                                <button
                                                    key={preset.value}
                                                    type="button"
                                                    onClick={() => {
                                                        const unit = profile.paceUnit || 'kg';
                                                        const adjustment = LBMUtils.calculateCalorieAdjustmentFromPace(preset.value, unit, profile.weight);
                                                        setProfile({
                                                            ...profile,
                                                            weightChangePace: preset.value,
                                                            customPaceValue: null,
                                                            calorieAdjustment: adjustment
                                                        });
                                                    }}
                                                    className={`w-full p-2 rounded-lg border-2 transition flex items-center justify-between ${
                                                        profile.weightChangePace === preset.value && !profile.customPaceValue
                                                            ? 'border-[#4A9EFF] bg-blue-50'
                                                            : 'border-gray-200 bg-white hover:border-[#4A9EFF]'
                                                    }`}
                                                >
                                                    <div className="font-bold text-sm">{preset.label}</div>
                                                    <div className="text-xs text-gray-600">{preset.description}</div>
                                                    <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                        preset.kcal > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {preset.kcal > 0 ? '+' : ''}{preset.kcal} kcal/日
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        {/* カスタムペース入力 */}
                                        <div className="border-t pt-3">
                                            <div className="text-xs text-gray-600 mb-2">またはカスタム値を入力:</div>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={profile.customPaceValue !== undefined && profile.customPaceValue !== null ? profile.customPaceValue : ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value === '' ? null : Number(e.target.value);
                                                        const unit = profile.paceUnit || 'kg';
                                                        const adjustment = value !== null
                                                            ? LBMUtils.calculateCalorieAdjustmentFromPace(value, unit, profile.weight)
                                                            : 0;
                                                        setProfile({
                                                            ...profile,
                                                            customPaceValue: value,
                                                            weightChangePace: value,
                                                            calorieAdjustment: adjustment
                                                        });
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A9EFF] focus:border-[#4A9EFF] focus:outline-none text-sm"
                                                    placeholder={profile.purpose === 'ダイエット' ? '-1.5' : '0.75'}
                                                />
                                                <span className="text-sm text-gray-600 whitespace-nowrap">
                                                    {(profile.paceUnit || 'kg') === 'kg' ? 'kg/月' : '体脂肪率%/月'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 計算結果表示 */}
                                        {(() => {
                                            // 表示用のカロリー調整値を計算
                                            const pace = profile.customPaceValue !== null && profile.customPaceValue !== undefined
                                                ? profile.customPaceValue
                                                : profile.weightChangePace;
                                            const displayCalorie = pace
                                                ? LBMUtils.calculateCalorieAdjustmentFromPace(pace, profile.paceUnit || 'kg', profile.weight)
                                                : (profile.calorieAdjustment || 0);
                                            return (
                                                <div className={`mt-3 p-2 rounded-lg text-center ${
                                                    displayCalorie > 0 ? 'bg-green-100' :
                                                    displayCalorie < 0 ? 'bg-red-100' : 'bg-gray-100'
                                                }`}>
                                                    <div className="text-xs text-gray-600">算出カロリー調整値</div>
                                                    <div className={`text-lg font-bold ${
                                                        displayCalorie > 0 ? 'text-green-700' :
                                                        displayCalorie < 0 ? 'text-red-700' : 'text-gray-700'
                                                    }`}>
                                                        {displayCalorie > 0 ? '+' : ''}{displayCalorie} kcal/日
                                                    </div>
                                                    {pace && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {pace > 0 ? '+' : ''}{pace} {(profile.paceUnit || 'kg') === 'bf_percent' ? '体脂肪率%' : 'kg'}/月
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* メンテナンス・リコンプ時のカロリー調整（任意） */}
                                {(profile.purpose === 'メンテナンス' || profile.purpose === 'リコンプ') && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium mb-1.5 flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <span>カロリー調整値 (任意)</span>
                                                <span className="text-xs text-gray-600 font-normal mt-0.5">メンテナンスから微調整</span>
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
                                )}

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
                                            onClick={() => {
                                                setProfile({...profile, style: '一般'});
                                                // 一般: LBM×1.2 でPFC比率を自動計算
                                                const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
                                                const fatMass = (profile.weight || 70) - lbm;
                                                const tdee = LBMUtils.calculateTDEE(lbm, profile.activityLevel || 3, profile.customActivityMultiplier, fatMass);
                                                const adjustedCalories = tdee + (profile.calorieAdjustment || 0);
                                                const proteinG = lbm * 1.2;
                                                const proteinPercent = Math.round((proteinG * 4 / adjustedCalories) * 100);
                                                const clampedProtein = Math.max(15, Math.min(50, proteinPercent));
                                                const clampedCarb = Math.max(15, Math.min(60, 100 - clampedProtein - 25));
                                                setAdvancedSettings({
                                                    ...advancedSettings,
                                                    proteinRatio: clampedProtein,
                                                    fatRatioPercent: 25,
                                                    carbRatio: clampedCarb
                                                });
                                            }}
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
                                            onClick={() => {
                                                setProfile({...profile, style: 'ボディメイカー'});
                                                // ボディメイカー: LBM×2.3 でPFC比率を自動計算
                                                const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
                                                const fatMass = (profile.weight || 70) - lbm;
                                                const tdee = LBMUtils.calculateTDEE(lbm, profile.activityLevel || 3, profile.customActivityMultiplier, fatMass);
                                                const adjustedCalories = tdee + (profile.calorieAdjustment || 0);
                                                const proteinG = lbm * 2.3;
                                                const proteinPercent = Math.round((proteinG * 4 / adjustedCalories) * 100);
                                                const clampedProtein = Math.max(15, Math.min(50, proteinPercent));
                                                const clampedCarb = Math.max(15, Math.min(60, 100 - clampedProtein - 25));
                                                setAdvancedSettings({
                                                    ...advancedSettings,
                                                    proteinRatio: clampedProtein,
                                                    fatRatioPercent: 25,
                                                    carbRatio: clampedCarb
                                                });
                                            }}
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
                                        ※ボディメイカーはタンパク質の推奨量が一般の約2倍<br/>
                                        （一般 LBM×1.2、ボディメイカー LBM×2.3）、<br/>
                                        ビタミン・ミネラルの推奨量が3倍（耐容上限5倍）、食物繊維の推奨量が1.2倍になります
                                    </p>
                                </div>

                                <label className="block text-sm font-medium mb-1.5">
                                    PFCバランス（目標比率）
                                </label>

                                {/* カスタム比率設定 */}
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
                                                        proteinRatio: currentP, // proteinRatioも明示的に保存
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
                                                        proteinRatio: currentP, // proteinRatioも明示的に保存
                                                        carbRatio: newC,
                                                        fatRatioPercent: newF
                                                    });
                                                }
                                            }}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <div className="text-xs text-gray-600">
                                            合計 {(advancedSettings.proteinRatio || 30) + (advancedSettings.fatRatioPercent || 25) + (advancedSettings.carbRatio || 45)}%
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // スタイルに応じたLBMベースのデフォルトPFC比率を計算
                                                const lbm = profile.leanBodyMass || LBMUtils.calculateLBM(profile.weight || 70, profile.bodyFatPercentage || 15);
                                                const fatMass = (profile.weight || 70) - lbm;
                                                const tdee = LBMUtils.calculateTDEE(lbm, profile.activityLevel || 3, profile.customActivityMultiplier, fatMass);

                                                // カロリー調整を適用
                                                const calorieAdjustment = profile.calorieAdjustment || 0;
                                                const adjustedCalories = tdee + calorieAdjustment;

                                                // スタイル判定: ボディメイカー系はLBM×2.3、一般はLBM×1.2
                                                const bodymakerStyles = ['筋肥大', '筋力', '持久力', 'バランス', 'ボディメイカー'];
                                                const isBodymaker = bodymakerStyles.includes(profile.style);
                                                const proteinCoefficient = isBodymaker ? 2.3 : 1.2;

                                                // タンパク質をLBMベースで計算し、%に変換
                                                const proteinG = lbm * proteinCoefficient;
                                                const proteinCal = proteinG * 4;
                                                const proteinPercent = Math.round((proteinCal / adjustedCalories) * 100);

                                                // 脂質は25%固定
                                                const fatPercent = 25;

                                                // 炭水化物は残り
                                                const carbPercent = 100 - proteinPercent - fatPercent;

                                                // 範囲制限（P: 15-50%, F: 15-40%, C: 15-60%）
                                                const clampedProtein = Math.max(15, Math.min(50, proteinPercent));
                                                const clampedCarb = Math.max(15, Math.min(60, 100 - clampedProtein - fatPercent));

                                                setAdvancedSettings({
                                                    ...advancedSettings,
                                                    proteinRatio: clampedProtein,
                                                    fatRatioPercent: fatPercent,
                                                    carbRatio: clampedCarb
                                                });
                                            }}
                                            className="text-xs text-[#4A9EFF] hover:text-[#3b8fef] underline"
                                        >
                                            デフォルトに戻す
                                        </button>
                                    </div>
                                </div>
                            </div>
                    <button
                        onClick={handleSave}
                        className="w-full bg-[#4A9EFF] text-white font-bold py-2.5 rounded-lg hover:bg-[#3b8fef] transition"
                    >
                        保存
                    </button>
                </div>
            </div>
        </details>
        </div>
        </>
    );
};

// ===== 紹介コードセクション =====
const ReferralCodeSection = ({ userProfile, userId }) => {
    const Icon = window.Icon;
    const [referralCode, setReferralCode] = useState(userProfile?.referralCode || null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateReferralCode = async () => {
        setLoading(true);
        try {
            const functions = window.firebase.app().functions('asia-northeast2');
            const generateCode = functions.httpsCallable('generateReferralCode');
            const result = await generateCode();
            setReferralCode(result.data.referralCode);
            toast.success('紹介コードを生成しました！');
        } catch (error) {
            console.error('[Referral] Code generation failed:', error);
            toast.error('紹介コードの生成に失敗しました: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const copyReferralCode = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        toast.success('コードをコピーしました！');
        setTimeout(() => setCopied(false), 2000);
    };

    const copyReferralLink = () => {
        const referralLink = `${window.location.origin}/?ref=${referralCode}`;
        navigator.clipboard.writeText(referralLink);
        toast.success('リンクをコピーしました！');
    };

    const shareReferralLink = async () => {
        const referralLink = `${window.location.origin}/?ref=${referralCode}`;
        const shareText = `Your Coach+ を一緒に始めませんか？\n\n私の紹介コード「${referralCode}」を使うと、50回分の分析クレジットがもらえます！\n\n${referralLink}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Your Coach+ 友達紹介',
                    text: shareText,
                });
                toast.success('シェアしました！');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('[Referral] Share failed:', error);
                }
            }
        } else {
            // Web Share API非対応の場合はコピー
            navigator.clipboard.writeText(shareText);
            toast.success('紹介文をコピーしました！');
        }
    };

    if (!referralCode) {
        return (
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                    友達にYour Coach+を紹介して、お互いに特典をゲットしましょう！
                </p>
                <button
                    onClick={generateReferralCode}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>生成中...</span>
                        </>
                    ) : (
                        <>
                            <Icon name="Gift" size={20} />
                            <span>紹介コードを生成</span>
                        </>
                    )}
                </button>
            </div>
        );
    }

    const referralLink = `${window.location.origin}/?ref=${referralCode}`;

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
            {/* 紹介コード表示 */}
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">あなたの紹介コード</p>
                <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold text-gray-800 tracking-wider">{referralCode}</p>
                    <button
                        onClick={copyReferralCode}
                        className="p-2 hover:bg-white/50 rounded transition"
                        title="コードをコピー"
                    >
                        <Icon name={copied ? "Check" : "Copy"} size={20} className={copied ? "text-green-600" : "text-gray-600"} />
                    </button>
                </div>
            </div>

            {/* 紹介リンク */}
            <div>
                <p className="text-xs text-gray-600 mb-1">紹介リンク</p>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50"
                        onClick={(e) => e.target.select()}
                    />
                    <button
                        onClick={copyReferralLink}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
                    >
                        {copied ? 'コピー済み' : 'コピー'}
                    </button>
                </div>
            </div>

            {/* シェアボタン */}
            <button
                onClick={shareReferralLink}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
            >
                <Icon name="Share2" size={18} />
                <span>友達に紹介する</span>
            </button>

            {/* 紹介実績 */}
            {userProfile?.referralCreditsEarned > 0 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                        <Icon name="TrendingUp" size={16} className="text-green-600" />
                        <p className="text-sm text-gray-600">
                            紹介で獲得したクレジット: <strong className="text-green-600">{userProfile.referralCreditsEarned}回</strong>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BasicTab;
