// グローバルセットアップ: 既存コードとの互換性のため、必要なオブジェクトをwindowに公開

// config.jsの内容を読み込んでグローバルに公開
import './config.js';

// utils.jsの内容を読み込んでグローバルに公開
import './utils.js';

// services.jsの内容を読み込んでグローバルに公開
import './services.js';

// データベースを読み込んでグローバルに公開
import './foodDatabase.js';
import './trainingDatabase.js';
import './notificationSound.js';

// これらのファイルは既にwindowにオブジェクトを公開しているはず
// 念のため、確認用のログを出力
console.log('[Global Setup] Checking global objects...');
console.log('- LBMUtils:', typeof window.LBMUtils);
console.log('- DataService:', typeof window.DataService);
console.log('- foodDatabase:', typeof window.foodDatabase);
console.log('- trainingDatabase:', typeof window.trainingDatabase);
