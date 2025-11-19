# Your Coach+ プロジェクト設定

## プロジェクト概要

Your Coach+は、React 19とFirebaseを使用したフィットネスコーチングアプリケーションです。
食事管理、トレーニング記録、コンディション記録などの機能を提供します。

## 技術スタック

- **フロントエンド**: React 19.2.0 + Vite 7.1.12
- **バックエンド**: Firebase 12.5.0（Auth, Firestore, Storage, Functions）
- **AI**: Google Gemini API
- **スタイリング**: Tailwind CSS 3.4.17
- **アイコン**: Lucide React 0.552.0
- **グラフ**: Chart.js 4.5.1
- **その他**: react-hot-toast 2.6.0, flatpickr 4.6.13

## ファイル構造

```
C:\Users\yourc\yourcoach_new\
├── src/                          # ソースコード（ビルド対象）
│   ├── main.jsx                 # Viteエントリーポイント
│   ├── App.jsx                  # メインアプリコンポーネント
│   ├── index.css                # グローバルCSS（Tailwind含む）
│   ├── globalSetup.js           # グローバル初期化
│   ├── errorHandler.js          # エラーハンドリング
│   ├── config.js                # アプリ設定
│   ├── services.js              # サービス層
│   ├── utils.js                 # ユーティリティ関数
│   ├── foodDatabase.js          # 食品データベース（163KB）
│   ├── trainingDatabase.js      # トレーニングデータベース（47KB）
│   ├── notificationSound.js     # 通知音制御
│   └── components/              # Reactコンポーネント（.jsx）
│       ├── 00_confirm_modal.jsx    # 確認モーダル
│       ├── 00_init.jsx             # 初期化
│       ├── 00_feature_unlock.jsx   # 機能開放
│       ├── 01_common.jsx           # 共通コンポーネント
│       ├── 02_auth.jsx             # 認証
│       ├── 03_dashboard.jsx        # ダッシュボード
│       ├── 04_settings.jsx         # 設定（親コンポーネント）
│       ├── 04_settings_basic.jsx   # 設定 - 基本設定タブ
│       ├── 04_settings_features.jsx # 設定 - 機能設定タブ
│       ├── 04_settings_data.jsx    # 設定 - データ管理タブ
│       ├── 04_settings_other.jsx   # 設定 - その他タブ
│       ├── 05_analysis.jsx         # 分析
│       ├── 06_community.jsx        # コミュニティ
│       ├── 08_app.jsx              # メインアプリ
│       ├── 10_feedback.jsx         # フィードバック
│       ├── 11_ai_food_recognition.jsx  # AI食事認識
│       ├── 13_collaborative_planning.jsx  # 指示書
│       ├── 14_microlearning.jsx    # マイクロラーニング
│       ├── 15_community_growth.jsx # コミュニティ成長
│       ├── 16_history_v10.jsx      # 履歴v10
│       ├── 17_chevron_shortcut.jsx # シェブロンショートカット
│       ├── 18_subscription.jsx     # サブスクリプション
│       ├── 19_add_meal_modal.jsx   # 食事・サプリ記録モーダル
│       └── 20_add_workout_modal.jsx # 運動記録モーダル（運動専用）
├── dist/                         # ビルド出力（デプロイ対象）
│   ├── index.html               # ビルド済みHTML
│   ├── assets/                  # ビルド済みJS/CSS
│   │   ├── index-[hash]-[timestamp].js
│   │   ├── react-vendor-[hash]-[timestamp].js
│   │   ├── firebase-[hash]-[timestamp].js
│   │   ├── charts-[hash]-[timestamp].js
│   │   ├── icons-[hash]-[timestamp].js
│   │   ├── vendor-[hash]-[timestamp].js
│   │   └── index-[hash].css
│   ├── module/                  # 教科書モジュール
│   └── [public/の静的ファイルがコピーされる]
├── public/                       # 静的ファイル（ビルド時にdist/へコピー）
│   ├── config.js                # Firebase設定
│   ├── foodDatabase.js
│   ├── trainingDatabase.js
│   ├── services.js
│   ├── utils.js
│   ├── notificationSound.js
│   ├── home.html                # ランディングページ
│   ├── manifest.json            # PWAマニフェスト
│   ├── icons/                   # PWAアイコン
│   ├── sounds/                  # 通知音
│   ├── module/                  # 教科書コンテンツ
│   ├── privacy.html             # プライバシーポリシー
│   ├── terms.html               # 利用規約
│   └── history_v10_standalone.html  # スタンドアロン履歴
├── scripts/                      # バージョン管理スクリプト
│   ├── release.js                # インタラクティブリリース
│   ├── bump-version.js           # バージョン自動更新
│   └── auto-release.cjs          # 自動リリース（Claude用）
├── index.html                    # Vite用エントリーHTML
├── vite.config.js                # Vite設定
├── package.json                  # 依存関係
├── firebase.json                 # Firebase設定（publicディレクトリ: dist）
├── tailwind.config.js            # Tailwind CSS設定
└── postcss.config.js             # PostCSS設定
```

