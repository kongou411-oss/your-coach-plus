const fs = require('fs');
const path = require('path');

// import文を追加する対象ファイル
const files = [
  'src/components/02_auth.jsx',
  'src/components/03_dashboard.jsx',
  'src/components/05_analysis.jsx',
  'src/components/06_community.jsx',
  'src/components/07_add_item_v2.jsx',
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

  // 既にimportがあるかチェック
  if (content.includes("from 'react-hot-toast'")) {
    console.log(`ℹ️  ${file}: 既にimport済みです`);
    return;
  }

  // React importの直後にtoast importを追加
  if (content.match(/^import React/m)) {
    content = content.replace(
      /^(import React[^\n]*\n)/m,
      "$1import toast from 'react-hot-toast';\n"
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: toast importを追加しました`);
  } else {
    console.log(`⚠️  ${file}: React importが見つかりません`);
  }
});

console.log('\n✅ toast importの追加が完了しました！');
