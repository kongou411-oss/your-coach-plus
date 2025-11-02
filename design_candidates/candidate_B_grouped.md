# 候補B：グループ化案（機能性重視）

**作成日**: 2025年11月2日
**コンセプト**: 「関連情報を折りたたみ、必要な時だけ展開」

---

## 📐 設計思想

### 絶対基準
- ✅ **面倒さの排除**: 折りたたみで1画面の情報量削減
- ✅ **使い方明瞭**: アコーディオンUIは直感的
- ✅ **効果明瞭**: サマリー表示で概要が一目でわかる

### 特徴
1. **アコーディオン式セクション** → 体組成と記録を折りたたみ可能
2. **サマリー表示** → ヘッダーに要約情報を表示
3. **±ボタン維持** → 素早い調整が可能
4. **統一されたボタンサイズ体系** → Large/Medium/Small

---

## 🎨 レイアウト構造

```jsx
<div className="space-y-3 pb-[180px]">
  {/* 体組成セクション */}
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
    {/* アコーディオンヘッダー */}
    <button
      onClick={() => toggleSection('bodyComp')}
      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Icon name="User" size={20} className="text-indigo-600" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-bold text-gray-900">体組成</h3>
          <p className="text-xs text-gray-500">70.0kg / 15.0% / LBM 59.5kg</p>
        </div>
      </div>
      <Icon
        name={expandedSections.bodyComp ? "ChevronUp" : "ChevronDown"}
        size={20}
        className="text-gray-400"
      />
    </button>

    {/* アコーディオンコンテンツ */}
    {expandedSections.bodyComp && (
      <div className="px-6 pb-6 space-y-3 border-t border-gray-100 pt-4">
        {/* 体重入力 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <label className="text-xs font-medium text-gray-600 mb-2 block">体重</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustValue('weight', -1)}
              className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            >
              <Icon name="Minus" size={16} />
            </button>
            <input
              type="number"
              value={70.0}
              className="flex-1 h-10 px-4 bg-white border border-gray-200 rounded-lg text-center text-lg font-bold"
            />
            <span className="text-sm text-gray-500 w-8">kg</span>
            <button
              onClick={() => adjustValue('weight', 1)}
              className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            >
              <Icon name="Plus" size={16} />
            </button>
          </div>
        </div>

        {/* 体脂肪率入力 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <label className="text-xs font-medium text-gray-600 mb-2 block">体脂肪率</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustValue('bodyFat', -0.1)}
              className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            >
              <Icon name="Minus" size={16} />
            </button>
            <input
              type="number"
              value={15.0}
              step="0.1"
              className="flex-1 h-10 px-4 bg-white border border-gray-200 rounded-lg text-center text-lg font-bold"
            />
            <span className="text-sm text-gray-500 w-8">%</span>
            <button
              onClick={() => adjustValue('bodyFat', 0.1)}
              className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            >
              <Icon name="Plus" size={16} />
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* 記録セクション */}
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
    {/* アコーディオンヘッダー */}
    <button
      onClick={() => toggleSection('records')}
      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
          <Icon name="ClipboardList" size={20} className="text-green-600" />
        </div>
        <div className="text-left">
          <h3 className="text-sm font-bold text-gray-900">今日の記録</h3>
          <p className="text-xs text-gray-500">食事 1件 / 運動 0件</p>
        </div>
      </div>
      <Icon
        name={expandedSections.records ? "ChevronUp" : "ChevronDown"}
        size={20}
        className="text-gray-400"
      />
    </button>

    {/* アコーディオンコンテンツ */}
    {expandedSections.records && (
      <div className="border-t border-gray-100">
        {/* 食事タブ */}
        <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="UtensilsCrossed" size={16} className="text-green-600" />
            <span className="text-xs font-medium text-gray-700">食事</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">1</span>
          </div>
          <button
            onClick={() => openAddModal('meal')}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition"
          >
            + 追加
          </button>
        </div>

        {/* 食事アイテム */}
        <div className="divide-y divide-gray-100">
          <div className="px-6 py-4 flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">10:42</span>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                鶏もも肉（皮なし生）
              </div>
              <div className="text-xs text-gray-500">100g</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-base font-bold text-gray-900">105</div>
                <div className="text-xs text-gray-500">kcal</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => editItem('meal', id)}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition"
                  title="編集"
                >
                  <Icon name="Edit" size={14} />
                </button>
                <button
                  onClick={() => deleteItem('meal', id)}
                  className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
                  title="削除"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 運動タブ */}
        <div className="px-6 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Icon name="Activity" size={16} className="text-orange-600" />
            <span className="text-xs font-medium text-gray-700">運動</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">0</span>
          </div>
          <button
            onClick={() => openAddModal('workout')}
            className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700 transition"
          >
            + 追加
          </button>
        </div>

        {/* 空状態 */}
        <div className="px-6 py-6 text-center bg-white">
          <Icon name="Activity" size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">運動の記録がありません</p>
        </div>
      </div>
    )}
  </div>
</div>
```

