const foodDB = require('./src/foodDatabase.js');

const staples = foodDB['主食'];
console.log('主食カテゴリの食品一覧:');
console.log('総数:', Object.keys(staples).length);
console.log('');

Object.keys(staples).forEach((name, index) => {
  const item = staples[name];
  const hasVitamins = item.vitaminC !== undefined && item.vitaminC !== 0;
  const hasMinerals = item.calcium !== undefined && item.calcium !== 0;
  console.log(`${index + 1}. ${name}`);
  console.log(`   ビタミンC: ${item.vitaminC || 0}, カルシウム: ${item.calcium || 0}`);
  console.log(`   データ状態: ${hasVitamins || hasMinerals ? '一部あり' : '未設定'}`);
  console.log('');
});
