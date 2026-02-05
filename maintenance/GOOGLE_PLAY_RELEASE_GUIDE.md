# Google Play Store リリースガイド (KMP版)

## 概要

Your Coach+ Android アプリ (Kotlin Multiplatform) の Google Play Store リリース手順。

---

## 1. ビルド準備

### バージョン更新

`ycn_native/androidApp/build.gradle.kts` を編集:

```kotlin
defaultConfig {
    versionCode = 83  // +1 増加（必須）
    versionName = "2.0.1"  // 必要に応じて更新
}
```

### ビルドコマンド

```bash
# Windows (Git Bash)
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
cd C:/Users/yourc/ycn_re/ycn_native
./gradlew :androidApp:bundleRelease
```

### 出力ファイル

```
ycn_native/androidApp/build/outputs/bundle/release/androidApp-release.aab
```

---

## 2. 署名設定

### キーストア情報

| 項目 | 値 |
|------|-----|
| ファイル | `ycn_native/androidApp/yourcoach-release-key.jks` |
| キーエイリアス | `yourcoach` |
| 有効期限 | 要確認 |

### 署名の確認

```bash
cd ycn_native/androidApp
keytool -list -v -keystore yourcoach-release-key.jks
```

---

## 3. Google Play Console アップロード

### 手順

1. [Google Play Console](https://play.google.com/console) にログイン
2. 「Your Coach+」アプリを選択
3. 「リリース」→「製品版」→「新しいリリースを作成」
4. AABファイルをアップロード
5. リリースノートを記入
6. 審査に提出

### リリースノート例

```
v2.0.0 (versionCode 82)
- Kotlin Multiplatform への完全移行
- パフォーマンス改善
- UIの最適化
```

---

## 4. 審査前チェックリスト

- [ ] versionCode が前回より大きい
- [ ] AABファイルが正常にビルドされた
- [ ] ProGuardで難読化されている
- [ ] テスト端末で動作確認済み
- [ ] クラッシュがないことを確認
- [ ] 課金機能が正常に動作

---

## 5. トラブルシューティング

### ビルドエラー時

```bash
# キャッシュクリア
cd ycn_native
./gradlew clean
./gradlew :androidApp:bundleRelease
```

### 署名エラー時

`build.gradle.kts` の signingConfigs を確認:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file("yourcoach-release-key.jks")
        storePassword = "..."
        keyAlias = "yourcoach"
        keyPassword = "..."
    }
}
```

### versionCode重複エラー

Google Play Console で既存のversionCodeより大きい値に設定。

---

## 6. 関連ファイル

| ファイル | 用途 |
|---------|------|
| `ycn_native/androidApp/build.gradle.kts` | ビルド設定・バージョン |
| `ycn_native/androidApp/proguard-rules.pro` | ProGuardルール |
| `ycn_native/androidApp/google-services.json` | Firebase設定 |
| `ycn_native/androidApp/yourcoach-release-key.jks` | 署名キー |
