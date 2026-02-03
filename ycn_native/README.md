# Your Coach+ Native (KMP)

Kotlin Multiplatform による Your Coach+ の完全ネイティブ実装

## プロジェクト構造

```
ycn_native/
├── shared/                     # Kotlin Multiplatform 共通コード
│   ├── src/
│   │   ├── commonMain/         # 共通ビジネスロジック
│   │   │   ├── domain/         # ドメインモデル
│   │   │   ├── data/           # リポジトリインターフェース
│   │   │   ├── usecase/        # ユースケース
│   │   │   └── util/           # ユーティリティ
│   │   ├── androidMain/        # Android固有実装
│   │   └── iosMain/            # iOS固有実装
│   └── build.gradle.kts
│
├── androidApp/                 # Android Native アプリ
│   ├── src/main/
│   │   ├── java/.../
│   │   │   ├── ui/             # Jetpack Compose UI
│   │   │   │   ├── theme/      # Material 3 テーマ
│   │   │   │   ├── components/ # 共通コンポーネント
│   │   │   │   ├── screens/    # 各画面
│   │   │   │   └── navigation/ # Navigation Compose
│   │   │   ├── data/           # Firebase リポジトリ実装
│   │   │   ├── di/             # Koin DI
│   │   │   └── service/        # バックグラウンドサービス
│   │   └── res/
│   └── build.gradle.kts
│
├── iosApp/                     # iOS Native アプリ (Phase 2)
│   └── (SwiftUI実装予定)
│
├── build.gradle.kts            # ルートビルド設定
├── settings.gradle.kts
├── gradle.properties
└── gradle/
    └── libs.versions.toml      # バージョンカタログ
```

## セットアップ手順

### 1. 前提条件

- JDK 17+
- Android Studio Hedgehog (2023.1.1) 以降
- Kotlin 2.0.21+

### 2. Firebase設定

1. Firebase Console から `google-services.json` をダウンロード
2. `androidApp/` ディレクトリに配置

```bash
cp /path/to/google-services.json androidApp/google-services.json
```

### 3. ビルド

```bash
# プロジェクトルートで
cd ycn_native

# Gradleビルド
./gradlew build

# Android アプリ実行
./gradlew androidApp:installDebug
```

## 技術スタック

### Android (Jetpack Compose)

| カテゴリ | ライブラリ |
|---------|-----------|
| UI | Jetpack Compose + Material 3 |
| Navigation | Navigation Compose |
| DI | Koin |
| 非同期 | Kotlin Coroutines + Flow |
| 画像 | Coil |
| カメラ | CameraX |
| グラフ | Vico |
| アニメーション | Lottie |

### Kotlin Multiplatform (shared)

| カテゴリ | ライブラリ |
|---------|-----------|
| ネットワーク | Ktor Client |
| シリアライズ | Kotlinx Serialization |
| 日時 | Kotlinx Datetime |
| 設定保存 | Multiplatform Settings |

### Firebase

| サービス | 用途 |
|---------|------|
| Auth | 認証 (Email/Google) |
| Firestore | データベース |
| Storage | ファイルストレージ |
| Messaging | プッシュ通知 |
| Crashlytics | クラッシュ分析 |

## 開発フェーズ

### Phase 1: Android完全ネイティブ化 (現在)

- [x] KMPプロジェクト基盤
- [x] Gradle設定・バージョンカタログ
- [x] shared モジュール（ドメインモデル・リポジトリ）
- [x] androidApp 基盤（MainActivity, Theme, Navigation）
- [x] Firebase SDK統合
- [ ] 認証画面完成
- [ ] ダッシュボード完成
- [ ] 食事記録機能
- [ ] 運動記録機能
- [ ] AI分析機能
- [ ] コミュニティ機能
- [ ] 課金機能
- [ ] 通知設定

### Phase 2: iOS KMP統合

- [ ] iosApp SwiftUI実装
- [ ] StoreKit 2統合
- [ ] APNs設定

### Phase 3: ゲーミフィケーション強化

- [ ] Streak システム
- [ ] リーグ・ランキング
- [ ] バッジ・実績
- [ ] Lottieアニメーション

## Duolingo風デザイン

### カラーパレット

| 色 | Hex | 用途 |
|----|-----|------|
| Primary (Green) | #58CC02 | メインアクション |
| Secondary (Blue) | #1CB0F6 | セカンダリ |
| Orange | #FF9600 | ストリーク |
| Purple | #CE82FF | アクセント |
| Red | #FF4B4B | エラー・警告 |

### 8軸スコア

1. カロリー (オレンジ)
2. タンパク質 (赤)
3. 炭水化物 (黄)
4. 脂質 (紫)
5. 食物繊維 (緑)
6. 水分 (青)
7. 運動 (ピンク)
8. 睡眠 (紫)

## 注意事項

- 既存のCapacitorプロジェクト（`src/`, `android/`）とは別管理
- Firestoreスキーマは既存と互換性維持
- Cloud Functionsは既存をそのまま使用
