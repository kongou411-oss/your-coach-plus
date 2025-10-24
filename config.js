// ===== 設定ファイル =====
// アプリケーション全体の定数と設定

// 開発モード設定
const DEV_MODE = true;
const DEV_USER_ID = 'dev-user-001';
const DEV_PREMIUM_MODE = true; // 開発中はPremium機能を有効化

// Gemini API Key (本番環境では環境変数から読み込むこと)
const GEMINI_API_KEY = 'AIzaSyAntR-6FU5HEB2aiUcjYHZczKIc4LUhqGI';

// Admin Password (本番環境では環境変数またはFirebase Custom Claimsを使用)
const ADMIN_PASSWORD = 'admin2024';

// Firestore Collections
const COLLECTIONS = {
    USERS: 'users',
    DAILY_RECORDS: 'dailyRecords',
    WORKOUT_TEMPLATES: 'workoutTemplates',
    MEAL_TEMPLATES: 'mealTemplates',
    SUPPLEMENT_TEMPLATES: 'supplementTemplates',
    ROUTINES: 'routines',
    COMMUNITY_POSTS: 'communityPosts'
};

// LocalStorage Keys
const STORAGE_KEYS = {
    USER_PROFILE: 'yourCoachBeta_userProfile',
    DAILY_RECORDS: 'yourCoachBeta_dailyRecords',
    DAILY_ANALYSES: 'yourCoachBeta_dailyAnalyses',
    USAGE_DAYS: 'yourCoachBeta_usageDays',
    UNLOCKED_FEATURES: 'yourCoachBeta_unlockedFeatures',
    FEATURES_COMPLETED: 'yourCoachBeta_featuresCompleted', // 機能完了状態
    REGISTRATION_DATE: 'yourCoachBeta_registrationDate', // 登録日
    WORKOUT_TEMPLATES: 'yourCoachBeta_workoutTemplates',
    MEAL_TEMPLATES: 'yourCoachBeta_mealTemplates',
    SUPPLEMENT_TEMPLATES: 'yourCoachBeta_supplementTemplates',
    ROUTINES: 'yourCoachBeta_routines',
    ROUTINE_START_DATE: 'yourCoachBeta_routineStartDate',
    ROUTINE_ACTIVE: 'yourCoachBeta_routineActive',
    DIRECTIVES: 'yourCoachBeta_directives',
    PGBASE_CHAT_HISTORY: 'yourCoachBeta_pgbaseChatHistory',
    AICOACH_CHAT_HISTORY: 'yourCoachBeta_aicoachChatHistory',
    COMMUNITY_POSTS: 'yourCoachBeta_communityPosts',
    // 動的オンボーディング用トリガー状態
    ONBOARDING_TRIGGERS: 'yourCoachBeta_onboardingTriggers',
    // バッジ
    BADGES: 'yourCoachBeta_badges',
    // 分析係数設定
    ANALYSIS_COEFFICIENTS: 'yourCoachBeta_analysisCoefficients'
};

// サブスクリプションプラン定義
const SUBSCRIPTION_PLAN = {
    name: 'Premium',
    price: 980,
    currency: 'JPY',
    interval: 'month',
    stripeProductId: '', // Stripe Dashboard で作成後に設定
    stripePriceId: '', // Stripe Dashboard で作成後に設定
    features: [
        '全機能利用可能',
        'AI分析 100回/月',
        '無制限の記録と履歴',
        'コミュニティアクセス',
        'データエクスポート',
        'PG BASE教科書',
        '優先サポート'
    ],
    aiCredits: {
        monthly: 100, // 月額付与分
        purchaseOptions: [
            {
                credits: 50,
                price: 400,
                name: '50回パック',
                stripePriceId: '' // Stripe Dashboard で作成後に設定
            },
            {
                credits: 150,
                price: 1000,
                name: '150回パック',
                stripePriceId: ''
            },
            {
                credits: 300,
                price: 1800,
                name: '300回パック',
                stripePriceId: ''
            }
        ]
    }
};

