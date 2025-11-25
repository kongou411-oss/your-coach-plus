# Your Coach+

[![Deploy to Firebase](https://github.com/kongou411-oss/your-coach-plus/actions/workflows/deploy.yml/badge.svg)](https://github.com/kongou411-oss/your-coach-plus/actions/workflows/deploy.yml)

フィットネス・栄養管理のためのAI搭載コーチングアプリ

🌐 **Live Demo**: https://your-coach-plus.web.app

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | React 19.2.0 + Vite 7.1.12 |
| バックエンド | Firebase 12.5.0 (Auth, Firestore, Storage, Functions) |
| AI | Google Gemini API |
| スタイリング | Tailwind CSS 3.4.17 |
| アイコン | Lucide React 0.552.0 |
| グラフ | Chart.js 4.5.1 |
| その他 | react-hot-toast, flatpickr |

## セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動（http://localhost:8000）
npm run dev

# ビルド
npm run build

# デプロイ
firebase deploy --only hosting
```

## ファイル構造

```
yourcoach_new/
├── src/                          # ソースコード（ビルド対象）
│   ├── main.jsx                  # Viteエントリーポイント
│   ├── App.jsx                   # メインアプリコンポーネント
│   ├── index.css                 # グローバルCSS（Tailwind含む）
│   ├── config.js                 # アプリ設定・バージョン管理
│   ├── services.js               # サービス層（ES Modules）
│   ├── utils.js                  # ユーティリティ関数
│   ├── foodDatabase.js           # 食品データベース
│   ├── trainingDatabase.js       # トレーニングデータベース
│   └── components/               # Reactコンポーネント
│       ├── 00_*.jsx              # 共通コンポーネント
│       ├── 02_auth.jsx           # 認証
│       ├── 03_dashboard.jsx      # ダッシュボード
│       ├── 04_settings*.jsx      # 設定（5タブ分割）
│       ├── 05_analysis.jsx       # 分析
│       ├── 06_community.jsx      # コミュニティ
│       ├── 08_app.jsx            # メインアプリ
│       ├── 16_history_v10.jsx    # 履歴
│       ├── 19_add_meal_modal.jsx # 食事記録モーダル
│       └── 20_add_workout_modal.jsx # 運動記録モーダル
├── public/                       # 静的ファイル
│   ├── config.js                 # Firebase設定
│   ├── services.js               # DataService（グローバル変数）
│   ├── home.html                 # ランディングページ
│   ├── manifest.json             # PWAマニフェスト
│   └── firebase-messaging-sw.js  # 通知Service Worker
├── dist/                         # ビルド出力（デプロイ対象）
├── functions/                    # Cloud Functions
├── scripts/                      # バージョン管理スクリプト
├── vite.config.js                # Vite設定
├── tailwind.config.js            # Tailwind CSS設定
└── firebase.json                 # Firebase設定
```

## 主要機能

### 認証 (02_auth.jsx)
- Email/Password認証
- Google認証
- 3ステップオンボーディング

### ダッシュボード (03_dashboard.jsx)
- 日次記録の表示
- 食事・運動・コンディション一覧
- カロリー・PFCバランス表示
- スコア表示

### 食事記録 (19_add_meal_modal.jsx)
- 3つのタブ: 食材、料理、サプリメント
- 3つの入力方法: 写真撮影、DB検索、手動作成
- テンプレート機能

### 運動記録 (20_add_workout_modal.jsx)
- DB検索、カスタム作成、テンプレート
- セット編集（スライダー・増減ボタン）

### 設定 (04_settings*.jsx)
| タブ | ファイル | 内容 |
|------|----------|------|
| 基本設定 | 04_settings_basic.jsx | プロフィール、目標設定 |
| 機能設定 | 04_settings_features.jsx | テンプレート、ルーティン |
| 通知設定 | 04_settings_notification.jsx | 通知スケジュール |
| データ管理 | 04_settings_data.jsx | エクスポート/インポート |
| その他 | 04_settings_other.jsx | アプリ情報、ログアウト |

### 分析 (05_analysis.jsx)
- AI搭載PFC分析（Gemini API）
- カレンダービュー
- 履歴グラフ・トレンド

### 通知システム (21_notification_settings.jsx)
- Firebase Cloud Messaging (FCM)
- 4タブ構成: 食事・運動・分析・カスタム
- 各タブでタイトル・本文・時刻を自由にカスタマイズ可能
- FCMトークンは配列で保存（複数端末対応）
- 既知のバグあり（開発中）

## データ構造（Firestore）

```
users/{userId}
├── profile                    # ユーザープロフィール
├── dailyRecords/{date}        # 日次記録
├── favorites                  # お気に入り
├── routines                   # ルーティン
├── templates                  # テンプレート
└── fcmTokens/{tokenId}        # FCM通知トークン

community/posts                # コミュニティ投稿
```

## バージョン管理

### Semantic Versioning
- **Major**: 破壊的変更（年1-2回）
- **Minor**: 新機能追加（月1-2回）→ What's New表示
- **Patch**: バグ修正（頻繁）→ What's New非表示

### リリースコマンド
```bash
npm run auto-release   # Gitコミットから自動判定
npm run release        # インタラクティブ
npm run version:patch  # Patch更新
npm run version:minor  # Minor更新
npm run version:major  # Major更新
```

### Minor/Major版リリース時の必須作業
1. `src/config.js` の RELEASE_NOTES に新バージョン追加
2. `public/home.html` のリリースノートセクション更新
3. ビルド → デプロイ

## トラブルシューティング

### ビルドエラー
```bash
rm -rf node_modules package-lock.json
npm install
```

### 開発サーバーが起動しない
```bash
# ポート確認
netstat -ano | findstr :8000

# Node.jsプロセス終了（Windows）
taskkill /F /IM node.exe

# 再起動
npm run dev
```

### Firebase接続エラー
- `public/config.js` のFirebase設定を確認
- Firebase Consoleでプロジェクト有効化を確認

### スタイルが適用されない
```bash
npm run build
# ブラウザでCtrl+Shift+R
```

## コーディング規約

### 命名規則
- コンポーネント: PascalCase (`DashboardView`)
- 関数: camelCase (`getFoodDB`)
- 定数: UPPER_SNAKE_CASE (`MAX_CALORIES`)

### スタイル
- Tailwind CSSユーティリティクラス優先
- ダークモード: `dark:` プレフィックス
- レスポンシブ: モバイルファースト

### アイコン使用規則
| アイコン | 用途 | 例 |
|---------|------|-----|
| HelpCircle (?) | 使い方・操作方法 | 「食事記録の使い方」 |
| Info (i) | 仕組み・数値説明 | 「採点基準について」 |

## UI注意事項

### BAB（Bottom Action Bar）
- 画面下部のタブバー（ホーム、履歴、PGBASE、COMY、設定）
- 実装: `08_app.jsx`
- 高さ: 格納時40px / 展開時120-150px
- 干渉回避: `position: fixed; bottom: ${babHeight}px`

### シェブロンショートカット
- 画面左右端の展開式メニュー
- 実装: `17_chevron_shortcut.jsx`

## セキュリティ

- APIキー: `public/config.js` は公開リポジトリにコミットしない
- Firebase Rules: 適切に設定
- 認証: 機密操作は認証済みユーザーのみ

## 今後の改善予定

- [x] ~~Vite/Webpack導入~~ ✅ 完了（Vite 7.1.12）
- [x] ~~コンポーネント分割~~ ✅ 完了
- [ ] TypeScript化
- [ ] Jest + React Testing Library導入
- [ ] さらなるCode splitting, Lazy loading

## ライセンス

Your Coach+ - All Rights Reserved

---

**プロジェクト開始**: 2025年10月12日
**Vite化**: 2025年11月4日
**最終更新**: 2025年11月26日
