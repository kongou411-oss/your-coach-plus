// ===== 23_analytics_tracker.jsx =====
// ユーザー行動トラッキングシステム
// 機能使用状況を記録し、使用/未使用機能を分析可能にする

import React, { createContext, useContext, useCallback, useEffect } from 'react';

// ===== 全機能リスト定義 =====
// これにより「使われていない機能」を逆算で把握できる
export const ALL_FEATURES = {
    // ===== ダッシュボード =====
    'dashboard.view': { name: 'ダッシュボード表示', category: 'dashboard', priority: 'high' },
    'dashboard.date_change': { name: '日付変更', category: 'dashboard', priority: 'medium' },
    'dashboard.score_tap': { name: 'スコアタップ（詳細表示）', category: 'dashboard', priority: 'low' },

    // ===== 食事記録 =====
    'meal.add': { name: '食事追加', category: 'meal', priority: 'high' },
    'meal.edit': { name: '食事編集', category: 'meal', priority: 'medium' },
    'meal.delete': { name: '食事削除', category: 'meal', priority: 'low' },
    'meal.search': { name: '食品検索', category: 'meal', priority: 'high' },
    'meal.ai_recognition': { name: 'AI食事認識', category: 'meal', priority: 'high' },
    'meal.template_use': { name: '食事テンプレート使用', category: 'meal', priority: 'medium' },
    'meal.template_save': { name: '食事テンプレート保存', category: 'meal', priority: 'medium' },
    'meal.custom_food_add': { name: 'カスタム食材追加', category: 'meal', priority: 'low' },
    'meal.supplement_add': { name: 'サプリメント追加', category: 'meal', priority: 'medium' },
    'meal.photo_add': { name: '食事写真追加', category: 'meal', priority: 'low' },

    // ===== 運動記録 =====
    'workout.add': { name: '運動追加', category: 'workout', priority: 'high' },
    'workout.edit': { name: '運動編集', category: 'workout', priority: 'medium' },
    'workout.delete': { name: '運動削除', category: 'workout', priority: 'low' },
    'workout.search': { name: '種目検索', category: 'workout', priority: 'high' },
    'workout.template_use': { name: '運動テンプレート使用', category: 'workout', priority: 'medium' },
    'workout.template_save': { name: '運動テンプレート保存', category: 'workout', priority: 'medium' },
    'workout.rm_calculator': { name: 'RM計算機', category: 'workout', priority: 'medium' },
    'workout.set_add': { name: 'セット追加', category: 'workout', priority: 'high' },
    'workout.part_select': { name: '部位選択', category: 'workout', priority: 'medium' },

    // ===== AI分析 =====
    'analysis.run': { name: 'AI分析実行', category: 'analysis', priority: 'high' },
    'analysis.chat': { name: 'AIチャット送信', category: 'analysis', priority: 'high' },
    'analysis.report_view': { name: 'レポート閲覧', category: 'analysis', priority: 'medium' },
    'analysis.report_delete': { name: 'レポート削除', category: 'analysis', priority: 'low' },

    // ===== PGBASE =====
    'pgbase.view': { name: 'PGBASE表示', category: 'pgbase', priority: 'medium' },
    'pgbase.chat': { name: 'PGBASEチャット', category: 'pgbase', priority: 'medium' },
    'pgbase.history_view': { name: 'チャット履歴閲覧', category: 'pgbase', priority: 'low' },

    // ===== コミュニティ（COMY） =====
    'comy.view': { name: 'COMY表示', category: 'comy', priority: 'medium' },
    'comy.post_create': { name: '投稿作成', category: 'comy', priority: 'high' },
    'comy.like': { name: 'いいね', category: 'comy', priority: 'low' },
    'comy.comment': { name: 'コメント', category: 'comy', priority: 'low' },
    'comy.project_create': { name: 'プロジェクト作成', category: 'comy', priority: 'medium' },

    // ===== 履歴 =====
    'history.view': { name: '履歴表示', category: 'history', priority: 'high' },
    'history.date_select': { name: '日付選択', category: 'history', priority: 'medium' },
    'history.export': { name: 'データエクスポート', category: 'history', priority: 'low' },

    // ===== 設定 =====
    'settings.view': { name: '設定表示', category: 'settings', priority: 'medium' },
    'settings.profile_edit': { name: 'プロフィール編集', category: 'settings', priority: 'medium' },
    'settings.goal_change': { name: '目標変更', category: 'settings', priority: 'high' },
    'settings.notification_change': { name: '通知設定変更', category: 'settings', priority: 'medium' },
    'settings.pfc_customize': { name: 'PFC比率カスタマイズ', category: 'settings', priority: 'low' },
    'settings.data_export': { name: 'データエクスポート', category: 'settings', priority: 'low' },
    'settings.data_delete': { name: 'データ削除', category: 'settings', priority: 'low' },

    // ===== BAB（ナビゲーション） =====
    'nav.home': { name: 'ホームタブ', category: 'navigation', priority: 'high' },
    'nav.history': { name: '履歴タブ', category: 'navigation', priority: 'high' },
    'nav.pgbase': { name: 'PGBASEタブ', category: 'navigation', priority: 'medium' },
    'nav.comy': { name: 'COMYタブ', category: 'navigation', priority: 'medium' },
    'nav.settings': { name: '設定タブ', category: 'navigation', priority: 'medium' },

    // ===== コンディション =====
    'condition.sleep_record': { name: '睡眠記録', category: 'condition', priority: 'medium' },
    'condition.weight_record': { name: '体重記録', category: 'condition', priority: 'high' },
    'condition.body_fat_record': { name: '体脂肪率記録', category: 'condition', priority: 'medium' },
    'condition.digestion_record': { name: '消化記録', category: 'condition', priority: 'low' },
    'condition.focus_record': { name: '集中力記録', category: 'condition', priority: 'low' },
    'condition.stress_record': { name: 'ストレス記録', category: 'condition', priority: 'low' },

    // ===== その他 =====
    'other.feedback': { name: 'フィードバック送信', category: 'other', priority: 'low' },
    'other.help': { name: 'ヘルプ閲覧', category: 'other', priority: 'low' },
    'other.referral_share': { name: '紹介コード共有', category: 'other', priority: 'low' },
    'other.subscription_view': { name: 'サブスクリプション確認', category: 'other', priority: 'low' },
};