## 🚨 重要：ファイル構造の変更点

**プロジェクトはVite化済みです！**

### 編集するファイル
- ✅ **`src/components/*.jsx`** ← これを編集する
- ❌ **`components/*.js`** ← 旧バージョン、**完全に削除済み**

### ビルド・デプロイフロー
1. `src/`内のファイルを編集
2. `npm run build`でビルド → `dist/`に出力
3. `firebase deploy --only hosting`で`dist/`をデプロイ

**キャッシュバスターは不要**（Viteがハッシュ + タイムスタンプ付きファイル名を自動生成）

## 開発コマンド

### ローカル開発サーバー
```bash
npm run dev
# Vite devサーバーが起動（http://localhost:8000）
# ホットリロード対応
# ブラウザが自動で開く
```

### ビルド
```bash
npm run build
# src/ をビルドして dist/ に出力
# Terserで圧縮
# コード分割（react-vendor, firebase, charts, icons, vendor）
```

### プレビュー（ビルド後の確認）
```bash
npm run preview
# ビルド済みファイルをローカルでプレビュー
```

### バージョン管理（自動化）

#### パターン1: 自動リリース（Claude Code使用時）
```bash
npm run auto-release
# Gitコミットメッセージから変更タイプを自動判定
# config.js と home.html を自動更新
# Claude Codeが「デプロイして」の指示で自動実行
```

#### パターン2: インタラクティブリリース（手動）
```bash
npm run release
# 対話形式でバージョンタイプとリリースノートを入力
# Minor/Major版の場合、config.jsのRELEASE_NOTESを自動更新
```

#### パターン3: コマンド指定
```bash
# Patch更新（バグ修正・小さな改善）- What's New表示なし
npm run version:patch

# Minor更新（新機能追加）- What's New表示あり
npm run version:minor

# Major更新（大きな変更）- What's New表示あり
npm run version:major
```

#### パターン4: バージョン更新 + ビルド + デプロイ（ワンライナー）
```bash
# Patch更新 + デプロイ
npm run deploy:patch

# Minor更新 + デプロイ
npm run deploy:minor

# Major更新 + デプロイ
npm run deploy:major
```

### Firebaseデプロイ
```bash
npm run build                      # 必ずビルドしてから
firebase deploy --only hosting     # dist/をデプロイ
```

### デプロイの完全フロー

**🚨 重要: Git更新は必須のバックアップ手段です**

#### Claude Code使用時（自動）
```
ユーザー指示: 「デプロイして」または「deploy」

Claude Codeが自動実行:
1. npm run auto-release    # バージョン・リリースノート自動更新
2. npm run build           # ビルド
3. git add + commit + push # Git更新
4. firebase deploy         # デプロイ
```

