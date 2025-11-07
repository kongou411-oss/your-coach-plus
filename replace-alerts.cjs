const fs = require('fs');
const path = require('path');

// 置き換え対象ファイル
const files = [
  'src/components/04_settings.jsx',
  'src/components/05_analysis.jsx',
  'src/components/06_community.jsx',
  'src/components/07_add_item_v2.jsx',
  'src/components/08_app.jsx',
  'src/components/03_dashboard.jsx',
  'src/components/02_auth.jsx',
  'src/components/10_feedback.jsx',
  'src/components/11_ai_food_recognition.jsx',
  'src/components/19_add_meal_modal.jsx',
  'src/components/20_add_workout_modal.jsx',
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} が見つかりません`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changeCount = 0;

  // alert() → toast() の基本置き換え（一括）
  const alertMatches = content.match(/\balert\(/g);
  if (alertMatches) {
    // エラーメッセージを含むalert()をtoast.error()に
    content = content.replace(/alert\(([^)]*)(エラー|失敗|できません|不足)[^)]*\)/g, (match) => {
      changeCount++;
      return match.replace('alert(', 'toast.error(');
    });

    // 成功メッセージを含むalert()をtoast.success()に
    content = content.replace(/alert\(([^)]*)(完了|成功|しました！|追加しました|保存しました|削除しました|送信しました)[^)]*\)/g, (match) => {
      changeCount++;
      return match.replace('alert(', 'toast.success(');
    });

    // 残りのalert()をtoast()に
    content = content.replace(/\balert\(/g, (match) => {
      changeCount++;
      return 'toast(';
    });
  }

  if (changeCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: ${changeCount}箇所を置き換えました`);
  } else {
    console.log(`ℹ️  ${file}: 置き換える箇所がありませんでした`);
  }
});

console.log('\n✅ alert()の一括置き換えが完了しました！');
console.log('⚠️  次のステップ: confirm()の置き換えは手動で行う必要があります');
