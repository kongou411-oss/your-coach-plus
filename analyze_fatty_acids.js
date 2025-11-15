const db = require('./src/foodDatabase.js');
const foods = db.getFoodDB();

// 脂肪酸プロパティの集計
const fattyAcids = ['saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'mediumChainFat'];
const stats = {};

fattyAcids.forEach(fa => {
  stats[fa] = {
    total: foods.length,
    registered: 0,
    valueGtZero: 0,
    valueEqZero: 0,
    byCategory: {}
  };
});

foods.forEach(food => {
  fattyAcids.forEach(fa => {
    if (food.hasOwnProperty(fa)) {
      stats[fa].registered++;
      if (food[fa] > 0) {
        stats[fa].valueGtZero++;
      } else if (food[fa] === 0) {
        stats[fa].valueEqZero++;
      }

      // カテゴリ別集計
      const cat = food.category || 'その他';
      if (!stats[fa].byCategory[cat]) {
        stats[fa].byCategory[cat] = { count: 0, gtZero: 0 };
      }
      stats[fa].byCategory[cat].count++;
      if (food[fa] > 0) {
        stats[fa].byCategory[cat].gtZero++;
      }
    }
  });
});

console.log('=== 脂肪酸登録状況 ===\n');
console.log(JSON.stringify(stats, null, 2));

// サンプルデータ（充実している食品）
console.log('\n\n=== 充実している食品例 ===\n');
fattyAcids.forEach(fa => {
  console.log(`\n${fa}が登録されている食品例（値>0）:`);
  const samples = foods.filter(f => f[fa] > 0).slice(0, 3);
  samples.forEach(s => {
    console.log(`  - ${s.name}: ${s[fa]}g/100g (カテゴリ: ${s.category})`);
  });
});
