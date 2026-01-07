# Google Play Billing セットアップ手順

## 🚨 現在のエラー原因
**ストアの初期化に失敗、商品情報を取得できない**

→ **Google Play Consoleで商品が未登録の可能性が高い**

---

## ✅ 必須手順（この順番で実施）

### 1. Google Play Consoleにアプリをアップロード

1. AABファイルをビルド（Android Studioで実施済みの場合はスキップ）
   ```bash
   export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
   cd android
   ./gradlew bundleRelease
   ```
   → `android/app/build/outputs/bundle/release/app-release.aab` が生成される

2. [Google Play Console](https://play.google.com/console) にアクセス

3. **内部テスト** トラックを作成
   - 左メニュー → テスト → 内部テスト
   - 「リリースを作成」をクリック
   - AABファイルをアップロード
   - 変更内容を入力して「確認」→「公開」

---

### 2. アプリ内商品を登録

#### A. 定期購入（Premium会員）

1. 左メニュー → 収益化 → 定期購入
2. 「定期購入を作成」をクリック
3. 以下を入力：
   - **商品ID**: `yourcoach_premium_monthly`
   - **名前**: `Your Coach+ Premium`
   - **説明**: `月額940円ですべての機能が使い放題`
   - **期間**: 1ヶ月
   - **価格**: ¥940
   - **無料トライアル**: 7日間（オプション）
4. 「保存」→「有効化」

#### B. アプリ内商品（クレジットパック）

1. 左メニュー → 収益化 → アプリ内商品
2. 「アプリ内商品を作成」を3回繰り返し、以下を登録：

**商品1: 50回パック**
- **商品ID**: `yourcoach_credits_50`
- **名前**: `50回パック`
- **説明**: `AI分析50回分のクレジット`
- **商品タイプ**: 消費型
- **価格**: ¥490
- **有効化**

**商品2: 150回パック**
- **商品ID**: `yourcoach_credits_150`
- **名前**: `150回パック`
- **説明**: `AI分析150回分のクレジット`
- **商品タイプ**: 消費型
- **価格**: ¥1,200
- **有効化**

**商品3: 300回パック**
- **商品ID**: `yourcoach_credits_300`
- **名前**: `300回パック`
- **説明**: `AI分析300回分のクレジット`
- **商品タイプ**: 消費型
- **価格**: ¥2,200
- **有効化**

---

### 3. ライセンステスターを追加

1. 左メニュー → 設定 → ライセンステスト
2. 「テスターを追加」
3. テストに使用するGoogleアカウントのメールアドレスを入力
4. 「保存」

---

### 4. テスト方法

1. **テストアカウントでPlayストアにログイン**
2. **内部テストのリンクからアプリをインストール**
   - Play Console → テスト → 内部テスト → テスターのURLをコピー
   - そのURLをテスト端末で開く
3. **アプリで購入フローをテスト**
   - Premium会員登録画面を開く
   - コンソールログで `[IAP]` を確認（USB接続が必要）

---

## 🔍 トラブルシューティング

### エラー: "商品情報を取得できませんでした"
- **原因1**: 商品IDが一致していない
  - Play Consoleで登録した商品IDと `src/config.js` の `GOOGLE_PLAY_BILLING` が一致しているか確認
- **原因2**: 商品が「有効化」されていない
  - Play Consoleで各商品を「有効化」する必要がある

### エラー: "この商品は購入できません"
- **原因1**: デバッグビルドを使用している
  - 内部テストトラックにアップロードしたリリースビルドを使用する必要がある
- **原因2**: テストアカウントが未登録
  - Play Console → 設定 → ライセンステストにアカウントを追加

### エラー: "ストアの初期化に失敗しました"
- **原因1**: BILLINGパーミッションが不足
  - `AndroidManifest.xml` に `<uses-permission android:name="com.android.vending.BILLING" />` が必要（すでに追加済み ✅）
- **原因2**: アプリがPlay Consoleに未登録
  - 少なくとも内部テストトラックにアップロードする必要がある

---

## 📋 現在の設定状況

### ✅ 完了済み
- [x] `AndroidManifest.xml` に BILLING 権限追加
- [x] `cordova-plugin-purchase` インストール済み
- [x] 商品ID定義（`src/config.js`）
- [x] 購入フロー実装（`src/components/18_subscription.jsx`）

### ❌ 未完了（要確認）
- [ ] Google Play Consoleで商品登録
- [ ] 内部テストトラックにAABアップロード
- [ ] ライセンステスター登録
- [ ] 実機テスト

---

## 📝 商品ID一覧（確認用）

| 種類 | 商品ID | 名前 | 価格 |
|------|--------|------|------|
| 定期購入 | `yourcoach_premium_monthly` | Your Coach+ Premium | ¥940/月 |
| 消費型 | `yourcoach_credits_50` | 50回パック | ¥490 |
| 消費型 | `yourcoach_credits_150` | 150回パック | ¥1,200 |
| 消費型 | `yourcoach_credits_300` | 300回パック | ¥2,200 |

⚠️ **重要**: これらの商品IDは `src/config.js` の `GOOGLE_PLAY_BILLING` で定義されています。Google Play Consoleで登録する商品IDと必ず一致させてください。