#### 手動デプロイ時
```bash
# 1. バージョン更新（必要に応じて）
npm run auto-release

# 2. ビルド
npm run build

# 3. Git更新（バックアップ）← 必須！
git add -A
git commit -m "Fix: 変更内容の説明

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. GitHubへpush（リモートバックアップ）← 必須！
git push

# 5. Firebaseデプロイ
firebase deploy --only hosting
```

**⚠️ Git更新の重要性**:
- Gitはバックアップのために使用しています
- **コミット＋pushまで完了して初めて「Git更新完了」**
- pushしないとリモートにバックアップされず、万一の場合に大損害になります
- デプロイ前に必ずGit更新を完了すること

## 🚨 作業フロー（必須）

### 1. 初回チャット開始時：開発サーバーを起動

**必ず最初に実行:**
```bash
npm run dev
# Viteサーバーが http://localhost:8000 で起動
# ホットリロード有効
```

**理由:** 開発中の変更をリアルタイムで確認できる。

### 2. 実装完了後：セルフエラーチェック

**前提条件:**
- ⚠️ **ユーザーはブラウザキャッシュクリア（Ctrl+Shift+R）を毎回確実に実施している**
- ⚠️ **「ブラウザキャッシュをクリアしてください」などの提案は不要**
- ⚠️ **キャッシュの問題ではない前提で原因を調査すること**

**実装後、必ず以下を実行:**
1. 開発サーバー（http://localhost:8000）が起動していることを確認
2. F12を押してコンソールを開く
3. 構文エラー（SyntaxError）がないことを確認
4. **変更が反映されていない場合:**
   - Viteのホットリロードが正しく動作しているか確認
   - 開発サーバーを再起動（`taskkill /F /IM node.exe && npm run dev`）
   - ファイルの保存が正しくされているか確認
   - import文が正しいか確認
5. エラーがなければユーザーに報告
6. エラーがあれば修正してから報告

**確認項目:**
- ✅ コンソールに赤いエラーが表示されていないか
- ✅ 画面が正しく表示されているか
- ✅ ボタンがクリックできるか
- ✅ 変更内容が実際に反映されているか

### 3. デプロイ：指示されたタイミングのみ

**重要:** ユーザーが明示的に「デプロイして」と指示した場合のみ実行すること。

**デプロイ手順（自動実行）:**
```bash
# 1. バージョン・リリースノート自動更新
npm run auto-release

# 2. ビルド
npm run build

# 3. Gitコミット＋push
git add -A
git commit -m "変更内容

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push

# 4. デプロイ
firebase deploy --only hosting
```

**実行タイミング:**
- ✅ ユーザーが「デプロイして」「deploy」と明示的に指示した時のみ
- ✅ すべての手順を自動で実行（バージョン更新→ビルド→Git→デプロイ）

**禁止事項:**
- ❌ 勝手にデプロイしない
- ❌ 実装完了＝デプロイではない
- ❌ ユーザーの確認を待たずにデプロイしない

### 4. Git更新（バックアップ）：3時間に1回確認

**重要:** 3時間ごとにユーザーに確認し、承認を得てから実行すること。

**確認フォーマット:**
```
🕐 3時間が経過しました

Git更新（バックアップ）を実行しますか？
- 変更ファイル: [ファイル一覧]
- 変更内容: [変更の概要]

承認いただければコミット＋pushします。
```

**実行コマンド（承認後）:**
```bash
git add .
git commit -m "チャット内容の説明"
git push
```

**100%遵守事項:**
- ❌ 勝手にGit更新しない
- ❌ 3時間経過しても確認なしで実行しない
- ✅ 必ずユーザーの承認を得てから実行
- ✅ Git更新 = バックアップ + バージョン管理

## コーディング規約

