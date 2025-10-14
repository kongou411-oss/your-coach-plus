// ===== 設定ファイル =====
// アプリケーション全体の定数と設定

// 開発モード設定
const DEV_MODE = true;
const DEV_USER_ID = 'dev-user-001';

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
    // チュートリアル・バッジ
    TUTORIAL_COMPLETED: 'yourCoachBeta_tutorialCompleted',
    BADGES: 'yourCoachBeta_badges'
};

// チュートリアルステップ定義
const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Your Coach+へようこそ',
        content: '科学的根拠に基づいたボディメイクをサポートするアプリです。\n\nPG-K式カロリー計算、AI分析、守破離システムで、あなたの目標達成を徹底サポートします。',
        icon: 'Sparkles',
        stage: '守',
        action: null
    },
    {
        id: 'profile',
        title: 'プロフィール設定',
        content: '最初に体重・体脂肪率・目標を設定します。\n\nこれらの情報からLBM（除脂肪体重）を自動計算し、あなた専用の最適なPFCバランスを算出します。\n\n設定は画面下部の「設定」ボタンからいつでも変更できます。',
        icon: 'User',
        stage: '守',
        action: null
    },
    {
        id: 'bottom_bar',
        title: 'ボトムアプリバーの使い方',
        content: '画面下部に3つのメインボタンがあります。\n\n【デイリー】食事・サプリ・運動・体調・分析\n\n【PGBASE】履歴・教科書・COMY（段階的に開放）\n\n【設定】プロフィール・バッジ・この使い方',
        icon: 'Menu',
        stage: '守',
        action: null
    },
    {
        id: 'daily_record',
        title: '日々の記録',
        content: '画面下部の「デイリー」ボタンをタップすると、記録メニューが展開します。\n\n食事・サプリ・運動・体調・分析の5つの機能にすぐアクセスできます。\n\n色分けされているので、直感的に操作できます。',
        icon: 'Home',
        stage: '守',
        action: null
    },
    {
        id: 'meal_record',
        title: '食事記録',
        content: 'デイリーメニューから「食事」を選択。\n\n食材を検索してg単位で入力すると、PFC（タンパク質・脂質・炭水化物）が自動計算されます。\n\nよく使う食事はテンプレート保存もできます（5日目に開放）。',
        icon: 'Utensils',
        stage: '守',
        action: null
    },
    {
        id: 'training_record',
        title: '運動記録',
        content: 'デイリーメニューから「運動」を選択。\n\nPG-K式で正確な消費カロリーを計算します。\n\n重量・回数・可動距離・TUT（筋緊張時間）を入力すると、科学的に正確なカロリー消費が分かります。',
        icon: 'Dumbbell',
        stage: '守',
        action: null
    },
    {
        id: 'analysis',
        title: 'AI分析で改善点を発見',
        content: 'デイリーメニューから「分析」を選択。\n\n1日の記録をAIが分析し、具体的な改善提案を行います。\n\n「鶏むね肉150g追加」のような実践的なアドバイスが届きます。',
        icon: 'PieChart',
        stage: '守',
        action: null
    },
    {
        id: 'date_navigation',
        title: '日付の移動',
        content: '画面上部の日付バーで過去の記録を確認できます。\n\n左右の矢印ボタンで日付を移動し、過去の食事や運動を振り返りましょう。\n\n継続的な記録が成功の鍵です。',
        icon: 'Calendar',
        stage: '守',
        action: null
    },
    {
        id: 'pgbase',
        title: 'PGBASE - 教科書と履歴',
        content: '画面下部の「PGBASE」ボタンから、3つの機能にアクセスできます。\n\n【履歴】過去の記録をグラフで確認（2日目開放）\n【教科書】栄養学・運動理論を学習（10日目開放）\n【COMY】コミュニティで仲間と交流（30日目開放）',
        icon: 'BookOpen',
        stage: '守',
        action: null
    },
    {
        id: 'shuhari',
        title: '守破離システム',
        content: '継続日数に応じて機能が段階的に開放されます。\n\n【守】0-6日 - 基礎を学ぶ\n【破】7-20日 - 応用・カスタマイズ\n【離】21日〜 - 独自の方法を確立\n\n焦らず一歩ずつ、確実にスキルを身につけましょう。',
        icon: 'Award',
        stage: '守',
        action: null
    },
    {
        id: 'complete',
        title: 'さあ、始めましょう！',
        content: 'チュートリアル完了です。\n\n今日から記録を始めて、理想の体を手に入れましょう。\n\nこの使い方はいつでも「設定」→「使い方」から確認できます。\n\n初回チュートリアル完了バッジを獲得しました！',
        icon: 'CheckCircle',
        stage: '守',
        action: 'awardBadge'
    }
];