---

## 🔄 ボタン配置の変更点

### Before → After

| Before | After | ボタン数 | 理由 |
|--------|-------|----------|------|
| ±ボタン常時表示 | 折りたたみ内に配置 | 変更なし | 必要な時だけ表示 |
| 小さい編集・削除アイコン | w-8 h-8の大きめボタン | 改善 | タップしやすさ向上 |
| セクション分離 | アコーディオンで統合 | - | 1画面の情報量削減 |

---

## 🎨 フレーム・カードデザイン

### 統一ボタンサイズ体系

```css
/* Large - 主要CTA */
.btn-large {
  @apply py-3 px-6 text-base font-bold rounded-lg;
}

/* Medium - 標準 */
.btn-medium {
  @apply py-2 px-4 text-sm font-medium rounded-lg;
}

/* Small - 補助 */
.btn-small {
  @apply py-1 px-3 text-xs font-medium rounded-lg;
}

/* Icon Button - Large */
.btn-icon-large {
  @apply w-12 h-12 rounded-xl;
}

/* Icon Button - Medium */
.btn-icon-medium {
  @apply w-10 h-10 rounded-lg;
}

/* Icon Button - Small */
.btn-icon-small {
  @apply w-8 h-8 rounded-lg;
}
```

### アコーディオンスタイル

```css
/* アコーディオンヘッダー */
.accordion-header {
  @apply w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition;
}

/* アコーディオンコンテンツ */
.accordion-content {
  @apply px-6 pb-6 space-y-3 border-t border-gray-100 pt-4;
}

/* セクションアイコン背景 */
.section-icon-bg {
  @apply w-10 h-10 rounded-xl flex items-center justify-center;
}

/* サマリーテキスト */
.summary-text {
  @apply text-xs text-gray-500;
}
```

---

## 🎨 色分けルール

```javascript
// セクション別アイコン背景
const SECTION_COLORS = {
  bodyComp: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    accent: 'indigo-600',
  },
  records: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    accent: 'green-600',
  },
  meal: {
    bg: 'bg-green-50',
    button: 'bg-green-600 hover:bg-green-700',
    badge: 'bg-green-100 text-green-700',
    icon: 'text-green-600',
  },
  workout: {
    bg: 'bg-orange-50',
    button: 'bg-orange-600 hover:bg-orange-700',
    badge: 'bg-gray-100 text-gray-600', // 0件の場合
    badgeActive: 'bg-orange-100 text-orange-700', // 1件以上
    icon: 'text-orange-600',
  },
  supplement: {
    bg: 'bg-blue-50',
    button: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600',
  },
  condition: {
    bg: 'bg-purple-50',
    button: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-purple-100 text-purple-700',
    icon: 'text-purple-600',
  },
};

// ボタン状態別色
const BUTTON_STATES = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  success: 'bg-green-600 text-white hover:bg-green-700',
  warning: 'bg-orange-600 text-white hover:bg-orange-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
};

// バッジ色
const BADGE_COLORS = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  premium: 'bg-purple-100 text-purple-700',
};
```

---

## 📊 表示情報の優先順位

### 優先度1（最重要 - ヘッダーに常時表示）
- **セクション名**: sm、太字
- **サマリー情報**: xs、グレー
  - 体組成: 70.0kg / 15.0% / LBM 59.5kg
  - 記録: 食事 1件 / 運動 0件

### 優先度2（重要 - 展開時に表示）
- **数値入力**: lg、太字
- **カロリー**: base、太字
- **食品名**: sm、太字

