// ===== 設定ファイル =====
// アプリケーション全体の定数と設定

// アプリバージョン（セマンティックバージョニング: メジャー.マイナー.パッチ）
// - メジャー: 大きな変更・破壊的変更（年に1-2回）
// - マイナー: 新機能追加（月に1-2回）
// - パッチ: バグ修正・小さな改善（頻繁なデプロイ用）
const APP_VERSION = '4.8.1';

// リリースノート（What's New表示用）
// ⚠️ 重要: キーは「メジャー.マイナー」形式（パッチは省略）
// What's Newモーダルは「マイナー」バージョンが変わった時のみ表示されます
const RELEASE_NOTES = {
    '4.7': {  // v4.7.0 ~ v4.7.x をまとめる（β版）
        date: '2025年11月26日',
        title: '有料教科書システム & YourCoach+ガイド（β版）',
        badge: 'β版',
        features: [
            '有料教科書システム実装 - 有料クレジットで教科書を購入可能',
            'YourCoach+の教科書（公式ガイド）追加 - 4ステップで理想の使い方を解説',
            '睡眠・メンタル・ビタミンミネラル・基礎サプリ教科書を有料化（各50Cr）',
            '公式ガイド・リカバリーカテゴリ追加',
            '食事回数のデフォルトを5回に変更（朝昼トレ前後プロテイン夜）'
        ]
    },
    '4.5': {  // v4.5.0 ~ v4.5.x をまとめる（β版）
        date: '2025年11月25日',
        title: 'B2B2C企業プラン完全実装 & UI統一（β版）',
        badge: 'β版',
        features: [
            'B2B2C法人・ジム向けプラン実装 - 企業コードで複数ユーザーにPremium提供',
            '設定画面に企業コード入力機能追加 - いつでも企業コードを登録可能',
            'サブスクリプション再開機能 - 解約予定をキャンセルして継続利用可能',
            'ランディングページのデザイン統一 - 黒背景・白カード・#4A9EFFアクセント',
            'B2B2C決済ページ実装 - Stripe連携で企業向けプラン購入・管理'
        ]
    },
    '4.3': {  // v4.3.0 ~ v4.3.x をまとめる（β版）
        date: '2025年11月25日',
        title: 'Stripe決済統合完全実装（β版）',
        badge: 'β版',
        features: [
            'Stripe決済システム統合完了 - Premium会員登録が可能に',
            'クレジットパック購入機能実装（50/150/300回パック）',
            'サブスクリプション管理機能（解約・更新）',
            'Webhook連携で自動クレジット付与',
            '月額940円でAI分析100回/月 + 全機能使い放題'
        ]
    },
    '4.2': {  // v4.2.0 ~ v4.2.x をまとめる（β版）
        date: '2025年11月25日',
        title: 'プレミアム機能完全実装（β版）',
        badge: 'β版',
        features: [
            'Premium判定システム実装（7日間無料トライアル + サブスク管理）',
            'AI分析・履歴・コミュニティ・ショートカットをPremium専用化',
            'PGBASE無料化対応（現在公開分は無料、今後追加分はPremium限定）',
            '管理者パネルでPremium状態を簡単切替',
            'サブスクリプション画面の特典表示を最適化'
        ]
    },
    '4.1': {  // v4.1.0 ~ v4.1.x をまとめる（β版）
        date: '2025年11月24日',
        title: 'テンプレート×ルーティンTIPSモーダル改善（β版）',
        badge: 'β版',
        features: [
            'ヘッダーを「テンプレ×ルーティンで最速入力！」に変更',
            '利便性説明を明確化（普段の食事・運動を保存、最速1秒で記録）',
            '「設定を見る」ボタンで設定画面の機能タブが直接開くように改善',
            'Service Worker関連エラーの取り扱いを改善'
        ]
    },
    '4.0': {  // v4.0.0 ~ v4.0.x をまとめる（β版）
        date: '2025年11月24日',
        title: '設定画面のUI/UX大幅改善（β版）',
        badge: 'β版',
        features: [
            'ルーティン名を「Day 1～7」形式に統一（既存ユーザーは「デフォルトに戻す」で適用）',
            'テンプレート表示を色分け（食事=緑、運動=オレンジ、紐づけ=紫）',
            '食事テンプレートのkcal・PFC表示をダッシュボードと統一（青・赤・黄・緑）',
            '運動テンプレートの詳細表示を追加（総目・総セット・総重量・総時間）',
            'セット表示にアップ/メイン区別を追加'
        ]
    },
    '3.4': {  // v3.4.0 ~ v3.4.x をまとめる（β版）
        date: '2025年11月24日',
        title: 'カスタムPFC比率保存機能の修正（β版）',
        badge: 'β版',
        features: [
            'カスタムPFC比率がリロード後も正しく保存されるように修正',
            '初期値設定を改善（undefined時にデフォルト値30/25/45を自動設定）',
            'スライダー調整時の保存ロジックを最適化',
            '目的別モード切替時も既存のカスタム比率を保持'
        ]
    },
    '3.2': {  // v3.2.0 ~ v3.2.x をまとめる（β版）
        date: '2025年11月24日',
        title: 'Firestore完全移行（β版）',
        badge: 'β版',
        features: [
            'すべてのデータをFirestoreで管理 - デバイス間同期対応',
            '既存ユーザーのデータを自動移行 - 特別な操作不要',
            'ルーティン・指示書・カスタム運動・分析データをFirestore化',
            'localStorageはUI状態のみ使用 - データ永続化はFirestore優先'
        ]
    },
    '3.1': {  // v3.1.0 ~ v3.1.x をまとめる（β版）
        date: '2025年11月22日',
        title: '休養日機能拡張（β版）',
        badge: 'β版',
        features: [
            '休養日でもテンプレート紐づけ可能に',
            '休養日でもルーティン入力可能に（食事・運動）',
            '分析での休養日判定ロジックは維持（運動スコア計算で除外）'
        ]
    },
    '3.0': {  // v3.0.0 ~ v3.0.x をまとめる（β版）
        date: '2025年11月22日',
        title: '全カテゴリ横断検索 & 漢字読み仮名検索実装（β版）',
        badge: 'β版',
        features: [
            '全カテゴリ横断検索 - カテゴリ選択不要で全食材を一括検索',
            '漢字読み仮名検索 - 音読み・訓読み両対応（例: 「ぎ」「うし」→「牛肉」）',
            'カテゴリバッジ表示 - 検索結果にカテゴリ名を表示',
            '137文字の漢字に完全対応（foodDatabase全体をカバー）'
        ]
    },
    '2.8': {  // v2.8.0 ~ v2.8.x をまとめる（β版）
        date: '2025年11月22日',
        title: 'PGBASE履歴機能完全実装（β版）',
        badge: 'β版',
        features: [
            'チャット履歴の詳細表示・編集・削除機能を追加',
            'トレーニング頻度計算を修正（ルーティン未設定=休養日扱い）',
            'BAB連動を分析機能と完全統一（入力欄の位置調整）',
            '保存ボタンを常時表示に変更'
        ]
    },
    '2.7': {  // v2.7.0 ~ v2.7.x をまとめる（β版）
        date: '2025年11月22日',
        title: 'AI分析最適化 & パフォーマンス大幅改善（β版）',
        badge: 'β版',
        features: [
            'TDEE基準のカロリー収支計算を実装（1か月後予測の精度向上）',
            'カスタムカロリー調整値を正確に反映',
            'レポート読み込みを最大99.4%高速化（遅延読み込み実装）',
            '履歴タブのローディング表示を追加'
        ]
    },
    '2.6': {  // v2.6.0 ~ v2.6.x をまとめる（β版）
        date: '2025年11月21日',
        title: '履歴グラフUI/UX改善 & スコア計算修正（β版）',
        badge: 'β版',
        features: [
            '履歴データ取得中のローディング表示を追加',
            '初回ロード時に食事カテゴリを自動選択',
            'カテゴリごとの個別分析ボタンとプロンプトを実装（タブ切替で自動更新）',
            '食事スコア計算ロジックを修正（LBMベースの正確な目標PFC計算）'
        ]
    },
    '2.5': {  // v2.5.0 ~ v2.5.x をまとめる（β版）
        date: '2025年11月21日',
        title: '履歴グラフ機能改善（β版）',
        features: [
            '運動タブに「総セット数」項目を追加',
            'RM表示を種目選択→回数選択の順に変更（デフォルト: バーベルベンチプレス）',
            '運動スコア・総時間が正しく表示されない問題を修正',
            '新形式の運動データ構造に完全対応'
        ]
    },
    '2.4': {  // v2.4.0 ~ v2.4.x をまとめる（β版）
        date: '2025年11月20日',
        title: '通知システム完全実装（β版）',
        features: [
            'カスタム通知システム - すべての通知でタイトル・本文を自由に設定可能',
            'マルチデバイス対応 - PCブラウザとスマホ(PWA)に同時配信',
            'フォア/バックグラウンド対応 - アプリを開いていても閉じていても通知',
            '重複通知の完全防止 - 3段階の防御で確実に1通のみ表示',
            '自動トークン登録 - 通知許可後、自動でトークンを保存'
        ]
    },
    '2.3': {  // v2.3.0 ~ v2.3.x をまとめる（β版）
        date: '2025年11月20日',
        title: 'ルーティン機能改善（β版）',
        features: [
            'デフォルトルーティン自動設定（胸→背中→休→肩→腕→脚→休）',
            'ルーティンガイドモーダル追加（Day表記に?アイコン）',
            'Firestore優先のルーティンシステムに移行',
            '設定画面でデフォルトルーティンリセット機能を追加'
        ]
    },
    '2.2': {  // v2.2.0 ~ v2.2.x をまとめる（β版）
        date: '2025年11月20日',
        title: 'UI統一 & 睡眠時間項目最適化（β版）',
        features: [
            'オンボーディング・設定画面のUI統一',
            '睡眠時間項目最適化'
        ]
    },
    '2.1': {  // v2.1.0 ~ v2.1.x をまとめる（β版）
        date: '2025年11月20日',
        title: '運動記録モーダルUI改善（β版）',
        features: [
            '運動記録モーダルUI改善 & アイコン統一'
        ]
    },
    '2.0': {  // v2.0.0 ~ v2.0.x をまとめる（β版）
        date: '2025年11月19日',
        title: 'PWA完全対応（β版）',
        features: [
            'PWA完全対応 - バージョン自動更新システム',
            'バージョン・リリースノート自動更新システム実装'
        ]
    },
    '1.0': {  // v1.0.0 ~ v1.0.x をまとめる（正式版・未リリース）
        date: '準備中',
        title: '初回リリース（Coming Soon）',
        features: [
            'LBMベースの科学的な体組成管理機能',
            '食事・運動・コンディション記録',
            'AI分析（Google Gemini API）',
            'テンプレート・ルーティン機能',
            'コミュニティ機能',
            '7日間無料トライアル'
        ]
    }
};

