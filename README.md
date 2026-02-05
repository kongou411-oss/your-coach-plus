# Your Coach+

AI搭載パーソナルヘルスコーチアプリ

## 概要

Your Coach+ は、食事・運動・睡眠を総合的にトラッキングし、AIがパーソナライズされたアドバイスを提供するヘルスケアアプリです。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **アーキテクチャ** | Kotlin Multiplatform (KMP) |
| **Android UI** | Jetpack Compose + Material3 |
| **iOS UI** | SwiftUI (予定) |
| **状態管理** | ViewModel + StateFlow |
| **DI** | Koin |
| **バックエンド** | Firebase (Auth, Firestore, Storage, Functions) |
| **AI** | Google Gemini API |
| **課金** | Google Play Billing / StoreKit 2 |

## 主な機能

- **食事記録** - AI画像認識による自動栄養計算
- **運動記録** - 600種類以上のエクササイズDB
- **10軸スコアリング** - 総合的な健康状態の可視化
- **AI分析** - Geminiによるパーソナライズドアドバイス
- **バッジシステム** - 継続モチベーション
- **通知リマインダー** - カスタマイズ可能な通知設定
- **プレミアム機能** - サブスクリプション

## プロジェクト構成

```
ycn_re/
├── ycn_native/           # KMPメインプロジェクト
│   ├── androidApp/       # Android (Jetpack Compose)
│   ├── shared/           # 共通コード (commonMain/androidMain/iosMain)
│   └── iosApp/           # iOS (SwiftUI) ※開発中
├── functions/            # Firebase Cloud Functions
├── public/               # Firebase Hosting
└── maintenance/          # 運用ドキュメント
```

## セットアップ

### 必要環境

- Android Studio Ladybug (2024.2+)
- JDK 17
- Node.js 18+ (Cloud Functions用)

### ビルド

```bash
# Android デバッグビルド
cd ycn_native
./gradlew :androidApp:assembleDebug

# Android リリースビルド
./gradlew :androidApp:bundleRelease
```

### Firebase

```bash
# Cloud Functions デプロイ
firebase deploy --only functions

# Firestore Rules デプロイ
firebase deploy --only firestore:rules
```

## リリース状況

| プラットフォーム | 状態 | バージョン |
|-----------------|------|-----------|
| Android | リリース済み | v2.0.0 |
| iOS | 開発予定 | - |

## ドキュメント

- [Google Play リリースガイド](maintenance/GOOGLE_PLAY_RELEASE_GUIDE.md)
- [課金設定ガイド](maintenance/GOOGLE_PLAY_BILLING_GUIDE.md)
- [App Store リリースガイド](maintenance/APP_STORE_RELEASE_GUIDE.md)
- [KMP移行進捗](ycn_native/PROGRESS.md)

## ライセンス

Proprietary - All Rights Reserved

---

**KMP移行完了**: 2026年2月
