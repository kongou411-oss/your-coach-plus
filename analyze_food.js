const fs = require('fs');
const content = fs.readFileSync('./src/foodDatabase.js', 'utf8');

const match = content.match(/export const foodDB = ({[\s\S]+?});/);
if (!match) {
  console.log('データベースが見つかりません');
  process.exit(1);
}

const foodDB = eval('(' + match[1] + ')');

const results = [];
let totalHighCarbItems = 0;
let itemsWithMissingFields = 0;

for (const [category, items] of Object.entries(foodDB)) {
  if (!Array.isArray(items)) continue;
  
  items.forEach(item => {
    if (item.category && (item.category.includes('カスタム') || item.isCustom)) {
      return;
    }
    
    const carbs = parseFloat(item.carbs) || 0;
    
    if (carbs >= 10) {
      totalHighCarbItems++;
      
      const missingFields = [];
      if (item.sugar === undefined) missingFields.push('sugar');
      if (item.fiber === undefined) missingFields.push('fiber');
      if (item.gi === undefined) missingFields.push('gi');
      
      if (missingFields.length > 0) {
        itemsWithMissingFields++;
        results.push({
          name: item.name,
          category: category,
          carbs: carbs,
          missingFields: missingFields,
          sugar: item.sugar,
          fiber: item.fiber,
          gi: item.gi
        });
      }
    }
  });
}

console.log('=== 調査結果サマリー ===');
console.log('炭水化物10g以上のアイテム総数:', totalHighCarbItems);
console.log('フィールド欠落があるアイテム数:', itemsWithMissingFields);
console.log('欠落率:', ((itemsWithMissingFields / totalHighCarbItems) * 100).toFixed(1) + '%');
console.log('');
console.log('=== 詳細リスト ===');
console.log(JSON.stringify(results, null, 2));
