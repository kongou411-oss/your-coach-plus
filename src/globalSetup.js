// グローバルセットアップ: 既存コードとの互換性のため、必要なオブジェクトをwindowに公開

// config.jsは main.jsx で既に window に公開済み

// 注: foodDatabase.js, trainingDatabase.js, notificationSound.js, services.js は
// index.htmlで<script>タグとして読み込まれているため、ここではimportしない

// これらのファイルは既にwindowにオブジェクトを公開しているはず
// 念のため、確認用のログを出力
console.log('[Global Setup] Checking global objects...');
console.log('- Config loaded:', typeof window.FIREBASE_CONFIG !== 'undefined');
console.log('- LBMUtils:', typeof window.LBMUtils);
console.log('- DataService:', typeof window.DataService);
console.log('- foodDatabase:', typeof window.foodDatabase);
console.log('- trainingDatabase:', typeof window.trainingDatabase);

// ========================================
// iOS Safari 最適化: 動的ビューポート高さの設定
// ========================================
// iOSのアドレスバー表示/非表示でレイアウトシフトが発生する問題に対応
// CSS変数 --vh を設定し、100vh の代わりに calc(var(--vh, 1vh) * 100) を使用可能にする

const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// 初回実行
setViewportHeight();

// リサイズ時に再計算（デバウンス処理付き）
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(setViewportHeight, 100);
});

console.log('[Global Setup] iOS viewport height optimization enabled');
