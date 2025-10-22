# 履歴グラフv10 実装ガイド

v9をベースに、優先度高・中の全機能を実装する方法をまとめたガイドです。

## 📦 必要なライブラリ（CDN）

```html
<!-- PDF生成用 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

<!-- CSV生成用 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>

<!-- 日付ピッカー（カスタム期間選択用） -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ja.js"></script>
```

---

## 🔴 優先度: 高

### 1. データエクスポート機能（CSV/PDF）

#### モーダルHTML

```html
<!-- エクスポートモーダル -->
<div id="export-modal" class="modal">
    <div class="modal-content">
        <div class="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-lg">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <i data-lucide="download" class="w-5 h-5"></i>
                    <h3 class="text-lg font-bold">データエクスポート</h3>
                </div>
                <button onclick="closeExportModal()" class="p-1 hover:bg-white/20 rounded">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
        <div class="p-6">
            <div class="space-y-4">
                <!-- CSV Export -->
                <div class="border-2 border-purple-300 rounded-lg p-4 hover:bg-purple-50 transition">
                    <h4 class="font-bold text-lg mb-2 flex items-center gap-2">
                        <i data-lucide="file-spreadsheet" class="w-5 h-5 text-purple-600"></i>
                        CSV形式でエクスポート
                    </h4>
                    <p class="text-sm text-gray-600 mb-3">
                        Excel等で開ける形式。統計分析や共有に便利です。
                    </p>
                    <button
                        onclick="exportToCSV()"
                        class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                        <i data-lucide="download" class="w-4 h-4 inline mr-2"></i>
                        CSVダウンロード
                    </button>
                </div>

                <!-- PDF Export -->
                <div class="border-2 border-pink-300 rounded-lg p-4 hover:bg-pink-50 transition">
                    <h4 class="font-bold text-lg mb-2 flex items-center gap-2">
                        <i data-lucide="file-text" class="w-5 h-5 text-pink-600"></i>
                        PDF形式でエクスポート
                    </h4>
                    <p class="text-sm text-gray-600 mb-3">
                        グラフ付きレポート。医師や栄養士との共有に最適です。
                    </p>
                    <button
                        onclick="exportToPDF()"
                        class="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition">
                        <i data-lucide="download" class="w-4 h-4 inline mr-2"></i>
                        PDFダウンロード
                    </button>
                </div>

                <!-- 画像Export -->
                <div class="border-2 border-blue-300 rounded-lg p-4 hover:bg-blue-50 transition">
                    <h4 class="font-bold text-lg mb-2 flex items-center gap-2">
                        <i data-lucide="image" class="w-5 h-5 text-blue-600"></i>
                        画像形式でエクスポート
                    </h4>
                    <p class="text-sm text-gray-600 mb-3">
                        PNG形式。SNSや報告書への貼り付けに便利です。
                    </p>
                    <button
                        onclick="exportToImage()"
                        class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i data-lucide="download" class="w-4 h-4 inline mr-2"></i>
                        画像ダウンロード
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### JavaScript実装

```javascript
// CSVエクスポート
function exportToCSV() {
    const metric = metricInfo[currentSubCategory];
    const days = currentPeriods[1];
    const data = currentData[1];
    const labels = generateLabels(days);

    // CSVデータ作成
    const csvData = [];
    csvData.push(['日付', metric.name + ' (' + metric.unit + ')']);

    labels.forEach((label, index) => {
        csvData.push([label, data[index]]);
    });

    // 統計情報を追加
    csvData.push([]);
    csvData.push(['統計情報', '']);
    csvData.push(['平均', (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2)]);
    csvData.push(['最高', Math.max(...data).toFixed(2)]);
    csvData.push(['最低', Math.min(...data).toFixed(2)]);

    // CSVに変換
    const csv = Papa.unparse(csvData, {
        header: false
    });

    // ダウンロード
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM付きUTF-8
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${metric.name}_${days}日間_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('CSVファイルをダウンロードしました！');
    closeExportModal();
}

// PDFエクスポート
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const metric = metricInfo[currentSubCategory];
    const days = currentPeriods[1];
    const data = currentData[1];

    // タイトル
    pdf.setFontSize(20);
    pdf.text(`${metric.name} レポート`, 20, 20);

    pdf.setFontSize(12);
    pdf.text(`期間: 過去${days}日間`, 20, 30);
    pdf.text(`作成日: ${new Date().toLocaleDateString('ja-JP')}`, 20, 37);

    // 統計情報
    pdf.setFontSize(14);
    pdf.text('統計情報', 20, 50);
    pdf.setFontSize(11);
    const avg = (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1);
    const max = Math.max(...data).toFixed(1);
    const min = Math.min(...data).toFixed(1);
    pdf.text(`平均: ${avg}${metric.unit}`, 30, 58);
    pdf.text(`最高: ${max}${metric.unit}`, 30, 65);
    pdf.text(`最低: ${min}${metric.unit}`, 30, 72);

    // グラフをキャプチャ
    const chartElement = document.getElementById('main-chart-1');
    const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 20, 85, 170, 100);

    // ダウンロード
    pdf.save(`${metric.name}_レポート_${new Date().toISOString().split('T')[0]}.pdf`);

    alert('PDFファイルをダウンロードしました！');
    closeExportModal();
}