// カテゴリ定義
export const FEATURE_CATEGORIES = {
    dashboard: { name: 'ダッシュボード', icon: 'Home', color: 'blue' },
    meal: { name: '食事記録', icon: 'Utensils', color: 'green' },
    workout: { name: '運動記録', icon: 'Dumbbell', color: 'orange' },
    analysis: { name: 'AI分析', icon: 'Brain', color: 'purple' },
    pgbase: { name: 'PGBASE', icon: 'MessageSquare', color: 'pink' },
    comy: { name: 'COMY', icon: 'Users', color: 'teal' },
    history: { name: '履歴', icon: 'Calendar', color: 'gray' },
    settings: { name: '設定', icon: 'Settings', color: 'slate' },
    navigation: { name: 'ナビゲーション', icon: 'Navigation', color: 'indigo' },
    condition: { name: 'コンディション', icon: 'Heart', color: 'red' },
    other: { name: 'その他', icon: 'MoreHorizontal', color: 'zinc' },
};

// ===== Analytics Context =====
const AnalyticsContext = createContext(null);

export const useAnalytics = () => {
    const context = useContext(AnalyticsContext);
    if (!context) {
        // コンテキスト外で使用された場合はダミー関数を返す
        return {
            trackEvent: () => {},
            trackFeature: () => {},
        };
    }
    return context;
};

