import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SUBSCRIPTION_PLAN, GOOGLE_PLAY_BILLING } from '../config';

// 外部URLを開く関数（ネイティブアプリ対応）
const openExternalUrl = async (url) => {
    try {
        // 相対パスを絶対URLに変換
        const fullUrl = url.startsWith('http') ? url : `https://your-coach-plus.web.app${url}`;

        console.log('[Subscription] Opening URL:', fullUrl);

        if (Capacitor.isNativePlatform()) {
            // ネイティブアプリではCapacitor Browserを使用
            console.log('[Subscription] Using Capacitor Browser');
            await Browser.open({
                url: fullUrl,
                presentationStyle: 'popover' // iPadでポップオーバー表示
            });
        } else {
            // Webでは新しいタブで開く
            window.open(fullUrl, '_blank');
        }
    } catch (error) {
        console.error('[Subscription] Failed to open URL:', error);
        // フォールバック: window.openを試行
        try {
            window.open(url.startsWith('http') ? url : `https://your-coach-plus.web.app${url}`, '_blank');
        } catch (e) {
            console.error('[Subscription] Fallback also failed:', e);
        }
    }
};

// ===== Subscription View Component =====
const SubscriptionView = ({ onClose, userId, userProfile, initialTab = 'premium' }) => {
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(initialTab); // 'premium' or 'credit_pack'
    const [selectedCreditPack, setSelectedCreditPack] = useState(null);
    const [storeReady, setStoreReady] = useState(false);
    const [debugLogs, setDebugLogs] = useState([]); // デバッグログ表示用
    const [showDebugModal, setShowDebugModal] = useState(false); // デバッグモーダル表示フラグ
    const [userInitiatedPurchase, setUserInitiatedPurchase] = useState(false); // ユーザーが購入を開始したかどうか
    const userInitiatedPurchaseRef = React.useRef(false); // useEffect内でも参照できるようにref
    const pendingProductIdRef = React.useRef(null); // 購入中の商品IDを保存

    // デバッグログを追加
    const addDebugLog = (message, data = null) => {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const logEntry = { timestamp, message, data };
        setDebugLogs(prev => [...prev, logEntry]);
        console.log(`[DEBUG ${timestamp}]`, message, data || '');
    };

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
        if (!isNative) {
            setStoreReady(true); // Web版はStripeを使用
            return;
        }

        const initializeStore = async () => {
            addDebugLog('初期化開始', { isNative, platform });

            // プラグインがロードされるまで待機
            if (!window.CdvPurchase) {
                const errorMsg = '決済プラグインが利用できません';
                addDebugLog('❌ エラー', errorMsg);
                console.error('[IAP] CdvPurchase is not available. Plugin may not be installed or loaded.');
                toast.error(errorMsg);
                setStoreReady(true); // エラーでも続行
                return;
            }

            try {
                addDebugLog('✅ プラグイン読み込み完了');
                console.log('[IAP] Starting store initialization...');
                const { store, ProductType, Platform } = window.CdvPurchase;
                console.log('[IAP] CdvPurchase loaded:', { store, ProductType, Platform });

                // プラットフォーム判定
                const storePlatform = platform === 'android' ? Platform.GOOGLE_PLAY : Platform.APPLE_APPSTORE;
                addDebugLog('プラットフォーム判定', { platform, storePlatform });
                console.log('[IAP] Platform:', platform, 'Store platform:', storePlatform);

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

                addDebugLog('商品登録', products.map(p => p.id));
                console.log('[IAP] Registering products:', products);
                store.register(products);
                addDebugLog('✅ 商品登録完了');
                console.log('[IAP] Products registered successfully');

                // 処理済みトランザクションIDを追跡（重複処理防止）
                const processedTransactionIds = new Set();

                // 購入フローのイベントハンドラー（チェーン形式）
                store.when()
                    .approved(transaction => {
                        const productIds = transaction.products?.map(p => p.id) || [];
                        const txId = transaction.transactionId || transaction.id;
                        addDebugLog('✅ 購入承認', { products: productIds, txId });
                        console.log('[IAP] Transaction approved:', transaction);
                        console.log('[IAP] Transaction details:', JSON.stringify({
                            id: transaction.id,
                            transactionId: transaction.transactionId,
                            products: transaction.products,
                            state: transaction.state
                        }, null, 2));
                        transaction.verify();
                    })
                    .verified(async (receipt) => {
                        console.log('[IAP] ========== VERIFIED HANDLER START ==========');
                        console.log('[IAP] userInitiatedPurchase:', userInitiatedPurchaseRef.current);
                        addDebugLog('🔔 verified開始', { receiptId: receipt.id, userInitiated: userInitiatedPurchaseRef.current });

                        // ユーザーが購入を開始していない場合（ペンディングトランザクション）はスキップ
                        if (!userInitiatedPurchaseRef.current) {
                            console.log('[IAP] Skipping pending transaction - user did not initiate purchase');
                            addDebugLog('⏭️ ペンディングTxスキップ', { receiptId: receipt.id });
                            // トランザクションを完了させて次回処理されないようにする
                            receipt.finish();
                            return;
                        }

                        try {
                            // ★★★ 重要: ユーザーが選択した商品IDを使用 ★★★
                            // レシートからの抽出は信頼できないため、購入開始時に保存した商品IDを使用
                            let productId = pendingProductIdRef.current || '';
                            let transactionId = '';

                            console.log('[IAP] Using pendingProductId:', productId);
                            addDebugLog('保存済み商品ID', { productId });

                            // トランザクションIDはレシートから取得
                            if (receipt.transactions && receipt.transactions.length > 0) {
                                transactionId = receipt.transactions[0].transactionId || receipt.transactions[0].id || '';
                            }
                            if (!transactionId && receipt.nativeTransactions && receipt.nativeTransactions.length > 0) {
                                transactionId = receipt.nativeTransactions[0].transactionIdentifier || '';
                            }
                            if (!transactionId) {
                                transactionId = receipt.id || Date.now().toString();
                            }

                            addDebugLog('抽出結果', { productId, transactionId });
                            console.log('[IAP] Extracted - productId:', productId, 'transactionId:', transactionId);

                            // productIdが取得できない場合はスキップ
                            if (!productId) {
                                addDebugLog('⚠️ productId取得失敗 - スキップ', { receiptId: receipt.id });
                                console.warn('[IAP] Could not extract productId, finishing receipt without processing');
                                receipt.finish();
                                return;
                            }

                            // 重複処理チェック
                            if (processedTransactionIds.has(transactionId)) {
                                addDebugLog('⚠️ 重複トランザクション - スキップ', { transactionId });
                                console.log('[IAP] Already processed transaction, skipping:', transactionId);
                                receipt.finish();
                                return;
                            }
                            processedTransactionIds.add(transactionId);

                            // Firebase Functions経由でPremium状態を更新
                            const functions = window.firebase.app().functions('asia-northeast2');
                            const updatePremiumStatus = functions.httpsCallable('updatePremiumStatusFromReceipt');

                            const isSubscription = productId === GOOGLE_PLAY_BILLING.subscriptions.premium;

                            // クレジット数を判定
                            let credits = 0;
                            if (isSubscription) {
                                credits = 100; // Premium契約で100クレジット
                            } else if (productId === GOOGLE_PLAY_BILLING.products.credits_50) {
                                credits = 50;
                            } else if (productId === GOOGLE_PLAY_BILLING.products.credits_150) {
                                credits = 150;
                            } else if (productId === GOOGLE_PLAY_BILLING.products.credits_300) {
                                credits = 300;
                            }

                            const receiptData = {
                                productId: productId,
                                transactionId: transactionId,
                                purchaseDate: new Date().toISOString(),
                                type: isSubscription ? 'subscription' : 'consumable',
                                credits: credits,
                            };

                            addDebugLog('送信データ', receiptData);
                            console.log('[IAP] Sending to server:', JSON.stringify(receiptData, null, 2));

                            const result = await updatePremiumStatus({
                                userId: userId,
                                receipt: receiptData,
                                platform: platform
                            });

                            addDebugLog('✅ サーバー応答', result.data);
                            console.log('[IAP] Server response:', result.data);

                            toast.success('購入が完了しました！');

                            // フラグをリセット
                            userInitiatedPurchaseRef.current = false;
                            pendingProductIdRef.current = null;

                            // 画面をリロードしてPremium状態を反映
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        } catch (error) {
                            addDebugLog('❌ verified処理エラー', { message: error.message, code: error.code, details: error.details });
                            console.error('[IAP] Error in verified handler:', error);
                            toast.error(`購入処理中にエラーが発生しました: ${error.message}`);
                            // エラー時もフラグをリセット
                            userInitiatedPurchaseRef.current = false;
                            pendingProductIdRef.current = null;
                        }

                        // 購入完了
                        receipt.finish();
                    })
                    .unverified(receipt => {
                        addDebugLog('❌ 検証失敗', {
                            code: receipt.payload?.code,
                            message: receipt.payload?.message
                        });
                        console.error('[IAP] Receipt verification failed:', receipt);
                        toast.error('購入の検証に失敗しました。サポートにお問い合わせください。');
                    })
                    .finished(transaction => {
                        const productIds = transaction.products?.map(p => p.id) || [];
                        addDebugLog('✅ 取引完了', { products: productIds });
                        console.log('[IAP] Transaction finished:', transaction);
                    });

                // グローバルエラーハンドリング
                store.error((error) => {
                    addDebugLog('❌ ストアエラー', { message: error.message, code: error.code });
                    console.error('[IAP] Store error:', error);
                    toast.error(`エラーが発生しました: ${error.message}`);
                });

                // ストア初期化
                addDebugLog('ストア初期化開始', { storePlatform });
                console.log('[IAP] Calling store.initialize with platform:', storePlatform);
                await store.initialize([storePlatform]);
                addDebugLog('✅ ストア初期化完了');
                console.log('[IAP] Store initialized successfully');

                // 商品情報を取得して確認
                const registeredProducts = store.products;
                addDebugLog('登録済み商品確認', {
                    count: registeredProducts.length,
                    products: registeredProducts.map(p => ({ id: p.id, canPurchase: p.canPurchase }))
                });
                console.log('[IAP] Registered products after init:', registeredProducts);

                setStoreReady(true);
            } catch (error) {
                addDebugLog('❌ 初期化エラー', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack?.substring(0, 200)
                });
                console.error('[IAP] Initialization error:', error);
                console.error('[IAP] Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                toast.error(`ストアの初期化に失敗しました: ${error.message}`);
                setStoreReady(true); // エラーでも続行
            }
        };

        initializeStore();
    }, [isNative, platform, userId]);

    const handleSubscribe = async () => {
        if (loading || !storeReady) return;
        setLoading(true);
        addDebugLog('購入処理開始', { type: 'premium' });

        try {
            // ネイティブプラットフォームの場合はGoogle Play Billing / App Storeを使用
            if (isNative && window.CdvPurchase) {
                const productId = GOOGLE_PLAY_BILLING.subscriptions.premium;
                addDebugLog('商品取得試行', { productId });
                console.log('[IAP] Attempting to get product:', productId);
                console.log('[IAP] All products:', window.CdvPurchase.store.products);

                const product = window.CdvPurchase.store.get(productId);

                if (!product) {
                    addDebugLog('❌ 商品が見つかりません', { productId });
                    console.error('[IAP] Product not found:', productId);
                    toast.error('商品情報を取得できませんでした');
                    setLoading(false);
                    return;
                }

                addDebugLog('✅ 商品取得成功', {
                    id: product.id,
                    canPurchase: product.canPurchase,
                    title: product.title,
                    pricing: product.pricing,
                    state: product.state
                });
                console.log('[IAP] Product found:', product);

                if (!product.canPurchase) {
                    addDebugLog('❌ 購入不可', { reason: '商品が購入できない状態です', state: product.state });
                    console.error('[IAP] Product cannot be purchased:', product);
                    toast.error('この商品は現在購入できません。App Store Connectの設定を確認してください。');
                    setLoading(false);
                    return;
                }

                console.log('[IAP] Ordering product:', product);
                addDebugLog('購入開始', { productId: product.id });

                // ユーザーが購入を開始したことをマーク + 商品IDを保存
                userInitiatedPurchaseRef.current = true;
                setUserInitiatedPurchase(true);
                pendingProductIdRef.current = productId; // ★ Premium商品ID

                try {
                    // iOS用: デフォルトオファー "$" を明示的に指定（cordova-plugin-purchaseのバグ対策）
                    // https://github.com/j3k0/cordova-plugin-purchase/issues/1600
                    const offer = platform === 'ios' ? product.getOffer("$") : product;
                    addDebugLog('オファー取得', { offer: offer ? 'found' : 'not found', platform });

                    const order = await window.CdvPurchase.store.order(offer || product);
                    addDebugLog('購入注文結果', order);
                    console.log('[IAP] Order result:', order);

                    if (order && order.isError) {
                        addDebugLog('❌ 購入注文エラー', { code: order.code, message: order.message });
                        toast.error(`購入エラー: ${order.message || '不明なエラー'}`);
                        userInitiatedPurchaseRef.current = false;
                        setUserInitiatedPurchase(false);
                        pendingProductIdRef.current = null;
                    }
                } catch (orderError) {
                    addDebugLog('❌ 購入注文例外', {
                        name: orderError.name,
                        message: orderError.message,
                        code: orderError.code
                    });
                    console.error('[IAP] Order error:', orderError);
                    toast.error(`購入処理中にエラーが発生しました: ${orderError.message}`);
                    userInitiatedPurchaseRef.current = false;
                    setUserInitiatedPurchase(false);
                    pendingProductIdRef.current = null;
                }

                setLoading(false); // 購入フローはストアが管理するのでローディング解除
                return;
            }

            // Web版の場合はStripeを使用（既存の処理）
            const functions = window.firebase.app().functions('asia-northeast2');
            const createCheckoutSession = functions.httpsCallable('createCheckoutSession');

            const result = await createCheckoutSession({
                priceId: SUBSCRIPTION_PLAN.stripePriceId,
                mode: 'subscription',
                successUrl: `${window.location.origin}/index.html`,
                cancelUrl: `${window.location.origin}/index.html`,
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

                addDebugLog('クレジット購入試行', { productId, credits: selectedCreditPack.credits });
                console.log('[IAP] Attempting to get credit pack:', productId);
                console.log('[IAP] All products:', window.CdvPurchase.store.products);

                const product = window.CdvPurchase.store.get(productId);

                if (!product) {
                    addDebugLog('❌ 商品が見つかりません', { productId });
                    console.error('[IAP] Product not found:', productId);
                    toast.error('商品情報を取得できませんでした');
                    setLoading(false);
                    return;
                }

                addDebugLog('✅ 商品取得成功', {
                    id: product.id,
                    canPurchase: product.canPurchase,
                    title: product.title,
                    pricing: product.pricing,
                    state: product.state
                });
                console.log('[IAP] Product found:', product);

                if (!product.canPurchase) {
                    addDebugLog('❌ 購入不可', { reason: '商品が購入できない状態です', state: product.state });
                    console.error('[IAP] Product cannot be purchased:', product);
                    toast.error('この商品は現在購入できません。App Store Connectの設定を確認してください。');
                    setLoading(false);
                    return;
                }

                console.log('[IAP] Ordering product:', product);
                addDebugLog('購入開始', { productId: product.id });

                // ユーザーが購入を開始したことをマーク + 商品IDを保存
                userInitiatedPurchaseRef.current = true;
                setUserInitiatedPurchase(true);
                pendingProductIdRef.current = productId; // ★ クレジット商品ID

                try {
                    // iOS用: デフォルトオファー "$" を明示的に指定（cordova-plugin-purchaseのバグ対策）
                    // https://github.com/j3k0/cordova-plugin-purchase/issues/1600
                    const offer = platform === 'ios' ? product.getOffer("$") : product;
                    addDebugLog('オファー取得', { offer: offer ? 'found' : 'not found', platform });

                    const order = await window.CdvPurchase.store.order(offer || product);
                    addDebugLog('購入注文結果', order);
                    console.log('[IAP] Order result:', order);

                    if (order && order.isError) {
                        addDebugLog('❌ 購入注文エラー', { code: order.code, message: order.message });
                        toast.error(`購入エラー: ${order.message || '不明なエラー'}`);
                        userInitiatedPurchaseRef.current = false;
                        setUserInitiatedPurchase(false);
                        pendingProductIdRef.current = null;
                    }
                } catch (orderError) {
                    addDebugLog('❌ 購入注文例外', {
                        name: orderError.name,
                        message: orderError.message,
                        code: orderError.code
                    });
                    console.error('[IAP] Order error:', orderError);
                    toast.error(`購入処理中にエラーが発生しました: ${orderError.message}`);
                    userInitiatedPurchaseRef.current = false;
                    setUserInitiatedPurchase(false);
                    pendingProductIdRef.current = null;
                }

                setLoading(false); // 購入フローはストアが管理するのでローディング解除
                return;
            }

            // Web版の場合はStripeを使用（既存の処理）
            const functions = window.firebase.app().functions('asia-northeast2');
            const createCheckoutSession = functions.httpsCallable('createCheckoutSession');

            const result = await createCheckoutSession({
                priceId: selectedCreditPack.stripePriceId,
                mode: 'payment',
                successUrl: `${window.location.origin}/index.html`,
                cancelUrl: `${window.location.origin}/index.html`,
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 modal-safe-area">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col">
                {/* ヘッダー */}
                <div className="flex-shrink-0 bg-[#FFF59A] text-gray-800 p-6 rounded-t-2xl relative overflow-hidden">
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
                <div className="flex-shrink-0 flex border-b bg-white">
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

                {/* コンテンツ（スクロール可能） */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
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

                {/* 固定フッター: Terms & Privacy (Apple Required) - 常に表示 */}
                <div className="flex-shrink-0 border-t bg-gray-50 px-6 py-4 rounded-b-2xl">
                    <div className="flex items-center justify-center gap-4 text-sm">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[Subscription] Terms button clicked');
                                openExternalUrl('/terms.html');
                            }}
                            className="text-blue-600 underline px-3 py-2 min-h-[44px] active:opacity-70 font-medium"
                        >
                            利用規約
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[Subscription] Privacy button clicked');
                                openExternalUrl('/privacy.html');
                            }}
                            className="text-blue-600 underline px-3 py-2 min-h-[44px] active:opacity-70 font-medium"
                        >
                            プライバシーポリシー
                        </button>
                    </div>
                </div>

                {/* デバッグログモーダル（開発者用） */}
                {showDebugModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h3 className="font-bold text-lg">デバッグログ</h3>
                                <button
                                    onClick={() => setShowDebugModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <Icon name="X" size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {debugLogs.length === 0 ? (
                                    <p className="text-gray-500 text-center">ログがありません</p>
                                ) : (
                                    debugLogs.map((log, index) => (
                                        <div key={index} className="border-b pb-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{log.timestamp}</span>
                                                <span className="font-bold text-blue-600">{log.message}</span>
                                            </div>
                                            {log.data && (
                                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(log.data, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-4 border-t flex gap-2">
                                <button
                                    onClick={() => {
                                        const logText = debugLogs.map(log =>
                                            `[${log.timestamp}] ${log.message}\n${log.data ? JSON.stringify(log.data, null, 2) : ''}`
                                        ).join('\n\n');
                                        navigator.clipboard.writeText(logText);
                                        toast.success('ログをコピーしました');
                                    }}
                                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
                                >
                                    ログをコピー
                                </button>
                                <button
                                    onClick={() => setDebugLogs([])}
                                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                                >
                                    ログをクリア
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* デバッグログ表示ボタン（画面右下に固定） */}
            {isNative && debugLogs.length > 0 && (
                <button
                    onClick={() => setShowDebugModal(true)}
                    className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 z-40"
                    style={{ width: '56px', height: '56px' }}
                >
                    <Icon name="Bug" size={24} />
                </button>
            )}
        </div>
    );
};


// グローバルに公開
window.SubscriptionView = SubscriptionView;
