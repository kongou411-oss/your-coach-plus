# 履歴改修デザイン候補

## 概要

履歴機能を改修し、以下の項目をカテゴリ別・折り畳み式で表示する3つのデザイン候補を提案します。

## 表示項目

### 栄養・食事カテゴリ
1. 分析点数（0-100点）
2. 摂取カロリー（kcal）
3. タンパク質（g、達成率%）
4. 脂質（g、達成率%）
5. 糖質（g、達成率%）
6. 食物繊維（g、達成率%）
7. ビタミン総合達成率（%）
8. ミネラル総合達成率（%）

### トレーニングカテゴリ
1. 回数別RM記録（種目・RM・重量・先週比）
2. 運動習慣率（%、週間実施日数）

### コンディションカテゴリ
1. コンディションスコア（最大30点）
   - 睡眠の質（/10）
   - 食欲（/10）
   - 集中力（/10）

---

## デザイン候補

### 案1: シンプル・カード型
**ファイル**: `history_redesign_01_simple_card.html`

**特徴**:
- カテゴリごとに色分けされたカード
- モバイルフレンドリーな縦配置
- 項目は箇条書き形式

**メリット**:
- ✅ 視認性が高く、スクロール量が少ない
- ✅ カテゴリごとに色分け可能（栄養=緑、トレーニング=赤、コンディション=青）
- ✅ グラフ表示との相性が良い

**デメリット**:
- ⚠️ カテゴリ数が少ないため、やや単調

---

### 案2: タブ式・データテーブル型
**ファイル**: `history_redesign_02_tabbed_table.html`

**特徴**:
- タブでカテゴリを切り替え
- Excelライクな表形式
- 「今日」「目標」「達成率」を並列表示

**メリット**:
- ✅ データの比較が直感的
- ✅ 数値が多い場合でも整理しやすい
- ✅ 「目標」「達成率」を並列表示できる

**デメリット**:
- ⚠️ モバイルで表形式は見づらい可能性
- ⚠️ タップ領域が小さくなりがち

---

### 案3: アコーディオン式・プログレスバー型 ⭐ **推奨**
**ファイル**: `history_redesign_03_accordion_progress.html`

**特徴**:
- 折り畳み式のアコーディオン
- 各項目にプログレスバーを表示
- 先週比の変化を表示（RM記録など）

**メリット**:
- ✅ **視覚的に最もわかりやすい**（プログレスバー）
- ✅ モバイルで操作しやすい（大きなタップ領域）
- ✅ 折り畳み時はスッキリ、展開時は詳細表示
- ✅ 先週比や変化を表示できる（RM記録など）

**デメリット**:
- ⚠️ 実装がやや複雑
- ⚠️ プログレスバーの色設定が必要

---

## 推奨案: 案3（アコーディオン式・プログレスバー型）

### 推奨理由

1. **モバイルファースト**: タップ領域が大きく、操作しやすい
2. **視覚的直感性**: プログレスバーで達成率が一目瞭然
3. **情報密度**: 折り畳み時はスッキリ、展開時は詳細
4. **拡張性**: RM記録の週比較など、詳細データを追加しやすい
5. **現代的UI**: 多くのフィットネスアプリで採用されているパターン

---

## プレビュー方法

各HTMLファイルをブラウザで開いてデザインを確認してください。

```bash
# ローカルサーバーで確認
python -m http.server 8000
# ブラウザで以下を開く
# http://localhost:8000/design_candidates/history_redesign_01_simple_card.html
# http://localhost:8000/design_candidates/history_redesign_02_tabbed_table.html
# http://localhost:8000/design_candidates/history_redesign_03_accordion_progress.html
```

---

## 実装時の注意事項

### データ構造

```javascript
// 履歴データの構造例
const historyData = {
  nutrition: {
    analysisScore: 85,
    calories: { actual: 2450, target: 2500, rate: 98 },
    protein: { actual: 150, target: 160, rate: 94 },
    fat: { actual: 65, target: 70, rate: 93 },
    carbs: { actual: 280, target: 300, rate: 93 },
    fiber: { actual: 25, target: 30, rate: 83 },
    vitaminRate: 78,
    mineralRate: 82
  },
  training: {
    rmRecords: [
      { exercise: 'ベンチプレス', rm: 1, weight: 100, change: +2 },
      { exercise: 'スクワット', rm: 5, weight: 120, change: 0 },
      { exercise: 'デッドリフト', rm: 3, weight: 150, change: +5 }
    ],
    exerciseHabitRate: 85, // %
    weeklyDays: 6
  },
  condition: {
    totalScore: 24,
    maxScore: 30,
    details: {
      sleep: 8,
      appetite: 8,
      focus: 8
    }
  }
};
```

### プログレスバーの色設定

- **90%以上**: 緑 (`bg-green-500`)
- **70-89%**: 黄色 (`bg-yellow-400`)
- **70%未満**: 赤 (`bg-red-500`)

### アニメーション

- アコーディオンの展開/折り畳み: `max-height` トランジション
- プログレスバーの表示: `width` アニメーション
- 項目のフェードイン: `opacity` + `translateY` アニメーション

---

## 関連ファイル

- **実装対象**: `components/05_analysis.js`（AnalysisView内の履歴表示部分）
- **参考**: `components/03_dashboard.js`（ダッシュボードの履歴表示）

---

**作成日**: 2025年10月15日
**更新日**: 2025年10月15日