// Admin Password はCloud Functions側でSecret Managerで管理
// クライアント側には露出させない

// Firestore Collections
const COLLECTIONS = {
    USERS: 'users',
    DAILY_RECORDS: 'dailyRecords',
    WORKOUT_TEMPLATES: 'workoutTemplates',
    MEAL_TEMPLATES: 'mealTemplates',
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
    UNLOCK_MODALS_SHOWN: 'yourCoachBeta_unlockModalsShown', // 機能開放モーダル表示履歴
    WORKOUT_TEMPLATES: 'yourCoachBeta_workoutTemplates',
    MEAL_TEMPLATES: 'yourCoachBeta_mealTemplates',
    ROUTINES: 'yourCoachBeta_routines',
    ROUTINE_START_DATE: 'yourCoachBeta_routineStartDate',
    ROUTINE_ACTIVE: 'yourCoachBeta_routineActive',
    DIRECTIVES: 'yourCoachBeta_directives',
    PGBASE_CHAT_HISTORY: 'yourCoachBeta_pgbaseChatHistory',
    AICOACH_CHAT_HISTORY: 'yourCoachBeta_aicoachChatHistory',
    COMMUNITY_POSTS: 'yourCoachBeta_communityPosts',
    // バッジ
    BADGES: 'yourCoachBeta_badges',
    // 分析係数設定
    ANALYSIS_COEFFICIENTS: 'yourCoachBeta_analysisCoefficients',
    // バージョン管理
    LAST_SEEN_VERSION: 'yourCoachBeta_lastSeenVersion' // 最後に確認したバージョン
};

