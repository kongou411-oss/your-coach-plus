// グローバルセットアップ: 既存コードとの互換性のため、必要なオブジェクトをwindowに公開

// 注: config.js, foodDatabase.js, trainingDatabase.js, notificationSound.js, services.js は
// index.htmlで<script>タグとして読み込まれているため、ここではimportしない

// これらのファイルは既にwindowにオブジェクトを公開しているはず
// 念のため、確認用のログを出力
console.log('[Global Setup] Checking global objects...');
console.log('- LBMUtils:', typeof window.LBMUtils);
console.log('- DataService:', typeof window.DataService);
console.log('- foodDatabase:', typeof window.foodDatabase);
console.log('- trainingDatabase:', typeof window.trainingDatabase);