### JavaScript/JSX
- **モジュール形式**: ES Modules（Vite使用）
- **命名規則**:
  - コンポーネント: PascalCase（例: `DashboardView`）
  - 関数: camelCase（例: `getFoodDB`）
  - 定数: UPPER_SNAKE_CASE（例: `MAX_CALORIES`）
- **React Hooks**:
  - `useState`, `useEffect`, `useCallback`, `useMemo`を適切に使用
  - 依存配列を必ず指定

### CSS
- **主要スタイル**: Tailwind CSSのユーティリティクラスを使用
- **カスタムCSS**: `src/index.css`に定義
- **ダークモード**: `dark:`プレフィックスを使用
- **レスポンシブ**: モバイルファーストで設計

### コンポーネント設計
- **単一責任の原則**: 各コンポーネントは1つの機能に集中
- **Props**: 明確な命名とデフォルト値の設定
- **State管理**: ローカルstateは最小限に、必要に応じてグローバル化

### アイコン使用規則

**重要**: アプリ内の情報表示アイコンは以下のルールに従って統一されています。

#### アイコンの使い分け

- **？アイコン（HelpCircle）**: 使い方・操作方法・手順の説明
  - 例: 「食事記録の使い方」「AI食事認識の使い方」「質問機能の使い方」
  - 用途: ユーザーが操作方法を知りたい時に使用
  - ボタンラベル: 「使い方」または「使い方を見る」
  - モーダルタイトル: 「〇〇の使い方」

- **iアイコン（Info）**: 数値の意味・計算方法・ノウハウ・コンセプトの説明
  - 例: 「採点基準」「クレジットシステム」「目的別設定」「守破離システム」
  - 用途: 仕組みや概念を理解したい時に使用
  - ボタンラベル: 「〇〇について」「〇〇とは？」「詳細を見る」
  - モーダルタイトル: 「〇〇について」「〇〇とは？」

#### 実装ガイドライン

```jsx
// ？アイコン（使い方系）- 青系の色
<button className="flex items-center gap-1 text-blue-600 hover:text-blue-700">
  <Icon name="HelpCircle" size={18} />
  <span className="text-sm">使い方</span>
</button>

// iアイコン（ノウハウ・数値系）- グレー系の色
<button className="flex items-center gap-1 text-gray-600 hover:text-gray-700">
  <Icon name="Info" size={18} />
  <span className="text-sm">詳細を見る</span>
</button>

// 装飾アイコン（クリック不可）
<div className="flex items-center gap-2 text-gray-500">
  <Icon name="Info" size={16} className="flex-shrink-0" />
  <span className="text-sm">{説明文}</span>
</div>
```

#### アイコンサイズの統一
- ボタン内アイコン: `size={18}` または `size={20}`
- 装飾アイコン: `size={14}` または `size={16}`
- タイトルアイコン: `size={20}` または `size={24}`

#### 新規実装時の判断基準
1. 「どうやって〇〇するか」を説明する → ？アイコン
2. 「〇〇とは何か」「なぜそうなるのか」を説明する → iアイコン
3. 数値の計算方法や基準を説明する → iアイコン
4. 操作手順やフローを説明する → ？アイコン

## プロジェクトの主要機能

### 認証（src/components/02_auth.jsx）
- Email/Password認証
- Google認証
- オンボーディングフロー（3ステップ）

### ダッシュボード（src/components/03_dashboard.jsx）
- 日次記録の表示
- 食事、運動、コンディションの一覧
- カロリー・PFCバランスの表示
- スコア表示（食事、運動、コンディション）

### 入力機能

#### 食事・サプリ記録（src/components/19_add_meal_modal.jsx）
- **3つのタブ**: 食材、料理、サプリメント
- **3つの入力方法**: 写真から記録、データベース検索、手動で作成
- **テンプレート機能**: 初日から利用可能
- **カスタム作成**: 食材・料理・サプリの登録
- **initialTab props**: モーダル開始時のタブを指定可能（'food', 'recipe', 'supplement'）

