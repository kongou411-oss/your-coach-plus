# Your Coach+ KMP 統合進捗

**最終更新**: 2026-02-16
**バージョン**: 2.0.7 (versionCode 91)
**ステータス**: Shared層一本化完了 / v2.0.7 リリース済み

---

## アーキテクチャ現状

```
ycn_native/
├── shared/src/commonMain/   ← 全ロジック・全UI
│   ├── domain/model/        データモデル
│   ├── domain/repository/   リポジトリI/F
│   ├── data/repository/     Firestore実装（GitLive SDK）
│   ├── data/database/       食品・運動DB
│   ├── ui/screens/          全画面（Voyager Screen + ScreenModel）
│   ├── ui/theme/            共通テーマ
│   ├── di/SharedModule.kt   Koin DI（全ScreenModel登録）
│   └── util/                ユーティリティ
├── shared/src/androidMain/  Android固有actual（カメラ、WebView等）
├── shared/src/iosMain/      iOS固有actual（骨格のみ）
├── androidApp/              Android最小限エントリーポイント
│   ├── MainActivity.kt      Voyager Navigator起動
│   ├── YourCoachApp.kt      Application（Firebase初期化）
│   ├── di/AppModule.kt      Android固有DI（Billing, Storage）
│   ├── data/billing/        Google Play Billing
│   ├── service/             FCMサービス
│   └── ui/theme/            Android Material Theme
└── iosApp/                  iOS（未実装）
```

---

## v2.0.7 変更内容 (2026-02-16)

### 新機能・改善
| 変更 | 詳細 |
|------|------|
| PGBASE教科書 | カテゴリフィルター削除、PFCVM順並替、NUTRITIONカテゴリ廃止 |
| PGBASE有料/無料 | 🔒未購入/🔓購入済みアイコン表示、Firestore isPremiumで管理 |
| フィードバック | 問い合わせ(INQUIRY)タイプ追加（3種対応）、Cloud Function更新 |
| 履歴グラフ | 期間ラベル日本語化（7D→7日等）、体調→コンディション |
| サブスクリプション | 所属組織プレミアムユーザーの購入ボタン非表示 |
| プロフィール設定 | 食事回数の注意書き追加、食材区切りをスペースに変更 |

### バグ修正
| 修正 | 原因 |
|------|------|
| プロフィール保存が反映されない | GitLive SDK `get<Map<String,Any?>>()` のSerializationException → 個別フィールド読み取り |
| プロフィール更新で既存フィールド消失 | `update(mapOf("profile" to map))` が全置換 → ドット記法に変更 |
| ダッシュボード目標値が更新されない | observeUser()のターゲット再計算不足 → calculateTargets()を適用 |
| TDEE未表示（プロフィール初期設定） | デフォルト値未設定 → MALE defaults追加 |

### セキュリティ・リリース準備
| 対応 | 詳細 |
|------|------|
| 署名パスワード | ハードコード → local.properties読み取り |
| 管理者パスワード | ハードコード '0910' → process.env.ADMIN_PASSWORD統一 |
| デバッグログ | PROFILE_DEBUG全削除、Cloud Functions DEBUGログ削除 |
| FirestoreProfileParser | expect/actual廃止 → commonMain共通実装に統合 |

---

## 完了済み

### リポジトリ層一本化 ✅

Android版15リポジトリを削除、全てShared `commonMain` のGitLive SDK実装に統合。

| リポジトリ | 状態 |
|-----------|------|
| FirebaseAuthRepository | Shared統合済 |
| FirestoreUserRepository | Shared統合済 |
| FirestoreMealRepository | Shared統合済 |
| FirestoreWorkoutRepository | Shared統合済 |
| FirestoreRoutineRepository | Shared統合済 |
| FirestoreScoreRepository | Shared統合済 |
| FirestoreAnalysisRepository | Shared統合済 |
| FirestoreBadgeRepository | Shared統合済 |
| FirestoreConditionRepository | Shared統合済 |
| FirestoreCustomExerciseRepository | Shared統合済 |
| FirestoreCustomFoodRepository | Shared統合済 |
| FirestoreDirectiveRepository | Shared統合済 |
| FirestorePgBaseRepository | Shared統合済 |
| FirestoreComyRepository | Shared統合済 |
| FirestoreRmRepository | Shared統合済 |
| FirestoreNotificationSettingsRepository | Shared統合済 |
| RoutinePresets | Shared統合済 |

### UI層一本化 ✅

Android NavHost → Voyager Navigator 切替完了。全画面がShared層。

| 画面カテゴリ | 状態 |
|-------------|------|
| dashboard | ✅ |
| settings | ✅ |
| meal | ✅ |
| workout | ✅ |
| auth | ✅ |
| analysis | ✅ |
| history | ✅ |
| comy | ✅ |
| subscription | ✅ |
| pgbase | ✅ |
| notification | ✅ |
| badges | ✅ |
| main / splash | ✅ |

### バッジシステム修正 ✅

全18バッジが内容通りに獲得可能。

### 利用規約リンク修正 ✅

SignUpScreenの「利用規約とプライバシーポリシーに同意」テキストを、個別タップ可能なリンクに変更。

---

## 残タスク

### iOS対応時

| 項目 | 詳細 |
|------|------|
| 購入復元ボタン | SubscriptionScreen — App Store審査必須要件 |
| iOS actual実装 | カメラ、WebView、Billing等のiOS固有コード |

### 将来的な改善

| 項目 | 詳細 |
|------|------|
| ADMIN_PASSWORD | Firebase Secrets Manager完全移行（現在は.env） |
| Node.js 20 → 22 | Cloud Functions ランタイム更新（2026-04-30 非推奨化） |

### 対象外（旧React版の機能 / 現行アプリ不要）

| 項目 | 理由 |
|------|------|
| 年額プラン表示 | 法人のみ年額、アプリ内は個人向け月額のみ |
| レストタイマー | 旧React版の機能 |
| ギフトコード入力 | 旧React版の機能（Cloud Functions側のみ残留） |
| 紹介コード入力 | 旧React版の機能（Cloud Functions側のみ残留） |

---

## 旧Webアプリ残留ファイル

`public/` に旧Webアプリのレガシーファイルが残留。

### 削除可能

| ファイル | 理由 |
|---------|------|
| home.html, home - コピー.html | 旧Webアプリホーム |
| history_v10_standalone.html | 旧履歴グラフ |
| services.js | 旧Webアプリロジック |
| utils.js | 旧ユーティリティ |
| notificationSound.js | 旧通知音 |
| foodDatabase.js | 旧食品DB（Firestoreに移行済み） |
| trainingDatabase.js | 旧運動DB（同上） |
| module/Nutrition/ (11ファイル) | 旧教科書（/module/v2/ に置換済み） |
| module/*.html (テンプレ等7ファイル) | 旧モジュールテンプレ |

### 維持必須

| ファイル | 理由 |
|---------|------|
| module/v2/*.html + CSS | PG BASE教科書（WebViewで読み込み中） |
| terms.html, privacy.html, tokushoho.html | 法的ページ（アプリからリンク） |
| trainer.html, trainer-login.html | トレーナーポータル（現役） |
| js/trainer-functions.js, js/cq-databases.js | トレーナーポータルロジック |
| b2b2c.html, b2b2c-success.html | 法人プラン決済 |
| config.js | Firebase設定（トレーナー等が使用） |
| admin.html, admin-login.html, admin-customquest.html | 管理ツール |
