// foodDatabaseから漢字を含むアイテムをカウントするスクリプト
const fs = require('fs');

// foodDatabase.jsを読み込む
const fileContent = fs.readFileSync('./src/foodDatabase.js', 'utf8');

// const foodDatabase = { ... }; の部分を抽出
const match = fileContent.match(/const foodDatabase = (\{[\s\S]*?\n\};)/);
if (!match) {
    console.error('foodDatabaseの定義が見つかりませんでした');
    process.exit(1);
}

// JSONとして評価するために、JavaScriptオブジェクトをパース可能な形式に変換
// 実際はevalは危険なので、単純に名前だけを抽出する方法に変更

// アイテム名を抽出する正規表現
const itemNameRegex = /"([^"]+)":\s*\{/g;
let totalItems = 0;
let kanjiItems = 0;
const kanjiPattern = /[\u4e00-\u9faf]/;

let match2;
while ((match2 = itemNameRegex.exec(fileContent)) !== null) {
    const itemName = match2[1];
    // カテゴリ名をスキップ（"肉類", "魚介類"など）
    if (itemName === '肉類' || itemName === '魚介類' || itemName === '穀類' || itemName === '野菜類' ||
        itemName === '果物類' || itemName === '卵・乳製品' || itemName === '豆類' || itemName === '海藻類' ||
        itemName === 'きのこ類' || itemName === '種実類' || itemName === '調味料' || itemName === 'サプリメント' ||
        itemName === '油脂類' || itemName === '菓子類' || itemName === '飲料' || itemName === 'その他') {
        continue;
    }

    totalItems++;
    if (kanjiPattern.test(itemName)) {
        kanjiItems++;
    }
}

console.log('=== foodDatabase 漢字使用統計 ===');
console.log('総アイテム数:', totalItems);
console.log('漢字を含むアイテム数:', kanjiItems);
console.log('漢字を含む割合:', (kanjiItems / totalItems * 100).toFixed(1) + '%');
console.log('ひらがな・カタカナのみ:', totalItems - kanjiItems, '(' + ((totalItems - kanjiItems) / totalItems * 100).toFixed(1) + '%)');
