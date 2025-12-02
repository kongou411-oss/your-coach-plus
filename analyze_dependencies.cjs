// 依存関係分析スクリプト
const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

const dependencies = {};
const exportsData = {};
const dataServiceUsage = {};
const globalVarUsage = {};

files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    if (fs.statSync(filePath).isDirectory()) return;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    dependencies[file] = {
        imports: [],
        relativeImports: [],
        exports: [],
        windowDataService: 0,
        importDataService: 0,
        globalVars: []
    };

    lines.forEach((line, idx) => {
        // Import分析
        const importMatch = line.match(/^import\s+(.+?)\s+from\s+['"](.*)['"]/);
        if (importMatch) {
            const [, imported, source] = importMatch;
            if (source.startsWith('.') || source.startsWith('@')) {
                dependencies[file].relativeImports.push({
                    line: idx + 1,
                    imported: imported.trim(),
                    source: source
                });
            }
            dependencies[file].imports.push({
                line: idx + 1,
                imported: imported.trim(),
                source: source
            });
        }

        // Export分析
        const exportMatch = line.match(/^export\s+(default\s+)?(function|const|class)\s+(\w+)/);
        if (exportMatch) {
            dependencies[file].exports.push({
                line: idx + 1,
                name: exportMatch[3],
                isDefault: !!exportMatch[1]
            });
        }

        // Export { } 形式
        const exportBraceMatch = line.match(/^export\s+\{([^}]+)\}/);
        if (exportBraceMatch) {
            const names = exportBraceMatch[1].split(',').map(n => n.trim());
            names.forEach(name => {
                dependencies[file].exports.push({
                    line: idx + 1,
                    name: name,
                    isDefault: false
                });
            });
        }

        // DataService使用パターン
        const windowDataServiceCount = (line.match(/window\.DataService/g) || []).length;
        const importDataServiceCount = (line.match(/DataService\./g) || []).length;
        dependencies[file].windowDataService += windowDataServiceCount;
        dependencies[file].importDataService += importDataServiceCount;

        // グローバル変数使用
        const globalVars = ['window.auth', 'window.db', 'window.storage', 'window.functions',
                           'window.firebase', 'window.showFeedback', 'window.showGlobalConfirm'];
        globalVars.forEach(gvar => {
            if (line.includes(gvar)) {
                if (!dependencies[file].globalVars.includes(gvar)) {
                    dependencies[file].globalVars.push(gvar);
                }
            }
        });
    });
});

