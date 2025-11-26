import React from 'react';
import { FEATURES, STORAGE_KEYS } from '../config.js';

// ===== Feature Unlock Utilities =====
// 機能開放システムのユーティリティ関数

// 機能完了状態を取得（Firestore同期対応）
const getFeatureCompletionStatus = async (userId) => {
    const key = STORAGE_KEYS.FEATURES_COMPLETED;

    // 1. LocalStorageを確認
    let localData = {};
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            localData = JSON.parse(stored);
        } catch (error) {
            console.warn('[FeatureUnlock] Failed to parse localStorage:', error);
        }
    }

    // 2. Firestoreからも取得（常に確認して最新データを保証）
    let firestoreData = {};
    if (typeof db !== 'undefined' && userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().featuresCompleted) {
                firestoreData = userDoc.data().featuresCompleted;
            }
        } catch (error) {
            console.warn('[FeatureUnlock] Failed to fetch featuresCompleted from Firestore:', error);
        }
    }

    // 3. LocalStorageとFirestoreをマージ（より多くのtrueフラグを持つ方を優先）
    const localCount = Object.keys(localData).filter(k => localData[k]).length;
    const firestoreCount = Object.keys(firestoreData).filter(k => firestoreData[k]).length;

    // より完全なデータを使用（trueの数が多い方）
    const mergedData = firestoreCount > localCount ? firestoreData : localData;

    // さらにマージ（両方のtrueを保持）
    const finalData = { ...localData, ...firestoreData };

    // LocalStorageを更新（最新の完全なデータで）
    if (Object.keys(finalData).length > 0) {
        localStorage.setItem(key, JSON.stringify(finalData));

        // ログ出力（デバッグ用）
        if (localCount !== firestoreCount) {
            console.log('[FeatureUnlock] Merged features - Local:', localCount, 'Firestore:', firestoreCount, 'Final:', Object.keys(finalData).filter(k => finalData[k]).length);
        }
    }

    return finalData;
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
const isFeatureCompleted = async (userId, featureId) => {
    const status = await getFeatureCompletionStatus(userId);
    return status[featureId] === true;
};

// 機能を完了としてマーク
const markFeatureCompleted = async (userId, featureId) => {
    const status = await getFeatureCompletionStatus(userId);
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

// コンディション記録が5項目全て入力されているかチェック
const checkConditionComplete = (todayRecord) => {
    if (!todayRecord || !todayRecord.conditions) return false;
    const conditions = todayRecord.conditions;

    // 5項目: 睡眠時間、睡眠の質、腸内環境、集中力、ストレス
    const requiredFields = ['sleepHours', 'sleepQuality', 'digestion', 'focus', 'stress'];

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

// 登録日を取得（Firestore優先）
const getRegistrationDate = async (userId) => {
    // 1. LocalStorageを確認
    const stored = localStorage.getItem(STORAGE_KEYS.REGISTRATION_DATE);
    if (stored) return stored;

    // 2. Firestoreから取得
    if (typeof db !== 'undefined' && userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().registrationDate) {
                const regDate = userDoc.data().registrationDate.toDate().toISOString();
                localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, regDate);
                console.log('[FeatureUnlock] Fetched registrationDate from Firestore:', regDate);
                return regDate;
            }
        } catch (error) {
            console.warn('[FeatureUnlock] Failed to fetch registrationDate from Firestore:', error);
        }
    }

    // 3. フォールバック: 現在日時
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.REGISTRATION_DATE, now);
    console.log('[FeatureUnlock] Using current date as registrationDate:', now);
    return now;
};

// 登録からの経過日数を計算（0日目から開始）
const calculateDaysSinceRegistration = async (userId) => {
    const registrationDate = await getRegistrationDate(userId);
    const now = new Date();
    const regDate = new Date(registrationDate);

    // 時刻を無視して日付のみで比較
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const regDateOnly = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate());

    const diffTime = nowDateOnly - regDateOnly;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // 1日目から開始（登録日当日=1日目、翌日=2日目...）
    // トライアル期間: 1-7日目（7日間）、制限開始: 8日目以降
    return diffDays + 1;
};

