# Your Coach+ デザインシステム実装チェックリスト

**バージョン**: 2.0.0 - ロゴ準拠テーマ（Sky Blue）
**作成日**: 2025年11月4日
**目的**: 全コンポーネントを新しいデザインシステムに統一するための実装チェックリスト

---

## 📋 実装概要

### 変更するカラー

#### プライマリグラデーション
```
旧: from-purple-600 to-indigo-600
旧: from-sky-600 to-blue-600
新: from-sky-500 to-blue-600 ✅
```

#### Premiumグラデーション
```
旧: from-purple-600 to-pink-600
旧: from-amber-500 to-orange-500
新: from-yellow-200 to-amber-500 ✅
文字色: text-gray-800 ⚠️（重要）
```

---

## 🔍 検索対象のグラデーションパターン

### 1. プライマリグラデーション（変更対象）
- [x] `from-purple-600 to-indigo-600`
- [x] `from-indigo-600 to-purple-600`
- [x] `from-sky-600 to-blue-600`
- [x] `from-blue-600 to-sky-600`

**置き換え**: → `from-sky-500 to-blue-600`

### 2. Premiumグラデーション（変更対象）
- [x] `from-purple-600 to-pink-600`
- [x] `from-pink-600 to-purple-600`
- [x] `from-orange-600 to-pink-600`
- [x] `from-amber-500 to-orange-500`
- [x] `from-orange-500 to-amber-500`

**置き換え**: → `from-yellow-200 to-amber-500`
**文字色変更**: `text-white` → `text-gray-800`

### 3. デイリー記録グラデーション（変更禁止）⭐
- [ ] `from-teal-50 to-cyan-50` （体組成）
- [ ] `from-green-50 to-emerald-50` （食事）
- [ ] `from-orange-50 to-red-50` （運動）
- [ ] `from-red-50 to-pink-50` （コンディション）
- [ ] `from-yellow-50 to-amber-50` （閃き）
- [ ] `from-indigo-50 to-purple-50` （分析）

**これらは変更しない**

---

## 📁 ファイル別実装チェックリスト

### components/02_auth.js（認証画面）
**優先度**: 🔴 最高（ログイン・登録画面）

- [ ] ヘッダーグラデーション: プライマリに変更
- [ ] ログインボタン: プライマリに変更
- [ ] 新規登録ボタン: プライマリに変更
- [ ] Googleログインボタン: 白背景のまま維持
- [ ] オンボーディング画面: プライマリに変更
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 5-10箇所

---

### components/03_dashboard.js（ダッシュボード）
**優先度**: 🔴 最高（メイン画面）

- [ ] ヘッダーグラデーション: プライマリに変更
- [ ] デイリー記録セクション: **変更しない**（機能別色維持）
  - [ ] 体組成（teal/cyan）: 維持
  - [ ] 食事（green/emerald）: 維持
  - [ ] 運動（orange/red）: 維持
  - [ ] コンディション（red/pink）: 維持
  - [ ] 閃き（yellow/amber）: 維持
  - [ ] 分析（indigo/purple）: 維持
- [ ] 機能ボタン（テンプレート/編集/削除）: OS標準色に変更
  - [ ] テンプレート: green-600, border-green-500
  - [ ] 編集: blue-600, border-blue-500
  - [ ] 削除: red-600, border-red-500
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 10-15箇所

---

### components/04_settings.js（設定画面）
**優先度**: 🟡 中（設定・プロフィール）

- [ ] ヘッダーグラデーション: プライマリに変更
- [ ] Premium会員バッジ: Premiumカラーに変更
  - [ ] 文字色を `text-gray-800` に変更⚠️
- [ ] Premium機能ロックUI: Premiumカラーに変更
- [ ] アップグレードボタン: Premiumカラーに変更
- [ ] 保存ボタン: プライマリに変更
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 8-12箇所

---

### components/05_analysis.js（分析画面）
**優先度**: 🟢 低（分析・グラフ）

- [ ] ヘッダーグラデーション: プライマリに変更
- [ ] Premium機能ロックUI: Premiumカラーに変更
- [ ] AIアシスタント関連: プライマリに変更
- [ ] PFCグラフカラー: **変更しない**（専用カラー維持）
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 5-8箇所

---

### components/07_add_item_v2.js（入力画面）
**優先度**: 🔴 最高（食事・運動入力）

- [ ] ヘッダーグラデーション: プライマリに変更
- [ ] 保存ボタン: プライマリに変更
- [ ] モーダルヘッダー: プライマリに変更
- [ ] Premium機能（AI食事認識）: Premiumカラーに変更
  - [ ] 文字色を `text-gray-800` に変更⚠️
- [ ] アイコンボタン: OS標準色に変更
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 15-20箇所

---

### components/08_app.js（メインアプリ）
**優先度**: 🔴 最高（アプリ全体）

- [ ] BAB（Bottom Action Bar）: **変更しない**（グレー維持）
- [ ] ナビゲーションアイコン: アクティブ時プライマリに変更
- [ ] 設定アイコン: プライマリに変更
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 3-5箇所

---

### components/15_community_growth.js（コミュニティ）
**優先度**: 🟢 低（コミュニティ機能）

- [ ] ヘッダーグラデーション: プライマリに変更
- [ ] 投稿ボタン: プライマリに変更
- [ ] いいねボタン: 赤系維持（機能色）
- [ ] Premium投稿機能: Premiumカラーに変更
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 5-8箇所

---

### components/16_history_v10.js（履歴画面）
**優先度**: 🟡 中（履歴・カレンダー）

