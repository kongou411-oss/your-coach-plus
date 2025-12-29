// グローバルセットアップ: 既存コードとの互換性のため、必要なオブジェクトをwindowに公開

// ========================================
// ポリフィル: 古いAndroid WebView対応 (API 23-25 / Chrome 59未満)
// ========================================

// String.prototype.padStart - Chrome 59未満（Android 8.0未満）で未対応
if (!String.prototype.padStart) {
  String.prototype.padStart = function(targetLength, padString) {
    targetLength = Math.floor(targetLength) || 0;
    if (targetLength <= this.length) return String(this);
    padString = String(padString !== undefined ? padString : ' ');
    if (padString.length === 0) return String(this);
    const padLen = targetLength - this.length;
    const repeatCount = Math.ceil(padLen / padString.length);
    return padString.repeat(repeatCount).slice(0, padLen) + String(this);
  };
  console.log('[Polyfill] String.prototype.padStart added');
}

// String.prototype.padEnd - Chrome 59未満（Android 8.0未満）で未対応
if (!String.prototype.padEnd) {
  String.prototype.padEnd = function(targetLength, padString) {
    targetLength = Math.floor(targetLength) || 0;
    if (targetLength <= this.length) return String(this);
    padString = String(padString !== undefined ? padString : ' ');
    if (padString.length === 0) return String(this);
    const padLen = targetLength - this.length;
    const repeatCount = Math.ceil(padLen / padString.length);
    return String(this) + padString.repeat(repeatCount).slice(0, padLen);
  };
  console.log('[Polyfill] String.prototype.padEnd added');
}

// config.jsは main.jsx で既に window に公開済み

// 注: foodDatabase.js, trainingDatabase.js, notificationSound.js, services.js は
// index.htmlで<script>タグとして読み込まれているため、ここではimportしない

// これらのファイルは既にwindowにオブジェクトを公開しているはず
// config.jsは main.jsx で既に window に公開済み

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