#### 運動記録（src/components/20_add_workout_modal.jsx）
- **機能**: 運動の追加・編集（統合済み）
- **3つの入力方法**: データベース検索、カスタム作成、テンプレート
- **テンプレート機能**: 初日から利用可能
- **セット編集**: スライダー、増減ボタンで直感的に編集
- **type制限**: type='workout' 専用（他のtypeはエラー表示）

#### コンディション記録
- **場所**: ダッシュボード内で直接入力（モーダル不要）
- **方式**: ドット選択式（5段階評価）

### 分析機能（src/components/05_analysis.jsx）
- AI搭載のPFC分析（Gemini API）
- カレンダービュー
- 履歴グラフ・トレンド
- デイリー分析

### コミュニティ（src/components/06_community.jsx）
- 投稿の作成・閲覧
- いいね・コメント機能
- 管理者パネル（投稿承認）

### 設定（src/components/04_settings*.jsx）

**構成**: 親コンポーネント + 4つのタブコンポーネントに分割

#### 04_settings.jsx（親コンポーネント）
- タブ切り替え管理
- 各タブコンポーネントの読み込み
- 共通のレイアウト

#### 04_settings_basic.jsx（基本設定タブ）
- プロフィール管理（身長・体重・体脂肪率・年齢・性別）
- 目標設定（目的、活動レベル）
- LBM計算と目標栄養素の自動計算

#### 04_settings_features.jsx（機能設定タブ）
- テンプレート管理（食事・運動・サプリメント）
- ルーティン設定（分割法）
- カスタムアイテム管理（食材・料理・運動・サプリ）

#### 04_settings_data.jsx（データ管理タブ）
- データエクスポート（JSON形式）
- データインポート
- データ削除
- バックアップ

#### 04_settings_other.jsx（その他タブ）
- **アプリ情報**: バージョン表示、リリース日
- **リンク**: リリースノート、プライバシーポリシー、利用規約
- **アカウント管理**: プレミアムモード切替（管理者のみ）
- **ログアウト**

### 履歴（src/components/16_history_v10.jsx）
- 体重・体脂肪率の推移グラフ
- カロリー・PFC推移グラフ
- 日付選択機能

## データ構造

### Firestore Collections
- `users/{userId}` - ユーザープロフィール
- `users/{userId}/dailyRecords/{date}` - 日次記録
- `users/{userId}/favorites` - お気に入り
- `users/{userId}/routines` - ルーティン
- `users/{userId}/templates` - テンプレート
- `community/posts` - コミュニティ投稿

### 注意：DEV_MODE削除済み
- **DEV_MODE完全削除済み**（2025年11月17日時点）
- LocalStorageでのテストモードは存在しません
- すべての操作はFirebaseに直接接続されます

## バージョン管理システム

### 概要
**Semantic Versioning (SemVer)** 形式でバージョン管理を実施しています。

```
バージョン形式: Major.Minor.Patch (例: 1.2.15)

- Major: 破壊的変更・大規模リニューアル（年に1-2回）
- Minor: 新機能追加（月に1-2回）
- Patch: バグ修正・小さな改善（頻繁）
```

### 重要な仕様
- **What's New モーダル**: Minor版更新時のみ表示（Patch更新では非表示）
- **頻繁なデプロイ対応**: 月100回以上のデプロイでもユーザーに通知を出さない設計

### ファイル構成

#### src/config.js
```javascript
const APP_VERSION = '1.0.0';  // フルバージョン

const RELEASE_NOTES = {
    '1.0': {  // Minor版キー（Patch版をまとめる）
        date: '2025年11月4日',
        title: '初回リリース',
        features: [
            'LBMベースの科学的な体組成管理機能',
            '食事・運動・コンディション記録',
            'AI分析（Google Gemini API）'
        ]
    }
};
```

