const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/04_settings.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// confirm()のパターンを探して置き換え
const replacements = [
  // Line 2064: 運動テンプレート削除
  {
    pattern: /onClick=\{async \(e\) => \{\s+e\.preventDefault\(\);\s+if \(confirm\('このテンプレートを削除しますか？'\)\) \{\s+await DataService\.deleteWorkoutTemplate\(userId, template\.id\);\s+await loadTemplates\(\);\s+\}\s+\}\}/,
    replacement: `onClick={(e) => {
                                                                    e.preventDefault();
                                                                    showConfirm('テンプレート削除の確認', 'このテンプレートを削除しますか？', async () => {
                                                                        await DataService.deleteWorkoutTemplate(userId, template.id);
                                                                        await loadTemplates();
                                                                    });
                                                                }}`
  },
  // Line 2128: カスタムアイテム削除
  {
    pattern: /if \(confirm\('このアイテムを削除しますか？'\)\) \{\s+await deleteCustomItem\(customItems\[activeItemTab\]\[itemIndex\]\.id\);\s+await loadCustomItems\(\);\s+\}/,
    replacement: `showConfirm('アイテム削除の確認', 'このアイテムを削除しますか？', async () => {
                                            await deleteCustomItem(customItems[activeItemTab][itemIndex].id);
                                            await loadCustomItems();
                                        });`
  },
  // Line 2137: すべてのカスタムアイテム削除
  {
    pattern: /if \(confirm\(`すべての\$\{typeName\}を削除しますか？`\)\) \{\s+const items = customItems\[activeItemTab\] \|\| \[\];\s+for \(const item of items\) \{\s+await deleteCustomItem\(item\.id\);\s+\}\s+await loadCustomItems\(\);\s+\}/,
    replacement: `showConfirm('全削除の確認', \`すべての\${typeName}を削除しますか？\`, async () => {
                                            const items = customItems[activeItemTab] || [];
                                            for (const item of items) {
                                                await deleteCustomItem(item.id);
                                            }
                                            await loadCustomItems();
                                        });`
  },
  // Line 2382: ルーティン追加枠削除
  {
    pattern: /if \(confirm\('この追加枠を削除しますか？'\)\) \{\s+const newRoutines = \{\.\.\.routinePresets\};\s+delete newRoutines\[key\];\s+await DataService\.saveRoutines\(userId, newRoutines\);\s+setRoutinePresets\(newRoutines\);\s+\}/,
    replacement: `showConfirm('追加枠削除の確認', 'この追加枠を削除しますか？', async () => {
                                        const newRoutines = {...routinePresets};
                                        delete newRoutines[key];
                                        await DataService.saveRoutines(userId, newRoutines);
                                        setRoutinePresets(newRoutines);
                                    });`
  },
  // Line 2715: ルーティンリセット
  {
    pattern: /if \(confirm\('ルーティンをリセットしますか？'\)\) \{\s+setRoutinePresets\(defaultRoutines\);\s+await DataService\.saveRoutines\(userId, defaultRoutines\);\s+\}/,
    replacement: `showConfirm('ルーティンリセットの確認', 'ルーティンをリセットしますか？', async () => {
                                                            setRoutinePresets(defaultRoutines);
                                                            await DataService.saveRoutines(userId, defaultRoutines);
                                                        });`
  },
  // Line 3104: キャッシュクリア
  {
    pattern: /if \(confirm\('すべてのキャッシュをクリアしますか？\\n（通知設定やユーザーデータは保持されます）'\)\) \{\s+localStorage\.removeItem\('foodDBCache'\);\s+toast\.success\('キャッシュをクリアしました'\);\s+\}/,
    replacement: `showConfirm('キャッシュクリアの確認', 'すべてのキャッシュをクリアしますか？\\n（通知設定やユーザーデータは保持されます）', () => {
                                                localStorage.removeItem('foodDBCache');
                                                toast.success('キャッシュをクリアしました');
                                            });`
  },
  // Line 3160-3169: カスタム食材管理
  {
    pattern: /if \(confirm\('このアイテムを削除しますか？'\)\) \{\s+await DataService\.deleteCustomItem\(userId, items\[itemIndex\]\.id\);\s+await loadCustomItems\(\);\s+\}/,
    replacement: `showConfirm('アイテム削除の確認', 'このアイテムを削除しますか？', async () => {
                                        await DataService.deleteCustomItem(userId, items[itemIndex].id);
                                        await loadCustomItems();
                                    });`
  },
  {
    pattern: /if \(confirm\(`すべての\$\{typeName\}を削除しますか？`\)\) \{\s+for \(const item of items\) \{\s+await DataService\.deleteCustomItem\(userId, item\.id\);\s+\}\s+await loadCustomItems\(\);\s+\}/,
    replacement: `showConfirm('全削除の確認', \`すべての\${typeName}を削除しますか？\`, async () => {
                                        for (const item of items) {
                                            await DataService.deleteCustomItem(userId, item.id);
                                        }
                                        await loadCustomItems();
                                    });`
  },
  // Line 4100: LocalStorageキー削除
  {
    pattern: /if \(confirm\(`"\$\{key\}" を削除しますか？`\)\) \{\s+localStorage\.removeItem\(key\);\s+updateStorageData\(\);\s+\}/,
    replacement: `showConfirm('LocalStorageキー削除の確認', \`"\${key}" を削除しますか？\`, () => {
                                                                            localStorage.removeItem(key);
                                                                            updateStorageData();
                                                                        });`
  },
  // Line 4123: すべてのLocalStorage削除
  {
    pattern: /if \(confirm\('すべてのLocalStorageデータを削除しますか？\\nこの操作は取り消せません。'\)\) \{\s+localStorage\.clear\(\);\s+updateStorageData\(\);\s+\}/,
    replacement: `showConfirm('全LocalStorage削除の確認', 'すべてのLocalStorageデータを削除しますか？\\nこの操作は取り消せません。', () => {
                                                localStorage.clear();
                                                updateStorageData();
                                            });`
  },
  // Line 4251 & 4330: 食事・運動テンプレート削除（テンプレート編集モーダル内）
  {
    pattern: /if \(confirm\(`「\$\{template\.name\}」を削除しますか？`\)\) \{\s+await DataService\.deleteMealTemplate\(userId, template\.id\);\s+await loadTemplates\(\);\s+onClose\(\);\s+\}/,
    replacement: `showConfirm('テンプレート削除の確認', \`「\${template.name}」を削除しますか？\`, async () => {
                                                                    await DataService.deleteMealTemplate(userId, template.id);
                                                                    await loadTemplates();
                                                                    onClose();
                                                                });`
  }
];

let changeCount = 0;

replacements.forEach((r, idx) => {
  const before = content;
  content = content.replace(r.pattern, r.replacement);
  if (content !== before) {
    changeCount++;
    console.log(`✅ パターン ${idx + 1}: 置き換え成功`);
  } else {
    console.log(`⚠️  パターン ${idx + 1}: パターンが見つかりません`);
  }
});

fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ 合計 ${changeCount} 箇所のconfirm()を置き換えました`);
