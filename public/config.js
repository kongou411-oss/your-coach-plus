// ===== public/config.js =====
// グローバル変数として公開（レガシーHTML用）
// ※ src/config.js の内容をESモジュールではなく通常スクリプトとして公開

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

// アプリバージョン
const APP_VERSION = '4.7.0';

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
    FEATURES_COMPLETED: 'yourCoachBeta_featuresCompleted',
    REGISTRATION_DATE: 'yourCoachBeta_registrationDate',
    UNLOCK_MODALS_SHOWN: 'yourCoachBeta_unlockModalsShown',
    WORKOUT_TEMPLATES: 'yourCoachBeta_workoutTemplates',
    MEAL_TEMPLATES: 'yourCoachBeta_mealTemplates',
    ROUTINES: 'yourCoachBeta_routines',
    ROUTINE_START_DATE: 'yourCoachBeta_routineStartDate',
    ROUTINE_ACTIVE: 'yourCoachBeta_routineActive',
    DIRECTIVES: 'yourCoachBeta_directives',
    PGBASE_CHAT_HISTORY: 'yourCoachBeta_pgbaseChatHistory',
    AICOACH_CHAT_HISTORY: 'yourCoachBeta_aicoachChatHistory',
    COMMUNITY_POSTS: 'yourCoachBeta_communityPosts',
    BADGES: 'yourCoachBeta_badges',
    ANALYSIS_COEFFICIENTS: 'yourCoachBeta_analysisCoefficients',
    LAST_SEEN_VERSION: 'yourCoachBeta_lastSeenVersion'
};

// デフォルトルーティン定義
const DEFAULT_ROUTINES = [
    { id: 1, name: 'Day 1', splitType: '胸', isRestDay: false },
    { id: 2, name: 'Day 2', splitType: '背中', isRestDay: false },
    { id: 3, name: 'Day 3', splitType: '休み', isRestDay: true },
    { id: 4, name: 'Day 4', splitType: '肩', isRestDay: false },
    { id: 5, name: 'Day 5', splitType: '腕', isRestDay: false },
    { id: 6, name: 'Day 6', splitType: '脚', isRestDay: false },
    { id: 7, name: 'Day 7', splitType: '休み', isRestDay: true }
];

// グローバルに公開
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.APP_VERSION = APP_VERSION;
window.COLLECTIONS = COLLECTIONS;
window.STORAGE_KEYS = STORAGE_KEYS;
window.DEFAULT_ROUTINES = DEFAULT_ROUTINES;

console.log('[config.js] Global config loaded:', { APP_VERSION, FIREBASE_CONFIG: '✓' });
