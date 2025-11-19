#!/usr/bin/env node

/**
 * インタラクティブなリリース管理スクリプト
 *
 * 使い方:
 *   npm run release
 *
 * 機能:
 * - バージョンタイプの選択（Patch/Minor/Major）
 * - 自動バージョンインクリメント
 * - リリースノートの入力（Minor/Major時）
 * - config.jsの自動更新
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const configPath = path.join(__dirname, '../src/config.js');

// 質問をPromise化
const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function release() {
  console.log('🚀 リリース準備を開始します\n');

  // config.jsを読み込み
  let configContent;
  try {
    configContent = fs.readFileSync(configPath, 'utf-8');
  } catch (err) {
    console.error('❌ config.jsが見つかりません:', configPath);
    process.exit(1);
  }

  // 現在のバージョンを取得
  const versionMatch = configContent.match(/const APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/);
  if (!versionMatch) {
    console.error('❌ config.jsからバージョンを抽出できません');
    process.exit(1);
  }

  const currentVersion = versionMatch[1];
  console.log(`📌 現在のバージョン: v${currentVersion}\n`);

  // バージョンタイプを選択
  console.log('どのバージョンを更新しますか？');
  console.log('1. Patch (バグ修正・小さな改善) - What\'s New表示なし');
  console.log('2. Minor (新機能追加) - What\'s New表示あり');
  console.log('3. Major (大きな変更) - What\'s New表示あり');

  const choice = await question('\n選択 (1/2/3): ');

  if (!['1', '2', '3'].includes(choice)) {
    console.error('❌ 無効な選択です');
    rl.close();
    process.exit(1);
  }

  const versionType = choice === '3' ? 'major' : choice === '2' ? 'minor' : 'patch';

  // 新しいバージョンを計算
  let [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (versionType) {
    case 'major':
      major++;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor++;
      patch = 0;
      break;
    case 'patch':
      patch++;
      break;
  }

  const newVersion = `${major}.${minor}.${patch}`;
  console.log(`\n✨ 新しいバージョン: v${newVersion}`);

  // Minor/Major更新の場合はリリースノートを入力
  let releaseNotes = null;
  if (versionType === 'minor' || versionType === 'major') {
    console.log('\n📝 リリースノートを入力してください:');
    const title = await question('タイトル: ');

    console.log('\n機能一覧を入力してください（空行で終了）:');
    const features = [];
    let featureNum = 1;
    while (true) {
      const feature = await question(`${featureNum}. `);
      if (!feature.trim()) break;
      features.push(feature.trim());
      featureNum++;
    }

    if (features.length === 0) {
      console.error('❌ 機能を最低1つ入力してください');
      rl.close();
      process.exit(1);
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    releaseNotes = {
      key: `${major}.${minor}`,
      date: dateStr,
      title: title.trim() || '新機能追加',
      features
    };
  }

  // config.jsを更新
  let updatedConfig = configContent.replace(
    /const APP_VERSION = '\d+\.\d+\.\d+'/,
    `const APP_VERSION = '${newVersion}'`
  );

  // RELEASE_NOTESを追加（Minor/Majorの場合）
  if (releaseNotes) {
    const releaseNotesEntry = `    '${releaseNotes.key}': {
        date: '${releaseNotes.date}',
        title: '${releaseNotes.title}',
        features: [
${releaseNotes.features.map(f => `            '${f}'`).join(',\n')}
        ]
    }`;

    // 既存のRELEASE_NOTESに追加
    // パターン: const RELEASE_NOTES = { ... }; を探して、最後の } の前に挿入
    const releaseNotesRegex = /(const RELEASE_NOTES = \{[\s\S]*?)(    \}\n\};)/;
    const match = updatedConfig.match(releaseNotesRegex);

    if (match) {
      // 既存のエントリがある場合はカンマを追加
      updatedConfig = updatedConfig.replace(
        releaseNotesRegex,
        `$1,\n${releaseNotesEntry}\n$2`
      );
    } else {
      console.error('❌ RELEASE_NOTESの形式を認識できません');
      rl.close();
      process.exit(1);
    }
  }

  // config.jsに書き込み
  try {
    fs.writeFileSync(configPath, updatedConfig, 'utf-8');
    console.log(`\n✅ config.jsを更新しました`);
  } catch (err) {
    console.error('❌ config.jsの書き込みに失敗しました:', err.message);
    rl.close();
    process.exit(1);
  }

  // 次のステップを表示
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📦 次のステップ:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (releaseNotes) {
    console.log(`⚠️  home.htmlのリリースノートセクションを手動で更新してください`);
    console.log(`   バージョン: v${releaseNotes.key}.x`);
    console.log(`   タイトル: ${releaseNotes.title}`);
    console.log(`   機能: ${releaseNotes.features.join(', ')}\n`);
  }

  console.log(`1. npm run build`);
  console.log(`2. git add . && git commit -m "Release: v${newVersion}"`);
  console.log(`3. git push`);
  console.log(`4. firebase deploy --only hosting\n`);

  rl.close();
}

// エラーハンドリング
process.on('unhandledRejection', (err) => {
  console.error('❌ エラーが発生しました:', err.message);
  rl.close();
  process.exit(1);
});

// 実行
release().catch(err => {
  console.error('❌ エラーが発生しました:', err.message);
  process.exit(1);
});
