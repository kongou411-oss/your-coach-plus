# Your Coach+

[![Deploy to Firebase](https://github.com/kongou411-oss/your-coach-plus/actions/workflows/deploy.yml/badge.svg)](https://github.com/kongou411-oss/your-coach-plus/actions/workflows/deploy.yml)
[![Code Quality](https://github.com/kongou411-oss/your-coach-plus/actions/workflows/code-check.yml/badge.svg)](https://github.com/kongou411-oss/your-coach-plus/actions/workflows/code-check.yml)

フィットネス・栄養管理のためのAI搭載コーチングアプリ

🌐 **Live Demo**: https://your-coach-plus.web.app

🤖 **Status**: GitHub Actions による完全自動デプロイ運用中

---

## 🚀 自動デプロイ

このリポジトリは **GitHub Actions** による完全自動デプロイを採用しています。

```
git push origin main
↓
🤖 自動でFirebaseにデプロイ
↓
✅ 1-2分で本番反映
```

元の`index_beta.html`（12,049行）を機能ごとに分割し、保守しやすい構造に整理しました。

## 📁 ファイル構造

```
C:\Users\yourc\yourcoach_new\
│
├── index.html                      # メインHTMLファイル
├── styles.css                      # カスタムCSS
│
├── config.js                       # 設定ファイル（既存）
├── utils.js                        # ユーティリティ関数（既存）
├── foodDatabase.js                 # 食品データベース（既存）
├── trainingDatabase.js             # トレーニングDB（既存）
│
├── services.js                     # すべてのサービス層
│   ├── Database functions (getFoodDB, getSupplement, getExercise)
│   ├── DataService (CRUD操作)
│   └── GeminiAPI (AI統合)
│
└── components.js                   # すべてのReactコンポーネント
    ├── Icon, MarkdownRenderer
    ├── LoginScreen, OnboardingScreen
    ├── DashboardView
    ├── TutorialView, SettingsView
    ├── AnalysisView, CalendarView, HistoryView
    ├── PGBaseView
    ├── CommunityPostView, COMYView, AdminPanel
    ├── ContinuitySupportView
    ├── AddItemView (Food, Workout, Supplement, Condition)
    └── App (メインコンポーネント)
```

## 🎯 コンポーネント別ファイル（参考用）

開発中は以下のように分割されていましたが、最終的に`components.js`に統合されています：

- `components_utils.js` - Icon, MarkdownRenderer
- `components_auth.js` - LoginScreen, OnboardingScreen
- `components_dashboard.js` - DashboardView
- `components_settings.js` - TutorialView, SettingsView
- `components_analysis.js` - AnalysisView, CalendarView, HistoryView
- `components_community.js` - PGBaseView, CommunityPostView, AdminPanel, COMYView, ContinuitySupportView
- `components_addinput.js` - AddItemView（Food, Workout, Supplement, Condition入力）
- `components_app.js` - App（メインコンポーネント）

## 🚀 使用方法

### 方法1: ブラウザで直接開く（推奨）

```
C:\Users\yourc\yourcoach_new\index.html
```

をダブルクリックするだけです。

すべてのJavaScriptが`<script>`タグで読み込まれるため、CORSエラーの心配はありません。

### 方法2: ローカルサーバーで実行

より本番環境に近い形でテストしたい場合：

```bash
cd C:\Users\yourc\yourcoach_new
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開く

## 📦 含まれる機能

### コア機能
- ✅ **認証**: Firebase Auth（Email/Password, Google）
- ✅ **オンボーディング**: 3ステップのプロフィール設定
- ✅ **ダッシュボード**: 日次記録表示（食事、トレーニング、サプリ、コンディション）
- ✅ **入力機能**: 4種類の詳細入力フォーム
- ✅ **設定**: プロフィール、ルーティン、テンプレート管理

### 分析・履歴
- ✅ **分析**: AI搭載のPFC分析とディレクティブ提案
- ✅ **カレンダー**: 月間ビューと達成度表示
- ✅ **履歴**: グラフとトレンド表示

### 教育・サポート
- ✅ **PG BASE**: 教育モジュールとAIチャット
- ✅ **チュートリアル**: ステップバイステップガイド
- ✅ **継続サポート**: 3段階のサポートシステム

### コミュニティ
- ✅ **COMY**: コミュニティフィード
- ✅ **投稿**: Body/Mentalカテゴリの投稿作成
- ✅ **管理パネル**: 投稿の承認/却下

## 🔧 技術スタック

- **React 18** - UI構築
- **Firebase** - 認証、データベース、ストレージ
- **Gemini AI** - AI分析とチャット
- **Tailwind CSS** - スタイリング
- **Lucide Icons** - アイコン

## 📝 元ファイルとの対応

| 元の行範囲 | 新しいファイル | 内容 |
|-----------|--------------|------|
| 35-279 | `styles.css` | CSS |
| 370-506 | `services.js` | Database functions |
| 511-985 | `services.js` | DataService |
| 987-1118 | `services.js` | GeminiAPI |
| 321-366 | `components.js` | Icon, MarkdownRenderer |
| 1120-2635 | `components.js` | App |
| 2637-2763 | `components.js` | TutorialView |
| 2765-4682 | `components.js` | SettingsView |
| 4684-6078 | `components.js` | AnalysisView, CalendarView, HistoryView |
| 6080-8005 | `components.js` | PGBase, Community, Admin, Support |
| 8007-8328 | `components.js` | LoginScreen, OnboardingScreen |
| 8330-8971 | `components.js` | DashboardView |
| 8973-12037 | `components.js` | AddItemView |

## 🎨 主な改善点

### 元の`index_beta.html`
- ❌ 12,049行の単一ファイル
- ❌ 検索とデバッグが困難
- ❌ Git管理が非効率
- ❌ 複数人での作業が困難

### 新しい構造
- ✅ 機能ごとに整理
- ✅ 各ファイルが明確な責任を持つ
- ✅ デバッグしやすい
- ✅ 再利用可能
- ✅ CORSエラーなし（すべて`<script>`タグで読み込み）

## 🔍 トラブルシューティング

### コンポーネントが表示されない

1. ブラウザのコンソール（F12）を開いてエラーを確認
2. 全てのファイルが正しいディレクトリにあるか確認：
   ```
   config.js
   utils.js
   foodDatabase.js
   trainingDatabase.js
   services.js
   components.js
   styles.css
   index.html
   ```

### Firebase接続エラー

`config.js`のFirebase設定が正しいか確認してください。

### データが保存されない

- **DEV_MODE=true**: localStorage使用（ブラウザのローカルストレージ）
- **DEV_MODE=false**: Firebase使用（クラウド）

`config.js`で`DEV_MODE`を確認してください。

## 📊 ファイルサイズ

| ファイル | サイズ | 説明 |
|---------|-------|------|
| index.html | 1KB | HTMLシェル |
| styles.css | 6KB | カスタムCSS |
| config.js | ~3KB | 設定 |
| utils.js | ~15KB | ユーティリティ |
| services.js | ~50KB | サービス層 |
| components.js | ~500KB | 全コンポーネント |
| foodDatabase.js | ~200KB | 食品DB |
| trainingDatabase.js | ~100KB | トレーニングDB |

**合計**: 約875KB（元の単一ファイル: 787KB）

## 🚀 今後の改善案

1. **さらなるモジュール化**: components.jsをさらに分割
2. **ビルドツールの導入**: Vite/Webpackでバンドル
3. **TypeScript化**: 型安全性の向上
4. **テストの追加**: Jest + React Testing Library
5. **パフォーマンス最適化**: Code splitting, Lazy loading

## 📄 ライセンス

Your Coach+ Beta - All Rights Reserved

---

**作成日**: 2025年10月12日
**元ファイル**: C:\Users\yourc\yourcoach\index_beta.html (12,049行)
**新しい構造**: 8ファイル（機能別に整理）