- [ ] ヘッダーグラデーション: プライマリに変更
- [ ] カレンダー選択日: プライマリに変更
- [ ] デイリー記録表示: **機能別色維持**
- [ ] アイコンはLucide使用確認

**想定変更箇所**: 5-8箇所

---

### components/18_subscription.js（サブスクリプション）
**優先度**: 🔴 最高（Premium会員登録）

- [ ] ヘッダーグラデーション: Premiumカラーに変更
  - [ ] 文字色を `text-gray-800` に変更⚠️
- [ ] Premium会員になるボタン: Premiumカラーに変更
  - [ ] 文字色を `text-gray-800` に変更⚠️
  - [ ] シャイン効果追加（オプション）
- [ ] プラン選択カード: Premiumカラーに変更
- [ ] 特典リスト: Premiumカラーに変更
- [ ] アイコンはLucide使用確認（crown, zap, sparklesなど）

**想定変更箇所**: 10-15箇所

---

## 🎨 カラー変更の詳細パターン

### パターン1: プライマリボタン
```jsx
// 旧
<button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
  ログイン
</button>

// 新
<button className="bg-gradient-to-r from-sky-500 to-blue-600 text-white">
  ログイン
</button>
```

### パターン2: Premiumボタン
```jsx
// 旧
<button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
  Premium会員になる
</button>

// 新 ⚠️ 文字色変更に注意
<button className="bg-gradient-to-r from-yellow-200 to-amber-500 text-gray-800">
  Premium会員になる
</button>
```

### パターン3: Premiumバッジ
```jsx
// 旧
<div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
  <span className="text-purple-700">Premium会員</span>
</div>

// 新
<div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-amber-300">
  <span className="text-amber-800">Premium会員</span>
</div>
```

### パターン4: 機能別アイコンボタン（OS標準色）
```jsx
// 旧
<button className="text-purple-600 border-purple-200 hover:bg-purple-50">
  <Icon name="BookTemplate" />
</button>

// 新（テンプレート = 保存系 = Green）
<button className="text-green-600 border-2 border-green-500 hover:bg-green-50">
  <i data-lucide="book-template" className="w-[18px] h-[18px]"></i>
</button>

// 新（編集 = Blue）
<button className="text-blue-600 border-2 border-blue-500 hover:bg-blue-50">
  <i data-lucide="pencil" className="w-[18px] h-[18px]"></i>
</button>

// 新（削除 = Red）
<button className="text-red-600 border-2 border-red-500 hover:bg-red-50">
  <i data-lucide="trash-2" className="w-[18px] h-[18px]"></i>
</button>
```

---

## ⚠️ 重要な注意事項

### 1. Premiumカラーの文字色
- **必ず `text-gray-800` を使用**
- イエローは明るいため `text-white` は読みづらい
- 影効果は控えめ（`shadow-amber-500/30`）

### 2. デイリー記録の色は変更禁止
- 体組成、食事、運動、コンディション、閃き、分析の6色は維持
- これらは機能別の色分けシステムなので変更しない

### 3. 機能別ボタンはOS標準色
- 保存/テンプレート: Green
- 編集/情報: Blue
- 削除: Red
- 設定/コピー: Gray
- 全テーマ共通で固定

### 4. アイコンはLucide Icons必須
- CDN版を使用: `<i data-lucide="icon-name"></i>`
- サイズ指定: `w-[18px] h-[18px]`（アイコンボタン内）
- 初期化必須: `lucide.createIcons();`

### 5. キャッシュバスター更新
- 変更したファイルのキャッシュバスター（`?v=YYYYMMDDVN`）を必ず更新
- ブラウザでスーパーリロード（Ctrl+Shift+R）

---

## 🔄 実装の進め方

### Phase 1: 最優先ファイル（1日目）
1. `components/02_auth.js` - 認証画面
2. `components/03_dashboard.js` - ダッシュボード
3. `components/08_app.js` - メインアプリ

### Phase 2: 高優先度ファイル（2日目）
4. `components/07_add_item_v2.js` - 入力画面
5. `components/18_subscription.js` - サブスクリプション
6. `components/04_settings.js` - 設定画面

### Phase 3: 中・低優先度ファイル（3日目）
7. `components/16_history_v10.js` - 履歴画面
8. `components/05_analysis.js` - 分析画面
9. `components/15_community_growth.js` - コミュニティ

### 各ファイルの実装手順
1. ファイルを開く
2. グラデーションパターンを検索（Ctrl+F）
3. プライマリ・Premiumグラデーションを新色に置換
4. Premiumカラーの文字色を `text-gray-800` に変更
5. 機能ボタンをOS標準色に変更
6. アイコンをLucide Iconsに変更
7. キャッシュバスターを更新
8. ブラウザで動作確認
9. コンソールエラーをチェック

---

## ✅ 完了確認

### 全体チェック
- [ ] すべてのプライマリグラデーションが `from-sky-500 to-blue-600`
- [ ] すべてのPremiumグラデーションが `from-yellow-200 to-amber-500`
- [ ] Premiumカラーの文字色がすべて `text-gray-800`
- [ ] デイリー記録の6色が維持されている
- [ ] 機能別ボタンがOS標準色に統一
- [ ] すべてのアイコンがLucide Icons
- [ ] すべてのキャッシュバスターが更新されている

### ブラウザ確認
- [ ] コンソールエラーなし
- [ ] ログイン・登録画面が正しく表示
- [ ] ダッシュボードが正しく表示
- [ ] デイリー記録の色分けが維持
- [ ] Premium機能が正しく表示
- [ ] 全画面遷移が正常

---

**最終更新**: 2025年11月4日
