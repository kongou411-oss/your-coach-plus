// ===== Feature Unlock Utilities =====
// 機能開放システムのユーティリティ関数

// 機能完了状態を取得（旧ONBOARDING_TRIGGERSとの互換性あり）
const getFeatureCompletionStatus = (userId) => {
    if (DEV_MODE) {
        // 新しい形式を優先
        let stored = localStorage.getItem(STORAGE_KEYS.FEATURES_COMPLETED);
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
            localStorage.setItem(STORAGE_KEYS.FEATURES_COMPLETED, JSON.stringify(completion));
            return completion;
        }

        return {};
    }
    // TODO: Firestore実装
    return {};
};

// 機能完了状態を保存
const saveFeatureCompletionStatus = async (userId, completionStatus) => {
    if (DEV_MODE) {
        localStorage.setItem(STORAGE_KEYS.FEATURES_COMPLETED, JSON.stringify(completionStatus));
        return;
    }
    // TODO: Firestore実装
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
    if (DEV_MODE) {
        const stored = localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATE);
        if (!stored) {
            // 初回起動時は現在日時を登録日とする
            const now = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, now);
            return now;
        }
        return stored;
    }
    // TODO: Firestore実装（userProfile.registrationDateから取得）
    return new Date().toISOString();
};

// 登録からの経過日数を計算
const calculateDaysSinceRegistration = (userId) => {
    const registrationDate = getRegistrationDate(userId);
    const now = new Date();
    const regDate = new Date(registrationDate);
    const diffTime = Math.abs(now - regDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

    // 5. 分析を1回使用したら指示書を開放
    if (completionStatus.analysis) {
        unlocked.push('directive');
    }

    // 6. 指示書を1回確認したらPG BASEを開放
    if (completionStatus.directive) {
        unlocked.push('pg_base');
    }

    // 3日目：テンプレート → ルーティン → ショートカット（段階的）
    if (daysSinceReg >= 3) {
        unlocked.push('template');

        if (completionStatus.template) {
            unlocked.push('routine');
        }

        if (completionStatus.routine) {
            unlocked.push('shortcut');
        }
    }

    // 7日目：履歴 → 履歴分析（段階的）
    if (daysSinceReg >= 7) {
        unlocked.push('history');

        if (completionStatus.history) {
            unlocked.push('history_analysis');
        }
    }

    // Premium機能
    if (isPremium || DEV_PREMIUM_MODE) {
        unlocked.push('community');
        unlocked.push('micronutrients');
        unlocked.push('community_view');
        unlocked.push('community_post');
    }

    // 旧互換性
    if (daysSinceReg >= 7) {
        unlocked.push('history_graph'); // 履歴と同じ扱い（7日目）
    }
    if (daysSinceReg >= 3) {
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
        return { feature: FEATURES.ANALYSIS, message: '分析を1回使用すると指示書が開放されます' };
    }
    if (!completionStatus.directive) {
        return { feature: FEATURES.DIRECTIVE, message: '指示書を1回確認するとPG BASEが開放されます' };
    }
    if (!completionStatus.pg_base) {
        return { feature: FEATURES.PG_BASE, message: 'PG BASEを確認してボディメイクの基礎を学びましょう' };
    }

    // 3日目の段階的開放
    if (daysSinceReg >= 3) {
        if (!completionStatus.template) {
            return { feature: FEATURES.TEMPLATE, message: 'テンプレートを1回使用するとルーティンが開放されます' };
        }
        if (!completionStatus.routine) {
            return { feature: FEATURES.ROUTINE, message: 'ルーティンを1回使用するとショートカットが開放されます' };
        }
        if (!completionStatus.shortcut) {
            return { feature: FEATURES.SHORTCUT, message: 'ショートカットを設定して効率的に記録しましょう' };
        }
    }

    // 7日目の段階的開放
    if (daysSinceReg >= 7) {
        if (!completionStatus.history) {
            return { feature: FEATURES.HISTORY, message: '履歴を1回確認すると履歴分析が開放されます' };
        }
        if (!completionStatus.history_analysis) {
            return { feature: FEATURES.HISTORY_ANALYSIS, message: '履歴分析で長期的なトレンドを確認しましょう' };
        }
    }

    // 次の日数ベース開放を案内
    if (daysSinceReg < 3) {
        return { feature: null, message: `あと${3 - daysSinceReg}日でテンプレート機能が開放されます` };
    }
    if (daysSinceReg < 7) {
        return { feature: null, message: `あと${7 - daysSinceReg}日で履歴機能が開放されます` };
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
