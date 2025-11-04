// ===== Feature Unlock Utilities =====
// 機能開放システムのユーティリティ関数

// 機能完了状態を取得（旧ONBOARDING_TRIGGERSとの互換性あり）
const getFeatureCompletionStatus = (userId) => {
    // LocalStorage優先（DEV_MODEに関わらず）
    const key = STORAGE_KEYS.FEATURES_COMPLETED;

    // 新しい形式を優先
    let stored = localStorage.getItem(key);

    if (stored) {
        return JSON.parse(stored);
    }

    // 旧形式（ONBOARDING_TRIGGERS）からの移行
    const oldTriggers = localStorage.getItem(STORAGE_KEYS.ONBOARDING_TRIGGERS);
    if (oldTriggers) {
        const triggers = JSON.parse(oldTriggers);
        const completion = {};
        if (triggers.after_meal) completion.food = true;
        if (triggers.after_training) completion.training = true;
        if (triggers.after_condition) completion.condition = true;
        if (triggers.after_analysis) completion.analysis = true;
        // 新形式で保存
        localStorage.setItem(key, JSON.stringify(completion));
        console.log('[FeatureUnlock] Migrated from old format:', completion);
        return completion;
    }

    return {};
};

// 機能完了状態を保存
const saveFeatureCompletionStatus = async (userId, completionStatus) => {
    // LocalStorage優先（DEV_MODEに関わらず）
    const key = STORAGE_KEYS.FEATURES_COMPLETED;
    const value = JSON.stringify(completionStatus);
    localStorage.setItem(key, value);
    // ログを削減（必要に応じてコメントアウト解除）
    // console.log('[FeatureUnlock] Saved features:', Object.keys(completionStatus).filter(k => completionStatus[k]).join(', '));

    // Firestoreにも保存（非同期、エラーは無視）
    if (!DEV_MODE && typeof db !== 'undefined') {
        try {
            await db.collection('users').doc(userId).set({
                featuresCompleted: completionStatus
            }, { merge: true });
        } catch (error) {
            console.warn('[FeatureUnlock] Failed to save to Firestore:', error);
        }
    }
};

// 特定の機能が完了しているかチェック
const isFeatureCompleted = (userId, featureId) => {
    const status = getFeatureCompletionStatus(userId);
    return status[featureId] === true;
};

// 機能を完了としてマーク
const markFeatureCompleted = async (userId, featureId) => {
    const status = getFeatureCompletionStatus(userId);
    status[featureId] = true;
    await saveFeatureCompletionStatus(userId, status);
    return status;
};

// 機能開放モーダル表示履歴を取得
const getUnlockModalsShown = (userId) => {
    if (DEV_MODE) {
        const stored = localStorage.getItem(STORAGE_KEYS.UNLOCK_MODALS_SHOWN);
        return stored ? JSON.parse(stored) : {};
    }
    // TODO: Firestore実装
    return {};
};

// 機能開放モーダル表示履歴を保存
const saveUnlockModalsShown = (userId, modalsShown) => {
    if (DEV_MODE) {
        localStorage.setItem(STORAGE_KEYS.UNLOCK_MODALS_SHOWN, JSON.stringify(modalsShown));
    }
    // TODO: Firestore実装
};

// 特定のモーダルが表示済みかチェック
const isUnlockModalShown = (userId, modalId) => {
    const modalsShown = getUnlockModalsShown(userId);
    return modalsShown[modalId] === true;
};

// モーダルを表示済みとしてマーク
const markUnlockModalShown = (userId, modalId) => {
    const modalsShown = getUnlockModalsShown(userId);
    modalsShown[modalId] = true;
    saveUnlockModalsShown(userId, modalsShown);
};

// コンディション記録が6項目全て入力されているかチェック
const checkConditionComplete = (todayRecord) => {
    if (!todayRecord || !todayRecord.conditions) return false;
    const conditions = todayRecord.conditions;

    // 6項目: 睡眠時間、睡眠の質、食欲、腸内環境、集中力、ストレス
    const requiredFields = ['sleepHours', 'sleepQuality', 'appetite', 'digestion', 'focus', 'stress'];

    return requiredFields.every(field => {
        const value = conditions[field];
        return value !== undefined && value !== null && value !== '';
    });
};

// 食事記録が1回以上あるかチェック
const checkMealComplete = (todayRecord) => {
    if (!todayRecord || !todayRecord.meals) return false;
    return todayRecord.meals.length > 0;
};

// 運動記録が1回以上あるかチェック
const checkTrainingComplete = (todayRecord) => {
    if (!todayRecord || !todayRecord.workouts) return false;
    return todayRecord.workouts.length > 0;
};