#### src/components/08_app.jsx
- **WhatsNewModal コンポーネント**: 新機能紹介モーダル
- **バージョン比較ロジック**: Minor版のみ比較してモーダル表示判定
```javascript
const getMinorVersion = (version) => {
    const parts = version.split('.');
    return `${parts[0]}.${parts[1]}`;  // '1.0'
};

if (lastMinorVersion !== currentMinorVersion) {
    // What's Newモーダルを表示
}
```

#### src/components/04_settings_other.jsx
- アプリ情報セクション
- バージョン表示（例: v1.0.0）
- リリース日表示（Minor版キーでRELEASE_NOTESから取得）
- リリースノート・プライバシー・利用規約へのリンク

#### home.html
- リリースノートのマスターデータ
- アプリから `home.html#release-notes` でリンク
- バージョン表記例: "v1.0.x"（Patch版をまとめて表示）

### 自動化スクリプト

#### scripts/release.js（推奨）
インタラクティブなリリース管理スクリプト

**使い方:**
```bash
npm run release
```

**機能:**
1. バージョンタイプ選択（Patch/Minor/Major）
2. 自動バージョンインクリメント
3. リリースノート入力（Minor/Major時）
4. config.jsの自動更新
5. 次のステップを表示

**出力例:**
```
📌 現在のバージョン: v1.0.0
どのバージョンを更新しますか？
1. Patch (バグ修正・小さな改善) - What's New表示なし
2. Minor (新機能追加) - What's New表示あり
3. Major (大きな変更) - What's New表示あり
```

#### scripts/bump-version.js
コマンドライン引数でバージョンタイプを指定するシンプル版

**使い方:**
```bash
npm run version:patch  # v1.0.0 → v1.0.1
npm run version:minor  # v1.0.5 → v1.1.0
npm run version:major  # v1.5.2 → v2.0.0
```

### リリースワークフロー

#### 推奨フロー（インタラクティブ）
```bash
# 1. リリース準備（バージョン更新 + リリースノート入力）
npm run release

# 2. home.htmlを手動更新（Minor/Major時のみ）

# 3. ビルド
npm run build

# 4. Git更新
git add .
git commit -m "Release: v1.1.0"
git push

# 5. デプロイ
firebase deploy --only hosting
```

#### ワンライナーフロー（Patch版）
```bash
# バージョン更新 + ビルド + デプロイを一括実行
npm run deploy:patch
```

### バージョン更新ルール

#### Patch更新（頻繁）
- **タイミング**: バグ修正、UIの微調整、小さな改善
- **What's New**: 表示しない
- **RELEASE_NOTES**: 更新不要
- **home.html**: 更新不要

#### Minor更新（月1-2回）
- **タイミング**: 新機能追加、大きな改善
- **What's New**: 表示する
- **RELEASE_NOTES**: 更新必須
- **home.html**: 更新推奨

#### Major更新（年1-2回）
- **タイミング**: 破壊的変更、大規模リニューアル
- **What's New**: 表示する
- **RELEASE_NOTES**: 更新必須
- **home.html**: 更新必須

### LocalStorage管理
- **キー**: `yourCoachBeta_lastSeenVersion`
- **保存形式**: フルバージョン（例: "1.0.0"）
- **比較**: Minor版のみ比較（例: "1.0" と "1.1"）

## 開発フロー

### 新機能の追加
1. `src/components/`内の該当ファイルを編集
2. 開発サーバー（`npm run dev`）で動作確認（ホットリロード有効）
3. F12でコンソールエラーをチェック
4. ビルド（`npm run build`）
5. 変更をコミット

### バグ修正
1. ブラウザのコンソール（F12）でエラーを確認
2. 該当するファイルを特定（`src/components/*.jsx`）
3. 修正を実施
4. 開発サーバーで動作確認
5. ビルド → コミット

### テスト
- **手動テスト**: ブラウザで各機能を実際に操作
- **エラー確認**: 必ずブラウザのコンソール（F12）でエラーをチェック