// ===== Analytics Provider =====
export const AnalyticsProvider = ({ children, userId }) => {
    // イベントをFirestoreに記録
    const trackEvent = useCallback(async (eventName, metadata = {}) => {
        if (!userId) return;

        try {
            // バッチ処理用にローカルストレージにも保存
            const event = {
                eventName,
                userId,
                timestamp: new Date().toISOString(),
                metadata,
            };

            // Firestoreに直接保存（リアルタイム）
            if (typeof db !== 'undefined') {
                const eventRef = db.collection('analytics').doc(userId).collection('events');
                await eventRef.add(event);
            }

            // デバッグログ
            console.log('[Analytics] Event tracked:', eventName, metadata);
        } catch (error) {
            console.error('[Analytics] Track event error:', error);
        }
    }, [userId]);

    // 機能使用をトラッキング（ALL_FEATURESのキーを使用）
    const trackFeature = useCallback((featureKey, metadata = {}) => {
        if (!ALL_FEATURES[featureKey]) {
            console.warn('[Analytics] Unknown feature:', featureKey);
        }
        trackEvent(featureKey, {
            featureName: ALL_FEATURES[featureKey]?.name || featureKey,
            category: ALL_FEATURES[featureKey]?.category || 'unknown',
            ...metadata,
        });
    }, [trackEvent]);

    // 画面表示時に自動トラッキング（ページビュー）
    useEffect(() => {
        if (userId) {
            trackEvent('app.session_start', { platform: 'web' });
        }
    }, [userId, trackEvent]);

    const value = {
        trackEvent,
        trackFeature,
        allFeatures: ALL_FEATURES,
        categories: FEATURE_CATEGORIES,
    };

    return (
        <AnalyticsContext.Provider value={value}>
            {children}
        </AnalyticsContext.Provider>
    );
};

// ===== Analytics Service (services.js用) =====
// グローバルに公開するサービスオブジェクト
export const AnalyticsService = {
    // イベント記録
    trackEvent: async (userId, eventName, metadata = {}) => {
        if (!userId || typeof db === 'undefined') return;

        try {
            const event = {
                eventName,
                timestamp: new Date().toISOString(),
                metadata,
            };

            await db.collection('analytics').doc(userId).collection('events').add(event);
            console.log('[AnalyticsService] Event:', eventName);
        } catch (error) {
            console.error('[AnalyticsService] Error:', error);
        }
    },

    // ユーザーの使用機能サマリーを取得
    getUserFeatureSummary: async (userId) => {
        if (!userId || typeof db === 'undefined') return {};

        try {
            const snapshot = await db
                .collection('analytics')
                .doc(userId)
                .collection('events')
                .get();

            const summary = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const eventName = data.eventName;
                if (!summary[eventName]) {
                    summary[eventName] = { count: 0, lastUsed: null };
                }
                summary[eventName].count++;
                if (!summary[eventName].lastUsed || data.timestamp > summary[eventName].lastUsed) {
                    summary[eventName].lastUsed = data.timestamp;
                }
            });

            return summary;
        } catch (error) {
            console.error('[AnalyticsService] Get summary error:', error);
            return {};
        }
    },

    // 全ユーザーの集計データを取得（管理者用）
    getAggregatedStats: async () => {
        // Cloud Function経由で取得（後で実装）
        return {};
    },

    // 使用されていない機能リストを取得
    getUnusedFeatures: (usedFeatures) => {
        const allFeatureKeys = Object.keys(ALL_FEATURES);
        const usedKeys = Object.keys(usedFeatures);
        return allFeatureKeys.filter(key => !usedKeys.includes(key));
    },

    // 機能カテゴリ別の使用率を計算
    getCategoryUsage: (usedFeatures) => {
        const categoryStats = {};

        // 初期化
        Object.keys(FEATURE_CATEGORIES).forEach(cat => {
            categoryStats[cat] = { total: 0, used: 0, features: [] };
        });

        // 集計
        Object.entries(ALL_FEATURES).forEach(([key, feature]) => {
            const cat = feature.category;
            if (categoryStats[cat]) {
                categoryStats[cat].total++;
                if (usedFeatures[key]) {
                    categoryStats[cat].used++;
                }
                categoryStats[cat].features.push({
                    key,
                    ...feature,
                    usageCount: usedFeatures[key]?.count || 0,
                });
            }
        });

        // 使用率計算
        Object.keys(categoryStats).forEach(cat => {
            const stats = categoryStats[cat];
            stats.usageRate = stats.total > 0 ? (stats.used / stats.total) * 100 : 0;
        });

        return categoryStats;
    },

    // 全機能リスト
    ALL_FEATURES,
    FEATURE_CATEGORIES,
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.AnalyticsService = AnalyticsService;
}

export default AnalyticsProvider;
