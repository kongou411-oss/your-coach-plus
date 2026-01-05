import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { SUBSCRIPTION_PLAN, GOOGLE_PLAY_BILLING } from '../config';

// ===== Subscription View Component =====
const SubscriptionView = ({ onClose, userId, userProfile, initialTab = 'premium' }) => {
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(initialTab); // 'premium' or 'credit_pack'
    const [selectedCreditPack, setSelectedCreditPack] = useState(null);
    const [storeReady, setStoreReady] = useState(false);

    // プラットフォーム判定
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform(); // 'android', 'ios', 'web'

    // クレジットパックオプション（config.jsから取得）
    const creditPacks = SUBSCRIPTION_PLAN.aiCredits.purchaseOptions.map(option => ({
        ...option,
        badge: option.credits === 150 ? '人気' : option.credits === 300 ? 'お得' : undefined
    }));

    // Google Play Billing / App Store初期化
    useEffect(() => {
        if (!isNative || !window.CdvPurchase) {
            setStoreReady(true); // Web版はStripeを使用
            return;
        }

        const initializeStore = async () => {
            try {
                const { store, ProductType, Platform } = window.CdvPurchase;

                // プラットフォーム判定
                const storePlatform = platform === 'android' ? Platform.GOOGLE_PLAY : Platform.APPLE_APPSTORE;

                // 商品登録
                const products = [
                    {
                        id: GOOGLE_PLAY_BILLING.subscriptions.premium,
                        type: ProductType.PAID_SUBSCRIPTION,
                        platform: storePlatform,
                    },
                    {
                        id: GOOGLE_PLAY_BILLING.products.credits_50,
                        type: ProductType.CONSUMABLE,
                        platform: storePlatform,
                    },
                    {
                        id: GOOGLE_PLAY_BILLING.products.credits_150,
                        type: ProductType.CONSUMABLE,
                        platform: storePlatform,
                    },
                    {
                        id: GOOGLE_PLAY_BILLING.products.credits_300,
                        type: ProductType.CONSUMABLE,
                        platform: storePlatform,
                    }
                ];

                store.register(products);

                // 購入承認時の処理
                store.when().approved(async (transaction) => {
                    console.log('[IAP] Transaction approved:', transaction);
                    // サーバー側で領収書検証
                    await transaction.verify();
                });

                // 検証完了時の処理
                store.when().verified(async (receipt) => {
                    console.log('[IAP] Receipt verified:', receipt);

                    // Firebase Functions経由でPremium状態を更新
                    try {
                        const functions = window.firebase.app().functions('asia-northeast2');
                        const updatePremiumStatus = functions.httpsCallable('updatePremiumStatusFromReceipt');
                        await updatePremiumStatus({
                            userId: userId,
                            receipt: receipt,
                            platform: platform
                        });
                        toast.success('購入が完了しました！');
                    } catch (error) {
                        console.error('[IAP] Error updating premium status:', error);
                        toast.error('購入処理中にエラーが発生しました');
                    }

                    // 購入完了
                    receipt.finish();
                });

                // エラーハンドリング
                store.when().error((error) => {
                    console.error('[IAP] Store error:', error);
                    toast.error(`エラーが発生しました: ${error.message}`);
                });

                // ストア初期化
                await store.initialize([storePlatform]);
                setStoreReady(true);
                console.log('[IAP] Store initialized');
            } catch (error) {
                console.error('[IAP] Initialization error:', error);
                toast.error('ストアの初期化に失敗しました');
                setStoreReady(true); // エラーでも続行
            }
        };

        initializeStore();
    }, [isNative, platform, userId]);

    const handleSubscribe = async () => {
        if (loading || !storeReady) return;
        setLoading(true);

        try {
            // ネイティブプラットフォームの場合はGoogle Play Billing / App Storeを使用
            if (isNative && window.CdvPurchase) {
                const product = window.CdvPurchase.store.get(GOOGLE_PLAY_BILLING.subscriptions.premium);

                if (!product) {
                    toast.error('商品情報を取得できませんでした');
                    setLoading(false);
                    return;
                }

                if (!product.canPurchase) {
                    toast.error('この商品は購入できません');
                    setLoading(false);
                    return;
                }

                console.log('[IAP] Ordering product:', product);
                window.CdvPurchase.store.order(product);
                setLoading(false); // 購入フローはストアが管理するのでローディング解除
                return;
            }

            // Web版の場合はStripeを使用（既存の処理）
            const functions = window.firebase.app().functions('asia-northeast2');
            const createCheckoutSession = functions.httpsCallable('createCheckoutSession');

            const result = await createCheckoutSession({
                priceId: SUBSCRIPTION_PLAN.stripePriceId,
                mode: 'subscription',
                successUrl: `${window.location.origin}/?payment=success`,
                cancelUrl: `${window.location.origin}/?payment=cancel`,
            });

            if (result.data.url) {
                // Stripe Checkoutページにリダイレクト
                window.location.href = result.data.url;
            }
        } catch (error) {
            console.error('[Subscription] Error:', error);
            toast.error(`エラーが発生しました: ${error.message}`);
            setLoading(false);
        }
    };

    const handlePurchaseCredits = async () => {
        if (loading || !selectedCreditPack || !storeReady) return;
        setLoading(true);

        try {
            // ネイティブプラットフォームの場合はGoogle Play Billing / App Storeを使用
            if (isNative && window.CdvPurchase) {
                // クレジットパックに対応する商品IDを取得
                let productId;
                if (selectedCreditPack.credits === 50) {
                    productId = GOOGLE_PLAY_BILLING.products.credits_50;
                } else if (selectedCreditPack.credits === 150) {
                    productId = GOOGLE_PLAY_BILLING.products.credits_150;
                } else if (selectedCreditPack.credits === 300) {
                    productId = GOOGLE_PLAY_BILLING.products.credits_300;
                }

                const product = window.CdvPurchase.store.get(productId);

                if (!product) {
                    toast.error('商品情報を取得できませんでした');
                    setLoading(false);
                    return;
                }

                if (!product.canPurchase) {
                    toast.error('この商品は購入できません');
                    setLoading(false);
                    return;
                }

                console.log('[IAP] Ordering product:', product);
                window.CdvPurchase.store.order(product);
                setLoading(false); // 購入フローはストアが管理するのでローディング解除
                return;
            }

            // Web版の場合はStripeを使用（既存の処理）
            const functions = window.firebase.app().functions('asia-northeast2');
            const createCheckoutSession = functions.httpsCallable('createCheckoutSession');

            const result = await createCheckoutSession({
                priceId: selectedCreditPack.stripePriceId,
                mode: 'payment',
                successUrl: `${window.location.origin}/?payment=success&type=credits&amount=${selectedCreditPack.credits}`,
                cancelUrl: `${window.location.origin}/?payment=cancel`,
            });

            if (result.data.url) {
                // Stripe Checkoutページにリダイレクト
                window.location.href = result.data.url;
            }
        } catch (error) {
            console.error('[Subscription] Error:', error);
            toast.error(`エラーが発生しました: ${error.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* ヘッダー */}
                <div className="sticky top-0 bg-[#FFF59A] text-gray-800 p-6 z-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <Icon name="Crown" size={32} />
                            <h2 className="text-2xl font-bold">Premium会員登録</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800/20 rounded-full transition"
                        >
                            <Icon name="X" size={24} />
                        </button>
                    </div>
                    <p className="text-sm opacity-90 mt-2 relative z-10">最高のボディメイク体験を手に入れよう</p>
                </div>

                {/* タブ切り替え */}
                <div className="flex border-b sticky top-[88px] bg-white z-10">
                    <button
                        onClick={() => setSelectedPlan('premium')}
                        className={`flex-1 py-3 font-bold transition ${
                            selectedPlan === 'premium'
                                ? 'text-amber-600 border-b-2 border-amber-600'
                                : 'text-gray-600 hover:text-gray-600'
                        }`}
                    >
                        月額プラン
                    </button>
                    <button
                        onClick={() => setSelectedPlan('credit_pack')}
                        className={`flex-1 py-3 font-bold transition ${
                            selectedPlan === 'credit_pack'
                                ? 'text-amber-600 border-b-2 border-amber-600'
                                : 'text-gray-600 hover:text-gray-600'
                        }`}
                    >
                        クレジット追加購入
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="p-6 space-y-6">
                    {selectedPlan === 'premium' ? (
                        <>
                            {/* Premium会員プラン */}
                            <div className="bg-[#FFF59A]/10 border-2 border-amber-300 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-[#FFF59A] text-gray-800 rounded-full p-3 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                        <Icon name="Crown" size={24} className="relative z-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">Premium会員</h3>
                                        <p className="text-sm text-gray-600">すべての機能が使い放題</p>
                                    </div>
                                </div>

                                {/* 価格 */}
                                <div className="text-center my-6">
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-5xl font-bold text-amber-600">¥940</span>
                                        <span className="text-gray-600">/月</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">1日あたり約31円</p>
                                </div>

                                {/* 特典リスト */}
                                <div className="space-y-3">
                                    {[
                                        { icon: 'BarChart3', text: '毎月100回の分析クレジット', color: 'text-indigo-600' },
                                        { icon: 'Infinity', text: '無制限の記録と履歴', color: 'text-blue-600' },
                                        { icon: 'BookOpen', text: 'PG BASE 教科書（今後追加分）', color: 'text-green-600' },
                                        { icon: 'Calendar', text: 'ルーティン機能（無料でも利用可）', color: 'text-purple-600' },
                                        { icon: 'BookTemplate', text: '無制限のテンプレート保存', color: 'text-cyan-600' },
                                        { icon: 'Users', text: 'COMYで仲間と刺激し合う', color: 'text-pink-600' },
                                        { icon: 'Zap', text: 'ショートカット機能で効率アップ', color: 'text-yellow-600' },
                                        { icon: 'Download', text: 'データエクスポート', color: 'text-orange-600' },
                                        { icon: 'HeadphonesIcon', text: '優先サポート', color: 'text-red-600' }
                                    ].map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3">
                                            <Icon name={feature.icon} size={20} className={feature.color} />
                                            <span className="text-sm text-gray-600">{feature.text}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* 登録ボタン */}
                                <button
                                    onClick={handleSubscribe}
                                    disabled={loading}
                                    className="w-full mt-6 bg-[#FFF59A] text-gray-800 font-bold py-4 rounded-lg hover:opacity-90 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800 relative z-10"></div>
                                            <span className="relative z-10">処理中...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="Crown" size={20} className="relative z-10" />
                                            <span className="relative z-10">Premium会員に登録する</span>
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-gray-600 text-center mt-3">
                                    いつでもキャンセル可能です
                                </p>
                            </div>

                            {/* 注意事項 */}
                            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
                                <h4 className="font-bold mb-2">ご注意事項</h4>
                                <ul className="space-y-1 list-disc list-inside">
                                    <li>月額料金は毎月自動で更新されます</li>
                                    <li>分析クレジットは毎月1日に100回分付与されます</li>
                                    <li>未使用のクレジットは翌月に持ち越されません</li>
                                    <li>解約後も当月末まで利用可能です</li>
                                </ul>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* クレジット追加購入 */}
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon name="HelpCircle" size={16} className="text-blue-600" />
                                        <h4 className="font-bold text-gray-800">クレジット追加購入について</h4>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        100回を超える分析が必要な場合、追加でクレジットを購入できます。<br/>
                                        購入したクレジットに有効期限はありません。
                                    </p>
                                </div>

                                {/* クレジットパック選択 */}
                                <div className="grid gap-4">
                                    {creditPacks.map((pack, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedCreditPack(pack)}
                                            className={`relative border-2 rounded-xl p-5 transition ${
                                                selectedCreditPack?.credits === pack.credits
                                                    ? 'border-amber-600 bg-amber-50'
                                                    : 'border-gray-200 hover:border-amber-300 bg-white'
                                            }`}
                                        >
                                            {pack.badge && (
                                                <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                    {pack.badge}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <h4 className="font-bold text-lg text-gray-800">{pack.name}</h4>
                                                    <p className="text-sm text-gray-600">{pack.credits}回の分析クレジット</p>
                                                    {pack.credits >= 150 && (
                                                        <p className="text-xs text-green-600 mt-1">
                                                            1回あたり ¥{Math.round(pack.price / pack.credits)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-3xl font-bold text-amber-600">¥{pack.price}</div>
                                                </div>
                                            </div>
                                            {selectedCreditPack?.credits === pack.credits && (
                                                <div className="absolute inset-0 border-2 border-amber-600 rounded-xl pointer-events-none"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* 購入ボタン */}
                                <button
                                    onClick={handlePurchaseCredits}
                                    disabled={loading || !selectedCreditPack}
                                    className="w-full bg-[#FFF59A] text-gray-800 font-bold py-4 rounded-lg hover:opacity-90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shine pointer-events-none"></div>
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800 relative z-10"></div>
                                            <span className="relative z-10">処理中...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Icon name="ShoppingCart" size={20} className="relative z-10" />
                                            <span className="relative z-10">{selectedCreditPack ? `${selectedCreditPack.name}を購入` : 'パックを選択してください'}</span>
                                        </>
                                    )}
                                </button>

                                {/* 比較 */}
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                        <Icon name="Lightbulb" size={18} className="text-amber-600" />
                                        Premium会員がお得！
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        月額¥940のPremium会員なら、毎月100回分のクレジットに加えて、<br/>
                                        すべてのPremium機能が使い放題です。
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


// グローバルに公開
window.SubscriptionView = SubscriptionView;
