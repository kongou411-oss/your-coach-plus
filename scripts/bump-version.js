#!/usr/bin/env node

/**
 * シンプルなバージョン更新スクリプト
 *
 * 使い方:
 *   node scripts/bump-version.js [patch|minor|major]
 *   npm run version:patch
 *   npm run version:minor
 *   npm run version:major
 *
 * 機能:
 * - 指定されたバージョンタイプに応じてバージョンをインクリメント
 * - config.jsを自動更新
 * - Minor/Major更新時はRELEASE_NOTESの追加を促す
 */

const fs = require('fs');
const path = require('path');

// config.jsのパス
const configPath = path.join(__dirname, '../src/config.js');

// 引数からバージョンタイプを取得（patch/minor/major）
const versionType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ 無効なバージョンタイプです。patch, minor, major のいずれかを指定してください。');
  process.exit(1);
}

// config.jsを読み込み
let configContent;
try {
  configContent = fs.readFileSync(configPath, 'utf-8');
} catch (err) {
  console.error('❌ config.jsが見つかりません:', configPath);
  process.exit(1);
}

// 現在のバージョンを抽出
const versionMatch = configContent.match(/const APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/);
if (!versionMatch) {
  console.error('❌ config.jsからバージョンを抽出できません');
  process.exit(1);
}

const currentVersion = versionMatch[1];
let [major, minor, patch] = currentVersion.split('.').map(Number);

// バージョンをインクリメント
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
  default:
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;
const minorKey = `${major}.${minor}`;

// config.jsを更新
const updatedConfig = configContent.replace(
  /const APP_VERSION = '\d+\.\d+\.\d+'/,
  `const APP_VERSION = '${newVersion}'`
);

try {
  fs.writeFileSync(configPath, updatedConfig, 'utf-8');
  console.log(`✅ バージョンを v${currentVersion} → v${newVersion} に更新しました`);
} catch (err) {
  console.error('❌ config.jsの書き込みに失敗しました:', err.message);
  process.exit(1);
}

// Minor/Major更新の場合はRELEASE_NOTESの追加を促す
if (versionType === 'minor' || versionType === 'major') {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`⚠️  ${versionType.toUpperCase()}版更新です！`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`📝 config.js の RELEASE_NOTES に以下を追加してください:\n`);
  console.log(`    '${minorKey}': {`);
  console.log(`        date: '${dateStr}',`);
  console.log(`        title: 'タイトルを記入',`);
  console.log(`        features: [`);
  console.log(`            '機能1',`);
  console.log(`            '機能2',`);
  console.log(`            '機能3'`);
  console.log(`        ]`);
  console.log(`    }`);
  console.log(`\n📄 home.html のリリースノートセクションも更新してください\n`);
} else {
  console.log(`\n📦 Patch更新（バグ修正）のため、What's Newは表示されません`);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`📦 次のステップ:`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
console.log(`1. npm run build`);
console.log(`2. git add . && git commit -m "${versionType === 'patch' ? 'Fix' : 'Release'}: v${newVersion}"`);
console.log(`3. git push`);
console.log(`4. firebase deploy --only hosting\n`);
