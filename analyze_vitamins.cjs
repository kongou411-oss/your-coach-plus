const fs = require('fs');
const content = fs.readFileSync('src/foodDatabase.js', 'utf-8');

// foodDatabase オブジェクトを抽出
const match = content.match(/const foodDatabase = ({[\s\S]*});/);
if (!match) {
  console.log('データベースが見つかりません');
  process.exit(1);
}

const dbStr = match[1];
const foodDatabase = eval('(' + dbStr + ')');

// ビタミン・ミネラルフィールドのリスト
const vitaminMineralFields = [
  'vitaminA', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12',
  'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
  'niacin', 'pantothenicAcid', 'biotin', 'folicAcid',
  'sodium', 'potassium', 'calcium', 'magnesium', 'phosphorus',
  'iron', 'zinc', 'copper', 'manganese', 'iodine', 'selenium',
  'chromium', 'molybdenum'
];

let completeCount = 0;
let incompleteItems = [];
let totalItems = 0;

// 各カテゴリを処理
for (const [category, items] of Object.entries(foodDatabase)) {
  for (const [itemName, itemData] of Object.entries(items)) {
    // カスタムアイテムは除外
    if (itemData.category && (
        itemData.category.includes('カスタム') ||
        itemName.includes('カスタム')
    )) {
      continue;
    }

    totalItems++;
    
    // 欠落フィールドをチェック
    const missingFields = vitaminMineralFields.filter(field => 
      itemData[field] === undefined || itemData[field] === null
    );
    
    if (missingFields.length === 0) {
      completeCount++;
    } else {
      incompleteItems.push({
        name: itemName,
        category: category,
        missingFields: missingFields,
        missingCount: missingFields.length
      });
    }
  }
}

console.log('=== ビタミン・ミネラルデータ分析結果 ===\n');
console.log('総アイテム数（カスタム除く）:', totalItems);
console.log('完全なデータを持つアイテム数:', completeCount);
console.log('不完全なアイテム数:', incompleteItems.length);
console.log('完全率:', (completeCount / totalItems * 100).toFixed(2) + '%\n');

if (incompleteItems.length > 0) {
  console.log('=== 欠落データのあるアイテム一覧 ===\n');
  
  // 欠落数でソート
  incompleteItems.sort((a, b) => b.missingCount - a.missingCount);
  
  for (const item of incompleteItems) {
    console.log('【アイテム名】:', item.name);
    console.log('【カテゴリ】:', item.category);
    console.log('【欠落フィールド数】:', item.missingCount + '/' + vitaminMineralFields.length);
    console.log('【欠落フィールド】:', item.missingFields.join(', '));
    console.log('');
  }
  
  // カテゴリ別の集計
  console.log('\n=== カテゴリ別欠落パターン ===\n');
  const categoryStats = {};
  for (const item of incompleteItems) {
    if (!categoryStats[item.category]) {
      categoryStats[item.category] = {
        count: 0,
        items: []
      };
    }
    categoryStats[item.category].count++;
    categoryStats[item.category].items.push(item.name);
  }
  
  for (const [cat, stats] of Object.entries(categoryStats)) {
    console.log('【' + cat + '】: ' + stats.count + '件');
    console.log('  アイテム: ' + stats.items.join(', '));
    console.log('');
  }
  
  // 最も欠落が多いフィールド
  console.log('\n=== 最も欠落が多いフィールド TOP10 ===\n');
  const fieldStats = {};
  for (const field of vitaminMineralFields) {
    fieldStats[field] = 0;
  }
  
  for (const item of incompleteItems) {
    for (const field of item.missingFields) {
      fieldStats[field]++;
    }
  }
  
  const sortedFields = Object.entries(fieldStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  for (const [field, count] of sortedFields) {
    console.log(field + ': ' + count + '件 (' + (count / totalItems * 100).toFixed(2) + '%)');
  }
}
