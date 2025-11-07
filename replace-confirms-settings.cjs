const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/04_settings.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 単純なconfirm()のパターンを置き換え（既に置き換え済みの箇所を除く）
const replacements = [
  // 2FA解除
  {
    old: `if (confirm('2FAを解除しますか？セキュリティが低下します。')) {`,
    new: `showConfirm('2FA解除の確認', '2FAを解除しますか？セキュリティが低下します。', async () => {`
  },
  // ルーティンリセット
  {
    old: `if (confirm('ルーティンをリセットしますか？')) {`,
    new: `showConfirm('ルーティンリセットの確認', 'ルーティンをリセットしますか？', async () => {`
  },
  // キャッシュクリア
  {
    old: `if (confirm('すべてのキャッシュをクリアしますか？\\n（通知設定やユーザーデータは保持されます）')) {`,
    new: `showConfirm('キャッシュクリアの確認', 'すべてのキャッシュをクリアしますか？\\n（通知設定やユーザーデータは保持されます）', () => {`
  },
  // LocalStorage削除
  {
    old: `if (confirm('すべてのLocalStorageデータを削除しますか？\\nこの操作は取り消せません。')) {`,
    new: `showConfirm('LocalStorage削除の確認', 'すべてのLocalStorageデータを削除しますか？\\nこの操作は取り消せません。', () => {`
  }
];

let changeCount = 0;

replacements.forEach((r, idx) => {
  if (content.includes(r.old)) {
    content = content.replace(r.old, r.new);
    changeCount++;
    console.log(`✅ 置き換え ${idx + 1}: 成功`);
  } else {
    console.log(`⚠️  置き換え ${idx + 1}: パターンが見つかりません`);
  }
});

// 単純なconfirm()で削除確認のパターンを一括置き換え
// 例: if (confirm('このアイテムを削除しますか？'))
const simpleConfirmPattern = /if \(confirm\('([^']+)'\)\) \{/g;
content = content.replace(simpleConfirmPattern, (match, message) => {
  changeCount++;
  return `showConfirm('確認', '${message}', () => {`;
});

fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ 04_settings.jsx: ${changeCount}箇所のconfirm()を置き換えました`);
console.log('⚠️  注意: 閉じ括弧の調整が必要な箇所があるかもしれません');