### 優先度3（補足 - 展開時に表示）
- **時刻**: xs、グレー
- **分量**: xs、グレー
- **ラベル**: xs、グレー

---

## 📱 モックアップ（テキストベース）

### 折りたたみ時（デフォルト）

```
┌─────────────────────────────────┐
│ 📅 2025年11月2日（土）          │
├─────────────────────────────────┤
│ 👤 体組成                    ∨ │
│    70.0kg / 15.0% / LBM 59.5kg  │
├─────────────────────────────────┤
│ 📋 今日の記録                ∨ │
│    食事 1件 / 運動 0件          │
└─────────────────────────────────┘
```

### 展開時

```
┌─────────────────────────────────┐
│ 📅 2025年11月2日（土）          │
├─────────────────────────────────┤
│ 👤 体組成                    ∧ │
│    70.0kg / 15.0% / LBM 59.5kg  │
├─────────────────────────────────┤
│   ┌─ 体重 ─────────────────┐   │
│   │ [-]  70.0  kg  [+]     │   │
│   └────────────────────────┘   │
│   ┌─ 体脂肪率 ─────────────┐   │
│   │ [-]  15.0  %   [+]     │   │
│   └────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│ 📋 今日の記録                ∧ │
│    食事 1件 / 運動 0件          │
├─────────────────────────────────┤
│  🍽️ 食事 ①          [+ 追加]   │
│  ─────────────────────────────  │
│  10:42              105  [📝][🗑]│
│  鶏もも肉（皮なし生）   kcal     │
│  100g                           │
│  ─────────────────────────────  │
│  🏃 運動 ⓪          [+ 追加]   │
│  ─────────────────────────────  │
│         💤                      │
│   運動の記録がありません         │
└─────────────────────────────────┘
```

---

## ✅ メリット

### 1. 画面がスッキリ
- デフォルトで折りたたみ → 2行で完結
- 1画面の情報量が少ない
- スクロール量削減

### 2. サマリー表示で概要把握
- ヘッダーに要約情報
- 展開せずに確認可能
- 効率的な情報設計

### 3. ±ボタン維持
- 素早い調整が可能
- 既存ユーザーの習慣維持
- 学習コスト低い

### 4. 件数バッジ
- 一目で件数がわかる
- 視覚的フィードバック
- モチベーション向上

### 5. 編集・削除ボタンが大きい
- w-8 h-8で十分なサイズ
- タップしやすい
- 誤タップ減少

### 6. 設計思想への適合
- **面倒さの排除**: ✅ 90点
- **使い方明瞭**: ✅ 95点
- **効果明瞭**: ✅ 90点

---

## ⚠️ デメリット

### 1. 展開する手間
- **問題**: 情報を見るために1タップ必要
- **対策**: デフォルトの展開状態をLocalStorageに保存
- **影響度**: 中

### 2. 初見では全体像が不明
- **問題**: 折りたたみ時は詳細が見えない
- **対策**: サマリー情報を充実させる
- **影響度**: 低（サマリーで十分な情報）

### 3. ボタン数は変わらない
- **問題**: ±ボタンが残るため、ボタン数削減効果なし
- **対策**: 折りたたみで視覚的な負担は軽減
- **影響度**: 低（必要な時だけ表示）

---

## 📐 実装の詳細

### アコーディオンの状態管理

```jsx
const DashboardView = () => {
  // セクションの展開状態
  const [expandedSections, setExpandedSections] = React.useState(() => {
    // LocalStorageから復元
    const saved = localStorage.getItem('expandedSections');
    return saved ? JSON.parse(saved) : {
      bodyComp: true,  // デフォルトで展開
      records: true,   // デフォルトで展開
    };
  });

  // セクション切り替え
  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const next = { ...prev, [section]: !prev[section] };
      // LocalStorageに保存
      localStorage.setItem('expandedSections', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-3 pb-[180px]">
      {/* 体組成セクション */}
      <AccordionSection
        id="bodyComp"
        icon="User"
        iconBg="bg-indigo-50"
        iconColor="text-indigo-600"
        title="体組成"
        summary="70.0kg / 15.0% / LBM 59.5kg"
        expanded={expandedSections.bodyComp}
        onToggle={() => toggleSection('bodyComp')}
      >
        {/* コンテンツ */}
      </AccordionSection>

      {/* 記録セクション */}
      <AccordionSection
        id="records"
        icon="ClipboardList"
        iconBg="bg-green-50"
        iconColor="text-green-600"
        title="今日の記録"
        summary="食事 1件 / 運動 0件"
        expanded={expandedSections.records}
        onToggle={() => toggleSection('records')}
      >
        {/* コンテンツ */}
      </AccordionSection>
    </div>
  );
};
```