// 依存関係グラフ構築
const dependencyGraph = {};
Object.keys(dependencies).forEach(file => {
    dependencyGraph[file] = [];
    dependencies[file].relativeImports.forEach(imp => {
        const source = imp.source;
        // 相対パスを解決
        let targetFile = source.replace(/^\.\//, '').replace(/^\.\.\/components\//, '');
        if (!targetFile.endsWith('.jsx') && !targetFile.endsWith('.js')) {
            targetFile += '.jsx';
        }
        if (files.includes(targetFile)) {
            dependencyGraph[file].push(targetFile);
        }
    });
});

// 循環依存検出
function detectCircular(graph) {
    const circular = [];
    const visited = new Set();
    const recStack = new Set();

    function dfs(node, path) {
        if (recStack.has(node)) {
            const cycleStart = path.indexOf(node);
            circular.push(path.slice(cycleStart).concat([node]));
            return;
        }
        if (visited.has(node)) return;

        visited.add(node);
        recStack.add(node);

        (graph[node] || []).forEach(neighbor => {
            dfs(neighbor, path.concat([neighbor]));
        });

        recStack.delete(node);
    }

    Object.keys(graph).forEach(node => {
        if (!visited.has(node)) {
            dfs(node, [node]);
        }
    });

    return circular;
}

// 使われていないコンポーネント検出
const usedFiles = new Set();
Object.keys(dependencyGraph).forEach(file => {
    dependencyGraph[file].forEach(dep => {
        usedFiles.add(dep);
    });
});

// エントリーポイントをチェック（App.jsx, main.jsx, index.htmlなど）
const entryPoints = ['08_app.jsx', '00_init.jsx'];
entryPoints.forEach(ep => usedFiles.add(ep));

const unusedFiles = files.filter(f => !usedFiles.has(f) && !entryPoints.includes(f));

// 重複エクスポート検出
const exportNames = {};
Object.keys(dependencies).forEach(file => {
    dependencies[file].exports.forEach(exp => {
        if (!exportNames[exp.name]) {
            exportNames[exp.name] = [];
        }
        exportNames[exp.name].push({ file, line: exp.line, isDefault: exp.isDefault });
    });
});

const duplicateExports = Object.keys(exportNames).filter(name => exportNames[name].length > 1);

// 依存度の高いコンポーネント
const dependencyCounts = {};
Object.keys(dependencyGraph).forEach(file => {
    dependencyCounts[file] = dependencyGraph[file].length;
});

const highDependency = Object.keys(dependencyCounts)
    .filter(f => dependencyCounts[f] > 5)
    .map(f => ({ file: f, count: dependencyCounts[f] }))
    .sort((a, b) => b.count - a.count);

// レポート出力
const report = {
    summary: {
        totalFiles: files.length,
        totalImports: Object.values(dependencies).reduce((sum, d) => sum + d.relativeImports.length, 0),
        totalExports: Object.values(dependencies).reduce((sum, d) => sum + d.exports.length, 0),
        unusedFilesCount: unusedFiles.length,
        circularDependenciesCount: detectCircular(dependencyGraph).length,
        duplicateExportsCount: duplicateExports.length
    },
    circularDependencies: detectCircular(dependencyGraph),
    unusedFiles: unusedFiles,
    duplicateExports: duplicateExports.map(name => ({
        name,
        locations: exportNames[name]
    })),
    highDependencyComponents: highDependency,
    dataServiceUsage: Object.keys(dependencies).map(file => ({
        file,
        windowDataService: dependencies[file].windowDataService,
        importDataService: dependencies[file].importDataService
    })).filter(d => d.windowDataService > 0 || d.importDataService > 0),
    globalVariableUsage: Object.keys(dependencies).map(file => ({
        file,
        globals: dependencies[file].globalVars
    })).filter(d => d.globals.length > 0),
    fullDependencyGraph: dependencyGraph,
    detailedDependencies: dependencies
};

console.log('===== 依存関係分析レポート =====\n');
console.log('【概要】');
console.log(`総ファイル数: ${report.summary.totalFiles}`);
console.log(`総import数: ${report.summary.totalImports}`);
console.log(`総export数: ${report.summary.totalExports}`);
console.log(`未使用ファイル: ${report.summary.unusedFilesCount}`);
console.log(`循環依存: ${report.summary.circularDependenciesCount}`);
console.log(`重複export: ${report.summary.duplicateExportsCount}\n`);

if (report.circularDependencies.length > 0) {
    console.log('【⚠️ 循環依存】');
    report.circularDependencies.forEach((cycle, idx) => {
        console.log(`${idx + 1}. ${cycle.join(' → ')}`);
    });
    console.log('');
}

if (report.unusedFiles.length > 0) {
    console.log('【⚠️ 未使用コンポーネント】');
    report.unusedFiles.forEach((file, idx) => {
        console.log(`${idx + 1}. ${file}`);
    });
    console.log('');
}

if (report.duplicateExports.length > 0) {
    console.log('【⚠️ 重複エクスポート】');
    report.duplicateExports.forEach(dup => {
        console.log(`"${dup.name}":`);
        dup.locations.forEach(loc => {
            console.log(`  - ${loc.file}:${loc.line} ${loc.isDefault ? '(default)' : ''}`);
        });
    });
    console.log('');
}

if (report.highDependencyComponents.length > 0) {
    console.log('【⚠️ 依存過多コンポーネント (6個以上)】');
    report.highDependencyComponents.forEach((comp, idx) => {
        console.log(`${idx + 1}. ${comp.file}: ${comp.count}個の依存`);
        console.log(`   → ${dependencyGraph[comp.file].join(', ')}`);
    });
    console.log('');
}

console.log('【DataService使用パターン】');
report.dataServiceUsage.forEach(usage => {
    console.log(`${usage.file}:`);
    console.log(`  window.DataService: ${usage.windowDataService}回`);
    console.log(`  import DataService: ${usage.importDataService}回`);
});
console.log('');

console.log('【グローバル変数依存】');
report.globalVariableUsage.forEach(usage => {
    console.log(`${usage.file}:`);
    usage.globals.forEach(g => console.log(`  - ${g}`));
});
console.log('');

console.log('【依存関係グラフ】');
Object.keys(dependencyGraph).forEach(file => {
    if (dependencyGraph[file].length > 0) {
        console.log(`${file}:`);
        dependencyGraph[file].forEach(dep => {
            console.log(`  → ${dep}`);
        });
    }
});

// JSON出力
fs.writeFileSync('dependency_report.json', JSON.stringify(report, null, 2));
console.log('\n✅ 詳細レポートを dependency_report.json に出力しました');
