# 候補A：ミニマリスト案（シンプル重視）

**作成日**: 2025年11月2日
**コンセプト**: 「タップだけで完結。ボタンは最小限」

---

## 📐 設計思想

### 絶対基準
- ✅ **面倒さの排除**: ボタン数を8個→2個に削減
- ✅ **使い方明瞭**: タップ操作のみ、スワイプは補助
- ✅ **効果明瞭**: 大きな数値で一目で理解

### 特徴
1. **体重・体脂肪率の±ボタン削除** → カード全体をタップで編集モーダル
2. **編集・削除アイコン削除** → カードタップで編集、左スワイプで削除
3. **余白を広く** → 1画面の情報量を削減
4. **統一されたカードフレーム** → rounded-2xl、shadow-sm

---

## 🎨 レイアウト構造

```jsx
<div className="space-y-4 pb-[180px]">
  {/* 体組成カード - 統合型 */}
  <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-500">体組成</h3>
      <span className="text-xs text-indigo-600">LBM: 59.5kg</span>
    </div>

    {/* 体重 - タップで編集 */}
    <button
      onClick={() => openEditModal('weight')}
      className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-1">体重</div>
          <div className="text-3xl font-bold text-gray-900">
            70.0 <span className="text-lg text-gray-500">kg</span>
          </div>
        </div>
        <Icon name="ChevronRight" size={20} className="text-gray-400" />
      </div>
    </button>

    {/* 体脂肪率 - タップで編集 */}
    <button
      onClick={() => openEditModal('bodyFat')}
      className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-1">体脂肪率</div>
          <div className="text-3xl font-bold text-gray-900">
            15.0 <span className="text-lg text-gray-500">%</span>
          </div>
        </div>
        <Icon name="ChevronRight" size={20} className="text-gray-400" />
      </div>
    </button>
  </div>

  {/* 食事カード */}
  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon name="UtensilsCrossed" size={18} className="text-green-600" />
        <h3 className="text-sm font-medium text-gray-900">食事</h3>
      </div>
      <button
        onClick={() => openAddModal('meal')}
        className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition"
      >
        + 追加
      </button>
    </div>

    {/* 食事アイテム - タップで編集 */}
    <div className="divide-y divide-gray-100">
      <button
        onClick={() => openEditModal('meal', mealId)}
        className="w-full text-left px-6 py-4 hover:bg-gray-50 transition group"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">10:42</div>
            <div className="text-sm font-medium text-gray-900">
              鶏もも肉（皮なし生）
            </div>
            <div className="text-xs text-gray-500 mt-1">100g</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              105 <span className="text-sm font-normal text-gray-500">kcal</span>
            </div>
            <Icon
              name="ChevronRight"
              size={16}
              className="text-gray-400 opacity-0 group-hover:opacity-100 transition ml-auto mt-1"
            />
          </div>
        </div>
      </button>
    </div>
  </div>

  {/* 運動カード */}
  <div className="bg-white rounded-2xl shadow-sm">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon name="Activity" size={18} className="text-orange-600" />
        <h3 className="text-sm font-medium text-gray-900">運動</h3>
      </div>
      <button
        onClick={() => openAddModal('workout')}
        className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-100 transition"
      >
        + 追加
      </button>
    </div>

    <div className="px-6 py-8 text-center">
      <Icon name="Activity" size={32} className="text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-400">運動の記録がありません</p>
    </div>
  </div>
</div>
```

---

## 🔄 ボタン配置の変更点

### Before → After

| Before | After | ボタン数 | 理由 |
|--------|-------|----------|------|
| 体重の±1/±0.1ボタン（4個） | カード全体がボタン | 4個→0個 | UI簡素化、誤タップ防止 |
| 体脂肪率の±1/±0.1ボタン（4個） | カード全体がボタン | 4個→0個 | 同上 |
| 食事の編集アイコン | カードタップで編集 | 1個→0個 | タップ領域拡大 |
| 食事の削除アイコン | 左スワイプで削除 | 1個→0個 | iOS標準UI準拠 |
| **合計** | **8個以上 → 2個** | **削減率75%** | **シンプル化達成** |

---

## 🎨 フレーム・カードデザイン

### 統一カードフレーム

```css
/* 基本カード */
.card-base {
  @apply bg-white rounded-2xl shadow-sm;
}

/* タップ可能カード */
.card-tappable {
  @apply card-base hover:shadow-md transition-shadow duration-200;
}

/* タップ可能な内部要素 */
.card-item-tappable {
  @apply w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition;
}

/* セクションヘッダー */
.section-header {
  @apply px-6 py-4 border-b border-gray-100 flex items-center justify-between;
}

/* 数値表示（大） */
.metric-large {
  @apply text-3xl font-bold text-gray-900;
}

/* 数値表示（単位） */
.metric-unit {
  @apply text-lg text-gray-500 font-normal;
}

/* ラベル */
.label-small {
  @apply text-xs text-gray-500;
}

/* アイコンボタン */
.icon-chevron {
  @apply text-gray-400;
}

.icon-chevron-hover {
  @apply text-gray-400 opacity-0 group-hover:opacity-100 transition;
}
```

