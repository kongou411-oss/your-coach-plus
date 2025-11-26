# Your Coach+ - Claude Code 指示書

## 🚨 最重要ルール

### 1. 解釈確認を100%実施
実装前に必ず以下の形式で確認し、承認を得ること：
```
## 指示内容の解釈確認
【ご指示】[引用]
【私の解釈】1. ... 2. ...
【実装内容】ファイル名と変更点
この解釈で実装してよろしいでしょうか？
```

### 2. 禁止事項
- ❌ 勝手にデプロイしない（「デプロイして」指示時のみ）
- ❌ 勝手にGit更新しない（3時間ごとに確認→承認後のみ）
- ❌ 明示的指示なしにコード・機能を削除しない
- ❌ 「ブラウザキャッシュクリアしてください」と言わない（ユーザーは実施済み）

### 3. services.js の二重管理
```
DataService.xxx を使用 → public/services.js を編集
import { xxx } from '../services' → src/services.js を編集
```
※ 現在はほぼ `public/services.js` が使用されている

---

## 開発フロー

### 作業開始時
```bash
npm run dev  # http://localhost:8000 でホットリロード
```

### 実装完了時
1. コンソール(F12)でエラー確認
2. 動作確認
3. ユーザーに報告

### デプロイ時（指示された場合のみ）

⚠️ **「デプロイして」と言われたら必ず以下を全て実行**:
1. `firebase deploy --only functions` （Cloud Functions変更時）
2. `npm run build && firebase deploy --only hosting` （フロント変更時）
3. `git add -A && git commit && git push`

```bash
# フルデプロイコマンド
npm run auto-release && npm run build && git add -A && git commit -m "変更内容" && git push && firebase deploy
```

**Minor/Major版の場合**: デプロイ前に以下を手動更新
- `src/config.js` の RELEASE_NOTES
- `public/home.html` のリリースノートセクション

#### 過去のデプロイ漏れ（再発防止）
| 日付 | ミス | 原因 | 対策 |
|------|------|------|------|
| 2025/11/26 | hostingデプロイ漏れ | functions のみデプロイしてhostingを忘れた | 「デプロイして」=functions+hosting+git全て実行 |

---

## ファイル構造（要点）

```
src/components/*.jsx  ← 編集対象
public/services.js    ← DataService（グローバル変数）
public/config.js      ← Firebase設定
dist/                 ← ビルド出力（デプロイ対象）
```

### 主要コンポーネント
| ファイル | 機能 |
|---------|------|
| 02_auth.jsx | 認証・オンボーディング |
| 03_dashboard.jsx | ダッシュボード |
| 04_settings*.jsx | 設定（5タブ分割） |
| 05_analysis.jsx | AI分析 |
| 08_app.jsx | メインアプリ・BAB |
| 19_add_meal_modal.jsx | 食事記録 |
| 20_add_workout_modal.jsx | 運動記録 |

---

## コマンド一覧

| コマンド | 用途 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | ビルド |
| `npm run auto-release` | バージョン自動更新 |
| `firebase deploy --only hosting` | デプロイ |

---

## コーディング規約

- **命名**: コンポーネント=PascalCase, 関数=camelCase, 定数=UPPER_SNAKE_CASE
- **スタイル**: Tailwind CSS優先
- **アイコン**:
  - HelpCircle(?)=使い方説明
  - Info(i)=仕組み・数値説明

---

## UI注意事項

### BAB（Bottom Action Bar）
- 画面下部のタブバー（ホーム、履歴、PGBASE、COMY、設定）
- FABとは呼ばない（削除済み）
- 実装: `08_app.jsx`

### 通知システム
- 実装: `21_notification_settings.jsx` + `functions/index.js`
- 4タブ構成: 食事・運動・分析・カスタム
- 各タブでタイトル・本文・時刻をカスタマイズ可能
- FCMトークンは `users/{userId}.fcmTokens` に配列で保存
- **連鎖スケジューリング方式**: Cloud Tasks で翌日タスクを自動作成して毎日繰り返し

#### 過去のバグ（再発防止）
| 日付 | バグ | 原因 | 修正 |
|------|------|------|------|
| 2025/11/26 | 2回目以降の通知が来ない | `rescheduleNotification()` Line 447 で未定義変数 `nextDateJST` を参照 | `tomorrowJST` に修正（Line 420で定義済み）|

#### 通知システム実装時の注意
- 変数名は定義箇所と使用箇所で必ず一致させる
- try-catch でエラーが隠蔽されるため、ログを必ず確認する
- Cloud Functions のログ確認: `firebase functions:log --only sendPushNotification`

---

## 実装報告フォーマット

```markdown
## 実装完了報告

### 実装内容
[概要]

### 変更ファイル
1. `ファイル名`: Line XXX-YYY - [変更内容]

### 確認方法
**場所**: [メニューパス]
**手順**: 1. ... 2. ...
**期待動作**: ✅ ...
```

---

## 参照ドキュメント

詳細な技術仕様・トラブルシューティングは `README.md` を参照。