// 画像エクスポート
async function exportToImage() {
    const chartElement = document.getElementById('chart-1');
    const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff'
    });

    // PNG形式でダウンロード
    canvas.toBlob(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const metric = metricInfo[currentSubCategory];
        const days = currentPeriods[1];
        link.download = `${metric.name}_${days}日間_${new Date().toISOString().split('T')[0]}.png`;
        link.click();

        alert('画像ファイルをダウンロードしました！');
        closeExportModal();
    });
}

function openExportModal() {
    document.getElementById('export-modal').classList.add('show');
    lucide.createIcons();
}

function closeExportModal() {
    document.getElementById('export-modal').classList.remove('show');
}
```

---

### 2. 目標設定・進捗表示

#### モーダルHTML

```html
<!-- 目標設定モーダル -->
<div id="goal-setting-modal" class="modal">
    <div class="modal-content">
        <div class="sticky top-0 bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 rounded-t-lg">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <i data-lucide="target" class="w-5 h-5"></i>
                    <h3 class="text-lg font-bold">目標設定</h3>
                </div>
                <button onclick="closeGoalSettingModal()" class="p-1 hover:bg-white/20 rounded">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
        <div class="p-6">
            <div id="goal-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">指標を選択</label>
                    <select id="goal-metric" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="lbm">LBM（除脂肪体重）</option>
                        <option value="overall">総合分析スコア</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">目標値</label>
                    <input
                        type="number"
                        id="goal-value"
                        step="0.1"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="例: 65.0"
                    />
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">達成予定日</label>
                    <input
                        type="date"
                        id="goal-date"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                </div>

                <div class="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="show-goal-line"
                        class="w-4 h-4"
                        checked
                    />
                    <label for="show-goal-line" class="text-sm font-semibold text-gray-700">
                        グラフに目標ラインを表示
                    </label>
                </div>

                <button
                    onclick="saveGoal()"
                    class="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition font-semibold">
                    目標を保存
                </button>
            </div>

            <!-- 現在の目標表示 -->
            <div id="current-goals" class="mt-6 space-y-2">
                <h4 class="font-bold text-gray-800 mb-2">現在の目標一覧</h4>
                <!-- 動的に生成 -->
            </div>
        </div>
    </div>
</div>
```

#### JavaScript実装

```javascript
// 目標データを保存（LocalStorage）
let goals = {};

function loadGoals() {
    const stored = localStorage.getItem('fitness_goals');
    if (stored) {
        goals = JSON.parse(stored);
    }
}

function saveGoal() {
    const metric = document.getElementById('goal-metric').value;
    const value = parseFloat(document.getElementById('goal-value').value);
    const date = document.getElementById('goal-date').value;
    const showLine = document.getElementById('show-goal-line').checked;

    if (!value || !date) {
        alert('目標値と達成予定日を入力してください');
        return;
    }

    goals[metric] = {
        value: value,
        date: date,
        showLine: showLine,
        createdAt: new Date().toISOString()
    };

    localStorage.setItem('fitness_goals', JSON.stringify(goals));

    alert('目標を保存しました！');
    closeGoalSettingModal();

    // グラフを更新して目標ラインを表示
    updateChart(1);
    if (comparisonMode) {
        updateChart(2);
    }
}

// グラフ描画時に目標ラインを追加
function updateChart(chartNum) {
    // ... 既存のコード ...

    const metric = metricInfo[currentSubCategory];
    const goal = goals[currentSubCategory];

    const chartConfig = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: metric.name,
                data: data,
                borderColor: chartNum === 1 ? 'rgb(168, 85, 247)' : 'rgb(59, 130, 246)',
                backgroundColor: chartNum === 1 ? 'rgba(168, 85, 247, 0.6)' : 'rgba(59, 130, 246, 0.6)',
                fill: !metric.isBinary,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                annotation: goal && goal.showLine ? {
                    annotations: {
                        goalLine: {
                            type: 'line',
                            yMin: goal.value,
                            yMax: goal.value,
                            borderColor: 'rgb(34, 197, 94)',
                            borderWidth: 2,
                            borderDash: [10, 5],
                            label: {
                                content: `目標: ${goal.value}${metric.unit}`,
                                enabled: true,
                                position: 'end'
                            }
                        }
                    }
                } : {}
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: currentAxisRanges[chartNum].min,
                    max: currentAxisRanges[chartNum].max
                }
            }
        }
    };

    charts[chartNum] = new Chart(document.getElementById(`main-chart-${chartNum}`), chartConfig);
}

