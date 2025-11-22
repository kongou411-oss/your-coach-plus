// foodDatabaseから使われている漢字を抽出し、読み仮名を生成するスクリプト
const fs = require('fs');

// foodDatabase.jsを読み込む
const fileContent = fs.readFileSync('./src/foodDatabase.js', 'utf8');

// アイテム名を抽出する正規表現
const itemNameRegex = /"([^"]+)":\s*\{/g;
const kanjiPattern = /[\u4e00-\u9faf]/;
const allKanji = new Set();
const allItems = [];

let match;
while ((match = itemNameRegex.exec(fileContent)) !== null) {
    const itemName = match[1];
    // カテゴリ名をスキップ
    if (itemName === '肉類' || itemName === '魚介類' || itemName === '穀類' || itemName === '野菜類' ||
        itemName === '果物類' || itemName === '卵・乳製品' || itemName === '豆類' || itemName === '海藻類' ||
        itemName === 'きのこ類' || itemName === '種実類' || itemName === '調味料' || itemName === 'サプリメント' ||
        itemName === '油脂類' || itemName === '菓子類' || itemName === '飲料' || itemName === 'その他') {
        continue;
    }

    if (kanjiPattern.test(itemName)) {
        allItems.push(itemName);
        // 漢字を抽出
        for (const char of itemName) {
            if (kanjiPattern.test(char)) {
                allKanji.add(char);
            }
        }
    }
}

console.log('=== 抽出された漢字 ===');
console.log('総漢字数:', allKanji.size);
console.log('漢字リスト:', Array.from(allKanji).sort().join(''));
console.log('\n=== 漢字を含むアイテム（サンプル30件） ===');
allItems.slice(0, 30).forEach(item => console.log(item));

// 漢字を含むアイテムを全件出力（マッピング作成用）
fs.writeFileSync('kanji-items.txt', allItems.join('\n'), 'utf8');
console.log('\n全アイテムを kanji-items.txt に出力しました');
