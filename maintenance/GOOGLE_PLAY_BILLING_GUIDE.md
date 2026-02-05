# Google Play Billing 設定ガイド (KMP版)

## 概要

Your Coach+ の Google Play 課金設定ガイド。

---

## 1. 商品ID一覧

### サブスクリプション

| 商品ID | 種別 | 説明 |
|--------|------|------|
| `yourcoach_premium_monthly` | SUBS | プレミアム月額プラン |

### アプリ内購入（消費型）

| 商品ID | 種別 | 説明 |
|--------|------|------|
| `yourcoach_credits_50` | INAPP | 50クレジットパック |
| `yourcoach_credits_150` | INAPP | 150クレジットパック |
| `yourcoach_credits_300` | INAPP | 300クレジットパック |

---

## 2. Google Play Console 設定

### 2.1 サブスクリプション作成

1. Google Play Console → アプリ選択
2. 「収益化」→「定期購入」→「定期購入を作成」
3. 商品ID: `yourcoach_premium_monthly`
4. 基本プランを追加（月額）
5. 価格設定（日本: ¥980 など）

### 2.2 アプリ内購入作成

1. 「収益化」→「アプリ内アイテム」→「アイテムを作成」
2. 商品ID: `yourcoach_credits_50` など
3. 種類: 消費型
4. 価格設定

---

## 3. コード実装

### 実装ファイル

```
ycn_native/androidApp/src/main/java/com/yourcoach/plus/android/data/billing/
└── GooglePlayBillingRepository.kt
```

### 商品ID定義 (GooglePlayBillingRepository.kt:22-28)

```kotlin
companion object {
    const val PRODUCT_PREMIUM_MONTHLY = "yourcoach_premium_monthly"
    const val PRODUCT_CREDITS_50 = "yourcoach_credits_50"
    const val PRODUCT_CREDITS_150 = "yourcoach_credits_150"
    const val PRODUCT_CREDITS_300 = "yourcoach_credits_300"
}
```

### 依存ライブラリ (build.gradle.kts)

```kotlin
implementation(libs.play.billing)
// → com.android.billingclient:billing:7.x.x
```

---

## 4. テスト方法

### 4.1 ライセンステスター設定

1. Google Play Console →「設定」→「ライセンステスト」
2. テスト用Googleアカウントを追加
3. ライセンス応答: `LICENSED`

### 4.2 内部テスト

1. 内部テストトラックにAABをアップロード
2. テスターを招待
3. テスト購入を実行

### 4.3 テスト購入

- テストアカウントでの購入は課金されない
- `test` で始まる購入トークンが生成される

---

## 5. 購入フロー

```
1. BillingClient接続
   ↓
2. 商品情報取得 (queryProductDetailsAsync)
   ↓
3. 購入フロー起動 (launchBillingFlow)
   ↓
4. onPurchasesUpdated コールバック
   ↓
5. 購入確認 (acknowledgePurchase) ← サブスクは必須
   ↓
6. Firestoreに購入情報保存
```

---

## 6. サーバー検証（推奨）

### Cloud Functions での検証

```javascript
// functions/index.js
const { google } = require('googleapis');

exports.verifyPurchase = functions.https.onCall(async (data, context) => {
    const { purchaseToken, productId } = data;

    // Google Play Developer API で検証
    const androidPublisher = google.androidpublisher('v3');
    const result = await androidPublisher.purchases.subscriptions.get({
        packageName: 'com.yourcoach.plus',
        subscriptionId: productId,
        token: purchaseToken
    });

    return { valid: result.data.paymentState === 1 };
});
```

---

## 7. トラブルシューティング

### 商品が表示されない

- [ ] Google Play Consoleで商品が「有効」になっているか
- [ ] 商品IDがコードと一致しているか
- [ ] アプリがPlay Storeに公開/内部テストにアップロードされているか
- [ ] BillingClient接続が成功しているか

### 購入後にコンテンツが反映されない

- [ ] `acknowledgePurchase` が呼ばれているか（3日以内に必須）
- [ ] Firestoreへの保存が成功しているか
- [ ] エラーログを確認

### 「アイテムは既に所有しています」エラー

- 消費型商品で `consumePurchase` を呼んでいない
- または前回の購入が完了していない

---

## 8. 関連ファイル

| ファイル | 用途 |
|---------|------|
| `GooglePlayBillingRepository.kt` | 課金処理実装 |
| `SubscriptionScreen.kt` | サブスク購入UI |
| `SubscriptionViewModel.kt` | 購入ロジック |
| `BillingRepository.kt` (shared) | インターフェース定義 |