// 初回フロー（段階的機能案内）
const FIRST_TIME_FLOW = [
    { id: 'meal', name: '食事記録', icon: 'Utensils', description: 'まずは今日食べたものを記録してみましょう', requiredPremium: false },
    { id: 'training', name: '運動記録', icon: 'Dumbbell', description: '今日のトレーニングを記録しましょう', requiredPremium: false },
    { id: 'condition', name: 'コンディション記録', icon: 'Activity', description: '体重・体脂肪率・睡眠などを記録しましょう', requiredPremium: false },
    { id: 'analysis', name: '分析', icon: 'BarChart3', description: 'AIがあなたの記録を分析します', requiredPremium: true },
    { id: 'directive', name: '指示書', icon: 'FileText', description: 'AIが最適な次のアクションを提案します', requiredPremium: true },
    { id: 'pg_base', name: 'PG BASE', icon: 'BookOpen', description: 'ボディメイクの理論と知識を学びましょう', requiredPremium: true }
];

// 無料プランの制限
const FREE_PLAN_LIMITS = {
    historyDays: 7, // 7日間の履歴のみ
    aiAnalysis: false, // AI分析不可
    historyAnalysis: false, // 履歴の分析不可
    community: false, // コミュニティ不可
    pgBase: false, // 教科書不可
    micronutrients: false, // ビタミン・ミネラル表示不可
    directive: false, // 指示書不可
    mealTemplates: 1, // 食事テンプレート1個まで
    workoutTemplates: 1, // 運動テンプレート1個まで
    routines: false // ルーティン不可
};

// バッジ定義
const BADGES = {
    FIRST_RECORD: {
        id: 'first_record',
        name: '記録開始',
        description: '初めての記録を追加しました',
        icon: 'Edit',
        stage: '守',
        rarity: 'common'
    },
    WEEK_STREAK: {
        id: 'week_streak',
        name: '7日継続',
        description: '7日間連続で記録しました',
        icon: 'Flame',
        stage: '破',
        rarity: 'rare'
    },
    MONTH_STREAK: {
        id: 'month_streak',
        name: '30日継続',
        description: '30日間連続で記録しました',
        icon: 'Trophy',
        stage: '離',
        rarity: 'epic'
    },
    PERFECT_PFC: {
        id: 'perfect_pfc',
        name: 'パーフェクトバランス',
        description: 'PFCすべてを目標±5%以内で達成',
        icon: 'Target',
        stage: '破',
        rarity: 'rare'
    },
    ANALYSIS_MASTER: {
        id: 'analysis_master',
        name: '分析マスター',
        description: '10回以上AI分析を実行しました',
        icon: 'Brain',
        stage: '破',
        rarity: 'rare'
    }
};

