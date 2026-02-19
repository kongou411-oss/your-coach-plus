# LP・ホワイトペーパー リニューアル引き継ぎドキュメント

**作成日**: 2026-02-20
**ステータス**: モックアップ完成 → ポリッシュ待ち（未デプロイ）

---

## 今回の作業内容（Claude Code担当分）

### 新規作成ファイル

| ファイル | 内容 | 行数 |
|---------|------|------|
| `public/spec.md` | デザインシステム仕様書（カラー・タイポ・WCAG・構成定義） | ~250行 |
| `public/whitepaper.html` | Webベースインタラクティブホワイトペーパー（12セクション） | ~700行 |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `public/home.html` | 全面リニューアル（526行→750行超） |
| `public/b2b2c.html` | ターゲット改善（+100行） |

### 未変更ファイル

| ファイル | 理由 |
|---------|------|
| `public/b2b2c-success.html` | 現状で問題なし |
| `firebase.json` | 変更不要（whitepaper.htmlは自動ホスティング） |

---

## home.html リニューアル詳細

### 追加セクション（5つ）
1. **ペインポイント** (`#pain`) — 3つの悩みカード（情報過多・リバウンド・記録しても変わらない）
2. **Feature 04: AI分析** — 写真解析・LBM予測・対話型Q&A
3. **ソーシャルプルーフ** (`#reviews`) — ユーザーレビュー3件（T.K/M.S/Y.H）
4. **FAQ** (`#faq`) — アコーディオン式5問5答
5. **Free/Premium比較料金表** — 2カラム比較、CTAを「7日間無料で始める」に統一

### 改善箇所
- **Hero**: グロー背景追加、CTAボタン大型化、「クレジットカード不要」サブテキスト
- **Stats**: `data-count`属性によるカウントアップアニメーション
- **Developer**: YouTube公式チャンネルへのリンクカード追加
- **Footer**: B2B LP・ホワイトペーパーへの導線追加
- **アクセシビリティ**: aria属性、`role`属性、`focus-visible`、`prefers-reduced-motion`
- **セマンティックHTML**: `<main>`タグ追加、`aria-labelledby`でセクション紐付け

### セクション順序（最終）
```
Hero → Pain Points → Stats → Feature 01-04 → Comparison → Social Proof → Developer → Pricing → FAQ → Footer
```

---

## b2b2c.html 改善詳細

### 追加
- **モバイル比較カード** — `@media (max-width:767px)`でテーブル非表示→カード表示に切替
  - `.comparison-table-desktop` / `.comparison-cards-mobile` クラスで制御
- **ホワイトペーパー導線** — フッターに `/whitepaper.html` リンク追加
- **アクセシビリティ** — `aria-expanded`, `aria-label`, `role="navigation"`, `focus-visible`, `prefers-reduced-motion`
- **`<main>`タグ** — セマンティックHTML対応

### 未変更（維持）
- Hero, Problem, Solution, How It Works, Competition table(desktop), Authority, Support, Campaign, Pricing, Contact form, Firebase/Stripe連携JS
→ これらは現状で高品質のため手を入れていない

---

## whitepaper.html 構成詳細

### レイアウト
- **デスクトップ**: 左260px固定サイドバーTOC + 右メインコンテンツスクロール
- **モバイル**: 上部固定バー + ハンバーガーTOC
- **進行バー**: ページ最上部にスクロール連動プログレスバー

### 12セクション
| # | ID | セクション | コンテンツ |
|---|-----|-----------|-----------|
| 0 | `#cover` | カバー | タイトル・サブタイトル・発行日 |
| 1 | `#summary` | エグゼクティブサマリー | 167h課題、3つの数値カード |
| 2 | `#market` | 市場概況 | CSSバーチャート（2022-2028市場規模） |
| 3 | `#challenges` | 課題の深掘り | 3大課題＋プログレスバー可視化 |
| 4 | `#solution` | ソリューション | B2B2Cモデル図（3カラムフロー） |
| 5 | `#loop` | 行動変容ループ | 4ステップ（Quest→Action→Analysis→Feedback） |
| — | （リード獲得CTA） | 中間CTA | b2b2c.html#contactへのリンク |
| 6 | `#features-detail` | 機能詳細 | 4機能（画像プレースホルダー付き） |
| 7 | `#roi` | ROI分析 | Before/After比較表、年間+270万円試算 |
| 8 | `#cases` | 導入事例 | プレースホルダー（先行導入募集中） |
| 9 | `#tech` | 技術基盤 | KMP + Firebase + Gemini AI 3カラム |
| 10 | `#roadmap` | ロードマップ | Q1-Q4 2026 タイムライン |
| 11 | `#conclusion` | 結論・CTA | お問い合わせ・料金プランボタン |

### JavaScript機能
- スクロール進行バー
- TOCアクティブハイライト（IntersectionObserver）
- モバイルTOCトグル
- フェードインアニメーション
- CSSバーチャートアニメーション

---

## spec.md デザインシステム要約