// Stripe設定
const STRIPE_CONFIG = {
    publishableKey: 'pk_test_51SOXSX0l4euKovIjSvYy1nwyWkkghigB7RJZC6NTMQ0lZwNSBsbuVXgGho97zZfiTk3rRDpY37y1qzRCjOFSqOlD00h7Pm1A8g', // 公開可能キー
    // シークレットキーはCloud Functionsで管理（Firebase Secrets使用）
};

// App Store / Google Play Billing設定（アプリ内課金用）
const GOOGLE_PLAY_BILLING = {
    subscriptions: {
        premium: 'yourcoach_premium_monthly', // Premium定期購入のプロダクトID（Google Play Console設定に合わせる）
    },
    products: {
        credits_50: 'yourcoach_credits_50', // 50回パックのプロダクトID
        credits_150: 'yourcoach_credits_150', // 150回パックのプロダクトID
        credits_300: 'yourcoach_credits_300', // 300回パックのプロダクトID
    }
};

// サブスクリプションプラン定義
const SUBSCRIPTION_PLAN = {
    name: 'Premium',
    price: 940,
    currency: 'JPY',
    interval: 'month',
    stripeProductId: 'prod_TkTuZ88NGF7Lor', // Your Coach+ Premium
    stripePriceId: 'price_1Smywg0IbeDUi2GQFM9cPPUj', // ¥940/月
    features: [
        '全機能利用可能',
        'AI分析 100回/月',
        '無制限の記録と履歴',
        'コミュニティアクセス',
        'データエクスポート',
        'PG BASE教科書（追加分）',
        '優先サポート'
    ],
    aiCredits: {
        monthly: 100, // 月額付与分
        purchaseOptions: [
            {
                credits: 50,
                price: 400,
                name: '50回パック',
                stripePriceId: 'price_1SmyyM0IbeDUi2GQC8eJUR5w' // ¥400
            },
            {
                credits: 150,
                price: 1000,
                name: '150回パック',
                stripePriceId: 'price_1Smyyq0IbeDUi2GQ3fRM5RcM' // ¥1000
            },
            {
                credits: 300,
                price: 1800,
                name: '300回パック',
                stripePriceId: 'price_1SmyzJ0IbeDUi2GQZ0Zz3EbD' // ¥1800
            }
        ]
    },
    // B2B2C企業向けプラン（ジム・トレーナー提携用）
    // 企業が一括支払い → 顧客（会員）が無料でPremium機能を利用
    // ベース料金: ¥940/月/人
    b2b2cPlans: {
        enabled: true, // B2B2C機能有効化（2025年11月25日）
        basePricePerUser: 940, // ベース料金（個人向け通常価格）

        // 公開プラン（Webサイト・営業資料に掲載）
        publicPlans: [
            {
                id: 'beginner',
                name: 'ビギナープラン',
                price: 107160, // ¥940 × 0.95 × 10 × 12
                discountRate: 0.05, // 5% OFF
                interval: 'year',
                licenses: 10, // 10人まで
                stripePriceId: 'price_1SXKzH0l4euKovIjn199zOey',
                description: '小規模ジム・パーソナルトレーナー向け（10人まで）',
                pricePerUser: 893, // ¥940 × 0.95 = ¥893/月/人
                features: [
                    '最大10人の顧客にPremium機能を提供',
                    '通常価格より5%割引（¥893/月/人）',
                    '顧客は完全無料で利用可能',
                    '企業専用アクセスコード発行',
                    'アップグレード可能'
                ]
            },
            {
                id: 'pro',
                name: 'プロプラン',
                price: 304560, // ¥940 × 0.90 × 30 × 12
                discountRate: 0.10, // 10% OFF
                interval: 'year',
                licenses: 30, // 30人まで
                stripePriceId: 'price_1SXL080l4euKovIjfd3Ta2ji',
                description: '中規模ジム向け（30人まで）',
                pricePerUser: 846, // ¥940 × 0.90 = ¥846/月/人
                features: [
                    '最大30人の顧客にPremium機能を提供',
                    '通常価格より10%割引（¥846/月/人）',
                    '顧客は完全無料で利用可能',
                    '企業専用アクセスコード発行',
                    'アップグレード・ダウングレード可能'
                ]
            },
            {
                id: 'max',
                name: 'MAXプラン（無制限）',
                price: 600000, // ¥940 × 0.85 × 約63人 × 12 ≈ ¥600,000
                discountRate: 0.15, // 15% OFF
                interval: 'year',
                licenses: -1, // 無制限（-1 = unlimited）
                stripePriceId: 'price_1SXL1h0l4euKovIjo6HYZLsU',
                description: '大規模ジム・フランチャイズ向け（無制限）',
                pricePerUser: 799, // ¥940 × 0.85 = ¥799/月/人
                features: [
                    '無制限の顧客にPremium機能を提供',
                    '通常価格より15%割引（¥799/月/人）',
                    '顧客は完全無料で利用可能',
                    '企業専用アクセスコード発行',
                    'ダウングレード可能'
                ]
            }
        ],

        // カスタムプラン（非公開・営業用の手札）
        // 大口契約、特別提携先、キャンペーンなどで使用
        customPlans: [
            {
                id: 'custom_beginner',
                name: 'カスタムビギナー',
                price: 78960, // ¥940 × 0.70 × 10 × 12
                discountRate: 0.30, // 30% OFF
                interval: 'year',
                licenses: 10,
                stripePriceId: 'price_1SXL4x0l4euKovIjpXt16kpD',
                description: '特別割引プラン（10人まで）',
                pricePerUser: 658, // ¥940 × 0.70 = ¥658/月/人
                hidden: true, // UI非表示
                requiresApproval: true // 管理者承認必須
            },
            {
                id: 'custom_pro',
                name: 'カスタムプロ',
                price: 236880, // ¥940 × 0.70 × 30 × 12
                discountRate: 0.30, // 30% OFF
                interval: 'year',
                licenses: 30,
                stripePriceId: 'price_1SXL5x0l4euKovIjCNo9bqRp',
                description: '特別割引プラン（30人まで）',
                pricePerUser: 658, // ¥940 × 0.70 = ¥658/月/人
                hidden: true,
                requiresApproval: true
            },
            {
                id: 'custom_max',
                name: 'カスタムMAX',
                price: 500000, // ¥940 × 0.70 × 約63人 × 12 ≈ ¥500,000
                discountRate: 0.30, // 30% OFF
                interval: 'year',
                licenses: -1, // 無制限
                stripePriceId: 'price_1SXL7U0l4euKovIjC97PopcE',
                description: '特別割引プラン（無制限）',
                pricePerUser: 658, // ¥940 × 0.70 = ¥658/月/人
                hidden: true,
                requiresApproval: true
            }
        ],

        // アップグレード/ダウングレード設定
        upgrades: {
            enabled: true,
            // アップグレードは即時変更（差額を日割り請求）
            immediateUpgrade: true,
            // ダウングレードは次回更新時に適用（返金なし）
            downgradeAtRenewal: true
        }
    },
    // オーガニック紹介プログラム
    // ⚠️ 既に実装済み：generateReferralCode, applyReferralCode
    referralProgram: {
        enabled: true,
        benefits: {
            referrer: {
                credits: 50, // 紹介者に50回分のクレジット付与
                description: '友達が登録完了したら50回分の分析クレジットをプレゼント'
            },
            referred: {
                trialDays: 30, // 被紹介者は1ヶ月無料
                credits: 50, // 被紹介者も50回分のクレジット付与
                description: '1ヶ月無料 + 50回分の分析クレジット'
            }
        },
        fraudPrevention: {
            // 不正防止: メールアドレス + 電話番号 + 氏名の3点チェック
            enabled: true,
            requiredFields: ['email', 'name', 'phoneNumber']
        }
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

// 無料プランの制限（8日目以降）
const FREE_PLAN_LIMITS = {
    // 無料で利用可能な機能
    foodRecord: true, // 食事記録
    workoutRecord: true, // 運動記録
    conditionRecord: true, // コンディション記録
    pgBase: true, // PG BASE（現在公開分は無料、今後追加分はPremium限定）
    routine: true, // ルーティン
    mealTemplates: 1, // 食事テンプレート1枠
    workoutTemplates: 1, // 運動テンプレート1枠

    // Premium専用機能
    aiPhotoRecognition: false, // AI食事認識（写真解析）
    analysis: false, // AI分析
    directive: false, // 指示書
    history: false, // 履歴
    historyAnalysis: false, // 履歴分析
    shortcut: false, // ショートカット
    community: false, // コミュニティ
    detailedNutrients: false // 詳細栄養素
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
        color: 'text-green-600',
        description: '食事内容を記録してPFCバランスを管理',
        completionCondition: 'meal_once', // 1回記録で完了
        nextFeature: 'training'
    },
    TRAINING: {
        id: 'training',
        name: '運動記録',
        trigger: 'after_food',
        icon: 'Dumbbell',
        color: 'text-orange-600',
        description: 'トレーニング内容を記録して進捗を可視化',
        completionCondition: 'training_once', // 1回記録で完了
        nextFeature: 'condition'
    },
    CONDITION: {
        id: 'condition',
        name: 'コンディション記録',
        trigger: 'after_training',
        icon: 'Activity',
        color: 'text-red-600',
        description: '体調・睡眠・疲労度を記録して体の声を聞く',
        completionCondition: 'condition_all_six', // 6項目全て入力で完了
        nextFeature: 'analysis'
    },
    ANALYSIS: {
        id: 'analysis',
        name: '分析',
        trigger: 'after_condition',
        icon: 'BarChart3',
        color: 'text-indigo-600',
        description: '記録データを分析して改善点を発見',
        completionCondition: 'analysis_once', // 1回使用で完了
        requiredPremium: true // 8日目以降はPremium専用
    },
    IDEA: {
        id: 'idea',
        name: '閃き',
        trigger: 'after_analysis',
        icon: 'Lightbulb',
        color: 'text-yellow-500',
        description: '今日の気づきやメモを記録',
        completionCondition: 'idea_once', // 1回使用で完了
        requiredPremium: true // 8日目以降はPremium専用
    },
    HISTORY: {
        id: 'history',
        name: '履歴',
        trigger: 'after_analysis',
        icon: 'TrendingUp',
        color: 'text-indigo-600',
        description: '過去の記録を振り返る',
        completionCondition: 'history_once', // 1回使用で完了
        requiredPremium: true // 8日目以降はPremium専用
    },
    PG_BASE: {
        id: 'pg_base',
        name: 'PGBASE',
        trigger: 'after_analysis',
        icon: 'BookOpen',
        color: 'text-cyan-600',
        description: 'ボディメイクの理論と知識を学ぶ',
        completionCondition: 'pg_base_once', // 1回確認で完了
        requiredPremium: true // 8日目以降はPremium専用
    },

    // 初日から全員に開放
    TEMPLATE: {
        id: 'template',
        name: 'テンプレート',
        trigger: 'initial',
        icon: 'BookTemplate',
        description: 'よく使う食事・トレーニングをテンプレート化して効率化',
        completionCondition: 'template_once' // 1回使用で完了
    },
    ROUTINE: {
        id: 'routine',
        name: 'ルーティン',
        trigger: 'initial',
        icon: 'Calendar',
        description: '分割法を設定して計画的にトレーニング',
        completionCondition: 'routine_once' // 1回使用で完了
    },
    SHORTCUT: {
        id: 'shortcut',
        name: 'ショートカット',
        trigger: 'initial',
        icon: 'Zap',
        description: 'よく使う機能に素早くアクセス',
        completionCondition: 'shortcut_once' // 1回使用で完了
    },

    // Premium専用機能
    AI_PHOTO_RECOGNITION: {
        id: 'ai_photo_recognition',
        name: 'AI食事認識',
        trigger: 'premium',
        icon: 'Camera',
        description: '写真から食事を自動認識して記録',
        requiredPremium: true // 8日目以降はPremium専用
    },
    COMMUNITY: {
        id: 'community',
        name: 'COMY',
        trigger: 'premium',
        icon: 'Users',
        color: 'text-fuchsia-600',
        description: 'コミュニティで成果を共有し、仲間と刺激し合う',
        requiredPremium: true
    },
    DETAILED_NUTRIENTS: {
        id: 'detailed_nutrients',
        name: '詳細栄養素',
        trigger: 'premium',
        icon: 'Droplets',
        description: 'ビタミン・ミネラル・脂肪酸などの詳細な摂取状況を確認',
        requiredPremium: true
    }
};

// デフォルトルーティン定義（トレーニングルーティンの初期値）
const DEFAULT_ROUTINES = [
    { id: 1, name: 'Day 1', splitType: '胸', isRestDay: false },
    { id: 2, name: 'Day 2', splitType: '背中', isRestDay: false },
    { id: 3, name: 'Day 3', splitType: '休み', isRestDay: true },
    { id: 4, name: 'Day 4', splitType: '肩', isRestDay: false },
    { id: 5, name: 'Day 5', splitType: '腕', isRestDay: false },
    { id: 6, name: 'Day 6', splitType: '脚', isRestDay: false },
    { id: 7, name: 'Day 7', splitType: '休み', isRestDay: true }
];

// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCvKYPLoqmg-vE_8lIdROAcXPres3ByaYU",
    authDomain: "your-coach-plus.firebaseapp.com",
    projectId: "your-coach-plus",
    storageBucket: "your-coach-plus.firebasestorage.app",
    messagingSenderId: "654534642431",
    appId: "1:654534642431:web:4eb24b2cc84dbdd39e6bb2",
    measurementId: "G-1NLXFYDCJF"
};

// Export all constants
export {
    APP_VERSION,
    RELEASE_NOTES,
    COLLECTIONS,
    STORAGE_KEYS,
    STRIPE_CONFIG,
    GOOGLE_PLAY_BILLING,
    SUBSCRIPTION_PLAN,
    FIRST_TIME_FLOW,
    FREE_PLAN_LIMITS,
    BADGES,
    FEATURES,
    DEFAULT_ROUTINES,
    FIREBASE_CONFIG
};
