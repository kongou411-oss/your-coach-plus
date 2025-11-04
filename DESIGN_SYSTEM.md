# Your Coach+ デザインシステム

**最終更新日**: 2025年11月4日
**バージョン**: 2.0.0 - ロゴ準拠テーマ（Sky Blue）
**テーマ**: Logo-Based Modern & Professional
**カラーコンセプト**: ロゴのアクセントカラー（Sky Blue #4A9EFF）を基準にしたブランド統一デザイン
**目的**: UI/UXの一貫性とブランドアイデンティティを保ち、プロフェッショナルなデザインを維持するための統一ルール

---

## 📖 目次

1. [配色](#配色)
2. [タイポグラフィ](#タイポグラフィ)
3. [スペーシング](#スペーシング)
4. [形状（角丸・影・枠線）](#形状)
5. [コンポーネント](#コンポーネント)
6. [表記ルール](#表記ルール)
7. [ユーザーフロー](#ユーザーフロー)

---

## 🎨 配色

### グラデーション

#### プライマリグラデーション（メインUI）- ロゴ準拠テーマ
```css
bg-gradient-to-r from-sky-500 to-blue-600
```
**用途**: ヘッダー、メインナビゲーション、重要なセクション、ログインボタン

**カラーコード**:
- `sky-500`: #0EA5E9 (ロゴのアクセント "+" カラー #4A9EFF に最も近い)
- `blue-600`: #2563eb (深い青)

**ロゴとの関係**:
- ロゴの "+" アクセントカラー (#4A9EFF) ≈ `sky-500` (#0EA5E9)
- ブランドアイデンティティと完全一致
- ユーザーがロゴを見たときとアプリを使うときの色が統一される

**例**:
- 認証画面ヘッダー・ログインボタン
- ダッシュボードヘッダー
- 設定画面ヘッダー
- 分析画面ヘッダー
- プライマリCTAボタン

#### Premiumグラデーション（Premium機能・サブスク）
```css
bg-gradient-to-r from-yellow-200 to-amber-500
```
**用途**: Premium機能、サブスクリプション、課金要素

**カラーコード**:
- `yellow-200`: #FEF08A (ビタミンイエロー、#FFF59Aに最も近い)
- `amber-500`: #F59E0B (ゴールド)

**色の選定理由**:
- ユーザー指定の #FFF59A（明るいイエロー）をベースカラーとして採用
- イエローからゴールドへのグラデーションで「エネルギー + 高級感」を両立
- ビタミンカラーとしてヘルスケア・フィットネスと親和性が高い
- 青（プライマリ）との補色関係で強いコントラスト

**特別感演出**:
- ✨ シャイン効果: ホバー時の光沢アニメーション（オプション）
- 🌟 影効果: `shadow-lg shadow-amber-500/30`（ゴールドグロー）
- 💫 ホバー: `hover:from-yellow-100 hover:to-amber-400`（明るく）
- 📝 文字色: `text-gray-800`（濃いグレー推奨、イエローは明るいため）

**例**:
- Premium機能ロックUI
- サブスクリプションボタン
- Premium会員バッジ
- 特別なCTAボタン

#### アクセントカラー（軽い背景）
```css
/* プライマリアクセント（バッジ・軽い背景） */
bg-gradient-to-r from-sky-50 to-blue-50
border border-sky-200
text-sky-700

/* Premiumアクセント（バッジ・軽い背景） */
bg-gradient-to-r from-yellow-50 to-amber-50
border border-amber-300
text-amber-800
```

#### ❌ 廃止するグラデーション（UI要素のみ）
以下のグラデーションは新しいロゴ準拠テーマに統一します:

- `from-purple-600 to-indigo-600` → `from-sky-500 to-blue-600`（プライマリ）
- `from-sky-600 to-blue-600` → `from-sky-500 to-blue-600`（プライマリ）
- `from-purple-600 to-pink-600` → `from-yellow-200 to-amber-500`（Premium）
- `from-amber-500 to-orange-500` → `from-yellow-200 to-amber-500`（Premium）
- `from-indigo-600 to-purple-600` → プライマリに統一
- `from-orange-600 to-pink-600` → Premiumに統一
- その他の組み合わせ → 上記2つに統一

**注意**: デイリー記録の機能別カラー（後述）は変更対象外

---

### 背景色

#### デイリー記録の機能別カラー（変更禁止）⭐

ダッシュボードのデイリー記録セクションでは、機能を明確に区別するために専用の色分けシステムを使用します。**このカラーシステムは変更しません。**

```css
/* 体組成 */
bg-gradient-to-r from-teal-50 to-cyan-50
text-teal-600

/* 食事 */
bg-gradient-to-r from-green-50 to-emerald-50
text-green-600

/* 運動 */
bg-gradient-to-r from-orange-50 to-red-50
text-orange-600

/* コンディション */
bg-gradient-to-r from-red-50 to-pink-50
text-red-600

/* 閃き */
bg-gradient-to-r from-yellow-50 to-amber-50
text-yellow-500

/* 分析 */
bg-gradient-to-r from-indigo-50 to-purple-50
text-indigo-600
```

**用途**: ダッシュボード（`components/03_dashboard.js`）のセクションヘッダー
**理由**: 機能別に色で直感的に識別でき、ユーザビリティが高い

#### セクションヘッダー背景（一般）
```css
bg-gradient-to-r from-{color}-50 to-{color}-50
```
**カラー別用途**:
- `green-50`: 食事関連
- `orange-50`: 運動関連
- `blue-50`: 分析・情報
- `red-50`: コンディション・警告
- `purple-50`: Premium・特別

#### ベース背景
```css
/* 画面全体の背景 */
bg-gray-50

/* カード背景 */
bg-white

/* ホバー状態 */
hover:bg-{color}-100

/* 選択状態 */
bg-{color}-100
```

---

### 機能別カラー（OS標準色）

#### 機能別ボタン色（Android/Windows標準）
すべての機能ボタン（テンプレート、編集、削除など）はOS標準色を採用します。

```css
/* 保存・テンプレート（Green） */
text-green-600, bg-green-50, border-green-500
hover:bg-green-50

/* 編集・情報（Blue） */
text-blue-600, bg-blue-50, border-blue-500
hover:bg-blue-50

/* 削除（Red） */
text-red-600, bg-red-50, border-red-500
hover:bg-red-50

/* 設定・コピー（Gray） */
text-gray-600, bg-gray-50, border-gray-400
hover:bg-gray-50

/* 警告・注意（Orange） */
text-orange-600, bg-orange-50, border-orange-500
hover:bg-orange-50
```

**重要**: この色分けは**全テーマ共通**で、プライマリカラーに関係なく固定です。

#### 成功・エラー・警告・情報（メッセージ・通知）
```css
/* 成功メッセージ */
text-green-600, bg-green-50, border-green-500

/* エラーメッセージ */
text-red-600, bg-red-50, border-red-500

/* 警告メッセージ */
text-orange-600, bg-orange-50, border-orange-500

/* 情報メッセージ */
text-blue-600, bg-blue-50, border-blue-500
```

#### PFC専用カラー（変更不可）
```css
カロリー: #60a5fa (blue-400)
タンパク質: #ef4444 (red-500)
脂質: #eab308 (yellow-500)
炭水化物: #22c55e (green-500)
```

---

## 📝 タイポグラフィ

### 見出し階層

```css
/* H1: ページタイトル */
text-2xl font-bold leading-tight

/* H2: セクションタイトル */
text-xl font-bold leading-snug

/* H3: サブセクション */
text-lg font-semibold leading-normal

/* H4: 小見出し */
text-base font-semibold leading-normal
```

### 本文

```css
/* 通常本文 */
text-sm leading-normal

/* 大きめ本文 */
text-base leading-relaxed

/* キャプション・補足 */
text-xs leading-tight
```

### 数値表示

```css
/* 大きな統計値 */
text-3xl font-bold tracking-tight

/* 中統計値（カロリー表示など） */
text-2xl font-bold

/* 小統計値 */
text-lg font-semibold
```

---

## 📏 スペーシング

### 8px単位システム

```css
/* Tailwindクラスと実際のサイズ */
2  → 8px   (space-xs)  /* 密接な要素間 */
3  → 12px  (space-sm)  /* 通常要素間 */
4  → 16px  (space-md)  /* カード内部、セクション内 */
6  → 24px  (space-lg)  /* セクション間、モーダル内部 */
8  → 32px  (space-xl)  /* 大セクション間 */
```

### コンポーネント別パディング

```css
/* カード */
p-4  /* 標準カード */
p-6  /* 広めカード、モーダル */

/* ボタン */
py-3 px-6  /* 標準ボタン */
py-2 px-4  /* 小ボタン */
py-4 px-8  /* 大ボタン（CTA） */

/* セクション */
px-6 py-4  /* セクションヘッダー */
p-4        /* セクション本体 */

/* リスト間隔 */
space-y-3  /* 標準リスト間隔 */
space-y-2  /* 密なリスト */
space-y-4  /* 広めリスト */
```

---

## 🔲 形状

### 角丸（border-radius）

```css
/* 小コンポーネント */
rounded-lg    /* 8px  - ボタン、入力欄、タグ */

/* 中コンポーネント */
rounded-xl    /* 12px - カード */

/* 大コンポーネント */
rounded-2xl   /* 16px - モーダル */

/* 円形 */
rounded-full  /* アイコンボタン、アバター */
```

**使用例**:
- ボタン: `rounded-lg`
- カード: `rounded-xl`
- モーダル: `rounded-2xl`
- アイコンボタン: `rounded-full`

---

### 影（box-shadow）

```css
/* カード・入力欄 */
shadow-sm

/* アイコンボタン（標準） */
shadow-md ← ダッシュボード食事セクションのボタンで使用

/* ボタン・強調要素 */
shadow-lg

/* モーダル */
shadow-2xl
```

**❌ 使用禁止**:
- `shadow-xl` → `shadow-lg`または`shadow-2xl`に統一

**トランジション**:
```css
/* ホバー時の影の変化 */
shadow-sm hover:shadow-md transition-shadow
shadow-md hover:shadow-lg transition-shadow ← アイコンボタンで使用
```

---

### 枠線（border）

```css
/* 通常の枠線（カード、セクション区切り） */
border-2 border-gray-200

/* 入力欄 */
border-2 border-gray-300

/* 強調枠線（選択中、アクティブ） */
border-2 border-{color}-500

/* 薄い区切り線（リストアイテム間） */
border-b border-gray-200
```

**❌ 使用禁止**:
- `border`（1px） → `border-2`（2px）に統一

**例外**:
- セクション区切り線のみ `border-b`（1px）を許可

---

## 🧩 コンポーネント

### ボタン

#### プライマリボタン（CTA）- ロゴ準拠テーマ
```jsx
{/* 通常のプライマリボタン（ロゴのアクセントカラー準拠） */}
<button className="bg-gradient-to-r from-sky-500 to-blue-600
                   text-white font-bold py-3 px-6 rounded-lg
                   hover:from-sky-600 hover:to-blue-700
                   shadow-lg transition">
  ログイン
</button>

{/* Premiumボタン - ビタミンゴールド（特別感演出） */}
<button className="bg-gradient-to-r from-yellow-200 to-amber-500
                   text-gray-800 font-bold py-3 px-6 rounded-lg
                   hover:from-yellow-100 hover:to-amber-400
                   shadow-lg shadow-amber-500/30
                   transition-all duration-300
                   relative overflow-hidden
                   group">
  <span className="relative z-10">Premium会員になる</span>
  {/* ゴールドシャイン効果（オプション） */}
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent
                  opacity-0 group-hover:opacity-20
                  transform -skew-x-12 -translate-x-full
                  group-hover:translate-x-full
                  transition-transform duration-1000"></div>
</button>

{/* Premiumバッジ（軽い背景） */}
<div className="inline-flex px-6 py-3 bg-gradient-to-r from-yellow-50 to-amber-50
                rounded-lg border-2 border-amber-300">
  <span className="text-amber-800 font-bold flex items-center gap-2">
    <i data-lucide="crown" className="w-5 h-5"></i>
    Premium会員
  </span>
</div>
```

**重要な注意事項**:
- Premiumボタンの文字色は `text-gray-800`（濃いグレー）を使用
- イエローは明るいため `text-white` は読みづらい
- 影効果は控えめ（`shadow-amber-500/30`）でゴールドグローを演出

#### セカンダリボタン
```jsx
<button className="bg-white border-2 border-gray-300
                   text-gray-700 font-semibold py-3 px-6 rounded-lg
                   hover:bg-gray-50 transition">
  キャンセル
</button>
```

#### 削除ボタン
```jsx
<button className="bg-red-50 border-2 border-red-200
                   text-red-600 font-semibold py-2 px-4 rounded-lg
                   hover:bg-red-100 transition">
  削除
</button>
```

#### アイコンボタン（角丸・正方形）⭐ OS標準色使用
```jsx
{/* テンプレート・保存ボタン（Green - OS標準） */}
<button className="w-10 h-10 rounded-lg bg-white shadow-md
                   flex items-center justify-center
                   text-green-600 hover:bg-green-50 transition
                   border-2 border-green-500">
  <i data-lucide="book-template" className="w-[18px] h-[18px]"></i>
</button>

{/* 編集ボタン（Blue - OS標準） */}
<button className="w-10 h-10 rounded-lg bg-white shadow-md
                   flex items-center justify-center
                   text-blue-600 hover:bg-blue-50 transition
                   border-2 border-blue-500">
  <i data-lucide="pencil" className="w-[18px] h-[18px]"></i>
</button>

{/* 削除ボタン（Red - OS標準） */}
<button className="w-10 h-10 rounded-lg bg-white shadow-md
                   flex items-center justify-center
                   text-red-600 hover:bg-red-50 transition
                   border-2 border-red-500">
  <i data-lucide="trash-2" className="w-[18px] h-[18px]"></i>
</button>

{/* コピーボタン（Gray - OS標準） */}
<button className="w-10 h-10 rounded-lg bg-white shadow-md
                   flex items-center justify-center
                   text-gray-600 hover:bg-gray-50 transition
                   border-2 border-gray-400">
  <i data-lucide="copy" className="w-[18px] h-[18px]"></i>
</button>
```

**デザイン特徴:**
- サイズ: `w-10 h-10` (40x40px)
- 形状: `rounded-lg` (角丸8px)
- 背景: `bg-white`
- 影: `shadow-md`（ホバー時は不要、背景色変化のみ）
- 枠線: `border-2 border-{color}-500`（濃い枠線でOS標準感を強調）
- アイコンサイズ: `18px` (`w-[18px] h-[18px]`)
- アイコン: **必ずLucide Icons使用**（`data-lucide`属性）
- カラーは機能別（OS標準色）:
  - テンプレート/保存: `green-600`, `green-500`, `green-50`
  - 編集/情報: `blue-600`, `blue-500`, `blue-50`
  - 削除: `red-600`, `red-500`, `red-50`
  - コピー/設定: `gray-600`, `gray-400`, `gray-50`

#### アイコンボタン（円形）※特殊用途のみ
```jsx
<button className="w-10 h-10 rounded-full bg-white shadow-md
                   hover:shadow-lg transition
                   flex items-center justify-center">
  <Icon size={20} />
</button>
```

#### 無効状態
```css
disabled:opacity-50 disabled:cursor-not-allowed
```

---

### カード

#### 標準カード
```jsx
<div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
  コンテンツ
</div>
```

#### 広めカード
```jsx
<div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
  コンテンツ
</div>
```

#### ホバーカード
```jsx
<div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4
                hover:shadow-md transition-shadow cursor-pointer">
  コンテンツ
</div>
```

---

### 入力フィールド

#### テキスト入力
```jsx
<input className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                  focus:outline-none transition"
       placeholder="例: 山田 太郎" />
```

#### テキストエリア
```jsx
<textarea className="w-full px-4 py-3 min-h-[100px] border-2 border-gray-300 rounded-lg
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
                     focus:outline-none transition resize-y"
          placeholder="内容を入力..."></textarea>
```

#### 数値入力（体組成）
```jsx
<input type="number"
       className="text-lg font-bold text-center border-2 border-gray-300 rounded-lg
                  focus:border-teal-500 focus:ring-2 focus:ring-teal-200
                  focus:outline-none transition"
       placeholder="例: 65.5" />
```

---

### モーダル

#### モーダル構造
```jsx
{/* オーバーレイ */}
<div className="fixed inset-0 bg-black bg-opacity-50 z-50
                flex items-center justify-center p-4">

  {/* モーダル本体 */}
  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full
                  max-h-[85vh] overflow-y-auto">

    {/* ヘッダー（sticky） */}
    <div className="sticky top-0 bg-white border-b px-6 py-4
                    flex items-center justify-between z-10">
      <h2 className="text-xl font-bold">タイトル</h2>
      <button onClick={onClose}
              className="text-gray-400 hover:text-gray-600">
        <X size={24} />
      </button>
    </div>

    {/* コンテンツ */}
    <div className="p-6 space-y-6">
      コンテンツ
    </div>
  </div>
</div>
```

#### モーダルサイズ
```css
/* 小（確認ダイアログ） */
max-w-md   /* 448px */

/* 中（通常フォーム） */
max-w-lg   /* 512px */

/* 大（複雑なフォーム） */
max-w-2xl  /* 672px */
```

---

### セクションヘッダー

```jsx
<div className="bg-gradient-to-r from-green-50 to-green-50
                px-6 py-4 border-b-2 border-gray-200
                flex items-center justify-between">
  <h3 className="text-lg font-bold">セクションタイトル</h3>
  <button className="text-sm text-purple-600 hover:text-purple-700">
    編集
  </button>
</div>
```

---

### アイコン

#### 🎯 アイコンライブラリ: Lucide Icons（必須）

**すべてのアイコンはLucide Iconsを使用してください。**

```jsx
import { BookTemplate, Edit, Trash2, Settings } from 'lucide-react';

// 使用例
<BookTemplate size={18} />
<Edit size={20} />
<Trash2 size={18} />
```

**CDN版**（現在使用中）:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<script>lucide.createIcons();</script>

<!-- HTML内で使用 -->
<i data-lucide="book-template" class="w-5 h-5"></i>
```

#### サイズ階層
```jsx
/* 極小（インラインテキスト） */
<Icon size={12} />

/* 小（リスト項目） */
<Icon size={16} />

/* 中小（アイコンボタン内）⭐ ダッシュボード食事セクションで使用 */
<Icon size={18} />

/* 中（ボタン、ナビゲーション）- 標準 */
<Icon size={20} />

/* 大（ヘッダー、強調） */
<Icon size={24} />

/* 特大（ヒーロー要素） */
<Icon size={32} />
```

**推奨用途:**
- `size={18}`: 40x40pxの角丸アイコンボタン内（テンプレート・編集・削除ボタン）
- `size={20}`: 通常のボタンやナビゲーション
- `size={24}`: ヘッダーやセクションタイトル

#### strokeWidth
```jsx
/* 標準（デフォルト） */
strokeWidth={2}

/* 繊細 */
strokeWidth={1.5}

/* 強調 */
strokeWidth={2.5}
```

#### よく使うLucide Icons一覧
```
BookTemplate    - テンプレート
Edit / Pencil   - 編集
Trash2          - 削除
Copy            - コピー
Settings        - 設定
Info            - 情報
Share2          - 共有
Download        - ダウンロード
AlertTriangle   - 警告
Plus            - 追加
X               - 閉じる
ChevronUp       - 上矢印
ChevronDown     - 下矢印
Search          - 検索
Camera          - カメラ
```

---

## ✍️ 表記ルール

### ボタンラベル

#### ✅ 正しい表記（動詞のみ）
```
保存
追加
削除
編集
キャンセル
閉じる
確認
送信
更新
選択
```

#### ❌ 使用禁止
```
保存する → 保存
追加する → 追加
削除する → 削除
テンプレートを保存 → 保存
```

---

### メッセージ文体

#### 成功メッセージ（過去形）
```
保存しました
追加しました
削除しました
更新しました
送信しました
登録しました
```

#### エラーメッセージ（否定+依頼）
```
保存できません
追加できませんでした
接続できません。もう一度お試しください
〇〇を入力してください
〇〇が見つかりません
```

#### 情報メッセージ（です・ます調）
```
データを読み込んでいます
設定が必要です
利用できません
準備中です
```

---

### プレースホルダー

#### 例示パターン
```javascript
placeholder="例: 65.5"
placeholder="例: 山田 太郎"
placeholder="例: チキンサラダ"
```

#### 動作説明パターン
```javascript
placeholder="食材を検索..."
placeholder="キーワードを入力..."
placeholder="内容を入力..."
```

#### 数値入力パターン
```javascript
placeholder="0"
placeholder="0.0"
```

---

### 単位表記

#### 表示用（スペースなし）
```
65kg
150g
300kcal
25%
30分
```

#### ラベル用（半角スペースあり）
```
体重 (kg)
カロリー (kcal)
タンパク質 (g)
体脂肪率 (%)
```

---

### 専門用語

#### 栄養素
```
タンパク質（カタカナ）
脂質
炭水化物
カロリー または kcal
```

#### サプリメント
```
プロテイン（商品名を指す場合）
サプリメント
```

#### 体組成
```
LBM（除脂肪体重）
体脂肪率
体重
BMI
```

---

## 🔄 ユーザーフロー

### 削除確認ルール

#### 軽微な操作（元に戻せる）
```javascript
// 確認なし + Undo機能
handleDelete(item) {
  deleteItem(item);
  showFeedback('削除しました', 'success', {
    undo: () => restoreItem(item)
  });
}
```

#### 中程度の操作（テンプレート削除等）
```javascript
// 1回確認（カスタムモーダル推奨）
handleDeleteTemplate(template) {
  if (confirm('このテンプレートを削除しますか？')) {
    deleteTemplate(template);
    showFeedback('削除しました', 'success');
  }
}
```

#### 重大な操作（アカウント削除等）
```javascript
// 2段階確認 + パスワード再入力
handleDeleteAccount() {
  if (confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
    if (confirm('すべてのデータが削除されます。本当によろしいですか？')) {
      // パスワード再入力モーダル表示
      showPasswordConfirmModal(() => {
        deleteAccount();
      });
    }
  }
}
```

---

### フィードバック方法

#### ✅ 推奨: showFeedback()のみ使用
```javascript
// 成功
showFeedback('保存しました', 'success');

// エラー
showFeedback('保存に失敗しました', 'error');

// 情報
showFeedback('データを読み込み中...', 'info');

// 達成
showFeedback('目標達成！', 'achievement');
```

#### ❌ 使用禁止: alert()
```javascript
// ❌ 使用禁止
alert('保存しました');
alert('エラー: ' + error.message);
```

**例外**: 開発デバッグ時のみ一時的に使用可

---

### モーダル閉じる処理

#### 変更チェック付きクローズ
```javascript
const handleClose = () => {
  if (hasChanges) {
    if (confirm('変更を破棄しますか？')) {
      onClose();
    }
  } else {
    onClose();
  }
};
```

---

## 🔢 z-index階層

```css
/* 階層定義 */
10000: 最上位モーダル（重要な警告など）
9999:  BAB（Bottom Action Bar）
9998:  固定UI（ボタン、入力欄など）
50:    通常のモーダル
30:    スティッキーヘッダー
10:    カード・ドロップダウンなど
1:     基本レイヤー
```

---

## 📱 レスポンシブ対応

### ブレークポイント
```css
/* Tailwind標準 */
sm: 640px   /* スマートフォン（横向き） */
md: 768px   /* タブレット */
lg: 1024px  /* デスクトップ */
xl: 1280px  /* 大画面 */
```

### 推奨パターン
```jsx
{/* パディング */}
className="p-2 md:p-4 lg:p-6"

{/* モーダル */}
className="p-4 max-w-full md:max-w-md lg:max-w-lg"

{/* テキスト */}
className="text-sm md:text-base"

{/* ボタン */}
className="py-2 md:py-3 px-4 md:px-6"

{/* グリッド */}
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
```

---

## 🚀 実装ガイドライン

### コンポーネント作成時のチェックリスト

- [ ] グラデーションはプライマリまたはPremiumを使用
- [ ] スペーシングは8px単位（Tailwind 2, 3, 4, 6, 8）
- [ ] 角丸は`rounded-lg`, `rounded-xl`, `rounded-2xl`のいずれか（円形は特殊用途のみ`rounded-full`）
- [ ] 影は`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl`のいずれか
- [ ] 枠線は`border-2`を使用（区切り線のみ`border-b`）
- [ ] アイコンボタンは**ダッシュボード食事セクションのデザイン**を基準にする:
  - サイズ: `w-10 h-10`
  - 形状: `rounded-lg`
  - 背景: `bg-white`
  - 影: `shadow-md`
  - 枠線: `border-2 border-{color}-200`
  - アイコン: `size={18}`
  - カラーは機能別（purple/indigo/red）
- [ ] ボタンラベルは動詞のみ
- [ ] メッセージは「〇〇しました」「〇〇できません」の形式
- [ ] プレースホルダーは「例: 〇〇」または「〇〇を検索...」
- [ ] `alert()`ではなく`showFeedback()`を使用
- [ ] z-indexは定義された階層に従う

---

## 🔄 更新履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 2.0.0 | 2025-11-04 | **ロゴ準拠テーマ（Sky Blue）採用** - ロゴのアクセントカラー #4A9EFF を基準にプライマリカラーを `from-sky-500 to-blue-600` に統一。Premiumカラーをユーザー指定の #FFF59A ベースの `from-yellow-200 to-amber-500`（ビタミンゴールド）に変更。機能別ボタンはOS標準色を明記。Lucide Icons必須化。 |
| 1.0.1 | 2025-11-04 | ダッシュボード食事セクションのアイコンボタンデザインを基準として追加 |
| 1.0.0 | 2025-11-04 | 初版作成 |

---

## 📞 お問い合わせ

このデザインシステムに関する質問や提案がある場合は、開発チームまでお問い合わせください。

**最終更新**: 2025年11月4日
