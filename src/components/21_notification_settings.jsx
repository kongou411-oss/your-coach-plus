import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// ===== 通知設定コンポーネント =====
const NotificationSettings = ({ userId }) => {
    const Icon = window.Icon;
    const [activeTab, setActiveTab] = useState('meal');
    const [notificationPermission, setNotificationPermission] = useState('default');
    const [fcmToken, setFcmToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    // 通知設定（Firestoreから読み込み）
    const [mealNotifications, setMealNotifications] = useState([]);
    const [workoutNotifications, setWorkoutNotifications] = useState([]);
    const [analysisNotifications, setAnalysisNotifications] = useState([]);
    const [customNotifications, setCustomNotifications] = useState([]);

    // 一時入力用
    const [newMealTime, setNewMealTime] = useState('12:00');
    const [newMealTitle, setNewMealTitle] = useState('食事の時間です');
    const [newMealBody, setNewMealBody] = useState('記録を忘れずに！');
    const [newWorkoutTime, setNewWorkoutTime] = useState('20:00');
    const [newWorkoutTitle, setNewWorkoutTitle] = useState('トレーニングの時間です');
    const [newWorkoutBody, setNewWorkoutBody] = useState('今日のトレーニングを始めましょう！');
    const [newAnalysisTime, setNewAnalysisTime] = useState('22:00');
    const [newAnalysisTitle, setNewAnalysisTitle] = useState('今日の振り返りの時間です');
    const [newAnalysisBody, setNewAnalysisBody] = useState('AI分析で今日の栄養状態を確認しましょう');
    const [newCustomTitle, setNewCustomTitle] = useState('');
    const [newCustomBody, setNewCustomBody] = useState('');
    const [newCustomTime, setNewCustomTime] = useState('12:00');

    // iOS判定とPWAモード判定
    useEffect(() => {
        const checkDevice = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const iosDevice = /iPad|iPhone|iPod/.test(userAgent);
            const standalone = window.matchMedia('(display-mode: standalone)').matches;

            setIsIOS(iosDevice);
            setIsStandalone(standalone);
        };

        checkDevice();
    }, []);

    // Firestoreから通知設定を読み込み
    useEffect(() => {
        const loadNotificationSettings = async () => {
            try {
                const doc = await window.db.collection('users').doc(userId).collection('settings').doc('notifications').get();
                if (doc.exists) {
                    const data = doc.data();

                    // 旧形式から新形式へのマイグレーション
                    const migrateMeal = (meal) => {
                        if (!meal) return [];
                        if (Array.isArray(meal)) {
                            // 文字列配列の場合（旧形式）
                            if (typeof meal[0] === 'string') {
                                return meal.map(time => ({
                                    id: Date.now() + Math.random(),
                                    time: time,
                                    title: '食事の時間です',
                                    body: '記録を忘れずに！'
                                }));
                            }
                            // すでに新形式の場合
                            return meal;
                        }
                        return [];
                    };

                    const migrateWorkout = (workout) => {
                        if (!workout) return [];
                        if (typeof workout === 'string') {
                            // 文字列の場合（旧形式）
                            return [{
                                id: Date.now(),
                                time: workout,
                                title: 'トレーニングの時間です',
                                body: '今日のトレーニングを始めましょう！'
                            }];
                        }
                        if (Array.isArray(workout)) {
                            // すでに新形式の場合
                            return workout;
                        }
                        return [];
                    };

                    const migrateAnalysis = (analysis) => {
                        if (!analysis) return [];
                        if (typeof analysis === 'string') {
                            // 文字列の場合（旧形式）
                            return [{
                                id: Date.now(),
                                time: analysis,
                                title: '今日の振り返りの時間です',
                                body: 'AI分析で今日の栄養状態を確認しましょう'
                            }];
                        }
                        if (Array.isArray(analysis)) {
                            // すでに新形式の場合
                            return analysis;
                        }
                        return [];
                    };

                    setMealNotifications(migrateMeal(data.meal));
                    setWorkoutNotifications(migrateWorkout(data.workout));
                    setAnalysisNotifications(migrateAnalysis(data.analysis));
                    setCustomNotifications(data.custom || []);
                }
            } catch (error) {
                console.error('[Notification] Failed to load settings:', error);
            }
        };

        if (userId) {
            loadNotificationSettings();
        }
    }, [userId]);

    // 通知権限の確認とFCMトークンの取得
    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 3;

        const checkAndGetToken = async () => {
            console.log(`[Notification] checkAndGetToken called (attempt ${retryCount + 1}/${maxRetries + 1})`);
            console.log('[Notification] userId:', userId);
            console.log('[Notification] window.messaging:', !!window.messaging);
            console.log('[Notification] window.db:', !!window.db);

            if (!('Notification' in window)) {
                console.warn('[Notification] Notification API not supported');
                return;
            }

            const permission = Notification.permission;
            setNotificationPermission(permission);
            console.log('[Notification] Permission:', permission);

            // 既に許可されている場合はFCMトークンを取得
            if (permission === 'granted' && userId) {
                // window.messagingとwindow.dbの初期化を待つ
                if (!window.messaging || !window.db) {
                    console.warn('[Notification] Firebase not ready yet, will retry...');

                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(() => checkAndGetToken(), 1000); // 1秒後にリトライ
                    } else {
                        console.error('[Notification] Firebase initialization timeout');
                    }
                    return;
                }

                try {
                    console.log('[Notification] Waiting for Service Worker...');
                    const registration = await navigator.serviceWorker.ready;
                    console.log('[Notification] Service Worker ready:', registration.scope);

                    const messaging = window.messaging;
                    console.log('[Notification] Getting FCM token...');

                    const token = await messaging.getToken({
                        vapidKey: 'BIifQg3P5w9Eb4JU4EDqx7bbNeAhveYPK2GCeEyi28A6-y04sm11TASGWBoI0Enewki1f7PFvQ6KjsQb5J5EMXU',
                        serviceWorkerRegistration: registration
                    });

                    if (token) {
                        setFcmToken(token);
                        console.log('[Notification] ✅ FCM Token retrieved:', token.substring(0, 30) + '...');

                        // 【重要】トークンをFirestoreに保存（配列で保存）
                        console.log('[Notification] Saving token to Firestore...');
                        await window.db.collection('users').doc(userId).set({
                            fcmTokens: window.firebase.firestore.FieldValue.arrayUnion(token),
                            fcmTokenUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        console.log('[Notification] ✅ Token saved to Firestore successfully');
                    } else {
                        console.warn('[Notification] Token is empty');
                    }
                } catch (error) {
                    console.error('[Notification] ❌ Failed to get/save FCM token:', error);
                    console.error('[Notification] Error details:', error.code, error.message);

                    // リトライ
                    if (retryCount < maxRetries && error.code !== 'messaging/permission-blocked') {
                        retryCount++;
                        console.log(`[Notification] Retrying in 2 seconds... (${retryCount}/${maxRetries})`);
                        setTimeout(() => checkAndGetToken(), 2000);
                    }
                }
            }
        };

        // userIdが存在する場合のみ実行
        if (userId) {
            checkAndGetToken();
        }
    }, [userId]);

    // フォアグラウンドメッセージのハンドラーを設定
    // Android PWAを開いている時は、ここで通知を出さないと無音になる
    useEffect(() => {
        if (!window.messaging) return;

        const unsubscribe = window.messaging.onMessage(async (payload) => {
            console.log('[Foreground] Message received:', payload);

            // Android PWAのフォアグラウンド時は手動で通知を出す必要がある
            if (Notification.permission === 'granted') {
                const title = payload.notification?.title || 'Your Coach+';
                const body = payload.notification?.body || '新しい通知があります';

                // タグをメッセージIDまたはタイトルで固定（重複防止）
                // Date.now()を使うと、React StrictModeの2重実行で別物扱いされて重複する
                const notificationTag = payload.messageId || `${payload.data?.type || 'notification'}-${title}`;

                const options = {
                    body: body,
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-72.png',
                    tag: notificationTag, // メッセージIDで固定（同じメッセージは1つに統合）
                    renotify: true,
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    data: {
                        url: payload.data?.url || '/',
                        ...payload.data
                    },
                    actions: [
                        { action: 'open', title: '開く', icon: '/icons/icon-72.png' },
                        { action: 'close', title: '閉じる' }
                    ]
                };

                // PWA環境ではServiceWorkerRegistration.showNotification()を使う必要がある
                try {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.showNotification(title, options);
                    console.log('[Foreground] Notification shown via ServiceWorker');
                } catch (error) {
                    console.error('[Foreground] Failed to show notification:', error);
                    // フォールバック: ブラウザ環境では new Notification() を使う
                    try {
                        new Notification(title, options);
                        console.log('[Foreground] Notification shown via Notification API');
                    } catch (fallbackError) {
                        console.error('[Foreground] Fallback also failed:', fallbackError);
                    }
                }
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // 通知権限をリクエスト
    const requestNotificationPermission = async () => {
        try {
            if (!('Notification' in window)) {
                toast.error('お使いのブラウザは通知機能に対応していません');
                return;
            }

            if (isIOS && !isStandalone) {
                setShowInstallGuide(true);
                return;
            }

            setLoading(true);

            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const messaging = window.messaging;
                const token = await messaging.getToken({
                    vapidKey: 'BIifQg3P5w9Eb4JU4EDqx7bbNeAhveYPK2GCeEyi28A6-y04sm11TASGWBoI0Enewki1f7PFvQ6KjsQb5J5EMXU',
                    serviceWorkerRegistration: registration
                });

                setFcmToken(token);
                toast.success('通知権限が許可されました');

                // FCMトークンを配列で保存（複数端末対応）
                await window.db.collection('users').doc(userId).set({
                    fcmTokens: window.firebase.firestore.FieldValue.arrayUnion(token),
                    fcmTokenUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } else {
                toast.error('通知権限が拒否されました');
            }
        } catch (error) {
            console.error('[Notification] Failed to request permission:', error);
            toast.error('通知権限の取得に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 通知をスケジュール（共通関数）
    const scheduleNotification = async (time, title, body, type) => {
        try {
            if (!fcmToken) {
                toast.error('先に通知権限を許可してください');
                return;
            }

            const now = new Date();
            const [hours, minutes] = time.split(':').map(Number);

            let targetDate = new Date();
            targetDate.setHours(hours, minutes, 0, 0);

            if (targetDate <= now) {
                targetDate.setDate(targetDate.getDate() + 1);
            }

            const scheduleNotificationFunc = window.functions.httpsCallable('scheduleNotification');

            await scheduleNotificationFunc({
                targetTime: targetDate.toISOString(),
                fcmToken: fcmToken,
                title: title,
                body: body,
                notificationType: type,
                userId: userId,
                scheduleTimeStr: time  // "HH:MM" 形式の時刻文字列を追加
            });

            return true;
        } catch (error) {
            console.error('[Notification] Failed to schedule notification:', error);
            throw error;
        }
    };

    // 食事通知を追加
    const addMealNotification = async () => {
        try {
            if (!newMealTime || !newMealTitle.trim() || !newMealBody.trim()) {
                toast.error('すべての項目を入力してください');
                return;
            }

            setLoading(true);

            await scheduleNotification(
                newMealTime,
                newMealTitle,
                newMealBody,
                'meal'
            );

            const newMeal = {
                id: Date.now(),
                time: newMealTime,
                title: newMealTitle,
                body: newMealBody
            };

            const updatedMeals = [...mealNotifications, newMeal];
            setMealNotifications(updatedMeals);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                meal: updatedMeals
            }, { merge: true });

            toast.success(`食事通知を ${newMealTime} に設定しました`);
            setNewMealTime('12:00');
            setNewMealTitle('食事の時間です');
            setNewMealBody('記録を忘れずに！');
        } catch (error) {
            toast.error('通知の設定に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 食事通知を削除
    const removeMealNotification = async (id) => {
        try {
            setLoading(true);

            const updatedMeals = mealNotifications.filter(m => m.id !== id);
            setMealNotifications(updatedMeals);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                meal: updatedMeals
            }, { merge: true });

            toast.success('食事通知を削除しました');
        } catch (error) {
            toast.error('通知の削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 運動通知を追加
    const addWorkoutNotification = async () => {
        try {
            if (!newWorkoutTime || !newWorkoutTitle.trim() || !newWorkoutBody.trim()) {
                toast.error('すべての項目を入力してください');
                return;
            }

            setLoading(true);

            await scheduleNotification(
                newWorkoutTime,
                newWorkoutTitle,
                newWorkoutBody,
                'workout'
            );

            const newWorkout = {
                id: Date.now(),
                time: newWorkoutTime,
                title: newWorkoutTitle,
                body: newWorkoutBody
            };

            const updatedWorkouts = [...workoutNotifications, newWorkout];
            setWorkoutNotifications(updatedWorkouts);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                workout: updatedWorkouts
            }, { merge: true });

            toast.success(`運動通知を ${newWorkoutTime} に設定しました`);
            setNewWorkoutTime('20:00');
            setNewWorkoutTitle('トレーニングの時間です');
            setNewWorkoutBody('今日のトレーニングを始めましょう！');
        } catch (error) {
            toast.error('通知の設定に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 運動通知を削除
    const removeWorkoutNotification = async (id) => {
        try {
            setLoading(true);

            const updatedWorkouts = workoutNotifications.filter(w => w.id !== id);
            setWorkoutNotifications(updatedWorkouts);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                workout: updatedWorkouts
            }, { merge: true });

            toast.success('運動通知を削除しました');
        } catch (error) {
            toast.error('通知の削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 分析通知を追加
    const addAnalysisNotification = async () => {
        try {
            if (!newAnalysisTime || !newAnalysisTitle.trim() || !newAnalysisBody.trim()) {
                toast.error('すべての項目を入力してください');
                return;
            }

            setLoading(true);

            await scheduleNotification(
                newAnalysisTime,
                newAnalysisTitle,
                newAnalysisBody,
                'analysis'
            );

            const newAnalysis = {
                id: Date.now(),
                time: newAnalysisTime,
                title: newAnalysisTitle,
                body: newAnalysisBody
            };

            const updatedAnalysis = [...analysisNotifications, newAnalysis];
            setAnalysisNotifications(updatedAnalysis);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                analysis: updatedAnalysis
            }, { merge: true });

            toast.success(`分析通知を ${newAnalysisTime} に設定しました`);
            setNewAnalysisTime('22:00');
            setNewAnalysisTitle('今日の振り返りの時間です');
            setNewAnalysisBody('AI分析で今日の栄養状態を確認しましょう');
        } catch (error) {
            toast.error('通知の設定に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // 分析通知を削除
    const removeAnalysisNotification = async (id) => {
        try {
            setLoading(true);

            const updatedAnalysis = analysisNotifications.filter(a => a.id !== id);
            setAnalysisNotifications(updatedAnalysis);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                analysis: updatedAnalysis
            }, { merge: true });

            toast.success('分析通知を削除しました');
        } catch (error) {
            toast.error('通知の削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // カスタム通知を追加
    const addCustomNotification = async () => {
        try {
            if (!newCustomTitle.trim() || !newCustomBody.trim() || !newCustomTime) {
                toast.error('すべての項目を入力してください');
                return;
            }

            setLoading(true);

            await scheduleNotification(
                newCustomTime,
                newCustomTitle,
                newCustomBody,
                'custom'
            );

            const newCustom = {
                id: Date.now(),
                title: newCustomTitle,
                body: newCustomBody,
                time: newCustomTime
            };

            const updatedCustom = [...customNotifications, newCustom];
            setCustomNotifications(updatedCustom);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                custom: updatedCustom
            }, { merge: true });

            toast.success(`カスタム通知を ${newCustomTime} に設定しました`);
            setNewCustomTitle('');
            setNewCustomBody('');
            setNewCustomTime('12:00');
        } catch (error) {
            toast.error('通知の設定に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // カスタム通知を削除
    const removeCustomNotification = async (id) => {
        try {
            setLoading(true);

            const updatedCustom = customNotifications.filter(n => n.id !== id);
            setCustomNotifications(updatedCustom);

            await window.db.collection('users').doc(userId).collection('settings').doc('notifications').set({
                custom: updatedCustom
            }, { merge: true });

            toast.success('カスタム通知を削除しました');
        } catch (error) {
            toast.error('通知の削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* インストールガイドモーダル（iOS用） */}
            {showInstallGuide && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Icon name="Smartphone" size={24} className="text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">
                                ホーム画面に追加
                            </h3>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <p>iPhoneで通知を受け取るには、アプリをホーム画面に追加する必要があります。</p>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                <p className="font-medium text-gray-800">手順：</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>画面下部の「共有」ボタンをタップ</li>
                                    <li>「ホーム画面に追加」を選択</li>
                                    <li>「追加」をタップ</li>
                                </ol>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowInstallGuide(false)}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

            {/* 通知権限の状態 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <Icon name="Bell" size={20} className="text-gray-600" />
                    <div>
                        <p className="font-medium text-gray-800">通知権限</p>
                        <p className="text-xs text-gray-600">
                            {notificationPermission === 'granted' ? '許可済み' :
                             notificationPermission === 'denied' ? '拒否されています' : '未設定'}
                        </p>
                    </div>
                </div>

                {notificationPermission !== 'granted' && (
                    <button
                        onClick={requestNotificationPermission}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? '処理中...' : '許可'}
                    </button>
                )}
            </div>

            {/* タブとコンテンツ */}
            {notificationPermission === 'granted' && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* タブヘッダー */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('meal')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                activeTab === 'meal'
                                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Icon name="UtensilsCrossed" size={16} className="inline mr-1" />
                            食事
                        </button>
                        <button
                            onClick={() => setActiveTab('workout')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                activeTab === 'workout'
                                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Icon name="Dumbbell" size={16} className="inline mr-1" />
                            運動
                        </button>
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                activeTab === 'analysis'
                                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Icon name="LineChart" size={16} className="inline mr-1" />
                            分析
                        </button>
                        <button
                            onClick={() => setActiveTab('custom')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                activeTab === 'custom'
                                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Icon name="Settings" size={16} className="inline mr-1" />
                            カスタム
                        </button>
                    </div>

                    {/* タブコンテンツ */}
                    <div className="p-4">
                        {/* 食事タブ */}
                        {activeTab === 'meal' && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Icon name="Info" size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-800">
                                        朝食・昼食・夕食など、複数の時刻に通知を設定できます。タイトルと本文を自由にカスタマイズできます。
                                    </p>
                                </div>

                                {/* 登録済み通知一覧 */}
                                {mealNotifications.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">設定済みの通知</p>
                                        {mealNotifications.map((notif) => (
                                            <div key={notif.id} className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-800">{notif.title}</p>
                                                        <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeMealNotification(notif.id)}
                                                        disabled={loading}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                                    >
                                                        <Icon name="Trash2" size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Icon name="Clock" size={14} />
                                                    <span className="font-mono">{notif.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 新規追加 */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-700">新しい通知を作成</p>
                                    <input
                                        type="text"
                                        placeholder="タイトル"
                                        value={newMealTitle}
                                        onChange={(e) => setNewMealTitle(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <textarea
                                        placeholder="本文"
                                        value={newMealBody}
                                        onChange={(e) => setNewMealBody(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                    <div className="flex gap-3">
                                        <input
                                            type="time"
                                            value={newMealTime}
                                            onChange={(e) => setNewMealTime(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={addMealNotification}
                                            disabled={loading}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {loading ? '追加中...' : '追加'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 運動タブ */}
                        {activeTab === 'workout' && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Icon name="Info" size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-800">
                                        毎日決まった時刻にトレーニングのリマインダーが届きます。タイトルと本文を自由にカスタマイズできます。
                                    </p>
                                </div>

                                {/* 登録済み通知一覧 */}
                                {workoutNotifications.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">設定済みの通知</p>
                                        {workoutNotifications.map((notif) => (
                                            <div key={notif.id} className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-800">{notif.title}</p>
                                                        <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeWorkoutNotification(notif.id)}
                                                        disabled={loading}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                                    >
                                                        <Icon name="Trash2" size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Icon name="Clock" size={14} />
                                                    <span className="font-mono">{notif.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 新規追加 */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-700">新しい通知を作成</p>
                                    <input
                                        type="text"
                                        placeholder="タイトル"
                                        value={newWorkoutTitle}
                                        onChange={(e) => setNewWorkoutTitle(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <textarea
                                        placeholder="本文"
                                        value={newWorkoutBody}
                                        onChange={(e) => setNewWorkoutBody(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                    <div className="flex gap-3">
                                        <input
                                            type="time"
                                            value={newWorkoutTime}
                                            onChange={(e) => setNewWorkoutTime(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={addWorkoutNotification}
                                            disabled={loading}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {loading ? '追加中...' : '追加'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 分析タブ */}
                        {activeTab === 'analysis' && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Icon name="Info" size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-800">
                                        1日の終わりに、今日の栄養状態をAI分析で振り返りましょう。タイトルと本文を自由にカスタマイズできます。
                                    </p>
                                </div>

                                {/* 登録済み通知一覧 */}
                                {analysisNotifications.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">設定済みの通知</p>
                                        {analysisNotifications.map((notif) => (
                                            <div key={notif.id} className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-800">{notif.title}</p>
                                                        <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeAnalysisNotification(notif.id)}
                                                        disabled={loading}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                                    >
                                                        <Icon name="Trash2" size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Icon name="Clock" size={14} />
                                                    <span className="font-mono">{notif.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 新規追加 */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-700">新しい通知を作成</p>
                                    <input
                                        type="text"
                                        placeholder="タイトル"
                                        value={newAnalysisTitle}
                                        onChange={(e) => setNewAnalysisTitle(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <textarea
                                        placeholder="本文"
                                        value={newAnalysisBody}
                                        onChange={(e) => setNewAnalysisBody(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                    <div className="flex gap-3">
                                        <input
                                            type="time"
                                            value={newAnalysisTime}
                                            onChange={(e) => setNewAnalysisTime(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={addAnalysisNotification}
                                            disabled={loading}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {loading ? '追加中...' : '追加'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* カスタムタブ */}
                        {activeTab === 'custom' && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Icon name="Info" size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-800">
                                        自由なタイトル・内容で通知を作成できます。薬のリマインダーなどに便利です。
                                    </p>
                                </div>

                                {/* 登録済みカスタム通知一覧 */}
                                {customNotifications.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">設定済みの通知</p>
                                        {customNotifications.map((notif) => (
                                            <div key={notif.id} className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-800">{notif.title}</p>
                                                        <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeCustomNotification(notif.id)}
                                                        disabled={loading}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                                    >
                                                        <Icon name="Trash2" size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Icon name="Clock" size={14} />
                                                    <span className="font-mono">{notif.time}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 新規追加 */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-700">新しい通知を作成</p>
                                    <input
                                        type="text"
                                        placeholder="タイトル（例: 薬を飲む）"
                                        value={newCustomTitle}
                                        onChange={(e) => setNewCustomTitle(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <textarea
                                        placeholder="本文（例: サプリメントを忘れずに）"
                                        value={newCustomBody}
                                        onChange={(e) => setNewCustomBody(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                    <div className="flex gap-3">
                                        <input
                                            type="time"
                                            value={newCustomTime}
                                            onChange={(e) => setNewCustomTime(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={addCustomNotification}
                                            disabled={loading}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {loading ? '追加中...' : '追加'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 注意事項 */}
            {notificationPermission === 'granted' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <Icon name="Info" size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-800">
                            通知は設定した時刻の数秒以内に届きます。より正確なタイミングが必要な場合は、スマートフォンの標準アラーム機能をご利用ください。
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationSettings;
