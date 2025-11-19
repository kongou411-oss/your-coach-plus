#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ファイルパス
const CONFIG_PATH = path.join(__dirname, '../src/config.js');
const HOME_PATH = path.join(__dirname, '../public/home.html');

// 現在のバージョンを取得
function getCurrentVersion() {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const match = configContent.match(/const APP_VERSION = '([^']+)'/);
    if (!match) {
        throw new Error('APP_VERSION not found in config.js');
    }
    return match[1];
}

// Gitコミットメッセージから変更内容を分析
function analyzeChanges() {
    try {
        // 最新のコミットメッセージを取得
        const lastCommit = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();

        // バージョンタイプの自動判定
        // Major: 大きな変更、破壊的変更
        if (lastCommit.match(/major|breaking|破壊的|大規模/i)) {
            return { type: 'major', message: lastCommit };
        }

        // Minor: 新機能追加
        if (lastCommit.match(/feat|feature|新機能|追加|実装|add:/i)) {
            return { type: 'minor', message: lastCommit };
        }

        // Patch: バグ修正、小さな改善（デフォルト）
        return { type: 'patch', message: lastCommit };
    } catch (error) {
        console.log('⚠️  Git履歴が取得できないため、Patchとして扱います');
        return { type: 'patch', message: '' };
    }
}

// バージョンをインクリメント
function incrementVersion(version, type) {
    const parts = version.split('.').map(Number);

    switch (type) {
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'patch':
            parts[2]++;
            break;
    }

    return parts.join('.');
}

// config.js を更新
function updateConfigJs(newVersion, type, commitMessage) {
    let content = fs.readFileSync(CONFIG_PATH, 'utf-8');

    // APP_VERSION を更新
    content = content.replace(
        /const APP_VERSION = '[^']+'/,
        `const APP_VERSION = '${newVersion}'`
    );

    // Minor/Major の場合のみ RELEASE_NOTES を更新
    if (type === 'minor' || type === 'major') {
        const minorVersion = newVersion.split('.').slice(0, 2).join('.');
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

        // コミットメッセージから機能を抽出（簡易版）
        const feature = commitMessage.split('\n')[0].replace(/^(feat|feature|Fix|Refactor):\s*/i, '');

        const newReleaseNote = `    '${minorVersion}': {  // v${minorVersion}.x
        date: '${dateStr}',
        title: '${feature}',
        features: [
            '${feature}'
        ]
    }`;

        // RELEASE_NOTES の最後の項目の後に追加
        const releaseNotesMatch = content.match(/const RELEASE_NOTES = \{([^}]+)\};/s);
        if (releaseNotesMatch) {
            const existingNotes = releaseNotesMatch[1];
            const updatedNotes = existingNotes.trimEnd() + ',\n' + newReleaseNote + '\n';
            content = content.replace(
                /const RELEASE_NOTES = \{[^}]+\};/s,
                `const RELEASE_NOTES = {${updatedNotes}};`
            );
        }
    }

    fs.writeFileSync(CONFIG_PATH, content, 'utf-8');
    console.log(`✓ config.js updated: v${newVersion}`);
}

// home.html を更新
function updateHomeHtml(newVersion, type, commitMessage) {
    let content = fs.readFileSync(HOME_PATH, 'utf-8');

    const minorVersion = newVersion.split('.').slice(0, 2).join('.');

    // Minor/Major の場合のみリリースノートセクションを更新
    if (type === 'minor' || type === 'major') {
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

        // コミットメッセージから機能を抽出
        const feature = commitMessage.split('\n')[0].replace(/^(feat|feature|Fix|Refactor):\s*/i, '');

        const newVersionBlock = `
                        <!-- Version ${minorVersion}.x -->
                        <div class="border-l-4 border-indigo-500 pl-4">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-bold text-indigo-600">v${minorVersion}.x</span>
                                <span class="text-sm text-gray-500">${dateStr} 〜</span>
                                <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">最新</span>
                            </div>
                            <p class="text-sm text-gray-600 mb-2">${feature}</p>
                            <ul class="text-sm text-gray-600 space-y-1 ml-4">
                                <li>• ${feature}</li>
                            </ul>
                        </div>
`;

        // 既存の「最新」バッジを削除
        content = content.replace(
            /<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">最新<\/span>/g,
            ''
        );

        // 新しいバージョンブロックを先頭に挿入
        content = content.replace(
            /(<div class="mt-4 space-y-6">)/,
            `$1\n${newVersionBlock}`
        );
    }

    fs.writeFileSync(HOME_PATH, content, 'utf-8');
    console.log(`✓ home.html updated`);
}

// メイン処理
function main() {
    console.log('🚀 Auto Release Script\n');

    // 現在のバージョンを取得
    const currentVersion = getCurrentVersion();
    console.log(`📌 現在のバージョン: v${currentVersion}`);

    // 変更内容を分析
    const { type, message } = analyzeChanges();
    console.log(`📊 変更タイプ: ${type.toUpperCase()}`);
    if (message) {
        console.log(`📝 コミットメッセージ: ${message.split('\n')[0]}`);
    }

    // 新しいバージョンを計算
    const newVersion = incrementVersion(currentVersion, type);
    console.log(`🆕 新しいバージョン: v${newVersion}`);

    // ファイルを更新
    console.log('\n📝 ファイルを更新中...');
    updateConfigJs(newVersion, type, message);
    updateHomeHtml(newVersion, type, message);

    console.log('\n✅ 自動リリース完了！');
    console.log(`\n次のステップ:`);
    console.log(`  1. npm run build`);
    console.log(`  2. git add -A && git commit -m "Release: v${newVersion}"`);
    console.log(`  3. git push`);
    console.log(`  4. firebase deploy --only hosting`);
}

// スクリプト実行
if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error('❌ エラー:', error.message);
        process.exit(1);
    }
}

module.exports = { getCurrentVersion, incrementVersion, analyzeChanges };
