# Your Coach+ LP・ホワイトペーパー デザインシステム仕様書

## 1. プロジェクト概要

| 項目 | 値 |
|------|-----|
| プロダクト名 | Your Coach+ |
| タグライン | 迷う時間を、鍛える時間へ。 |
| ドメイン | https://your-coach-plus.com |
| 技術スタック | HTML + Tailwind CSS (CDN) + Vanilla JS |
| ホスティング | Firebase Hosting |
| 対象ページ | home.html (B2C LP), b2b2c.html (B2B LP), whitepaper.html (新規) |

---

## 2. ターゲットペルソナ

### B2C（home.html）
| ペルソナ | 属性 | ペインポイント | 求める結果 |
|----------|------|---------------|-----------|
| **迷走トレーニー** | 20-35歳男性、筋トレ歴1-3年 | YouTube/SNSで情報過多、何が正解か分からず停滞 | 自分専用のナビゲーションで迷いゼロ |
| **リバウンド経験者** | 25-40歳男女、過去にダイエット挫折 | 何度も失敗、継続できない、知識が断片的 | 科学的根拠に基づく持続可能な体づくり |
| **忙しい社会人** | 25-45歳、フルタイム勤務 | ジムに通う時間がない、食事管理が面倒 | 1秒入力、毎日のクエストで最短距離 |

### B2B（b2b2c.html）
| ペルソナ | 属性 | ペインポイント | 求める結果 |
|----------|------|---------------|-----------|
| **ジムオーナー** | パーソナルジム経営者 | 指導時間外の167h管理不能、退会率高い | LTV最大化、会員継続率向上 |
| **法人ウェルネス担当** | 企業の人事・総務 | 社員の健康管理ツール選定 | 導入コスト低・運用負荷低・効果測定可能 |

### ホワイトペーパー読者
| ペルソナ | 属性 | 求める情報 |
|----------|------|-----------|
| **経営層・CFO** | ジム経営の意思決定者 | ROI数値、業界トレンド、導入事例 |
| **フィットネス業界関係者** | トレーナー、コンサル | 最新技術動向、AI活用の可能性 |

---

## 3. デザインシステム

### 3.1 カラーパレット（60-30-10法則）

#### ダークテーマ（メイン）
```
Dominant  60% : #000000 (Black)        — 背景
Secondary 30% : #1F2937 (Gray-800)     — カード・サーフェス
                #374151 (Gray-700)     — ボーダー
                #6B7280 (Gray-500)     — サブテキスト
                #D1D5DB (Gray-300)     — ボディテキスト
                #FFFFFF (White)        — 見出し
Accent    10% : #4A9EFF (Brand Blue)   — CTA・強調・ブランド
```

#### セマンティックカラー
```
Success  : #10B981 (Emerald-500)  — 完了・ポジティブ
Warning  : #F59E0B (Amber-500)   — 注意・キャンペーン
Danger   : #EF4444 (Red-500)     — 緊急性・削除
Info     : #8B5CF6 (Purple-500)  — 教育・PGBASE
Energy   : #F97316 (Orange-500)  — アクティビティ・開発者
```

#### 機能別アクセント（Feature Card）
```
Feature 01 (クエスト)   : #4A9EFF (Blue)
Feature 02 (PGBASE)    : #8B5CF6 (Purple)
Feature 03 (COMY)      : #10B981 (Emerald)
Feature 04 (AI分析)    : #F97316 (Orange)
```