// 機能開放システム（段階的オンボーディング + 日数ベースの開放）
const FEATURES = {
    // 0日目（初日）：段階的開放（前の機能を完了すると次が開放される）
    FOOD: {
        id: 'food',
        name: '食事記録',
        trigger: 'initial',
        icon: 'Utensils',
        description: '食事内容を記録してPFCバランスを管理',
        completionCondition: 'meal_once', // 1回記録で完了
        nextFeature: 'training'
    },
    TRAINING: {
        id: 'training',
        name: '運動記録',
        trigger: 'after_food',
        icon: 'Dumbbell',
        description: 'トレーニング内容を記録して進捗を可視化',
        completionCondition: 'training_once', // 1回記録で完了
        nextFeature: 'condition'
    },
    CONDITION: {
        id: 'condition',
        name: 'コンディション記録',
        trigger: 'after_training',
        icon: 'Activity',
        description: '体調・睡眠・疲労度を記録して体の声を聞く',
        completionCondition: 'condition_all_six', // 6項目全て入力で完了
        nextFeature: 'analysis'
    },
    ANALYSIS: {
        id: 'analysis',
        name: '分析',
        trigger: 'after_condition',
        icon: 'BarChart3',
        description: '記録データを分析して改善点を発見',
        completionCondition: 'analysis_once', // 1回使用で完了
        nextFeature: 'directive'
    },
    DIRECTIVE: {
        id: 'directive',
        name: '指示書',
        trigger: 'after_analysis',
        icon: 'FileText',
        description: 'AIが分析結果に基づいて最適な次のアクションを提案',
        completionCondition: 'directive_once', // 1回確認で完了
        nextFeature: 'pg_base'
    },
    PG_BASE: {
        id: 'pg_base',
        name: 'PG BASE',
        trigger: 'after_directive',
        icon: 'BookOpen',
        description: 'ボディメイクの理論と知識を学ぶ',
        completionCondition: 'pg_base_once' // 1回確認で完了
    },

    // 3日目：ログイン時に開放（段階的）
    TEMPLATE: {
        id: 'template',
        name: 'テンプレート',
        trigger: 'days',
        requiredDays: 3,
        icon: 'BookTemplate',
        description: 'よく使う食事・トレーニングをテンプレート化して効率化',
        completionCondition: 'template_once', // 1回使用で完了
        nextFeature: 'routine'
    },
    ROUTINE: {
        id: 'routine',
        name: 'ルーティン',
        trigger: 'after_template',
        requiredDays: 3,
        icon: 'Calendar',
        description: '分割法を設定して計画的にトレーニング',
        completionCondition: 'routine_once', // 1回使用で完了
        nextFeature: 'shortcut'
    },
    SHORTCUT: {
        id: 'shortcut',
        name: 'ショートカット',
        trigger: 'after_routine',
        requiredDays: 3,
        icon: 'Zap',
        description: 'よく使う機能に素早くアクセス',
        completionCondition: 'shortcut_once' // 1回使用で完了
    },

    // 7日目：ログイン時に開放（段階的）
    HISTORY: {
        id: 'history',
        name: '履歴',
        trigger: 'days',
        requiredDays: 7,
        icon: 'History',
        description: '過去の記録を振り返る',
        completionCondition: 'history_once', // 1回使用で完了
        nextFeature: 'history_analysis'
    },
    HISTORY_ANALYSIS: {
        id: 'history_analysis',
        name: '履歴分析',
        trigger: 'after_history',
        requiredDays: 7,
        icon: 'TrendingUp',
        description: '長期的なトレンドを分析',
        completionCondition: 'history_analysis_once' // 1回使用で完了
    },

    // その他の機能（Premium機能など）
    COMMUNITY: {
        id: 'community',
        name: 'コミュニティ',
        trigger: 'premium',
        icon: 'Users',
        description: 'コミュニティで成果を共有し、仲間と刺激し合う',
        requiredPremium: true
    },
    MICRONUTRIENTS: {
        id: 'micronutrients',
        name: 'ビタミン・ミネラル詳細',
        trigger: 'premium',
        icon: 'Droplets',
        description: 'ビタミン・ミネラルの詳細な摂取状況を確認',
        requiredPremium: true
    },

    // 旧互換性のため残す（削除予定）
    TRAINING_TEMPLATE: {
        id: 'training_template',
        name: 'テンプレート（旧）',
        trigger: 'days',
        requiredDays: 3,
        icon: 'BookTemplate',
        description: 'テンプレート機能（旧定義）'
    },
    COMMUNITY_VIEW: {
        id: 'community_view',
        name: 'COMY（閲覧）',
        trigger: 'premium',
        icon: 'Users',
        description: 'コミュニティ閲覧（旧定義）',
        requiredPremium: true
    },
    COMMUNITY_POST: {
        id: 'community_post',
        name: 'COMY（投稿）',
        trigger: 'premium',
        icon: 'MessageSquare',
        description: 'コミュニティ投稿（旧定義）',
        requiredPremium: true
    },
    HISTORY_GRAPH: {
        id: 'history_graph',
        name: '履歴グラフ（旧）',
        trigger: 'days',
        requiredDays: 7,
        icon: 'TrendingUp',
        description: '履歴グラフ（旧定義）'
    }
};