// 登録日を取得
const getRegistrationDate = (userId) => {
    // LocalStorageから登録日を取得（DEV_MODEに関わらず）
    const stored = localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATE);
    if (!stored) {
        // 初回起動時は現在日時を登録日とする
        const now = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, now);
        return now;
    }
    return stored;
};

// 登録からの経過日数を計算
const calculateDaysSinceRegistration = (userId) => {
    const registrationDate = getRegistrationDate(userId);
    const now = new Date();
    const regDate = new Date(registrationDate);
    const diffTime = Math.abs(now - regDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // 1日目から始まるように+1（0日目ではなく1日目から表示）
};

// 機能開放状態を計算
const calculateUnlockedFeatures = (userId, todayRecord, isPremium = false) => {
    const completionStatus = getFeatureCompletionStatus(userId);
    const daysSinceReg = calculateDaysSinceRegistration(userId);
    const unlocked = [];

    // 0日目（初日）：段階的開放
    // 1. 食事記録は常に開放
    unlocked.push('food');

    // 2. 食事記録を1回完了したら運動記録を開放
    if (completionStatus.food || checkMealComplete(todayRecord)) {
        unlocked.push('training');
    }

    // 3. 運動記録を1回完了したらコンディション記録を開放
    if (completionStatus.training || checkTrainingComplete(todayRecord)) {
        unlocked.push('condition');
    }

    // 4. コンディション記録を6項目全て入力したら分析を開放
    if (completionStatus.condition || checkConditionComplete(todayRecord)) {
        unlocked.push('analysis');
    }

    // 5. 初回分析後：すべての機能を開放（05_analysis.jsで実行）
    // - 指示書、履歴（モーダル①）
    // - PG BASE、COMY（モーダル②）
    // - テンプレート、ルーティン、ショートカット、履歴分析（モーダル③）
    if (completionStatus.directive) {
        unlocked.push('directive');
    }
    if (completionStatus.idea) {
        unlocked.push('idea');
    }
    if (completionStatus.history) {
        unlocked.push('history');
    }
    if (completionStatus.pg_base) {
        unlocked.push('pg_base');
    }
    if (completionStatus.community) {
        unlocked.push('community');
    }
    if (completionStatus.template) {
        unlocked.push('template');
    }
    if (completionStatus.routine) {
        unlocked.push('routine');
    }
    if (completionStatus.shortcut) {
        unlocked.push('shortcut');
    }
    if (completionStatus.history_analysis) {
        unlocked.push('history_analysis');
    }

    // 8日目以降：Premium機能制限
    // トライアル期間（0-6日 = 登録後7日間）は全機能利用可能
    // 8日目以降（7日目から）は以下の機能をPremium会員限定に制限
    const isTrialActive = daysSinceReg < 7;
    if (daysSinceReg >= 7 && !isPremium && !DEV_PREMIUM_MODE) {
        // 8日目以降の無料ユーザーは以下の機能をロック
        // directive, pg_base, template, routine, shortcut, history, history_analysis, community, micronutrients
        // これらは既に配列に追加されているので、削除する
        const restrictedFeatures = [
            'directive', 'pg_base', 'template', 'routine', 'shortcut',
            'history', 'history_analysis', 'community', 'micronutrients'
        ];
        restrictedFeatures.forEach(feature => {
            const index = unlocked.indexOf(feature);
            if (index > -1) {
                unlocked.splice(index, 1);
            }
        });
    }

    // Premium専用機能（トライアル期間中（0-7日）も含む全期間で開放）
    if (isTrialActive || isPremium || DEV_PREMIUM_MODE) {
        unlocked.push('micronutrients');
        unlocked.push('community_view');
        unlocked.push('community_post');
    }

    // 旧互換性: history_graph と training_template は初回分析後の history と template に統合
    // 日数ベースの自動開放は削除し、初回分析後のモーダル経由でのみ開放
    if (completionStatus.history) {
        unlocked.push('history_graph');
    }
    if (completionStatus.template) {
        unlocked.push('training_template');
    }

    return unlocked;
};

// 次に開放される機能を取得
const getNextFeatureToUnlock = (userId, todayRecord) => {
    const completionStatus = getFeatureCompletionStatus(userId);
    const daysSinceReg = calculateDaysSinceRegistration(userId);

    // 0日目の段階的開放
    if (!completionStatus.food && !checkMealComplete(todayRecord)) {
        return { feature: FEATURES.FOOD, message: '食事を1回記録すると運動記録が開放されます' };
    }
    if (!completionStatus.training && !checkTrainingComplete(todayRecord)) {
        return { feature: FEATURES.TRAINING, message: '運動を1回記録するとコンディション記録が開放されます' };
    }
    if (!completionStatus.condition && !checkConditionComplete(todayRecord)) {
        return { feature: FEATURES.CONDITION, message: 'コンディション6項目を全て入力すると分析が開放されます' };
    }
    if (!completionStatus.analysis) {
        return { feature: FEATURES.ANALYSIS, message: '分析を1回使用すると指示書とPG BASEが開放されます' };
    }
    if (!completionStatus.directive) {
        return { feature: FEATURES.DIRECTIVE, message: '指示書を確認しましょう（明日の行動指針が記載されています）' };
    }
    if (!completionStatus.idea) {
        return { feature: FEATURES.IDEA, message: '閃きを記録して気づきを残しましょう' };
    }
    if (!completionStatus.pg_base) {
        return { feature: FEATURES.PG_BASE, message: 'PG BASEでボディメイクの基礎を学びましょう' };
    }

    // 初回分析後の段階的開放（3ページモーダル経由）
    if (completionStatus.analysis) {
        // 初回分析は完了しているが、以降の機能が未開放の場合
        if (!completionStatus.directive) {
            return { feature: FEATURES.DIRECTIVE, message: '初回分析後に指示書が開放されます' };
        }
        if (!completionStatus.history) {
            return { feature: FEATURES.HISTORY, message: '初回分析後に履歴が開放されます' };
        }
        if (!completionStatus.template) {
            return { feature: FEATURES.TEMPLATE, message: '初回分析後にテンプレートが開放されます' };
        }
        if (!completionStatus.routine) {
            return { feature: FEATURES.ROUTINE, message: '初回分析後にルーティンが開放されます' };
        }
        if (!completionStatus.shortcut) {
            return { feature: FEATURES.SHORTCUT, message: '初回分析後にショートカットが開放されます' };
        }
        if (!completionStatus.history_analysis) {
            return { feature: FEATURES.HISTORY_ANALYSIS, message: '初回分析後に履歴分析が開放されます' };
        }
    }

    return null;
};

// 機能完了チェック（記録追加時に自動呼び出し）
const checkAndCompleteFeatures = async (userId, todayRecord) => {
    const completionStatus = getFeatureCompletionStatus(userId);
    let updated = false;

    // 食事記録完了チェック
    if (!completionStatus.food && checkMealComplete(todayRecord)) {
        await markFeatureCompleted(userId, 'food');
        updated = true;
    }

    // 運動記録完了チェック
    if (!completionStatus.training && checkTrainingComplete(todayRecord)) {
        await markFeatureCompleted(userId, 'training');
        updated = true;
    }

    // コンディション記録完了チェック
    if (!completionStatus.condition && checkConditionComplete(todayRecord)) {
        await markFeatureCompleted(userId, 'condition');
        updated = true;
    }

    return updated;
};

// 8日目以降のPremium機能制限チェック
const checkPremiumAccessRequired = (userId, featureId, userProfile) => {
    const daysSinceReg = calculateDaysSinceRegistration(userId);
    const isPremium = userProfile?.subscriptionTier === 'premium' || DEV_PREMIUM_MODE;

    // トライアル期間中（0-7日）は全機能アクセス可能
    if (daysSinceReg < 7) {
        return { allowed: true, reason: 'trial' };
    }

    // 8日目以降にPremium制限がかかる機能（7日間無料トライアル）
    const premiumRestrictedFeatures = [
        'directive', 'pg_base', 'template', 'routine', 'shortcut',
        'history', 'history_analysis', 'community', 'analysis', 'micronutrients'
    ];

    // 該当機能がPremium制限対象かチェック
    if (premiumRestrictedFeatures.includes(featureId)) {
        if (isPremium) {
            return { allowed: true, reason: 'premium' };
        } else {
            return {
                allowed: false,
                reason: 'premium_required',
                message: 'この機能は8日目以降、Premium会員限定となります'
            };
        }
    }

    // 常時Premium専用機能
    const alwaysPremiumFeatures = ['community_post'];
    if (alwaysPremiumFeatures.includes(featureId)) {
        if (isPremium) {
            return { allowed: true, reason: 'premium' };
        } else {
            return {
                allowed: false,
                reason: 'premium_only',
                message: 'この機能はPremium会員専用です'
            };
        }
    }

    // その他の機能は常にアクセス可能
    return { allowed: true, reason: 'free' };
};