### アコーディオンコンポーネント

```jsx
const AccordionSection = ({
  id,
  icon,
  iconBg,
  iconColor,
  title,
  summary,
  expanded,
  onToggle,
  children
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
        aria-expanded={expanded}
        aria-controls={`${id}-content`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon name={icon} size={20} className={iconColor} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{summary}</p>
          </div>
        </div>
        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          size={20}
          className="text-gray-400 transition-transform"
        />
      </button>

      {/* コンテンツ */}
      {expanded && (
        <div
          id={`${id}-content`}
          className="px-6 pb-6 space-y-3 border-t border-gray-100 pt-4"
        >
          {children}
        </div>
      )}
    </div>
  );
};
```

### 体重・体脂肪率入力コンポーネント

```jsx
const MetricInput = ({ label, value, onChange, unit, step = 1 }) => {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <label className="text-xs font-medium text-gray-600 mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - step))}
          className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          aria-label={`${label}を${step}減らす`}
        >
          <Icon name="Minus" size={16} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          className="flex-1 h-10 px-4 bg-white border border-gray-200 rounded-lg text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={label}
        />
        <span className="text-sm text-gray-500 w-8">{unit}</span>
        <button
          onClick={() => onChange(value + step)}
          className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
          aria-label={`${label}を${step}増やす`}
        >
          <Icon name="Plus" size={16} />
        </button>
      </div>
    </div>
  );
};

// 使用例
<MetricInput
  label="体重"
  value={weight}
  onChange={setWeight}
  unit="kg"
  step={1}
/>
<MetricInput
  label="体脂肪率"
  value={bodyFat}
  onChange={setBodyFat}
  unit="%"
  step={0.1}
/>
```

---

## 📊 実装優先度

| タスク | 優先度 | 工数 | 必要性 |
|-------|--------|------|--------|
| アコーディオン実装 | 🔴 最優先 | 小 | 必須 |
| 状態管理（LocalStorage） | 🔴 高 | 小 | 必須 |
| ボタンサイズ統一 | 🔴 高 | 小 | 必須 |
| バッジ表示 | 🟡 中 | 小 | 推奨 |
| アニメーション | 🟢 低 | 小 | オプション |

---

## 🎯 総合評価

### 設計思想への適合度: **90/100点**

| 基準 | スコア | 評価 |
|------|--------|------|
| 面倒さの排除 | 90/100 | ✅ 折りたたみで情報量削減 |
| 使い方明瞭 | 95/100 | ✅ アコーディオンは直感的 |
| 効果明瞭 | 90/100 | ✅ サマリーで概要把握 |
| 見やすさ | 85/100 | ✅ 折りたたみ時はスッキリ |
| 分かりやすさ | 95/100 | ✅ 一般的なUIパターン |

### 推奨度: ⭐⭐⭐⭐（4/5）

**理由**:
- 実装が容易（工数少）
- 一般的なUIパターンで学習コスト低い
- ±ボタン維持で既存ユーザーに優しい
- サマリー表示で効率的

---

## 📝 実装時の注意点

### 1. アニメーション
- 展開・折りたたみは0.3秒以内
- ease-in-out を使用
- height: auto は避け、max-height を使用

### 2. 状態管理
- LocalStorageに保存して状態を維持
- デフォルトは展開状態
- ユーザーの好みを記憶

### 3. アクセシビリティ
- aria-expanded 属性を設定
- aria-controls で関連付け
- キーボード操作に対応（Enter/Space）

### 4. パフォーマンス
- 展開時のコンテンツは条件付きレンダリング
- display: none ではなく未マウントに

---

**最終更新**: 2025年11月2日
**推奨実装フェーズ**: Phase 1-2（優先度高）