function openGoalSettingModal() {
    loadGoals();
    document.getElementById('goal-setting-modal').classList.add('show');

    // 現在の目標を表示
    displayCurrentGoals();
    lucide.createIcons();
}

function closeGoalSettingModal() {
    document.getElementById('goal-setting-modal').classList.remove('show');
}

function displayCurrentGoals() {
    const container = document.getElementById('current-goals');
    container.innerHTML = '<h4 class="font-bold text-gray-800 mb-2">現在の目標一覧</h4>';

    if (Object.keys(goals).length === 0) {
        container.innerHTML += '<p class="text-sm text-gray-500">設定された目標はありません</p>';
        return;
    }

    Object.keys(goals).forEach(metric => {
        const goal = goals[metric];
        const info = metricInfo[metric];
        const goalEl = document.createElement('div');
        goalEl.className = 'bg-green-50 p-3 rounded-lg border border-green-200';
        goalEl.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <div class="font-semibold text-gray-800">${info.icon} ${info.name}</div>
                    <div class="text-sm text-gray-600">目標: ${goal.value}${info.unit} （${goal.date}まで）</div>
                </div>
                <button onclick="deleteGoal('${metric}')" class="text-red-600 hover:text-red-800">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        container.appendChild(goalEl);
    });

    lucide.createIcons();
}

function deleteGoal(metric) {
    if (confirm('この目標を削除しますか？')) {
        delete goals[metric];
        localStorage.setItem('fitness_goals', JSON.stringify(goals));
        displayCurrentGoals();
        updateChart(1);
        if (comparisonMode) {
            updateChart(2);
        }
    }
}
```

**注意**: 目標ラインを表示するには、Chart.jsの`chartjs-plugin-annotation`プラグインが必要です：

```html
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.2.1"></script>
```

---

### 3. アノテーション（メモ）機能

#### グラフ上にメモマーカーを追加

```javascript
// メモデータ
let annotations = {};

function loadAnnotations() {
    const stored = localStorage.getItem('fitness_annotations');
    if (stored) {
        annotations = JSON.parse(stored);
    }
}

function addAnnotation(date, note) {
    const key = `${currentSubCategory}_${date}`;
    annotations[key] = {
        date: date,
        note: note,
        metric: currentSubCategory,
        createdAt: new Date().toISOString()
    };
    localStorage.setItem('fitness_annotations', JSON.stringify(annotations));
}

// グラフのクリックイベントでメモを追加
function setupChartClickHandler() {
    const canvas = document.getElementById('main-chart-1');
    canvas.addEventListener('click', (event) => {
        const chart = charts[1];
        const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);

        if (points.length > 0) {
            const index = points[0].index;
            const label = chart.data.labels[index];
            const value = chart.data.datasets[0].data[index];

            const note = prompt(`${label}のメモを入力してください（現在値: ${value}）`);
            if (note) {
                addAnnotation(label, note);
                updateChart(1);
                alert('メモを保存しました！');
            }
        }
    });
}

// Chart.jsの設定にアノテーションを追加
// ... updateChart関数内で
plugins: {
    annotation: {
        annotations: getAnnotationsForChart(labels)
    }
}

function getAnnotationsForChart(labels) {
    const result = {};
    labels.forEach((label, index) => {
        const key = `${currentSubCategory}_${label}`;
        if (annotations[key]) {
            result[`note_${index}`] = {
                type: 'point',
                xValue: index,
                yValue: currentData[1][index],
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                radius: 8,
                borderWidth: 2,
                borderColor: '#fff',
                label: {
                    content: '📝',
                    enabled: true
                }
            };
        }
    });
    return result;
}
```

---

### 4. カスタム期間選択

#### HTML追加

```html
<div class="mb-4 flex items-center gap-4">
    <div>
        <label class="text-xs text-gray-600 block mb-1">開始日</label>
        <input
            type="text"
            id="custom-start-date"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="日付を選択"
        />
    </div>
    <div>
        <label class="text-xs text-gray-600 block mb-1">終了日</label>
        <input
            type="text"
            id="custom-end-date"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="日付を選択"
        />
    </div>
    <button
        onclick="applyCustomPeriod()"
        class="mt-5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
        適用
    </button>