## トラブルシューティング

### ビルドエラーが発生する
1. `npm install`で依存関係を再インストール
2. `node_modules`と`package-lock.json`を削除して再インストール
3. エラーメッセージを確認して該当ファイルを修正

### 開発サーバーが起動しない
1. ポート8000が既に使用されていないか確認: `netstat -ano | findstr :8000`
2. Node.jsプロセスを終了: `taskkill /F /IM node.exe`
3. `npm run dev`を再実行

### コンポーネントが表示されない
1. ブラウザのコンソール（F12）を開いてエラーを確認
2. `src/App.jsx`でコンポーネントが正しくインポートされているか確認
3. ビルドエラーがないか確認

### Firebase接続エラー
- `public/config.js`のFirebase設定が正しいか確認
- Firebase Consoleでプロジェクトが有効か確認

### スタイルが適用されない
- Tailwind CSSの設定を確認（`tailwind.config.js`）
- ビルドを再実行（`npm run build`）
- ブラウザのキャッシュをクリア（Ctrl+Shift+R）

## 重要な注意事項

### UI/UX重要事項

#### BAB（Bottom Action Bar）について
- **正しい定義**: BABは画面下部の「ホーム、履歴、PGBASE、COMY、設定」のタブバーのこと
- **絶対に「FAB」と呼ばない**: FAB（Floating Action Button）は削除済みで存在しない
- **BABの実装**: `src/components/08_app.jsx`に実装されている
- **BABの構造**:
  - クラス: `fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t shadow-lg`
  - 折りたたみボタン（ChevronUp/ChevronDown）で展開/格納を切り替え
  - `bottomBarExpanded`状態で展開時はメニューが表示される
  - 格納時の高さ: 約40px
  - 展開時の高さ: 約120-150px（メニュー内容により変動）
- **BABとの干渉回避**:
  - 固定配置のUI要素（入力欄など）は、`position: fixed; bottom: ${babHeight}px`でBABの高さに応じて位置を動的に調整する
  - ResizeObserverでBABの高さ変化を監視し、即時連動させる
  - スクロールコンテナには下部に`padding-bottom: ${babHeight + 余白}px`を確保する

#### シェブロンショートカットについて
- **BABとは別物**: 画面左右の端にある展開式ショートカットメニュー
- **実装**: `src/components/17_chevron_shortcut.jsx`に実装されている
- **位置**: 画面左右の端（`top-[85%]`の位置）にシェブロンボタンがあり、クリックで展開

### セキュリティ
- **APIキー**: `public/config.js`の機密情報は公開リポジトリにコミットしない
- **Firebase Rules**: Firestoreセキュリティルールを適切に設定
- **認証**: 全ての機密操作は認証済みユーザーのみに制限

### パフォーマンス
- **画像最適化**: アップロード画像は適切なサイズに圧縮
- **データ取得**: 必要なデータのみを取得（無駄なクエリを避ける）
- **キャッシュ**: 頻繁にアクセスするデータはキャッシュを活用
- **Code Splitting**: Viteが自動で実行（react-vendor, firebase, charts, icons, vendor）

### メンテナンス
- **バックアップ**: 作業経過3時間で必ずバックアップを作成するように提案
- **バージョン管理**: 会話圧縮後、最優先でGitにコミット
- **ドキュメント**: 大きな変更時はCLAUDE.mdも更新

## AI（Claude Code）への指示

### 🚨🚨🚨 最重要：解釈確認を100%実施すること 🚨🚨🚨

**【絶対厳守】すべての実装を開始する前に、必ず以下の形式で解釈を提示し、ユーザーの承認を得ること**

この解釈確認フローは**例外なく100%実施**すること。どんなに簡単に見える指示でも、必ず解釈確認を行う。解釈確認を怠ると、ユーザーの意図とは異なる実装をしてしまい、修正作業が増えてしまう。

