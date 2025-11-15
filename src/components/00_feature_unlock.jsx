import React from 'react';
import { FEATURES, STORAGE_KEYS } from '../config.js';

// ===== Feature Unlock Utilities =====
// 機能開放システムのユーティリティ関数

// 機能完了状態を取得（旧ONBOARDING_TRIGGERSとの互換性あり）
const getFeatureCompletionStatus = (userId) => {
    // LocalStorage優先
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
    // LocalStorage優先
    const key = STORAGE_KEYS.FEATURES_COMPLETED;
    const value = JSON.stringify(completionStatus);
    localStorage.setItem(key, value);
    // ログを削減（必要に応じてコメントアウト解除）
    // console.log('[FeatureUnlock] Saved features:', Object.keys(completionStatus).filter(k => completionStatus[k]).join(', '));

    // Firestoreにも保存（非同期、エラーは無視）
    if (typeof db !== 'undefined') {
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
    const stored = localStorage.getItem(STORAGE_KEYS.UNLOCK_MODALS_SHOWN);
    return stored ? JSON.parse(stored) : {};
};

// 機能開放モーダル表示履歴を保存
const saveUnlockModalsShown = (userId, modalsShown) => {
    localStorage.setItem(STORAGE_KEYS.UNLOCK_MODALS_SHOWN, JSON.stringify(modalsShown));
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
    // LocalStorageから登録日を取得
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

    // console.log('[calculateUnlockedFeatures] userId:', userId);
    // console.log('[calculateUnlockedFeatures] completionStatus:', completionStatus);
    // console.log('[calculateUnlockedFeatures] todayRecord:', todayRecord);
    // console.log('[calculateUnlockedFeatures] isPremium:', isPremium);

    // 0日目（初日）：段階的開放
    // 1. 食事記録は常に開放
    unlocked.push('food');

    // 2. 食事記録を1回完了したら運動記録を開放（一度完了したら永続）
    if (completionStatus.food || completionStatus.training || checkMealComplete(todayRecord)) {
        unlocked.push('training');
    }

    // 3. 運動記録を1回完了したらコンディション記録を開放（一度完了したら永続）
    if (completionStatus.training || completionStatus.condition || checkTrainingComplete(todayRecord)) {
        unlocked.push('condition');
    }

    // 4. コンディション記録を6項目全て入力したら分析を開放（一度完了したら永続）
    if (completionStatus.condition || completionStatus.analysis || checkConditionComplete(todayRecord)) {
        unlocked.push('analysis');
    }

    // 5. 閃き機能（無料機能、一度開放したら永続）
    if (completionStatus.idea) {
        unlocked.push('idea');
    }

    // ===== 有料・無料の判定 =====
    const isTrialActive = daysSinceReg < 7; // 0-6日目（7日間）はトライアル
    const hasPremiumAccess = isTrialActive || isPremium;

    // 6. Premium機能（トライアル中または有料会員のみ）
    // 一度開放されたら、completionStatusに記録されているので永続的に維持
    if (hasPremiumAccess) {
        // テンプレート機能
        unlocked.push('template');
        unlocked.push('training_template'); // 旧互換性

        // 初回分析後に開放される機能
        if (completionStatus.directive) {
            unlocked.push('directive');
        }
        if (completionStatus.history) {
            unlocked.push('history');
            unlocked.push('history_graph'); // 旧互換性
        }
        if (completionStatus.pg_base) {
            unlocked.push('pg_base');
        }
        if (completionStatus.community) {
            unlocked.push('community');
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

        // 常時Premium専用機能
        unlocked.push('micronutrients');
        unlocked.push('community_view');
        unlocked.push('community_post');
    }

    // console.log('[calculateUnlockedFeatures] ===== 機能開放状態 =====');
    // console.log('[calculateUnlockedFeatures] 登録日数:', daysSinceReg, '日目');
    // console.log('[calculateUnlockedFeatures] トライアル中:', isTrialActive);
    // console.log('[calculateUnlockedFeatures] Premium会員:', isPremium);
    // console.log('[calculateUnlockedFeatures] Premium機能アクセス:', hasPremiumAccess);
    // console.log('[calculateUnlockedFeatures] 開放機能:', unlocked);
    // console.log('[calculateUnlockedFeatures] ===== 基本機能 =====');
    // console.log('[calculateUnlockedFeatures] - food:', unlocked.includes('food'));
    // console.log('[calculateUnlockedFeatures] - training:', unlocked.includes('training'));
    // console.log('[calculateUnlockedFeatures] - condition:', unlocked.includes('condition'));
    // console.log('[calculateUnlockedFeatures] - analysis:', unlocked.includes('analysis'));
    // console.log('[calculateUnlockedFeatures] - idea:', unlocked.includes('idea'));
    // console.log('[calculateUnlockedFeatures] ===== Premium機能 =====');
    // console.log('[calculateUnlockedFeatures] - directive:', unlocked.includes('directive'));
    // console.log('[calculateUnlockedFeatures] - history:', unlocked.includes('history'));
    // console.log('[calculateUnlockedFeatures] - pg_base:', unlocked.includes('pg_base'));
    // console.log('[calculateUnlockedFeatures] - template:', unlocked.includes('template'));
    // console.log('[calculateUnlockedFeatures] - routine:', unlocked.includes('routine'));
    // console.log('[calculateUnlockedFeatures] - micronutrients:', unlocked.includes('micronutrients'));

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
    const isPremium = userProfile?.subscriptionTier === 'premium';

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


// グローバルに公開
window.FEATURES = FEATURES;
window.getFeatureCompletionStatus = getFeatureCompletionStatus;
window.saveFeatureCompletionStatus = saveFeatureCompletionStatus;
window.isFeatureCompleted = isFeatureCompleted;
window.markFeatureCompleted = markFeatureCompleted;
window.getUnlockModalsShown = getUnlockModalsShown;
window.saveUnlockModalsShown = saveUnlockModalsShown;
window.isUnlockModalShown = isUnlockModalShown;
window.markUnlockModalShown = markUnlockModalShown;
window.checkConditionComplete = checkConditionComplete;
window.checkMealComplete = checkMealComplete;
window.checkTrainingComplete = checkTrainingComplete;
window.getRegistrationDate = getRegistrationDate;
window.calculateDaysSinceRegistration = calculateDaysSinceRegistration;
window.calculateUnlockedFeatures = calculateUnlockedFeatures;
window.getNextFeatureToUnlock = getNextFeatureToUnlock;
window.checkAndCompleteFeatures = checkAndCompleteFeatures;
window.checkPremiumAccessRequired = checkPremiumAccessRequired;