#### コントラスト比（WCAG 2.1 AA準拠）
| 組み合わせ | 比率 | 基準 |
|-----------|------|------|
| White (#FFF) on Black (#000) | 21:1 | AAA |
| Gray-300 (#D1D5DB) on Black (#000) | 12.6:1 | AAA |
| Brand Blue (#4A9EFF) on Black (#000) | 6.3:1 | AA Large + AA Normal |
| Gray-500 (#6B7280) on Black (#000) | 4.6:1 | AA Normal |

### 3.2 タイポグラフィ

```
見出し (H1-H2) : Montserrat 700-900, tracking tight
本文           : system-ui, -apple-system, sans-serif
数値           : font-variant-numeric: tabular-nums
```

| レベル | モバイル | デスクトップ | Weight |
|--------|---------|------------|--------|
| H1 (Hero) | text-4xl (36px) | text-7xl (72px) | 900 (Black) |
| H2 (Section) | text-2xl (24px) | text-5xl (48px) | 800 (ExtraBold) |
| H3 (Card) | text-xl (20px) | text-3xl (30px) | 700 (Bold) |
| Body | text-base (16px) | text-lg (18px) | 400 (Regular) |
| Caption | text-xs (12px) | text-sm (14px) | 400-500 |

### 3.3 スペーシング・レイアウト

```
コンテンツ最大幅  : max-w-5xl (56rem / 896px)
セクション高さ    : min-height: 100vh（フルスクリーン）
セクション内パディング : px-6 py-16 md:py-24
カード角丸        : rounded-2xl (16px)
カード影          : shadow-2xl
```

### 3.4 インタラクション

```css
/* スクロールフェードイン */
.fade-up { opacity: 0; transform: translateY(40px); transition: 0.7s ease-out; }
.fade-up.visible { opacity: 1; transform: translateY(0); }

/* ナビゲーション固定 + ブラー */
.nav-fixed.scrolled { background: rgba(0,0,0,0.88); backdrop-filter: blur(12px); }

/* CTAホバー */
hover:bg-[#3A8EEF] transition（ブランドブルー → やや暗く）

/* 緊急性パルス（B2Bのみ） */
@keyframes urgency-pulse { 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }
```

### 3.5 コンポーネントライブラリ

| コンポーネント | 用途 | 仕様 |
|--------------|------|------|
| **FeatureCard** | 機能紹介 | bg-white rounded-2xl shadow-2xl, 画像+テキスト左右交互配置 |
| **StatBlock** | 数値ハイライト | grid 2x2→4列, text-[#4A9EFF] font-black |
| **ComparisonPanel** | 競合比較 | 2列, 左=gray暗い / 右=blue発光ボーダー |
| **PricingCard** | 料金表 | border-2 border-[#4A9EFF], 上部タグ |
| **CTA Button (Primary)** | メインアクション | bg-[#4A9EFF] text-white font-bold px-6 py-3 rounded-lg |
| **CTA Button (Secondary)** | サブアクション | border border-[#4A9EFF] text-[#4A9EFF] bg-transparent |
| **Badge/Tag** | カテゴリ表示 | bg-{color}/10 text-{color} px-3 py-1 rounded-full text-sm |
| **NavBar** | ナビゲーション | fixed top-0, blur背景, ハンバーガーメニュー(mobile) |

---

## 4. ページ構成仕様

### 4.1 home.html（B2C LP）— リニューアル

| # | セクション | 心理的目的 | 改善内容 |
|---|-----------|-----------|---------|
| 0 | **Hero** | 3秒で注意獲得 | 背景にアプリUIの半透明モックアップ追加、カウンタアニメーション |
| 1 | **Empathy (ペイン)** | 共感・ラポール構築 | アイコン付きの3つの具体的な悩みカードに変更 |
| 2 | **Stats** | 信頼性・スケール証明 | カウントアップアニメーション追加 |
| 3 | **Feature 01: クエスト** | ソリューション提示 | スクリーンショットプレースホルダー維持 |
| 4 | **Feature 02: PGBASE** | 教育価値の提示 | 同上 |
| 5 | **Feature 03: COMY** | コミュニティ価値 | 同上 |
| NEW | **Feature 04: AI分析** | 技術的差別化 | AI分析画面のスクリーンショット＋解説追加 |
| 6 | **Comparison** | 競合との明確な差別化 | 維持（現状高品質） |
| NEW | **Social Proof** | 信頼・安心 | ユーザーレビュー・評価・ビフォーアフター(プレースホルダー) |
| 7 | **Developer** | 権威性・専門性 | YouTube埋め込み追加 |
| 8 | **Pricing** | 意思決定 | 無料/Premium比較表、CTAを「7日間無料で始める」に変更 |
| NEW | **FAQ** | 不安解消 | よくある質問5-7項目 |
| 9 | **Footer** | クロージング + 導線 | B2B LP・ホワイトペーパーへの導線追加 |

### 4.2 b2b2c.html（B2B LP）— 改善

| 改善項目 | 内容 |
|---------|------|
| **問い合わせフォーム** | メーラー依存→ページ内フォーム（Firebase Functions連携） |
| **比較表モバイル** | 横スクロール→カード形式への変換 |
| **動画セクション** | YouTube埋め込み（デモ動画） |
| **導入事例** | プレースホルダーセクション追加 |
| **ホワイトペーパーCTA** | 「詳細資料をダウンロード」ボタン追加 |

### 4.3 whitepaper.html（新規作成）

テーマ：**「AIパーソナルコーチングが法人ウェルネスを変革する — データで見る次世代フィットネス」**

| # | セクション | 内容 |
|---|-----------|------|
| 0 | **カバー** | タイトル、サブタイトル、発行元、日付 |
| 1 | **目次** | スティッキーサイドナビ、クリックでジャンプ |
| 2 | **エグゼクティブサマリー** | 課題と結論の要約 |
| 3 | **市場概況** | フィットネス市場規模・成長率（インフォグラフィック） |
| 4 | **課題の深掘り** | パーソナルジムの3大課題（データビジュアライゼーション） |
| 5 | **ソリューション** | Your Coach+ B2B2Cモデルの詳細解説 |
| 6 | **行動変容ループ** | 4ステップの科学的フレームワーク図解 |
| 7 | **機能詳細** | 主要機能のスクリーンショット付き解説 |
| 8 | **ROI分析** | 導入前後の数値比較（チャート） |
| 9 | **導入事例** | プレースホルダー（将来の実績用） |
| 10 | **技術基盤** | KMP + Firebase + Gemini AI の技術スタック図 |
| 11 | **ロードマップ** | 今後の機能追加予定 |
| 12 | **結論・CTA** | お問い合わせ・デモ申し込みフォーム |

#### ホワイトペーパーデザイン仕様
- **形式**: Webベース（インタラクティブHTML）、PDF出力不要
- **ナビ**: 左サイドに固定目次（デスクトップ）、上部ハンバーガー（モバイル）
- **進行バー**: ページ上部にスクロール進行バー
- **データ可視化**: CSS/SVGベースのチャート・グラフ（外部ライブラリ不要）
- **リードフォーム**: ページ途中（セクション6後）にゲート無しのフォーム表示
- **配色**: ダークテーマ（LPと統一）、白カード上にコンテンツ

---

## 5. アクセシビリティ要件（WCAG 2.1 AA）

| 要件 | 実装 |
|------|------|
| コントラスト比 | テキスト/背景 4.5:1以上（大テキスト3:1） |
| キーボードナビ | Tab/Enter/Escで全操作可能 |
| aria属性 | ハンバーガーに aria-label、セクションに aria-labelledby |
| alt属性 | 全画像に意味のある代替テキスト |
| フォーカス可視 | focus:ring-2 focus:ring-[#4A9EFF] |
| セマンティックHTML | header/nav/main/section/footer/article |
| 動きの抑制 | prefers-reduced-motion でアニメーション無効化 |

---

## 6. パフォーマンス目標

| 指標 | 目標値 |
|------|-------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| 外部依存 | Tailwind CDN + Google Fonts のみ |
| 画像 | WebP形式推奨、lazy loading |

---

## 7. OGP・メタタグ共通仕様

```html
<!-- 共通 -->
<meta property="og:site_name" content="Your Coach+">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico">

<!-- ページ別 -->
og:title — ページタイトル
og:description — 120文字以内の説明
og:image — 1200x630px OGP画像
og:url — 正規URL
```

---

## 8. ページ間導線

```
home.html ──→ b2b2c.html（法人向けプランリンク）
home.html ──→ whitepaper.html（詳細資料リンク）
b2b2c.html ──→ whitepaper.html（資料ダウンロードCTA）
b2b2c.html ──→ home.html（個人ユーザー向けリンク）
whitepaper.html ──→ b2b2c.html（お問い合わせCTA）
whitepaper.html ──→ home.html（アプリDLリンク）
b2b2c-success.html ──→ home.html / trainer.html
```