// 機能開放状態を計算
const calculateUnlockedFeatures = async (userId, todayRecord, isPremium = false) => {
    const completionStatus = await getFeatureCompletionStatus(userId);
    const daysSinceReg = await calculateDaysSinceRegistration(userId);
    const unlocked = [];

    console.log('[calculateUnlockedFeatures] userId:', userId);
    console.log('[calculateUnlockedFeatures] completionStatus:', JSON.stringify(completionStatus));
    console.log('[calculateUnlockedFeatures] completionStatus keys:', Object.keys(completionStatus));
    console.log('[calculateUnlockedFeatures] todayRecord meals:', todayRecord?.meals?.length || 0);
    console.log('[calculateUnlockedFeatures] todayRecord workouts:', todayRecord?.workouts?.length || 0);
    console.log('[calculateUnlockedFeatures] isPremium:', isPremium);

    // 開放条件判定用（ループ開始時点のステータスのみを参照）
    const initialStatus = { ...completionStatus };

    // 1日目（初日）：段階的開放
    // 1. 食事記録は常に開放
    unlocked.push('food');

    // 2. 食事記録を1回完了したら運動記録を開放
    if (initialStatus.food) {
        unlocked.push('training');
    }

    // 3. 運動記録を1回完了したらコンディション記録を開放
    if (initialStatus.training) {
        unlocked.push('condition');
    }

    // ===== 有料・無料の判定 =====
    // コードユーザー（B2B/ギフト/紹介）はトライアルではない
    const isTrialActive = !isPremium && daysSinceReg <= 7; // 1-7日目（7日間）はトライアル（Premium除外）
    const hasPremiumAccess = isTrialActive || isPremium;

    // 4. テンプレート機能 - 初日から全員に開放
    unlocked.push('template');
    unlocked.push('training_template'); // 旧互換性

    // 5. ルーティン - 初日から全員に開放
    unlocked.push('routine');

    // 6. PGBASE - 常に全員に開放（現在公開分は無料）
    unlocked.push('pg_base');

    // ===== 8日目以降はPremium専用の機能 =====
    if (hasPremiumAccess) {
        // ショートカット
        unlocked.push('shortcut');

        // AI機能
        unlocked.push('ai_photo_recognition'); // AI食事認識

        // 分析機能（コンディション完了が必須条件）
        if (initialStatus.condition) {
            unlocked.push('analysis');
        }

        // 分析完了後に開放される機能
        if (initialStatus.analysis) {
            unlocked.push('idea');
            unlocked.push('history');
            unlocked.push('community');
        }

        // 詳細栄養素
        unlocked.push('detailed_nutrients');
        unlocked.push('micronutrients'); // 旧互換性
    }

    console.log('[calculateUnlockedFeatures] ===== 機能開放状態 =====');
    console.log('[calculateUnlockedFeatures] 登録日数:', daysSinceReg, '日目');
    console.log('[calculateUnlockedFeatures] トライアル中:', isTrialActive);
    console.log('[calculateUnlockedFeatures] Premium会員:', isPremium);
    console.log('[calculateUnlockedFeatures] Premium機能アクセス:', hasPremiumAccess);
    console.log('[calculateUnlockedFeatures] 開放機能 (' + unlocked.length + '個):', unlocked.join(', '));
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
const getNextFeatureToUnlock = async (userId, todayRecord) => {
    const completionStatus = await getFeatureCompletionStatus(userId);
    const daysSinceReg = await calculateDaysSinceRegistration(userId);

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
    console.log('[checkAndCompleteFeatures] 呼び出されました');
    console.log('[checkAndCompleteFeatures] userId:', userId);
    console.log('[checkAndCompleteFeatures] todayRecord:', todayRecord);

    const completionStatus = await getFeatureCompletionStatus(userId);
    console.log('[checkAndCompleteFeatures] completionStatus:', completionStatus);
    let updated = false;

    // 食事記録完了チェック
    const mealComplete = checkMealComplete(todayRecord);
    console.log('[checkAndCompleteFeatures] mealComplete:', mealComplete);
    if (!completionStatus.food && mealComplete) {
        console.log('[checkAndCompleteFeatures] ✅ 食事記録完了をマーク');
        await markFeatureCompleted(userId, 'food');
        updated = true;
    }

    // 運動記録完了チェック
    const trainingComplete = checkTrainingComplete(todayRecord);
    console.log('[checkAndCompleteFeatures] trainingComplete:', trainingComplete);
    if (!completionStatus.training && trainingComplete) {
        console.log('[checkAndCompleteFeatures] ✅ 運動記録完了をマーク');
        await markFeatureCompleted(userId, 'training');
        updated = true;
    }

    // コンディション記録完了チェック
    const conditionComplete = checkConditionComplete(todayRecord);
    console.log('[checkAndCompleteFeatures] conditionComplete:', conditionComplete);
    if (!completionStatus.condition && conditionComplete) {
        console.log('[checkAndCompleteFeatures] ✅ コンディション記録完了をマーク');
        await markFeatureCompleted(userId, 'condition');
        updated = true;
    }

    console.log('[checkAndCompleteFeatures] updated:', updated);
    return updated;
};

// 8日目以降のPremium機能制限チェック
const checkPremiumAccessRequired = async (userId, featureId, userProfile) => {
    const daysSinceReg = await calculateDaysSinceRegistration(userId);
    // プレミアム判定：Stripe契約、B2B企業コード、ギフトコード、紹介ボーナスのいずれか
    const isPremium = userProfile?.subscriptionStatus === 'active' || userProfile?.b2b2cOrgId || userProfile?.subscription?.giftCodeActive === true || userProfile?.referralBonusApplied === true;

    // トライアル期間中（1-7日目）は全機能アクセス可能
    if (daysSinceReg <= 7) {
        return { allowed: true, reason: 'trial' };
    }

    // 8日目以降にPremium制限がかかる機能
    const premiumRestrictedFeatures = [
        'ai_photo_recognition', // AI食事認識
        'analysis', // 分析
        'directive', // 指示書
        'history', // 履歴
        'history_analysis', // 履歴分析
        'shortcut', // ショートカット
        'community', // コミュニティ
        'community_view', // コミュニティ閲覧（旧）
        'community_post', // コミュニティ投稿（旧）
        'detailed_nutrients', // 詳細栄養素
        'micronutrients' // 詳細栄養素（旧）
    ];

    // 該当機能がPremium制限対象かチェック
    if (premiumRestrictedFeatures.includes(featureId)) {
        if (isPremium) {
            return { allowed: true, reason: 'premium' };
        } else {
            return {
                allowed: false,
                reason: 'premium_required',
                message: 'この機能はPremium会員専用です。7日間の無料トライアル中は全機能をお試しいただけます。'
            };
        }
    }

    // その他の機能は常にアクセス可能
    return { allowed: true, reason: 'free' };
};

// ===== テンプレート機能の制限チェック =====

// トライアル中に作成されたテンプレートがロックされているかチェック
const isTemplateLocked = async (template, userId, userProfile) => {
    // Premium会員は常に利用可能
    if (userProfile?.subscriptionStatus === 'active') return false;

    // トライアル中に作成されたテンプレート
    if (template.isTrialCreated) {
        const daysSinceReg = await calculateDaysSinceRegistration(userId);
        // 8日目以降はロック
        return daysSinceReg > 7;
    }

    return false;
};

// テンプレート作成可能かチェック（枠制限）
const canCreateTemplate = async (type, templates, userId, userProfile) => {
    // Premium会員は無制限
    if (userProfile?.subscriptionStatus === 'active') return { canCreate: true, reason: 'premium' };

    const daysSinceReg = await calculateDaysSinceRegistration(userId);

    // トライアル中（1-7日目）は無制限
    if (daysSinceReg <= 7) return { canCreate: true, reason: 'trial' };

    // 8日目以降は各1枠のみ（ロックされていないテンプレートをカウント）
    const activeTemplates = [];
    for (const template of templates) {
        if (template.type === type) {
            const locked = await isTemplateLocked(template, userId, userProfile);
            if (!locked) {
                activeTemplates.push(template);
            }
        }
    }

    if (activeTemplates.length < 1) {
        return { canCreate: true, reason: 'free_slot_available' };
    } else {
        return {
            canCreate: false,
            reason: 'limit_reached',
            message: '無料会員は食事・運動各1枠のみです。既存のテンプレートを編集または削除してください。'
        };
    }
};

// テンプレート作成時のメタデータを取得
const getTemplateMetadata = async (userId) => {
    const daysSinceReg = await calculateDaysSinceRegistration(userId);
    const isTrialActive = daysSinceReg <= 7;

    return {
        createdAt: new Date(),
        isTrialCreated: isTrialActive // トライアル中に作成されたかフラグ
    };
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
window.isTemplateLocked = isTemplateLocked;
window.canCreateTemplate = canCreateTemplate;
window.getTemplateMetadata = getTemplateMetadata;