### 統一ボタンスタイル

```css
/* 追加ボタン（Small） */
.btn-add-small {
  @apply px-3 py-1.5 rounded-lg text-xs font-medium transition;
}

/* 機能別色 */
.btn-add-meal {
  @apply btn-add-small bg-green-50 text-green-600 hover:bg-green-100;
}

.btn-add-workout {
  @apply btn-add-small bg-orange-50 text-orange-600 hover:bg-orange-100;
}

.btn-add-supplement {
  @apply btn-add-small bg-blue-50 text-blue-600 hover:bg-blue-100;
}

.btn-add-condition {
  @apply btn-add-small bg-purple-50 text-purple-600 hover:bg-purple-100;
}
```

---

## 🎨 色分けルール

```javascript
const COLOR_SCHEME = {
  // 基本色
  background: {
    page: 'bg-gray-50',
    card: 'bg-white',
    cardItem: 'bg-gray-50',
    cardItemHover: 'bg-gray-100',
  },

  // 境界線
  border: {
    light: 'border-gray-100',
    medium: 'border-gray-200',
  },

  // テキスト
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-500',
    tertiary: 'text-gray-400',
  },

  // 機能別アクセントカラー
  bodyComposition: {
    primary: 'text-indigo-600',
    bg: 'bg-gray-50',
  },

  meal: {
    primary: 'text-green-600',
    bg: 'bg-green-50',
    bgHover: 'bg-green-100',
    icon: 'text-green-600',
  },

  workout: {
    primary: 'text-orange-600',
    bg: 'bg-orange-50',
    bgHover: 'bg-orange-100',
    icon: 'text-orange-600',
  },

  supplement: {
    primary: 'text-blue-600',
    bg: 'bg-blue-50',
    bgHover: 'bg-blue-100',
    icon: 'text-blue-600',
  },

  condition: {
    primary: 'text-purple-600',
    bg: 'bg-purple-50',
    bgHover: 'bg-purple-100',
    icon: 'text-purple-600',
  },

  // シャドウ
  shadow: {
    card: 'shadow-sm',
    cardHover: 'shadow-md',
  },

  // 角丸
  rounded: {
    card: 'rounded-2xl',
    item: 'rounded-xl',
    button: 'rounded-lg',
  },
};
```

---

## 📊 表示情報の優先順位

### 優先度1（最重要）
- **体重**: 3xl、太字、最も目立つ
- **体脂肪率**: 3xl、太字
- **カロリー**: lg、太字

### 優先度2（重要）
- **時刻**: xs、グレー
- **食品名**: sm、太字
- **分量**: xs、グレー

### 優先度3（補足）
- **LBM**: xs、インディゴ
- **単位**: lg/sm、グレー

---

## 📱 モックアップ（テキストベース）

```
┌─────────────────────────────────┐
│ 📅 2025年11月2日（土）          │
├─────────────────────────────────┤
│                                 │
│  体組成          LBM: 59.5kg    │
│  ┌───────────────────────────┐  │
│  │ 体重                     ＞│  │
│  │ 70.0 kg                   │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 体脂肪率                 ＞│  │
│  │ 15.0 %                    │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ 🍽️ 食事              [+ 追加]   │
├─────────────────────────────────┤
│ 10:42                           │
│ 鶏もも肉（皮なし生）        105 │
│ 100g                       kcal │
│                              ＞ │
├─────────────────────────────────┤
│ 🏃 運動              [+ 追加]   │
├─────────────────────────────────┤
│        💤                       │
│   運動の記録がありません         │
│                                 │
└─────────────────────────────────┘
```

---

## 🎯 操作フロー

### 体重・体脂肪率の編集

1. **タップ**: カード全体をタップ
2. **モーダル表示**: 編集モーダルが開く
   ```
   ┌─────────────────────┐
   │ 体重を編集      [×] │
   ├─────────────────────┤
   │                     │
   │  [-1] 70.0 kg [+1]  │
   │  [-0.1]      [+0.1] │
   │                     │
   │     [キャンセル] [保存]    │
   └─────────────────────┘
   ```
3. **保存**: モーダル内で調整して保存

### 食事の編集・削除

#### パターン1: タップで編集
1. **タップ**: アイテムカードをタップ
2. **編集モーダル表示**: 詳細編集画面

#### パターン2: スワイプで削除（オプション）
1. **左スワイプ**: アイテムカードを左にスワイプ
2. **削除ボタン表示**: 赤い削除ボタンが出現
3. **削除**: ボタンをタップで削除

---

## ✅ メリット

### 1. UI簡素化
- ボタン数が8個以上→2個に削減
- 画面がスッキリして見やすい
- 誤タップのリスク低減

### 2. タップ領域拡大
- カード全体がタップ可能
- 操作しやすい（特にモバイル）
- 高齢者・初心者に優しい

### 3. 視認性向上
- 大きな数値（3xl）で見やすい
- 重要情報が一目でわかる
- 余白が広く疲れにくい

### 4. モダンなUIパターン
- iOS標準UIに準拠
- 他のアプリとの一貫性
- 学習コスト低減