// バッジ定義
const BADGES = {
    TUTORIAL_COMPLETE: {
        id: 'tutorial_complete',
        name: '初めの一歩',
        description: 'チュートリアルを完了しました',
        icon: 'GraduationCap',
        stage: '守',
        rarity: 'common'
    },
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

// 守破離 Features（動的オンボーディング + 継続日数に応じた段階的機能開放）
const FEATURES = {
    // 守: 基礎を学ぶ段階（初日の動的オンボーディング + 2-6日目）
    FOOD: {
        id: 'food',
        name: '食事記録',
        requiredDays: 0,
        stage: '守',
        icon: 'Utensils',
        trigger: 'initial', // アプリ初回起動時
        description: '最初にマスターする基本機能'
    },
    SUPPLEMENT: {
        id: 'supplement',
        name: 'サプリメント記録',
        requiredDays: 0,
        stage: '守',
        icon: 'Pill',
        trigger: 'after_meal', // 最初の食事を記録後
        description: 'サプリメント摂取を記録して栄養を最適化'
    },
    TRAINING: {
        id: 'training',
        name: 'トレーニング記録',
        requiredDays: 0,
        stage: '守',
        icon: 'Dumbbell',
        trigger: 'after_supplement', // 最初のサプリを記録後
        description: 'トレーニング内容を記録して進捗を可視化'
    },
    CONDITION: {
        id: 'condition',
        name: 'コンディション記録',
        requiredDays: 0,
        stage: '守',
        icon: 'Activity',
        trigger: 'after_training', // 最初のトレーニングを記録後
        description: '体調・睡眠・疲労度を記録して体の声を聞く'
    },
    ANALYSIS: {
        id: 'analysis',
        name: '分析',
        requiredDays: 0,
        stage: '守',
        icon: 'BarChart3',
        trigger: 'after_condition', // 最初のコンディションを記録後
        description: '記録データを分析して改善点を発見'
    },
    DIRECTIVE: {
        id: 'directive',
        name: '指示書（AI生成）',
        requiredDays: 0,
        stage: '守',
        icon: 'FileText',
        trigger: 'after_analysis', // 最初の分析を閲覧後
        description: 'AI が分析結果に基づいて最適な次のアクションを提案'
    },
    HISTORY_GRAPH: {
        id: 'history_graph',
        name: '履歴・グラフ',
        requiredDays: 2,
        stage: '守',
        icon: 'LineChart',
        trigger: 'days', // 2日目で自動開放
        description: '過去の記録をグラフで振り返り、変化を実感'
    },
    TRAINING_TEMPLATE: {
        id: 'training_template',
        name: 'テンプレート',
        requiredDays: 5,
        stage: '守',
        icon: 'BookTemplate',
        trigger: 'days', // 5日目で自動開放
        description: 'よく使う食事・トレーニングをテンプレート化して効率化'
    },

    // 破: 応用・カスタマイズ段階（7-20日）
    ROUTINE: {
        id: 'routine',
        name: 'ルーティン',
        requiredDays: 7,
        stage: '破',
        icon: 'Calendar',
        trigger: 'days', // 7日目で自動開放
        description: '分割法を設定して計画的にトレーニング'
    },
    PG_BASE: {
        id: 'pg_base',
        name: 'PG BASE',
        requiredDays: 10,
        stage: '破',
        icon: 'BookOpen',
        trigger: 'days', // 10日目で自動開放
        description: 'ボディメイクの理論と知識を学ぶ'
    },
    MICRONUTRIENTS: {
        id: 'micronutrients',
        name: 'ビタミン・ミネラル+',
        requiredDays: 14,
        stage: '破',
        icon: 'Microscope',
        trigger: 'days', // 14日目で自動開放
        description: '微量栄養素まで詳細に管理'
    },

    // 離: 独自の境地段階（21-30日）
    ADVANCED_PGK: {
        id: 'advanced_pgk',
        name: 'PG-K詳細設定',
        requiredDays: 21,
        stage: '離',
        icon: 'Settings',
        trigger: 'days', // 21日目で自動開放
        description: 'PFCバランスを独自にカスタマイズ'
    },
    COMMUNITY: {
        id: 'community',
        name: 'COMY',
        requiredDays: 30,
        stage: '離',
        icon: 'Users',
        trigger: 'days', // 30日目で自動開放
        description: 'コミュニティで成果を共有し、仲間と刺激し合う'
    }
};
