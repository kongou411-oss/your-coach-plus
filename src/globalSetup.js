// グローバルセットアップ: 既存コードとの互換性のため、必要なオブジェクトをwindowに公開

// config.js をインポートして window に公開
import * as config from './config.js';

// すべての config 定数を window に公開
Object.keys(config).forEach(key => {
    window[key] = config[key];
});

// 注: foodDatabase.js, trainingDatabase.js, notificationSound.js, services.js は
// index.htmlで<script>タグとして読み込まれているため、ここではimportしない

// これらのファイルは既にwindowにオブジェクトを公開しているはず
// 念のため、確認用のログを出力
console.log('[Global Setup] Checking global objects...');
console.log('- Config loaded:', typeof window.DEV_MODE !== 'undefined');
console.log('- LBMUtils:', typeof window.LBMUtils);
console.log('- DataService:', typeof window.DataService);
console.log('- foodDatabase:', typeof window.foodDatabase);
console.log('- trainingDatabase:', typeof window.trainingDatabase);