```
## 指示内容の解釈確認

【ご指示】
[ユーザーの指示を引用]

【私の解釈】
1. [解釈1]
2. [解釈2]
...

【実装内容】
- **ファイル1**: [ファイル名]
  - [変更点1]
  - [変更点2]
- **ファイル2**: [ファイル名]
  - [変更点]

この解釈で実装してよろしいでしょうか？
```

**【重要】承認を得るまで実装を開始しないこと。解釈確認なしに実装を開始した場合、ユーザーの信頼を失う。**

### コード修正時
- 変更前に必ず該当ファイルを読み込んで現在の実装を確認
- 大きな変更の場合は、変更前のバックアップを作成するよう確認し、承認後に実行
- 変更後は必ずブラウザで動作確認
- **重要**: ユーザーから明示的な削除指示がない限り、既存のコードや機能を削除しない

### 新機能追加時
- **まず実装方針の解釈を提示し、承認を得てから実装**（必須）
- 関連する既存コードを確認し、スタイルを統一
- 必要に応じてCLAUDE.mdも更新

### デバッグ時
- エラーメッセージを詳細に分析
- 該当箇所のコードを読み込んで問題を特定
- 修正案を複数提示（可能な場合）

### UI/UXデザイン変更時
- ユーザーが提示した画像やデザインを忠実に再現
- **デザインの変更は必ずユーザーの承認を得てから実施**（必須）
- 既存のデザインを変更する場合は、変更前の状態を確認して記録
- **絶対に勝手に削除しない**: 機能やコンポーネントの削除は必ずユーザーの明示的な指示を待つ

## 実装報告のフォーマット

実装完了時は、以下のフォーマットで報告してください。

### 報告テンプレート

```markdown
## 実装完了報告

### セッション情報（必須）
- **トークン使用量**: XX,XXX / 200,000 トークン
- **使用率**: XX%
- **経過時間**: XX分

### 実装内容

[実装した機能の概要]

### 変更ファイル

1. **ファイル名**: `src/components/XX_xxx.jsx`
   - **変更場所**: Line XXX-YYY
   - **変更内容**: [何をどう変更したか]

2. **ファイル名**: `src/components/YY_yyy.jsx`
   - **変更場所**: Line ZZZ
   - **変更内容**: [何をどう変更したか]

### 確認方法

**場所**: [設定 → データ管理] など、機能にアクセスする具体的な場所

**手順**:
1. [確認手順1]
2. [確認手順2]
3. [確認手順3]

**期待される動作**:
- ✅ [期待される動作1]
- ✅ [期待される動作2]

### ブラウザ確認

- コンソールエラー: [あり/なし]
- 動作確認: [完了/未完了]
```

### 重要なポイント

1. **セッション情報を必ず報告**: トークン使用量・使用率・経過時間を明記
2. **変更場所を明記**: 行番号を必ず記載する
3. **キャッシュバスター不要**: Viteが自動でハッシュ + タイムスタンプを付与
4. **確認方法を具体的に**: ユーザーが実際に確認できる手順を記載
5. **期待される動作を列挙**: チェックリスト形式で明確に

## 今後の改善予定

1. ~~**モジュール化**: components.jsのさらなる分割~~ ✅ 完了（Vite化）
2. ~~**ビルドツール**: Vite/Webpackの導入~~ ✅ 完了（Vite 7.1.12）
3. **TypeScript化**: 型安全性の向上
4. **テスト**: Jest + React Testing Libraryの導入
5. **パフォーマンス**: さらなるCode splitting, Lazy loading

---

**最終更新**: 2025年11月19日
**プロジェクト開始**: 2025年10月12日
**Vite化**: 2025年11月4日
**バージョン管理自動化**: 2025年11月19日
**home.html修正**: 2025年11月19日（public/に移動、firebase.jsonリライトルール修正）
