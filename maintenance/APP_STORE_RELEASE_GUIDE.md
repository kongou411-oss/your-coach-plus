# App Store リリースガイド (KMP版)

## 概要

Your Coach+ iOS アプリ (Kotlin Multiplatform + SwiftUI) の App Store リリース手順。

> ⚠️ **注意**: iOS実装は現在骨格のみ。本ガイドは将来のiOS開発時の参考用。

---

## 1. 現在のiOS実装状況

### 完了済み

- [x] Xcodeプロジェクト作成 (`ycn_native/iosApp/`)
- [x] KMP shared モジュール連携設定
- [x] ContentView.swift プレースホルダー

### 未実装

- [ ] SwiftUI画面実装（15画面）
- [ ] Firebase iOS SDK統合
- [ ] Google Sign-In (iOS)
- [ ] Apple Sign-In
- [ ] プッシュ通知 (APNs)
- [ ] StoreKit 2 課金

---

## 2. ビルド準備（将来）

### Xcodeプロジェクト

```
ycn_native/iosApp/iosApp.xcodeproj
```

### ビルドコマンド

```bash
cd ycn_native/iosApp
xcodebuild -scheme iosApp -configuration Release archive
```

---

## 3. App Store Connect 設定

### 3.1 アプリ情報

| 項目 | 値 |
|------|-----|
| Bundle ID | `com.yourcoach.plus` |
| アプリ名 | Your Coach+ |
| カテゴリ | ヘルスケア＆フィットネス |

### 3.2 必要な証明書

1. **Apple Developer Program** メンバーシップ
2. **Provisioning Profile** (Distribution)
3. **App Store Connect API Key** (CI/CD用)

---

## 4. iOS課金設定（StoreKit 2）

### 商品ID（Google Playと統一）

| 商品ID | 種別 |
|--------|------|
| `yourcoach_premium_monthly` | 自動更新サブスクリプション |
| `yourcoach_credits_50` | 消費型 |
| `yourcoach_credits_150` | 消費型 |
| `yourcoach_credits_300` | 消費型 |

### StoreKit 2 実装例

```swift
// 将来の実装
import StoreKit

func purchase(productId: String) async throws {
    let product = try await Product.products(for: [productId]).first!
    let result = try await product.purchase()

    switch result {
    case .success(let verification):
        let transaction = try checkVerified(verification)
        await transaction.finish()
    case .userCancelled:
        break
    case .pending:
        break
    @unknown default:
        break
    }
}
```

---

## 5. 審査ガイドライン対応

### 必須対応事項

1. **プライバシーポリシー** - アプリ内とApp Store両方に掲載
2. **利用規約** - サブスク購入時に表示
3. **データ収集の開示** - App Privacy Labels
4. **アカウント削除機能** - 設定画面に実装済み（Android）

### よくあるリジェクト理由

| 理由 | 対策 |
|------|------|
| 課金がWebに誘導 | アプリ内でStoreKitのみ使用 |
| サブスク情報不足 | 購入画面に価格・期間・解約方法を明記 |
| ログイン必須 | ゲストモード or Apple Sign-In必須 |
| クラッシュ | TestFlightで十分テスト |

---

## 6. 提出チェックリスト

- [ ] Xcodeでアーカイブ作成
- [ ] App Store Connectにアップロード
- [ ] スクリーンショット準備（6.5", 5.5"）
- [ ] アプリ説明文
- [ ] キーワード設定
- [ ] プライバシーポリシーURL
- [ ] サポートURL
- [ ] 審査メモ（テストアカウント情報など）

---

## 7. KMP expect/actual 実装予定

### 画像ピッカー

```kotlin
// shared/src/commonMain/kotlin
expect class ImagePicker {
    suspend fun pickImage(): ByteArray?
}

// shared/src/iosMain/kotlin
actual class ImagePicker {
    actual suspend fun pickImage(): ByteArray? {
        // PHPickerViewController使用
    }
}
```

### 課金

```kotlin
// shared/src/commonMain/kotlin
expect class BillingService {
    suspend fun purchase(productId: String): Result<PurchaseResult>
}

// shared/src/iosMain/kotlin
actual class BillingService {
    actual suspend fun purchase(productId: String): Result<PurchaseResult> {
        // StoreKit 2使用
    }
}
```

---

## 8. 参考リソース

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [KMP iOS Integration](https://kotlinlang.org/docs/multiplatform-ios-integration.html)

---

## 9. 関連ファイル

| ファイル | 用途 |
|---------|------|
| `ycn_native/iosApp/` | iOSアプリプロジェクト |
| `ycn_native/shared/src/iosMain/` | iOS固有実装 |
| `icons/` | ストア用アイコン画像 |
| `AppStore_Screenshots/` | スクリーンショット |