### カラーパレット（60-30-10）
```
60% Black (#000)      — 背景
30% Gray系            — サーフェス・テキスト
10% #4A9EFF           — ブランドブルー（CTA・強調）
```

### セマンティックカラー
```
Feature 01: #4A9EFF (Blue)     — クエスト
Feature 02: #8B5CF6 (Purple)   — PGBASE
Feature 03: #10B981 (Emerald)  — COMY
Feature 04: #F97316 (Orange)   — AI分析
Success:    #10B981             Danger: #EF4444
```

### コントラスト比（WCAG AA確認済み）
- White on Black: 21:1 (AAA)
- Brand Blue on Black: 6.3:1 (AA)
- Gray-500 on Black: 4.6:1 (AA)

---

## ページ間導線マップ

```
home.html ──→ b2b2c.html      (料金セクション、FAQ、フッター)
home.html ──→ whitepaper.html  (フッター)
b2b2c.html ──→ home.html      (ナビ、フッター)
b2b2c.html ──→ whitepaper.html (フッター)
whitepaper.html ──→ home.html      (サイドバー、フッター)
whitepaper.html ──→ b2b2c.html     (サイドバー、CTA、フッター)
b2b2c-success.html ──→ home.html   (アクションボタン)
```

---

## これからの手順（Cursor等でのポリッシュ）

### STEP 1: 実機確認・ブラウザ確認
```bash
# ローカルで確認
firebase serve --only hosting
# → http://localhost:5000/home.html
# → http://localhost:5000/b2b2c.html
# → http://localhost:5000/whitepaper.html
```
- PC/スマホ両方で全ページ確認
- リンク切れ、表示崩れ、アニメーション動作をチェック

### STEP 2: 実画像・動画の差し替え
| プレースホルダー | 差し替え先 | 場所 |
|---------------|-----------|------|
| `/guide-images/FEATURE1_new.png` | クエスト画面スクリーンショット | home.html Feature 01 |
| `/guide-images/FEATURE2_new.png` | PGBASE教科書画面 | home.html Feature 02 |
| `/guide-images/FEATURE3_new.png` | COMYコミュニティ画面 | home.html Feature 03 |
| `/guide-images/FEATURE4_new.png` | AI分析画面（**新規撮影必要**） | home.html Feature 04 |
| `/guide-images/developer_new.jpg` | 開発者写真 | home.html Developer |
| `Screenshot Placeholder` (x4) | 各機能のスクリーンショット | whitepaper.html 機能詳細 |

### STEP 3: マイクロインタラクション追加（Cursor推奨）
- [ ] ホバー時のカード浮き上がりアニメーション（transform: translateY + shadow変化）
- [ ] Hero背景のパーティクルまたはグラデーションアニメーション
- [ ] 数値カウントアップのイージング改善
- [ ] ページ遷移時のスムーズトランジション
- [ ] CTAボタンのパルスアニメーション（注意を引く）
- [ ] スクロールに連動したパララックス効果（Heroセクション）

### STEP 4: コンテンツ精査
- [ ] ユーザーレビュー（home.html #reviews）を実際のレビューに差し替え
- [ ] ホワイトペーパーの市場データ数値を最新ソースで検証・更新
- [ ] ROI試算の数値をビジネスモデルに合わせて精査
- [ ] FAQの回答内容を最新のアプリ仕様に合わせて確認

### STEP 5: ビジュアル素材生成
- [ ] Adobe Firefly: ホワイトペーパー用カバー画像生成（商用安全）
- [ ] OGP画像: 1200x630px を各ページ用に3種生成
- [ ] ファビコン: 未設定の場合は追加

### STEP 6: A/Bテスト準備
- [ ] Google Analytics 4 の計測タグ埋め込み
- [ ] CTAボタンのクリックイベント計測設定
- [ ] スクロール深度の計測設定
- [ ] ホワイトペーパーのセクション別滞在時間計測

### STEP 7: 最終デプロイ
```bash
# 全ファイルをステージング
git add public/home.html public/b2b2c.html public/whitepaper.html public/spec.md

# コミット
git commit -m "feat: LP全面リニューアル・ホワイトペーパー新規作成"

# プッシュ
git push origin main

# Firebase デプロイ
firebase deploy --only hosting
```

---

## 技術的な注意点

### 既存のFirebase Functions連携
- `b2b2c.html` の問い合わせフォームは `sendB2BInquiry` を呼び出し
- `b2b2c.html` の決済は `createB2B2CCheckoutSession` を呼び出し
- いずれも `/config.js` で Firebase 初期化（変更不要）
- `whitepaper.html` はフォームを持たず `b2b2c.html#contact` にリンクで委譲

### Tailwind CSS CDN
- 全ページ `cdn.tailwindcss.com` を使用（本番では自前ビルド推奨）
- `b2b2c.html` のみ `tailwind.config` でカスタムカラー `gray-350` を追加

### 不要ファイル
- `public/b2b2c - コピー.html` — 旧バックアップ。削除可能
