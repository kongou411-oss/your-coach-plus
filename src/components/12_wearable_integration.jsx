import React from 'react';
// ===== Wearable Device Integration =====
// Apple Watch (HealthKit) / Android (Health Connect) との連携

const WearableIntegration = ({ onClose, userId, userProfile }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [deviceType, setDeviceType] = useState(null); // 'healthkit' or 'healthconnect'
    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [healthData, setHealthData] = useState({
        sleepHours: null,
        sleepQuality: null,
        steps: null,
        heartRate: null,
        activeCalories: null
    });

    useEffect(() => {
        // 接続状態をチェック
        checkConnection();
        loadLastSyncTime();
    }, []);

    // 接続状態のチェック
    const checkConnection = () => {
        const savedConnection = localStorage.getItem('wearable_connection');
        if (savedConnection) {
            const connection = JSON.parse(savedConnection);
            setIsConnected(connection.isConnected);
            setDeviceType(connection.deviceType);
        }
    };

    // 最終同期時刻を読み込み
    const loadLastSyncTime = () => {
        const savedTime = localStorage.getItem('wearable_last_sync');
        if (savedTime) {
            setLastSyncTime(new Date(savedTime));
        }
    };

    // HealthKit連携（iOS/macOS）
    const connectHealthKit = async () => {
        setSyncStatus('syncing');

        try {
            // 注: 実際のHealthKit連携はネイティブアプリまたはCapacitorプラグインが必要
            // ここではWeb APIの利用を想定したモックアップ

            // HealthKit権限リクエスト（実装例）
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.healthKit) {
                // iOS WebViewからの呼び出し
                window.webkit.messageHandlers.healthKit.postMessage({
                    action: 'requestAuthorization',
                    read: ['HKCategoryTypeIdentifierSleepAnalysis', 'HKQuantityTypeIdentifierStepCount', 'HKQuantityTypeIdentifierHeartRate']
                });

                // レスポンスを待つ（イベントリスナー）
                window.addEventListener('healthKitResponse', handleHealthKitResponse);
            } else {
                // Webブラウザの場合はモックデータ
                await mockHealthDataSync('healthkit');
            }

        } catch (error) {
            console.error('HealthKit connection error:', error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    };

    // Health Connect連携（Android）
    const connectHealthConnect = async () => {
        setSyncStatus('syncing');

        try {
            // 注: 実際のHealth Connect連携はネイティブアプリまたはCapacitorプラグインが必要

            // Health Connect権限リクエスト（実装例）
            if (window.HealthConnect) {
                // Android WebViewからの呼び出し
                const result = await window.HealthConnect.requestPermissions([
                    'Sleep',
                    'Steps',
                    'HeartRate',
                    'TotalCaloriesBurned'
                ]);

                if (result.granted) {
                    await syncHealthConnectData();
                } else {
                    throw new Error('権限が拒否されました');
                }
            } else {
                // Webブラウザの場合はモックデータ
                await mockHealthDataSync('healthconnect');
            }

        } catch (error) {
            console.error('Health Connect connection error:', error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    };

    // HealthKitレスポンスハンドラー
    const handleHealthKitResponse = async (event) => {
        const data = event.detail;

        if (data.authorized) {
            await syncHealthKitData();
        } else {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }

        window.removeEventListener('healthKitResponse', handleHealthKitResponse);
    };

    // HealthKitデータ同期
    const syncHealthKitData = async () => {
        try {
            // HealthKitからデータを取得（実装例）
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.healthKit) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                const today = new Date();

                window.webkit.messageHandlers.healthKit.postMessage({
                    action: 'querySleepAnalysis',
                    startDate: yesterday.toISOString(),
                    endDate: today.toISOString()
                });

                // レスポンスを待つ
                window.addEventListener('healthKitDataResponse', processSyncedData);
            }
        } catch (error) {
            console.error('HealthKit sync error:', error);
            setSyncStatus('error');
        }
    };

    // Health Connectデータ同期
    const syncHealthConnectData = async () => {
        try {
            if (window.HealthConnect) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);

                const today = new Date();

                const sleepData = await window.HealthConnect.readSleepSessions(
                    yesterday.getTime(),
                    today.getTime()
                );

                const stepsData = await window.HealthConnect.readSteps(
                    yesterday.getTime(),
                    today.getTime()
                );

                processSyncedData({
                    detail: {
                        sleep: sleepData,
                        steps: stepsData
                    }
                });
            }
        } catch (error) {
            console.error('Health Connect sync error:', error);
            setSyncStatus('error');
        }
    };

    // 同期データを処理
    const processSyncedData = (event) => {
        const data = event.detail;

        // 睡眠データを処理
        if (data.sleep && data.sleep.length > 0) {
            const totalSleepSeconds = data.sleep.reduce((sum, session) => {
                return sum + (session.endDate - session.startDate) / 1000;
            }, 0);

            const sleepHours = (totalSleepSeconds / 3600).toFixed(1);

            // 睡眠の質を推定（深い睡眠の割合から）
            const deepSleepRatio = data.sleep.filter(s => s.value === 'asleep.deep').length / data.sleep.length;
            let sleepQuality = 3; // 普通
            if (deepSleepRatio > 0.25) sleepQuality = 5; // 良い
            else if (deepSleepRatio > 0.15) sleepQuality = 4; // やや良い
            else if (deepSleepRatio < 0.10) sleepQuality = 2; // やや悪い
            else if (deepSleepRatio < 0.05) sleepQuality = 1; // 悪い

            setHealthData(prev => ({
                ...prev,
                sleepHours: parseFloat(sleepHours),
                sleepQuality: sleepQuality
            }));
        }

        // 歩数データを処理
        if (data.steps) {
            const totalSteps = data.steps.reduce((sum, entry) => sum + entry.value, 0);
            setHealthData(prev => ({
                ...prev,
                steps: totalSteps
            }));
        }

        // 心拍数データを処理
        if (data.heartRate && data.heartRate.length > 0) {
            const avgHeartRate = data.heartRate.reduce((sum, entry) => sum + entry.value, 0) / data.heartRate.length;
            setHealthData(prev => ({
                ...prev,
                heartRate: Math.round(avgHeartRate)
            }));
        }

        // データを保存
        saveHealthDataToDaily(data);

        setSyncStatus('success');
        setLastSyncTime(new Date());
        localStorage.setItem('wearable_last_sync', new Date().toISOString());
        localStorage.setItem('wearable_connection', JSON.stringify({
            isConnected: true,
            deviceType: deviceType
        }));
        setIsConnected(true);

        setTimeout(() => setSyncStatus('idle'), 3000);

        window.removeEventListener('healthKitDataResponse', processSyncedData);
    };

    // デイリーレコードに保存
    const saveHealthDataToDaily = async (data) => {
        const today = new Date().toISOString().split('T')[0];
        const dailyRecord = await DataService.getDailyRecord(userId, today);

        const updatedRecord = {
            ...dailyRecord,
            conditions: {
                ...(dailyRecord?.conditions || {}),
                sleepHours: healthData.sleepHours,
                sleepQuality: healthData.sleepQuality,
                steps: healthData.steps,
                heartRate: healthData.heartRate,
                syncedFromWearable: true,
                lastSyncTime: new Date().toISOString()
            }
        };

        await DataService.saveDailyRecord(userId, today, updatedRecord);

        // フィードバックを表示
        showFeedback(
            `ウェアラブルデバイスから睡眠データ（${healthData.sleepHours}時間）を自動同期しました`,
            'success'
        );
    };

    // モックデータ同期（開発・テスト用）
    const mockHealthDataSync = async (type) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockData = {
                    sleepHours: 7.5,
                    sleepQuality: 4,
                    steps: 8500,
                    heartRate: 68,
                    activeCalories: 450
                };

                setHealthData(mockData);
                setSyncStatus('success');
                setLastSyncTime(new Date());
                setDeviceType(type);
                setIsConnected(true);

                localStorage.setItem('wearable_connection', JSON.stringify({
                    isConnected: true,
                    deviceType: type
                }));
                localStorage.setItem('wearable_last_sync', new Date().toISOString());

                // モックデータを保存
                const saveData = async () => {
                    const today = new Date().toISOString().split('T')[0];
                    const dailyRecord = await DataService.getDailyRecord(userId, today);

                    const updatedRecord = {
                        ...dailyRecord,
                        conditions: {
                            ...(dailyRecord?.conditions || {}),
                            ...mockData,
                            syncedFromWearable: true,
                            lastSyncTime: new Date().toISOString()
                        }
                    };

                    await DataService.saveDailyRecord(userId, today, updatedRecord);
                };

                saveData();

                setTimeout(() => setSyncStatus('idle'), 3000);
                resolve();
            }, 2000);
        });
    };

    // 接続解除
    const disconnect = () => {
        setIsConnected(false);
        setDeviceType(null);
        setHealthData({
            sleepHours: null,
            sleepQuality: null,
            steps: null,
            heartRate: null,
            activeCalories: null
        });
        localStorage.removeItem('wearable_connection');
        localStorage.removeItem('wearable_last_sync');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 rounded-t-2xl flex justify-between items-center z-10">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Icon name="Watch" size={20} />
                        ウェアラブル連携
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                    >
                        <Icon name="X" size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!isConnected ? (
                        <>
                            {/* 連携説明 */}
                            <div className="text-center space-y-3">
                                <Icon name="Watch" size={64} className="mx-auto text-gray-300" />
                                <h4 className="text-lg font-bold">デバイスを接続</h4>
                                <p className="text-sm text-gray-600">
                                    Apple WatchやAndroidスマートウォッチと連携して、睡眠データを自動で記録しましょう
                                </p>
                            </div>

                            {/* 同期できるデータ */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h5 className="font-bold text-blue-900 mb-3">自動同期されるデータ</h5>
                                <ul className="space-y-2">
                                    {[
                                        { icon: 'Moon', label: '睡眠時間', desc: '深い睡眠・浅い睡眠を記録' },
                                        { icon: 'Heart', label: '心拍数', desc: '安静時心拍数を記録' },
                                        { icon: 'Activity', label: '歩数', desc: '1日の総歩数を記録' },
                                        { icon: 'Flame', label: '消費カロリー', desc: 'アクティブカロリーを記録' }
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-center gap-3">
                                            <Icon name={item.icon} size={18} className="text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-900">{item.label}</p>
                                                <p className="text-xs text-blue-700">{item.desc}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* 接続ボタン */}
                            <div className="space-y-3">
                                <button
                                    onClick={connectHealthKit}
                                    disabled={syncStatus === 'syncing'}
                                    className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Icon name="Watch" size={20} />
                                    Apple Watchと連携
                                </button>

                                <button
                                    onClick={connectHealthConnect}
                                    disabled={syncStatus === 'syncing'}
                                    className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-4 rounded-xl hover:from-green-700 hover:to-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Icon name="Smartphone" size={20} />
                                    Androidスマートウォッチと連携
                                </button>
                            </div>

                            {/* 同期状態 */}
                            {syncStatus === 'syncing' && (
                                <div className="text-center py-4">
                                    <Icon name="Loader" size={32} className="animate-spin text-indigo-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600">デバイスと接続中...</p>
                                </div>
                            )}

                            {syncStatus === 'error' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-700 text-sm flex items-center gap-2">
                                        <Icon name="AlertCircle" size={16} />
                                        接続に失敗しました。もう一度お試しください。
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* 接続済み表示 */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Icon name="CheckCircle" size={20} className="text-green-600" />
                                        <p className="font-bold text-green-900">接続済み</p>
                                    </div>
                                    <span className="text-xs text-green-700">
                                        {deviceType === 'healthkit' ? 'Apple Watch' : 'Android'}
                                    </span>
                                </div>
                                {lastSyncTime && (
                                    <p className="text-xs text-green-700">
                                        最終同期: {lastSyncTime.toLocaleString('ja-JP')}
                                    </p>
                                )}
                            </div>

                            {/* 同期されたデータ */}
                            <div className="space-y-3">
                                <h5 className="font-bold">今日のデータ</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: '睡眠時間', value: healthData.sleepHours ? `${healthData.sleepHours}時間` : '-', icon: 'Moon', color: 'purple' },
                                        { label: '心拍数', value: healthData.heartRate ? `${healthData.heartRate} bpm` : '-', icon: 'Heart', color: 'red' },
                                        { label: '歩数', value: healthData.steps ? `${healthData.steps.toLocaleString()}歩` : '-', icon: 'Activity', color: 'blue' },
                                        { label: '消費カロリー', value: healthData.activeCalories ? `${healthData.activeCalories} kcal` : '-', icon: 'Flame', color: 'orange' }
                                    ].map((item, index) => (
                                        <div key={index} className={`bg-${item.color}-50 border border-${item.color}-200 rounded-lg p-3`}>
                                            <Icon name={item.icon} size={20} className={`text-${item.color}-600 mb-2`} />
                                            <p className="text-xs text-gray-600">{item.label}</p>
                                            <p className={`text-lg font-bold text-${item.color}-900`}>{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 手動同期ボタン */}
                            <button
                                onClick={deviceType === 'healthkit' ? syncHealthKitData : syncHealthConnectData}
                                disabled={syncStatus === 'syncing'}
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {syncStatus === 'syncing' ? (
                                    <>
                                        <Icon name="Loader" size={18} className="animate-spin" />
                                        同期中...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="RefreshCw" size={18} />
                                        今すぐ同期
                                    </>
                                )}
                            </button>

                            {/* 接続解除ボタン */}
                            <button
                                onClick={disconnect}
                                className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition"
                            >
                                接続を解除
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