</div>
```

#### JavaScript実装

```javascript
// Flatpickr初期化
flatpickr("#custom-start-date", {
    locale: "ja",
    dateFormat: "Y-m-d",
    maxDate: "today"
});

flatpickr("#custom-end-date", {
    locale: "ja",
    dateFormat: "Y-m-d",
    maxDate: "today"
});

function applyCustomPeriod() {
    const startDate = document.getElementById('custom-start-date').value;
    const endDate = document.getElementById('custom-end-date').value;

    if (!startDate || !endDate) {
        alert('開始日と終了日を選択してください');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
        alert('終了日は開始日より後の日付を選択してください');
        return;
    }

    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // カスタム期間のデータを取得
    currentPeriods[1] = daysDiff;
    updateChart(1);
}
```

---

## 🟡 優先度: 中

### 5. 複数指標の重ね合わせ

```javascript
// チェックボックスで複数指標を選択
let selectedMetrics = ['lbm']; // デフォルトはLBMのみ

function toggleMetric(metric) {
    const index = selectedMetrics.indexOf(metric);
    if (index > -1) {
        selectedMetrics.splice(index, 1);
    } else {
        selectedMetrics.push(metric);
    }
    updateChart(1);
}

// updateChart関数内でdatasetsを複数追加
datasets: selectedMetrics.map((metric, index) => {
    const info = metricInfo[metric];
    const data = generateData(days)[metric];
    const colors = [
        'rgb(168, 85, 247)', // purple
        'rgb(59, 130, 246)',  // blue
        'rgb(34, 197, 94)'    // green
    ];

    return {
        label: info.name,
        data: data,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        yAxisID: `y${index + 1}`,
        tension: 0.4
    };
})
```

### 6. 移動平均線の表示

```javascript
// 移動平均計算
function calculateMovingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < windowSize - 1) {
            result.push(null); // 最初は計算できない
        } else {
            const sum = data.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / windowSize);
        }
    }
    return result;
}

// グラフに移動平均線を追加
datasets: [
    {
        label: metric.name,
        data: data,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4
    },
    {
        label: '7日移動平均',
        data: calculateMovingAverage(data, 7),
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0
    }
]
```

### 7. 週次・月次サマリー

```javascript
function generateWeeklySummary(data) {
    const weeks = [];
    for (let i = 0; i < data.length; i += 7) {
        const weekData = data.slice(i, i + 7);
        const avg = weekData.reduce((a, b) => a + b, 0) / weekData.length;
        weeks.push({
            week: Math.floor(i / 7) + 1,
            average: avg.toFixed(1),
            min: Math.min(...weekData).toFixed(1),
            max: Math.max(...weekData).toFixed(1)
        });
    }
    return weeks;
}

function displayWeeklySummary() {
    const summary = generateWeeklySummary(currentData[1]);
    const html = summary.map(week => `
        <div class="bg-blue-50 p-3 rounded-lg">
            <div class="font-semibold">第${week.week}週</div>
            <div class="text-sm text-gray-600">平均: ${week.average}</div>
            <div class="text-xs text-gray-500">最高${week.max} / 最低${week.min}</div>
        </div>
    `).join('');

    document.getElementById('weekly-summary').innerHTML = html;
}
```

### 8. グラフの画像保存

すでに「1. データエクスポート機能」の`exportToImage()`として実装済み。

---

## 📝 実装の優先順位

1. **まずv10.htmlを作成**: v9をコピー
2. **CDNライブラリを追加**: 上記のCDNを`<head>`に追加
3. **優先度高から順に実装**:
   - エクスポート機能（CSV/PDF/画像）
   - 目標設定・進捗表示
   - アノテーション（メモ）
   - カスタム期間選択
4. **優先度中を実装**:
   - 複数指標の重ね合わせ
   - 移動平均線
   - 週次・月次サマリー

---

## 🚀 動作確認

1. ブラウザで`history_redesign_graph_03_dashboard_style_v10.html`を開く
2. 各機能ボタン（目標設定、エクスポート）をクリックして動作確認
3. CSVをダウンロードしてExcelで開く
4. PDFをダウンロードして確認
5. 目標ラインがグラフに表示されるか確認

---

## ⚠️ 注意事項

- **chart.js-plugin-annotation**: 目標ライン表示にはこのプラグインが必須
- **日本語フォント**: PDF生成時に日本語を使う場合は、jsPDFに日本語フォントを追加する必要あり
- **ブラウザ互換性**: html2canvasは一部のCSSに対応していない可能性あり
- **LocalStorage容量制限**: データが大きくなる場合はIndexedDBへの移行を検討

---

以上で、v10の全機能実装ガイドは完了です！