### 5. 設計思想への適合
- **面倒さの排除**: ✅ 95点
- **使い方明瞭**: ✅ 90点
- **効果明瞭**: ✅ 95点

---

## ⚠️ デメリット

### 1. 素早い調整ができない
- **問題**: ±1ボタンがないため、微調整が面倒
- **対策**: 編集モーダル内に±ボタンを配置
- **影響度**: 中（頻繁に調整するユーザーには不便）

### 2. スワイプ操作の学習コスト
- **問題**: 削除方法を知らないと困る可能性
- **対策**:
  - 初回使用時にツールチップ表示
  - ヘルプモーダルへのリンク
  - タップでも削除可能にする（編集モーダル内）
- **影響度**: 低（タップでも削除可能）

### 3. モーダルの増加
- **問題**: タップするたびにモーダルが開く
- **対策**: モーダルは軽量に、アニメーションを短く
- **影響度**: 低（0.3秒以下なら許容範囲）

---

## 📐 実装の詳細

### 編集モーダルの設計

```jsx
// 体重編集モーダル
const WeightEditModal = ({ currentWeight, onSave, onClose }) => {
  const [weight, setWeight] = React.useState(currentWeight);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">体重を編集</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* 入力エリア */}
        <div className="space-y-4 mb-6">
          {/* ±1 調整 */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setWeight(w => Math.max(0, w - 1))}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition"
            >
              -1
            </button>
            <div className="text-4xl font-bold text-gray-900 min-w-[120px] text-center">
              {weight.toFixed(1)} <span className="text-lg text-gray-500">kg</span>
            </div>
            <button
              onClick={() => setWeight(w => w + 1)}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition"
            >
              +1
            </button>
          </div>

          {/* ±0.1 調整 */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setWeight(w => Math.max(0, w - 0.1))}
              className="w-12 h-12 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium transition"
            >
              -0.1
            </button>
            <div className="min-w-[120px]"></div>
            <button
              onClick={() => setWeight(w => w + 0.1)}
              className="w-12 h-12 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-medium transition"
            >
              +0.1
            </button>
          </div>

          {/* 直接入力 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">または直接入力</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              step="0.1"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            キャンセル
          </button>
          <button
            onClick={() => onSave(weight)}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
```

### スワイプ削除の実装（オプション）

```jsx
// スワイプ削除のサンプル実装
const SwipeableItem = ({ children, onDelete }) => {
  const [offsetX, setOffsetX] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);

  const handleTouchStart = (e) => {
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const newOffset = Math.min(0, touch.clientX - startX);
    setOffsetX(newOffset);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX < -100) {
      // 削除トリガー
      setShowDelete(true);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="transition-transform"
        style={{ transform: `translateX(${offsetX}px)` }}
      >
        {children}
      </div>

      {/* 削除ボタン */}
      <button
        onClick={onDelete}
        className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 text-white flex items-center justify-center"
        style={{ transform: `translateX(${offsetX < -100 ? 0 : 100}%)` }}
      >
        <Icon name="Trash2" size={20} />
      </button>
    </div>
  );
};
```

---

## 📊 実装優先度

| タスク | 優先度 | 工数 | 必要性 |
|-------|--------|------|--------|
| カードのタップ化 | 🔴 最優先 | 中 | 必須 |
| 編集モーダル実装 | 🔴 最優先 | 中 | 必須 |
| スタイル統一 | 🔴 高 | 小 | 必須 |
| スワイプ削除 | 🟡 中 | 大 | オプション |
| ツールチップ | 🟢 低 | 小 | 推奨 |

---

## 🎯 総合評価

### 設計思想への適合度: **95/100点**

| 基準 | スコア | 評価 |
|------|--------|------|
| 面倒さの排除 | 95/100 | ✅ ボタン数75%削減 |
| 使い方明瞭 | 90/100 | ✅ タップ操作のみ |
| 効果明瞭 | 95/100 | ✅ 大きな数値で明確 |
| 見やすさ | 90/100 | ✅ 余白広く視認性高い |
| 分かりやすさ | 90/100 | ✅ iOS標準UIに準拠 |

### 推奨度: ⭐⭐⭐⭐⭐（5/5）

**理由**:
- ボタン数の大幅削減で「面倒さの排除」を達成
- iOS標準UIパターンで「使い方明瞭」
- 大きな数値表示で「効果明瞭」
- 実装工数も比較的少ない

---

## 📝 実装時の注意点

### 1. モーダルのパフォーマンス
- アニメーション時間は0.2-0.3秒以内に
- z-indexを正しく設定（z-[10000]）
- 背景のスクロールを無効化

### 2. タップ領域
- カード全体を `<button>` タグで囲む
- `w-full text-left` で左寄せボタン化
- ホバー時の視覚的フィードバック必須

### 3. アクセシビリティ
- すべてのボタンに `title` 属性
- キーボード操作に対応
- スクリーンリーダー対応

### 4. モバイル最適化
- タップ領域は最低44x44px
- ダブルタップズーム無効化
- スワイプと通常タップの競合回避

---

**最終更新**: 2025年11月2日
**推奨実装フェーズ**: Phase 1（最優先）
