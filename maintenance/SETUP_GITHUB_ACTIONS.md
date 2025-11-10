# GitHub Actions 自動デプロイ セットアップガイド

## 🎯 概要

このガイドに従うと、GitHub に push するだけで自動的に Firebase Hosting にデプロイされるようになります。

---

## 📋 前提条件

- ✅ GitHub リポジトリ作成済み
- ✅ Firebase プロジェクト作成済み
- ✅ Firebase CLI インストール済み

---

## 🔧 セットアップ手順

### **Step 1: Firebase CI トークン生成** (ローカル実行)

Windows PowerShell または コマンドプロンプトで以下を実行：

```bash
firebase login:ci
```

**実行結果**:
```
Visit this URL on this device to log in:
https://accounts.google.com/o/oauth2/auth?...

Waiting for authentication...

✔  Success! Use this token to login on a CI server:

1//0eXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ← このトークンをコピー
```

**⚠️ 重要**: このトークンは秘密情報です。絶対に公開しないでください。

---

### **Step 2: GitHub Secrets に登録**

1. GitHubリポジトリにアクセス
   ```
   https://github.com/kongou411-oss/your-coach-plus
   ```

2. **Settings** タブをクリック

3. 左メニューから **Secrets and variables** → **Actions** をクリック

4. **New repository secret** ボタンをクリック

5. 以下を入力:
   - **Name**: `FIREBASE_TOKEN`
   - **Secret**: [Step 1でコピーしたトークン]

6. **Add secret** をクリック

---

### **Step 3: GitHub Actions の有効化確認**

1. リポジトリの **Actions** タブにアクセス

2. もし "Workflows aren't being run" と表示されたら:
   - **I understand my workflows, go ahead and enable them** をクリック

3. 緑色の **✓** マークが表示されればOK

---

## 🚀 動作確認

### **テストデプロイ**

1. 何か簡単な変更を加える（例: README.md に1行追加）

2. Git コミット＆プッシュ:
   ```bash
   git add .
   git commit -m "test: GitHub Actions テスト"
   git push origin main
   ```

3. GitHub の **Actions** タブを開く

4. "Deploy to Firebase Hosting" ワークフローが実行中になる

5. 完了すると緑色の ✓ が表示される

6. 本番環境を確認:
   ```
   https://your-coach-plus.web.app
   ```

---

## 📊 自動化される内容

### **push するたびに自動実行**:

```
1. コードチェック
   - JavaScript シンタックスチェック
   - TODO コメント検索
   - プロジェクト統計

2. Firebase デプロイ
   - Hosting に自動デプロイ
   - 約1-2分で完了

3. 通知
   - 成功/失敗を GitHub UI で確認
   - メール通知（設定すれば）
```

---

## 🎯 使い方（完全自動化後）

### **開発フロー**:

```bash
# 1. コード変更
# components/03_dashboard.js を編集...

# 2. ローカルでテスト（オプション）
# ブラウザで確認...

# 3. Git コミット
git add .
git commit -m "fix: ダッシュボードのバグ修正"

# 4. GitHub に push
git push origin main

# 5. 🤖 自動でデプロイされる！
# 何もしなくてOK、1-2分待つだけ

# 6. 完了確認
# https://your-coach-plus.web.app にアクセス
```

**もう `firebase deploy` を手動実行する必要はありません！**

---

## 📈 GitHub Actions の確認方法

### **実行状況をリアルタイムで確認**:

1. GitHub リポジトリの **Actions** タブ

2. 最新のワークフロー実行をクリック

3. **Deploy to Production** ジョブをクリック

4. ログをリアルタイムで確認:
   ```
   ✓ Checkout code
   ✓ Setup Node.js
   ✓ Install Firebase CLI
   ✓ Deploy to Firebase Hosting
     Deploying to 'your-coach-plus'...
     ✔ Deploy complete!
   ```

---

## 🔔 通知設定（オプション）

### **デプロイ完了をメールで受け取る**:

1. GitHub Settings → Notifications

2. **Actions** の項目で以下を有効化:
   - ✅ Email notifications
   - ✅ Failed workflows only（失敗時のみ）
   - ✅ All workflows（全て）

---

## 🐛 トラブルシューティング

### **エラー: "Error: HTTP Error: 401, Unauthorized"**

**原因**: Firebase トークンが無効

**解決方法**:
1. `firebase login:ci` を再実行
2. 新しいトークンを GitHub Secrets に再登録

---

### **エラー: "permission denied"**

**原因**: GitHub Actions の権限不足

**解決方法**:
1. Settings → Actions → General
2. **Workflow permissions** で:
   - ✅ Read and write permissions

---

### **デプロイが実行されない**

**確認項目**:
- ✅ main ブランチに push しているか？
- ✅ GitHub Actions が有効になっているか？
- ✅ .github/workflows/deploy.yml が存在するか？

---

## 🎉 完了後の世界

### **Before（手動）**:
```
コード変更
↓
firebase deploy （手動実行）
↓
デプロイ完了
```

### **After（自動）**:
```
コード変更
↓
git push
↓
☕ コーヒーを飲んでいる間に...
↓
🤖 自動デプロイ完了！
```

---

## 📝 次のステップ（さらなる自動化）

### **将来追加できる機能**:

1. **自動テスト**
   - ユニットテスト自動実行
   - E2Eテスト

2. **Slack通知**
   - デプロイ完了を Slack に通知

3. **ステージング環境**
   - develop ブランチ → ステージング
   - main ブランチ → 本番

4. **ロールバック機能**
   - 問題があれば前のバージョンに自動復元

---

## ✅ チェックリスト

セットアップ完了後、以下を確認：

- [ ] Firebase トークン生成完了
- [ ] GitHub Secrets に登録完了
- [ ] テストデプロイ成功
- [ ] GitHub Actions が緑色の ✓
- [ ] 本番環境に変更が反映されている

---

**準備ができたら Step 1 から開始してください！**
